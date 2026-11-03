import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Mic,
  Video,
  Upload,
  CheckCircle2,
  AlertCircle,
  Square,
  RefreshCw,
  Send,
  MapPin,
  User,
} from 'lucide-react';
import { UZBEKISTAN_REGIONS, DISTRICTS_BY_REGION, MAHALLAS_BY_DISTRICT, DEFAULT_MAHALLAS } from '../data/regionsData';
import { Appeal } from '../types';

interface CitizenRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (newAppeal: Appeal) => void;
}

export const CitizenRecorderModal: React.FC<CitizenRecorderModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  if (!isOpen) return null;

  // Step state: 1 (Name), 2 (Region), 3 (District), 4 (MFY), 5 (Record & Submit)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form data
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('+998 ');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMahalla, setSelectedMahalla] = useState('');
  const [customMahalla, setCustomMahalla] = useState('');
  const [textDescription, setTextDescription] = useState('');

  // Media recording state
  const [mediaMode, setMediaMode] = useState<'circular_video' | 'video' | 'voice' | 'file'>('circular_video');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordedDataUrl, setRecordedDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  // Cleanup camera stream on close
  useEffect(() => {
    return () => {
      stopCamera();
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, []);

  const startCamera = async (isAudioOnly = false) => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isAudioOnly ? false : { facingMode: 'user', width: 640, height: 640 },
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (videoPreviewRef.current && !isAudioOnly) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Kamera yoki mikrofondan foydalanishga ruxsat berilmadi.');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!mediaStreamRef.current) {
      await startCamera(mediaMode === 'voice');
    }
    if (!mediaStreamRef.current) return;

    recordedChunksRef.current = [];
    const mime = mediaMode === 'voice' ? 'audio/webm' : 'video/webm';
    try {
      const recorder = new MediaRecorder(mediaStreamRef.current);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);

        // Convert to dataUrl for transmission
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedDataUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setCameraError('Yozishni boshlashda xatolik: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setRecordedBlobUrl(url);

    const reader = new FileReader();
    reader.onloadend = () => {
      setRecordedDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const resetRecording = () => {
    setRecordedBlobUrl(null);
    setRecordedDataUrl(null);
    setRecordSeconds(0);
    if (step === 5 && (mediaMode === 'circular_video' || mediaMode === 'video')) {
      startCamera(false);
    }
  };

  const handleSubmit = async () => {
    const finalMahalla = customMahalla.trim()
      ? customMahalla.includes('MFY')
        ? customMahalla
        : `${customMahalla} MFY`
      : selectedMahalla;

    if (!citizenName.trim() || !selectedRegion || !selectedDistrict || !finalMahalla) {
      alert('Iltimos, barcha maydonlarni toʻldiring');
      return;
    }

    setIsSubmitting(true);
    try {
      const mediaType =
        mediaMode === 'circular_video'
          ? 'video_note'
          : mediaMode === 'video'
          ? 'video'
          : mediaMode === 'voice'
          ? 'voice'
          : 'video_note';

      const res = await fetch('/api/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenName,
          citizenPhone: citizenPhone.trim(),
          region: selectedRegion,
          district: selectedDistrict,
          mahalla: finalMahalla,
          mediaType,
          mediaDataUrl: recordedDataUrl,
          textDescription: textDescription || "Web portal orqali yuborilgan murojaat",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        stopCamera();
        onSubmitSuccess(data);
        onClose();
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (err: any) {
      alert('Aloqa xatosi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for current districts & mahallas
  const currentRegionObj = UZBEKISTAN_REGIONS.find((r) => r.name === selectedRegion);
  const districts = currentRegionObj ? DISTRICTS_BY_REGION[currentRegionObj.id] || [] : [];
  const mahallas = selectedDistrict ? MAHALLAS_BY_DISTRICT[selectedDistrict] || DEFAULT_MAHALLAS : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Profilaktika inspektoriga ariza yoʻllash
            </h3>
            <span className="text-[11px] text-slate-500">
              {step}-bosqich / 5: {step === 1 ? 'Shaxsiy maʼlumot' : step === 2 ? 'Viloyatni tanlash' : step === 3 ? 'Tumanni tanlash' : step === 4 ? 'MFYni tanlash' : 'Video/Ovozli murojaat'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* STEP 1: Name and Phone */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/70 text-xs text-emerald-800">
                Assalomu alaykum! Profilaktika inspektori arizangizni koʻrib chiqishi va siz bilan bogʻlanishi uchun Ism va Familiyangizni kiriting.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ism va Familiyangiz: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder="Masalan: Azizbek Rahimov"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefon raqamingiz:
                </label>
                <input
                  type="text"
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(e.target.value)}
                  placeholder="+998 90 123-45-67"
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!citizenName.trim()}
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                >
                  Keyingisi: Viloyatni tanlash →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Region Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  Oʻzbekiston Respublikasi maʼmuriy hududingizni tanlang:
                </span>
                <span className="text-xs text-slate-500">{citizenName}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                {UZBEKISTAN_REGIONS.map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(reg.name);
                      setSelectedDistrict('');
                      setSelectedMahalla('');
                      setStep(3);
                    }}
                    className={`p-3 text-left rounded-xl border text-xs font-medium transition-all ${
                      selectedRegion === reg.name
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-white text-slate-800'
                    }`}
                  >
                    {reg.name}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  ← Orqaga
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: District Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  📍 {selectedRegion} — Tuman yoki shaharni tanlang:
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                {districts.map((dist) => (
                  <button
                    key={dist}
                    type="button"
                    onClick={() => {
                      setSelectedDistrict(dist);
                      setSelectedMahalla('');
                      setStep(4);
                    }}
                    className={`p-3 text-left rounded-xl border text-xs font-medium transition-all ${
                      selectedDistrict === dist
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-white text-slate-800'
                    }`}
                  >
                    {dist}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  ← Viloyatni oʻzgartirish
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: MFY Selection */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-800">
                📍 {selectedRegion}, {selectedDistrict} — Mahalla (MFY)ni tanlang:
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {mahallas.map((mfy) => (
                  <button
                    key={mfy}
                    type="button"
                    onClick={() => {
                      setSelectedMahalla(mfy);
                      setCustomMahalla('');
                      setStep(5);
                      startCamera(false);
                    }}
                    className={`p-3 text-left rounded-xl border text-xs font-medium transition-all ${
                      selectedMahalla === mfy
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-white text-slate-800'
                    }`}
                  >
                    {mfy}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Yoki mahallangiz nomini yozing:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customMahalla}
                    onChange={(e) => setCustomMahalla(e.target.value)}
                    placeholder="Masalan: Shifokorlar MFY"
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    disabled={!customMahalla.trim()}
                    onClick={() => {
                      setStep(5);
                      startCamera(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg"
                  >
                    Davom etish
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  ← Tumanni oʻzgartirish
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Confirm & Record Media (Kruglyash, Video, Voice) */}
          {step === 5 && (
            <div className="space-y-4">
              {/* Confirmed info banner (Matches TZ step 5 text) */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Maʼlumotlar qabul qilindi!</span>
                </div>
                <div>👤 <b>Ism:</b> {citizenName}</div>
                <div>
                  📍 <b>Manzil:</b> {selectedRegion}, {selectedDistrict},{' '}
                  {customMahalla || selectedMahalla}
                </div>
                <div className="text-[11px] text-emerald-700 pt-1 font-medium">
                  📹 Endi video arizangizni (kruglyash yoki oddiy video) yuborishingiz mumkin:
                </div>
              </div>

              {/* Format selection tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setMediaMode('circular_video');
                    startCamera(false);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-md transition-colors ${
                    mediaMode === 'circular_video'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📹 Kruglyash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaMode('video');
                    startCamera(false);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-md transition-colors ${
                    mediaMode === 'video'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🎬 Oddiy Video
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaMode('voice');
                    startCamera(true);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-md transition-colors ${
                    mediaMode === 'voice'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🎙 Ovozli xabar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaMode('file');
                    stopCamera();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-md transition-colors ${
                    mediaMode === 'file'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📁 Fayl yuklash
                </button>
              </div>

              {cameraError && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{cameraError} Fayl yuklash rejimidan foydalanishingiz mumkin.</span>
                </div>
              )}

              {/* Media Recording Container */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden">
                {/* Mode 1: Kruglyash Circular Video */}
                {mediaMode === 'circular_video' && (
                  <div className="flex flex-col items-center">
                    <div className="relative w-52 h-52 rounded-full overflow-hidden border-4 border-emerald-500 shadow-2xl bg-black flex items-center justify-center">
                      {recordedBlobUrl ? (
                        <video
                          src={recordedBlobUrl}
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          ref={videoPreviewRef}
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      )}

                      {isRecording && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-rose-600 rounded-full text-[11px] font-mono flex items-center gap-1 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          <span>00:{recordSeconds < 10 ? '0' : ''}{recordSeconds}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      {!recordedBlobUrl ? (
                        !isRecording ? (
                          <button
                            type="button"
                            onClick={startRecording}
                            className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Kruglyash yozishni boshlash</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                          >
                            <Square className="w-4 h-4 fill-current" />
                            <span>Yozishni toʻxtatish</span>
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={resetRecording}
                          className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Qaytadan yozish</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode 2: Standard Video */}
                {mediaMode === 'video' && (
                  <div className="w-full max-w-md flex flex-col items-center">
                    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-700 relative flex items-center justify-center">
                      {recordedBlobUrl ? (
                        <video src={recordedBlobUrl} controls className="w-full h-full object-contain" />
                      ) : (
                        <video ref={videoPreviewRef} muted playsInline className="w-full h-full object-cover" />
                      )}

                      {isRecording && (
                        <div className="absolute top-3 left-3 px-2 py-0.5 bg-rose-600 rounded text-xs font-mono">
                          REC 00:{recordSeconds < 10 ? '0' : ''}{recordSeconds}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      {!recordedBlobUrl ? (
                        !isRecording ? (
                          <button
                            type="button"
                            onClick={startRecording}
                            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2"
                          >
                            <Video className="w-4 h-4" />
                            <span>Video yozish</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-5 py-2 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center gap-2"
                          >
                            <Square className="w-4 h-4" />
                            <span>Toʻxtatish</span>
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={resetRecording}
                          className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Qayta yozish</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode 3: Voice Note */}
                {mediaMode === 'voice' && (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-emerald-500/50 flex items-center justify-center mb-3">
                      <Mic className={`w-8 h-8 ${isRecording ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`} />
                    </div>

                    <div className="text-xs text-slate-300 mb-3">
                      {isRecording ? `Ovoz yozilmoqda: 00:${recordSeconds < 10 ? '0' : ''}${recordSeconds}` : recordedBlobUrl ? 'Ovoz yozib olindi' : 'Mikrofon orqali muammoingizni gapiring'}
                    </div>

                    {recordedBlobUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <audio src={recordedBlobUrl} controls className="h-10" />
                        <button
                          type="button"
                          onClick={resetRecording}
                          className="mt-2 text-xs text-slate-400 hover:text-white"
                        >
                          Qaytadan yozish
                        </button>
                      </div>
                    ) : !isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Ovoz yozishni boshlash</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-5 py-2 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center gap-2"
                      >
                        <Square className="w-4 h-4" />
                        <span>Toʻxtatish</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Mode 4: File Upload */}
                {mediaMode === 'file' && (
                  <div className="flex flex-col items-center text-center p-4">
                    <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-6 transition-colors">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs font-medium text-slate-200">
                        Video yoki audio faylni tanlang
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        MP4, MOV, WEBM, MP3, OGG (maks. 50MB)
                      </span>
                      <input
                        type="file"
                        accept="video/*,audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {recordedBlobUrl && (
                      <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Fayl muvaffaqiyatli yuklandi</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Optional Text note */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Qoʻshimcha matnli izoh (ixtiyoriy):
                </label>
                <textarea
                  rows={2}
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="Muammo haqida qoʻshimcha tafsilotlar..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Final Submit Button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setStep(4);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  ← Mahalla tanloviga qaytish
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || isRecording}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Ariza yuborilmoqda...' : 'Profilaktika inspektoriga joʻnatish'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
