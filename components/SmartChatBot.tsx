
import React, { useState, useRef, useEffect } from 'react';
import { Product, ChatMessage } from '../types';
import { Send, User, Search, RefreshCw, Sparkles, MessageSquare } from 'lucide-react';
import { queryGemini } from '../services/gemini';

interface SmartChatBotProps {
  products: Product[];
}

export const SmartChatBot: React.FC<SmartChatBotProps> = ({ products }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickReplies = ["Montale", "Tom Ford", "Byredo", "Ganymede", "Как заказать?"];

  useEffect(() => {
    if (products.length > 0 && messages.length === 0) {
      setTimeout(() => {
        addMessage({
          role: 'assistant',
          content: `Бот Rich Flavour готов к работе! ✨\n\nНапишите название интересующего вас аромата, и я помогу найти его в нашем прайсе.`,
        });
      }, 500);
    }
  }, [products]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...msg,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    }]);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userText = text.trim();
    setInput('');
    addMessage({ role: 'user', content: userText });
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role as any, content: m.content }));
      const response = await queryGemini(userText, products, history);
      addMessage({ role: 'assistant', content: response });
    } catch (err) {
      addMessage({ role: 'assistant', content: "Ошибка связи с ИИ. Проверьте интернет." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#003399] text-white' : 'bg-slate-50 text-slate-700 border border-slate-100'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-xs text-slate-400 animate-pulse uppercase font-black px-2">Поиск...</div>}
      </div>

      <div className="p-6 border-t border-slate-50">
        <div className="flex gap-2 overflow-x-auto mb-4 no-scrollbar">
          {quickReplies.map(q => (
            <button key={q} onClick={() => handleSend(q)} className="px-4 py-2 bg-slate-50 rounded-full text-[10px] font-black uppercase text-slate-500 hover:bg-pink-50 hover:text-pink-600 transition-all whitespace-nowrap">
              {q}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Название аромата..."
            className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-50 text-sm"
          />
          <button type="submit" className="w-14 bg-[#003399] text-white rounded-2xl flex items-center justify-center hover:bg-[#FF3399] transition-all shadow-lg active:scale-90">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
