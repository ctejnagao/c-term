import prisma from "@/lib/prisma";

/**
 * 計上日（入金予定日）が現在の日付（システム日付）を超えている（今日以前の）
 * 「入金予定」ステータスの案件および請求書を自動的に「入金済」に更新します。
 */
export async function syncPaymentStatuses(): Promise<{
  updatedProjectsCount: number;
  updatedInvoicesCount: number;
}> {
  try {
    const now = new Date();
    // 今日の23:59:59.999までを対象（計上日当日を含めて経過していれば入金済）
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return await prisma.$transaction(async (tx) => {
      // 1. 「入金予定」かつ 計上日 <= 今日の Project を取得
      const pendingProjects = await tx.project.findMany({
        where: {
          status: "入金予定",
          expectedPayDate: { lte: endOfToday },
          deletedAt: null,
        },
        include: {
          invoices: {
            where: { deletedAt: null },
          },
        },
      });

      let updatedProjectsCount = 0;
      for (const project of pendingProjects) {
        const payDate = project.expectedPayDate || now;

        // Projectステータス更新
        await tx.project.update({
          where: { id: project.id },
          data: { status: "入金済" },
        });
        updatedProjectsCount++;

        // 紐づくInvoiceも「入金済」に更新
        for (const inv of project.invoices) {
          if (inv.paymentStatus !== "入金済") {
            await tx.invoice.update({
              where: { id: inv.id },
              data: {
                paymentStatus: "入金済",
                paidDate: inv.paidDate || payDate,
                paidAmount: inv.totalAmount,
              },
            });
          }
        }

        // 不変監査ログ
        await tx.auditLog.create({
          data: {
            entityName: "Project",
            entityId: project.id,
            action: "AUTO_PAYMENT_CONFIRMED",
            diff: {
              previousStatus: "入金予定",
              newStatus: "入金済",
              expectedPayDate: project.expectedPayDate,
              systemDate: now.toISOString(),
            },
            userId: "SYSTEM_SYNC",
          },
        });
      }

      // 2. 「入金予定」かつ 計上日 <= 今日の Invoice を取得（直接Invoiceに日付が入っている場合）
      const pendingInvoices = await tx.invoice.findMany({
        where: {
          paymentStatus: "入金予定",
          paidDate: { lte: endOfToday },
          deletedAt: null,
        },
      });

      let updatedInvoicesCount = 0;
      for (const inv of pendingInvoices) {
        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            paymentStatus: "入金済",
            paidAmount: inv.totalAmount,
          },
        });
        updatedInvoicesCount++;

        // 紐づくProjectも「入金済」に更新
        await tx.project.update({
          where: { id: inv.projectId },
          data: { status: "入金済" },
        });

        await tx.auditLog.create({
          data: {
            entityName: "Invoice",
            entityId: inv.id,
            action: "AUTO_PAYMENT_CONFIRMED",
            diff: {
              previousStatus: "入金予定",
              newStatus: "入金済",
              paidDate: inv.paidDate,
              systemDate: now.toISOString(),
            },
            userId: "SYSTEM_SYNC",
          },
        });
      }

      return {
        updatedProjectsCount,
        updatedInvoicesCount,
      };
    });
  } catch (error) {
    console.error("Error in syncPaymentStatuses:", error);
    return { updatedProjectsCount: 0, updatedInvoicesCount: 0 };
  }
}
