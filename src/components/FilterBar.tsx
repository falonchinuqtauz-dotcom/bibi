import React from 'react';
import { Search, RotateCcw, MapPin, Filter } from 'lucide-react';
import { Region, AppealStatus, MediaType } from '../types';
import { UZBEKISTAN_REGIONS, DISTRICTS_BY_REGION, MAHALLAS_BY_DISTRICT, DEFAULT_MAHALLAS } from '../data/regionsData';

interface FilterBarProps {
  selectedRegion: string;
  onSelectRegion: (reg: string) => void;
  selectedDistrict: string;
  onSelectDistrict: (dist: string) => void;
  selectedMahalla: string;
  onSelectMahalla: (mfy: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  selectedMediaType: string;
  onSelectMediaType: (type: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedRegion,
  onSelectRegion,
  selectedDistrict,
  onSelectDistrict,
  selectedMahalla,
  onSelectMahalla,
  selectedStatus,
  onSelectStatus,
  selectedMediaType,
  onSelectMediaType,
  searchQuery,
  onSearchChange,
  onReset,
}) => {
  // Find current region object
  const currentRegionObj = UZBEKISTAN_REGIONS.find((r) => r.name === selectedRegion);
  const districts = currentRegionObj ? DISTRICTS_BY_REGION[currentRegionObj.id] || [] : [];
  const mahallas = selectedDistrict ? MAHALLAS_BY_DISTRICT[selectedDistrict] || DEFAULT_MAHALLAS : [];

  const statuses: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'Barcha holatlar' },
    { id: 'Yangi', label: 'Yangi' },
    { id: "Ko'rib chiqilmoqda", label: "Ko'rib chiqilmoqda" },
    { id: 'Jarayonda', label: 'Jarayonda' },
    { id: 'Hal qilindi', label: 'Hal qilindi' },
  ];

  const mediaTypes: Array<{ id: string; label: string; icon?: string }> = [
    { id: 'all', label: 'Barcha formatlar' },
    { id: 'video_note', label: 'Kruglyash 📹' },
    { id: 'video', label: 'Oddiy Video 🎬' },
    { id: 'voice', label: 'Ovozli 🎙' },
    { id: 'text', label: 'Matnli 📝' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-xs space-y-4">
      {/* Search and Action Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Murojaat raqami, fuqaro F.I.Sh yoki mahalla bo'yicha qidirish..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Media Format Filter */}
          <select
            value={selectedMediaType}
            onChange={(e) => onSelectMediaType(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            {mediaTypes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Filtrlarni tozalash"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tozalash</span>
          </button>
        </div>
      </div>

      {/* Hierarchical Location Filter Row (Viloyat -> Tuman -> MFY) */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Viloyat */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-600" />
            <span>Viloyat / Shahar:</span>
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => {
              onSelectRegion(e.target.value);
              onSelectDistrict('');
              onSelectMahalla('');
            }}
            className="w-full py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">Barcha hududlar (Oʻzbekiston)</option>
            {UZBEKISTAN_REGIONS.map((reg) => (
              <option key={reg.id} value={reg.name}>
                {reg.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Tuman */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Tuman / Shahar:
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => {
              onSelectDistrict(e.target.value);
              onSelectMahalla('');
            }}
            disabled={!selectedRegion}
            className={`w-full py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 ${
              !selectedRegion ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
            }`}
          >
            <option value="">Barcha tumanlar</option>
            {districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        {/* 3. MFY */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Mahalla (MFY):
          </label>
          <select
            value={selectedMahalla}
            onChange={(e) => onSelectMahalla(e.target.value)}
            disabled={!selectedDistrict}
            className={`w-full py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 ${
              !selectedDistrict ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
            }`}
          >
            <option value="">Barcha mahallalar</option>
            {mahallas.map((mfy) => (
              <option key={mfy} value={mfy}>
                {mfy}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactive Status Segmented Controls */}
      <div className="pt-2 flex items-center gap-1 overflow-x-auto pb-1">
        <span className="text-[11px] text-slate-500 mr-2 shrink-0 flex items-center gap-1">
          <Filter className="w-3 h-3 text-slate-400" />
          <span>Holat:</span>
        </span>
        <div className="inline-flex p-1 bg-slate-100 rounded-lg">
          {statuses.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectStatus(st.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedStatus === st.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
