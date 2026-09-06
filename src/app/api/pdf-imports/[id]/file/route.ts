import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolvePdfFilePath } from '@/lib/pdfStorage';
import fs from 'fs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: '無効なIDです' }, { status: 400 });
    }

    const pdfImport = await prisma.pdfImport.findUnique({
      where: { id },
      select: { id: true, fileName: true, fileUrl: true },
    });

    if (!pdfImport) {
      return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
    }

    const filePath = resolvePdfFilePath(pdfImport.fileName, pdfImport.fileUrl);

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json(
        { 
          error: 'PDFファイルが見つかりません',
          fileName: pdfImport.fileName,
          fileUrl: pdfImport.fileUrl 
        }, 
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);
    const contentType = filePath.toLowerCase().endsWith('.pdf') 
      ? 'application/pdf' 
      : 'application/octet-stream';

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(pdfImport.fileName || 'document.pdf')}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('PDF stream error:', error);
    return NextResponse.json({ error: 'ファイルの取得に失敗しました' }, { status: 500 });
  }
}
