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
import { updateIssueStatus } from '../services/api';

const STATUSES: Status[] = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];

interface Props {
  issue: Issue;
  onClose: () => void;
  onUpdate: (updated: Issue) => void;
}

export default function IssueDetailSidePanel({ issue, onClose, onUpdate }: Props) {
  const [commentText, setCommentText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

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

  const photosList = issue.photos && issue.photos.length > 0
    ? issue.photos
    : issue.imagePath
    ? [issue.imagePath]
    : [
        'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1584463699042-3a5f259b3fae?w=500&auto=format&fit=crop&q=80'
      ];

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
      const updated = await updateIssueStatus(issue._id, targetStatus, note);
      onUpdate(updated);
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
    <aside className="fixed inset-y-0 left-0 z-30 md:static w-full sm:w-[420px] md:w-[450px] lg:w-[480px] bg-white h-full border-r border-gray-200/90 flex flex-col shadow-2xl md:shadow-none overflow-hidden shrink-0 transition-transform">
      {/* Top Header matching reference ANO-3426-456 */}
      <div className="p-4 px-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-blue-950 font-mono tracking-tight">
              {issue.ticketCode || `ISS-${issue._id.slice(-6).toUpperCase()}`}
            </h2>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeScore >= 80
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}
              >
                {activeScore >= 80 ? 'Severe' : 'Moderate'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                {issue.status}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium truncate mt-0.5 max-w-[280px] sm:max-w-[340px]">
            {issue.title}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable details body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Key-Value Details Table matching Reference */}
        <div className="bg-slate-50/70 rounded-xl p-4 border border-gray-200/80 space-y-2.5 text-xs">
          <div className="flex justify-between items-start gap-3">
            <span className="text-gray-400 font-medium shrink-0">Ticket Raised On</span>
            <span className="text-gray-800 font-semibold text-right">
              {new Date(issue.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>

          <div className="flex justify-between items-start gap-3 pt-1 border-t border-gray-200/50">
            <span className="text-gray-400 font-medium shrink-0">Address</span>
            <span className="text-gray-800 font-semibold text-right max-w-[240px] leading-relaxed">
              {issue.location}
            </span>
          </div>

          <div className="flex justify-between items-center gap-3 pt-1 border-t border-gray-200/50">
            <span className="text-gray-400 font-medium shrink-0">Coordinates</span>
            <span className="text-blue-600 font-mono font-semibold text-right flex items-center gap-1">
              <Navigation size={11} className="text-blue-500" />
              {issue.coordinates
                ? `${issue.coordinates.lat.toFixed(5)}, ${issue.coordinates.lng.toFixed(5)}`
                : '17.40654, 78.41123'}
            </span>
          </div>

          <div className="flex justify-between items-center gap-3 pt-1 border-t border-gray-200/50">
            <span className="text-gray-400 font-medium shrink-0">Incident Type</span>
            <span className="text-gray-900 font-bold">{issue.category}</span>
          </div>

          <div className="flex justify-between items-center gap-3 pt-1 border-t border-gray-200/50">
            <span className="text-gray-400 font-medium shrink-0">Work Progress Status</span>
            <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {issue.status === 'In Progress' ? 'Emergency Repair Underway' : issue.status}
            </span>
          </div>

          <div className="flex justify-between items-center gap-3 pt-1 border-t border-gray-200/50">
            <span className="text-gray-400 font-medium shrink-0">Last Updated Date</span>
            <span className="text-gray-700 font-medium">
              {new Date(issue.updatedAt || issue.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Transparent Rule-Based Priority Scoring Breakdown */}
        <div className="p-4 bg-gradient-to-br from-indigo-50/70 to-blue-50/50 rounded-xl border border-indigo-100/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs uppercase tracking-wide">
              <Sparkles size={14} className="text-indigo-600" />
              <span>Priority Scoring Breakdown (Rule-Based)</span>
            </div>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
              Score: {activeScore}/100
            </span>
          </div>

          <SeverityBar score={activeScore} />

          {activeFactors && activeFactors.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-semibold text-indigo-900">Computed Contributing Factors:</p>
              {activeFactors.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-indigo-950">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          {issue.duplicateReason && (
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
              <strong>Potential Duplicate Review:</strong> {issue.duplicateReason}
            </div>
          )}
        </div>

        {/* Description & Citizen Comment */}
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            Observations & Details
          </h4>
          <p className="text-xs text-gray-700 leading-relaxed bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
            {issue.description}
          </p>
        </div>

        {/* Photos Grid matching Reference */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={14} className="text-blue-600" />
              <span>Photos ({photosList.length})</span>
            </h4>
            <span className="text-[11px] text-gray-400">Click photo to zoom</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {photosList.map((photoUrl, idx) => (
              <div
                key={idx}
                onClick={() => setActivePhoto(photoUrl)}
                className="group relative h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 cursor-pointer shadow-2xs hover:shadow-md transition-all"
              >
                <img
                  src={photoUrl}
                  alt={`Evidence photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Zoomed Photo Modal */}
        {activePhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setActivePhoto(null)}
          >
            <div className="relative max-w-lg max-h-[80vh] rounded-2xl overflow-hidden bg-white shadow-2xl">
              <img src={activePhoto} alt="Zoomed view" className="w-full h-full object-contain" />
              <button
                onClick={() => setActivePhoto(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Status Transition & Fast Comment Box matching Reference UI */}
        <div className="p-4 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-600" /> Dispatch & Update Status
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
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-700'
                } disabled:opacity-50`}
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
              className="flex-1 px-3 py-2 bg-white text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => handleAddCommentOrStatus()}
              disabled={isUpdating || !commentText.trim()}
              className="px-3.5 py-2 bg-blue-950 text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              <Send size={11} />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Lifecycle Audit History */}
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Clock size={13} /> Status Audit History
          </h4>
          <div className="space-y-2 border-l-2 border-blue-100 pl-4 ml-1">
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
                  <span className="font-bold text-gray-800">{h.status}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-gray-600 text-[11px] mt-0.5">{h.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
