// frontend/src/services/offlineDb.ts
import { OfflineReport } from '../types';
import { getCitizenId } from './citizenSession';

const DB_NAME = 'CivicLensOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineReports';

type DbChangeListener = () => void;
const dbListeners = new Set<DbChangeListener>();

export function subscribeOfflineDb(listener: DbChangeListener): () => void {
  dbListeners.add(listener);
  return () => {
    dbListeners.delete(listener);
  };
}

function notifyDbChange() {
  dbListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error in offlineDb listener:', e);
    }
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'clientId' });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineReport(report: OfflineReport): Promise<OfflineReport> {
  const db = await openDatabase();
  const citizenId = report.citizenId || getCitizenId();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const updated: OfflineReport = {
      ...report,
      citizenId,
      updatedAt: new Date().toISOString()
    };
    const req = store.put(updated);

    req.onerror = () => reject(req.error || new Error('Failed to save offline report'));
    tx.oncomplete = () => {
      notifyDbChange();
      resolve(updated);
    };
    tx.onerror = () => reject(tx.error || new Error('Offline report transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('Offline report transaction aborted'));
  });
}

export async function getOfflineReport(clientId: string): Promise<OfflineReport | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(clientId);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllOfflineReports(filterCitizenId?: string): Promise<OfflineReport[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      let list: OfflineReport[] = req.result || [];
      if (filterCitizenId) {
        // Enforce strict citizen privacy/isolation: only return reports for this citizen
        list = list.filter((r) => r.citizenId === filterCitizenId);
      }
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateOfflineReportStatus(
  clientId: string,
  updates: Partial<OfflineReport>
): Promise<OfflineReport | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(clientId);
    let updated: OfflineReport | null = null;

    getReq.onsuccess = () => {
      const current = getReq.result as OfflineReport | undefined;
      if (!current) {
        return resolve(null);
      }
      updated = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      const putReq = store.put(updated);
      putReq.onerror = () => reject(putReq.error || new Error('Failed to update offline report'));
    };
    getReq.onerror = () => reject(getReq.error || new Error('Failed to read offline report'));
    tx.oncomplete = () => {
      if (updated) {
        notifyDbChange();
      }
      resolve(updated);
    };
    tx.onerror = () => reject(tx.error || new Error('Offline report transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('Offline report transaction aborted'));
  });
}

export async function deleteOfflineReport(clientId: string): Promise<boolean> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(clientId);

    req.onsuccess = () => {
      notifyDbChange();
      resolve(true);
    };
    req.onerror = () => reject(req.error);
  });
}
