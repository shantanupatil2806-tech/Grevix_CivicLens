// frontend/src/components/IssueDetail.tsx
import { useState } from 'react';
import type { Issue, Status } from '../types';
import { StatusBadge, CategoryBadge, SeverityBar } from './Badges';
import {
  X,
  MapPin,
  Calendar,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { updateIssueStatus } from '../services/api';

const STATUSES: Status[] = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface Props {
  issue: Issue;
  onClose: () => void;
  onUpdate: (updated: Issue) => void;
}

export default function IssueDetail({ issue, onClose, onUpdate }: Props) {
  const [updating, setUpdating] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [error, setError] = useState('');

  async function handleStatusChange(newStatus: Status) {
    if (newStatus === issue.status) return;

    setUpdating(true);
    setError('');

    const newHistoryEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: statusNote.trim() || `Status updated to ${newStatus}`,
      updatedBy: 'Community Admin'
    };

    if (issue.isDemo) {
      // Optimistic update for demo issues
      const updated: Issue = {
        ...issue,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        statusHistory: [...(issue.statusHistory || []), newHistoryEntry]
      };
      onUpdate(updated);
      setUpdating(false);
      setStatusNote('');
      return;
    }

    try {
      const updated = await updateIssueStatus(issue._id, newStatus, statusNote.trim() || undefined);
      onUpdate(updated);
      setStatusNote('');
    } catch {
      // Fallback update in case backend server is disconnected
      const fallback: Issue = {
        ...issue,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        statusHistory: [...(issue.statusHistory || []), newHistoryEntry]
      };
      onUpdate(fallback);
      setStatusNote('');
    } finally {
      setUpdating(false);
    }
  }

  const imageUrl = issue.imagePath
    ? issue.imagePath.startsWith('http') || issue.imagePath.startsWith('blob:')
      ? issue.imagePath
      : `${API_BASE}${issue.imagePath}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto my-auto border border-gray-100 animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex items-start justify-between z-10">
          <div className="pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-gray-400">ID: {issue._id.slice(-8)}</span>
              {issue.isDemo && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Demo Sample
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{issue.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Badges & Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={issue.category} />
              <StatusBadge status={issue.status} />
              {issue.duplicateOf && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  <Copy size={11} /> Duplicate Flagged
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-gray-400" />
                <span className="font-medium text-gray-700">{issue.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400" />
                <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Description & Community Observation
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-xl border border-gray-200">
              {issue.description}
            </p>
          </div>

          {/* Image Evidence */}
          {imageUrl && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-blue-500" /> Photo Evidence
              </h4>
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 max-h-72">
                <img
                  src={imageUrl}
                  alt="Citizen report photo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Hide if failed to load
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* AI Analysis & Score Explanation */}
          <div className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/30 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  AI Prioritization Breakdown
                </h4>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-blue-700 border border-blue-200 shadow-sm">
                Score: {issue.severityScore}/100
              </span>
            </div>

            <SeverityBar score={issue.severityScore} />

            {issue.severityFactors && issue.severityFactors.length > 0 ? (
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-medium text-blue-800">Scoring Factors Identified:</p>
                {issue.severityFactors.map((factor, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-blue-950">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-blue-700">
                Calculated based on {issue.category} infrastructure severity rules and community reports.
              </p>
            )}

            {issue.duplicateReason && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                <strong>Duplicate Context:</strong> {issue.duplicateReason}
              </div>
            )}
          </div>

          {/* Status Progression History Timeline */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <Clock size={14} className="text-gray-400" /> Lifecycle Status History
            </h4>
            <div className="relative pl-6 border-l-2 border-blue-100 space-y-4 my-2">
              {(issue.statusHistory && issue.statusHistory.length > 0 ? issue.statusHistory : [
                {
                  status: issue.status,
                  timestamp: issue.createdAt,
                  note: 'Initial report logged',
                  updatedBy: 'Citizen Reporter'
                }
              ]).map((entry, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline bullet */}
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800">{entry.status}</span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(entry.timestamp).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{entry.note}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Updated by: {entry.updatedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Status Transition Admin Bar */}
          <div className="pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-600" /> Admin Status Control
              </h4>
              <span className="text-[11px] text-gray-400">Updates reflect across all views</span>
            </div>

            {/* Note input for history */}
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Optional progress note (e.g. 'Repair team dispatched')..."
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STATUSES.map((s) => {
                const isCurrent = issue.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={updating || isCurrent}
                    onClick={() => handleStatusChange(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                    } disabled:opacity-60`}
                  >
                    {isCurrent && <CheckCircle2 size={12} />}
                    <span>{s}</span>
                  </button>
                );
              })}
            </div>

            {updating && (
              <p className="text-xs text-blue-600 mt-2.5 flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" /> Recording status update to database...
              </p>
            )}
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

