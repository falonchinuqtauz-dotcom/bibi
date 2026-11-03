import React from 'react';
import { Shield, Send, Bot } from 'lucide-react';

interface HeaderProps {
  activeTab: 'appeals' | 'inspectors' | 'citizen_portal' | 'bot_info';
  onTabChange: (tab: 'appeals' | 'inspectors' | 'citizen_portal' | 'bot_info') => void;
  onOpenNewAppealModal: () => void;
  botUsername?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenNewAppealModal,
  botUsername = 'aimurojat_bot',
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <div
          onClick={() => onTabChange('appeals')}
          className="flex items-center gap-3 cursor-pointer whitespace-nowrap shrink-0 group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:bg-slate-800 transition-colors">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 tracking-tight">AI Murojaat</span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                Mahalla IIB
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-normal">Profilaktika inspektorlari portali</span>
          </div>
        </div>

        {/* Zone 2: 4 clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => onTabChange('appeals')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              activeTab === 'appeals'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Murojaatlar jurnali
          </button>
          <button
            type="button"
            onClick={() => onTabChange('inspectors')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              activeTab === 'inspectors'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profilaktika inspektorlari
          </button>
          <button
            type="button"
            onClick={() => onTabChange('citizen_portal')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              activeTab === 'citizen_portal'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Onlayn ariza berish
          </button>
          <button
            type="button"
            onClick={() => onTabChange('bot_info')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors flex items-center gap-1.5 ${
              activeTab === 'bot_info'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4 text-emerald-600" />
            <span>Telegram Bot</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 py-2 px-3 rounded-lg border border-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-sky-500" />
            <span>@{botUsername}</span>
          </a>
          <button
            type="button"
            onClick={onOpenNewAppealModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span>+ Ariza yoʻllash</span>
          </button>
        </div>
      </div>
    </header>
  );
};
