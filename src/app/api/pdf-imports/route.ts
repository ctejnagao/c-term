import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { generateNextSequence } from '@/lib/sequence';

// .env に GEMINI_API_KEY が必要です
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 });
    }

    // 1. ファイル保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // public/uploads ディレクトリが存在するか確認し、なければ作成
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueFileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);
    const fileUrl = `/uploads/${uniqueFileName}`;

    // 2. Gemini API で解析
    if (!process.env.GEMINI_API_KEY) {
      // APIキーがない場合はとりあえずファイルだけ保存して終わる（モック用）
      const pdfImport = await prisma.pdfImport.create({
        data: {
          fileName: file.name,
          fileUrl,
          status: 'PENDING',
        }
      });
      return NextResponse.json({ success: true, data: pdfImport, message: 'Gemini API Key missing, saved file only.' });
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = `
      このPDF（または画像）を解析し、以下の構造を持つJSONを出力してください。
      \`\`\`json
      {
        "type": "ORDER" | "PAYMENT_STATEMENT" | "INVOICE" | "UNKNOWN",
        "partnerCode": "取引先コードがある場合抽出（例: K500032）",
        "issuerName": "この書類の発行元・発注者企業名（例: 日本カラリング株式会社。宛先であるコムテックエンタープライズではなく、発注元を抽出すること）",
        "partnerName": "取引先名（発注元または相手先）",
        "documentNumber": "発注NOや購買NO、支払NOなど（PDF右上の購買NO：KB2026000001454などがあれば必ずこれを抽出）",
        "estimateNo": "お見積NO、見積No、見積番号がある場合はその番号（例: 2501723）",
        "date": "2026-04-30のような日付フォーマット（発注日等）",
        "deliveryDate": "希望納期や納入期日がある場合（2026-08-31のような日付フォーマット）",
        "totalAmount": "税込合計金額（数値のみ、カンマなし）",
        "items": [
          {
            "estimateNo": "明細行ごとにお見積NOがある場合抽出",
            "itemName": "品名",
            "quantity": "数量（数値）",
            "unit": "単位",
            "unitPrice": "単価（数値）",
            "amount": "金額（数値）"
          }
        ]
      }
      \`\`\`
      必ずJSONのみを出力してください。Markdownのバッククォートなどは含めないでください。
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: file.type || 'application/pdf',
        },
      },
    ]);

    let responseText = result.response.text();
    // JSON部分だけを抽出する（バッククォートがあった場合の対策）
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Gemini Parse Error:", responseText);
      throw new Error("Geminiの解析結果が不正なJSONでした。");
    }

    // 3. PdfImport レコード作成
    const pdfImport = await prisma.pdfImport.create({
      data: {
        fileName: file.name,
        fileUrl,
        rawText: responseText,
        parsedData,
        status: 'PROCESSED',
      }
    });

    // 4. 取引先の特定（発注元優先）
    const candidateName = (parsedData.issuerName || parsedData.partnerName || '')
      .replace('株式会社', '')
      .trim();

    let partner = null;
    if (parsedData.partnerCode || candidateName) {
      partner = await prisma.partner.findFirst({
        where: {
          OR: [
            ...(parsedData.partnerCode ? [{ code: parsedData.partnerCode }] : []),
            ...(candidateName ? [{ name: { contains: candidateName } }, { shortName: { contains: candidateName } }] : [])
          ],
          deletedAt: null
        }
      });
    }

    // JCCまたは日本カラリングのフォールバック
    if (!partner && (responseText.includes('日本カラリング') || responseText.includes('JCC'))) {
      partner = await prisma.partner.findFirst({
        where: {
          OR: [
            { name: { contains: '日本カラリング' } },
            { shortName: 'JCC' }
          ],
          deletedAt: null
        }
      });
    }

    // 5. お見積Noの取得と案件（Project）の受注ステータス更新
    let estimateNo = parsedData.estimateNo || null;
    if (!estimateNo && Array.isArray(parsedData.items)) {
      const itemWithEst = parsedData.items.find((it: any) => it.estimateNo);
      if (itemWithEst) {
        estimateNo = itemWithEst.estimateNo;
      }
    }

    let matchedEstimate = null;
    let updatedProject = null;
    let orderAcceptance = null;

    if (estimateNo) {
      matchedEstimate = await prisma.estimate.findFirst({
        where: {
          estimateNo: String(estimateNo).trim(),
          deletedAt: null,
        },
        include: {
          project: true,
        }
      });

      if (matchedEstimate && matchedEstimate.project) {
        const orderDate = parsedData.date ? new Date(parsedData.date) : new Date();
        const deliveryDate = parsedData.deliveryDate ? new Date(parsedData.deliveryDate) : null;
        const totalAmount = Number(parsedData.totalAmount) || Number(matchedEstimate.totalAmount);
        const clientOrderNo = parsedData.documentNumber || null; // 購買NO

        // 案件のステータスを「受注」に更新し、購買NO・受注日・金額・納期を反映
        updatedProject = await prisma.project.update({
          where: { id: matchedEstimate.projectId },
          data: {
            status: '受注',
            orderedAt: orderDate,
            clientOrderNo: clientOrderNo,
            orderAmount: totalAmount,
            expectedDeliveryDate: deliveryDate || matchedEstimate.project.expectedDeliveryDate,
          }
        });

        // 注文請書の自動作成（未存在の場合）
        const existingAcceptance = await prisma.orderAcceptance.findFirst({
          where: {
            projectId: matchedEstimate.projectId,
            estimateId: matchedEstimate.id,
            deletedAt: null,
          }
        });

        if (!existingAcceptance) {
          const acceptanceNo = await generateNextSequence('ORDER_ACCEPT', orderDate);
          orderAcceptance = await prisma.orderAcceptance.create({
            data: {
              acceptanceNo,
              projectId: matchedEstimate.projectId,
              estimateId: matchedEstimate.id,
              acceptDate: orderDate,
              deliveryDate: deliveryDate,
              totalAmount: totalAmount,
              staff: matchedEstimate.project.leadStaff || null,
            }
          });
        }
      }
    }

    // 6. 受注（Order）レコードの作成
    let createdOrder = null;
    if (parsedData.type === 'ORDER' && partner) {
      createdOrder = await prisma.order.create({
        data: {
          orderNumber: parsedData.documentNumber || `ORD-${Date.now()}`,
          partnerId: partner.id,
          pdfImportId: pdfImport.id,
          totalAmount: Number(parsedData.totalAmount) || 0,
          orderDate: parsedData.date ? new Date(parsedData.date) : new Date(),
          orderItems: {
            create: (parsedData.items || []).map((item: any) => ({
              itemName: item.itemName,
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.unitPrice) || 0,
            }))
          }
        }
      });
    }

    // 7. 支払明細書（PAYMENT_STATEMENT）の処理
    let paymentResult = null;
    if (parsedData.type === 'PAYMENT_STATEMENT' || (parsedData.documentNumber && String(parsedData.documentNumber).startsWith('SH'))) {
      const payDate = parsedData.date ? new Date(parsedData.date) : new Date();
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      // 計上日 > システム日付 なら「入金予定」、計上日 <= システム日付 なら「入金済」
      const isPastOrToday = payDate <= endOfToday;
      const targetStatus = isPastOrToday ? '入金済' : '入金予定';

      // 該当する案件 (Project) の特定
      let matchedProject = null;
      if (estimateNo) {
        const est = await prisma.estimate.findFirst({
          where: { estimateNo: String(estimateNo).trim(), deletedAt: null },
          include: { project: true }
        });
        if (est?.project) matchedProject = est.project;
      }

      // 品名によるマッチング
      if (!matchedProject && Array.isArray(parsedData.items) && parsedData.items.length > 0) {
        const firstItemName = parsedData.items[0].itemName;
        if (firstItemName) {
          const cleanName = firstItemName.replace(/[\s　]/g, '').slice(0, 8);
          const projects = await prisma.project.findMany({
            where: {
              deletedAt: null,
              ...(partner ? { partnerId: partner.id } : {})
            }
          });
          matchedProject = projects.find(p => {
            const pName = p.name.replace(/[\s　]/g, '');
            return pName.includes(cleanName) || cleanName.includes(pName.slice(0, 8));
          }) || null;
        }
      }

      // フォールバック: 直近の請求済/納品済案件
      if (!matchedProject && partner) {
        matchedProject = await prisma.project.findFirst({
          where: {
            partnerId: partner.id,
            deletedAt: null,
            status: { in: ['請求済', '納品済', '入金予定'] }
          },
          orderBy: { updatedAt: 'desc' }
        });
      }

      if (matchedProject) {
        const updatedProj = await prisma.project.update({
          where: { id: matchedProject.id },
          data: {
            status: targetStatus,
            expectedPayDate: payDate,
          }
        });

        // 紐づく Invoice の更新
        const invoice = await prisma.invoice.findFirst({
          where: { projectId: matchedProject.id, deletedAt: null }
        });
        let updatedInv = null;
        if (invoice) {
          updatedInv = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              paymentStatus: targetStatus,
              paidDate: payDate,
              paidAmount: isPastOrToday ? (Number(parsedData.totalAmount) || invoice.totalAmount) : invoice.paidAmount,
            }
          });
        }

        // 紐づく Delivery の expectedPayDate も更新
        await prisma.delivery.updateMany({
          where: { projectId: matchedProject.id, deletedAt: null },
          data: { expectedPayDate: payDate }
        });

        // 監査ログ追記
        await prisma.auditLog.create({
          data: {
            entityName: 'Project',
            entityId: matchedProject.id,
            action: 'PAYMENT_STATEMENT_IMPORT',
            diff: {
              documentNumber: parsedData.documentNumber,
              payDate: parsedData.date,
              targetStatus,
              isPastOrToday,
              totalAmount: parsedData.totalAmount,
            },
            userId: 'PDF_IMPORT'
          }
        });

        paymentResult = {
          project: updatedProj,
          invoice: updatedInv,
          status: targetStatus,
          payDate,
        };
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: pdfImport,
      createdOrder,
      updatedProject: updatedProject || paymentResult?.project,
      matchedEstimate,
      orderAcceptance,
      paymentResult,
      parsedData
    });

  } catch (error: any) {
    console.error('PDF Import Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
