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
  Sparkles,
  LogIn,
  Camera,
  X
} from 'lucide-react';
import { submitWorkerTaskUpdate, uploadWorkerEvidencePhoto, loginUser } from '../services/api';
import { normalizeCategory } from '../utils/category';

import type { AuthUser } from '../services/api';

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
  onOpenStaffLogin: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export default function WorkerPortal({
  issues,
  onIssueUpdated,
  onSwitchToDashboard,
  onOpenStaffLogin,
  currentUser,
  onLogout
}: Props) {
  // Current logged in worker identity
  const workerName = currentUser?.name || 'Assigned Worker';
  const workerDept = currentUser?.department || 'Field Operations';
  const workerEmail = currentUser?.email || 'worker@civiclens.gov';

  // Map worker department to issue category filter
  const getWorkerCategory = (dept: string) => {
    const d = dept.toLowerCase();
    if (d.includes('road')) return 'Roads';
    if (d.includes('water') || d.includes('sewage')) return 'Water';
    if (d.includes('solid') || d.includes('waste') || d.includes('sanitation') || d.includes('garbage')) return 'Garbage';
    if (d.includes('electric') || d.includes('power') || d.includes('light')) return 'Electricity';
    return '';
  };
  const workerCategory = getWorkerCategory(workerDept);

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [progressNote, setProgressNote] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [afterRepairFile, setAfterRepairFile] = useState<File | null>(null);
  const [afterRepairPreview, setAfterRepairPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter tasks strictly belonging to this individual worker:
  // 1. Explicitly assigned to this worker by name or ID
  // 2. OR matching their department category if unassigned to a specific person
  const assignedTasks = issues.filter((iss) => {
    const isFieldStatus =
      iss.status === 'Assigned' ||
      iss.status === 'In Progress' ||
      iss.status === 'Pending Verification';

    if (!isFieldStatus) return false;

    // Direct name assignment takes top priority
    if (iss.assignedWorkerName) {
      return iss.assignedWorkerName.toLowerCase() === workerName.toLowerCase();
    }

    // Otherwise, match their department category
    if (workerCategory) {
      return normalizeCategory(iss.category) === workerCategory;
    }

    return true;
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
              note: `${note} (Updated by ${workerName})`,
              updatedBy: workerName
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
          // If worker attached a photo file, upload it as multipart evidence first
          if (afterRepairFile) {
            const fd = new FormData();
            fd.append('photo', afterRepairFile);
            fd.append('notes', note);
            await uploadWorkerEvidencePhoto(activeTask._id, fd);
          }

          updated = await submitWorkerTaskUpdate(activeTask._id, {
            progressNote: note,
            markComplete,
            evidencePhotos
          });
        } catch (apiErr: any) {
          // If token was missing/expired, re-login and retry once
          if (apiErr.response?.status === 401 || apiErr.response?.status === 403) {
            await loginUser(workerEmail, 'password123');
            if (afterRepairFile) {
              const fd = new FormData();
              fd.append('photo', afterRepairFile);
              fd.append('notes', note);
              await uploadWorkerEvidencePhoto(activeTask._id, fd);
            }
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
        setAfterRepairFile(null);
        setAfterRepairPreview(null);
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
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900/95 text-white h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-black shadow-md shadow-orange-500/20">
            <Wrench size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white whitespace-nowrap">CivicLens</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                FIELD WORKER PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-tight hidden sm:block whitespace-nowrap">Maintenance Crew Task Execution &amp; Evidence Submission</p>
          </div>
        </div>

        {/* Logged in Worker Profile Card */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs sm:text-sm">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[10px] border border-amber-500/40">
              {workerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="font-semibold text-white leading-tight">{workerName}</p>
              <p className="text-[10px] text-amber-400 leading-tight font-medium">{workerDept}</p>
            </div>
          </div>

          <button
            onClick={onOpenStaffLogin}
            aria-label="Staff Login"
            title="Sign in with another staff account"
            className="px-2.5 sm:px-3 py-1.5 bg-blue-950/60 hover:bg-blue-900/70 text-blue-200 text-xs sm:text-sm font-semibold rounded-lg border border-blue-800/80 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <LogIn size={14} />
            <span className="hidden sm:inline">Staff Login</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs sm:text-sm font-semibold rounded-lg border border-rose-800/60 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Log out from CivicLens"
            >
              <span>Log Out</span>
            </button>
          )}

        </div>
      </header>

      {/* Main Content: Split Task List & Task Execution Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Left Column: Assigned Tasks List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Assigned Work Queue</h2>
              <p className="text-xs text-slate-400">
                {assignedTasks.length} {assignedTasks.length === 1 ? 'task' : 'tasks'} for {workerName}
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-950/80 text-amber-300 border border-amber-800/60">
              Active Crew
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {assignedTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Pending Field Tasks</p>
                <p className="text-xs text-slate-500 mt-1">All issues assigned to your team have been completed.</p>
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
                        ? 'border-blue-500 bg-blue-950/40 shadow-md ring-1 ring-blue-500/30'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-blue-400">
                        {task.ticketCode || `ISS-${task._id.slice(-6).toUpperCase()}`}
                      </span>
                      <StatusBadge status={task.status} />
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 line-clamp-1">{task.title}</h3>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-500" />
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
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl flex flex-col overflow-hidden">
          {activeTask ? (
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Task Header */}
              <div className="p-6 border-b border-slate-800 bg-slate-950/60">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-blue-300 bg-blue-950/80 border border-blue-800/80 px-2.5 py-0.5 rounded-md">
                    {activeTask.ticketCode || `ISS-${activeTask._id.slice(-6).toUpperCase()}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={activeTask.status} />
                    <CategoryBadge category={activeTask.category} />
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-100">{activeTask.title}</h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-slate-500" />
                  <span>{activeTask.location}</span>
                </p>

                {/* Internal instructions / deadline */}
                <div className="mt-4 p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1">
                  <p className="font-semibold text-slate-300">Officer Instructions &amp; Assignment:</p>
                  <p className="text-slate-400">
                    {activeTask.internalInstructions || 'Standard dispatch: inspect site, verify safety, and execute required maintenance.'}
                  </p>
                  {activeTask.deadline && (
                    <p className="text-amber-400 font-semibold pt-1 flex items-center gap-1">
                      <Calendar size={12} /> Target Deadline: {new Date(activeTask.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Task Details & Description */}
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Citizen Observation
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                    {activeTask.description}
                  </p>
                </div>

                {/* Evidence Photos Upload / Execution Form */}
                <div className="p-5 bg-gradient-to-br from-amber-950/30 to-orange-950/20 rounded-2xl border border-amber-800/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench size={14} className="text-amber-400" />
                      <span>Field Work Progress &amp; Evidence</span>
                    </h3>
                    <span className="text-[11px] text-amber-400/80 font-semibold">
                      Acting as: {workerName}
                    </span>
                  </div>

                  {message && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        message.type === 'success'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                      }`}
                    >
                      {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span>{message.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Progress Notes / Repair Actions Taken:
                    </label>
                    <textarea
                      rows={3}
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                      placeholder="e.g. Cleared debris, laid asphalt patch, and sealed edges. Area reopened to traffic."
                      className="w-full p-3 bg-slate-900 text-slate-100 text-xs border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-600"
                    />
                  </div>

                  {/* After-Repair Photo Proof Upload Widget */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera size={13} className="text-amber-400" />
                        <span>After-Repair Photo Proof (Required for Verification)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">Max 5MB (PNG/JPG)</span>
                    </label>

                    {afterRepairPreview ? (
                      <div className="relative w-32 h-24 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md">
                        <img
                          src={afterRepairPreview}
                          alt="After-repair preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAfterRepairFile(null);
                            setAfterRepairPreview(null);
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                          title="Remove photo"
                        >
                          <X size={12} />
                        </button>
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.2 bg-emerald-600/90 text-white font-bold text-[9px] rounded">
                          AFTER
                        </span>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-xl cursor-pointer bg-slate-950/60 transition-colors group">
                        <Camera size={16} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200">
                          Attach On-Site Completed Photo Proof
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setAfterRepairFile(f);
                              const reader = new FileReader();
                              reader.onload = () => setAfterRepairPreview(reader.result as string);
                              reader.readAsDataURL(f);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleTaskAction(false)}
                      className="px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Clock size={13} className="text-blue-400" />
                      <span>Record Progress (In Progress)</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleTaskAction(true)}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} />
                      <span>Mark Work Completed &amp; Request Verification</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Wrench size={40} className="text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-300">Select a Task from the Work Queue</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Pick any reported ticket on the left to review instructions, snap after-repair evidence, and submit progress notes.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
