import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { generateNextSequence } from '@/lib/sequence';
import { getPdfStorageDir } from '@/lib/pdfStorage';
import { calculateExpectedPayDate, adjustToPreviousBusinessDay, formatToYmd } from '@/lib/dateUtils';

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

    // 共有ストレージ（\\eggplant\share\...）への保存も試行
    try {
      const storageDir = getPdfStorageDir();
      if (fs.existsSync(storageDir)) {
        const sharedPath = path.join(storageDir, file.name);
        fs.writeFileSync(sharedPath, buffer);
      }
    } catch (shareErr) {
      console.warn('共有フォルダへの保存に失敗しました（ローカル保存のみ実行）:', shareErr);
    }

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
      書面に実際に記載・配置されている表記に従って正確に抽出してください（計算して推測するのではなく、書面に記載されている数値をそのまま抽出すること）。

      【書類種別の判定】
      - 「取引先別支払明細表」や「支払明細」または「支払NO」がある書類は "PAYMENT_STATEMENT"
      - 「注文書」または「購買NO」がある書類は "ORDER"
      - 「請求書」は "INVOICE"

      【重要：明細行の完全抽出ルール】
      - 表（テーブル）形式で明細が記載されている場合、**決して1行目だけで終了したり省略したりせず、表内の【すべての明細行（例: 4行あれば4行すべて）】を必ず1行ずつ配列 items に完全に抽出してください。**

      \`\`\`json
      {
        "type": "ORDER" | "PAYMENT_STATEMENT" | "INVOICE" | "UNKNOWN",
        "partnerCode": "取引先CD（例: K500032）",
        "issuerName": "発行元・発注者企業名（例: 日本カラリング株式会社。宛先であるコムテックエンタープライズではなく発注元・書類発行元企業名）",
        "partnerName": "取引先名（発注元または相手先）",
        "documentNumber": "書面に記載の「購買NO」「支払NO」「発注NO」などの番号（例: KB2026000001454、SH2026000000579）",
        "estimateNo": "書面に記載の「お見積NO.」「お見積NO」「見積番号」がある場合はその番号（例: 2501723）",
        "date": "計上日または発注日などの日付（2026-08-31形式）",
        "paymentDate": "書面に記載されている支払日がある場合（例: 2026-09-30形式）",
        "deliveryDate": "希望納期や納入期日がある場合（2026-08-31形式）",
        "subtotalAmount": "書面に配置・印字されている「税抜金額合計」または「税抜金額総合計」の金額（数値のみ、カンマなし。例: 4236500）",
        "taxAmount": "書面に配置・印字されている「消費税額合計」または「消費税額総合計」の金額（数値のみ、カンマなし。例: 423650）",
        "totalAmount": "書面に配置・印字されている「税込金額合計」または「税込金額総合計」の金額（数値のみ、カンマなし。例: 4660150）",
        "items": [
          {
            "orderNumber": "各明細行に記載されている「購買NO」（枝番含めて抽出。例: KB2026000000762-1、KB2025000002538-3、KB2026000000763-1、KB2026000001454-1）",
            "acceptanceDate": "各明細行の「検収日」がある場合（2026-08-26形式）",
            "estimateNo": "明細行に記載の「お見積NO.」がある場合抽出",
            "itemName": "明細行に記載の「商品名」または品名",
            "quantity": "数量（数値）",
            "unit": "単位（例: 式）",
            "unitPrice": "単価（数値）",
            "discountAmount": "値引金額がある場合（数値、例: -2500）",
            "amount": "「金額合計」の数値（値引後の行金額、例: 57500、1500000、179000、2500000）"
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

    // データの正規化
    if (!parsedData.estimateNo && Array.isArray(parsedData.items)) {
      const itemWithEst = parsedData.items.find((it: any) => it.estimateNo);
      if (itemWithEst) {
        parsedData.estimateNo = itemWithEst.estimateNo;
      }
    }

    // 書面からsubtotalAmountが直接取得できなかった場合のみ明細の記載金額から補完
    if (parsedData.subtotalAmount === undefined || parsedData.subtotalAmount === null) {
      if (Array.isArray(parsedData.items) && parsedData.items.length > 0) {
        const itemsTotal = parsedData.items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
        if (itemsTotal > 0) {
          parsedData.subtotalAmount = itemsTotal;
        }
      }
    }

    // 代表商品名
    if (!parsedData.itemName && Array.isArray(parsedData.items) && parsedData.items.length > 0) {
      parsedData.itemName = parsedData.items[0]?.itemName || '';
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

    // 7. 支払明細書（PAYMENT_STATEMENT）の処理（全明細行をループ処理）
    let paymentResults: any[] = [];
    if (parsedData.type === 'PAYMENT_STATEMENT' || (parsedData.documentNumber && String(parsedData.documentNumber).startsWith('SH'))) {
      // 計上日の翌月末日を入金予定日とする（土日の場合は手前の平日に前倒し調整）
      let expectedPayDate: Date;
      if (parsedData.paymentDate) {
        expectedPayDate = adjustToPreviousBusinessDay(new Date(parsedData.paymentDate));
      } else {
        expectedPayDate = calculateExpectedPayDate(parsedData.date);
      }

      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      // 入金予定日 <= システム日付 なら「入金済」、未来なら「入金予定」
      const isPastOrToday = expectedPayDate <= endOfToday;
      const targetStatus = isPastOrToday ? '入金済' : '入金予定';

      const items = Array.isArray(parsedData.items) && parsedData.items.length > 0
        ? parsedData.items
        : [{ itemName: parsedData.itemName, amount: parsedData.totalAmount }];

      // 各明細行ごとにマッチする案件を探索して更新
      for (const item of items) {
        let matchedProject = null;

        // 1. 各明細行の購買NO（orderNumber）で検索
        const orderNo = item.orderNumber || item.documentNumber;
        if (orderNo) {
          const rawOrderNo = String(orderNo).trim();
          const baseOrderNo = rawOrderNo.replace(/-\d+$/, '').trim(); // 枝番を除去（例: KB2026000000762-1 -> KB2026000000762）

          matchedProject = await prisma.project.findFirst({
            where: {
              OR: [
                { clientOrderNo: rawOrderNo },
                { clientOrderNo: baseOrderNo },
                { clientOrderNo: { contains: baseOrderNo } },
              ],
              deletedAt: null,
              ...(partner ? { partnerId: partner.id } : {})
            },
            include: {
              partner: true,
            }
          });
        }

        // 2. お見積No（estimateNo）での検索
        const itemEstimateNo = item.estimateNo || estimateNo;
        if (!matchedProject && itemEstimateNo) {
          const est = await prisma.estimate.findFirst({
            where: { estimateNo: String(itemEstimateNo).trim(), deletedAt: null },
            include: { project: { include: { partner: true } } }
          });
          if (est?.project) matchedProject = est.project;
        }

        // 3. 商品名（itemName）での部分一致検索
        if (!matchedProject && item.itemName) {
          const cleanName = String(item.itemName).replace(/[\s　]/g, '').slice(0, 10);
          const projects = await prisma.project.findMany({
            where: {
              deletedAt: null,
              ...(partner ? { partnerId: partner.id } : {})
            },
            include: {
              partner: true,
            }
          });
          matchedProject = projects.find(p => {
            const pName = p.name.replace(/[\s　]/g, '');
            return pName.includes(cleanName) || cleanName.includes(pName.slice(0, 10));
          }) || null;
        }

        // マッチした案件の更新処理
        if (matchedProject) {
          const itemAmount = Number(item.amount) || Number(item.unitPrice) || 0;

          const updatedProj = await prisma.project.update({
            where: { id: matchedProject.id },
            data: {
              status: targetStatus,
              expectedPayDate: expectedPayDate,
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
                paidDate: isPastOrToday ? expectedPayDate : invoice.paidDate,
                paidAmount: isPastOrToday 
                  ? (itemAmount > 0 ? itemAmount : invoice.totalAmount) 
                  : invoice.paidAmount,
              }
            });
          }

          // 紐づく Delivery の expectedPayDate も更新
          await prisma.delivery.updateMany({
            where: { projectId: matchedProject.id, deletedAt: null },
            data: { expectedPayDate: expectedPayDate }
          });

          // 監査ログ追記
          await prisma.auditLog.create({
            data: {
              entityName: 'Project',
              entityId: matchedProject.id,
              action: 'PAYMENT_STATEMENT_IMPORT',
              diff: {
                documentNumber: parsedData.documentNumber,
                itemOrderNumber: item.orderNumber,
                itemName: item.itemName,
                itemAmount: item.amount,
                billingDate: parsedData.date,
                expectedPayDate: expectedPayDate.toISOString().slice(0, 10),
                targetStatus,
                isPastOrToday,
              },
              userId: 'PDF_IMPORT'
            }
          });

          paymentResults.push({
            project: updatedProj,
            invoice: updatedInv,
            item: item,
            status: targetStatus,
            expectedPayDate: expectedPayDate.toISOString().slice(0, 10),
          });
        } else {
          paymentResults.push({
            project: null,
            item: item,
            status: 'UNMATCHED',
            expectedPayDate: expectedPayDate.toISOString().slice(0, 10),
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: pdfImport,
      createdOrder,
      updatedProject,
      matchedEstimate,
      orderAcceptance,
      paymentResults,
      paymentResult: paymentResults[0] || null,
      parsedData
    });

  } catch (error: any) {
    console.error('PDF Import Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
