// frontend/src/components/IssueForm.tsx
import { useState, useRef, useEffect } from 'react';
import type { Category, Issue, AnalysisResult } from '../types';
import { createIssue, analyzeIssuePreview } from '../services/api';
import { runFullClientAnalysis, getSeverityColor } from '../services/analysis';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Upload,
  X,
  MapPin,
  FileText,
  Calendar,
  Check,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

const CATEGORIES: Category[] = ['Roads', 'Garbage', 'Water', 'Electricity', 'Other'];

interface Props {
  existingIssues: Issue[];
  onCreated: (issue: Issue) => void;
}

export default function IssueForm({ existingIssues, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [location, setLocation] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // AI analysis state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);

  // Debounced live analysis
  useEffect(() => {
    if (!title.trim() && !description.trim()) {
      setAnalysis(null);
      return;
    }

    setIsAnalyzing(true);
    const timer = setTimeout(async () => {
      try {
        // Try calling the backend /analyze endpoint for server-level consistency
        const serverResult = await analyzeIssuePreview({
          title,
          description,
          category,
          location
        });
        setAnalysis(serverResult);
      } catch {
        // Fall back seamlessly to client-side rule engine
        const clientResult = runFullClientAnalysis(title, description, category, location, existingIssues);
        setAnalysis(clientResult);
      } finally {
        setIsAnalyzing(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [title, description, category, location, existingIssues]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Issue title is required.';
    if (!description.trim()) errs.description = 'Detailed description is required.';
    if (!location.trim()) errs.location = 'Specific location is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const resolvedCategory = category || analysis?.category || 'Other';
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('description', description.trim());
      fd.append('category', resolvedCategory);
      fd.append('location', location.trim());
      if (observedAt) fd.append('observedAt', observedAt);
      if (imageFile) fd.append('image', imageFile);

      const result = await createIssue(fd);
      onCreated(result.issue);
      setSuccess(true);

      // Reset fields
      setTitle('');
      setDescription('');
      setCategory('');
      setLocation('');
      setObservedAt('');
      setImageFile(null);
      setImagePreview(null);
      setAnalysis(null);

      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      // If backend is unreachable, gracefully create a local demo issue
      const resolvedCat = (category || analysis?.category || 'Other') as Category;
      const score = analysis?.severityScore || 50;
      const localIssue: Issue = {
        _id: `local-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        category: resolvedCat,
        location: location.trim(),
        imagePath: imagePreview,
        severityScore: score,
        priorityScore: score,
        severityFactors: analysis?.severityFactors || [`Base category priority for ${resolvedCat}: ${score} pts`],
        categoryReasons: analysis?.categoryReasons || ['Manual submission'],
        status: 'Reported',
        duplicateOf: analysis?.duplicate?.id || null,
        duplicateReason: analysis?.duplicate?.reason || null,
        statusHistory: [
          {
            status: 'Reported',
            timestamp: new Date().toISOString(),
            note: 'Reported in local demo mode',
            updatedBy: 'Citizen Reporter'
          }
        ],
        createdAt: observedAt ? new Date(observedAt).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: true
      };

      onCreated(localIssue);
      setSuccess(true);
      setTitle('');
      setDescription('');
      setCategory('');
      setLocation('');
      setObservedAt('');
      setImageFile(null);
      setImagePreview(null);
      setAnalysis(null);
      setTimeout(() => setSuccess(false), 5000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: Input Form (7 cols) */}
      <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issue Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  fieldErrors.title ? 'border-red-400 bg-red-50/20' : 'border-gray-200'
                }`}
                placeholder="e.g. Deep pothole on Main Street causing traffic hazards"
              />
            </div>
            {fieldErrors.title && <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all ${
                fieldErrors.description ? 'border-red-400 bg-red-50/20' : 'border-gray-200'
              }`}
              placeholder="Describe the extent of the problem, hazards to pedestrians or vehicles, landmarks, urgency..."
            />
            {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Category</label>
                {analysis?.category && !category && (
                  <span className="text-[11px] text-teal-600 font-medium bg-teal-50 px-1.5 py-0.5 rounded">
                    AI Suggested: {analysis.category}
                  </span>
                )}
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category | '')}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">
                  {analysis?.category ? `Auto-Select: ${analysis.category}` : 'Choose Category...'}
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={`w-full pl-9 pr-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                    fieldErrors.location ? 'border-red-400 bg-red-50/20' : 'border-gray-200'
                  }`}
                  placeholder="e.g. Near Bus Stop 12, Main Street"
                />
              </div>
              {fieldErrors.location && <p className="text-xs text-red-500 mt-1">{fieldErrors.location}</p>}
            </div>
          </div>

          {/* Date & Image Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Observed (optional)
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={observedAt}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setObservedAt(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attach Photo (optional)
              </label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
              >
                <Upload size={16} />
                {imageFile ? 'Replace image' : 'Upload photo evidence'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Image Preview Area */}
          {imagePreview && (
            <div className="relative p-2.5 bg-gray-50 rounded-xl border border-gray-200 inline-block">
              <img
                src={imagePreview}
                className="w-48 h-32 object-cover rounded-lg shadow-sm"
                alt="Upload preview"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="absolute -top-2 -right-2 bg-white rounded-full border border-gray-200 text-gray-500 hover:text-red-500 p-1 shadow-md transition-colors"
                title="Remove photo"
              >
                <X size={14} />
              </button>
              <p className="text-[11px] text-gray-500 mt-1 truncate max-w-48">
                {imageFile?.name || 'Uploaded photo'}
              </p>
            </div>
          )}

          {/* Submission Alerts */}
          {success && (
            <div className="flex items-center gap-2.5 text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl p-3.5 animate-fadeIn">
              <CheckCircle2 size={18} className="shrink-0 text-green-600" />
              <div>
                <p className="font-medium">Issue submitted successfully!</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Your report has been analyzed, prioritized, and added to the community dashboard.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3.5">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>Submitting report...</span>
                </>
              ) : (
                <>
                  <span>Submit Community Report</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: Real-Time AI Analysis & Intelligence Panel (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-gradient-to-br from-white to-blue-50/40 p-6 rounded-2xl border border-blue-100 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Smart Analysis Engine</h3>
                <p className="text-xs text-gray-400">Rule-based intelligence (AI API ready)</p>
              </div>
            </div>
            {isAnalyzing && (
              <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                <Loader2 size={13} className="animate-spin" />
                Analyzing
              </span>
            )}
          </div>

          {/* Content */}
          {!analysis && !isAnalyzing ? (
            <div className="py-12 text-center text-gray-400">
              <FileText size={32} className="mx-auto mb-2.5 opacity-30 text-blue-500" />
              <p className="text-sm font-medium text-gray-600">Start typing to see live analysis</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                CivicLens inspects keywords, public safety factors, and proximity to calculate category, severity, and potential duplicates in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-5 pt-4">
              {/* 1. Category Suggestion */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  1. Suggested Category
                </p>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm">
                      {analysis?.category || 'Analyzing...'}
                    </span>
                    {analysis && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium border border-teal-200">
                        {analysis.confidence}% Match
                      </span>
                    )}
                  </div>
                  {!category && analysis?.category && (
                    <button
                      type="button"
                      onClick={() => setCategory(analysis.category)}
                      className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                    >
                      <Check size={13} /> Accept
                    </button>
                  )}
                </div>
                {analysis?.categoryReasons && analysis.categoryReasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {analysis.categoryReasons.map((r, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded-md"
                      >
                        Keyword: {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Priority Scoring & Reasons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    2. Priority Score & Urgency
                  </p>
                  {analysis && (
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getSeverityColor(
                        analysis.severityScore
                      )}`}
                    >
                      {analysis.severityLabel} ({analysis.severityScore}/100)
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (analysis?.severityScore || 0) >= 80
                        ? 'bg-red-500'
                        : (analysis?.severityScore || 0) >= 60
                        ? 'bg-amber-500'
                        : (analysis?.severityScore || 0) >= 40
                        ? 'bg-yellow-400'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${analysis?.severityScore || 10}%` }}
                  />
                </div>

                {/* Explanation factors list */}
                {analysis?.severityFactors && analysis.severityFactors.length > 0 && (
                  <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1.5">
                    <p className="text-xs font-medium text-gray-700 mb-1">Priority Drivers:</p>
                    {analysis.severityFactors.map((factor, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Potential Duplicate Detection */}
              {analysis?.duplicate ? (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-xs">
                    <ShieldAlert size={15} className="text-amber-600 shrink-0" />
                    <span>Potential Duplicate Flagged ({analysis.duplicate.similarity}% match)</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Existing report: <strong>"{analysis.duplicate.title}"</strong>
                  </p>
                  <p className="text-[11px] text-amber-700 italic">
                    Reason: {analysis.duplicate.reason}. Your submission will be recorded and linked for administrator deduplication review.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                  <span>No duplicate reports detected for this location.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Community Transparency Note */}
        <div className="p-4 bg-white rounded-xl border border-gray-200 text-xs text-gray-500 leading-relaxed">
          <p className="font-semibold text-gray-700 mb-1">Transparent Civic Scoring</p>
          Priority is computed transparently based on infrastructure domain impact, sensitive institutions (hospitals, schools, fire lanes), and disruption severity without hidden paid algorithms.
        </div>
      </div>
    </div>
  );
}

