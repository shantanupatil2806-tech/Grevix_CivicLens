// frontend/src/services/syncEngine.ts
import { OfflineReport, Issue } from '../types';
import {
  getAllOfflineReports,
  updateOfflineReportStatus,
  getOfflineReport
} from './offlineDb';
import { createIssue } from './api';
import { connectivity } from './connectivity';

export type SyncEventListener = (event: {
  type: 'sync-started' | 'sync-finished' | 'report-synced' | 'report-failed';
  report?: OfflineReport;
  error?: string;
  syncedIssue?: Issue;
}) => void;

class SyncEngine {
  private isSyncing = false;
  private listeners: Set<SyncEventListener> = new Set();
  private maxRetries = 5;
  // Configurable stale threshold in milliseconds (default: 24 hours)
  private staleThresholdMs = 24 * 60 * 60 * 1000;

  constructor() {
    if (typeof window !== 'undefined') {
      // Auto-trigger sync when connectivity returns
      connectivity.subscribe((isOnline) => {
        if (isOnline) {
          this.syncPendingReports();
        }
      });

      // Also trigger sync when window/tab is focused or visible
      window.addEventListener('focus', () => {
        if (connectivity.isOnline()) {
          this.syncPendingReports();
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && connectivity.isOnline()) {
          this.syncPendingReports();
        }
      });
    }
  }

  public subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: {
    type: 'sync-started' | 'sync-finished' | 'report-synced' | 'report-failed';
    report?: OfflineReport;
    error?: string;
    syncedIssue?: Issue;
  }) {
    this.listeners.forEach((l) => {
      try {
        l(event);
      } catch (err) {
        console.error('Sync listener error:', err);
      }
    });
  }

  public isStale(report: OfflineReport): boolean {
    const ageMs = Date.now() - new Date(report.createdAt).getTime();
    return ageMs > this.staleThresholdMs;
  }

  public async syncPendingReports(forceAll = false): Promise<{
    successCount: number;
    failedCount: number;
    skippedCount: number;
  }> {
    if (this.isSyncing) {
      return { successCount: 0, failedCount: 0, skippedCount: 0 };
    }

    // Verify online reachability first
    const online = await connectivity.verifyBackendReachability();
    if (!online) {
      return { successCount: 0, failedCount: 0, skippedCount: 0 };
    }

    this.isSyncing = true;
    this.notify({ type: 'sync-started' });

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
      const allReports = await getAllOfflineReports();
      const pendingReports = allReports.filter((r) => {
        if (r.syncStatus === 'Synced') return false;
        if (forceAll) return true;
        // If it was marked 'Needs Attention' due to the server-side bug 'next is not a function',
        // allow auto-retrying now that the backend has been fixed!
        if (r.syncStatus === 'Needs Attention') {
          if (r.lastSyncError && r.lastSyncError.includes('next is not a function')) {
            return true;
          }
          return false;
        }
        return true;
      });

      for (const report of pendingReports) {
        // Check for stale reports that require user confirmation first
        if (this.isStale(report) && !report.needsStaleReview && !forceAll) {
          await updateOfflineReportStatus(report.clientId, {
            syncStatus: 'Needs Attention',
            needsStaleReview: true,
            lastSyncError: 'Report is older than 24 hours. Please review and confirm the issue still exists before uploading.'
          });
          skippedCount++;
          continue;
        }

        const res = await this.syncSingleReport(report.clientId);
        if (res.success) {
          successCount++;
        } else {
          failedCount++;
        }
      }
    } finally {
      this.isSyncing = false;
      this.notify({ type: 'sync-finished' });
    }

    return { successCount, failedCount, skippedCount };
  }

  public async syncSingleReport(clientId: string): Promise<{ success: boolean; issue?: Issue; error?: string }> {
    const report = await getOfflineReport(clientId);
    if (!report) {
      return { success: false, error: 'Report not found' };
    }

    // If already synced, don't re-upload
    if (report.syncStatus === 'Synced' && report.serverIssueId) {
      return { success: true };
    }

    // Mark as Syncing
    await updateOfflineReportStatus(clientId, {
      syncStatus: 'Syncing'
    });

    try {
      const fd = new FormData();
      fd.append('title', report.title);
      fd.append('description', report.description);
      fd.append('category', report.category);
      fd.append('location', report.location);
      fd.append('clientId', report.clientId);
      fd.append('clientCreatedAt', report.createdAt);
      if (report.citizenId) {
        fd.append('citizenId', report.citizenId);
      }

      if (report.ticketCode) {
        fd.append('ticketCode', report.ticketCode);
      }
      if (report.coordinates) {
        fd.append('latitude', String(report.coordinates.lat));
        fd.append('longitude', String(report.coordinates.lng));
      }
      if (report.reporterName) {
        fd.append('reporterName', report.reporterName);
      }
      if (report.reporterContact) {
        fd.append('reporterContact', report.reporterContact);
      }
      if (report.photoBlob) {
        const filename = report.photoName || `photo-${Date.now()}.jpg`;
        fd.append('photo', report.photoBlob, filename);
      }

      const response = await createIssue(fd);
      const serverIssue = response.issue;

      // Verify the response represents a real persisted document
      if (!serverIssue || !serverIssue._id) {
        throw new Error('Server did not return a valid issue ID. The report may not have been saved.');
      }

      // Mark report as Synced with server issue ID
      const updated = await updateOfflineReportStatus(clientId, {
        syncStatus: 'Synced',
        serverIssueId: serverIssue._id,
        ticketCode: serverIssue.ticketCode || report.ticketCode,
        lastSyncError: null
      });

      this.notify({
        type: 'report-synced',
        report: updated || report,
        syncedIssue: serverIssue
      });

      return { success: true, issue: serverIssue };
    } catch (err: any) {
      const status = err.response?.status;
      const isValidationError = status >= 400 && status < 500 && status !== 408 && status !== 429;
      const errMsg = err.response?.data?.error || err.message || 'Sync failed';

      const newRetryCount = (report.retryCount || 0) + 1;
      let nextSyncStatus: OfflineReport['syncStatus'] = 'Pending Sync';

      if (isValidationError || newRetryCount >= this.maxRetries) {
        nextSyncStatus = 'Needs Attention';
      }

      const updated = await updateOfflineReportStatus(clientId, {
        syncStatus: nextSyncStatus,
        retryCount: newRetryCount,
        lastSyncError: errMsg
      });

      this.notify({
        type: 'report-failed',
        report: updated || report,
        error: errMsg
      });

      return { success: false, error: errMsg };
    }
  }

  public getSyncState() {
    return {
      isSyncing: this.isSyncing
    };
  }
}

export const syncEngine = new SyncEngine();
