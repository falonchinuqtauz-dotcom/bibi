import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  Appeal,
  Inspector,
  BotState,
  UrgencyLevel,
  AppealStatus,
  AIAnalysis,
  BotStatusResponse,
} from './src/types';
import {
  UZBEKISTAN_REGIONS,
  DISTRICTS_BY_REGION,
  MAHALLAS_BY_DISTRICT,
  DEFAULT_MAHALLAS,
  INITIAL_INSPECTORS,
  INITIAL_APPEALS,
} from './src/data/regionsData';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9205097076:AAGQb7_0ITYa8xWqME_y4Mbi8nPME_tb0cI';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Database storage file
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'murojaat_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DBData {
  inspectors: Inspector[];
  appeals: Appeal[];
  botStates: Record<string, BotState>;
  adminChatIds: number[];
  stats: {
    totalBotUpdates: number;
    lastBotUpdate: string | null;
  };
}

let db: DBData = {
  inspectors: [...INITIAL_INSPECTORS],
  appeals: [...INITIAL_APPEALS],
  botStates: {},
  adminChatIds: [],
  stats: {
    totalBotUpdates: 0,
    lastBotUpdate: null,
  },
};

// Load DB from file if exists
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.appeals && parsed.inspectors) {
        db = parsed;
        console.log(`[DB] Loaded ${db.appeals.length} appeals and ${db.inspectors.length} inspectors.`);
      }
    } else {
      saveDB();
    }
  } catch (err) {
    console.error('[DB] Error loading database:', err);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Error saving database:', err);
  }
}

loadDB();

// Setup Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper function for intelligent fallback legal analysis based on content
function determineFallbackLegalAnalysis(text: string, mediaType: string) {
  const lower = (text || '').toLowerCase();

  // 1. To'siqlar, yer egallash, noqonuniy qurilish
  if (lower.includes("to'siq") || lower.includes("panjara") || lower.includes("yer") || lower.includes("qurilish") || lower.includes("yo'lak") || lower.includes("yo'l") || lower.includes("egallash") || lower.includes("devor")) {
    return {
      category: "Jamoat foydalanishidagi yerlarni noqonuniy egallash va to'siqlar",
      mjtArticle: "MJtK 163-modda: Shaharlar va boshqa aholi punktlarida jamoat foydalanishidagi yerlarni o'zboshimchalik bilan egallash, to'siq o'rnatish",
      actionRecommendation: "Obodonlashtirish bo'limi va MFY faollari bilan birga to'siqni ko'zdan kechirish, noqonuniy o'rnatuvchiga demontaj talabnomasini taqdim etish.",
      summary: "Umumiy foydalanishdagi yo'lak yoki hududda noqonuniy to'siq/qurilma o'rnatilganligi holati.",
      urgency: "O'rta" as UrgencyLevel,
    };
  }

  // 2. Mayda bezorilik, so'kinish, haqorat, janjal
  if (lower.includes("so'kin") || lower.includes("haqorat") || lower.includes("janjal") || lower.includes("bezori") || lower.includes("mast") || lower.includes("baqir") || lower.includes("shilqim")) {
    return {
      category: "Mayda bezorilik va jamoat tartibini buzish",
      mjtArticle: "MJtK 183-modda: Mayda bezorilik (jamoat joylarida uyatli so'zlar bilan so'kinish, haqoratomuz tegajaklik qilish)",
      actionRecommendation: "Holat ishtirokchilarini profilaktika punktiga chaqirtirish, guvohlardan tushuntirish xati olish va ma'muriy bayonnoma tuzish.",
      summary: "Jamoat joyida fuqarolarga nisbatan haqoratomuz munosabat, so'kinish yoki janjal ko'tarish holati.",
      urgency: "Yuqori (Shoshilinch)" as UrgencyLevel,
    };
  }

  // 3. Jarohat yetkazish, urish, maishiy zo'ravonlik
  if (lower.includes("urish") || lower.includes("kaltak") || lower.includes("jarohat") || lower.includes("tazyiq") || lower.includes("zo'ravon") || lower.includes("do'ppos")) {
    return {
      category: "Shaxs daxlsizligiga tajovuz va maishiy zo'ravonlik",
      mjtArticle: "MJtK 52-modda: Qasddan badanga yengil shikast yetkazish / MJtK 189-modda: Tazyiq va zo'ravonlik o'tkazish",
      actionRecommendation: "Zudlik bilan jabrlanuvchi himoyasini ta'minlash, sud-tibbiy ekspertizasiga yo'llanma berish va himoya orderini rasmiylashtirish.",
      summary: "Fuqaroning sog'lig'i yoki shaxsiy daxlsizligiga yetkazilgan tajovuz va jarohat xavfi.",
      urgency: "Yuqori (Shoshilinch)" as UrgencyLevel,
    };
  }

  // 4. Chiqindi, axlat, ekologiya, daraxt
  if (lower.includes("axlat") || lower.includes("chiqindi") || lower.includes("iflos") || lower.includes("daraxt") || lower.includes("yoqish") || lower.includes("xazon")) {
    return {
      category: "Obodonlashtirish va ekologik qoidalarni buzish",
      mjtArticle: "MJtK 161-modda: Shaharlar va boshqa aholi punktlarining obodonlashtirish qoidalarini buzish / MJtK 91-modda: Chiqindilarni joylashtirish qoidalarini buzish",
      actionRecommendation: "Ekologiya va 'Toza hudud' inspeksiyasi bilan birga hududni tozalash va qoidabuzarga jarima solish chorasini ko'rish.",
      summary: "Aholi yashash hududida chiqindi to'planishi yoki noqonuniy tashlanishi holati.",
      urgency: "O'rta" as UrgencyLevel,
    };
  }

  // 5. Yo'l harakati, mashina, piyodalar yo'li, tezlik
  if (lower.includes("mashina") || lower.includes("avto") || lower.includes("yo'l harakati") || lower.includes("tezlik") || lower.includes("parkovka") || lower.includes("piyoda")) {
    return {
      category: "Yo'l harakati va transport xavfsizligi qoidalarini buzish",
      mjtArticle: "MJtK 128-modda: Haydovchilarning piyodalar yo'lkalaridan yurishi va yo'l harakati qoidalarini buzishi",
      actionRecommendation: "Yo'l harakati xavfsizligi xizmati (YHXX) bilan hamkorlikda transport vositasi egasini aniqlash va qonuniy chora ko'rish.",
      summary: "Piyodalar hududida yoki mahallada transport vositasini qoidalarga zid boshqarish yoki to'xtatish holati.",
      urgency: "O'rta" as UrgencyLevel,
    };
  }

  // 6. Firibgarlik, pul, qarz
  if (lower.includes("pul") || lower.includes("firibgar") || lower.includes("aldov") || lower.includes("qarz") || lower.includes("o'g'ri")) {
    return {
      category: "Mulkka tajovuz va firibgarlik alomatlari",
      mjtArticle: "O'zbekiston JK 168-modda: Firibgarlik / MJtK 61-modda: Mayda talon-toroj qilish",
      actionRecommendation: "Murojaat bo'yicha hujjat va dalillarni jamlab, tergovga qadar tekshiruv materiallarini rasmiylashtirish.",
      summary: "Fuqaroning moddiy manfaatlariga yoki mulkiga tajovuz qilinganligi to'g'risidagi ariza.",
      urgency: "Yuqori (Shoshilinch)" as UrgencyLevel,
    };
  }

  // 7. Shovqin (faqat tungi tinchlik buzilganda)
  if (lower.includes("shovqin") || lower.includes("musiqa") || lower.includes("tungi") || lower.includes("uxlay") || lower.includes("baqiriq")) {
    return {
      category: "Tinchlik va osoyishtalikni buzish",
      mjtArticle: "MJtK 192-modda: Maishiy shovqinga qarshi kurashish talablarini buzish",
      actionRecommendation: "Shovqin manbai bo'lgan xonadonga borib rasmiy ogohlantirish berish, takrorlanganda ma'muriy bayonnoma tuzish.",
      summary: "Tungi yoki dam olish vaqtida aholi tinchligini buzuvchi baland shovqin yoki musiqa holati.",
      urgency: "O'rta" as UrgencyLevel,
    };
  }

  // Standart umumiy holat (192 emas, balki murojaat turi bo'yicha profilaktika)
  return {
    category: "Mahalla xavfsizligi va profilaktika murojaati",
    mjtArticle: "O'zbekiston Respublikasi 'Huquqbuzarliklar profilaktikasi to'g'risida'gi Qonunining 20-moddasi / MJtK umumiy normalari",
    actionRecommendation: "Fuqaro bilan shaxsan uchrashish, murojaatda ko'rsatilgan vajlarni joyiga chiqib o'rganish.",
    summary: "Fuqaroning mahalla hududida tartib va osoyishtalikni ta'minlash yuzasidan yo'llagan murojaati.",
    urgency: "O'rta" as UrgencyLevel,
  };
}

// Helper to analyze appeal with Gemini AI (supports audio/video multimodal inspection)
async function analyzeAppealWithAI(params: {
  citizenName: string;
  region: string;
  district: string;
  mahalla: string;
  mediaType: string;
  textDescription?: string;
  mediaUrl?: string;
  mediaDataUrl?: string;
  mediaMimeType?: string;
}): Promise<AIAnalysis> {
  try {
    // 1. Prepare multimodal content parts
    const parts: any[] = [];

    // If mediaDataUrl (base64) provided from Web portal camera/recorder
    if (params.mediaDataUrl && params.mediaDataUrl.startsWith('data:')) {
      const match = params.mediaDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
        console.log(`[AI] Attached base64 inline media part (${match[1]}).`);
      }
    } else if (params.mediaUrl) {
      // If Telegram media URL provided, download and attach buffer
      try {
        const fetchRes = await fetch(params.mediaUrl, { signal: AbortSignal.timeout(12000) });
        if (fetchRes.ok) {
          const arrayBuffer = await fetchRes.arrayBuffer();
          // Keep under 15MB for inlineData limit
          if (arrayBuffer.byteLength > 0 && arrayBuffer.byteLength < 16 * 1024 * 1024) {
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            let mime = params.mediaMimeType || 'video/mp4';
            if (params.mediaType === 'voice') mime = 'audio/ogg';
            else if (params.mediaType === 'audio') mime = 'audio/mpeg';
            else if (params.mediaType === 'video_note' || params.mediaType === 'video') mime = 'video/mp4';

            parts.push({
              inlineData: {
                mimeType: mime,
                data: base64,
              },
            });
            console.log(`[AI] Attached downloaded Telegram media (${mime}, ${arrayBuffer.byteLength} bytes).`);
          }
        }
      } catch (err) {
        console.warn('[AI] Could not download media file for multimodal inspection:', err);
      }
    }

    const promptText = `
Siz O'zbekiston Respublikasi Ichki ishlar organlarining Mahalla profilaktika xizmati (Uchastkavoylar) uchun «AI Murojaat» oliy toifali huquqiy va tahliliy ekspertisiz.

MUHIM VAZIFA:
1. AGAR MEDIA (audio yoki video) BIRIKTIRILGAN BO'LSA:
   - Fuqaroning ovozini, video tasvirini va aytgan har bir so'zini diqqat bilan eshiting va ko'ring.
   - Fuqaro aynan nima degani va shikoyati nima ekanini 'transcription' maydoniga o'zbek tilida so'zma-so'z to'liq yozing!
2. HECH QANDAY CHEKLOVLARSIZ, MUAMMONING ANIQ MAZMUNIDAN KELIB CHIQIB O'ZBEKISTON QONUNCHILIGIDAGI MOS MODDANI TANLANG:
   - Hech qachon faqat 192-moddani takrorlamang!
   - Agar yer egallash, to'siq o'rnatish, yo'lni to'sib olish bo'lsa -> MJtK 163-modda yoki MJtK 200-modda.
   - Agar jamoat joyida so'kinish, haqorat, janjal, bezorilik bo'lsa -> MJtK 183-modda (Mayda bezorilik) yoki MJtK 41-modda (Haqorat qilish).
   - Agar kaltaklash, urish, jarohat yetkazish, maishiy zo'ravonlik bo'lsa -> MJtK 52-modda (Qasddan badanga yengil shikast yetkazish) yoki MJtK 189-modda (Tazyiq va zo'ravonlik o'tkazish).
   - Agar chiqindi tashlash, axlat yoqish, ifloslantirish bo'lsa -> MJtK 161-modda yoki MJtK 91-modda.
   - Agar yo'l harakati, mashina qo'yish, piyodalar yo'lkasida haydash bo'lsa -> MJtK 128-modda yoki MJtK 128-5-modda.
   - Agar firibgarlik, pul berib qaytarib ololmaslik bo'lsa -> JK 168-modda (Firibgarlik).
   - Agar voyaga yetmaganlar nazoratsizligi bo'lsa -> MJtK 47-modda.
   - Faqat tungi vaqtda (23:00 dan 06:00 gacha) baland musiqa yoki tinchlikni buzuvchi shovqin bo'lsagina -> MJtK 192-modda.
   - Boshqa qonunbuzarlik bo'lsa, O'zbekistonning tegishli qonun/kodeks moddasini to'liq ko'rsating.

Murojaatchi ma'lumotlari:
- Fuqaro: ${params.citizenName}
- Hudud: ${params.region}, ${params.district}, ${params.mahalla}
- Murojaat formati: ${params.mediaType}
- Fuqaro matnli izohi: ${params.textDescription || "Media ariza yo'llangan"}

Faqat quyidagi JSON formatida javob qaytaring:
{
  "transcription": "Fuqaroning audio yoki videosida aytgan gaplarining to'liq matni",
  "summary": "Murojaatning qisqacha aniq mazmuni (1-2 gap)",
  "category": "Muammoning aniq toifasi (Masalan: Noqonuniy to'siqlar va yer egallash, Mayda bezorilik, Yo'l harakati xavfsizligi, Obodonlashtirish, Maishiy zo'ravonlik, Firibgarlik, Tinchlikni buzish)",
  "urgency": "Yuqori (Shoshilinch) yoki O'rta yoki Oddiy / Rejali",
  "mjtArticle": "Tegishli O'zbekiston MJtK yoki JK moddasi va uning to'liq nomi (Masalan: MJtK 163-modda: Shaharlar va boshqa aholi punktlarida jamoat foydalanishidagi yerlarni o'zboshimchalik bilan egallash)",
  "actionRecommendation": "Profilaktika inspektoriga tavsiya etiladigan aniq 2-3 ta huquqiy va amaliy qadam",
  "responseDraft": "Fuqaroga profilaktika inspektori nomidan yo'llanadigan rasmiy, xushmuomala javob matni",
  "sentiment": "Xavotirli yoki Norozi yoki Talabchan yoki Iltimosnoma"
}
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    
    // Validate that mjtArticle is meaningful and not empty
    const fallback = determineFallbackLegalAnalysis(
      (parsed.transcription || '') + ' ' + (parsed.summary || '') + ' ' + (params.textDescription || ''),
      params.mediaType
    );

    return {
      summary: parsed.summary || fallback.summary,
      transcription: parsed.transcription || (params.textDescription ? `Fuqaro matni: ${params.textDescription}` : undefined),
      category: parsed.category || fallback.category,
      urgency: (parsed.urgency as UrgencyLevel) || fallback.urgency,
      mjtArticle: parsed.mjtArticle || fallback.mjtArticle,
      actionRecommendation: parsed.actionRecommendation || fallback.actionRecommendation,
      responseDraft: parsed.responseDraft || `Assalomu alaykum ${params.citizenName}. Murojaatingiz profilaktika inspektori tomonidan o'rganilmoqda va qonuniy chora ko'riladi.`,
      sentiment: parsed.sentiment || 'Talabchan',
      analyzedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[AI] Gemini analysis fallback triggered:', err);
    const fallback = determineFallbackLegalAnalysis(params.textDescription || '', params.mediaType);
    return {
      summary: params.textDescription || fallback.summary,
      transcription: params.textDescription ? `Murojaat tavsifi: ${params.textDescription}` : undefined,
      category: fallback.category,
      urgency: fallback.urgency,
      mjtArticle: fallback.mjtArticle,
      actionRecommendation: fallback.actionRecommendation,
      responseDraft: `Hurmatli ${params.citizenName}, arizangiz qabul qilindi. Mahalla profilaktika inspektori zudlik bilan o'rganib chiqadi.`,
      sentiment: 'Talabchan',
      analyzedAt: new Date().toISOString(),
    };
  }
}

// Find or assign inspector for a mahalla
function findInspectorForMahalla(region: string, district: string, mahalla: string): Inspector {
  // Try exact match
  const match = db.inspectors.find(
    (insp) =>
      insp.mahalla.toLowerCase().includes(mahalla.toLowerCase()) ||
      mahalla.toLowerCase().includes(insp.mahalla.toLowerCase())
  );
  if (match) return match;

  // Try district match
  const districtMatch = db.inspectors.find(
    (insp) => insp.district.toLowerCase() === district.toLowerCase()
  );
  if (districtMatch) return districtMatch;

  // Create or return first inspector assigned to this location
  const newInsp: Inspector = {
    id: `insp-${Date.now()}`,
    name: 'Alimov Sardor Baxtiyorovich',
    rank: 'Katta leytenant',
    phone: '+998 90 123-45-67',
    region,
    district,
    mahalla,
    officeAddress: `${district} IIO FMB tayanch punkti, ${mahalla} hududi`,
    receptionHours: 'Har kuni 16:00 - 19:00',
    activeCases: 1,
    resolvedCases: 15,
  };
  db.inspectors.push(newInsp);
  saveDB();
  return newInsp;
}

// Telegram Bot Helper Functions
async function tgCall(method: string, body: Record<string, any>) {
  try {
    const res = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`[Telegram] ${method} error:`, err);
    return { ok: false, error: String(err) };
  }
}

async function tgGetFile(fileId: string) {
  try {
    const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (data.ok && data.result.file_path) {
      return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
    }
  } catch (err) {
    console.error('[Telegram] getFile error:', err);
  }
  return undefined;
}

// Telegram Polling Engine
let isPolling = false;
let pollingOffset = 0;
let botInfo: any = null;

async function checkBotInfo() {
  try {
    const data = await (await fetch(`${TELEGRAM_API}/getMe`)).json();
    if (data.ok) {
      botInfo = data.result;
      console.log(`[Telegram] Bot active: @${botInfo.username} (${botInfo.first_name})`);
    } else {
      console.error('[Telegram] getMe failed:', data);
    }
  } catch (err) {
    console.error('[Telegram] Failed to connect to Telegram API:', err);
  }
}

async function startTelegramPolling() {
  if (isPolling) return;
  isPolling = true;
  await checkBotInfo();

  console.log('[Telegram] Polling loop started...');

  while (isPolling) {
    try {
      const res = await fetch(
        `${TELEGRAM_API}/getUpdates?offset=${pollingOffset}&timeout=20`,
        { signal: AbortSignal.timeout(25000) }
      );
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          pollingOffset = update.update_id + 1;
          db.stats.totalBotUpdates++;
          db.stats.lastBotUpdate = new Date().toISOString();
          await handleTelegramUpdate(update);
        }
      } else if (!data.ok) {
        console.warn('[Telegram] Polling returned not ok:', data);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err: any) {
      if (err.name !== 'TimeoutError' && !String(err).includes('aborted')) {
        console.error('[Telegram] Polling error:', err);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// Handle individual update
async function handleTelegramUpdate(update: any) {
  try {
    // 1. Callback query
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return;
    }

    // 2. Message
    if (update.message) {
      await handleMessage(update.message);
      return;
    }
  } catch (err) {
    console.error('[Telegram] Handler error:', err);
  }
}

// Step 1: /start and text input
async function handleMessage(msg: any) {
  const chatId = msg.chat?.id;
  if (!chatId) return;

  const text = msg.text?.trim();
  let state = db.botStates[chatId];

  // If user sends /start or /boshlash
  if (text === '/start' || text === '/boshlash' || text === '/restart') {
    db.botStates[chatId] = {
      chatId,
      step: 'awaiting_name',
      updatedAt: Date.now(),
    };
    saveDB();

    await tgCall('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `Assalomu alaykum! 👮‍♂️\n\n<b>«AI Murojaat»</b> tizimiga xush kelibsiz.\n\nUshbu bot orqali siz oʻz mahallangiz profilaktika inspektoriga (uchastkavoyga) bevosita <b>dumaloq video (kruglyash 📹)</b>, <b>oddiy video (🎬)</b> yoki <b>ovozli xabar (🎙)</b> orqali rasmiy murojaat yoʻllashingiz mumkin.\n\nIltimos, boshlash uchun <b>Ism va Familiyangizni</b> kiriting:\n<i>(Masalan: Rustam Karimov)</i>`,
    });
    return;
  }

  // /help or /yordam
  if (text === '/help' || text === '/yordam') {
    await tgCall('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `ℹ️ <b>«AI Murojaat» boti boʻyicha qoʻllanma:</b>\n\n1. /start - Botni qayta ishga tushirish\n2. Ism-familiyangiz va mahallangizni tanlang\n3. Muammo aks etgan dumaloq video (kruglyash), oddiy video yoki ovozli xabar yoʻllang\n4. Murojaatingiz darhol mahalla profilaktika inspektoriga yetkaziladi va sizga uning aloqa ma'lumotlari beriladi.`,
    });
    return;
  }

  // If no state yet, prompt /start
  if (!state) {
    db.botStates[chatId] = {
      chatId,
      step: 'awaiting_name',
      updatedAt: Date.now(),
    };
    saveDB();

    await tgCall('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `Xush kelibsiz! Iltimos, <b>Ism va Familiyangizni</b> kiriting:`,
    });
    return;
  }

  // Step 1: User enters Name
  if (state.step === 'awaiting_name') {
    state.citizenName = text || 'Fuqaro';
    state.step = 'awaiting_viloyat';
    state.updatedAt = Date.now();
    saveDB();

    // Generate 14 region inline buttons
    const keyboard = [];
    for (let i = 0; i < UZBEKISTAN_REGIONS.length; i += 2) {
      const row = [];
      row.push({
        text: UZBEKISTAN_REGIONS[i].name,
        callback_data: `vil:${UZBEKISTAN_REGIONS[i].id}`,
      });
      if (i + 1 < UZBEKISTAN_REGIONS.length) {
        row.push({
          text: UZBEKISTAN_REGIONS[i + 1].name,
          callback_data: `vil:${UZBEKISTAN_REGIONS[i + 1].id}`,
        });
      }
      keyboard.push(row);
    }

    await tgCall('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `Rahmat, <b>${state.citizenName}</b>!\n\n2-bosqich: Oʻzingiz yashayotgan <b>viloyat yoki shaharni</b> tanlang:`,
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
    return;
  }

  // If awaiting custom MFY input
  if (state.step === 'awaiting_custom_mfy') {
    state.mahalla = (text || 'Markaziy').includes('MFY') ? text : `${text} MFY`;
    state.step = 'awaiting_media';
    state.updatedAt = Date.now();
    saveDB();

    await tgCall('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `✅ <b>Ma'lumotlar qabul qilindi!</b>\n\n👤 <b>Ism:</b> ${state.citizenName}\n📍 <b>Manzil:</b> ${state.region}, ${state.district}, ${state.mahalla}\n\n📹 <b>Endi video arizangizni (dumaloq kruglyash yoki oddiy video) yoki ovozli xabaringizni yuborishingiz mumkin:</b>\n\n<i>(Kruglyash yuborish uchun Telegram pastki oʻng burchagidagi mikrofon belgisini bosing, u kameraga aylanadi, soʻng ushlab turib gapiring)</i>`,
    });
    return;
  }

  // Handle follow-up text description sent after media
  if (state?.lastAppealId && text && !text.startsWith('/') && !msg.video && !msg.video_note && !msg.voice && !msg.audio && !msg.photo) {
    const appeal = db.appeals.find((a) => a.id === state.lastAppealId);
    if (appeal) {
      appeal.textDescription = (appeal.textDescription ? appeal.textDescription + ' ' : '') + text;
      // Re-run AI analysis with the new text clarification
      const updatedAnalysis = await analyzeAppealWithAI({
        citizenName: appeal.citizenName,
        region: appeal.region,
        district: appeal.district,
        mahalla: appeal.mahalla,
        mediaType: appeal.media.type,
        textDescription: appeal.textDescription,
        mediaUrl: appeal.media.url,
        mediaDataUrl: appeal.media.dataUrl,
        mediaMimeType: appeal.media.mimeType,
      });

      appeal.aiAnalysis = updatedAnalysis;
      appeal.updatedAt = new Date().toISOString();
      appeal.history.push({
        action: `Fuqaro qoʻshimcha tafsilot yoʻlladi, AI moddani aniqlashtirdi: ${updatedAnalysis.mjtArticle}`,
        timestamp: new Date().toISOString(),
        actor: 'Fuqaro (Telegram)',
      });
      saveDB();

      await tgCall('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: `📝 <b>Qoʻshimcha maʼlumotingiz arizangizga qoʻshildi!</b>\n\n🤖 <b>AI Huquqiy Tahlil:</b>\n• <b>Toifa:</b> ${updatedAnalysis.category}\n• <b>Tegishli qonun moddasi:</b> <b>${updatedAnalysis.mjtArticle}</b>\n• <b>Tezkorlik:</b> ${updatedAnalysis.urgency}\n\n<i>Murojaatingiz profilaktika inspektoriga toʻliq yetkazildi.</i>`,
      });
      return;
    }
  }

  // Step 5: Handling Media Message (Video note, Video, Voice, Audio, Photo, Text)
  const isVideoNote = !!msg.video_note;
  const isVideo = !!msg.video;
  const isVoice = !!msg.voice;
  const isPhoto = !!msg.photo;
  const isAudio = !!msg.audio;

  if (isVideoNote || isVideo || isVoice || isPhoto || isAudio || (text && state.step === 'awaiting_media')) {
    let mediaType: any = 'text';
    let fileId: string | undefined = undefined;
    let duration: number | undefined = undefined;
    let mimeType: string | undefined = undefined;

    if (isVideoNote) {
      mediaType = 'video_note';
      fileId = msg.video_note.file_id;
      duration = msg.video_note.duration;
      mimeType = 'video/mp4';
    } else if (isVideo) {
      mediaType = 'video';
      fileId = msg.video.file_id;
      duration = msg.video.duration;
      mimeType = msg.video.mime_type || 'video/mp4';
    } else if (isVoice) {
      mediaType = 'voice';
      fileId = msg.voice.file_id;
      duration = msg.voice.duration;
      mimeType = msg.voice.mime_type || 'audio/ogg';
    } else if (isPhoto) {
      mediaType = 'photo';
      fileId = msg.photo[msg.photo.length - 1].file_id;
      mimeType = 'image/jpeg';
    } else if (isAudio) {
      mediaType = 'audio';
      fileId = msg.audio.file_id;
      duration = msg.audio.duration;
      mimeType = msg.audio.mime_type;
    }

    // Resolve URL from fileId if present
    let mediaUrl: string | undefined = undefined;
    if (fileId) {
      mediaUrl = await tgGetFile(fileId);
    }

    const citizenName = state?.citizenName || `${msg.from?.first_name || 'Fuqaro'} ${msg.from?.last_name || ''}`.trim();
    const region = state?.region || 'Toshkent shahri';
    const district = state?.district || 'Yunusobod tumani';
    const mahalla = state?.mahalla || 'Bogʻishamol MFY';

    const appealId = `MUR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const inspector = findInspectorForMahalla(region, district, mahalla);

    // AI Analysis with video/audio multimodal inspection
    const textCaption = msg.caption || text || (isVideoNote ? 'Dumaloq kruglyash video murojaat' : isVoice ? 'Ovozli murojaat' : 'Video murojaat');
    const aiAnalysis = await analyzeAppealWithAI({
      citizenName,
      region,
      district,
      mahalla,
      mediaType,
      textDescription: textCaption,
      mediaUrl,
      mediaMimeType: mimeType,
    });

    const newAppeal: Appeal = {
      id: appealId,
      citizenName,
      telegramUsername: msg.from?.username ? `@${msg.from.username}` : undefined,
      telegramUserId: chatId,
      region,
      district,
      mahalla,
      status: 'Yangi',
      media: {
        type: mediaType,
        fileId,
        url: mediaUrl,
        duration,
        mimeType,
      },
      textDescription: textCaption,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedInspectorId: inspector.id,
      assignedInspectorName: `${inspector.name} (${inspector.rank})`,
      inspectorPhone: inspector.phone,
      aiAnalysis,
      responses: [
        {
          id: `resp-${Date.now()}`,
          sender: 'system',
          message: `Murojaat qabul qilindi va ${mahalla} profilaktika inspektori ${inspector.name}ga yo'naltirildi.`,
          timestamp: new Date().toISOString(),
          deliveredViaTelegram: true,
        },
      ],
      history: [
        {
          action: `Murojaat Telegram boti orqali qabul qilindi (${mediaType === 'video_note' ? 'Kruglyash 📹' : mediaType === 'voice' ? 'Ovozli 🎙' : 'Video 🎬'})`,
          timestamp: new Date().toISOString(),
          actor: 'Telegram Bot',
        },
        {
          action: `AI Tahlil: ${aiAnalysis.category} (${aiAnalysis.urgency})`,
          timestamp: new Date().toISOString(),
          actor: 'Gemini AI',
        },
      ],
    };

    db.appeals.unshift(newAppeal);
    state.lastAppealId = appealId;
    state.step = 'awaiting_followup';
    state.updatedAt = Date.now();
    saveDB();

    // Send confirmation to citizen
    const confirmationText = `✅ <b>Murojaatingiz muvaffaqiyatli qabul qilindi!</b>

🆔 <b>Murojaat raqami:</b> #<code>${appealId}</code>
📍 <b>Manzil:</b> ${region}, ${district}, ${mahalla}
📁 <b>Murojaat turi:</b> ${mediaType === 'video_note' ? 'Dumaloq video (Kruglyash 📹)' : mediaType === 'voice' ? 'Ovozli xabar 🎙' : mediaType === 'video' ? 'Video murojaat 🎬' : 'Matnli ariza 📝'}

👮‍♂️ <b>Biriktirilgan profilaktika inspektori:</b>
• <b>Unvoni:</b> ${inspector.rank}
• <b>F.I.Sh:</b> ${inspector.name}
• <b>Telefon:</b> ${inspector.phone}
• <b>Tayanch punkti:</b> ${inspector.officeAddress}
• <b>Qabul kunlari:</b> ${inspector.receptionHours}

🤖 <b>AI Tizim tahlili:</b>
• <b>Toifa:</b> ${aiAnalysis.category}
• <b>Tezkorlik:</b> ${aiAnalysis.urgency}
• <b>Modda:</b> ${aiAnalysis.mjtArticle}

<i>Profilaktika inspektori murojaatingizni koʻrib chiqqach, ushbu bot orqali sizga rasmiy javob yuboradi.</i>`;

    await tgCall('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: confirmationText,
    });

    // Notify inspector or admin if registered
    if (inspector.telegramChatId && inspector.telegramChatId !== chatId) {
      await tgCall('sendMessage', {
        chat_id: inspector.telegramChatId,
        parse_mode: 'HTML',
        text: `🚨 <b>YANGI MUROJAAT KELIB TUSHDI!</b>\n\n🆔 #<code>${appealId}</code>\n👤 <b>Fuqaro:</b> ${citizenName} (${msg.from?.username ? '@' + msg.from.username : 'Username yoʻq'})\n📍 <b>MFY:</b> ${mahalla}\n⚡ <b>Toifa:</b> ${aiAnalysis.category}\n\nIltimos, zudlik bilan profilaktika portalida koʻrib chiqing!`,
      });
    }

    return;
  }

  // Generic reply if user is confused
  await tgCall('sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text: `Murojaatingizni dumaloq video (kruglyash 📹), oddiy video yoki ovozli xabar shaklida yuborishingiz mumkin. Qaytadan boshlash uchun /start bosing.`,
  });
}

// Callback queries for inline keyboard flow
async function handleCallbackQuery(cb: any) {
  const chatId = cb.message?.chat?.id;
  const data = cb.data;
  if (!chatId || !data) return;

  let state = db.botStates[chatId];
  if (!state) {
    state = {
      chatId,
      step: 'awaiting_viloyat',
      updatedAt: Date.now(),
    };
    db.botStates[chatId] = state;
  }

  await tgCall('answerCallbackQuery', { callback_query_id: cb.id });

  // 1. Region selection
  if (data.startsWith('vil:')) {
    const regionId = data.replace('vil:', '');
    const regObj = UZBEKISTAN_REGIONS.find((r) => r.id === regionId);
    const regionName = regObj ? regObj.name : 'Toshkent shahri';

    state.region = regionName;
    state.step = 'awaiting_tuman';
    state.updatedAt = Date.now();
    saveDB();

    const districts = DISTRICTS_BY_REGION[regionId] || DISTRICTS_BY_REGION['toshkent_sh'];
    const keyboard = [];
    for (let i = 0; i < districts.length; i += 2) {
      const row = [];
      row.push({
        text: districts[i],
        callback_data: `tum:${i}`,
      });
      if (i + 1 < districts.length) {
        row.push({
          text: districts[i + 1],
          callback_data: `tum:${i + 1}`,
        });
      }
      keyboard.push(row);
    }

    await tgCall('editMessageText', {
      chat_id: chatId,
      message_id: cb.message.message_id,
      parse_mode: 'HTML',
      text: `📍 Tanlangan hudud: <b>${regionName}</b>\n\n3-bosqich: Oʻz <b>tuman yoki shahringizni</b> tanlang:`,
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
    return;
  }

  // 2. District selection
  if (data.startsWith('tum:')) {
    const districtIndex = parseInt(data.replace('tum:', ''), 10);
    const regionObj = UZBEKISTAN_REGIONS.find((r) => r.name === state.region) || UZBEKISTAN_REGIONS[0];
    const districts = DISTRICTS_BY_REGION[regionObj.id] || DISTRICTS_BY_REGION['toshkent_sh'];
    const districtName = districts[districtIndex] || districts[0];

    state.district = districtName;
    state.step = 'awaiting_mfy';
    state.updatedAt = Date.now();
    saveDB();

    const mahallas = MAHALLAS_BY_DISTRICT[districtName] || DEFAULT_MAHALLAS;
    const keyboard = [];
    for (let i = 0; i < mahallas.length; i += 2) {
      const row = [];
      row.push({
        text: mahallas[i],
        callback_data: `mfy:${i}`,
      });
      if (i + 1 < mahallas.length) {
        row.push({
          text: mahallas[i + 1],
          callback_data: `mfy:${i + 1}`,
        });
      }
      keyboard.push(row);
    }

    // Add option to type custom mahalla
    keyboard.push([
      {
        text: '✍️ Boshqa mahallani qoʻlda yozish',
        callback_data: 'custom_mfy',
      },
    ]);

    await tgCall('editMessageText', {
      chat_id: chatId,
      message_id: cb.message.message_id,
      parse_mode: 'HTML',
      text: `📍 <b>${state.region}</b>, <b>${districtName}</b>\n\n4-bosqich: Oʻz <b>Mahalla Fuqarolar Yigʻinini (MFY)</b> tanlang:`,
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
    return;
  }

  // 3. Custom MFY trigger
  if (data === 'custom_mfy') {
    state.step = 'awaiting_custom_mfy';
    state.updatedAt = Date.now();
    saveDB();

    await tgCall('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `✍️ Iltimos, oʻz mahallangiz (MFY) nomini matn koʻrinishida yozib yuboring:`,
    });
    return;
  }

  // 4. MFY selection
  if (data.startsWith('mfy:')) {
    const mfyIndex = parseInt(data.replace('mfy:', ''), 10);
    const mahallas = MAHALLAS_BY_DISTRICT[state.district || ''] || DEFAULT_MAHALLAS;
    const mahallaName = mahallas[mfyIndex] || mahallas[0];

    state.mahalla = mahallaName;
    state.step = 'awaiting_media';
    state.updatedAt = Date.now();
    saveDB();

    await tgCall('editMessageText', {
      chat_id: chatId,
      message_id: cb.message.message_id,
      parse_mode: 'HTML',
      text: `✅ <b>Ma'lumotlar qabul qilindi!</b>\n\n👤 <b>Ism:</b> ${state.citizenName}\n📍 <b>Manzil:</b> ${state.region}, ${state.district}, ${state.mahalla}\n\n📹 <b>Endi video arizangizni (dumaloq kruglyash yoki oddiy video) yoki ovozli xabaringizni yuborishingiz mumkin:</b>\n\n<i>(Telegramda kruglyash yuborish uchun mikrofon belgisiga bir marta bosing va kamera paydo boʻlgach ushlab turib gapiring)</i>`,
    });
    return;
  }
}

// Start express server
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // REST API Routes
  app.get('/api/bot/status', (req: Request, res: Response) => {
    const response: BotStatusResponse = {
      ok: true,
      botInfo: botInfo
        ? {
            id: botInfo.id,
            username: botInfo.username,
            firstName: botInfo.first_name,
          }
        : undefined,
      pollingActive: isPolling,
      lastUpdateTimestamp: db.stats.lastBotUpdate,
      totalUpdatesProcessed: db.stats.totalBotUpdates,
      connectedAdminsCount: db.adminChatIds.length,
    };
    res.json(response);
  });

  app.get('/api/regions', (req: Request, res: Response) => {
    res.json({
      regions: UZBEKISTAN_REGIONS,
      districtsByRegion: DISTRICTS_BY_REGION,
      mahallasByDistrict: MAHALLAS_BY_DISTRICT,
    });
  });

  app.get('/api/inspectors', (req: Request, res: Response) => {
    res.json(db.inspectors);
  });

  app.post('/api/inspectors', (req: Request, res: Response) => {
    const { name, rank, phone, region, district, mahalla, officeAddress, receptionHours, telegramUsername, telegramChatId } = req.body;
    if (!name || !phone || !region || !district || !mahalla) {
      return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmadi" });
    }

    const newInsp: Inspector = {
      id: `insp-${Date.now()}`,
      name,
      rank: rank || 'Katta leytenant',
      phone,
      region,
      district,
      mahalla,
      officeAddress: officeAddress || `${district} IIO FMB tayanch punkti`,
      receptionHours: receptionHours || 'Seshanba, Payshanba 16:00 - 19:00',
      telegramUsername: telegramUsername?.replace('@', ''),
      telegramChatId: telegramChatId ? Number(telegramChatId) : undefined,
      activeCases: 0,
      resolvedCases: 0,
    };

    db.inspectors.unshift(newInsp);
    saveDB();
    res.json(newInsp);
  });

  app.get('/api/appeals', (req: Request, res: Response) => {
    res.json(db.appeals);
  });

  app.get('/api/appeals/:id', (req: Request, res: Response) => {
    const appeal = db.appeals.find((a) => a.id === req.params.id);
    if (!appeal) return res.status(404).json({ error: 'Murojaat topilmadi' });
    res.json(appeal);
  });

  // Citizen direct submission from web portal
  app.post('/api/appeals', async (req: Request, res: Response) => {
    try {
      const { citizenName, citizenPhone, region, district, mahalla, mediaType, mediaDataUrl, textDescription } = req.body;
      if (!citizenName || !region || !district || !mahalla) {
        return res.status(400).json({ error: "Ism va manzil kiritilishi shart" });
      }

      const appealId = `MUR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const inspector = findInspectorForMahalla(region, district, mahalla);

      const aiAnalysis = await analyzeAppealWithAI({
        citizenName,
        region,
        district,
        mahalla,
        mediaType: mediaType || 'video_note',
        textDescription,
        mediaDataUrl,
        mediaMimeType: mediaType === 'voice' ? 'audio/webm' : 'video/webm',
      });

      const newAppeal: Appeal = {
        id: appealId,
        citizenName,
        citizenPhone,
        telegramUserId: 'web_portal',
        region,
        district,
        mahalla,
        status: 'Yangi',
        media: {
          type: mediaType || 'video_note',
          dataUrl: mediaDataUrl,
          duration: 30,
        },
        textDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedInspectorId: inspector.id,
        assignedInspectorName: `${inspector.name} (${inspector.rank})`,
        inspectorPhone: inspector.phone,
        aiAnalysis,
        responses: [
          {
            id: `resp-${Date.now()}`,
            sender: 'system',
            message: `Murojaat web portal orqali qabul qilindi va ${mahalla} profilaktika inspektori ${inspector.name}ga yo'naltirildi.`,
            timestamp: new Date().toISOString(),
            deliveredViaTelegram: false,
          },
        ],
        history: [
          {
            action: `Murojaat Web Portal orqali yo'llandi`,
            timestamp: new Date().toISOString(),
            actor: 'Fuqaro (Web)',
          },
          {
            action: `AI Tahlil: ${aiAnalysis.category}`,
            timestamp: new Date().toISOString(),
            actor: 'Gemini AI',
          },
        ],
      };

      db.appeals.unshift(newAppeal);
      saveDB();

      // If inspector has telegram chat id, notify them
      if (inspector.telegramChatId) {
        await tgCall('sendMessage', {
          chat_id: inspector.telegramChatId,
          parse_mode: 'HTML',
          text: `🚨 <b>YANGI MUROJAAT (Web Portal)!</b>\n\n🆔 #<code>${appealId}</code>\n👤 <b>Fuqaro:</b> ${citizenName} (${citizenPhone || 'Tel yoʻq'})\n📍 <b>Manzil:</b> ${region}, ${district}, ${mahalla}\n⚡ <b>Toifa:</b> ${aiAnalysis.category}`,
        });
      }

      res.json(newAppeal);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Inspector sends response to citizen
  app.post('/api/appeals/:id/respond', async (req: Request, res: Response) => {
    const appeal = db.appeals.find((a) => a.id === req.params.id);
    if (!appeal) return res.status(404).json({ error: 'Murojaat topilmadi' });

    const { message, newStatus, inspectorName } = req.body;
    if (!message) return res.status(400).json({ error: 'Xabar matni kiritilmagan' });

    let deliveredViaTelegram = false;

    // Send to citizen Telegram if telegramUserId is numeric
    if (typeof appeal.telegramUserId === 'number' || !isNaN(Number(appeal.telegramUserId))) {
      const tgRes = await tgCall('sendMessage', {
        chat_id: Number(appeal.telegramUserId),
        parse_mode: 'HTML',
        text: `👮‍♂️ <b>Mahalla profilaktika inspektori javobi:</b>\n\n${message}\n\n<i>Murojaat raqami: #${appeal.id}\nMas'ul inspektor: ${inspectorName || appeal.assignedInspectorName}</i>`,
      });
      deliveredViaTelegram = tgRes.ok === true;
    }

    const responseItem = {
      id: `resp-${Date.now()}`,
      sender: 'inspector' as const,
      message,
      timestamp: new Date().toISOString(),
      deliveredViaTelegram,
    };

    appeal.responses.push(responseItem);
    if (newStatus) {
      appeal.status = newStatus;
    }
    appeal.updatedAt = new Date().toISOString();
    appeal.history.push({
      action: `Inspektor javob yo'lladi (${deliveredViaTelegram ? "Telegram orqali yetkazildi" : "Tizimda saqlandi"})`,
      timestamp: new Date().toISOString(),
      actor: inspectorName || 'Profilaktika inspektori',
    });

    saveDB();
    res.json(appeal);
  });

  // Update status
  app.post('/api/appeals/:id/status', (req: Request, res: Response) => {
    const appeal = db.appeals.find((a) => a.id === req.params.id);
    if (!appeal) return res.status(404).json({ error: 'Murojaat topilmadi' });

    const { status, actor } = req.body;
    appeal.status = status as AppealStatus;
    appeal.updatedAt = new Date().toISOString();
    appeal.history.push({
      action: `Holat '${status}' ga o'zgartirildi`,
      timestamp: new Date().toISOString(),
      actor: actor || 'Inspektor',
    });

    saveDB();
    res.json(appeal);
  });

  // Re-run AI Analysis
  app.post('/api/appeals/:id/ai-analyze', async (req: Request, res: Response) => {
    const appeal = db.appeals.find((a) => a.id === req.params.id);
    if (!appeal) return res.status(404).json({ error: 'Murojaat topilmadi' });

    const newAnalysis = await analyzeAppealWithAI({
      citizenName: appeal.citizenName,
      region: appeal.region,
      district: appeal.district,
      mahalla: appeal.mahalla,
      mediaType: appeal.media.type,
      textDescription: appeal.textDescription,
      mediaUrl: appeal.media.url,
      mediaDataUrl: appeal.media.dataUrl,
      mediaMimeType: appeal.media.mimeType,
    });

    appeal.aiAnalysis = newAnalysis;
    appeal.updatedAt = new Date().toISOString();
    saveDB();
    res.json(appeal);
  });

  // Manual legal article update by inspector
  app.post('/api/appeals/:id/article', (req: Request, res: Response) => {
    const appeal = db.appeals.find((a) => a.id === req.params.id);
    if (!appeal) return res.status(404).json({ error: 'Murojaat topilmadi' });

    const { mjtArticle, category, actionRecommendation } = req.body;
    if (appeal.aiAnalysis) {
      if (mjtArticle) appeal.aiAnalysis.mjtArticle = mjtArticle;
      if (category) appeal.aiAnalysis.category = category;
      if (actionRecommendation) appeal.aiAnalysis.actionRecommendation = actionRecommendation;
    }
    appeal.updatedAt = new Date().toISOString();
    appeal.history.push({
      action: `Inspektor huquqiy moddani belgiladi: ${mjtArticle}`,
      timestamp: new Date().toISOString(),
      actor: 'Profilaktika inspektori',
    });

    saveDB();
    res.json(appeal);
  });

  // Stats
  app.get('/api/stats', (req: Request, res: Response) => {
    const total = db.appeals.length;
    const resolved = db.appeals.filter((a) => a.status === 'Hal qilindi').length;
    const inProgress = db.appeals.filter((a) => a.status === 'Jarayonda' || a.status === "Ko'rib chiqilmoqda").length;
    const pending = db.appeals.filter((a) => a.status === 'Yangi').length;
    const urgent = db.appeals.filter((a) => a.aiAnalysis?.urgency.includes('Yuqori')).length;

    res.json({
      total,
      resolved,
      inProgress,
      pending,
      urgent,
      inspectorsCount: db.inspectors.length,
    });
  });

  // Vite development middleware
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Murojaat Server] Running on http://localhost:${PORT}`);
    // Start bot polling loop
    startTelegramPolling();
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
});
