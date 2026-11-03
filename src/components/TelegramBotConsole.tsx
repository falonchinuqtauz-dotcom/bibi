import React, { useState } from 'react';
import {
  Bot,
  Send,
  CheckCircle2,
  ExternalLink,
  Shield,
  Smartphone,
  Cpu,
  RefreshCw,
  QrCode,
  FileVideo,
  Mic,
  MessageSquare,
} from 'lucide-react';
import { BotStatusResponse } from '../types';

interface TelegramBotConsoleProps {
  botStatus: BotStatusResponse | null;
  onRefreshStatus: () => void;
}

export const TelegramBotConsole: React.FC<TelegramBotConsoleProps> = ({
  botStatus,
  onRefreshStatus,
}) => {
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('Salom! «AI Murojaat» sinov xabari.');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const username = botStatus?.botInfo?.username || 'aimurojat_bot';
  const telegramLink = `https://t.me/${username}`;
  // Generate quick QR code via public Google Chart API or SVG
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://t.me/${username}`;

  const sendTestPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testChatId) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(`https://api.telegram.org/bot9205097076:AAGQb7_0ITYa8xWqME_y4Mbi8nPME_tb0cI/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: testChatId,
          text: `🔔 <b>AI Murojaat Tizimi:</b>\n${testMessage}`,
          parse_mode: 'HTML',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult('Xabar muvaffaqiyatli yetkazildi! ✅');
      } else {
        setTestResult(`Xatolik: ${data.description || 'Yetkazib boʻlmadi'}`);
      }
    } catch (err: any) {
      setTestResult('Aloqa xatosi: ' + err.message);
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bot Identity & Status Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <Bot className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  @{username}
                </h3>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Onlayn & Faol</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Telegram Bot API orqali fuqarolardan toʻgʻridan-toʻgʻri murojaatlarni qabul qiladi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={onRefreshStatus}
              className="py-2 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Holatni tekshirish</span>
            </button>
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-4 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegramda ochish</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>

        {/* Telegram Bot Live Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block text-[11px]">Bot Tokeni:</span>
            <span className="font-mono font-medium text-slate-800">
              9205097076:AAGQ..._tb0cI
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Qayta ishlangan yangilanishlar:</span>
            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
              {botStatus?.totalUpdatesProcessed ?? 0} ta soʻrov
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Soʻnggi aloqa vaqti:</span>
            <span className="font-mono text-slate-800 tabular-nums">
              {botStatus?.lastUpdateTimestamp
                ? new Date(botStatus.lastUpdateTimestamp).toLocaleTimeString('uz-UZ')
                : 'Faol ulanish mavjud'}
            </span>
          </div>
        </div>
      </div>

      {/* TZ Step-by-Step Flow Guide */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>Texnik topshiriq (TZ) boʻyicha botning 6 bosqichli ishlash tartibi</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
              1
            </div>
            <div className="font-bold text-slate-900">Boshlash va Ism-Familiya</div>
            <p className="text-slate-500 leading-relaxed">
              Foydalanuvchi botga <code>/start</code> buyrugʻini yuboradi. Bot xush kelibsiz xabarini chiqarib, Ism va Familiyani soʻraydi.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
              2
            </div>
            <div className="font-bold text-slate-900">Viloyatni tanlash</div>
            <p className="text-slate-500 leading-relaxed">
              Oʻzbekistonning 14 ta maʼmuriy hududi (12 viloyat, Toshkent sh., Qoraqalpogʻiston) Inline tugmalar koʻrinishida taqdim etiladi.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
              3
            </div>
            <div className="font-bold text-slate-900">Tumanni tanlash</div>
            <p className="text-slate-500 leading-relaxed">
              Tanlangan viloyatga tegishli tuman va shaharlar roʻyxati inline tugmalar koʻrinishida ochiladi.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
              4
            </div>
            <div className="font-bold text-slate-900">MFYni tanlash</div>
            <p className="text-slate-500 leading-relaxed">
              Tanlangan tumandagi Mahalla Fuqarolar Yigʻinlari (MFY) roʻyxati chiqadi, shuningdek qoʻlda yozish imkoniyati beriladi.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
              5
            </div>
            <div className="font-bold text-emerald-950">Tasdiqlash & Media yuborish</div>
            <p className="text-emerald-800 leading-relaxed">
              «✅ Ma'lumotlar qabul qilindi!» xabari chiqadi. Fuqaro oʻzining <b>dumaloq videosi (kruglyash 📹)</b> yoki <b>ovozli xabarini 🎙</b> yoʻllaydi.
            </p>
          </div>

          {/* Step 6 */}
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-2">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px]">
              6
            </div>
            <div className="font-bold text-indigo-950">Masʼulga avtomatik bildirishnoma</div>
            <p className="text-indigo-800 leading-relaxed">
              Tizim Gemini AI orqali arizani tahlil qilib, tegishli hududiy profilaktika inspektoriga darhol xabar joʻnatadi.
            </p>
          </div>
        </div>
      </div>

      {/* QR Code and Direct Telegram Test */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* QR Code card */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Mobil telefon orqali kiring
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Kamerangizni QR-kodga qarating va botda kruglyash yoki ovozli murojaat yoʻllang
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 inline-block shadow-inner">
              <img
                src={qrCodeUrl}
                alt={`QR Code for @${username}`}
                className="w-40 h-40 object-contain rounded"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 w-full text-xs font-mono text-slate-600">
            t.me/{username}
          </div>
        </div>

        {/* Telegram Direct Send Ping Tester */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-500" />
            <span>Telegram Bot orqali toʻgʻridan-toʻgʻri xabar yuborishni sinash</span>
          </h4>
          <p className="text-xs text-slate-500">
            Agar oʻz Telegram hisobingizdan botga <code>/start</code> yuborgan boʻlsangiz, Telegram Chat ID raqamingizni kiritib bildirishnoma yuborishni sinab koʻrishingiz mumkin.
          </p>

          <form onSubmit={sendTestPing} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Telegram Chat ID:
              </label>
              <input
                type="text"
                required
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                placeholder="Masalan: 582194012"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Yuboriladigan xabar:
              </label>
              <textarea
                rows={2}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {testResult ? (
                <span className="text-xs font-medium text-slate-800">{testResult}</span>
              ) : (
                <span className="text-[11px] text-slate-400">Telegram Bot API bevosita bogʻlangan</span>
              )}

              <button
                type="submit"
                disabled={testSending || !testChatId}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testSending ? 'Yuborilmoqda...' : 'Sinov xabari joʻnatish'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
