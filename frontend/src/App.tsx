// frontend/src/App.tsx
import { useState, useEffect } from "react";
import TopHeader from "./components/TopHeader";
import FilterBar from "./components/FilterBar";
import CivicMap from "./components/CivicMap";
import IssueDetailSidePanel from "./components/IssueDetailSidePanel";
import IssueTable from "./components/IssueTable";
import ReportModal from "./components/ReportModal";
import CitizenPortal from "./components/CitizenPortal";
import WorkerPortal from "./components/WorkerPortal";
import OfflineReportQueue from "./components/OfflineReportQueue";
import type { Issue, IssueFilters } from "./types";
import { sampleIssues } from "./data/sampleIssues";
import { fetchIssues } from "./services/api";
import { connectivity } from "./services/connectivity";
import { syncEngine } from "./services/syncEngine";
import { normalizeCategory } from "./utils/category";

const DEFAULT_FILTERS: IssueFilters = {
  search: "",
  category: "",
  status: "",
  minSeverity: 0,
};

export default function App() {
  const [issues, setIssues] = useState<Issue[]>(sampleIssues);
  const [filters, setFilters] = useState<IssueFilters>(DEFAULT_FILTERS);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(
    sampleIssues[0],
  ); // Select first issue by default like in reference
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "table">("map");
  const [portalMode, setPortalMode] = useState<"citizen" | "officer" | "worker">(
    "citizen",
  );

  const [loading, setLoading] = useState(false);
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [hasRealDbData, setHasRealDbData] = useState(false);

  // Load issues from backend
  useEffect(() => {
    let isActive = true;

    async function loadIssues() {
      setLoading(true);
      try {
        const response = await fetchIssues();
        if (!isActive) return;
        if (response.issues && response.issues.length > 0) {
          // If we have actual issues in MongoDB, map them preserving exact stored coordinates
          const dbIssues = response.issues.map((iss, idx) => ({
            ...iss,
            ticketCode:
              iss.ticketCode ||
              `DB-${3400 + idx}-${iss._id.slice(-4).toUpperCase()}`,
            // Only preserve real coordinates; do NOT fabricate random fallback positions
            coordinates:
              iss.coordinates &&
              typeof iss.coordinates.lat === "number" &&
              typeof iss.coordinates.lng === "number"
                ? iss.coordinates
                : undefined,
            isDemo: false,
          }));
          setIssues(dbIssues);
          setSelectedIssue(dbIssues[0]);
          setHasRealDbData(true);
        } else {
          setIssues(sampleIssues);
          setSelectedIssue(sampleIssues[0]);
          setHasRealDbData(false);
        }
        setBackendUp(true);
      } catch {
        if (!isActive) return;
        setBackendUp(false);
        setIssues(sampleIssues);
        setSelectedIssue(sampleIssues[0]);
        setHasRealDbData(false);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    void loadIssues();
    let skipInitialConnectivityStatus = true;
    const unsubscribe = connectivity.subscribe((isOnline) => {
      if (skipInitialConnectivityStatus) {
        skipInitialConnectivityStatus = false;
        return;
      }
      if (isOnline) void loadIssues();
    });

    // Subscribe to sync engine events at the top level so the officer dashboard
    // is updated when an offline report syncs — regardless of which portal tab
    // is currently active (OfflineReportQueue may not be mounted).
    const unsubSyncEngine = syncEngine.subscribe((event) => {
      if (event.type === "report-synced" && event.syncedIssue) {
        handleIssueCreated(event.syncedIssue);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
      unsubSyncEngine();
    };
  }, []);

  function handleIssueCreated(newIssue: Issue) {
    setIssues((prev) => {
      // Deduplicate: if the issue already exists (e.g. both App-level syncEngine
      // subscription and OfflineReportQueue.onIssueSynced fire), skip re-insert.
      if (prev.some((i) => i._id === newIssue._id)) return prev;
      return [newIssue, ...prev];
    });
    setSelectedIssue(newIssue);
    if (!newIssue.isDemo) {
      setHasRealDbData(true);
    }
  }

  function handleIssueUpdated(updated: Issue) {
    setIssues((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
    setSelectedIssue(updated);
  }

  function handleMapClick(coords?: { lat: number; lng: number }) {
    setClickedCoords(coords || null);
    setIsReportModalOpen(true);
  }

  // Filter issues according to active FilterBar
  const filteredIssues = issues.filter((issue) => {
    const q = filters.search.toLowerCase().trim();
    if (
      q &&
      !issue.title.toLowerCase().includes(q) &&
      !issue.location.toLowerCase().includes(q) &&
      !(issue.ticketCode && issue.ticketCode.toLowerCase().includes(q))
    ) {
      return false;
    }
    if (filters.category && normalizeCategory(issue.category) !== normalizeCategory(filters.category)) return false;
    if (filters.status && issue.status !== filters.status) return false;
    if (issue.severityScore < filters.minSeverity) return false;
    return true;
  });

  // Summary Metrics
  const total = issues.length;
  const inProgress = issues.filter((i) => i.status === "In Progress").length;
  const critical = issues.filter(
    (i) => i.severityScore >= 80 && i.status !== "Resolved",
  ).length;
  const resolved = issues.filter((i) => i.status === "Resolved").length;

  // If citizen portal mode is active, render CitizenPortal
  if (portalMode === "citizen") {
    return (
      <CitizenPortal
        onSwitchToDashboard={() => setPortalMode("officer")}
        onSwitchToWorker={() => setPortalMode("worker")}
        onIssueCreated={handleIssueCreated}
        existingIssues={issues}
      />
    );
  }

  // If worker portal mode is active, render WorkerPortal
  if (portalMode === "worker") {
    return (
      <WorkerPortal
        issues={issues}
        onIssueUpdated={handleIssueUpdated}
        onSwitchToDashboard={() => setPortalMode("officer")}
        onSwitchToCitizen={() => setPortalMode("citizen")}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* 1. Global Top Navigation Header matching Reference */}
      <TopHeader
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onOpenNewTicketModal={() => {
          setClickedCoords(null);
          setIsReportModalOpen(true);
        }}
        onSwitchToCitizenPortal={() => setPortalMode("citizen")}
        onSwitchToWorkerPortal={() => setPortalMode("worker")}
        onOpenQueue={() => setIsQueueModalOpen(true)}
        backendUp={backendUp}
        hasRealDbData={hasRealDbData}
        totalIssuesCount={total}
      />

      {/* 2. Interactive Filter Bar matching reference category tags */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={total}
        filteredCount={filteredIssues.length}
      />

      {/* Demo dataset alert banner when offline or backend not providing live MongoDB issues */}
      {!hasRealDbData && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <span className="font-extrabold uppercase text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded tracking-wider">
              DEMO DATASET FALLBACK
            </span>
            <span>
              The officer dashboard is displaying an interactive offline demo dataset (8 sample issues). Real submitted issues will appear automatically when connected to the backend.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-900 hidden sm:inline">
            Status: {backendUp ? 'Database Empty' : 'Backend Disconnected'}
          </span>
        </div>
      )}

      {/* 3. Main Workspace Area: Side Details Panel + Full-Screen Map / List */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Issue Details Side Panel: Visible when an issue is selected, without navigating away */}
        {selectedIssue && (
          <IssueDetailSidePanel
            issue={selectedIssue}
            onClose={() => setSelectedIssue(null)}
            onUpdate={handleIssueUpdated}
          />
        )}

        {/* Center / Right Stage: Full Screen Map or Alternate Table List */}
        <div className="flex-1 relative h-full flex flex-col overflow-hidden">
          {viewMode === "map" ? (
            <CivicMap
              issues={filteredIssues}
              selectedIssue={selectedIssue}
              onSelectIssue={(iss: Issue) => setSelectedIssue(iss)}
              onOpenReportModal={handleMapClick}
            />
          ) : (
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
              <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-800">
                    All Community Tickets ({filteredIssues.length})
                  </h2>
                  <span className="text-xs text-gray-500">
                    Click any row to inspect in details panel
                  </span>
                </div>
                <IssueTable
                  issues={filteredIssues}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onSelect={(iss) => {
                    setSelectedIssue(iss);
                    setViewMode("map");
                  }}
                  showFilters={false}
                />
              </div>
            </div>
          )}

          {/* Bottom Floating Stats Pill Widget (CivicPulse style) */}
          <div className="absolute top-3 right-3 z-10 pointer-events-none hidden sm:flex items-center gap-2">
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-200/80 shadow-md flex items-center gap-4 text-xs font-semibold text-gray-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>{inProgress} Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>{critical} Severe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>{resolved} Resolved</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Report New Issue Modal (triggerable via '+ New Ticket' button or clicking on map) */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setClickedCoords(null);
        }}
        existingIssues={issues}
        onCreated={handleIssueCreated}
        initialCoords={clickedCoords}
      />

      {/* 5. Offline Queue Modal (inspectable in Officer Command Center as well) */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto my-auto animate-fadeIn">
            <OfflineReportQueue
              onIssueSynced={handleIssueCreated}
              onClose={() => setIsQueueModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
