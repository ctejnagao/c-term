import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: {
        status: {
          in: ['案件', '見積中', '受注', '一部納品']
        }
      },
      include: {
        partner: true,
        estimates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            items: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching pending projects:', error);
    return NextResponse.json({ error: 'Failed to fetch pending projects' }, { status: 500 });
  }
}
