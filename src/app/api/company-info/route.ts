import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    let companyInfo = await prisma.companyInfo.findUnique({
      where: { id: 1 },
    });

    // If it doesn't exist, create a default one
    if (!companyInfo) {
      const currentYearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      companyInfo = await prisma.companyInfo.create({
        data: {
          id: 1,
          companyName: '株式会社サンプル', // Placeholder
          currentProcessingMonth: currentYearMonth,
          fiscalYearEndMonth: 3,
        }
      });
    }

    return NextResponse.json(companyInfo);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch company info' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const updated = await prisma.companyInfo.upsert({
      where: { id: 1 },
      update: {
        companyName: data.companyName,
        postalCode: data.postalCode,
        address: data.address,
        tel: data.tel,
        fax: data.fax,
        invoiceNumber: data.invoiceNumber,
        fiscalYearEndMonth: data.fiscalYearEndMonth ? Number(data.fiscalYearEndMonth) : undefined,
        currentProcessingMonth: data.currentProcessingMonth,
      },
      create: {
        id: 1,
        companyName: data.companyName || '株式会社サンプル',
        postalCode: data.postalCode,
        address: data.address,
        tel: data.tel,
        fax: data.fax,
        invoiceNumber: data.invoiceNumber,
        fiscalYearEndMonth: data.fiscalYearEndMonth ? Number(data.fiscalYearEndMonth) : 3,
        currentProcessingMonth: data.currentProcessingMonth || new Date().toISOString().slice(0, 7),
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update company info' }, { status: 500 });
  }
}
