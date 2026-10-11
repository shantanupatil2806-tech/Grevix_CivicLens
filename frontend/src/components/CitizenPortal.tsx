import { useState, useRef, useEffect } from "react";
import type { Issue, Category, AnalysisResult, OfflineReport } from "../types";
import { StatusBadge, CategoryBadge } from "./Badges";
import {
  createIssue,
  analyzeIssuePreview,
  fetchIssueById,
  fetchIssues,
  toggleIssueUpvote,
  verifyCitizenFeedback,
} from "../services/api";
import { geocodeAddress } from "../services/geocoding";
import { runFullClientAnalysis } from "../services/analysis";
import { saveOfflineReport } from "../services/offlineDb";
import { connectivity } from "../services/connectivity";
import { syncEngine } from "../services/syncEngine";
import { getCitizenId, subscribeCitizen } from "../services/citizenSession";
import { sampleIssues } from "../data/sampleIssues";
import OfflineReportQueue from "./OfflineReportQueue";
import ConnectivityIndicator from "./ConnectivityIndicator";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  ShieldAlert,
  Shield,
  Search,
  PlusCircle,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Upload,
  X,
  AlertTriangle,
  Check,
  Building2,
  Lock,
  Layers,
  WifiOff,
  Users,
  ThumbsUp,
  RefreshCw,
  Camera,
} from "lucide-react";

interface Props {
  onSwitchToDashboard: () => void;
  onSwitchToWorker?: () => void;
  onOpenStaffLogin?: () => void;
  onIssueCreated: (issue: Issue) => void;
  existingIssues: Issue[];
}

type CitizenTab = "home" | "report" | "track" | "queue" | "community";
const DEMO_UPVOTES_KEY = "civiclens_demo_upvotes";

function getDemoUpvotes(citizenId: string): Set<string> {
  try {
    const saved = localStorage.getItem(`${DEMO_UPVOTES_KEY}:${citizenId}`);
    const ids: unknown = saved ? JSON.parse(saved) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function saveDemoUpvotes(citizenId: string, issueIds: Set<string>) {
  try {
    localStorage.setItem(`${DEMO_UPVOTES_KEY}:${citizenId}`, JSON.stringify([...issueIds]));
  } catch {
    // Keep the vote in component state if browser storage is unavailable.
  }
}

const CATEGORIES: Category[] = [
  "Roads",
  "Garbage",
  "Water",
  "Electricity",
  "Other",
];

function EvidencePhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} unavailable`}
        className={`flex items-center justify-center bg-slate-900 text-xs text-slate-400 ${className.replace("object-cover", "")}`}
      >
        Photo unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

// Pin icon for citizen map picker
function createPickerPin(): L.DivIcon {
  return L.divIcon({
    className: "citizen-picker-pin",
    html: `
      <div style="position: relative; width: 34px; height: 34px; transform: translate(-50%, -50%);">
        <div style="width: 100%; height: 100%; border-radius: 9999px; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function CitizenMapClickHandler({
  onSelect,
}: {
  onSelect: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function CitizenMapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { duration: 1.0 });
  }, [center, map]);
  return null;
}

export default function CitizenPortal({
  onSwitchToDashboard,
  onSwitchToWorker,
  onOpenStaffLogin,
  onIssueCreated,
  existingIssues,
}: Props) {
  const [activeTab, setActiveTab] = useState<CitizenTab>("home");
  const [currentCitizenId, setCurrentCitizenId] = useState(getCitizenId());

  // Subscribe to citizen profile changes (for testing isolation)
  useEffect(() => {
    return subscribeCitizen((newId) => {
      setCurrentCitizenId(newId);
    });
  }, []);

  // Reporting Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [location, setLocation] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterContact, setReporterContact] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Map coordinate selection
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  }>({
    lat: 18.5204,
    lng: 73.8567,
  });
  const [hasMapPin, setHasMapPin] = useState(false);
  const [geocodingMsg, setGeocodingMsg] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  // AI analysis state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Submission & Confirmation State
  const [submitting, setSubmitting] = useState(false);
  const [confirmedIssue, setConfirmedIssue] = useState<Issue | null>(null);
  const [offlineSavedReport, setOfflineSavedReport] =
    useState<OfflineReport | null>(null);
  const [formError, setFormError] = useState("");

  // Tracking Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [trackedIssue, setTrackedIssue] = useState<Issue | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  // Community Feed State (upvote)
  const [communityIssues, setCommunityIssues] = useState<Issue[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);
  const [highlightIssueId, setHighlightIssueId] = useState<string | null>(null);

  // Citizen verify/dispute state (Track Status tab)
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [disputePreview, setDisputePreview] = useState<string | null>(null);
  const disputeFileRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Geocode address when user types location
  useEffect(() => {
    const q = location.trim();
    if (q.length < 3) {
      setGeocodingMsg("");
      return;
    }

    const timer = setTimeout(async () => {
      setIsGeocoding(true);
      const res = await geocodeAddress(q);
      setIsGeocoding(false);
      if (res) {
        setSelectedCoords({ lat: res.lat, lng: res.lng });
        setHasMapPin(true);
        setGeocodingMsg(`Location pinpointed: ${res.displayName}`);
      } else {
        setGeocodingMsg("");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [location]);

  // Live AI Assistance for category & priority
  useEffect(() => {
    if (!title.trim() && !description.trim()) {
      setAnalysis(null);
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    const timer = setTimeout(async () => {
      try {
        const preview = await analyzeIssuePreview({
          title: title.trim(),
          description: description.trim(),
          category: category || undefined,
          location: location.trim() || undefined,
        });
        setAnalysis(preview);
        if (!category && preview.category) {
          setCategory(preview.category);
        }
      } catch {
        const fallback = runFullClientAnalysis(
          title.trim(),
          description.trim(),
          category,
          location.trim(),
          existingIssues,
        );
        setAnalysis(fallback);
        if (!category && fallback.category) {
          setCategory(fallback.category);
        }
      } finally {
        setIsAnalyzing(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [title, description, category, location, existingIssues]);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function handleMapClick(coords: { lat: number; lng: number }) {
    setSelectedCoords(coords);
    setHasMapPin(true);
    if (!location.trim()) {
      setLocation(
        `Pinned Location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
      );
    }
    setGeocodingMsg(
      `Map coordinates selected: [${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}]`,
    );
  }

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!title.trim()) {
      setFormError("Please enter a short descriptive title for the issue.");
      return;
    }
    if (!description.trim()) {
      setFormError(
        "Please provide details describing the condition and urgency.",
      );
      return;
    }
    if (!location.trim()) {
      setFormError(
        "Please provide an address, area, or pincode, or drop a pin on the map.",
      );
      return;
    }

    setSubmitting(true);
    const resolvedCat = (category || analysis?.category || "Other") as Category;
    const ticketId = `ANO-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`;
    const clientUuid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `cid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const coordsToSave = hasMapPin ? selectedCoords : null;
    const locationType: "map-pinned" | "manual" | "geocoded" = hasMapPin
      ? "map-pinned"
      : geocodingMsg
        ? "geocoded"
        : "manual";

    const baseOfflineRecord: OfflineReport = {
      clientId: clientUuid,
      citizenId: currentCitizenId,
      title: title.trim(),
      description: description.trim(),
      category: resolvedCat,
      location: location.trim(),
      coordinates: coordsToSave,
      locationType,
      photoBlob: imageFile || null,
      photoName: imageFile ? imageFile.name : null,
      photoPreview: imagePreview || null,
      reporterName: reporterName.trim() || undefined,
      reporterContact: reporterContact.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "Pending Sync",
      retryCount: 0,
      ticketCode: ticketId,
    };

    // If connectivity check fails immediately, persist to IndexedDB directly
    const isBackendReachable = connectivity.isOnline();
    if (!isBackendReachable) {
      try {
        baseOfflineRecord.syncStatus = "Saved Offline";
        const saved = await saveOfflineReport(baseOfflineRecord);
        setOfflineSavedReport(saved);
        setSubmitting(false);
        return;
      } catch (dbErr: any) {
        setFormError(
          "Failed to save report locally: " +
            (dbErr.message || "IndexedDB error"),
        );
        setSubmitting(false);
        return;
      }
    }

    // Try submitting online with clientId + citizenId
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("category", resolvedCat);
      fd.append("location", location.trim());
      fd.append("ticketCode", ticketId);
      fd.append("clientId", clientUuid);
      fd.append("clientCreatedAt", baseOfflineRecord.createdAt);
      fd.append("citizenId", currentCitizenId);

      if (coordsToSave) {
        fd.append("latitude", String(coordsToSave.lat));
        fd.append("longitude", String(coordsToSave.lng));
      }
      if (reporterName.trim()) fd.append("reporterName", reporterName.trim());
      if (reporterContact.trim())
        fd.append("reporterContact", reporterContact.trim());
      if (imageFile) fd.append("photo", imageFile);

      const res = await createIssue(fd);
      const newIssue: Issue = {
        ...res.issue,
        coordinates: coordsToSave || undefined,
        ticketCode: res.issue.ticketCode || ticketId,
      };

      // Online submission succeeded — ALSO save to IndexedDB with 'Synced' status.
      // This ensures "My Reports" shows ALL reports by this citizen (online + offline).
      try {
        await saveOfflineReport({
          ...baseOfflineRecord,
          citizenId: currentCitizenId,
          syncStatus: "Synced",
          serverIssueId: newIssue._id,
          ticketCode: newIssue.ticketCode || ticketId,
          photoBlob: null, // already uploaded to server
          photoName: null,
        });
      } catch {
        // Non-fatal: issue confirmed online, just won't appear in local My Reports cache
      }

      onIssueCreated(newIssue);
      setConfirmedIssue(newIssue);
    } catch (apiErr: any) {
      const status = apiErr.response?.status;
      const isValidationError =
        status >= 400 && status < 500 && status !== 408 && status !== 429;

      if (isValidationError) {
        // Do not silently treat validation errors as connectivity failures
        const errDetail =
          apiErr.response?.data?.error ||
          "Validation error: Please review submitted fields.";
        setFormError(errDetail);
        setSubmitting(false);
        return;
      }

      // Connectivity or server error: Fallback to persistent IndexedDB buffer
      try {
        baseOfflineRecord.syncStatus = "Pending Sync";
        baseOfflineRecord.lastSyncError =
          apiErr.response?.data?.error || apiErr.message || "Network timeout";
        const saved = await saveOfflineReport(baseOfflineRecord);
        setOfflineSavedReport(saved);
      } catch (dbErr: any) {
        setFormError("Network failed and local save failed: " + dbErr.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetForm() {
    setTitle("");
    setDescription("");
    setCategory("");
    setLocation("");
    setReporterName("");
    setReporterContact("");
    setImageFile(null);
    setImagePreview(null);
    setConfirmedIssue(null);
    setOfflineSavedReport(null);
    setFormError("");
    setAnalysis(null);
    setHasMapPin(false);
  }

  async function handleTrackSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setTrackLoading(true);
    setTrackError("");
    setTrackedIssue(null);

    // 1. Check existing issues loaded in memory first (by ticketCode or _id)
    const localMatch = existingIssues.find(
      (iss) =>
        (iss.ticketCode &&
          iss.ticketCode.toLowerCase() === query.toLowerCase()) ||
        iss._id.toLowerCase() === query.toLowerCase() ||
        iss._id.toLowerCase().endsWith(query.toLowerCase()),
    );

    if (localMatch) {
      setTrackedIssue(localMatch);
      setTrackLoading(false);
      return;
    }

    // 2. Fetch from backend API
    try {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(query);
      if (isObjectId) {
        const found = await fetchIssueById(query);
        setTrackedIssue(found);
      } else {
        const res = await fetchIssues({ search: query });
        if (res.issues && res.issues.length > 0) {
          const exact = res.issues.find(
            (i) =>
              i.ticketCode?.toLowerCase() === query.toLowerCase() ||
              i._id.toLowerCase() === query.toLowerCase(),
          );
          if (exact) {
            setTrackedIssue(exact);
          } else {
            setTrackError(
              `No report found matching ticket ID or tracking code "${query}".`,
            );
          }
        } else {
          setTrackError(
            `No report found matching ticket ID or tracking code "${query}".`,
          );
        }
      }
    } catch {
      setTrackError(
        `Unable to locate report with ticket ID "${query}". Please check the ID and try again.`,
      );
    } finally {
      setTrackLoading(false);
    }
  }

  // Load community issues (public, non-rejected) for the Community tab
  async function handleLoadCommunity() {
    setCommunityLoading(true);
    try {
      const res = await fetchIssues({ publicOnly: true, dashboardOnly: true });
      const demoUpvotes = getDemoUpvotes(currentCitizenId);
      const issues: Issue[] = [
        ...sampleIssues.map((issue) => {
          const hasUpvoted = demoUpvotes.has(issue._id);
          return {
            ...issue,
            upvoteCount: (issue.upvoteCount ?? 0) + Number(hasUpvoted),
            hasUpvoted,
            upvotedByCitizens: hasUpvoted ? [currentCitizenId] : [],
          };
        }),
        ...(res.issues || []).filter(
          (issue: Issue) => issue.dashboardVisible === true && issue.status !== "Rejected",
        ),
      ];
      // Sort by upvote count desc, then priority desc
      issues.sort((a, b) => {
        const upA = a.upvoteCount ?? 0;
        const upB = b.upvoteCount ?? 0;
        if (upB !== upA) return upB - upA;
        return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
      });
      setCommunityIssues(issues);
    } catch {
      setCommunityIssues(sampleIssues);
    } finally {
      setCommunityLoading(false);
    }
  }

  // Toggle upvote on a community issue
  async function handleUpvote(issueId: string) {
    if (upvotingId) return;
    if (issueId.startsWith("demo-")) {
      const demoUpvotes = getDemoUpvotes(currentCitizenId);
      const wasUpvoted = demoUpvotes.has(issueId);
      if (wasUpvoted) demoUpvotes.delete(issueId);
      else demoUpvotes.add(issueId);
      saveDemoUpvotes(currentCitizenId, demoUpvotes);
      setCommunityIssues((previous) =>
        previous.map((issue) =>
          issue._id === issueId
            ? {
                ...issue,
                upvoteCount: Math.max(0, (issue.upvoteCount ?? 0) + (wasUpvoted ? -1 : 1)),
                hasUpvoted: !wasUpvoted,
                upvotedByCitizens: wasUpvoted ? [] : [currentCitizenId],
              }
            : issue,
        ),
      );
      return;
    }

    setUpvotingId(issueId);
    try {
      const { issue: updated } = await toggleIssueUpvote(
        issueId,
        currentCitizenId,
      );
      setCommunityIssues((prev) =>
        prev.map((i) =>
          i._id === issueId
            ? {
                ...i,
                upvoteCount: updated.upvoteCount,
                upvotedByCitizens: updated.upvotedByCitizens,
                hasUpvoted: updated.hasUpvoted,
              }
            : i,
        ),
      );
    } catch {
      // silent fail for demo
    } finally {
      setUpvotingId(null);
    }
  }

  // Citizen confirms fix is done
  async function handleVerifyConfirm() {
    if (!trackedIssue) return;
    setVerifyLoading(true);
    setVerifyMsg("");
    try {
      const fd = new FormData();
      fd.append("decision", "confirm");
      fd.append("citizenId", currentCitizenId);
      if (trackedIssue.ticketCode)
        fd.append("ticketCode", trackedIssue.ticketCode);
      const updated = await verifyCitizenFeedback(trackedIssue._id, fd);
      setTrackedIssue(updated);
      setVerifyMsg("✅ Thank you! The ticket has been marked as Closed.");
    } catch (err: any) {
      setVerifyMsg(
        "❌ " +
          (err?.response?.data?.error || "Could not confirm at this time."),
      );
    } finally {
      setVerifyLoading(false);
    }
  }

  // Citizen disputes the resolution
  async function handleDisputeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackedIssue || !disputeReason.trim()) return;
    setVerifyLoading(true);
    setVerifyMsg("");
    try {
      const fd = new FormData();
      fd.append("decision", "dispute");
      fd.append("citizenId", currentCitizenId);
      if (trackedIssue.ticketCode)
        fd.append("ticketCode", trackedIssue.ticketCode);
      fd.append("reason", disputeReason.trim());
      if (disputeFile) fd.append("photo", disputeFile);
      const updated = await verifyCitizenFeedback(trackedIssue._id, fd);
      setTrackedIssue(updated);
      setShowDisputeForm(false);
      setDisputeReason("");
      setDisputeFile(null);
      setDisputePreview(null);
      setVerifyMsg(
        "🔄 Dispute filed. The ticket has been reopened for review.",
      );
    } catch (err: any) {
      setVerifyMsg(
        "❌ " +
          (err?.response?.data?.error ||
            "Could not file dispute at this time."),
      );
    } finally {
      setVerifyLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Citizen Navigation Header */}
      <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab("home")}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <span className="text-base font-bold">C</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white whitespace-nowrap">
                  CivicLens
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 whitespace-nowrap">
                  Citizen Portal
                </span>
              </div>
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "home"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Building2 size={15} />
              <span className="whitespace-nowrap">About</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("report");
                handleResetForm();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "report"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <PlusCircle size={15} />
              <span className="whitespace-nowrap">Report Issue</span>
            </button>

            <button
              onClick={() => setActiveTab("track")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "track"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Search size={15} />
              <span className="whitespace-nowrap">Track Status</span>
            </button>

            <button
              onClick={() => setActiveTab("queue")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "queue"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Layers size={15} />
              <span className="whitespace-nowrap">My Reports</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("community");
                handleLoadCommunity();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "community"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Users size={15} />
              <span className="whitespace-nowrap">Community</span>
            </button>

            <div className="h-5 w-px bg-slate-800 mx-1 sm:mx-1.5 shrink-0" />

            <ConnectivityIndicator onOpenQueue={() => setActiveTab("queue")} />

            <button
              onClick={onOpenStaffLogin || onSwitchToDashboard}
              aria-label="Staff Login"
              title="Staff Login"
              className="px-2 sm:px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ShieldAlert size={16} className="text-blue-400" />
              <span className="hidden md:inline">Staff Login</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================= */}
        {/* TAB 1: ABOUT & PURPOSE LANDING PAGE                       */}
        {/* ========================================================= */}
        {activeTab === "home" && (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-14 shadow-xl border border-slate-800">
              <div className="max-w-2xl space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
                  <Sparkles size={13} className="text-blue-400" />
                  <span>AI-Powered Civic Infrastructure Care</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                  Empowering Citizens to Fix Neighborhood Problems.
                </h1>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  CivicLens connects local residents directly with municipal
                  engineering teams. Report potholes, damaged streetlights,
                  water pipeline leaks, or overflowing garbage bins in under 60
                  seconds with instant AI priority routing and real-time
                  resolution tracking.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => {
                      setActiveTab("report");
                      handleResetForm();
                    }}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 group cursor-pointer"
                  >
                    <span>Report a Problem Now</span>
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>

                  <button
                    onClick={() => setActiveTab("track")}
                    className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Search size={16} />
                    <span>Track Existing Ticket</span>
                  </button>
                </div>
              </div>

              {/* Decorative Background Accents */}
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 right-1/3 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
            </div>

            {/* 3 Pillars / Purpose Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-7 rounded-2xl border border-slate-800 shadow-md hover:border-slate-700 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-orange-950/70 text-orange-400 flex items-center justify-center font-bold mb-5 border border-orange-800/60">
                  <MapPin size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Pinpoint Precision
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Search by address, landmark, 6-digit postal pincode, or click
                  directly on our interactive map. Engineers arrive at the exact
                  location without guesswork.
                </p>
              </div>

              <div className="bg-slate-900 p-7 rounded-2xl border border-slate-800 shadow-md hover:border-slate-700 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-purple-950/70 text-purple-400 flex items-center justify-center font-bold mb-5 border border-purple-800/60">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Transparent AI Triage
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Our system evaluates issue safety risk, proximity to schools
                  or hospitals, and urgency to assign an objective priority
                  score (0–100) ensuring critical issues get handled first.
                </p>
              </div>

              <div className="bg-slate-900 p-7 rounded-2xl border border-slate-800 shadow-md hover:border-slate-700 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-950/70 text-emerald-400 flex items-center justify-center font-bold mb-5 border border-emerald-800/60">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">
                  Live Progress Accountability
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Receive a unique tracking ticket ID upon submission. Follow
                  every status update from initial acknowledgement to field
                  dispatch and verified resolution.
                </p>
              </div>
            </div>

            {/* How It Works Step-by-Step */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 sm:p-10 shadow-md">
              <div className="text-center max-w-xl mx-auto mb-10">
                <h2 className="text-2xl font-bold text-slate-100">
                  How Civic Reporting Works
                </h2>
                <p className="text-sm text-slate-400 mt-2">
                  Four simple steps connecting your neighborhood voice to
                  municipal execution.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    step: "01",
                    title: "Snap & Describe",
                    desc: "Take a photo of the road hazard, water leak, or waste accumulation and describe what happened.",
                  },
                  {
                    step: "02",
                    title: "Select Location",
                    desc: "Type your locality or click on the map to set exact GPS coordinates for the maintenance crew.",
                  },
                  {
                    step: "03",
                    title: "AI Verification",
                    desc: "CivicLens checks for potential duplicate reports in your area and calculates urgency severity.",
                  },
                  {
                    step: "04",
                    title: "Track to Done",
                    desc: "Follow status history and field technician inspection notes until the ticket is resolved.",
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="p-5 rounded-xl bg-slate-950/60 border border-slate-800"
                  >
                    <span className="text-2xl font-black text-blue-400 block mb-2">
                      {s.step}
                    </span>
                    <h4 className="font-bold text-slate-200 text-sm mb-1">
                      {s.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CITIZEN REPORT FORM & CONFIRMATION                 */}
        {/* ========================================================= */}
        {activeTab === "report" && (
          <div>
            {confirmedIssue ? (
              /* Confirmation Screen with Unique Ticket Code */
              <div className="max-w-2xl mx-auto bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-8 sm:p-10 text-center animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <CheckCircle2 size={36} />
                </div>

                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
                  Report Successfully Registered
                </span>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-4">
                  Thank You for Improving Your City!
                </h2>
                <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                  Your civic issue has been logged into the municipal database
                  and dispatched to the Civic Officer Dashboard.
                </p>

                {/* Ticket ID Box */}
                <div className="my-8 p-6 bg-slate-950/80 border-2 border-dashed border-blue-500/40 rounded-2xl text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Your Unique Tracking ID
                  </p>
                  <p className="text-2xl sm:text-3xl font-mono font-black text-blue-400 tracking-wide">
                    {confirmedIssue.ticketCode || confirmedIssue._id}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Save this code to check progress anytime on our Track Status
                    page.
                  </p>
                </div>

                {/* Summary Details */}
                <div className="text-left bg-slate-950/60 rounded-xl p-4 sm:p-5 border border-slate-800 text-xs space-y-2 mb-8">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Issue Title:</span>
                    <span className="font-semibold text-slate-200">
                      {confirmedIssue.title}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Category:</span>
                    <CategoryBadge category={confirmedIssue.category} />
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[240px]">
                      {confirmedIssue.location}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">
                      Initial Priority Score:
                    </span>
                    <span className="font-bold text-blue-400">
                      {confirmedIssue.priorityScore ||
                        confirmedIssue.severityScore}
                      /100
                    </span>
                  </div>
                </div>

                {/* Next Steps Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setSearchQuery(
                        confirmedIssue.ticketCode || confirmedIssue._id,
                      );
                      setTrackedIssue(confirmedIssue);
                      setActiveTab("track");
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search size={14} />
                    <span>Track This Ticket</span>
                  </button>

                  <button
                    onClick={handleResetForm}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all border border-slate-700 cursor-pointer"
                  >
                    Report Another Issue
                  </button>

                  <button
                    onClick={onSwitchToDashboard}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert size={14} />
                    <span>View in Officer Dashboard</span>
                  </button>
                </div>
              </div>
            ) : offlineSavedReport ? (
              /* Offline Saved Confirmation Screen */
              <div className="max-w-2xl mx-auto bg-slate-900 rounded-3xl border border-amber-800/60 shadow-xl p-8 sm:p-10 text-center animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-700/60 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <WifiOff size={36} />
                </div>

                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-950 px-3 py-1 rounded-full border border-amber-800">
                  Report Saved Locally (Offline Buffer)
                </span>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-4">
                  Report Saved on This Device
                </h2>
                <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                  Report saved on this device.{" "}
                  <strong>It has not reached CivicLens yet.</strong> It will
                  synchronize automatically as soon as internet connection is
                  restored.
                </p>

                {/* Local Tracking Box */}
                <div className="my-8 p-6 bg-slate-950/80 border-2 border-dashed border-amber-700/50 rounded-2xl text-center">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                    Temporary Client Tracking Code
                  </p>
                  <p className="text-2xl sm:text-3xl font-mono font-black text-amber-300 tracking-wide">
                    {offlineSavedReport.ticketCode ||
                      offlineSavedReport.clientId.slice(0, 8)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Client Idempotency UUID:{" "}
                    <span className="font-mono">
                      {offlineSavedReport.clientId}
                    </span>
                  </p>
                </div>

                {/* Summary Details */}
                <div className="text-left bg-slate-950/60 rounded-xl p-4 sm:p-5 border border-slate-800 text-xs space-y-2 mb-8">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Issue Title:</span>
                    <span className="font-semibold text-slate-200">
                      {offlineSavedReport.title}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Category:</span>
                    <CategoryBadge category={offlineSavedReport.category} />
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[240px]">
                      {offlineSavedReport.location}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/80">
                      {offlineSavedReport.syncStatus}
                    </span>
                  </div>
                </div>

                {/* Next Steps Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab("queue")}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layers size={14} />
                    <span>View Offline Queue</span>
                  </button>

                  <button
                    onClick={handleResetForm}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all border border-slate-700 cursor-pointer"
                  >
                    Report Another Issue
                  </button>
                </div>
              </div>
            ) : (
              /* The Issue Reporting Form with Integrated Map Picker */
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-6 sm:p-10">
                <div className="max-w-2xl mb-8">
                  <h2 className="text-2xl font-bold text-slate-100">
                    Report a Civic Problem
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Provide clear information and pin the location so repair
                    personnel can inspect without delay.
                  </p>
                </div>

                {formError && (
                  <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleReportSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Details Column (7 cols) */}
                    <div className="lg:col-span-7 space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                          Problem Title <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Hazardous pothole near Kothrud Depot bus stand"
                          className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-950 text-slate-100 placeholder:text-slate-600"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                            Category <span className="text-red-400">*</span>
                          </label>
                          <select
                            value={category}
                            onChange={(e) =>
                              setCategory(e.target.value as Category)
                            }
                            className="w-full px-3.5 py-2.5 text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-950 text-slate-100 cursor-pointer"
                          >
                            <option value="" className="bg-slate-900">
                              Choose category...
                            </option>
                            {CATEGORIES.map((c) => (
                              <option
                                key={c}
                                value={c}
                                className="bg-slate-900"
                              >
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                            Photo Evidence (Optional)
                          </label>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-slate-600 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Upload size={14} />
                            <span>
                              {imageFile ? "Change Photo" : "Upload Photo"}
                            </span>
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </div>
                      </div>

                      {imagePreview && (
                        <div className="relative inline-block">
                          <img
                            src={imagePreview}
                            alt="Selected evidence"
                            className="w-32 h-24 object-cover rounded-xl border border-slate-700 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-slate-800 text-slate-400 hover:text-red-400 rounded-full border border-slate-600 p-1 shadow cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                          Detailed Description{" "}
                          <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          rows={4}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe the issue condition, hazards to traffic or pedestrians, water leaks, or how long it has persisted..."
                          className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-950 text-slate-100 placeholder:text-slate-600"
                          required
                        />
                      </div>

                      {/* Reporter Contact Info (Strictly Private) */}
                      <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-2xl space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                          <Lock size={13} className="text-emerald-400" />
                          <span>Reporter Contact (Kept Confidential)</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Your contact details are strictly confidential and
                          will never be shown on public views.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Your Name (optional)"
                            value={reporterName}
                            onChange={(e) => setReporterName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-700 rounded-lg bg-slate-900 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Phone or Email (optional)"
                            value={reporterContact}
                            onChange={(e) => setReporterContact(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-700 rounded-lg bg-slate-900 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Location & Map Column (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                          Location / Pincode / Area{" "}
                          <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. 411038 Pune or MG Road"
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-950 text-slate-100 placeholder:text-slate-600"
                            required
                          />
                          <MapPin
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                          />
                        </div>
                        {geocodingMsg && (
                          <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                            <Check size={12} />
                            <span>{geocodingMsg}</span>
                          </p>
                        )}
                        {isGeocoding && (
                          <p className="text-[11px] text-blue-400 mt-1">
                            Resolving location coordinates...
                          </p>
                        )}
                      </div>

                      {/* Map-based location selection */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Interactive Map Pin
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Click map to drop marker
                          </span>
                        </div>

                        <div className="h-64 rounded-2xl overflow-hidden border border-slate-700 relative shadow-inner">
                          <MapContainer
                            center={[selectedCoords.lat, selectedCoords.lng]}
                            zoom={14}
                            scrollWheelZoom={false}
                            className="w-full h-full"
                          >
                            <CitizenMapController
                              center={[selectedCoords.lat, selectedCoords.lng]}
                            />
                            <CitizenMapClickHandler onSelect={handleMapClick} />
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              className="dark-map-tiles"
                            />
                            {hasMapPin && (
                              <Marker
                                position={[
                                  selectedCoords.lat,
                                  selectedCoords.lng,
                                ]}
                                icon={createPickerPin()}
                              />
                            )}
                          </MapContainer>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Coordinates: [{selectedCoords.lat.toFixed(5)},{" "}
                          {selectedCoords.lng.toFixed(5)}]
                        </p>
                      </div>

                      {/* AI Assistance Badge */}
                      <div className="p-4 rounded-2xl bg-blue-950/50 border border-blue-800/60 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-blue-300">
                            <Sparkles size={14} className="text-blue-400" />
                            <span>AI Initial Priority Assessment</span>
                          </div>
                          {isAnalyzing && (
                            <span className="text-[10px] text-blue-400 font-medium animate-pulse">
                              Assessing urgency...
                            </span>
                          )}
                        </div>

                        {analysis ? (
                          <>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-slate-400">
                                Predicted Urgency Score:
                              </span>
                              <span className="font-bold text-blue-300 bg-slate-900 px-2.5 py-0.5 rounded-md border border-blue-800 shadow-2xs font-mono">
                                {analysis.severityScore}/100 (
                                {analysis.severityLabel})
                              </span>
                            </div>

                            {analysis.category && (
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>Detected Domain:</span>
                                <span className="font-semibold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                  {analysis.category}
                                </span>
                              </div>
                            )}

                            {analysis.duplicate && (
                              <div className="bg-amber-950/60 p-2.5 rounded-lg border border-amber-700/60 space-y-2">
                                <p className="text-amber-300 text-[11px] font-semibold flex items-center gap-1.5">
                                  <AlertTriangle
                                    size={13}
                                    className="text-amber-400 shrink-0"
                                  />
                                  <span>
                                    Similar issue nearby: &ldquo;
                                    {analysis.duplicate.title}&rdquo;
                                  </span>
                                </p>
                                <p className="text-[10px] text-amber-400">
                                  Avoid creating duplicate tickets. You can
                                  upvote the existing report to escalate
                                  priority faster!
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const dupId = analysis.duplicate?.id;
                                    setActiveTab("community");
                                    handleLoadCommunity();
                                    if (dupId) {
                                      setHighlightIssueId(dupId);
                                      setTimeout(
                                        () => setHighlightIssueId(null),
                                        3000,
                                      );
                                    }
                                  }}
                                  className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <ThumbsUp size={11} />
                                  <span>Support Existing Report Instead</span>
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-[11px] text-slate-500 pt-1">
                            Enter issue title or description above to see
                            real-time AI category detection and urgency severity
                            scoring.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveTab("home")}
                      className="px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <span>Logging Ticket...</span>
                      ) : (
                        <>
                          <span>Submit Civic Report</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CITIZEN ISSUE TRACKING & STATUS HISTORY            */}
        {/* ========================================================= */}
        {activeTab === "track" && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Search Box */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm p-6 sm:p-8">
              <div className="max-w-xl mb-6">
                <h2 className="text-2xl font-bold text-slate-100">
                  Track Submitted Issues
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Enter your tracking ticket ID (e.g.{" "}
                  <span className="font-mono font-medium text-blue-400">
                    ANO-3426-456
                  </span>
                  ) or search by keyword to view live status updates.
                </p>
              </div>

              <form
                onSubmit={handleTrackSearch}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter Ticket ID (e.g. ANO-3426-456 or WTR-4512-789)"
                    className="w-full pl-11 pr-4 py-3 text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-950 text-slate-100 placeholder:text-slate-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {trackLoading ? (
                    <span>Searching...</span>
                  ) : (
                    <span>Track Issue</span>
                  )}
                </button>
              </form>

              {trackError && (
                <div className="mt-4 p-3.5 rounded-xl bg-amber-950/60 border border-amber-700/60 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}
            </div>

            {/* Tracked Issue Details Display */}
            {trackedIssue && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm overflow-hidden animate-fadeIn">
                {/* Header Banner */}
                <div className="p-6 sm:p-8 border-b border-slate-800 bg-slate-800/40 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-800">
                        {trackedIssue.ticketCode || trackedIssue._id}
                      </span>
                      <StatusBadge status={trackedIssue.status} />
                      <CategoryBadge category={trackedIssue.category} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mt-2">
                      {trackedIssue.title}
                    </h3>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Date Filed</p>
                    <p className="text-xs font-semibold text-slate-300">
                      {new Date(trackedIssue.createdAt).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </p>
                  </div>
                </div>

                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Details & Evidence (7 cols) */}
                  <div className="md:col-span-7 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Description
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        {trackedIssue.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Location
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <MapPin size={16} className="text-blue-400 shrink-0" />
                        <span>{trackedIssue.location}</span>
                      </div>
                      {trackedIssue.coordinates && (
                        <p className="text-xs text-slate-600 ml-6 mt-0.5">
                          GPS: [{trackedIssue.coordinates.lat.toFixed(5)},{" "}
                          {trackedIssue.coordinates.lng.toFixed(5)}]
                        </p>
                      )}
                    </div>

                    {/* Assigned Crew & Target Deadline (Visible to Citizen) */}
                    {(trackedIssue.deadline ||
                      trackedIssue.assignedWorkerName) && (
                      <div className="p-4 rounded-xl bg-blue-950/50 border border-blue-800/60 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-blue-300">
                          <CheckCircle2 size={14} className="text-blue-400" />
                          <span>Field Action Scheduled</span>
                        </div>
                        {trackedIssue.assignedWorkerName && (
                          <p className="text-blue-300">
                            <strong>Maintenance Crew:</strong>{" "}
                            {trackedIssue.assignedWorkerName}
                            {trackedIssue.assignedDepartment
                              ? ` (${trackedIssue.assignedDepartment})`
                              : ""}
                          </p>
                        )}
                        {trackedIssue.deadline && (
                          <p className="text-blue-200 font-semibold flex items-center gap-1">
                            <span>📅 Estimated Resolution Target:</span>
                            <span className="bg-slate-900 px-2 py-0.5 rounded border border-blue-800 text-blue-300 font-bold">
                              {new Date(
                                trackedIssue.deadline,
                              ).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Photos */}
                    {trackedIssue.photos && trackedIssue.photos.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Evidence Photos
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {trackedIssue.photos.map((url, idx) => (
                            <EvidencePhoto
                              key={idx}
                              src={url}
                              alt="Report evidence"
                              className="w-full h-24 object-cover rounded-xl border border-slate-700"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Before → After Comparison Card */}
                    {trackedIssue.photos &&
                      trackedIssue.photos.length > 0 &&
                      trackedIssue.completionEvidence?.photos &&
                      trackedIssue.completionEvidence.photos.length > 0 && (
                        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4 space-y-3">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Camera size={13} className="text-emerald-500" />
                            Before → After Repair
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide bg-red-950/60 px-2 py-0.5 rounded-full">
                                Before
                              </span>
                              <EvidencePhoto
                                src={trackedIssue.photos[0]}
                                alt="Before repair"
                                className="w-full h-28 object-cover rounded-lg border border-slate-700"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                After
                              </span>
                              <EvidencePhoto
                                src={trackedIssue.completionEvidence.photos[0]}
                                alt="After repair"
                                className="w-full h-28 object-cover rounded-lg border border-emerald-800/60"
                              />
                            </div>
                          </div>
                          {trackedIssue.completionEvidence.submittedAt && (
                            <p className="text-[10px] text-emerald-500">
                              Work completed:{" "}
                              <strong>
                                {new Date(
                                  trackedIssue.completionEvidence.submittedAt,
                                ).toLocaleDateString()}
                              </strong>
                            </p>
                          )}
                        </div>
                      )}

                    {/* Citizen Verify / Dispute Card (when Resolved or Awaiting Citizen Confirmation) */}
                    {(trackedIssue.status === "Awaiting Citizen Confirmation" ||
                      trackedIssue.status === "Resolved") && (
                      <div className="rounded-xl border-2 border-sky-700 bg-sky-950/40 p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-sky-300 flex items-center gap-1.5">
                              <CheckCircle2
                                size={16}
                                className="text-sky-400"
                              />{" "}
                              Was the issue fixed?
                            </h4>
                            <p className="text-xs text-sky-500 mt-0.5">
                              The officer has marked this resolved. Please
                              confirm or dispute.
                            </p>
                          </div>
                          {trackedIssue.citizenFeedback?.autoCloseDeadline && (
                            <div className="text-right shrink-0">
                              <p className="text-[10px] text-sky-500 font-medium">
                                Auto-closes in
                              </p>
                              <p className="text-xs font-bold text-sky-300">
                                {Math.max(
                                  0,
                                  Math.ceil(
                                    (new Date(
                                      trackedIssue.citizenFeedback
                                        .autoCloseDeadline,
                                    ).getTime() -
                                      Date.now()) /
                                      (1000 * 60 * 60 * 24),
                                  ),
                                )}{" "}
                                days
                              </p>
                            </div>
                          )}
                        </div>

                        {verifyMsg && (
                          <div
                            className={`p-3 rounded-lg text-xs font-medium ${verifyMsg.startsWith("✅") ? "bg-emerald-950/60 text-emerald-300 border border-emerald-700" : verifyMsg.startsWith("🔄") ? "bg-blue-950/60 text-blue-300 border border-blue-700" : "bg-red-950/60 text-red-300 border border-red-700"}`}
                          >
                            {verifyMsg}
                          </div>
                        )}

                        {!verifyMsg && !showDisputeForm && (
                          <div className="flex gap-3">
                            <button
                              onClick={handleVerifyConfirm}
                              disabled={verifyLoading}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              <CheckCircle2 size={14} /> Confirm Fixed — Close
                              Ticket
                            </button>
                            <button
                              onClick={() => setShowDisputeForm(true)}
                              disabled={
                                verifyLoading ||
                                (trackedIssue.citizenFeedback?.disputeCount ??
                                  0) >= 2
                              }
                              className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              <RefreshCw size={14} /> Dispute — Not Fixed
                            </button>
                          </div>
                        )}

                        {trackedIssue.citizenFeedback?.disputeCount !==
                          undefined && (
                          <p className="text-[10px] text-sky-500">
                            {2 - trackedIssue.citizenFeedback.disputeCount}{" "}
                            dispute
                            {2 - trackedIssue.citizenFeedback.disputeCount !== 1
                              ? "s"
                              : ""}{" "}
                            remaining
                          </p>
                        )}

                        {showDisputeForm && (
                          <form
                            onSubmit={handleDisputeSubmit}
                            className="space-y-3 pt-2 border-t border-sky-800/60"
                          >
                            <p className="text-xs font-bold text-orange-300">
                              Describe what's still wrong:
                            </p>
                            <textarea
                              value={disputeReason}
                              onChange={(e) => setDisputeReason(e.target.value)}
                              placeholder="e.g. The pothole was partially filled but has reopened..."
                              required
                              rows={3}
                              className="w-full px-3 py-2 text-xs border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none bg-slate-950 text-slate-100 placeholder:text-slate-600"
                            />
                            <div>
                              <input
                                ref={disputeFileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    setDisputeFile(f);
                                    const r = new FileReader();
                                    r.onload = () =>
                                      setDisputePreview(r.result as string);
                                    r.readAsDataURL(f);
                                  }
                                }}
                              />
                              {disputePreview ? (
                                <div className="relative inline-block">
                                  <img
                                    src={disputePreview}
                                    alt="Dispute photo"
                                    className="h-20 w-28 object-cover rounded-lg border border-slate-700"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDisputeFile(null);
                                      setDisputePreview(null);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center cursor-pointer"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    disputeFileRef.current?.click()
                                  }
                                  className="px-3 py-1.5 text-xs border border-orange-700 text-orange-400 rounded-lg hover:bg-orange-950/40 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Camera size={13} /> Attach Photo (optional)
                                </button>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={
                                  verifyLoading || !disputeReason.trim()
                                }
                                className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer"
                              >
                                {verifyLoading
                                  ? "Submitting..."
                                  : "Submit Dispute"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDisputeForm(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-100 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Supporter count for this issue */}
                    {(trackedIssue.upvoteCount ?? 0) > 0 && (
                      <div className="flex items-center gap-2 text-xs text-violet-400 bg-violet-950/40 border border-violet-800/60 px-3 py-2 rounded-xl">
                        <ThumbsUp size={13} className="text-violet-400" />
                        <span>
                          <strong>{trackedIssue.upvoteCount}</strong> neighbour
                          {trackedIssue.upvoteCount !== 1 ? "s" : ""} also
                          affected by this issue
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Status Timeline (5 cols) */}
                  <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-slate-800 md:pl-8 space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-400" />
                      <span>Resolution Status Timeline</span>
                    </h4>

                    {/* Timeline items */}
                    <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-700">
                      {(trackedIssue.statusHistory &&
                      trackedIssue.statusHistory.length > 0
                        ? trackedIssue.statusHistory
                        : [
                            {
                              status: trackedIssue.status,
                              timestamp: trackedIssue.createdAt,
                              note: "Ticket registered in municipal system",
                              updatedBy: "Civic Admin",
                            },
                          ]
                      ).map((item, idx) => (
                        <div
                          key={idx}
                          className="relative flex items-start gap-3 pl-1"
                        >
                          <div className="w-5 h-5 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center shrink-0 z-10">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          </div>
                          <div className="flex-1 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-200">
                                {item.status}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {item.note}
                            </p>
                            <p className="text-[10px] text-slate-600 mt-0.5">
                              By: {item.updatedBy}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: OFFLINE REPORT BUFFER QUEUE (MY REPORTS)           */}
        {/* ========================================================= */}
        {activeTab === "queue" && (
          <OfflineReportQueue
            onIssueSynced={(issue) => {
              onIssueCreated(issue);
            }}
            existingIssues={existingIssues}
            onTrackTicket={(ticketCode) => {
              setSearchQuery(ticketCode);
              setActiveTab("track");
              // Auto-search for it
              const match = existingIssues.find(
                (iss) =>
                  iss.ticketCode?.toLowerCase() === ticketCode.toLowerCase() ||
                  iss._id === ticketCode,
              );
              if (match) setTrackedIssue(match);
            }}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 5: COMMUNITY ISSUES (PUBLIC FEED + UPVOTE)            */}
        {/* ========================================================= */}
        {activeTab === "community" && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                  <Users size={22} className="text-violet-400" /> Community
                  Issues
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Issues reported by your neighbours. Hit{" "}
                  <strong>"Me Too"</strong> on problems you've also noticed — it
                  boosts their priority.
                </p>
              </div>
              <button
                onClick={handleLoadCommunity}
                disabled={communityLoading}
                className="px-4 py-2 rounded-xl border border-violet-800 bg-violet-950/60 text-violet-300 text-xs font-bold hover:bg-violet-900/60 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  size={13}
                  className={communityLoading ? "animate-spin" : ""}
                />
                {communityLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {communityLoading && (
              <div className="text-center py-16 text-slate-500">
                <RefreshCw
                  size={28}
                  className="animate-spin mx-auto mb-3 text-slate-400"
                />
                <p>Loading community issues...</p>
              </div>
            )}

            {!communityLoading && communityIssues.length === 0 && (
              <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800">
                <Users size={36} className="mx-auto mb-3 text-slate-600" />
                <p className="text-slate-300 font-medium">
                  No community issues found.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Be the first to report an issue in your area!
                </p>
              </div>
            )}

            {!communityLoading &&
              communityIssues.map((issue, idx) => {
                const hasUpvoted =
                  issue.upvotedByCitizens?.includes(currentCitizenId) ||
                  issue.hasUpvoted;
                const isHighlighted = highlightIssueId === issue._id;
                const isUpvoting = upvotingId === issue._id;

                return (
                  <div
                    key={issue._id}
                    className={`bg-slate-900 rounded-2xl border transition-all shadow-xs hover:shadow-md ${isHighlighted ? "border-violet-500 ring-2 ring-violet-500/30" : "border-slate-800"}`}
                  >
                    <div className="p-5 flex items-start gap-4">
                      {/* Rank */}
                      <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-black shrink-0 border border-slate-700">
                        #{idx + 1}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CategoryBadge category={issue.category} />
                          <StatusBadge status={issue.status} />
                          {(issue.upvoteCount ?? 0) > 0 && (
                            <span className="text-[10px] font-bold text-violet-300 bg-violet-950/70 border border-violet-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ThumbsUp size={10} /> {issue.upvoteCount}{" "}
                              affected
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-slate-100 leading-snug">
                          {issue.title}
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {issue.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={10} /> {issue.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />{" "}
                            {new Date(issue.createdAt).toLocaleDateString()}
                          </span>
                          {issue.priorityScore !== undefined && (
                            <span className="font-bold text-slate-400">
                              Priority: {issue.priorityScore}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Upvote Button */}
                      <button
                        onClick={() => {
                          handleUpvote(issue._id);
                          setHighlightIssueId(issue._id);
                          setTimeout(() => setHighlightIssueId(null), 1500);
                        }}
                        disabled={isUpvoting}
                        className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all font-bold text-xs cursor-pointer disabled:opacity-60 ${
                          hasUpvoted
                            ? "bg-violet-600 border-violet-600 text-white"
                            : "bg-slate-950 border-violet-800 text-violet-300 hover:bg-violet-950/40"
                        }`}
                      >
                        <ThumbsUp
                          size={16}
                          className={isUpvoting ? "animate-bounce" : ""}
                        />
                        <span>{hasUpvoted ? "Me Too ✓" : "Me Too"}</span>
                        <span className="text-[10px] font-normal">
                          {issue.upvoteCount ?? 0}
                        </span>
                      </button>
                    </div>

                    {/* Ticket code footer */}
                    <div className="px-5 pb-3 flex items-center justify-between border-t border-slate-800/80">
                      <span className="font-mono text-[10px] text-slate-500">
                        {issue.ticketCode || issue._id}
                      </span>
                      <button
                        onClick={() => {
                          setSearchQuery(issue.ticketCode || issue._id);
                          setActiveTab("track");
                          setTrackedIssue(issue);
                        }}
                        className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                      >
                        View full details →
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </main>

      {/* Citizen Portal Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © 2026 CivicLens Citizen Portal. Dedicated Municipal Public
            Engagement System.
          </p>
          <div className="flex items-center gap-4 text-slate-500">
            <button
              onClick={() => setActiveTab("home")}
              className="hover:text-slate-300 cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => setActiveTab("report")}
              className="hover:text-slate-300 cursor-pointer"
            >
              Report
            </button>
            <button
              onClick={() => setActiveTab("track")}
              className="hover:text-slate-300 cursor-pointer"
            >
              Track
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
