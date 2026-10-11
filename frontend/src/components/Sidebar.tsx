// frontend/src/components/Sidebar.tsx
import { useState } from 'react';
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from 'lucide-react';

export type Page = 'overview' | 'all' | 'report' | 'priority' | 'resolved';

interface Props {
  current: Page;
  onChange: (page: Page) => void;
}

const navItems: { id: Page; label: string; Icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'all', label: 'All Issues', Icon: ListChecks },
  { id: 'report', label: 'Report an Issue', Icon: PlusCircle },
  { id: 'priority', label: 'Priority Issues', Icon: AlertTriangle },
  { id: 'resolved', label: 'Resolved Issues', Icon: CheckCircle2 },
];

export default function Sidebar({ current, onChange }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-navy-800 text-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      } min-h-screen shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-navy-700">
        <MapPin className="text-civic-teal shrink-0" size={22} />
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight">CivicLens</span>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              current === id
                ? 'bg-civic-blue text-white'
                : 'text-slate-300 hover:bg-navy-700 hover:text-white'
            }`}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-navy-700 text-slate-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
