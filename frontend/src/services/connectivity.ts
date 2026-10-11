// frontend/src/services/connectivity.ts
import axios from 'axios';

type ConnectivityListener = (isOnline: boolean) => void;

class ConnectivityService {
  private onlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<ConnectivityListener> = new Set();
  private checkIntervalId: number | null = null;
  private lastChecked: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleBrowserEvent(true));
      window.addEventListener('offline', () => this.handleBrowserEvent(false));

      // Periodic backend health ping every 10 seconds
      this.checkIntervalId = window.setInterval(() => {
        this.verifyBackendReachability();
      }, 10000);

      // Perform initial check
      this.verifyBackendReachability();
    }
  }

  private handleBrowserEvent(browserOnline: boolean) {
    if (!browserOnline) {
      this.setStatus(false);
    } else {
      // Browser reports online, verify actual backend connectivity
      this.verifyBackendReachability();
    }
  }

  public async verifyBackendReachability(): Promise<boolean> {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    // Remove trailing /api to reach /health
    const healthUrl = baseUrl.replace(/\/api\/?$/, '') + '/health';

    try {
      const response = await axios.get(healthUrl, {
        timeout: 3000,
        headers: { 'Cache-Control': 'no-cache' }
      });
      const reachable = response.status === 200 && response.data?.status === 'ok';
      this.setStatus(reachable);
      return reachable;
    } catch {
      this.setStatus(false);
      return false;
    } finally {
      this.lastChecked = Date.now();
    }
  }

  private setStatus(isOnline: boolean) {
    if (this.onlineStatus !== isOnline) {
      this.onlineStatus = isOnline;
      this.notifyListeners();
    }
  }

  public isOnline(): boolean {
    return this.onlineStatus;
  }

  public subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current status
    listener(this.onlineStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.onlineStatus);
      } catch (e) {
        console.error('Error in connectivity listener:', e);
      }
    });
  }

  public cleanup() {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    this.listeners.clear();
  }
}

export const connectivity = new ConnectivityService();
