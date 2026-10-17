// storage.js — persistence only.
// Small structured data -> localStorage. Cover/profile images (blobs) -> IndexedDB.

const STORAGE_KEY = 'comicTracker.v1';
const DB_NAME = 'comicTrackerImages';
const STORE = 'images';

const defaultState = () => ({
  comics: [],   // { id, title, coverId, author, releaseDate, type, review, rating, status, favorite, folderId, createdAt }
  folders: [],  // { id, name }
  profile: { name: 'Reader', pfpId: null, faves: [] } // faves = up to 4 comic ids
});

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function loadState() {
  try {
    return { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return defaultState(); // corrupted data: start fresh instead of crashing
  }
}

/** The single source of truth. Modules mutate it, then call commit(). */
export const state = loadState();

/** Save to localStorage and tell the app to re-render. */
export function commit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    alert('Could not save your data: browser storage is full or unavailable.');
  }
  document.dispatchEvent(new Event('state-changed'));
}

// ---------- Images (IndexedDB) ----------
let dbPromise;
const urlCache = new Map(); // image id -> object URL

function openDb() {
  dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveImage(file) {
  const id = uid();
  await run('readwrite', store => store.put(file, id));
  return id;
}

/** Returns an object URL for the image, or null if missing. */
export async function getImageUrl(id) {
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  try {
    const blob = await run('readonly', store => store.get(id));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  } catch {
    return null;
  }
}

export async function deleteImage(id) {
  if (!id) return;
  if (urlCache.has(id)) URL.revokeObjectURL(urlCache.get(id));
  urlCache.delete(id);
  try { await run('readwrite', store => store.delete(id)); } catch { /* ignore */ }
}
