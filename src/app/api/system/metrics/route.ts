import { NextResponse } from 'next/server';
import os from 'os';
import prisma from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  
  // 1. OS & Memory
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);
  const cpuLoad = os.loadavg(); // Note: Windows may return [0,0,0]

  // 2. DB Health Check
  let dbStatus = 'healthy';
  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (err) {
    dbStatus = 'down';
  }

  // 3. Ollama Health Check
  let ollamaStatus = 'healthy';
  let models: string[] = [];
  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags', { 
      signal: AbortSignal.timeout(2000),
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      models = data.models?.map((m: any) => m.name) || [];
    } else {
      ollamaStatus = 'degraded';
    }
  } catch (err) {
    ollamaStatus = 'down';
  }

  // Next.js (Node process) memory usage
  const processMem = process.memoryUsage();

  return NextResponse.json({
    system: {
      uptime: os.uptime(),
      platform: os.platform(),
      totalMemGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
      usedMemGB: (usedMem / 1024 / 1024 / 1024).toFixed(2),
      memoryUsagePercent: Number(memoryUsagePercent),
      cpuCores: os.cpus().length,
      cpuLoad,
      processMemoryMB: (processMem.rss / 1024 / 1024).toFixed(2)
    },
    services: {
      database: { status: dbStatus, latencyMs: dbLatency },
      ollama: { status: ollamaStatus, models },
      nextjs: { status: 'healthy', uptimeSeconds: process.uptime() }
    },
    timestamp: new Date().toISOString()
  });
}
