import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateNextSequence } from '@/lib/sequence';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const where = status ? { status } : {};

    const projects = await prisma.project.findMany({
      where,
      include: {
        partner: true,
        estimates: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { id: 'desc' },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 案件№の自動採番
    const projectCode = await generateNextSequence('PROJECT');

    const project = await prisma.project.create({
      data: {
        projectCode,
        name: data.name,
        partnerId: Number(data.partnerId),
        status: data.status || '案件',
        leadStaff: data.leadStaff,
        approximateAmount: data.approximateAmount ? Number(data.approximateAmount) : null,
      },
      include: {
        partner: true,
      }
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
