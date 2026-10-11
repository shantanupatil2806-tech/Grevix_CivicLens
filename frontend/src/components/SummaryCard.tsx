// frontend/src/components/SummaryCard.tsx
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: number;
  icon: LucideIcon;
  color: 'blue' | 'amber' | 'red' | 'green';
  subtitle?: string;
}

const colorMap = {
  blue: 'bg-blue-50 border-blue-200 text-blue-600',
  amber: 'bg-amber-50 border-amber-200 text-amber-600',
  red: 'bg-red-50 border-red-200 text-red-600',
  green: 'bg-green-50 border-green-200 text-green-600',
};

const iconBg = {
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
  green: 'bg-green-100 text-green-600',
};

export default function SummaryCard({ title, value, icon: Icon, color, subtitle }: Props) {
  return (
    <div className={`rounded-xl border p-5 flex items-center gap-4 bg-white shadow-sm ${colorMap[color]}`}>
      <div className={`p-3 rounded-lg ${iconBg[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
