// frontend/src/components/Badges.tsx
import { Status, Category } from '../types';

const statusColors: Record<Status, string> = {
  Reported: 'bg-gray-100 text-gray-600 border-gray-200',
  Acknowledged: 'bg-blue-100 text-blue-700 border-blue-200',
  'In Progress': 'bg-amber-100 text-amber-700 border-amber-200',
  Resolved: 'bg-green-100 text-green-700 border-green-200',
};

const categoryColors: Record<Category, string> = {
  Roads: 'bg-orange-100 text-orange-700 border-orange-200',
  Garbage: 'bg-lime-100 text-lime-700 border-lime-200',
  Water: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Electricity: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Other: 'bg-purple-100 text-purple-700 border-purple-200',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusColors[status]}`}>
      {status}
    </span>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${categoryColors[category]}`}>
      {category}
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
