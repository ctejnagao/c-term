import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { targetPeriod, userId } = await req.json(); // 例: targetPeriod = "2026-09"

    if (!targetPeriod) {
      return NextResponse.json({ error: "対象年月(targetPeriod)は必須です。" }, { status: 400 });
    }

    const createdInvoices = await prisma.$transaction(async (tx) => {
      // 1. 対象となる有効な契約を取得
      const activeContracts = await tx.recurringContract.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          startDate: { lte: new Date() },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ],
          // 当該期間の請求が未作成のもの
          recurringInvoices: {
            none: {
              targetPeriod: targetPeriod,
              deletedAt: null,
            },
          },
        },
      });

      const generatedList = [];

      for (const contract of activeContracts) {
        const invoice = await tx.recurringInvoice.create({
          data: {
            contractId: contract.id,
            targetPeriod: targetPeriod,
            amount: contract.amount,
            issuedDate: new Date(),
            status: "ISSUED",
          },
        });

        // 監査ログ
        await tx.auditLog.create({
          data: {
            entityName: "RecurringInvoice",
            entityId: invoice.id,
            action: "AUTO_GENERATE",
            diff: { contractId: contract.id, amount: contract.amount, targetPeriod },
            userId: userId ? userId.toString() : "CRON_JOB",
          },
        });

        generatedList.push(invoice);
      }

      return generatedList;
    });

    return NextResponse.json({
      success: true,
      processedCount: createdInvoices.length,
      data: createdInvoices,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
