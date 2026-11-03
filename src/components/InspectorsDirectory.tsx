import React, { useState } from 'react';
import { Shield, Phone, MapPin, Clock, Plus, Search, CheckCircle2, UserCheck, X } from 'lucide-react';
import { Inspector } from '../types';
import { UZBEKISTAN_REGIONS, DISTRICTS_BY_REGION, MAHALLAS_BY_DISTRICT, DEFAULT_MAHALLAS } from '../data/regionsData';

interface InspectorsDirectoryProps {
  inspectors: Inspector[];
  onAddInspector: (newInsp: Partial<Inspector>) => Promise<void>;
}

export const InspectorsDirectory: React.FC<InspectorsDirectoryProps> = ({
  inspectors,
  onAddInspector,
}) => {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [rank, setRank] = useState('Katta leytenant');
  const [phone, setPhone] = useState('+998 ');
  const [region, setRegion] = useState('Toshkent shahri');
  const [district, setDistrict] = useState('Yunusobod tumani');
  const [mahalla, setMahalla] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [receptionHours, setReceptionHours] = useState('Seshanba, Payshanba 16:00 - 19:00');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const regionObj = UZBEKISTAN_REGIONS.find((r) => r.name === region) || UZBEKISTAN_REGIONS[0];
  const formDistricts = DISTRICTS_BY_REGION[regionObj.id] || [];
  const formMahallas = DISTRICTS_BY_REGION[regionObj.id]
    ? MAHALLAS_BY_DISTRICT[district] || DEFAULT_MAHALLAS
    : DEFAULT_MAHALLAS;

  const filteredInspectors = inspectors.filter((insp) => {
    const matchSearch =
      insp.name.toLowerCase().includes(search.toLowerCase()) ||
      insp.mahalla.toLowerCase().includes(search.toLowerCase()) ||
      insp.district.toLowerCase().includes(search.toLowerCase()) ||
      insp.phone.includes(search);
    const matchRegion = !selectedRegion || insp.region === selectedRegion;
    return matchSearch && matchRegion;
  });

  const handleCreateInspector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mahalla.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddInspector({
        name,
        rank,
        phone,
        region,
        district,
        mahalla: mahalla.includes('MFY') ? mahalla : `${mahalla} MFY`,
        officeAddress: officeAddress || `${district} IIO FMB tayanch punkti`,
        receptionHours,
        telegramUsername,
        telegramChatId: telegramChatId ? Number(telegramChatId) : undefined,
      });
      setIsAddModalOpen(false);
      setName('');
      setMahalla('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Inspektor F.I.Sh yoki mahalla bo'yicha qidiruv..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="">Barcha hududlar</option>
            {UZBEKISTAN_REGIONS.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi inspektor biriktirish</span>
        </button>
      </div>

      {/* Grid of Inspectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredInspectors.map((insp) => (
          <div
            key={insp.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header: Rank & Badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 uppercase">
                      {insp.rank}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                      {insp.name}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Assignment details */}
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2 mb-3 border border-slate-100">
                <div className="flex items-start gap-1.5 text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">{insp.mahalla}</span>
                    <div className="text-[11px] text-slate-500">
                      {insp.district}, {insp.region}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a href={`tel:${insp.phone}`} className="font-mono hover:text-slate-900">
                    {insp.phone}
                  </a>
                </div>

                <div className="flex items-start gap-1.5 text-slate-600 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Qabul: {insp.receptionHours}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 italic mb-2">
                🏛 {insp.officeAddress}
              </div>
            </div>

            {/* Bottom metrics */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Koʻrib chiqilmoqda:</span>
                <span className="font-semibold text-slate-900 font-mono tabular-nums">
                  {insp.activeCases} ta
                </span>
              </div>
              <div className="flex items-center gap-1 text-emerald-700 font-semibold font-mono tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{insp.resolvedCases} ta hal etilgan</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Inspector Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                Yangi mahalla profilaktika inspektorini biriktirish
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInspector} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inspektor F.I.Sh:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Sobirov Javlon Anvarovich"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harbiy / Maxsus unvoni:
                  </label>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Leytenant">Leytenant</option>
                    <option value="Katta leytenant">Katta leytenant</option>
                    <option value="Kapitan">Kapitan</option>
                    <option value="Mayor">Mayor</option>
                    <option value="Podpolkovnik">Podpolkovnik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefon raqami:
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 000-00-00"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Location selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Viloyat:
                  </label>
                  <select
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value);
                      const ro = UZBEKISTAN_REGIONS.find((r) => r.name === e.target.value);
                      if (ro && DISTRICTS_BY_REGION[ro.id]?.[0]) {
                        setDistrict(DISTRICTS_BY_REGION[ro.id][0]);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {UZBEKISTAN_REGIONS.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tuman / Shahar:
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {formDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biriktirilgan Mahalla (MFY):
                </label>
                <input
                  type="text"
                  required
                  value={mahalla}
                  onChange={(e) => setMahalla(e.target.value)}
                  placeholder="Masalan: Yangi bogʻ MFY"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profilaktika tayanch punkti manzili:
                </label>
                <input
                  type="text"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  placeholder="Yunusobod tuman 4-sonli IIB tayanch punkti"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telegram username:
                  </label>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="@inspektor_user"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telegram Chat ID:
                  </label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="Bildirishnomalar uchun"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
