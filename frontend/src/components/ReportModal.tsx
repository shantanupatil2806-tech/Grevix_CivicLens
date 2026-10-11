// frontend/src/components/ReportModal.tsx
import { useState, useRef, useEffect } from "react";
import type { Category, Issue, AnalysisResult } from "../types";
import { createIssue, analyzeIssuePreview } from "../services/api";
import { runFullClientAnalysis, getSeverityColor } from "../services/analysis";
import { geocodeAddress, type GeocodeResult } from "../services/geocoding";
import { saveOfflineReport } from "../services/offlineDb";
import { connectivity } from "../services/connectivity";
import type { OfflineReport } from "../types";
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Upload,
  X,
  MapPin,
  FileText,
  Calendar,
  Check,
  ShieldAlert,
  ArrowRight,
  Crosshair,
  AlertCircle,
} from "lucide-react";

const CATEGORIES: Category[] = [
  "Roads",
  "Garbage",
  "Water",
  "Electricity",
  "Other",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingIssues: Issue[];
  onCreated: (issue: Issue) => void;
  initialCoords?: { lat: number; lng: number } | null;
}

export default function ReportModal({
  isOpen,
  onClose,
  existingIssues,
  onCreated,
  initialCoords,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [location, setLocation] = useState("");
  const [observedAt, setObservedAt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Geographic coordinates management
  const [resolvedCoords, setResolvedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isMapSelected, setIsMapSelected] = useState(false);
  const [resolvedAddressName, setResolvedAddressName] = useState<string | null>(
    null,
  );
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<"submitted" | "offline" | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);

  // Set coordinates if opened from map click
  useEffect(() => {
    if (initialCoords && initialCoords.lat && initialCoords.lng) {
      setResolvedCoords(initialCoords);
      setIsMapSelected(true);
      setLocation(
        `Pinned Location (${initialCoords.lat.toFixed(5)}, ${initialCoords.lng.toFixed(5)})`,
      );
      setResolvedAddressName(
        `Map Selected: ${initialCoords.lat.toFixed(5)}, ${initialCoords.lng.toFixed(5)}`,
      );
    } else {
      setResolvedCoords(null);
      setIsMapSelected(false);
      setResolvedAddressName(null);
    }
  }, [initialCoords]);

  // If user modifies location manually, clear map selection and geocode address/pincode
  useEffect(() => {
    if (isMapSelected) return; // User explicitly picked point on map

    const query = location.trim();
    if (query.length < 3) {
      setResolvedCoords(null);
      setResolvedAddressName(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsGeocoding(true);
      const res = await geocodeAddress(query);
      if (res) {
        setResolvedCoords({ lat: res.lat, lng: res.lng });
        setResolvedAddressName(res.displayName);
        // Clear location field error if any
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.location;
          return next;
        });
      } else {
        setResolvedCoords(null);
        setResolvedAddressName(null);
      }
      setIsGeocoding(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [location, isMapSelected]);

  // Debounced live analysis
  useEffect(() => {
    if (!title.trim() && !description.trim()) {
      setAnalysis(null);
      return;
    }

    setIsAnalyzing(true);
    const timer = setTimeout(async () => {
      try {
        const serverResult = await analyzeIssuePreview({
          title,
          description,
          category,
          location,
        });
        setAnalysis(serverResult);
      } catch {
        const clientResult = runFullClientAnalysis(
          title,
          description,
          category,
          location,
          existingIssues,
        );
        setAnalysis(clientResult);
      } finally {
        setIsAnalyzing(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [title, description, category, location, existingIssues]);

  if (!isOpen) return null;

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

  async function validateAndResolveLocation(): Promise<{
    lat: number;
    lng: number;
  } | null> {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Issue title is required.";
    if (!description.trim())
      errs.description = "Detailed description is required.";
    if (!location.trim())
      errs.location = "Specific location or pincode is required.";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return null;
    }

    // If user clicked on map, preserve those exact coordinates
    if (resolvedCoords && isMapSelected) {
      setFieldErrors({});
      return resolvedCoords;
    }

    // If already geocoded from address/pincode
    if (resolvedCoords) {
      setFieldErrors({});
      return resolvedCoords;
    }

    // Try immediate geocoding if user hit submit quickly and is online
    if (connectivity.isOnline()) {
      setIsGeocoding(true);
      const geo = await geocodeAddress(location.trim());
      setIsGeocoding(false);

      if (geo) {
        setResolvedCoords({ lat: geo.lat, lng: geo.lng });
        setResolvedAddressName(geo.displayName);
        setFieldErrors({});
        return { lat: geo.lat, lng: geo.lng };
      }
    }

    // Offline or geocoding unavailable: do not block offline submission!
    // Preserve manual text address without fabricating arbitrary coordinates.
    setFieldErrors({});
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Basic required field validation
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Issue title is required.";
    if (!description.trim()) errs.description = "Detailed description is required.";
    if (!location.trim()) errs.location = "Specific location, area, or pincode is required.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    const finalCoords = await validateAndResolveLocation();

    setSubmitting(true);
    const resolvedCategory = (category ||
      analysis?.category ||
      "Other") as Category;
    const ticketId = `ANO-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`;
    const clientUuid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `cid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const locationType: "map-pinned" | "manual" | "geocoded" = isMapSelected
      ? "map-pinned"
      : resolvedAddressName
        ? "geocoded"
        : "manual";

    const baseOfflineRecord: OfflineReport = {
      clientId: clientUuid,
      title: title.trim(),
      description: description.trim(),
      category: resolvedCategory,
      location: location.trim(),
      coordinates: finalCoords,
      locationType,
      photoBlob: imageFile || null,
      photoName: imageFile ? imageFile.name : null,
      photoPreview: imagePreview || null,
      createdAt: observedAt
        ? new Date(observedAt).toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "Pending Sync",
      retryCount: 0,
      ticketCode: ticketId,
    };

    // If offline, save to IndexedDB directly (unsynced local storage)
    if (!connectivity.isOnline()) {
      try {
        baseOfflineRecord.syncStatus = "Saved Offline";
        await saveOfflineReport(baseOfflineRecord);

        // Do NOT inject local unconfirmed issue into officer dashboard state.
        // The officer dashboard reflects MongoDB/backend server reality.
        // The unsynced report stays in IndexedDB until sync succeeds.
        setSuccess("offline");
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 900);
        return;
      } catch (err: any) {
        setError("Failed to save offline: " + err.message);
        setSubmitting(false);
        return;
      }
    }

    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("category", resolvedCategory);
      fd.append("location", location.trim());
      fd.append("ticketCode", ticketId);
      fd.append("clientId", clientUuid);
      fd.append("clientCreatedAt", baseOfflineRecord.createdAt);
      if (finalCoords) {
        fd.append("latitude", String(finalCoords.lat));
        fd.append("longitude", String(finalCoords.lng));
      }
      if (observedAt) fd.append("observedAt", observedAt);
      if (imageFile) fd.append("photo", imageFile);

      const result = await createIssue(fd);
      const enrichedIssue: Issue = {
        ...result.issue,
        coordinates: finalCoords || undefined,
        ticketCode: result.issue.ticketCode || ticketId,
      };

      // Successful online submission — do not buffer into offline queue

      onCreated(enrichedIssue);
      setSuccess("submitted");
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 900);
    } catch (apiErr: any) {
      const status = apiErr.response?.status;
      const isValidationError =
        status >= 400 && status < 500 && status !== 408 && status !== 429;

      if (isValidationError) {
        setError(
          apiErr.response?.data?.error ||
            "Validation error: Please check fields.",
        );
        setSubmitting(false);
        return;
      }

      // Connectivity or server error: Fallback to persistent IndexedDB buffer
      try {
        baseOfflineRecord.syncStatus = "Pending Sync";
        baseOfflineRecord.lastSyncError =
          apiErr.response?.data?.error || apiErr.message || "Network timeout";
        await saveOfflineReport(baseOfflineRecord);

        setSuccess("offline");
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 900);
      } catch (err: any) {
        setError("Error saving report: " + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto my-auto border border-slate-800 animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-100 leading-snug">
              Report New Civic Issue
            </h2>
            <p className="text-xs text-slate-400">
              Pinpoint problem on community map with real-time AI triage
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal 2-Column Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: Input Form (7 cols) */}
          <form onSubmit={handleSubmit} className="md:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Issue Title <span className="text-red-400">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep pothole on MG Road near Domino's"
                className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-950 text-slate-100 placeholder:text-slate-600 ${
                  fieldErrors.title ? "border-red-500" : "border-slate-700"
                }`}
              />
              {fieldErrors.title && (
                <p className="text-[11px] text-red-400 mt-0.5">
                  {fieldErrors.title}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the issue, road damage, risks, obstruction..."
                className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-slate-950 text-slate-100 placeholder:text-slate-600 ${
                  fieldErrors.description ? "border-red-500" : "border-slate-700"
                }`}
              />
              {fieldErrors.description && (
                <p className="text-[11px] text-red-400 mt-0.5">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category | "")}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="" className="bg-slate-900">
                    {analysis?.category
                      ? `AI Suggests: ${analysis.category}`
                      : "Choose Category..."}
                  </option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Location / Pincode / Area{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  {isGeocoding && (
                    <span className="text-[10px] text-blue-400 flex items-center gap-1 font-medium">
                      <Loader2 size={10} className="animate-spin" />{" "}
                      Geocoding...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <MapPin
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    value={location}
                    onChange={(e) => {
                      setIsMapSelected(false);
                      setLocation(e.target.value);
                    }}
                    placeholder="e.g. 411038 Pune or Kothrud, Pune"
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-950 text-slate-100 placeholder:text-slate-600 ${
                      fieldErrors.location
                        ? "border-red-500 bg-red-950/20"
                        : "border-slate-700"
                    }`}
                  />
                </div>
                {/* Visual feedback for coordinates */}
                {resolvedCoords && (
                  <p className="text-[10px] text-emerald-300 bg-emerald-950/50 border border-emerald-800 rounded px-2 py-0.5 mt-1 flex items-center gap-1">
                    <Crosshair
                      size={11}
                      className="text-emerald-400 shrink-0"
                    />
                    <span className="font-mono">
                      Coordinates: [{resolvedCoords.lat.toFixed(5)},{" "}
                      {resolvedCoords.lng.toFixed(5)}]
                    </span>
                    {resolvedAddressName && (
                      <span className="truncate max-w-[140px] text-emerald-300">
                        ({resolvedAddressName})
                      </span>
                    )}
                  </p>
                )}
                {fieldErrors.location && (
                  <p className="text-[11px] text-red-400 mt-1 leading-snug flex items-start gap-1">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    <span>{fieldErrors.location}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Observation Date
                </label>
                <input
                  type="date"
                  value={observedAt}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setObservedAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-950 text-slate-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Photo Evidence
                </label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-700 rounded-lg text-xs text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Upload size={13} />
                  <span>{imageFile ? "Change Photo" : "Upload Photo"}</span>
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

            {imagePreview && (
              <div className="relative inline-block mt-2">
                <img
                  src={imagePreview}
                  className="w-28 h-20 object-cover rounded-lg border border-slate-700 shadow-2xs"
                  alt="Preview"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute -top-1.5 -right-1.5 bg-slate-800 text-slate-400 hover:text-red-400 rounded-full border border-slate-700 p-0.5 shadow cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {success && (
              <div
                className={`flex items-center gap-2 p-2.5 text-xs rounded-lg border ${success === "offline" ? "bg-amber-950/60 text-amber-300 border-amber-800" : "bg-emerald-950/60 text-emerald-300 border-emerald-800"}`}
              >
                <CheckCircle2 size={15} />
                <span>
                  {success === "offline"
                    ? "Saved locally; pending sync. Not yet on the officer issue map."
                    : "Ticket registered and placed on community map!"}
                </span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Placing on Map...</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Drop Map Pin</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right: AI Intelligence Panel (5 cols) */}
          <div className="md:col-span-5 bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={16} className="text-blue-400" />
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">
                    Live AI Triage
                  </span>
                </div>
                {isAnalyzing && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400 font-medium">
                    <Loader2 size={11} className="animate-spin" /> Analyzing
                  </span>
                )}
              </div>

              {!analysis ? (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <FileText
                    size={26}
                    className="mx-auto opacity-30 text-blue-400"
                  />
                  <p className="text-xs font-medium text-slate-300">
                    Type details to preview AI scoring
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Live detection will automatically estimate category,
                    severity score, and duplicate reports.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 pt-3">
                  {/* Category */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Predicted Category
                    </span>
                    <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 mt-1">
                      <span className="text-xs font-bold text-slate-200">
                        {analysis.category}
                      </span>
                      <span className="text-[10px] font-bold text-teal-400 bg-teal-950/60 border border-teal-850 px-1.5 py-0.2 rounded">
                        {analysis.confidence}% Confidence
                      </span>
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Priority Score
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full border ${getSeverityColor(
                          analysis.severityScore,
                        )}`}
                      >
                        {analysis.severityLabel} ({analysis.severityScore}/100)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${analysis.severityScore}%` }}
                      />
                    </div>
                    {analysis.severityFactors &&
                      analysis.severityFactors.length > 0 && (
                        <div className="mt-2 space-y-1 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          {analysis.severityFactors.slice(0, 3).map((f, i) => (
                            <p key={i} className="text-[10px] text-slate-400">
                              • {f}
                            </p>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Duplicate warning */}
                  {analysis.duplicate && (
                    <div className="p-2.5 bg-amber-950/60 rounded-lg border border-amber-800 text-xs text-amber-200 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-amber-400 text-[11px]">
                        <ShieldAlert size={13} />
                        <span>
                          Potential Duplicate ({analysis.duplicate.similarity}%)
                        </span>
                      </div>
                      <p className="text-[11px] truncate text-amber-300">
                        "{analysis.duplicate.title}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 italic text-center">
              Rule-based civic algorithms. Modular and LLM-API upgrade ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
