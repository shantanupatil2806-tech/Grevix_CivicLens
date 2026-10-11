// frontend/src/components/IssueTable.tsx
import { Issue, IssueFilters, Category, Status } from '../types';
import { StatusBadge, CategoryBadge, SeverityBar } from './Badges';
import { MapPin, Calendar, Copy, Search } from 'lucide-react';

import { normalizeCategory } from '../utils/category';

interface Props {
  issues: Issue[];
  filters: IssueFilters;
  onFiltersChange: (f: IssueFilters) => void;
  onSelect: (issue: Issue) => void;
  showFilters?: boolean;
}

const CATEGORIES: Category[] = ['Roads', 'Garbage', 'Water', 'Electricity', 'Other'];
const STATUSES: Status[] = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];

export default function IssueTable({ issues, filters, onFiltersChange, onSelect, showFilters = true }: Props) {
  const update = (partial: Partial<IssueFilters>) => onFiltersChange({ ...filters, ...partial });

  const filtered = issues.filter((issue) => {
    const q = filters.search.toLowerCase();
    if (q && !issue.title.toLowerCase().includes(q) && !issue.location.toLowerCase().includes(q)) return false;
    if (filters.category && normalizeCategory(issue.category) !== normalizeCategory(filters.category)) return false;
    if (filters.status && issue.status !== filters.status) return false;
    if (issue.severityScore < filters.minSeverity) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Search by title or location…"
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
            />
          </div>
          <select
            className="px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-900 text-slate-200 cursor-pointer"
            value={filters.category}
            onChange={(e) => update({ category: e.target.value as Category | '' })}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-900 text-slate-200 cursor-pointer"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value as Status | '' })}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Search size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No issues match your filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900 shadow-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left">Issue</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Location</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Severity</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((issue) => (
                <tr
                  key={issue._id}
                  onClick={() => onSelect(issue)}
                  className="hover:bg-slate-800/70 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-semibold text-slate-100 line-clamp-1">{issue.title}</p>
                        {issue.isDemo && (
                          <span className="text-xs text-slate-500 italic">Demo data</span>
                        )}
                        {issue.duplicateOf && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                            <Copy size={10} /> Possible duplicate
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <CategoryBadge category={issue.category} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-slate-400">
                        <MapPin size={12} className="shrink-0 text-slate-500" />
                        <span className="line-clamp-1">{issue.location}</span>
                      </div>
                      {(!issue.coordinates || typeof issue.coordinates.lat !== 'number' || typeof issue.coordinates.lng !== 'number' || isNaN(issue.coordinates.lat) || isNaN(issue.coordinates.lng)) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/60 border border-amber-800/60 rounded px-1.5 py-0.5 w-fit">
                          ⚠️ Unmapped location
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <SeverityBar score={issue.severityScore} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={issue.status} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500 text-right">{filtered.length} issue{filtered.length !== 1 ? 's' : ''} shown</p>
    </div>
  );
}
