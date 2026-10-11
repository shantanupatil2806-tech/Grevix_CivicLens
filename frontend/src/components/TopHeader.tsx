import {
  MapPin,
  Plus,
  Table,
  Map as MapIcon,
  Wifi,
  WifiOff,
  User,
  Search,
  Sparkles,
  LogIn
} from 'lucide-react';
import ConnectivityIndicator from './ConnectivityIndicator';

import type { AuthUser } from '../services/api';

interface Props {
  viewMode: 'map' | 'table';
  onToggleViewMode: (mode: 'map' | 'table') => void;
  onOpenNewTicketModal?: () => void;
  onSwitchToWorkerPortal?: () => void;
  onOpenStaffLogin?: () => void;
  onOpenQueue?: () => void;
  backendUp: boolean | null;
  hasRealDbData: boolean;
  totalIssuesCount: number;
  visibleLiveIssueCount: number;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export default function TopHeader({
  viewMode,
  onToggleViewMode,
  onOpenNewTicketModal,
  onSwitchToWorkerPortal,
  onOpenStaffLogin,
  onOpenQueue,
  backendUp,
  hasRealDbData,
  totalIssuesCount,
  visibleLiveIssueCount,
  currentUser,
  onLogout
}: Props) {
  return (
    <header className="bg-slate-900/95 text-white h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between z-30 shrink-0 border-b border-slate-800 gap-4">
      {/* Brand logo matching reference (SmartRoad / CivicPulse) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white font-black shadow-md">
            <span className="text-base font-bold tracking-tighter">S</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white whitespace-nowrap">CivicLens</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 whitespace-nowrap">
                MAP AI
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Search / Status Pill & Connectivity Indicator */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <ConnectivityIndicator onOpenQueue={onOpenQueue} />

        {backendUp && hasRealDbData ? (
          <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>MongoDB Connected ({visibleLiveIssueCount} New Reports)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/60 border border-amber-500/40 px-3 py-1 rounded-full whitespace-nowrap">
            <WifiOff size={13} className="text-amber-400" />
            <span>Demo Dataset ({totalIssuesCount} Issues)</span>
          </div>
        )}
      </div>

      {/* Right Controls matching reference header */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Toggle between Map View & List View */}
        <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex items-center">
          <button
            onClick={() => onToggleViewMode('map')}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MapIcon size={14} />
            <span>Map view</span>
          </button>
          <button
            onClick={() => onToggleViewMode('table')}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Table size={14} />
            <span>List view</span>
          </button>
        </div>

        {/* User profile capsule */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-[10px]">
            {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CO'}
          </div>
          <div className="text-left">
            <p className="font-semibold text-white leading-tight whitespace-nowrap">{currentUser?.name || 'Civic Officer'}</p>
            <p className="text-[10px] text-slate-400 leading-tight whitespace-nowrap capitalize">{currentUser?.department || currentUser?.role || 'Officer'}</p>
          </div>
        </div>

        {onOpenStaffLogin && (
          <button
            onClick={onOpenStaffLogin}
            aria-label="Staff Login"
            title="Sign in with another staff account"
            className="px-2.5 sm:px-3 py-1.5 bg-blue-950/60 hover:bg-blue-900/70 text-blue-200 text-xs sm:text-sm font-semibold rounded-lg border border-blue-800/80 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <LogIn size={14} />
            <span className="hidden sm:inline">Staff Login</span>
          </button>
        )}

        {/* Logout button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="px-2.5 sm:px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs sm:text-sm font-semibold rounded-lg border border-rose-800/60 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Log out from CivicLens"
          >
            <span>Log Out</span>
          </button>
        )}

      </div>
    </header>
  );
}
