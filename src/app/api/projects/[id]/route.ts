import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const project = await prisma.project.findUnique({
      where: { id: Number(resolvedParams.id) },
      include: {
        partner: true,
        estimates: { orderBy: { createdAt: 'desc' } },
        deliveries: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await req.json();
    
    const project = await prisma.project.update({
      where: { id: Number(resolvedParams.id) },
      data: {
        name: data.name,
        status: data.status,
        leadStaff: data.leadStaff,
        customerDepartment: data.customerDepartment,
        customerStaff: data.customerStaff
      }
    });
    
    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Update failed:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    await prisma.project.delete({
      where: { id: Number(resolvedParams.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete failed:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}
