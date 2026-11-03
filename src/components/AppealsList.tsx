import React from 'react';
import { Appeal } from '../types';
import { Video, Mic, FileText, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AppealsListProps {
  appeals: Appeal[];
  onSelectAppeal: (appeal: Appeal) => void;
  selectedAppealId?: string;
}

export const AppealsList: React.FC<AppealsListProps> = ({
  appeals,
  onSelectAppeal,
  selectedAppealId,
}) => {
  if (appeals.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">Murojaatlar topilmadi</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Tanlangan hudud yoki filtrlarga mos keluvchi arizalar mavjud emas. Filtrlarni tozalab koʻring yoki Telegram boti orqali yangi murojaat yoʻllang.
        </p>
      </div>
    );
  }

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('uz-UZ', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getMediaBadge = (type: string) => {
    switch (type) {
      case 'video_note':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Kruglyash 📹</span>
          </span>
        );
      case 'video':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60">
            <Video className="w-3 h-3 text-sky-600" />
            <span>Oddiy Video 🎬</span>
          </span>
        );
      case 'voice':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">
            <Mic className="w-3 h-3 text-purple-600" />
            <span>Ovozli xabar 🎙</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <FileText className="w-3 h-3 text-slate-500" />
            <span>Matnli 📝</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Yangi':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Yangi</span>
          </span>
        );
      case "Ko'rib chiqilmoqda":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Koʻrib chiqilmoqda</span>
          </span>
        );
      case 'Jarayonda':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            <span>Jarayonda</span>
          </span>
        );
      case 'Hal qilindi':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>Hal qilindi</span>
          </span>
        );
      default:
        return (
          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {appeals.map((appeal) => {
        const isSelected = selectedAppealId === appeal.id;
        const isUrgent = appeal.aiAnalysis?.urgency.includes('Yuqori');

        return (
          <div
            key={appeal.id}
            onClick={() => onSelectAppeal(appeal)}
            className={`group bg-white border rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-400 hover:shadow-sm cursor-pointer transition-all ${
              isSelected
                ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50/50'
                : 'border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  #{appeal.id}
                </span>
                {getMediaBadge(appeal.media.type)}
                {getStatusBadge(appeal.status)}
                {isUrgent && (
                  <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>Shoshilinch</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                {formatRelativeTime(appeal.createdAt)}
              </div>
            </div>

            {/* Citizen and Address Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4">
                <div className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {appeal.citizenName}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  {appeal.telegramUsername ? (
                    <span className="text-sky-600 font-medium">
                      {appeal.telegramUsername}
                    </span>
                  ) : (
                    <span>Telegram ID: {appeal.telegramUserId}</span>
                  )}
                  {appeal.citizenPhone && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{appeal.citizenPhone}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Location Hierarchy */}
              <div className="md:col-span-5">
                <div className="text-xs font-medium text-slate-700">
                  {appeal.mahalla}
                </div>
                <div className="text-[11px] text-slate-500">
                  {appeal.district}, {appeal.region}
                </div>
              </div>

              {/* Inspector assignment & Action */}
              <div className="md:col-span-3 flex items-center justify-between sm:justify-end gap-3 text-right">
                <div className="text-left sm:text-right">
                  <div className="text-[11px] text-slate-500">Masʼul inspektor:</div>
                  <div className="text-xs font-medium text-slate-800 truncate max-w-[160px]">
                    {appeal.assignedInspectorName?.split('(')[0] || 'Biriktirilmagan'}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* AI Summary and Snippet */}
            {appeal.aiAnalysis && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded shrink-0">
                    AI Toifa
                  </span>
                  <span className="font-medium text-slate-800 shrink-0">
                    {appeal.aiAnalysis.category}:
                  </span>
                  <span className="truncate text-slate-500">
                    {appeal.aiAnalysis.summary}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 italic">
                  {appeal.aiAnalysis.mjtArticle}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
