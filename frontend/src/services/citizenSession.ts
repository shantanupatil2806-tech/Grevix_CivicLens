// frontend/src/services/citizenSession.ts
// Handles private citizen device identity and isolation

const CITIZEN_ID_KEY = 'civiclens_citizen_id';
const KNOWN_CITIZENS_KEY = 'civiclens_known_citizens';

type CitizenChangeListener = (newCitizenId: string) => void;
const listeners = new Set<CitizenChangeListener>();

function generateCitizenId(): string {
  const randNum = Math.floor(100000 + Math.random() * 900000);
  return `CIT-${randNum}`;
}

export function getCitizenId(): string {
  if (typeof window === 'undefined') return 'CIT-DEMO-001';
  let id = localStorage.getItem(CITIZEN_ID_KEY);
  if (!id) {
    id = generateCitizenId();
    localStorage.setItem(CITIZEN_ID_KEY, id);
    registerKnownCitizen(id);
  }
  return id;
}

export function setCitizenId(id: string): void {
  if (typeof window === 'undefined') return;
  const cleanId = id.trim();
  if (!cleanId) return;
  localStorage.setItem(CITIZEN_ID_KEY, cleanId);
  registerKnownCitizen(cleanId);
  listeners.forEach((fn) => {
    try {
      fn(cleanId);
    } catch (e) {
      console.error('Citizen change listener error:', e);
    }
  });
}

export function createNewCitizenProfile(): string {
  const newId = generateCitizenId();
  setCitizenId(newId);
  return newId;
}

export function getKnownCitizenProfiles(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KNOWN_CITIZENS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const current = getCitizenId();
    if (!list.includes(current)) list.unshift(current);
    return list;
  } catch {
    return [getCitizenId()];
  }
}

function registerKnownCitizen(id: string) {
  try {
    const list = getKnownCitizenProfiles();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(KNOWN_CITIZENS_KEY, JSON.stringify(list));
    }
  } catch {
    // Ignore storage quota or serialization errors
  }
}

export function subscribeCitizen(listener: CitizenChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
