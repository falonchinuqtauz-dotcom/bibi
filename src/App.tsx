import React, { useState, useEffect, useMemo } from 'react';
import { Appeal, Inspector, AppealStatus, BotStatusResponse } from './types';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { FilterBar } from './components/FilterBar';
import { AppealsList } from './components/AppealsList';
import { AppealDetailModal } from './components/AppealDetailModal';
import { CitizenRecorderModal } from './components/CitizenRecorderModal';
import { InspectorsDirectory } from './components/InspectorsDirectory';
import { TelegramBotConsole } from './components/TelegramBotConsole';
import { Shield, Sparkles, Send, Bell } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'appeals' | 'inspectors' | 'citizen_portal' | 'bot_info'>('appeals');

  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    inProgress: 0,
    pending: 0,
    urgent: 0,
    inspectorsCount: 0,
  });
  const [botStatus, setBotStatus] = useState<BotStatusResponse | null>(null);

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMahalla, setSelectedMahalla] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMediaType, setSelectedMediaType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [isNewAppealModalOpen, setIsNewAppealModalOpen] = useState(false);
  const [newAppealAlert, setNewAppealAlert] = useState<string | null>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      const [appealsRes, inspectorsRes, statsRes, botRes] = await Promise.all([
        fetch('/api/appeals'),
        fetch('/api/inspectors'),
        fetch('/api/stats'),
        fetch('/api/bot/status'),
      ]);

      if (appealsRes.ok) {
        const newAppeals: Appeal[] = await appealsRes.json();
        setAppeals(newAppeals);
      }
      if (inspectorsRes.ok) {
        setInspectors(await inspectorsRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (botRes.ok) {
        setBotStatus(await botRes.json());
      }
    } catch (err) {
      console.warn('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Live polling for incoming Telegram messages every 4 seconds
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filtered appeals computation
  const filteredAppeals = useMemo(() => {
    return appeals.filter((a) => {
      // Region
      if (selectedRegion && a.region !== selectedRegion) return false;
      // District
      if (selectedDistrict && a.district !== selectedDistrict) return false;
      // Mahalla
      if (selectedMahalla && a.mahalla !== selectedMahalla) return false;
      // Status
      if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;
      // Media type
      if (selectedMediaType !== 'all' && a.media.type !== selectedMediaType) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = a.citizenName.toLowerCase().includes(q);
        const matchId = a.id.toLowerCase().includes(q);
        const matchMahalla = a.mahalla.toLowerCase().includes(q);
        const matchDistrict = a.district.toLowerCase().includes(q);
        const matchText = (a.textDescription || '').toLowerCase().includes(q);
        const matchCategory = (a.aiAnalysis?.category || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchMahalla && !matchDistrict && !matchText && !matchCategory) {
          return false;
        }
      }
      return true;
    });
  }, [appeals, selectedRegion, selectedDistrict, selectedMahalla, selectedStatus, selectedMediaType, searchQuery]);

  // Handlers
  const handleResetFilters = () => {
    setSelectedRegion('');
    setSelectedDistrict('');
    setSelectedMahalla('');
    setSelectedStatus('all');
    setSelectedMediaType('all');
    setSearchQuery('');
  };

  const handleSendResponse = async (appealId: string, message: string, newStatus?: AppealStatus) => {
    try {
      const res = await fetch(`/api/appeals/${appealId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAppeals((prev) => prev.map((a) => (a.id === appealId ? updated : a)));
        setSelectedAppeal(updated);
        fetchData();
      }
    } catch (err: any) {
      alert('Javob yuborishda xatolik: ' + err.message);
    }
  };

  const handleUpdateStatus = async (appealId: string, status: AppealStatus) => {
    try {
      const res = await fetch(`/api/appeals/${appealId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAppeals((prev) => prev.map((a) => (a.id === appealId ? updated : a)));
        if (selectedAppeal?.id === appealId) setSelectedAppeal(updated);
        fetchData();
      }
    } catch (err: any) {
      alert('Holatni oʻzgartirishda xatolik: ' + err.message);
    }
  };

  const handleRerunAI = async (appealId: string) => {
    try {
      const res = await fetch(`/api/appeals/${appealId}/ai-analyze`, {
        method: 'POST',
      });
      if (res.ok) {
        const updated = await res.json();
        setAppeals((prev) => prev.map((a) => (a.id === appealId ? updated : a)));
        if (selectedAppeal?.id === appealId) setSelectedAppeal(updated);
      }
    } catch (err: any) {
      alert('AI tahlilida xatolik: ' + err.message);
    }
  };

  const handleAddInspector = async (newInsp: Partial<Inspector>) => {
    try {
      const res = await fetch('/api/inspectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInsp),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Inspektor qoʻshishda xatolik');
      }
    } catch (err: any) {
      alert('Aloqa xatosi: ' + err.message);
    }
  };

  const handleNewAppealSuccess = (newApp: Appeal) => {
    setAppeals((prev) => [newApp, ...prev]);
    setSelectedAppeal(newApp);
    setNewAppealAlert(`Murojaat #${newApp.id} muvaffaqiyatli qabul qilindi va profilaktika inspektoriga yoʻnaltirildi!`);
    setTimeout(() => setNewAppealAlert(null), 6000);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Top Bar Contract */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewAppealModal={() => setIsNewAppealModalOpen(true)}
        botUsername={botStatus?.botInfo?.username || 'aimurojat_bot'}
      />

      {/* Real-time Notification Banner if new appeal */}
      {newAppealAlert && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2.5 text-center font-medium shadow-sm flex items-center justify-center gap-2">
          <Bell className="w-4 h-4 animate-bounce" />
          <span>{newAppealAlert}</span>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* TAB 1: Appeals Queue & Review */}
        {activeTab === 'appeals' && (
          <div>
            {/* Contextual lead-in */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Mahalla profilaktika murojaatlari
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Telegram boti va onlayn portal orqali fuqarolardan kelib tushgan kruglyash, video va ovozli arizalar jurnali
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('bot_info')}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-sky-500" />
                  <span>Bot holati: @{botStatus?.botInfo?.username || 'aimurojat_bot'}</span>
                </button>
              </div>
            </div>

            {/* Top Stats Overview */}
            <StatsCards
              total={stats.total}
              pending={stats.pending}
              inProgress={stats.inProgress}
              resolved={stats.resolved}
              urgent={stats.urgent}
              inspectorsCount={stats.inspectorsCount}
            />

            {/* Hierarchical Filter Bar */}
            <FilterBar
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={setSelectedDistrict}
              selectedMahalla={selectedMahalla}
              onSelectMahalla={setSelectedMahalla}
              selectedStatus={selectedStatus}
              onSelectStatus={setSelectedStatus}
              selectedMediaType={selectedMediaType}
              onSelectMediaType={setSelectedMediaType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onReset={handleResetFilters}
            />

            {/* List of Appeals */}
            <AppealsList
              appeals={filteredAppeals}
              onSelectAppeal={(app) => setSelectedAppeal(app)}
              selectedAppealId={selectedAppeal?.id}
            />
          </div>
        )}

        {/* TAB 2: Inspectors Directory */}
        {activeTab === 'inspectors' && (
          <div>
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Profilaktika inspektorlari (Uchastkavoylar)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Mahalla fuqarolar yigʻinlariga biriktirilgan hududiy profilaktika inspektorlari va tayanch punktlari
              </p>
            </div>

            <InspectorsDirectory
              inspectors={inspectors}
              onAddInspector={handleAddInspector}
            />
          </div>
        )}

        {/* TAB 3: Citizen Direct Web Submission & Camera */}
        {activeTab === 'citizen_portal' && (
          <div className="max-w-2xl mx-auto py-4">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                <Shield className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                «AI Murojaat» Fuqarolar portali
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Mahallangiz profilaktika inspektoriga dumaloq kruglyash video, oddiy video yoki ovozli xabar yoʻllang
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Geolokatsiyasiz aniq manzil tizimi</span>
                </div>
                <p className="leading-relaxed">
                  GPS xaritalari yoki joylashuv talab etilmaydi. Viloyat, Tuman va Mahallangizni tanlash kifoya — murojaatingiz toʻgʻridan-toʻgʻri oʻsha hududga masʼul profilaktika inspektoriga boradi.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewAppealModalOpen(true)}
                  className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <span>📹 Kruglyash video / Ariza yoʻllash</span>
                </button>
                <a
                  href={`https://t.me/${botStatus?.botInfo?.username || 'aimurojat_bot'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram botda ochish</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Telegram Bot Integration Console */}
        {activeTab === 'bot_info' && (
          <TelegramBotConsole
            botStatus={botStatus}
            onRefreshStatus={fetchData}
          />
        )}
      </main>

      {/* Modal: Detailed Appeal Inspection & Telegram Response */}
      {selectedAppeal && (
        <AppealDetailModal
          appeal={selectedAppeal}
          onClose={() => setSelectedAppeal(null)}
          onSendResponse={handleSendResponse}
          onUpdateStatus={handleUpdateStatus}
          onRerunAI={handleRerunAI}
        />
      )}

      {/* Modal: Citizen Application Wizard & Kruglyash Camera Recorder */}
      <CitizenRecorderModal
        isOpen={isNewAppealModalOpen}
        onClose={() => setIsNewAppealModalOpen(false)}
        onSubmitSuccess={handleNewAppealSuccess}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">«AI Murojaat»</span>
            <span>— Mahalla profilaktika inspektorlari bilan aloqa tizimi</span>
          </div>
          <div className="text-slate-400">
            Oʻzbekiston Respublikasi IIV jamoat xavfsizligi konsepsiyasi asosida
          </div>
        </div>
      </footer>
    </div>
  );
}
