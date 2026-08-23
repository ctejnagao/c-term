'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Edit2, Bot, BookOpen, Save, X } from 'lucide-react';

type SystemMemo = {
  id: number;
  title: string;
  category: string;
  content: string;
  tags: string | null;
  updatedAt: string;
};

export default function KnowledgePage() {
  const [memos, setMemos] = useState<SystemMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentMemo, setCurrentMemo] = useState<Partial<SystemMemo>>({});
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<{role: 'bot' | 'user', text: string}[]>([
    { role: 'bot', text: 'こんにちは！社内システムの仕様や運用ルールについて、何でも聞いてください。左側の備忘録データも参照可能です。' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const categories = ['インフラ', '開発', '運用ルール', 'その他'];

  useEffect(() => {
    fetchMemos();
  }, []);

  const fetchMemos = async (q = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/system-memos${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      const data = await res.json();
      setMemos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemos(searchQuery);
  };

  const handleNew = () => {
    setCurrentMemo({ category: 'インフラ', title: '', content: '', tags: '' });
    setIsEditing(true);
  };

  const handleEdit = (memo: SystemMemo) => {
    setCurrentMemo(memo);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentMemo.id) {
        // Update
        await fetch(`/api/system-memos/${currentMemo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentMemo),
        });
      } else {
        // Create
        await fetch('/api/system-memos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentMemo),
        });
      }
      setIsEditing(false);
      fetchMemos(searchQuery);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('本当に削除しますか？')) return;
    try {
      await fetch(`/api/system-memos/${id}`, { method: 'DELETE' });
      fetchMemos(searchQuery);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'bot', text: data.reply || 'エラーが発生しました。' }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'bot', text: '通信エラーが発生しました。' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex h-[calc(100vh-4rem)] gap-6">
      
      {/* Left Panel: Knowledge Base */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-lg">
              <BookOpen size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-800">社内備忘録</h1>
          </div>
          <button 
            onClick={handleNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            <Plus size={16} /> 新規メモ
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <form onSubmit={handleSearch} className="relative">
            <input 
              type="text" 
              placeholder="メモを検索..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">読み込み中...</div>
          ) : memos.length === 0 ? (
            <div className="text-center text-gray-500 py-8">メモがありません</div>
          ) : (
            memos.map(memo => (
              <div key={memo.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors bg-white group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                      {memo.category}
                    </span>
                    <h3 className="font-bold text-gray-800">{memo.title}</h3>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(memo)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(memo.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">{memo.content}</p>
                {memo.tags && (
                  <div className="mt-4 flex gap-2">
                    {memo.tags.split(',').map((tag, idx) => (
                      <span key={idx} className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: AI Chat (Placeholder/Mock UI) */}
      <div className="w-96 flex flex-col bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
          <div className="p-2 bg-indigo-500 text-white rounded-lg">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="font-bold text-white leading-tight">社内AIアシスタント</h2>
            <p className="text-xs text-slate-400">c-terp Knowledge AI</p>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto bg-slate-900 flex flex-col gap-4">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              <div className={`text-sm p-3 rounded-lg border whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 border-slate-700 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-slate-800 text-slate-400 text-sm p-3 rounded-lg rounded-tl-none border border-slate-700 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <form onSubmit={handleChatSubmit} className="relative">
            <input 
              type="text" 
              placeholder="質問を入力..." 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button 
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-white transition-colors bg-slate-700 hover:bg-indigo-600 rounded disabled:opacity-50 disabled:hover:bg-slate-700"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="font-bold text-lg text-gray-800">
                {currentMemo.id ? '備忘録を編集' : '新規備忘録の作成'}
              </h2>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                  <input 
                    type="text" 
                    value={currentMemo.title || ''}
                    onChange={e => setCurrentMemo({...currentMemo, title: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                  <select
                    value={currentMemo.category || 'インフラ'}
                    onChange={e => setCurrentMemo({...currentMemo, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                  <textarea 
                    value={currentMemo.content || ''}
                    onChange={e => setCurrentMemo({...currentMemo, content: e.target.value})}
                    required
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">タグ (カンマ区切り)</label>
                  <input 
                    type="text" 
                    value={currentMemo.tags || ''}
                    onChange={e => setCurrentMemo({...currentMemo, tags: e.target.value})}
                    placeholder="NextJS, Prisma, デプロイ"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Save size={16} /> 保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
