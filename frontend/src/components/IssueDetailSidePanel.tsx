import { useState, useMemo } from 'react';
import type { Issue, Status } from '../types';
import { StatusBadge, CategoryBadge, SeverityBar } from './Badges';
import { computeSeverityDetails } from '../services/analysis';
import {
  X,
  MapPin,
  Calendar,
  Copy,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  MessageSquare,
  Send,
  Navigation,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';
import { updateIssueStatus, assignIssueWorker, verifyAndResolveIssue } from '../services/api';
import { User, Calendar as CalendarIcon } from 'lucide-react';

const STATUSES: Status[] = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];

const CREW_WORKERS = [
  { id: 'w1', name: 'Ramesh Kumar', department: 'Roads & Infrastructure' },
  { id: 'w2', name: 'Suresh Patel', department: 'Water & Sewage' },
  { id: 'w3', name: 'Sunita Sharma', department: 'Solid Waste & Sanitation' }
];

interface Props {
  issue: Issue;
  onClose: () => void;
  onUpdate: (updated: Issue) => void;
}

export default function IssueDetailSidePanel({ issue, onClose, onUpdate }: Props) {
  const [commentText, setCommentText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(() => new Set());

  // Assign worker & deadline form state
  const [selectedWorkerName, setSelectedWorkerName] = useState(issue.assignedWorkerName || '');
  const [deadlineDate, setDeadlineDate] = useState(
    issue.deadline ? new Date(issue.deadline).toISOString().split('T')[0] : ''
  );
  const [instructionsText, setInstructionsText] = useState(issue.internalInstructions || '');
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  // Dynamic priority score and factors calculated directly from this issue's data
  const dynamicSeverity = useMemo(() => {
    return computeSeverityDetails({
      category: issue.category,
      title: issue.title,
      description: issue.description
    });
  }, [issue.category, issue.title, issue.description]);

  const activeScore = issue.severityScore || dynamicSeverity.score;
  const activeFactors = issue.severityFactors && issue.severityFactors.length > 0
    ? issue.severityFactors
    : dynamicSeverity.factors;

  // Only show photos that were actually submitted — never fabricate evidence with stock images
  const photosList: string[] = issue.photos && issue.photos.length > 0
    ? issue.photos.filter(Boolean)
    : issue.imagePath
    ? [issue.imagePath]
    : [];

  async function handleAssignWorkerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorkerName) return;

    setIsUpdating(true);
    setAssignSuccessMsg('');

    const workerObj = CREW_WORKERS.find((w) => w.name === selectedWorkerName);
    const department = workerObj ? workerObj.department : issue.assignedDepartment || '';

    try {
      if (issue.isDemo) {
        const updated: Issue = {
          ...issue,
          assignedWorkerName: selectedWorkerName,
          assignedDepartment: department,
          deadline: deadlineDate ? new Date(deadlineDate).toISOString() : undefined,
          internalInstructions: instructionsText.trim() || undefined,
          status: 'Assigned',
          statusHistory: [
            ...(issue.statusHistory || []),
            {
              status: 'Assigned',
              timestamp: new Date().toISOString(),
              note: `Assigned to ${selectedWorkerName} (${department})${deadlineDate ? ` with deadline ${deadlineDate}` : ''}`,
              updatedBy: 'Municipal Dispatch Lead'
            }
          ]
        };
        onUpdate(updated);
        setAssignSuccessMsg('Assigned successfully! 👷');
      } else {
        const updated = await assignIssueWorker(issue._id, {
          workerName: selectedWorkerName,
          department,
          deadline: deadlineDate ? new Date(deadlineDate).toISOString() : undefined,
          internalInstructions: instructionsText.trim() || undefined
        });
        const merged: Issue = {
          ...issue,
          ...updated,
          assignedWorkerName: selectedWorkerName,
          assignedDepartment: department,
          deadline: deadlineDate ? new Date(deadlineDate).toISOString() : issue.deadline,
          internalInstructions: instructionsText.trim() || issue.internalInstructions,
          status: 'Assigned'
        };
        onUpdate(merged);
        setAssignSuccessMsg('Assigned successfully! 👷');
      }
    } catch (err: any) {
      // Fallback optimistic update
      const fallback: Issue = {
        ...issue,
        assignedWorkerName: selectedWorkerName,
        assignedDepartment: department,
        deadline: deadlineDate ? new Date(deadlineDate).toISOString() : undefined,
        internalInstructions: instructionsText.trim() || undefined,
        status: 'Assigned',
        statusHistory: [
          ...(issue.statusHistory || []),
          {
            status: 'Assigned',
            timestamp: new Date().toISOString(),
            note: `Assigned to ${selectedWorkerName} (${department})`,
            updatedBy: 'Municipal Dispatch Lead'
          }
        ]
      };
      onUpdate(fallback);
      setAssignSuccessMsg('Assigned locally! 👷');
    } finally {
      setIsUpdating(false);
      setTimeout(() => setAssignSuccessMsg(''), 4000);
    }
  }

  async function handleAddCommentOrStatus(newStatus?: Status) {
    const targetStatus = newStatus || issue.status;
    const note = commentText.trim() || `Status updated to ${targetStatus}`;

    setIsUpdating(true);
    const newEntry = {
      status: targetStatus,
      timestamp: new Date().toISOString(),
      note,
      updatedBy: 'Maintenance Lead'
    };

    if (issue.isDemo) {
      const updated: Issue = {
        ...issue,
        status: targetStatus,
        updatedAt: new Date().toISOString(),
        statusHistory: [...(issue.statusHistory || []), newEntry]
      };
      onUpdate(updated);
      setCommentText('');
      setIsUpdating(false);
      return;
    }

    try {
      const serverUpdated = await updateIssueStatus(issue._id, targetStatus, note);
      const safeUpdated: Issue = {
        ...issue,
        ...serverUpdated,
        ticketCode: serverUpdated?.ticketCode || issue.ticketCode,
        coordinates: serverUpdated?.coordinates || issue.coordinates
      };
      onUpdate(safeUpdated);
      setCommentText('');
    } catch {
      const fallback: Issue = {
        ...issue,
        status: targetStatus,
        updatedAt: new Date().toISOString(),
        statusHistory: [...(issue.statusHistory || []), newEntry]
      };
      onUpdate(fallback);
      setCommentText('');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 md:static w-full sm:w-[420px] md:w-[450px] lg:w-[480px] bg-slate-900 h-full border-r border-slate-800 text-slate-100 flex flex-col shadow-2xl md:shadow-none overflow-hidden shrink-0 transition-transform">
      {/* Top Header matching reference ANO-3426-456 */}
      <div className="p-4 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-blue-400 font-mono tracking-tight">
              {issue.ticketCode || `ISS-${issue._id.slice(-6).toUpperCase()}`}
            </h2>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeScore >= 80
                    ? 'bg-red-950/70 text-red-400 border border-red-800/60'
                    : 'bg-amber-950/70 text-amber-400 border border-amber-800/60'
                }`}
              >
                {activeScore >= 80 ? 'Severe' : 'Moderate'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                {issue.status}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium truncate mt-0.5 max-w-[280px] sm:max-w-[340px]">
            {issue.title}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable details body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Key-Value Details Table matching Reference */}
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/90 space-y-2.5 text-xs">
          <div className="flex justify-between items-start gap-3">
            <span className="text-slate-400 font-medium shrink-0">Ticket Raised On</span>
            <span className="text-slate-200 font-semibold text-right">
              {new Date(issue.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>

          <div className="flex justify-between items-start gap-3 pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium shrink-0">Address</span>
            <span className="text-slate-200 font-semibold text-right max-w-[240px] leading-relaxed">
              {issue.location}
            </span>
          </div>

          <div className="flex justify-between items-center gap-3 pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium shrink-0">Coordinates</span>
            <span className="text-blue-400 font-mono font-semibold text-right flex items-center gap-1">
              <Navigation size={11} className="text-blue-400" />
              {issue.coordinates
                ? `${issue.coordinates.lat.toFixed(5)}, ${issue.coordinates.lng.toFixed(5)}`
                : '17.40654, 78.41123'}
            </span>
          </div>

          <div className="flex justify-between items-center gap-3 pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium shrink-0">Incident Type</span>
            <CategoryBadge category={issue.category} />
          </div>

          <div className="flex justify-between items-center gap-3 pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium shrink-0">Work Progress Status</span>
            <span className="text-blue-300 font-bold bg-blue-950/70 px-2 py-0.5 rounded border border-blue-800/70">
              {issue.status === 'In Progress' ? 'Emergency Repair Underway' : issue.status}
            </span>
          </div>

          <div className="flex justify-between items-center gap-3 pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium shrink-0">Assigned Worker</span>
            <span className="text-slate-200 font-bold">
              {issue.assignedWorkerName ? (
                <span className="text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/70">
                  {issue.assignedWorkerName} {issue.assignedDepartment ? `(${issue.assignedDepartment})` : ''}
                </span>
              ) : (
                <span className="text-slate-500 italic font-normal">Unassigned</span>
              )}
            </span>
          </div>

          {issue.deadline && (
            <div className="flex justify-between items-center gap-3 pt-1 border-t border-slate-800/80">
              <span className="text-slate-400 font-medium shrink-0">Target Deadline</span>
              <span className="text-amber-300 font-bold bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800/70 flex items-center gap-1">
                <Calendar size={11} />
                {new Date(issue.deadline).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center gap-3 pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium shrink-0">Last Updated Date</span>
            <span className="text-slate-300 font-medium">
              {new Date(issue.updatedAt || issue.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Transparent Rule-Based Priority Scoring Breakdown */}
        <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-800/60 space-y-2.5">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-xs uppercase tracking-wide">
              <Sparkles size={14} className="text-indigo-400 shrink-0" />
              <span>Priority Scoring Breakdown (Rule-Based)</span>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-slate-900 text-indigo-300 border border-indigo-700/60 shadow-md shrink-0 whitespace-nowrap text-center leading-none">
              Score: {activeScore}/100
            </span>
          </div>

          <SeverityBar score={activeScore} />

          {activeFactors && activeFactors.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-semibold text-indigo-300">Computed Contributing Factors:</p>
              {activeFactors.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-indigo-200">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          {issue.duplicateReason && (
            <div className="p-2.5 bg-amber-950/60 rounded-lg border border-amber-800/60 text-xs text-amber-300">
              <strong>Potential Duplicate Review:</strong> {issue.duplicateReason}
            </div>
          )}
        </div>

        {/* Description & Citizen Comment */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Observations & Details
          </h4>
          <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 shadow-sm">
            {issue.description}
          </p>
        </div>

        {/* Photos Grid — only real uploaded photos, no stock/demo fallback */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={14} className="text-blue-400" />
              <span>Photos ({photosList.length})</span>
            </h4>
            {photosList.length > 0 && (
              <span className="text-[11px] text-slate-500">Click photo to zoom</span>
            )}
          </div>

          {photosList.length === 0 ? (
            <div className="flex items-center justify-center h-16 rounded-xl border border-dashed border-slate-800 bg-slate-950/50 text-slate-500 text-xs gap-2">
              <ImageIcon size={14} />
              <span>No photos attached to this report</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {photosList.map((photoUrl, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (!failedPhotos.has(photoUrl)) setActivePhoto(photoUrl);
                  }}
                  className={`group relative h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-sm hover:border-slate-700 transition-all ${failedPhotos.has(photoUrl) ? '' : 'cursor-pointer'}`}
                >
                  {failedPhotos.has(photoUrl) ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-[10px] text-slate-400">
                      <ImageIcon size={16} />
                      <span>Photo unavailable</span>
                    </div>
                  ) : (
                    <img
                      src={photoUrl}
                      alt={`Evidence photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() => setFailedPhotos((previous) => new Set(previous).add(photoUrl))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zoomed Photo Modal */}
        {activePhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setActivePhoto(null)}
          >
            <div className="relative max-w-lg max-h-[80vh] rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl">
              <img src={activePhoto} alt="Zoomed view" className="w-full h-full object-contain" />
              <button
                onClick={() => setActivePhoto(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Officer Assignment, Deadline & Instructions Card */}
        <div className="p-4 bg-amber-950/30 rounded-xl border border-amber-800/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <User size={14} className="text-amber-400" /> Assign Worker &amp; Target Deadline
            </span>
            {assignSuccessMsg && (
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/70 px-2 py-0.5 rounded-full animate-fadeIn">
                {assignSuccessMsg}
              </span>
            )}
          </div>

          <form onSubmit={handleAssignWorkerSubmit} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Field Maintenance Crew / Worker:
              </label>
              <select
                value={selectedWorkerName}
                onChange={(e) => setSelectedWorkerName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-900 text-slate-100 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold cursor-pointer"
              >
                <option value="" className="bg-slate-900">Select crew member...</option>
                {CREW_WORKERS.map((w) => (
                  <option key={w.id} value={w.name} className="bg-slate-900">
                    {w.name} ({w.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Target Resolution Deadline:
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-900 text-slate-100 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Officer Instructions (Visible to Worker):
              </label>
              <textarea
                rows={2}
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                placeholder="e.g. Inspect road sub-base, compact asphalt patch, and install barricades."
                className="w-full px-3 py-1.5 text-xs bg-slate-900 text-slate-100 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating || !selectedWorkerName}
              className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck size={13} />
              <span>Assign Worker &amp; Confirm Target</span>
            </button>
          </form>
        </div>

        {/* Worker Completion Evidence & Field Progress Notes (Visible when worker updates) */}
        {issue.completionEvidence?.notes && (
          <div className="p-4 bg-emerald-950/40 rounded-xl border border-emerald-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Worker Field Progress &amp; Completion Notes</span>
              </span>
              {issue.completionEvidence.submittedAt && (
                <span className="text-[10px] text-emerald-400 font-medium">
                  {new Date(issue.completionEvidence.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-200 bg-slate-900/80 p-3 rounded-lg border border-emerald-800/60 font-medium leading-relaxed">
              "{issue.completionEvidence.notes}"
            </p>
            {issue.assignedWorkerName && (
              <p className="text-[10px] text-emerald-400">
                Submitted by: <strong>{issue.assignedWorkerName}</strong>
              </p>
            )}
            {issue.status !== 'Awaiting Citizen Confirmation' && issue.status !== 'Closed' && (
              <button
                type="button"
                onClick={async () => {
                  setIsUpdating(true);
                  try {
                    const resolved = await verifyAndResolveIssue(issue._id, { approved: true });
                    onUpdate({ ...issue, ...resolved, status: 'Awaiting Citizen Confirmation' });
                  } catch {
                    handleAddCommentOrStatus('Resolved');
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating}
                className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={13} />
                <span>Approve Work & Request Citizen Confirmation</span>
              </button>
            )}
          </div>
        )}

        {/* Status Transition & Fast Comment Box matching Reference UI */}
        <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-400" /> Dispatch & Update Status
            </span>
          </div>

          {/* Quick status chips */}
          <div className="grid grid-cols-2 gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                disabled={isUpdating || issue.status === s}
                onClick={() => handleAddCommentOrStatus(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  issue.status === s
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white'
                } disabled:opacity-50 cursor-pointer`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Comment input matching reference */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Type update note here..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCommentOrStatus();
              }}
              className="flex-1 px-3 py-2 bg-slate-900 text-slate-100 text-xs border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
            />
            <button
              onClick={() => handleAddCommentOrStatus()}
              disabled={isUpdating || !commentText.trim()}
              className="px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              <Send size={11} />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Citizen Dispute Alert (visible to officer when citizen has reopened) */}
        {issue.citizenFeedback?.disputes && issue.citizenFeedback.disputes.length > 0 && (
          <div className="p-4 bg-orange-950/40 rounded-xl border border-orange-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-orange-400" />
                Citizen Dispute{issue.citizenFeedback.disputes.length > 1 ? 's' : ''} Filed
              </span>
              <span className="text-[10px] font-bold text-orange-300 bg-orange-950 px-2 py-0.5 rounded-full border border-orange-700/60">
                {issue.citizenFeedback.disputeCount ?? issue.citizenFeedback.disputes.length}/2 used
              </span>
            </div>
            {issue.citizenFeedback.disputes.map((d, i) => (
              <div key={i} className="bg-slate-900 rounded-lg p-3 border border-orange-800/60 space-y-1.5">
                <p className="text-xs font-semibold text-orange-300">Reason #{i + 1}:</p>
                <p className="text-xs text-slate-200 leading-relaxed">"{d.reason}"</p>
                {d.photo && (
                  <img src={d.photo} alt="Dispute evidence" className="h-20 w-32 object-cover rounded-md border border-orange-700/60 mt-1" />
                )}
                {d.timestamp && (
                  <p className="text-[10px] text-orange-400">{new Date(d.timestamp).toLocaleString()}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lifecycle Audit History */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Clock size={13} /> Status Audit History
          </h4>
          <div className="space-y-2 border-l-2 border-slate-700 pl-4 ml-1">
            {(issue.statusHistory || [
              {
                status: issue.status,
                timestamp: issue.createdAt,
                note: 'Report registered',
                updatedBy: 'Citizen Reporter'
              }
            ]).map((h, i) => (
              <div key={i} className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{h.status}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">{h.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
