// frontend/src/components/FilterBar.tsx
import type { Category, Status, IssueFilters } from '../types';
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
    <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs z-10">
      {/* Left Pill Filter Bar matching the SmartRoad Reference Header */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto py-0.5">
        {/* All button */}
        <button
          onClick={() => update({ category: '', status: '', minSeverity: 0 })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            !filters.category && !filters.status && filters.minSeverity === 0
              ? 'bg-blue-950 text-white shadow-xs'
              : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
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
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100/90 text-gray-700 hover:bg-slate-200/80 border border-gray-200/50'
              }`}
            >
              <span>{cat}</span>
              {isActive && <X size={12} className="opacity-80 hover:opacity-100" />}
            </button>
          );
        })}

        <div className="h-5 w-[1px] bg-gray-200 mx-1 hidden sm:block" />

        {/* Status Dropdown */}
        <select
          value={filters.status}
          onChange={(e) => update({ status: e.target.value as Status | '' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all bg-white cursor-pointer ${
            filters.status
              ? 'border-blue-500 text-blue-700 bg-blue-50/50 font-bold'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              Status: {s}
            </option>
          ))}
        </select>

        {/* Severity Priority Filter */}
        <select
          value={filters.minSeverity}
          onChange={(e) => update({ minSeverity: Number(e.target.value) })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all bg-white cursor-pointer ${
            filters.minSeverity > 0
              ? 'border-red-400 text-red-700 bg-red-50/50 font-bold'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <option value={0}>Any Severity</option>
          <option value={80}>Critical Only (80+ pts)</option>
          <option value={60}>High & Critical (60+ pts)</option>
          <option value={40}>Medium & Above (40+ pts)</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => onFiltersChange({ search: '', category: '', status: '', minSeverity: 0 })}
            className="text-[11px] text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 flex items-center gap-1"
          >
            <X size={12} /> Clear Filters
          </button>
        )}
      </div>

      {/* Right side: Search Box matching reference search bar */}
      <div className="relative min-w-[220px] max-w-xs flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="Search by title, road, or area..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
        />
        {filters.search && (
          <button
            onClick={() => update({ search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
