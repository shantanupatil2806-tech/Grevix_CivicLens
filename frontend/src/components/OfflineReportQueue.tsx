// frontend/src/components/OfflineReportQueue.tsx
import { useState, useEffect } from 'react';
import { OfflineReport, Issue } from '../types';
import {
  getAllOfflineReports,
  deleteOfflineReport,
  updateOfflineReportStatus,
  subscribeOfflineDb
} from '../services/offlineDb';
import { syncEngine } from '../services/syncEngine';
import { connectivity } from '../services/connectivity';
import { CategoryBadge } from './Badges';
import {
  RefreshCw,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  CloudUpload,
  Eye,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

interface Props {
  onIssueSynced?: (issue: Issue) => void;
  onClose?: () => void;
}

export default function OfflineReportQueue({ onIssueSynced, onClose }: Props) {
  const [reports, setReports] = useState<OfflineReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingReportId, setSyncingReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<OfflineReport | null>(null);
  const [editingReport, setEditingReport] = useState<OfflineReport | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reviewConfirmReport, setReviewConfirmReport] = useState<OfflineReport | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Queue View Tab Filter: default to 'all' so users see all locally buffered reports immediately
  const [viewFilter, setViewFilter] = useState<'pending' | 'synced' | 'all'>('all');

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await getAllOfflineReports();
      setReports(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();

    const unsubDb = subscribeOfflineDb(() => {
      loadReports();
    });

    const unsubSync = syncEngine.subscribe((event) => {
      loadReports();
      if (event.type === 'report-synced' && event.syncedIssue && onIssueSynced) {
        onIssueSynced(event.syncedIssue);
      }
    });

    return () => {
      unsubDb();
      unsubSync();
    };
  }, []);

  const handleManualSync = async (clientId: string) => {
    setSyncingReportId(clientId);
    try {
      const res = await syncEngine.syncSingleReport(clientId);
      if (res.success && res.issue && onIssueSynced) {
        onIssueSynced(res.issue);
      }
    } finally {
      setSyncingReportId(null);
      await loadReports();
    }
  };

  const handleSyncAll = async () => {
    await syncEngine.syncPendingReports(true);
    await loadReports();
  };

  const handleDelete = async (clientId: string) => {
    await deleteOfflineReport(clientId);
    setDeleteConfirmId(null);
    if (selectedReport?.clientId === clientId) setSelectedReport(null);
    if (editingReport?.clientId === clientId) setEditingReport(null);
    await loadReports();
  };

  const handleStartEdit = (report: OfflineReport) => {
    setEditingReport(report);
    setEditTitle(report.title);
    setEditDescription(report.description);
    setEditLocation(report.location);
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;
    await updateOfflineReportStatus(editingReport.clientId, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      location: editLocation.trim(),
      syncStatus: editingReport.syncStatus === 'Needs Attention' ? 'Pending Sync' : editingReport.syncStatus
    });
    setEditingReport(null);
    await loadReports();
  };

  const handleConfirmStaleReport = async (report: OfflineReport) => {
    // User confirms that old report is still valid
    await updateOfflineReportStatus(report.clientId, {
      syncStatus: 'Pending Sync',
      needsStaleReview: false,
      lastSyncError: null
    });
    setReviewConfirmReport(null);
    await loadReports();
    // Attempt sync immediately if online
    if (connectivity.isOnline()) {
      handleManualSync(report.clientId);
    }
  };

  const formatAge = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const getStatusBadge = (status: OfflineReport['syncStatus'], report: OfflineReport) => {
    if (report.needsStaleReview || syncEngine.isStale(report) && status !== 'Synced') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock size={11} />
          Needs Review (&gt;24h)
        </span>
      );
    }

    switch (status) {
      case 'Synced':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={11} />
            Synced
          </span>
        );
      case 'Syncing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
            <RefreshCw size={11} className="animate-spin" />
            Syncing
          </span>
        );
      case 'Needs Attention':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle size={11} />
            Needs Attention
          </span>
        );
      case 'Pending Sync':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <CloudUpload size={11} />
            Pending Sync
          </span>
        );
      case 'Saved Offline':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <WifiOff size={11} />
            Saved Offline
          </span>
        );
    }
  };

  const pendingReports = reports.filter((r) => r.syncStatus !== 'Synced');
  const syncedReports = reports.filter((r) => r.syncStatus === 'Synced');
  const pendingCount = pendingReports.length;
  const syncedCount = syncedReports.length;

  const filteredReports =
    viewFilter === 'pending'
      ? pendingReports
      : viewFilter === 'synced'
      ? syncedReports
      : reports;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Offline Report Queue</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
              {pendingCount} Pending / {reports.length} Total
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Reports stored securely on this device. Pending reports will synchronize automatically when connection is verified.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={!connectivity.isOnline()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 text-white flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Sync All ({pendingCount})</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Distinct Pending vs Synced view */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <button
          onClick={() => setViewFilter('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            viewFilter === 'pending'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CloudUpload size={13} />
          <span>Pending &amp; Action Required ({pendingCount})</span>
        </button>

        <button
          onClick={() => setViewFilter('synced')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            viewFilter === 'synced'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CheckCircle2 size={13} />
          <span>Synced ({syncedCount})</span>
        </button>

        <button
          onClick={() => setViewFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            viewFilter === 'all'
              ? 'bg-gray-200 text-gray-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>All ({reports.length})</span>
        </button>
      </div>

      {/* Notice Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
        <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-900">Local Device Buffer Notice</p>
          <p className="text-slate-600">
            Reports marked <strong className="text-slate-800">Saved Offline</strong> or{' '}
            <strong className="text-slate-800">Pending Sync</strong> exist only on your phone/browser.
            They have not reached CivicLens municipal officers yet until confirmed.
          </p>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">
          <RefreshCw size={24} className="animate-spin mx-auto text-blue-500 mb-2" />
          <p className="text-xs">Loading local storage buffer...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-12 text-center text-gray-400 space-y-2">
          <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
          <p className="text-sm font-semibold text-gray-700">
            {viewFilter === 'pending'
              ? 'No Pending Reports'
              : viewFilter === 'synced'
              ? 'No Synced Reports'
              : 'No Offline Reports in Queue'}
          </p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {viewFilter === 'pending'
              ? 'All local reports have been synchronized with the civic backend.'
              : viewFilter === 'synced'
              ? 'Synchronized reports will appear here once confirmed by the server.'
              : 'No offline reports currently stored on this device.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isSynced = report.syncStatus === 'Synced';
            const isStale = syncEngine.isStale(report) && !isSynced;

            return (
              <div
                key={report.clientId}
                className={`p-4 rounded-xl border transition-all ${
                  isSynced
                    ? 'bg-gray-50/50 border-gray-200 opacity-90'
                    : 'bg-white border-gray-200 hover:border-blue-300 shadow-2xs'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm text-gray-900">{report.title}</h4>
                      <CategoryBadge category={report.category} />
                      {getStatusBadge(report.syncStatus, report)}
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock size={11} /> {formatAge(report.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2">{report.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 pt-1">
                      <span>
                        <strong>Location:</strong> {report.location}
                      </span>
                      {report.coordinates && (
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                          [{report.coordinates.lat.toFixed(4)}, {report.coordinates.lng.toFixed(4)}]
                        </span>
                      )}
                      <span>
                        <strong>Type:</strong> {report.locationType}
                      </span>
                      {report.photoBlob && (
                        <span className="text-blue-600 font-semibold">• Has Photo Evidence</span>
                      )}
                    </div>

                    {/* Server ID confirmation */}
                    {isSynced && report.serverIssueId && (
                      <p className="text-[11px] text-emerald-700 font-semibold pt-1 flex items-center gap-1">
                        <Check size={12} />
                        Report synced successfully. Issue ID: {report.serverIssueId}
                        {report.ticketCode && ` (${report.ticketCode})`}
                      </p>
                    )}

                    {/* Last sync error message */}
                    {report.lastSyncError && !isSynced && (
                      <p className="text-[11px] text-rose-600 font-medium pt-1 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-md">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>{report.lastSyncError}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Inspect details"
                    >
                      <Eye size={16} />
                    </button>

                    {/* Edit is only allowed for local pending reports */}
                    {!isSynced && (
                      <button
                        onClick={() => handleStartEdit(report)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Edit local report details"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}

                    {/* Delete with confirmation */}
                    <button
                      onClick={() => setDeleteConfirmId(report.clientId)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title={isSynced ? "Remove local cached copy" : "Delete pending report"}
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* Manual Sync Button */}
                    {!isSynced && (
                      <button
                        onClick={() => {
                          if (isStale || report.needsStaleReview) {
                            setReviewConfirmReport(report);
                          } else {
                            handleManualSync(report.clientId);
                          }
                        }}
                        disabled={syncingReportId === report.clientId}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw
                          size={12}
                          className={syncingReportId === report.clientId ? 'animate-spin' : ''}
                        />
                        <span>Sync</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Stale report review banner */}
                {isStale && !isSynced && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-700 shrink-0" />
                      <span>
                        This report was filed over 24 hours ago. Please confirm whether this issue still exists.
                      </span>
                    </div>
                    <button
                      onClick={() => setReviewConfirmReport(report)}
                      className="px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      Review & Confirm
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 border border-gray-100 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Delete Report from Device?</h3>
              <p className="text-xs text-gray-500 mt-1">
                This will permanently remove this report from your local device storage. If not synced, it will not reach municipal officers.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal for Pending Local Reports */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-gray-100 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Edit Pending Offline Report</h3>
              <button
                onClick={() => setEditingReport(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Location Address</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stale Report Review Modal */}
      {reviewConfirmReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-gray-100 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Confirm Stale Civic Report</h3>
              <p className="text-xs text-gray-600 mt-1">
                This report for "<strong>{reviewConfirmReport.title}</strong>" was filed over 24 hours ago.
                Conditions may have changed, or municipal teams may have already fixed it.
              </p>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Does this issue still persist at {reviewConfirmReport.location}?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReviewConfirmReport(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Keep In Queue
              </button>
              <button
                onClick={() => handleConfirmStaleReport(reviewConfirmReport)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                Yes, Still Exists & Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-gray-100 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">Local Report Details</h3>
                {getStatusBadge(selectedReport.syncStatus, selectedReport)}
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {selectedReport.photoPreview && (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={selectedReport.photoPreview}
                  alt="Evidence"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-gray-500">Idempotency Key (Client UUID):</span>
                <p className="font-mono text-[11px] text-gray-800 break-all">{selectedReport.clientId}</p>
              </div>

              <div>
                <span className="font-bold text-gray-500">Title:</span>
                <p className="text-gray-900 font-semibold">{selectedReport.title}</p>
              </div>

              <div>
                <span className="font-bold text-gray-500">Description:</span>
                <p className="text-gray-800">{selectedReport.description}</p>
              </div>

              <div>
                <span className="font-bold text-gray-500">Location:</span>
                <p className="text-gray-800">
                  {selectedReport.location} ({selectedReport.locationType})
                </p>
                {selectedReport.coordinates && (
                  <p className="font-mono text-[10px] text-gray-500">
                    GPS: [{selectedReport.coordinates.lat}, {selectedReport.coordinates.lng}]
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                <div>
                  <span className="font-bold text-gray-500">Created:</span>
                  <p className="text-gray-700">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-500">Updated:</span>
                  <p className="text-gray-700">{new Date(selectedReport.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedReport.serverIssueId && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                  <span className="font-bold">Server Confirmed Issue ID:</span>
                  <p className="font-mono text-sm font-black mt-0.5">{selectedReport.serverIssueId}</p>
                  {selectedReport.ticketCode && (
                    <p className="text-xs mt-0.5">Ticket Code: {selectedReport.ticketCode}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
