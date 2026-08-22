import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const partner = await prisma.partner.findUnique({
      where: { id: Number(resolvedParams.id) }
    });
    if (!partner) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(partner);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await req.json();
    
    const partner = await prisma.partner.update({
      where: { id: Number(resolvedParams.id) },
      data: {
        name: data.name,
        code: data.code || null,
        shortName: data.shortName || null,
        department: data.department || null,
        postalCode: data.postalCode || null,
        address: data.address || null,
        tel: data.tel || null,
        fax: data.fax || null,
        closingDay: data.closingDay || null,
        paymentTerm: data.paymentTerm || null,
        isCustomer: data.isCustomer,
        isSupplier: data.isSupplier
      }
    });
    
    return NextResponse.json(partner);
  } catch (error: any) {
    console.error('Update failed:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    await prisma.partner.delete({
      where: { id: Number(resolvedParams.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete failed:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}
