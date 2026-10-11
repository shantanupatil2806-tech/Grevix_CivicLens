import React, { useState } from 'react';
import type { Issue } from '../types';
import { StatusBadge, CategoryBadge, SeverityBar } from './Badges';
import {
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  FileCheck2,
  Upload,
  User,
  ShieldCheck,
  Send,
  Sparkles
} from 'lucide-react';
import { submitWorkerTaskUpdate, loginUser } from '../services/api';
import { normalizeCategory } from '../utils/category';

interface WorkerDef {
  id: string;
  name: string;
  email: string;
  department: string;
  category: string;
}

interface Props {
  issues: Issue[];
  onIssueUpdated: (updated: Issue) => void;
  onSwitchToDashboard: () => void;
  onSwitchToCitizen: () => void;
}

export default function WorkerPortal({
  issues,
  onIssueUpdated,
  onSwitchToDashboard,
  onSwitchToCitizen
}: Props) {
  // Field workers mapped to their specific domain department and login email
  const WORKERS: WorkerDef[] = [
    { id: 'w1', name: 'Ramesh Kumar', email: 'worker.roads@civiclens.gov', department: 'Roads & Infrastructure', category: 'Roads' },
    { id: 'w2', name: 'Suresh Patel', email: 'worker.water@civiclens.gov', department: 'Water & Sewage', category: 'Water' },
    { id: 'w3', name: 'Sunita Sharma', email: 'worker.sanitation@civiclens.gov', department: 'Solid Waste & Sanitation', category: 'Garbage' }
  ];

  const [selectedWorker, setSelectedWorker] = useState(WORKERS[1]); // Default to Suresh Patel or active
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [progressNote, setProgressNote] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-authenticate selected worker so API calls succeed seamlessly
  React.useEffect(() => {
    loginUser(selectedWorker.email, 'password123').catch((err) => {
      console.warn('Auto-login for worker demo session:', err);
    });
  }, [selectedWorker]);

  // Filter tasks strictly belonging to this worker:
  // 1. Explicitly assigned to this worker by name
  // 2. OR matching their department category if in active field workflow (Assigned / In Progress / Pending Verification)
  const assignedTasks = issues.filter((iss) => {
    const isFieldStatus =
      iss.status === 'Assigned' ||
      iss.status === 'In Progress' ||
      iss.status === 'Pending Verification';

    if (!isFieldStatus) return false;

    // Direct name assignment takes precedence
    if (iss.assignedWorkerName) {
      return iss.assignedWorkerName.toLowerCase() === selectedWorker.name.toLowerCase();
    }

    // Otherwise, only route issues belonging to this worker's department category
    return normalizeCategory(iss.category) === selectedWorker.category;
  });

  const activeTask = selectedIssue || assignedTasks[0] || null;

  async function handleTaskAction(markComplete: boolean) {
    if (!activeTask) return;
    setIsSubmitting(true);
    setMessage(null);

    const note = progressNote.trim() || (markComplete ? 'Repair work executed and completed on-site.' : 'Work in progress on-site.');

    try {
      if (activeTask.isDemo) {
        // Optimistic update for demo issues
        const updated: Issue = {
          ...activeTask,
          status: markComplete ? 'Pending Verification' : 'In Progress',
          completionEvidence: markComplete ? {
            notes: note,
            photos: evidencePhotos,
            submittedAt: new Date().toISOString()
          } : activeTask.completionEvidence,
          statusHistory: [
            ...(activeTask.statusHistory || []),
            {
              status: markComplete ? 'Pending Verification' : 'In Progress',
              timestamp: new Date().toISOString(),
              note: `${note} (Updated by ${selectedWorker.name})`,
              updatedBy: selectedWorker.name
            }
          ]
        };
        onIssueUpdated(updated);
        setSelectedIssue(updated);
        setMessage({
          type: 'success',
          text: markComplete ? 'Task submitted for officer verification! ✅' : 'Progress note recorded! 🛠️'
        });
        setProgressNote('');
      } else {
        let updated: Issue;
        try {
          updated = await submitWorkerTaskUpdate(activeTask._id, {
            progressNote: note,
            markComplete,
            evidencePhotos
          });
        } catch (apiErr: any) {
          // If token was missing/expired, re-login and retry once
          if (apiErr.response?.status === 401 || apiErr.response?.status === 403) {
            await loginUser(selectedWorker.email, 'password123');
            updated = await submitWorkerTaskUpdate(activeTask._id, {
              progressNote: note,
              markComplete,
              evidencePhotos
            });
          } else {
            throw apiErr;
          }
        }
        onIssueUpdated(updated);
        setSelectedIssue(updated);
        setMessage({
          type: 'success',
          text: markComplete ? 'Task submitted for officer verification! ✅' : 'Progress note recorded! 🛠️'
        });
        setProgressNote('');
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to update task status.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white h-16 px-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-black shadow-md">
            <Wrench size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">CivicLens</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                FIELD WORKER PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-400">Maintenance Crew Task Execution &amp; Evidence Submission</p>
          </div>
        </div>

        {/* Worker Selector & Switch buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <User size={14} className="text-amber-400" />
            <select
              value={selectedWorker.id}
              onChange={(e) => {
                const w = WORKERS.find((x) => x.id === e.target.value);
                if (w) setSelectedWorker(w);
              }}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer"
            >
              {WORKERS.map((w) => (
                <option key={w.id} value={w.id} className="bg-slate-800 text-white">
                  {w.name} ({w.department})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onSwitchToDashboard}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck size={14} className="text-blue-400" />
            <span>Officer Dashboard</span>
          </button>

          <button
            onClick={onSwitchToCitizen}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Citizen Portal</span>
          </button>
        </div>
      </header>

      {/* Main Content: Split Task List & Task Execution Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Left Column: Assigned Tasks List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 px-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Assigned Work Queue</h2>
              <p className="text-xs text-gray-500">
                {assignedTasks.length} {assignedTasks.length === 1 ? 'task' : 'tasks'} for {selectedWorker.name}
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
              Active Crew
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {assignedTasks.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-gray-700">No Pending Field Tasks</p>
                <p className="text-xs text-gray-400 mt-1">All issues assigned to your team have been completed.</p>
              </div>
            ) : (
              assignedTasks.map((task) => {
                const isSelected = activeTask?._id === task._id;
                return (
                  <div
                    key={task._id}
                    onClick={() => {
                      setSelectedIssue(task);
                      setMessage(null);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 shadow-xs ring-1 ring-blue-400/30'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-blue-900">
                        {task.ticketCode || `ISS-${task._id.slice(-6).toUpperCase()}`}
                      </span>
                      <StatusBadge status={task.status} />
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{task.title}</h3>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-gray-400" />
                        <span className="truncate max-w-[150px]">{task.location}</span>
                      </span>
                      <CategoryBadge category={task.category} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Task Workspace & Evidence Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {activeTask ? (
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Task Header */}
              <div className="p-6 border-b border-gray-100 bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-md">
                    {activeTask.ticketCode || `ISS-${activeTask._id.slice(-6).toUpperCase()}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={activeTask.status} />
                    <CategoryBadge category={activeTask.category} />
                  </div>
                </div>

                <h2 className="text-lg font-bold text-gray-900">{activeTask.title}</h2>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-gray-400" />
                  <span>{activeTask.location}</span>
                </p>

                {/* Internal instructions / deadline */}
                <div className="mt-4 p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1">
                  <p className="font-semibold text-gray-700">Officer Instructions &amp; Assignment:</p>
                  <p className="text-gray-600">
                    {activeTask.internalInstructions || 'Standard dispatch: inspect site, verify safety, and execute required maintenance.'}
                  </p>
                  {activeTask.deadline && (
                    <p className="text-amber-700 font-semibold pt-1 flex items-center gap-1">
                      <Calendar size={12} /> Target Deadline: {new Date(activeTask.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Task Details & Description */}
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Citizen Observation
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed p-3.5 bg-slate-50 rounded-xl border border-gray-200">
                    {activeTask.description}
                  </p>
                </div>

                {/* Evidence Photos Upload / Execution Form */}
                <div className="p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/30 rounded-2xl border border-amber-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench size={14} className="text-amber-600" />
                      <span>Field Work Progress &amp; Evidence</span>
                    </h3>
                    <span className="text-[11px] text-amber-800 font-semibold">
                      Acting as: {selectedWorker.name}
                    </span>
                  </div>

                  {message && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        message.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span>{message.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Progress Notes / Repair Actions Taken:
                    </label>
                    <textarea
                      rows={3}
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                      placeholder="e.g. Cleared debris, laid asphalt patch, and sealed edges. Area reopened to traffic."
                      className="w-full p-3 bg-white text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleTaskAction(false)}
                      className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Clock size={13} className="text-blue-600" />
                      <span>Record Progress (In Progress)</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleTaskAction(true)}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      <span>Submit for Verification (Mark Done)</span>
                    </button>
                  </div>
                </div>

                {/* Audit History */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Clock size={13} /> Activity History
                  </h3>
                  <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-1">
                    {(activeTask.statusHistory || []).map((h, i) => (
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
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
              <Wrench size={36} className="text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-600">No Issue Selected</p>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                Select a task from the assigned work queue to view officer instructions and submit field evidence.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
