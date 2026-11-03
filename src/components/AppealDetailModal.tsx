import React, { useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  Shield,
  MapPin,
  Clock,
  Phone,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Copy,
  ExternalLink,
  Mic,
  Scale,
  BookOpen,
  Edit2,
  Check,
} from 'lucide-react';
import { Appeal, AppealStatus } from '../types';
import { CircularVideoPlayer } from './CircularVideoPlayer';
import { VoiceAudioPlayer } from './VoiceAudioPlayer';

interface AppealDetailModalProps {
  appeal: Appeal | null;
  onClose: () => void;
  onSendResponse: (appealId: string, message: string, newStatus?: AppealStatus) => Promise<void>;
  onUpdateStatus: (appealId: string, status: AppealStatus) => Promise<void>;
  onRerunAI: (appealId: string) => Promise<void>;
}

export const AppealDetailModal: React.FC<AppealDetailModalProps> = ({
  appeal,
  onClose,
  onSendResponse,
  onUpdateStatus,
  onRerunAI,
}) => {
  if (!appeal) return null;

  const [replyText, setReplyText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AppealStatus>(appeal.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingAI, setIsRefreshingAI] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Article qualification editing state
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(appeal.aiAnalysis?.mjtArticle || '');
  const [isSavingArticle, setIsSavingArticle] = useState(false);

  const commonArticles = [
    "MJtK 163-modda: Shaharlar va boshqa aholi punktlarida jamoat foydalanishidagi yerlarni o'zboshimchalik bilan egallash, to'siq o'rnatish",
    "MJtK 183-modda: Mayda bezorilik (jamoat joylarida uyatli so'zlar bilan so'kinish, haqoratomuz tegajaklik qilish)",
    "MJtK 52-modda: Qasddan badanga yengil shikast yetkazish",
    "MJtK 161-modda: Shaharlar va boshqa aholi punktlarining obodonlashtirish qoidalarini buzish (hududlarni ifloslantirish)",
    "MJtK 128-modda: Haydovchilarning piyodalar yo'lkalaridan yurishi va yo'l harakati qoidalarini buzishi",
    "MJtK 189-modda: Tazyiq va zo'ravonlik o'tkazish, himoya orderi talablarini bajarmaslik",
    "MJtK 41-modda: Haqorat qilish (shaxsning sha'ni va qadr-qimmatini kamsitish)",
    "MJtK 47-modda: Bolalarni tarbiyalash va ularga ta'lim berish borasidagi majburiyatlarni bajarmaslik",
    "MJtK 192-modda: Maishiy shovqinga qarshi kurashish talablarini buzish (tungi 23:00 dan 06:00 gacha)",
    "O'zbekiston JK 168-modda: Firibgarlik",
    "MJtK 200-modda: O'zboshimchalik",
    "O'zbekiston Respublikasi 'Huquqbuzarliklar profilaktikasi to'g'risida'gi Qonunining 20-moddasi",
  ];

  const handleSaveArticle = async (chosenArticle: string) => {
    setIsSavingArticle(true);
    try {
      const res = await fetch(`/api/appeals/${appeal.id}/article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mjtArticle: chosenArticle }),
      });
      if (res.ok) {
        if (appeal.aiAnalysis) {
          appeal.aiAnalysis.mjtArticle = chosenArticle;
        }
        setCurrentArticle(chosenArticle);
        setIsEditingArticle(false);
      }
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    } finally {
      setIsSavingArticle(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      await onSendResponse(appeal.id, replyText, selectedStatus);
      setReplyText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: AppealStatus) => {
    setSelectedStatus(newStatus);
    await onUpdateStatus(appeal.id, newStatus);
  };

  const handleRerunAI = async () => {
    setIsRefreshingAI(true);
    try {
      await onRerunAI(appeal.id);
    } finally {
      setIsRefreshingAI(false);
    }
  };

  const copyAIDraft = () => {
    if (appeal.aiAnalysis?.responseDraft) {
      setReplyText(appeal.aiAnalysis.responseDraft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
              #{appeal.id}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {appeal.citizenName}
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-500 font-mono">
                {appeal.mahalla}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Dropdown */}
            <select
              value={appeal.status}
              onChange={(e) => handleStatusChange(e.target.value as AppealStatus)}
              className="py-1 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="Yangi">Yangi</option>
              <option value="Ko'rib chiqilmoqda">Koʻrib chiqilmoqda</option>
              <option value="Jarayonda">Jarayonda</option>
              <option value="Hal qilindi">Hal qilindi</option>
              <option value="Rad etildi">Rad etildi</option>
            </select>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Grid: Left Column (Citizen & Media), Right Column (AI Analysis & Legal Advice) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Media & Citizen Info (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Citizen Details Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 font-medium">
                  <span className="text-slate-500">Fuqaro maʼlumotlari</span>
                  <span className="text-slate-400 font-mono">
                    {new Date(appeal.createdAt).toLocaleString('uz-UZ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">F.I.Sh:</span>
                    <span className="font-semibold text-slate-900">{appeal.citizenName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Telegram aloqa:</span>
                    {appeal.telegramUsername ? (
                      <a
                        href={`https://t.me/${appeal.telegramUsername.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>{appeal.telegramUsername}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600">ID: {appeal.telegramUserId}</span>
                    )}
                  </div>
                  {appeal.citizenPhone && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Telefon raqami:</span>
                      <span className="font-mono">{appeal.citizenPhone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block text-[11px]">Masʼul inspektor:</span>
                    <span className="font-medium text-slate-900">{appeal.assignedInspectorName}</span>
                  </div>
                </div>

                {/* Hierarchical address */}
                <div className="pt-2 border-t border-slate-200/60 flex items-start gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">{appeal.mahalla}</span>
                    <span className="text-slate-400">, {appeal.district}, {appeal.region}</span>
                  </div>
                </div>
              </div>

              {/* Media Display Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Yuborilgan media fayl ({appeal.media.type === 'video_note' ? 'Dumaloq kruglyash' : appeal.media.type === 'voice' ? 'Ovozli xabar' : appeal.media.type}):
                </label>

                {appeal.media.type === 'video_note' && (
                  <CircularVideoPlayer
                    src={appeal.media.url || appeal.media.dataUrl}
                    duration={appeal.media.duration || 28}
                    citizenName={appeal.citizenName}
                  />
                )}

                {appeal.media.type === 'voice' && (
                  <VoiceAudioPlayer
                    src={appeal.media.url || appeal.media.dataUrl}
                    duration={appeal.media.duration || 45}
                  />
                )}

                {appeal.media.type === 'video' && (
                  <div className="bg-slate-950 rounded-xl overflow-hidden shadow-inner aspect-video flex items-center justify-center">
                    {appeal.media.url || appeal.media.dataUrl ? (
                      <video
                        src={appeal.media.url || appeal.media.dataUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-6 text-slate-400 text-xs">
                        <div className="text-2xl mb-2">🎬</div>
                        <span>Telegram video fayli</span>
                      </div>
                    )}
                  </div>
                )}

                {appeal.media.type === 'photo' && appeal.media.url && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-80">
                    <img
                      src={appeal.media.url}
                      alt="Fuqaro yuborgan rasm"
                      className="w-full h-full object-contain bg-slate-900"
                    />
                  </div>
                )}

                {appeal.textDescription && (
                  <div className="mt-3 p-3 bg-slate-100 rounded-lg text-xs text-slate-800">
                    <span className="font-semibold text-slate-500 block text-[10px] uppercase mb-1">
                      Fuqaro matni / izohi:
                    </span>
                    «{appeal.textDescription}»
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: AI Analysis & Legal Reference (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-xl p-5 border border-indigo-100/80 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>«AI Murojaat» Tahlili (Gemini)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRerunAI}
                    disabled={isRefreshingAI}
                    className="text-[11px] text-indigo-700 hover:text-indigo-900 flex items-center gap-1 font-medium transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingAI ? 'animate-spin' : ''}`} />
                    <span>Qayta tahlil</span>
                  </button>
                </div>

                {appeal.aiAnalysis ? (
                  <>
                    {/* Category & Urgency */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-indigo-950 bg-indigo-100/80 px-2 py-0.5 rounded text-[11px]">
                        {appeal.aiAnalysis.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          appeal.aiAnalysis.urgency.includes('Yuqori')
                            ? 'text-rose-800 bg-rose-100'
                            : 'text-amber-800 bg-amber-100'
                        }`}
                      >
                        {appeal.aiAnalysis.urgency}
                      </span>
                    </div>

                    {/* Audio / Video Transcription if available */}
                    {appeal.aiAnalysis.transcription && (
                      <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide mb-1">
                          <Mic className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Fuqaroning audio/video transkripsiyasi (Eshitilgan soʻzlar):</span>
                        </div>
                        <p className="text-xs text-slate-800 italic leading-relaxed">
                          «{appeal.aiAnalysis.transcription}»
                        </p>
                      </div>
                    )}

                    {/* Summary */}
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                        Muammo qisqacha mazmuni:
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed font-normal">
                        {appeal.aiAnalysis.summary}
                      </p>
                    </div>

                    {/* Applicable Law Article with Inspector Qualification Editor */}
                    <div className="p-3.5 bg-white rounded-xl border-2 border-indigo-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
                            Tegishli Oʻzbekiston qonunchiligi (Aniq MJtK / JK moddasi):
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingArticle(!isEditingArticle)}
                          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{isEditingArticle ? 'Bekor qilish' : 'Moddani tanlash / tahrirlash'}</span>
                        </button>
                      </div>

                      {!isEditingArticle ? (
                        <p className="text-xs font-bold text-slate-900 leading-snug">
                          {appeal.aiAnalysis.mjtArticle}
                        </p>
                      ) : (
                        <div className="space-y-2 pt-1">
                          <label className="block text-[11px] font-medium text-slate-500">
                            Qonunlar katalogidan tanlang yoki oʻzgartiring:
                          </label>
                          <select
                            value={currentArticle}
                            onChange={(e) => setCurrentArticle(e.target.value)}
                            className="w-full p-2 text-xs border border-indigo-200 rounded-lg bg-indigo-50/50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                          >
                            <option value="">-- Katalogdan tanlang --</option>
                            {commonArticles.map((art, idx) => (
                              <option key={idx} value={art}>
                                {art}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={currentArticle}
                            onChange={(e) => setCurrentArticle(e.target.value)}
                            placeholder="Yoki boshqa moddani yozing..."
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          />
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsEditingArticle(false)}
                              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                            >
                              Bekor qilish
                            </button>
                            <button
                              type="button"
                              disabled={isSavingArticle || !currentArticle.trim()}
                              onClick={() => handleSaveArticle(currentArticle)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>{isSavingArticle ? 'Saqlanmoqda...' : 'Moddani tasdiqlash'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Recommendation */}
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                        Inspektorga tavsiya etilgan chora-tadbir:
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {appeal.aiAnalysis.actionRecommendation}
                      </p>
                    </div>

                    {/* Pre-drafted response */}
                    {appeal.aiAnalysis.responseDraft && (
                      <div className="pt-2 border-t border-indigo-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-slate-500">
                            Taklif etilgan javob matni:
                          </span>
                          <button
                            type="button"
                            onClick={copyAIDraft}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedDraft ? 'Nusxa olindi!' : 'Javobga qoʻyish'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] italic text-slate-600 bg-white/70 p-2.5 rounded border border-slate-200">
                          «{appeal.aiAnalysis.responseDraft}»
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-slate-500 py-3 text-center">
                    Tahlil yuklanmoqda...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Previous Messages & Responses Thread */}
          <div className="border-t border-slate-200 pt-5">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-3">
              Muloqot va bildirishnomalar tarixi ({appeal.responses.length})
            </h4>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {appeal.responses.map((resp) => (
                <div
                  key={resp.id}
                  className={`p-3 rounded-xl text-xs ${
                    resp.sender === 'inspector'
                      ? 'bg-slate-900 text-white ml-8'
                      : resp.sender === 'citizen'
                      ? 'bg-slate-100 text-slate-900 mr-8'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 text-[11px] opacity-75">
                    <span className="font-semibold">
                      {resp.sender === 'inspector'
                        ? '👮‍♂️ Profilaktika inspektori'
                        : resp.sender === 'citizen'
                        ? '👤 Fuqaro'
                        : '🤖 Tizim xabari'}
                    </span>
                    <span className="font-mono">
                      {new Date(resp.timestamp).toLocaleTimeString('uz-UZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {resp.deliveredViaTelegram && ' (Telegramga yetkazildi ✅)'}
                    </span>
                  </div>
                  <p className="leading-relaxed">{resp.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Inspector Response Form */}
          <form onSubmit={handleSend} className="border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="replyInput" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-500" />
                <span>Fuqaroning Telegram botiga rasmiy javob yuborish:</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Xabar toʻgʻridan-toʻgʻri fuqaroning Telegramiga yetib boradi
              </span>
            </div>

            <textarea
              id="replyInput"
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Assalomu alaykum, murojaatingiz yuzasidan oʻrganish olib borildi..."
              className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 transition-shadow bg-slate-50 focus:bg-white"
            />

            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Javobdan soʻng holat:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as AppealStatus)}
                  className="py-1 px-2 border border-slate-200 rounded-md bg-white text-xs font-medium focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Jarayonda">Jarayonda</option>
                  <option value="Hal qilindi">Hal qilindi</option>
                  <option value="Ko'rib chiqilmoqda">Koʻrib chiqilmoqda</option>
                  <option value="Rad etildi">Rad etildi</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Yopish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !replyText.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Yuborilmoqda...' : 'Telegram orqali joʻnatish'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
