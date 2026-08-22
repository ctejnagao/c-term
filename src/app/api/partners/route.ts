import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { id: 'desc' },
    });
    return NextResponse.json(partners);
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({ error: 'Failed to fetch partners' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const partner = await prisma.partner.create({
      data: {
        name: data.name,
        code: data.code,
        shortName: data.shortName,
        department: data.department,
        postalCode: data.postalCode,
        address: data.address,
        tel: data.tel,
        fax: data.fax,
        closingDay: data.closingDay,
        paymentTerm: data.paymentTerm,
        isCustomer: data.isCustomer ?? true,
        isSupplier: data.isSupplier ?? false,
      }
    });
    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 });
  }
}
