// frontend/src/components/CitizenPortal.tsx
import { useState, useRef, useEffect } from 'react';
import type { Issue, Category, AnalysisResult } from '../types';
import { StatusBadge, CategoryBadge } from './Badges';
import { createIssue, analyzeIssuePreview, fetchIssueById, fetchIssues } from '../services/api';
import { geocodeAddress } from '../services/geocoding';
import { runFullClientAnalysis } from '../services/analysis';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ShieldAlert,
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
  Lock
} from 'lucide-react';

interface Props {
  onSwitchToDashboard: () => void;
  onIssueCreated: (issue: Issue) => void;
  existingIssues: Issue[];
}

type CitizenTab = 'home' | 'report' | 'track';

const CATEGORIES: Category[] = ['Roads', 'Garbage', 'Water', 'Electricity', 'Other'];

// Pin icon for citizen map picker
function createPickerPin(): L.DivIcon {
  return L.divIcon({
    className: 'citizen-picker-pin',
    html: `
      <div style="position: relative; width: 34px; height: 34px; transform: translate(-50%, -50%);">
        <div style="width: 100%; height: 100%; border-radius: 9999px; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function CitizenMapClickHandler({ onSelect }: { onSelect: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
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
  onIssueCreated,
  existingIssues
}: Props) {
  const [activeTab, setActiveTab] = useState<CitizenTab>('home');

  // Reporting Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [location, setLocation] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Map coordinate selection
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: 18.5204,
    lng: 73.8567
  });
  const [hasMapPin, setHasMapPin] = useState(false);
  const [geocodingMsg, setGeocodingMsg] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // AI analysis state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Submission & Confirmation State
  const [submitting, setSubmitting] = useState(false);
  const [confirmedIssue, setConfirmedIssue] = useState<Issue | null>(null);
  const [formError, setFormError] = useState('');

  // Tracking Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [trackedIssue, setTrackedIssue] = useState<Issue | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Geocode address when user types location
  useEffect(() => {
    const q = location.trim();
    if (q.length < 3) {
      setGeocodingMsg('');
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
        setGeocodingMsg('');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [location]);

  // Live AI Assistance for category & priority
  useEffect(() => {
    if (!title.trim() && !description.trim()) {
      setAnalysis(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const preview = await analyzeIssuePreview({
          title,
          description,
          category: category || undefined,
          location: location || undefined
        });
        setAnalysis(preview);
        if (!category && preview.category) {
          setCategory(preview.category);
        }
      } catch {
        const fallback = runFullClientAnalysis(title, description, category, location, existingIssues);
        setAnalysis(fallback);
        if (!category && fallback.category) {
          setCategory(fallback.category);
        }
      }
    }, 400);

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
      setLocation(`Pinned Location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`);
    }
    setGeocodingMsg(`Map coordinates selected: [${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}]`);
  }

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Please enter a short descriptive title for the issue.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please provide details describing the condition and urgency.');
      return;
    }
    if (!location.trim()) {
      setFormError('Please provide an address, area, or pincode, or drop a pin on the map.');
      return;
    }

    setSubmitting(true);
    const resolvedCat = (category || analysis?.category || 'Other') as Category;
    const ticketId = `ANO-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('description', description.trim());
      fd.append('category', resolvedCat);
      fd.append('location', location.trim());
      fd.append('ticketCode', ticketId);
      fd.append('coordinates', JSON.stringify(selectedCoords));
      if (imageFile) fd.append('image', imageFile);

      const res = await createIssue(fd);
      const newIssue: Issue = {
        ...res.issue,
        coordinates: selectedCoords,
        ticketCode: res.issue.ticketCode || ticketId
      };

      onIssueCreated(newIssue);
      setConfirmedIssue(newIssue);
    } catch {
      // Local fallback issue
      const score = analysis?.severityScore || 65;
      const localIssue: Issue = {
        _id: `local-${Date.now()}`,
        ticketCode: ticketId,
        title: title.trim(),
        description: description.trim(),
        category: resolvedCat,
        location: location.trim(),
        coordinates: selectedCoords,
        imagePath: imagePreview,
        photos: imagePreview ? [imagePreview] : [],
        severityScore: score,
        priorityScore: score,
        severityFactors: analysis?.severityFactors || [`Base category score: ${score} pts`],
        categoryReasons: analysis?.categoryReasons || ['Citizen portal submission'],
        status: 'Reported',
        statusHistory: [
          {
            status: 'Reported',
            timestamp: new Date().toISOString(),
            note: 'Ticket filed via Citizen Portal',
            updatedBy: 'Citizen Reporter'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: true
      };

      onIssueCreated(localIssue);
      setConfirmedIssue(localIssue);
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetForm() {
    setTitle('');
    setDescription('');
    setCategory('');
    setLocation('');
    setReporterName('');
    setReporterContact('');
    setImageFile(null);
    setImagePreview(null);
    setConfirmedIssue(null);
    setFormError('');
    setAnalysis(null);
    setHasMapPin(false);
  }

  async function handleTrackSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setTrackLoading(true);
    setTrackError('');
    setTrackedIssue(null);

    // 1. Check existing issues loaded in memory first (by ticketCode or _id)
    const localMatch = existingIssues.find(
      (iss) =>
        (iss.ticketCode && iss.ticketCode.toLowerCase() === query.toLowerCase()) ||
        iss._id.toLowerCase() === query.toLowerCase() ||
        iss._id.toLowerCase().endsWith(query.toLowerCase())
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
            (i) => i.ticketCode?.toLowerCase() === query.toLowerCase() || i._id === query
          );
          setTrackedIssue(exact || res.issues[0]);
        } else {
          setTrackError(`No report found matching ticket ID or tracking code "${query}".`);
        }
      }
    } catch {
      setTrackError(`Unable to locate report with ticket ID "${query}". Please check the ID and try again.`);
    } finally {
      setTrackLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Citizen Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <span className="text-lg">C</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-gray-900">CivicLens</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Citizen Portal
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-none">Public Municipal Reporting</p>
              </div>
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Building2 size={16} />
              <span>About</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('report');
                handleResetForm();
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <PlusCircle size={16} />
              <span>Report Issue</span>
            </button>

            <button
              onClick={() => setActiveTab('track')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'track'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Search size={16} />
              <span>Track Status</span>
            </button>

            <div className="h-5 w-px bg-gray-200 mx-1 sm:mx-2" />

            {/* Switch to Officer Dashboard */}
            <button
              onClick={onSwitchToDashboard}
              className="px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Return to Civic Officer Interactive Command Center"
            >
              <ShieldAlert size={14} className="text-blue-600" />
              <span className="hidden md:inline">Officer Dashboard</span>
              <span className="md:hidden">Officer</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================= */}
        {/* TAB 1: ABOUT & PURPOSE LANDING PAGE                       */}
        {/* ========================================================= */}
        {activeTab === 'home' && (
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
                  CivicLens connects local residents directly with municipal engineering teams. 
                  Report potholes, damaged streetlights, water pipeline leaks, or overflowing garbage 
                  bins in under 60 seconds with instant AI priority routing and real-time resolution tracking.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => {
                      setActiveTab('report');
                      handleResetForm();
                    }}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 group cursor-pointer"
                  >
                    <span>Report a Problem Now</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveTab('track')}
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
              <div className="bg-white p-7 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold mb-5 border border-orange-100">
                  <MapPin size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Pinpoint Precision</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Search by address, landmark, 6-digit postal pincode, or click directly on our interactive map. 
                  Engineers arrive at the exact location without guesswork.
                </p>
              </div>

              <div className="bg-white p-7 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-5 border border-purple-100">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Transparent AI Triage</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Our system evaluates issue safety risk, proximity to schools or hospitals, and urgency to assign an 
                  objective priority score (0–100) ensuring critical issues get handled first.
                </p>
              </div>

              <div className="bg-white p-7 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-5 border border-emerald-100">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Live Progress Accountability</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Receive a unique tracking ticket ID upon submission. Follow every status update from initial acknowledgement 
                  to field dispatch and verified resolution.
                </p>
              </div>
            </div>

            {/* How It Works Step-by-Step */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-10">
              <div className="text-center max-w-xl mx-auto mb-10">
                <h2 className="text-2xl font-bold text-gray-900">How Civic Reporting Works</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Four simple steps connecting your neighborhood voice to municipal execution.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    step: '01',
                    title: 'Snap & Describe',
                    desc: 'Take a photo of the road hazard, water leak, or waste accumulation and describe what happened.'
                  },
                  {
                    step: '02',
                    title: 'Select Location',
                    desc: 'Type your locality or click on the map to set exact GPS coordinates for the maintenance crew.'
                  },
                  {
                    step: '03',
                    title: 'AI Verification',
                    desc: 'CivicLens checks for potential duplicate reports in your area and calculates urgency severity.'
                  },
                  {
                    step: '04',
                    title: 'Track to Done',
                    desc: 'Follow status history and field technician inspection notes until the ticket is resolved.'
                  }
                ].map((s) => (
                  <div key={s.step} className="p-5 rounded-xl bg-slate-50 border border-gray-100">
                    <span className="text-2xl font-black text-blue-600 block mb-2">{s.step}</span>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{s.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CITIZEN REPORT FORM & CONFIRMATION                 */}
        {/* ========================================================= */}
        {activeTab === 'report' && (
          <div>
            {confirmedIssue ? (
              /* Confirmation Screen with Unique Ticket Code */
              <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-lg p-8 sm:p-10 text-center animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <CheckCircle2 size={36} />
                </div>

                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Report Successfully Registered
                </span>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-4">
                  Thank You for Improving Your City!
                </h2>
                <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                  Your civic issue has been logged into the municipal database and dispatched to the Civic Officer Dashboard.
                </p>

                {/* Ticket ID Box */}
                <div className="my-8 p-6 bg-slate-50 border-2 border-dashed border-blue-200 rounded-2xl text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Your Unique Tracking ID
                  </p>
                  <p className="text-2xl sm:text-3xl font-mono font-black text-blue-700 tracking-wide">
                    {confirmedIssue.ticketCode || confirmedIssue._id}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Save this code to check progress anytime on our Track Status page.
                  </p>
                </div>

                {/* Summary Details */}
                <div className="text-left bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200 text-xs space-y-2 mb-8">
                  <div className="flex justify-between items-center py-1 border-b border-gray-200">
                    <span className="text-gray-500">Issue Title:</span>
                    <span className="font-semibold text-gray-900">{confirmedIssue.title}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-200">
                    <span className="text-gray-500">Category:</span>
                    <CategoryBadge category={confirmedIssue.category} />
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-200">
                    <span className="text-gray-500">Location:</span>
                    <span className="font-semibold text-gray-900 truncate max-w-[240px]">{confirmedIssue.location}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500">Initial Priority Score:</span>
                    <span className="font-bold text-blue-600">{confirmedIssue.priorityScore || confirmedIssue.severityScore}/100</span>
                  </div>
                </div>

                {/* Next Steps Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setSearchQuery(confirmedIssue.ticketCode || confirmedIssue._id);
                      setTrackedIssue(confirmedIssue);
                      setActiveTab('track');
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search size={14} />
                    <span>Track This Ticket</span>
                  </button>

                  <button
                    onClick={handleResetForm}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-all border border-gray-300 cursor-pointer"
                  >
                    Report Another Issue
                  </button>

                  <button
                    onClick={onSwitchToDashboard}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert size={14} />
                    <span>View in Officer Dashboard</span>
                  </button>
                </div>
              </div>
            ) : (
              /* The Issue Reporting Form with Integrated Map Picker */
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-10">
                <div className="max-w-2xl mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Report a Civic Problem</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Provide clear information and pin the location so repair personnel can inspect without delay.
                  </p>
                </div>

                {formError && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleReportSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Details Column (7 cols) */}
                    <div className="lg:col-span-7 space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Problem Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Hazardous pothole near Kothrud Depot bus stand"
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Category <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as Category)}
                            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Choose category...</option>
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Photo Evidence (Optional)
                          </label>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <Upload size={14} />
                            <span>{imageFile ? 'Change Photo' : 'Upload Photo'}</span>
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
                            className="w-32 h-24 object-cover rounded-xl border border-gray-200 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-white text-gray-500 hover:text-red-600 rounded-full border border-gray-300 p-1 shadow cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Detailed Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={4}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe the issue condition, hazards to traffic or pedestrians, water leaks, or how long it has persisted..."
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          required
                        />
                      </div>

                      {/* Reporter Contact Info (Strictly Private) */}
                      <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                          <Lock size={13} className="text-emerald-600" />
                          <span>Reporter Contact (Kept Confidential)</span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Your contact details are strictly confidential and will never be shown on public views.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Your Name (optional)"
                            value={reporterName}
                            onChange={(e) => setReporterName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Phone or Email (optional)"
                            value={reporterContact}
                            onChange={(e) => setReporterContact(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Location & Map Column (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Location / Pincode / Area <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. 411038 Pune or MG Road"
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            required
                          />
                          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        {geocodingMsg && (
                          <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                            <Check size={12} />
                            <span>{geocodingMsg}</span>
                          </p>
                        )}
                        {isGeocoding && (
                          <p className="text-[11px] text-blue-500 mt-1">Resolving location coordinates...</p>
                        )}
                      </div>

                      {/* Map-based location selection */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Interactive Map Pin
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Click map to drop marker
                          </span>
                        </div>

                        <div className="h-64 rounded-2xl overflow-hidden border border-gray-200 relative shadow-inner">
                          <MapContainer
                            center={[selectedCoords.lat, selectedCoords.lng]}
                            zoom={14}
                            scrollWheelZoom={false}
                            className="w-full h-full"
                          >
                            <CitizenMapController center={[selectedCoords.lat, selectedCoords.lng]} />
                            <CitizenMapClickHandler onSelect={handleMapClick} />
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {hasMapPin && (
                              <Marker
                                position={[selectedCoords.lat, selectedCoords.lng]}
                                icon={createPickerPin()}
                              />
                            )}
                          </MapContainer>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Coordinates: [{selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}]
                        </p>
                      </div>

                      {/* AI Assistance Badge */}
                      {analysis && (
                        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-blue-800">
                            <Sparkles size={14} className="text-blue-600" />
                            <span>AI Initial Priority Assessment</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Predicted Urgency Score:</span>
                            <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                              {analysis.severityScore}/100 ({analysis.severityLabel})
                            </span>
                          </div>
                          {analysis.duplicate && (
                            <p className="text-amber-700 text-[11px] font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                              ℹ️ A similar ticket in this vicinity was reported: &ldquo;{analysis.duplicate.title}&rdquo;.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveTab('home')}
                      className="px-5 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
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
        {activeTab === 'track' && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Search Box */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8">
              <div className="max-w-xl mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Track Submitted Issues</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your tracking ticket ID (e.g. <span className="font-mono font-medium text-blue-600">ANO-3426-456</span>) or search by keyword to view live status updates.
                </p>
              </div>

              <form onSubmit={handleTrackSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter Ticket ID (e.g. ANO-3426-456 or WTR-4512-789)"
                    className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {trackLoading ? <span>Searching...</span> : <span>Track Issue</span>}
                </button>
              </form>

              {trackError && (
                <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}
            </div>

            {/* Tracked Issue Details Display */}
            {trackedIssue && (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
                {/* Header Banner */}
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                        {trackedIssue.ticketCode || trackedIssue._id}
                      </span>
                      <StatusBadge status={trackedIssue.status} />
                      <CategoryBadge category={trackedIssue.category} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mt-2">{trackedIssue.title}</h3>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-400">Date Filed</p>
                    <p className="text-xs font-semibold text-gray-700">
                      {new Date(trackedIssue.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Details & Evidence (7 cols) */}
                  <div className="md:col-span-7 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                      <p className="text-sm text-gray-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-gray-100">
                        {trackedIssue.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Location</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <MapPin size={16} className="text-blue-600 shrink-0" />
                        <span>{trackedIssue.location}</span>
                      </div>
                      {trackedIssue.coordinates && (
                        <p className="text-xs text-gray-400 ml-6 mt-0.5">
                          GPS: [{trackedIssue.coordinates.lat.toFixed(5)}, {trackedIssue.coordinates.lng.toFixed(5)}]
                        </p>
                      )}
                    </div>

                    {/* Photos */}
                    {trackedIssue.photos && trackedIssue.photos.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Evidence Photos
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {trackedIssue.photos.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt="Report evidence"
                              className="w-full h-24 object-cover rounded-xl border border-gray-200"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Status Timeline (5 cols) */}
                  <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-gray-100 md:pl-8 space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-600" />
                      <span>Resolution Status Timeline</span>
                    </h4>

                    {/* Timeline items */}
                    <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-gray-200">
                      {(trackedIssue.statusHistory && trackedIssue.statusHistory.length > 0
                        ? trackedIssue.statusHistory
                        : [
                            {
                              status: trackedIssue.status,
                              timestamp: trackedIssue.createdAt,
                              note: 'Ticket registered in municipal system',
                              updatedBy: 'Civic Admin'
                            }
                          ]
                      ).map((item, idx) => (
                        <div key={idx} className="relative flex items-start gap-3 pl-1">
                          <div className="w-5 h-5 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center shrink-0 z-10">
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                          </div>
                          <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-800">{item.status}</span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{item.note}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">By: {item.updatedBy}</p>
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
      </main>

      {/* Citizen Portal Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 CivicLens Citizen Portal. Dedicated Municipal Public Engagement System.</p>
          <div className="flex items-center gap-4 text-gray-400">
            <button onClick={() => setActiveTab('home')} className="hover:text-gray-700 cursor-pointer">About</button>
            <button onClick={() => setActiveTab('report')} className="hover:text-gray-700 cursor-pointer">Report</button>
            <button onClick={() => setActiveTab('track')} className="hover:text-gray-700 cursor-pointer">Track</button>
            <button onClick={onSwitchToDashboard} className="hover:text-blue-600 font-medium cursor-pointer">Civic Officer Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
