import { Status, Category } from '../types';
import { normalizeCategory, CATEGORY_COLORS, CATEGORY_BADGE_CLASSES } from '../utils/category';
import {
  Car,
  Trash2,
  Droplet,
  Zap,
  HelpCircle,
} from 'lucide-react';

const statusColors: Record<Status, string> = {
  Reported: 'bg-slate-800 text-slate-300 border-slate-700',
  'Under Review': 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60',
  Accepted: 'bg-teal-950/80 text-teal-300 border-teal-700/60',
  Rejected: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
  Assigned: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
  Acknowledged: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
  'In Progress': 'bg-amber-950/80 text-amber-300 border-amber-700/60',
  'Pending Verification': 'bg-orange-950/80 text-orange-300 border-orange-700/60',
  Resolved: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
  'Awaiting Citizen Confirmation': 'bg-sky-950/90 text-sky-300 border-sky-600/70 font-semibold',
  Closed: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/70 font-semibold',
};

export function CategoryIcon({
  category,
  size = 12,
  className = '',
  color
}: {
  category?: string | null;
  size?: number;
  className?: string;
  color?: string;
}) {
  const norm = normalizeCategory(category);
  const iconColor = color || CATEGORY_COLORS[norm] || CATEGORY_COLORS.Other;

  switch (norm) {
    case 'Roads':
      return <Car size={size} color={iconColor} className={className} />;
    case 'Garbage':
      return <Trash2 size={size} color={iconColor} className={className} />;
    case 'Water':
      return <Droplet size={size} color={iconColor} className={className} />;
    case 'Electricity':
      return <Zap size={size} color={iconColor} className={className} />;
    default:
      return <HelpCircle size={size} color={iconColor} className={className} />;
  }
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusColors[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {status}
    </span>
  );
}

export function CategoryBadge({ category, showIcon = true }: { category: string; showIcon?: boolean }) {
  const norm = normalizeCategory(category);
  const colorClass = CATEGORY_BADGE_CLASSES[norm] || CATEGORY_BADGE_CLASSES.Other;
  const hexColor = CATEGORY_COLORS[norm] || CATEGORY_COLORS.Other;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${colorClass}`}>
      {showIcon && <CategoryIcon category={norm} size={11} color={hexColor} className="shrink-0" />}
      <span>{category}</span>
    </span>
  );
}

export function SeverityBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-yellow-400' : 'bg-green-500';
  const label = score >= 80 ? 'Critical' : score >= 60 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-200 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
