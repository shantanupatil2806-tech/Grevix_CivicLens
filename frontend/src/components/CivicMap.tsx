// CivicMap.tsx
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Issue, Category } from '../types';
import { MapPin } from 'lucide-react';
import { normalizeCategory, CATEGORY_COLORS } from '../utils/category';

interface Props {
  issues: Issue[];
  selectedIssue: Issue | null;
  onSelectIssue: (issue: Issue) => void;
  onOpenReportModal?: (coords?: { lat: number; lng: number }) => void;
}

/**
 * Derives marker color from the issue's category:
 * - Roads / Potholes: Orange (#F97316)
 * - Garbage / Waste: Green (#22C55E)
 * - Water Supply / Leakage: Blue (#0EA5E9)
 * - Streetlights / Electricity: Yellow (#EAB308)
 * - Other: Purple (#8B5CF6)
 */
export function getIssueMarkerColor(issue: Issue): string {
  const norm = normalizeCategory(issue.category);
  return CATEGORY_COLORS[norm] || CATEGORY_COLORS.Other;
}

/**
 * Category-specific SVG glyphs
 */
export function getCategoryGlyph(category?: string | null): string {
  const norm = normalizeCategory(category);
  switch (norm) {
    case 'Roads':
      // Road / pothole icon
      return `<path d="M4 19L8 5M16 5l4 14M12 7v3m0 4v3" stroke-width="2.5" stroke-linecap="round"/>`;
    case 'Garbage':
      // Trash bin icon
      return `<path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'Water':
      // Water droplet icon
      return `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'Electricity':
      // Lightning bolt icon
      return `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'Other':
    default:
      // Generic alert / pin icon
      return `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
}

function createCustomPin(issue: Issue, isSelected: boolean): L.DivIcon {
  const color = getIssueMarkerColor(issue);
  const isResolved = issue.status === 'Resolved';
  const score = issue.priorityScore ?? issue.severityScore;
  const isCritical = !isResolved && score >= 80;
  const size = isSelected ? 42 : isCritical ? 36 : 32;

  const glyph = getCategoryGlyph(issue.category);

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer; transform: translate(-50%, -50%);">
      ${
        isSelected
          ? `<div style="position: absolute; inset: -7px; border-radius: 9999px; background: ${color}33; border: 2px dashed ${color}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
          : ''
      }
      <div style="
        width: 100%;
        height: 100%;
        border-radius: 9999px;
        background: ${color};
        border: ${isSelected ? '3px solid #ffffff' : '2px solid #ffffff'};
        box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: all 0.2s ease;
      " class="${isCritical ? 'marker-pulse-critical' : ''}">
        <svg width="${size * 0.52}" height="${size * 0.52}" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          ${glyph}
        </svg>
      </div>

      ${
        isResolved
          ? `<div style="position: absolute; -top: 3px; -right: 3px; width: 14px; height: 14px; background: #059669; border: 2px solid white; border-radius: 9999px; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">✓</div>`
          : ''
      }

      ${
        issue.duplicateOf
          ? `<div style="position: absolute; -bottom: 2px; -right: 2px; width: 11px; height: 11px; background: #f59e0b; border: 1.5px solid white; border-radius: 9999px; title: 'Potential Duplicate';"></div>`
          : ''
      }
    </div>
  `;

  return L.divIcon({
    className: 'custom-map-pin',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function MapController({ selectedIssue }: { selectedIssue: Issue | null }) {
  const map = useMap();
  useEffect(() => {
    if (
      selectedIssue &&
      selectedIssue.coordinates &&
      typeof selectedIssue.coordinates.lat === 'number' &&
      typeof selectedIssue.coordinates.lng === 'number' &&
      !isNaN(selectedIssue.coordinates.lat) &&
      !isNaN(selectedIssue.coordinates.lng)
    ) {
      map.flyTo([selectedIssue.coordinates.lat, selectedIssue.coordinates.lng], 16, {
        duration: 1.2
      });
    }
  }, [selectedIssue, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

export default function CivicMap({
  issues,
  selectedIssue,
  onSelectIssue,
  onOpenReportModal
}: Props) {
  // Only plot issues with valid, non-null numeric coordinates
  const plottableIssues = useMemo(() => {
    return issues.filter(
      (issue): issue is Issue & { coordinates: { lat: number; lng: number } } =>
        issue.coordinates !== null &&
        issue.coordinates !== undefined &&
        typeof issue.coordinates.lat === 'number' &&
        typeof issue.coordinates.lng === 'number' &&
        !isNaN(issue.coordinates.lat) &&
        !isNaN(issue.coordinates.lng)
    );
  }, [issues]);

  // Handle overlapping coordinates with a deterministic micro-offset
  const mappedPoints = useMemo(() => {
    const coordCounts = new Map<string, number>();

    return plottableIssues.map((issue) => {
      const key = `${issue.coordinates.lat.toFixed(5)},${issue.coordinates.lng.toFixed(5)}`;
      const index = coordCounts.get(key) || 0;
      coordCounts.set(key, index + 1);

      if (index === 0) {
        return { issue, position: [issue.coordinates.lat, issue.coordinates.lng] as [number, number] };
      }

      // Micro spiral offset for coincident markers (approx 15-20 meters)
      const angle = (index * 60) * (Math.PI / 180);
      const radius = 0.00015 * Math.ceil(index / 6);
      const latOffset = radius * Math.cos(angle);
      const lngOffset = radius * Math.sin(angle);

      return {
        issue,
        position: [issue.coordinates.lat + latOffset, issue.coordinates.lng + lngOffset] as [number, number]
      };
    });
  }, [plottableIssues]);

  const defaultCenter = selectedIssue?.coordinates && !isNaN(selectedIssue.coordinates.lat)
    ? [selectedIssue.coordinates.lat, selectedIssue.coordinates.lng]
    : [17.4065, 78.4112];

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-100">
      <MapContainer
        center={defaultCenter as [number, number]}
        zoom={14}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <MapController selectedIssue={selectedIssue} />
        {onOpenReportModal && <MapClickHandler onMapClick={onOpenReportModal} />}

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {mappedPoints.map(({ issue, position }) => {
          const isSelected = selectedIssue?._id === issue._id;
          const score = issue.priorityScore ?? issue.severityScore;
          const isResolved = issue.status === 'Resolved';

          return (
            <Marker
              key={issue._id}
              position={position}
              icon={createCustomPin(issue, isSelected)}
              eventHandlers={{
                click: () => onSelectIssue(issue)
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -18]}
                opacity={0.96}
                className="custom-leaflet-tooltip shadow-lg rounded-xl border border-gray-200"
              >
                <div className="px-1 py-0.5 max-w-[220px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-xs text-gray-900 truncate">
                      {issue.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    <span className="font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                      {issue.category}
                    </span>
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800'
                          : score >= 80
                          ? 'bg-red-100 text-red-800'
                          : score >= 60
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isResolved ? 'Resolved' : `Priority ${score}/100`}
                    </span>
                    <span className="text-gray-500 font-medium ml-auto">
                      {issue.status}
                    </span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Instructions & Dynamic Legend Bar */}
      <div className="absolute bottom-3 left-4 right-4 z-10 pointer-events-none flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md border border-gray-200/80 flex items-center gap-2 text-gray-600">
          <MapPin size={13} className="text-blue-600 shrink-0" />
          <span className="font-medium text-[11px]">Click anywhere on map to report an issue</span>
        </div>

        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-gray-200/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-700">
          {/* Category Pin Color Legend */}
          <div className="flex items-center gap-2.5 border-r border-gray-200 pr-3">
            <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wide">Category:</span>
            <div className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#F97316' }} />
              <span>Roads</span>
            </div>
            <div className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#22C55E' }} />
              <span>Garbage</span>
            </div>
            <div className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#0EA5E9' }} />
              <span>Water</span>
            </div>
            <div className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#EAB308' }} />
              <span>Electricity</span>
            </div>
            <div className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: '#8B5CF6' }} />
              <span>Other</span>
            </div>
          </div>

          {/* Priority / Status indicator */}
          <div className="flex items-center gap-2.5">
            <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wide">Status:</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs flex items-center justify-center text-[7px] text-white">✓</span>
              <span className="font-medium text-emerald-700">Resolved</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-red-100" />
              <span className="font-medium text-red-700">Critical (≥80)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
