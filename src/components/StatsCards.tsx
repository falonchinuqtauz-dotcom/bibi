import React from 'react';
import { FileText, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface StatsCardsProps {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  urgent: number;
  inspectorsCount: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  total,
  pending,
  inProgress,
  resolved,
  urgent,
  inspectorsCount,
}) => {
  const resolveRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total appeals */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-medium">Jami murojaatlar</span>
          <FileText className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
          {total}
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <span>Yangi kelgan:</span>
          <span className="font-semibold text-slate-800 font-mono tabular-nums">{pending} ta</span>
          <span aria-hidden="true">·</span>
          <span>Jarayonda:</span>
          <span className="font-semibold text-slate-800 font-mono tabular-nums">{inProgress} ta</span>
        </div>
      </div>

      {/* 2. Resolved cases */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-medium">Hal etilgan murojaatlar</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
          {resolved}
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <span className="text-emerald-600 font-semibold font-mono tabular-nums">%{resolveRate}</span>
          <span>muvaffaqiyatli yakunlangan</span>
        </div>
      </div>

      {/* 3. Urgent (AI Flagged) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-medium">Shoshilinch (AI belgilagan)</span>
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
          {urgent}
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <span>Tezkor chora talab etiladigan holatlar</span>
        </div>
      </div>

      {/* 4. Active Inspectors */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-medium">Biriktirilgan inspektorlar</span>
          <ShieldCheck className="w-4 h-4 text-slate-700" />
        </div>
        <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
          {inspectorsCount}
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <span>MFYlar boʻyicha uchastkavoylar</span>
        </div>
      </div>
    </div>
  );
};
