// frontend/src/services/geocoding.ts
import axios from 'axios';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  source: 'photon-osm' | 'pincode-registry' | 'map-click';
}

// Well-known Indian city / district centroids as safety fallback
const KNOWN_PINCODES: Record<string, { lat: number; lng: number; name: string }> = {
  // Pune areas
  '411038': { lat: 18.5068, lng: 73.8074, name: 'Kothrud, Pune, Maharashtra' },
  '411001': { lat: 18.5284, lng: 73.8739, name: 'Pune Station, Pune, Maharashtra' },
  '411002': { lat: 18.5098, lng: 73.8567, name: 'Bajirao Road, Pune, Maharashtra' },
  '411004': { lat: 18.5158, lng: 73.8418, name: 'Deccan Gymkhana, Pune, Maharashtra' },
  '411005': { lat: 18.5312, lng: 73.8446, name: 'Shivajinagar, Pune, Maharashtra' },
  '411006': { lat: 18.5529, lng: 73.8796, name: 'Yerwada, Pune, Maharashtra' },
  '411014': { lat: 18.5580, lng: 73.9270, name: 'Viman Nagar, Pune, Maharashtra' },
  '411028': { lat: 18.5089, lng: 73.9260, name: 'Hadapsar, Pune, Maharashtra' },
  '411030': { lat: 18.5100, lng: 73.8470, name: 'Sadashiv Peth, Pune, Maharashtra' },
  '411045': { lat: 18.5590, lng: 73.7868, name: 'Baner, Pune, Maharashtra' },
  '411057': { lat: 18.5913, lng: 73.7389, name: 'Hinjawadi, Pune, Maharashtra' },
  // Hyderabad areas (for demo consistency)
  '500001': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad GPO, Telangana' },
  '500008': { lat: 17.3990, lng: 78.4080, name: 'Tolichowki, Hyderabad, Telangana' },
  '534624': { lat: 17.4065, lng: 78.4112, name: 'Tolichowki / MG Road Area' },
  '500081': { lat: 17.4483, lng: 78.3915, name: 'Madhapur / Hitec City, Hyderabad' },
  // Mumbai
  '400001': { lat: 18.9322, lng: 72.8347, name: 'Fort, Mumbai, Maharashtra' },
  // Bengaluru
  '560001': { lat: 12.9716, lng: 77.5946, name: 'Bangalore GPO, Karnataka' },
  // Delhi
  '110001': { lat: 28.6328, lng: 77.2197, name: 'Connaught Place, New Delhi' },
};

/**
 * Geocodes an address string or pincode to [lat, lng].
 * Uses Komoot Photon (OpenStreetMap-based, open search API) with 
 * a robust local pincode dictionary fallback.
 */
export async function geocodeAddress(input: string): Promise<GeocodeResult | null> {
  const query = (input || '').trim();
  if (!query) return null;

  // 1. Check if input contains a 6-digit Indian PIN code
  const pincodeMatch = query.match(/\b([1-9][0-9]{5})\b/);
  if (pincodeMatch) {
    const pin = pincodeMatch[1];
    if (KNOWN_PINCODES[pin]) {
      return {
        lat: KNOWN_PINCODES[pin].lat,
        lng: KNOWN_PINCODES[pin].lng,
        displayName: KNOWN_PINCODES[pin].name,
        source: 'pincode-registry'
      };
    }
  }

  // 2. Query Photon (Komoot OpenStreetMap Geocoder) with polite timeout
  try {
    const response = await axios.get('https://photon.komoot.io/api/', {
      params: {
        q: query,
        limit: 1
      },
      timeout: 3500
    });

    const features = response.data?.features;
    if (features && features.length > 0) {
      const geom = features[0].geometry;
      const props = features[0].properties;

      // Leaflet requires [lat, lng]; GeoJSON gives coordinates as [lng, lat]
      if (geom && geom.type === 'Point' && Array.isArray(geom.coordinates)) {
        const lng = Number(geom.coordinates[0]);
        const lat = Number(geom.coordinates[1]);

        if (!isNaN(lat) && !isNaN(lng)) {
          const parts = [props.name, props.city, props.state, props.postcode]
            .filter(Boolean)
            .join(', ');

          return {
            lat,
            lng,
            displayName: parts || query,
            source: 'photon-osm'
          };
        }
      }
    }
  } catch (err) {
    // Non-fatal network error, fall through to fallback checks
  }

  // 3. Check for city keywords (e.g., "Pune", "Kothrud", "Hyderabad", "Mumbai")
  const lower = query.toLowerCase();
  if (lower.includes('pune') || lower.includes('kothrud') || lower.includes('baner') || lower.includes('hinjawadi')) {
    return {
      lat: 18.5204,
      lng: 73.8567,
      displayName: 'Pune, Maharashtra',
      source: 'pincode-registry'
    };
  }

  if (lower.includes('hyderabad') || lower.includes('tolichowki')) {
    return {
      lat: 17.3850,
      lng: 78.4867,
      displayName: 'Hyderabad, Telangana',
      source: 'pincode-registry'
    };
  }

  if (lower.includes('mumbai')) {
    return {
      lat: 19.0760,
      lng: 72.8777,
      displayName: 'Mumbai, Maharashtra',
      source: 'pincode-registry'
    };
  }

  if (lower.includes('delhi')) {
    return {
      lat: 28.6139,
      lng: 77.2090,
      displayName: 'New Delhi, Delhi',
      source: 'pincode-registry'
    };
  }

  return null;
}
