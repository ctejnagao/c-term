import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const imports = await prisma.pdfImport.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return NextResponse.json(imports);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
