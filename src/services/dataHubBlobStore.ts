/**
 * OTTO DATA HUB - Persistent Blob & Media Store
 * Uses IndexedDB to store large files (Videos, Audio, PDFs, Images) without 5MB localStorage limits
 * and provides instant ObjectURLs for video streaming and live previews.
 */

const DB_NAME = 'OttoDataHubDB';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

class DataHubBlobStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private urlCache: Map<string, string> = new Map();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public async saveBlob(fileId: string, blob: Blob | File): Promise<string> {
    // Generate immediate memory ObjectURL
    const objUrl = URL.createObjectURL(blob);
    this.urlCache.set(fileId, objUrl);

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(blob, fileId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[DataHubBlobStore] Failed to persist blob to IndexedDB:', err);
    }

    return objUrl;
  }

  public async getBlob(fileId: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return await new Promise<Blob | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(fileId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  public async getBlobUrl(fileId: string): Promise<string | null> {
    // Check in-memory cache first
    if (this.urlCache.has(fileId)) {
      return this.urlCache.get(fileId)!;
    }

    const blob = await this.getBlob(fileId);
    if (blob) {
      const url = URL.createObjectURL(blob);
      this.urlCache.set(fileId, url);
      return url;
    }

    return null;
  }

  public setMemoryUrl(fileId: string, url: string) {
    this.urlCache.set(fileId, url);
  }

  public async deleteBlob(fileId: string): Promise<void> {
    if (this.urlCache.has(fileId)) {
      URL.revokeObjectURL(this.urlCache.get(fileId)!);
      this.urlCache.delete(fileId);
    }

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(fileId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}
  }
}

export const DataHubBlobManager = new DataHubBlobStore();
