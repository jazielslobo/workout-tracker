import { getDatabase } from './indexeddb.js';

export function generateId(prefix = 'id') {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

function createTransaction(storeName, mode = 'readonly') {
  const db = getDatabase();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addRecord(storeName, record) {
  const store = createTransaction(storeName, 'readwrite');
  return requestToPromise(store.add(record));
}

export async function putRecord(storeName, record) {
  const store = createTransaction(storeName, 'readwrite');
  return requestToPromise(store.put(record));
}

export async function updateRecord(storeName, id, partialData) {
  const current = await getRecordById(storeName, id);
  if (!current) return null;

  const updatedRecord = {
    ...current,
    ...partialData,
    updatedAt: new Date().toISOString()
  };

  await putRecord(storeName, updatedRecord);
  return updatedRecord;
}

export async function deleteRecord(storeName, id) {
  const store = createTransaction(storeName, 'readwrite');
  return requestToPromise(store.delete(id));
}

export async function getRecordById(storeName, id) {
  const store = createTransaction(storeName);
  return requestToPromise(store.get(id));
}

export async function getAllRecords(storeName) {
  const store = createTransaction(storeName);
  const results = await requestToPromise(store.getAll());
  return Array.isArray(results) ? results : [];
}

export async function filterRecords(storeName, predicate) {
  const all = await getAllRecords(storeName);
  return all.filter(predicate);
}

export async function countRecords(storeName) {
  const store = createTransaction(storeName);
  return requestToPromise(store.count());
}

export async function clearStore(storeName) {
  const store = createTransaction(storeName, 'readwrite');
  return requestToPromise(store.clear());
}

export async function replaceStoreRecords(storeName, records = []) {
  await clearStore(storeName);
  for (const record of records) {
    await putRecord(storeName, record);
  }
  return records.length;
}
