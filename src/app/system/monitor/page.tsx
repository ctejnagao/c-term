'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Database, Brain, RotateCcw, Clock, Cpu, HardDrive } from 'lucide-react';

type Metrics = {
  system: {
    uptime: number;
    platform: string;
    totalMemGB: string;
    usedMemGB: string;
    memoryUsagePercent: number;
    cpuCores: number;
    cpuLoad: number[];
    processMemoryMB: string;
  };
  services: {
    database: { status: 'healthy' | 'degraded' | 'down'; latencyMs: number };
    ollama: { status: 'healthy' | 'degraded' | 'down'; models: string[] };
    nextjs: { status: 'healthy' | 'degraded' | 'down'; uptimeSeconds: number };
  };
  timestamp: string;
};

export default function SystemMonitorPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/metrics', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch system metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 30000); // 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!metrics && loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center">
          <Activity size={32} className="text-gray-400 mb-2" />
          <span className="text-gray-500">メトリクスを読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">サーバーシステム監視</h1>
            <p className="text-sm text-gray-500">ホストOSおよび稼働サービスのヘルスチェック</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>最終更新: {lastUpdated?.toLocaleTimeString()}</span>
          <button 
            onClick={fetchMetrics} 
            disabled={loading}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={16} className={loading ? 'animate-spin' : ''} />
            更新
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* System Resources Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Server size={20} className="text-gray-600" />
            <h2 className="text-lg font-bold text-gray-800">ホストリソース (OS: {metrics?.system.platform})</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 font-medium flex items-center gap-1"><HardDrive size={16}/> メモリ使用率</span>
                <span className="font-bold text-gray-800">{metrics?.system.memoryUsagePercent}% ({metrics?.system.usedMemGB}GB / {metrics?.system.totalMemGB}GB)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-2.5 rounded-full transition-all ${
                    (metrics?.system.memoryUsagePercent || 0) > 90 ? 'bg-red-500' :
                    (metrics?.system.memoryUsagePercent || 0) > 75 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} 
                  style={{ width: `${metrics?.system.memoryUsagePercent || 0}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Cpu size={14}/> CPUコア数</div>
                <div className="text-xl font-bold text-gray-800">{metrics?.system.cpuCores} Cores</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock size={14}/> OS稼働時間</div>
                <div className="text-xl font-bold text-gray-800">{metrics ? formatUptime(metrics.system.uptime) : '-'}</div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">Next.js プロセス (Node.js) メモリ消費量</span>
              <span className="font-bold text-blue-900">{metrics?.system.processMemoryMB} MB</span>
            </div>
          </div>
        </div>

        {/* Services Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={20} className="text-gray-600" />
            <h2 className="text-lg font-bold text-gray-800">サービスステータス</h2>
          </div>

          <div className="space-y-4 flex-1">
            {/* Database */}
            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <Database size={24} className="text-blue-500" />
                <div>
                  <div className="font-bold text-gray-800">PostgreSQL (Prisma)</div>
                  <div className="text-xs text-gray-500">Primary Database</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 font-mono">{metrics?.services.database.latencyMs}ms</span>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getStatusColor(metrics?.services.database.status || '')}`}></span>
                  <span className="text-sm font-medium uppercase capitalize">{metrics?.services.database.status}</span>
                </div>
              </div>
            </div>

            {/* Ollama */}
            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <Brain size={24} className="text-purple-500" />
                <div>
                  <div className="font-bold text-gray-800">Ollama (LLM)</div>
                  <div className="text-xs text-gray-500">Local AI Inference</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getStatusColor(metrics?.services.ollama.status || '')}`}></span>
                  <span className="text-sm font-medium uppercase capitalize">{metrics?.services.ollama.status}</span>
                </div>
                {metrics?.services.ollama.models && metrics.services.ollama.models.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {metrics.services.ollama.models.length} Models loaded
                  </div>
                )}
              </div>
            </div>

            {/* Next.js */}
            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <Server size={24} className="text-gray-800" />
                <div>
                  <div className="font-bold text-gray-800">Next.js Web Server</div>
                  <div className="text-xs text-gray-500">Frontend & API</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 font-mono">Uptime: {metrics ? formatUptime(metrics.services.nextjs.uptimeSeconds) : '-'}</span>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getStatusColor(metrics?.services.nextjs.status || '')}`}></span>
                  <span className="text-sm font-medium uppercase capitalize">{metrics?.services.nextjs.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
