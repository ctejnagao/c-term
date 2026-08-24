'use client';

import { useState, useEffect } from 'react';
import { Search, ExternalLink, Terminal, Copy, Check, Server, Tag, Lock } from 'lucide-react';

type MockPrototype = {
  id: number;
  title: string;
  description: string;
  category: string;
  tags: string | null;
  repoUrl: string | null;
  composeCmd: string | null;
  port: string | null;
  defaultCreds: string | null;
  version: string | null;
};

export default function MocksCatalogPage() {
  const [mocks, setMocks] = useState<MockPrototype[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMocks();
  }, []);

  const fetchMocks = async () => {
    try {
      const res = await fetch('/api/mocks');
      if (res.ok) {
        const data = await res.json();
        setMocks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(mocks.map(m => m.category)))];

  const filteredMocks = mocks.filter(mock => {
    const matchesCategory = selectedCategory === 'all' || mock.category === selectedCategory;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      mock.title.toLowerCase().includes(searchLower) || 
      mock.description.toLowerCase().includes(searchLower) ||
      (mock.tags && mock.tags.toLowerCase().includes(searchLower));
    
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMessage('コピーしました');
    
    setTimeout(() => {
      setCopiedId(null);
      setToastMessage(null);
    }, 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header Area */}
      <div className="mb-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Server className="text-indigo-600" />
            モック・プロトタイプ カタログ
          </h1>
          <p className="text-gray-500 mt-2 text-sm">客先デモ用の環境をすばやく検索・起動できます。</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <input 
              type="text" 
              placeholder="キーワードで検索 (モック名、業種、タグ...)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat === 'all' ? 'すべて' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex justify-center py-20 text-gray-500">読み込み中...</div>
      ) : filteredMocks.length === 0 ? (
        <div className="flex justify-center py-20 text-gray-500">該当するモックが見つかりません。</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredMocks.map(mock => (
            <div key={mock.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
                        {mock.category}
                      </span>
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 rounded-full">
                        {mock.version}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{mock.title}</h2>
                  </div>
                  {mock.repoUrl && (
                    <a 
                      href={mock.repoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-indigo-600 transition-colors p-2"
                      title="リポジトリを開く"
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
                  {mock.description}
                </p>

                {mock.tags && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {mock.tags.split(',').map((tag, idx) => (
                      <span key={idx} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        <Tag size={12} /> {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 bg-gray-50 flex-1 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                  {mock.port && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <ExternalLink size={16} className="text-gray-400" />
                      <span className="font-semibold">ポート:</span> 
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{mock.port}</span>
                    </div>
                  )}
                  {mock.defaultCreds && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Lock size={16} className="text-gray-400" />
                      <span className="font-semibold">ログイン:</span> 
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{mock.defaultCreds}</span>
                    </div>
                  )}
                </div>

                {mock.composeCmd && (
                  <div className="mt-auto">
                    <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                      <Terminal size={14} /> 起動コマンド
                    </div>
                    <div className="relative group">
                      <div className="bg-slate-900 text-green-400 font-mono text-sm p-3 rounded-lg pr-12 overflow-x-auto whitespace-pre">
                        {mock.composeCmd}
                      </div>
                      <button 
                        onClick={() => handleCopy(mock.id, mock.composeCmd!)}
                        className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-md transition-colors"
                        title="コピー"
                      >
                        {copiedId === mock.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-up z-50">
          <Check size={18} className="text-green-400" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.2s ease-out forwards;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
