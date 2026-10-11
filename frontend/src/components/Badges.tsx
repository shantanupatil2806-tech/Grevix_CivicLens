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
  Reported: 'bg-gray-100 text-gray-600 border-gray-200',
  'Under Review': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Accepted: 'bg-teal-100 text-teal-700 border-teal-200',
  Rejected: 'bg-rose-100 text-rose-700 border-rose-200',
  Assigned: 'bg-purple-100 text-purple-700 border-purple-200',
  Acknowledged: 'bg-blue-100 text-blue-700 border-blue-200',
  'In Progress': 'bg-amber-100 text-amber-700 border-amber-200',
  'Pending Verification': 'bg-orange-100 text-orange-700 border-orange-200',
  Resolved: 'bg-green-100 text-green-700 border-green-200',
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
