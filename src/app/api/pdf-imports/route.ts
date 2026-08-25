import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

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

    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const prompt = `
      このPDF（または画像）を解析し、以下の構造を持つJSONを出力してください。
      \`\`\`json
      {
        "type": "ORDER" | "PAYMENT_STATEMENT" | "INVOICE" | "UNKNOWN",
        "partnerCode": "取引先コードがある場合抽出",
        "partnerName": "取引先名",
        "documentNumber": "発注NOや支払NOなど",
        "date": "2026-04-30のような日付フォーマット",
        "totalAmount": "税込合計金額（数値のみ、カンマなし）",
        "items": [
          {
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
    
    let parsedData = null;
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

    // 4. データ自動登録 (注文書の場合のみ Order を作成する例)
    let createdOrder = null;
    if (parsedData.type === 'ORDER' && parsedData.partnerName) {
      // 取引先を検索
      const partner = await prisma.partner.findFirst({
        where: { 
          OR: [
            { code: parsedData.partnerCode },
            { name: { contains: parsedData.partnerName.replace('株式会社', '').trim() } }
          ],
          deletedAt: null
        }
      });

      if (partner) {
        // Order作成
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
    }

    return NextResponse.json({ 
      success: true, 
      data: pdfImport,
      createdOrder,
      parsedData
    });

  } catch (error: any) {
    console.error('PDF Import Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
