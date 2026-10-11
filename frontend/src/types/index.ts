// frontend/src/types/index.ts

export type Category = 'Roads' | 'Garbage' | 'Water' | 'Electricity' | 'Other';
export type Status =
  | 'Reported'
  | 'Under Review'
  | 'Accepted'
  | 'Rejected'
  | 'Assigned'
  | 'In Progress'
  | 'Pending Verification'
  | 'Resolved'
  | 'Awaiting Citizen Confirmation'
  | 'Closed'
  | 'Acknowledged';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface StatusHistoryEntry {
  status: Status;
  timestamp: string;
  note: string;
  updatedBy: string;
}

export interface CitizenDispute {
  reason: string;
  photo?: string | null;
  timestamp: string;
  citizenId?: string | null;
}

export interface CitizenFeedback {
  isConfirmed: boolean;
  confirmedAt?: string | null;
  autoCloseDeadline?: string | null;
  disputeCount: number;
  disputes?: CitizenDispute[];
}

export interface Issue {
  _id: string;
  dashboardVisible?: boolean;
  ticketCode?: string; // e.g. "ANO-3426-456"
  title: string;
  description: string;
  category: Category;
  location: string;
  coordinates?: { lat: number; lng: number }; // [lat, lng] for geospatial map
  imagePath?: string | null;
  photos?: string[]; // multiple photo gallery (initial report)
  severityScore: number;
  priorityScore: number;
  severityFactors?: string[];
  categoryReasons?: string[];
  status: Status;
  // Community Impact
  upvoteCount?: number;
  upvotedByCitizens?: string[];
  hasUpvoted?: boolean;
  duplicateOf?: string | null;
  duplicateReason?: string | null;
  assignedWorker?: string | null;
  assignedWorkerName?: string | null;
  assignedDepartment?: string | null;
  deadline?: string | null;
  internalInstructions?: string | null;
  completionEvidence?: {
    notes: string;
    photos: string[]; // After-repair proof photos
    submittedAt?: string | null;
    submittedBy?: string | null;
  } | null;
  citizenFeedback?: CitizenFeedback | null;
  reopenedHistory?: Array<{
    reopenedAt: string;
    reason: string;
    reopenedBy: string;
    isCitizenDispute?: boolean;
  }>;
  statusHistory?: StatusHistoryEntry[];
  citizenId?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean; // client-side flag for sample data
}

export interface AnalysisResult {
  category: Category;
  categoryReasons: string[];
  confidence: number;
  severityScore: number;
  severityLabel: 'Low' | 'Medium' | 'High' | 'Critical';
  severityFactors: string[];
  duplicate: {
    id: string;
    title: string;
    reason: string;
    similarity: number;
  } | null;
}

export interface IssueFilters {
  search: string;
  category: Category | '';
  status: Status | '';
  minSeverity: number;
  publicOnly?: boolean;
}

export type SyncStatus =
  | 'Saved Offline'
  | 'Pending Sync'
  | 'Syncing'
  | 'Synced'
  | 'Needs Attention';

export interface OfflineReport {
  clientId: string; // client-generated UUID idempotency key
  citizenId?: string; // unique citizen identity key for isolation
  title: string;
  description: string;
  category: Category;
  location: string;
  coordinates?: { lat: number; lng: number } | null;
  locationType: 'map-pinned' | 'manual' | 'geocoded';
  photoBlob?: Blob | null;
  photoName?: string | null;
  photoPreview?: string | null; // Data URL or Object URL for display
  reporterName?: string;
  reporterContact?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  syncStatus: SyncStatus;
  retryCount: number;
  lastSyncError?: string | null;
  serverIssueId?: string | null; // populated once synced
  ticketCode?: string;
  needsStaleReview?: boolean; // if report is > 24 hours old before syncing
}

