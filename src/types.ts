export type MediaType = 'video_note' | 'video' | 'voice' | 'audio' | 'photo' | 'text';

export type AppealStatus = 'Yangi' | "Ko'rib chiqilmoqda" | 'Jarayonda' | 'Hal qilindi' | 'Rad etildi';

export type UrgencyLevel = 'Yuqori (Shoshilinch)' | "O'rta" | 'Oddiy / Rejali';

export interface Region {
  id: string;
  name: string;
}

export interface District {
  id: string;
  regionId: string;
  name: string;
}

export interface Mahalla {
  id: string;
  districtId: string;
  regionId: string;
  name: string;
}

export interface Inspector {
  id: string;
  name: string;
  rank: string;
  phone: string;
  region: string;
  district: string;
  mahalla: string;
  officeAddress: string;
  receptionHours: string;
  telegramUsername?: string;
  telegramChatId?: number;
  photoUrl?: string;
  activeCases: number;
  resolvedCases: number;
}

export interface AppealMedia {
  type: MediaType;
  url?: string;
  fileId?: string;
  mimeType?: string;
  duration?: number;
  size?: number;
  dataUrl?: string; // base64 for direct browser recording
}

export interface AIAnalysis {
  summary: string;
  transcription?: string;
  category: string;
  urgency: UrgencyLevel;
  mjtArticle: string;
  actionRecommendation: string;
  responseDraft: string;
  sentiment: string;
  analyzedAt: string;
}

export interface AppealResponse {
  id: string;
  sender: 'inspector' | 'system' | 'citizen';
  message: string;
  timestamp: string;
  deliveredViaTelegram: boolean;
}

export interface HistoryItem {
  action: string;
  timestamp: string;
  actor: string;
}

export interface Appeal {
  id: string;
  citizenName: string;
  citizenPhone?: string;
  telegramUsername?: string;
  telegramUserId: number | string;
  region: string;
  district: string;
  mahalla: string;
  status: AppealStatus;
  media: AppealMedia;
  textDescription?: string;
  createdAt: string;
  updatedAt: string;
  assignedInspectorId?: string;
  assignedInspectorName?: string;
  inspectorPhone?: string;
  aiAnalysis?: AIAnalysis;
  inspectorNotes?: string;
  responses: AppealResponse[];
  history: HistoryItem[];
}

export interface BotState {
  chatId: number;
  step: 'awaiting_name' | 'awaiting_viloyat' | 'awaiting_tuman' | 'awaiting_mfy' | 'awaiting_custom_mfy' | 'awaiting_media' | 'awaiting_followup';
  citizenName?: string;
  region?: string;
  district?: string;
  mahalla?: string;
  lastAppealId?: string;
  lastMessageId?: number;
  updatedAt: number;
}

export interface BotStatusResponse {
  ok: boolean;
  botInfo?: {
    id: number;
    username: string;
    firstName: string;
  };
  pollingActive: boolean;
  lastUpdateTimestamp: string | null;
  totalUpdatesProcessed: number;
  connectedAdminsCount: number;
}
