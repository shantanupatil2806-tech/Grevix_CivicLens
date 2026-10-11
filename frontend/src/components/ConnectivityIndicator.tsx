// frontend/src/components/ConnectivityIndicator.tsx
import { useState, useEffect } from 'react';
import { connectivity } from '../services/connectivity';
import { syncEngine } from '../services/syncEngine';
import { getAllOfflineReports } from '../services/offlineDb';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  onOpenQueue?: () => void;
}

export default function ConnectivityIndicator({ onOpenQueue }: Props) {
  const [isOnline, setIsOnline] = useState(connectivity.isOnline());
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCounts = async () => {
    try {
      const reports = await getAllOfflineReports();
      const pending = reports.filter((r) => r.syncStatus !== 'Synced').length;
      setPendingCount(pending);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshCounts();

    const unsubConn = connectivity.subscribe((online) => {
      setIsOnline(online);
      refreshCounts();
    });

    const unsubSync = syncEngine.subscribe((event) => {
      if (event.type === 'sync-started') {
        setIsSyncing(true);
      } else if (event.type === 'sync-finished') {
        setIsSyncing(false);
        refreshCounts();
      } else {
        refreshCounts();
      }
    });

    return () => {
      unsubConn();
      unsubSync();
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onOpenQueue}
        type="button"
        title={
          isSyncing
            ? 'Syncing reports with server...'
            : isOnline
            ? 'Connected to CivicLens server'
            : 'Offline: Reports will be saved locally'
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
          isSyncing
            ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
            : !isOnline
            ? 'bg-amber-50 text-amber-800 border-amber-300'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}
      >
        {isSyncing ? (
          <>
            <RefreshCw size={12} className="animate-spin text-blue-600" />
            <span>Syncing</span>
          </>
        ) : !isOnline ? (
          <>
            <WifiOff size={12} className="text-amber-600" />
            <span>Offline</span>
          </>
        ) : (
          <>
            <Wifi size={12} className="text-emerald-600" />
            <span>Online</span>
          </>
        )}

        {pendingCount > 0 && (
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-600 text-white">
            {pendingCount}
          </span>
        )}
      </button>

      {pendingCount > 0 && isOnline && !isSyncing && (
        <button
          onClick={() => syncEngine.syncPendingReports()}
          type="button"
          className="px-2 py-1 rounded-md text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
          title="Sync pending reports now"
        >
          <RefreshCw size={11} />
          <span>Sync Now</span>
        </button>
      )}
    </div>
  );
}
