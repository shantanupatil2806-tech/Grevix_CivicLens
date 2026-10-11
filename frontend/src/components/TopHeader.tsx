import {
  MapPin,
  Bell,
  Plus,
  Table,
  Map as MapIcon,
  Wifi,
  WifiOff,
  User,
  Search,
  Sparkles
} from 'lucide-react';
import ConnectivityIndicator from './ConnectivityIndicator';

interface Props {
  viewMode: 'map' | 'table';
  onToggleViewMode: (mode: 'map' | 'table') => void;
  onOpenNewTicketModal: () => void;
  onSwitchToCitizenPortal?: () => void;
  onOpenQueue?: () => void;
  backendUp: boolean | null;
  hasRealDbData: boolean;
  totalIssuesCount: number;
}

export default function TopHeader({
  viewMode,
  onToggleViewMode,
  onOpenNewTicketModal,
  onSwitchToCitizenPortal,
  onOpenQueue,
  backendUp,
  hasRealDbData,
  totalIssuesCount
}: Props) {
  return (
    <header className="bg-navy-900 text-white h-14 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 border-b border-navy-800">
      {/* Brand logo matching reference (SmartRoad / CivicPulse) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white font-black shadow-md">
            <span className="text-base tracking-tighter">S</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">CivicLens</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                MAP AI
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Search / Status Pill & Connectivity Indicator */}
      <div className="hidden md:flex items-center gap-3">
        <ConnectivityIndicator onOpenQueue={onOpenQueue} />

        {backendUp && hasRealDbData ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>MongoDB Connected ({totalIssuesCount} Live Tickets)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 border border-amber-500/40 px-3 py-1 rounded-full">
            <WifiOff size={12} className="text-amber-400" />
            <span>Interactive Demo Dataset ({totalIssuesCount} Issues)</span>
          </div>
        )}
      </div>

      {/* Right Controls matching reference header */}
      <div className="flex items-center gap-2.5">
        {/* Toggle between Map View & List View */}
        <div className="bg-navy-800 p-0.5 rounded-lg border border-navy-700 flex items-center">
          <button
            onClick={() => onToggleViewMode('map')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MapIcon size={13} />
            <span>Map view</span>
          </button>
          <button
            onClick={() => onToggleViewMode('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Table size={13} />
            <span>List view</span>
          </button>
        </div>

        {/* Notifications Icon */}
        <button className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition-colors relative">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User profile capsule matching reference ("John Jones") */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-navy-800 border border-navy-700 text-xs">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-[10px]">
            JJ
          </div>
          <div className="text-left">
            <p className="font-semibold text-white leading-tight">John Jones</p>
            <p className="text-[10px] text-slate-400 leading-tight">Civic Officer</p>
          </div>
        </div>

        {/* Citizen Portal Switch */}
        {onSwitchToCitizenPortal && (
          <button
            onClick={onSwitchToCitizenPortal}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Open Public Citizen Portal"
          >
            <Sparkles size={13} className="text-blue-400" />
            <span className="hidden sm:inline">Citizen Portal</span>
          </button>
        )}

        {/* New Ticket Button matching reference [+ New Ticket] */}
        <button
          onClick={onOpenNewTicketModal}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:shadow-blue-500/20"
        >
          <Plus size={15} />
          <span>+ New Ticket</span>
        </button>
      </div>
    </header>
  );
}
