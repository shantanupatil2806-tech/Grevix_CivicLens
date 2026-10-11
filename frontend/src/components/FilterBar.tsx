import type { Category, Status, IssueFilters } from '../types';
import { CategoryIcon } from './Badges';
import {
  SlidersHorizontal,
  X,
  Search,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
  MapPin
} from 'lucide-react';

interface Props {
  filters: IssueFilters;
  onFiltersChange: (filters: IssueFilters) => void;
  totalCount: number;
  filteredCount: number;
}

const CATEGORIES: Category[] = ['Roads', 'Garbage', 'Water', 'Electricity', 'Other'];
const STATUSES: Status[] = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];

export default function FilterBar({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount
}: Props) {
  const update = (partial: Partial<IssueFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  const hasActiveFilters = Boolean(
    filters.category || filters.status || filters.minSeverity > 0 || filters.search
  );

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg z-10 text-slate-200">
      {/* Left Pill Filter Bar matching the SmartRoad Reference Header */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto py-0.5">
        {/* All button */}
        <button
          onClick={() => update({ category: '', status: '', minSeverity: 0 })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            !filters.category && !filters.status && filters.minSeverity === 0
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
          }`}
        >
          All ({totalCount})
        </button>

        {/* Category Pills matching [Potholes x] in Reference */}
        {CATEGORIES.map((cat) => {
          const isActive = filters.category === cat;
          return (
            <button
              key={cat}
              onClick={() => update({ category: isActive ? '' : cat })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700/70'
              }`}
            >
              <CategoryIcon category={cat} size={12} color={isActive ? '#ffffff' : undefined} />
              <span>{cat}</span>
              {isActive && <X size={12} className="opacity-80 hover:opacity-100" />}
            </button>
          );
        })}

        <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

        {/* Status Dropdown */}
        <select
          value={filters.status}
          onChange={(e) => update({ status: e.target.value as Status | '' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all bg-slate-800 cursor-pointer ${
            filters.status
              ? 'border-blue-500 text-blue-300 bg-blue-950/60 font-bold'
              : 'border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        >
          <option value="" className="bg-slate-850 text-slate-200">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="bg-slate-850 text-slate-200">
              Status: {s}
            </option>
          ))}
        </select>

        {/* Severity Priority Filter */}
        <select
          value={filters.minSeverity}
          onChange={(e) => update({ minSeverity: Number(e.target.value) })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all bg-slate-800 cursor-pointer ${
            filters.minSeverity > 0
              ? 'border-red-500 text-red-300 bg-red-950/60 font-bold'
              : 'border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        >
          <option value={0} className="bg-slate-850 text-slate-200">Any Severity</option>
          <option value={80} className="bg-slate-850 text-slate-200">Critical Only (80+ pts)</option>
          <option value={60} className="bg-slate-850 text-slate-200">High & Critical (60+ pts)</option>
          <option value={40} className="bg-slate-850 text-slate-200">Medium & Above (40+ pts)</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => onFiltersChange({ search: '', category: '', status: '', minSeverity: 0 })}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded hover:bg-rose-950/40 border border-rose-800/40 flex items-center gap-1 transition-colors"
          >
            <X size={12} /> Clear Filters
          </button>
        )}
      </div>

      {/* Right side: Search Box matching reference search bar */}
      <div className="relative min-w-[220px] max-w-xs flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="Search by title, road, or area..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
        />
        {filters.search && (
          <button
            onClick={() => update({ search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
