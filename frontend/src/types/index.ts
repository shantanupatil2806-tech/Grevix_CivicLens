// frontend/src/types/index.ts

export type Category = 'Roads' | 'Garbage' | 'Water' | 'Electricity' | 'Other';
export type Status = 'Reported' | 'Acknowledged' | 'In Progress' | 'Resolved';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface StatusHistoryEntry {
  status: Status;
  timestamp: string;
  note: string;
  updatedBy: string;
}

export interface Issue {
  _id: string;
  ticketCode?: string; // e.g. "ANO-3426-456"
  title: string;
  description: string;
  category: Category;
  location: string;
  coordinates?: { lat: number; lng: number }; // [lat, lng] for geospatial map
  imagePath?: string | null;
  photos?: string[]; // multiple photo gallery
  severityScore: number;
  priorityScore: number;
  severityFactors?: string[];
  categoryReasons?: string[];
  status: Status;
  duplicateOf?: string | null;
  duplicateReason?: string | null;
  statusHistory?: StatusHistoryEntry[];
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
}
