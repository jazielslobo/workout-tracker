import { DB_NAME, DB_VERSION, DEFAULT_SETTINGS, OBJECT_STORES } from '../utils/constants.js';

let dbInstance = null;

function createStore(db, storeName, indexes = []) {
  let store;

  if (!db.objectStoreNames.contains(storeName)) {
    store = db.createObjectStore(storeName, { keyPath: 'id' });
  } else {
    return;
  }

  indexes.forEach(({ name, keyPath, options }) => {
    if (!store.indexNames.contains(name)) {
      store.createIndex(name, keyPath, options);
    }
  });
}

function ensureSettingsSeed(db) {
  const tx = db.transaction(OBJECT_STORES.settings, 'readwrite');
  const store = tx.objectStore(OBJECT_STORES.settings);

  store.get('app-settings').onsuccess = (event) => {
    if (!event.target.result) {
      store.put({ id: 'app-settings', ...DEFAULT_SETTINGS });
    }
  };
}

export function initDatabase() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      createStore(db, OBJECT_STORES.settings, [
        { name: 'by_updatedAt', keyPath: 'updatedAt', options: { unique: false } }
      ]);

      createStore(db, OBJECT_STORES.gyms, [
        { name: 'by_nome', keyPath: 'nome', options: { unique: false } }
      ]);

      createStore(db, OBJECT_STORES.students, [
        { name: 'by_nome', keyPath: 'nome', options: { unique: false } },
        { name: 'by_status', keyPath: 'status', options: { unique: false } },
        { name: 'by_academiaPrincipalId', keyPath: 'academiaPrincipalId', options: { unique: false } }
      ]);

      createStore(db, OBJECT_STORES.exercises, [
        { name: 'by_nome', keyPath: 'nome', options: { unique: false } },
        { name: 'by_grupoMuscular', keyPath: 'grupoMuscular', options: { unique: false } }
      ]);

      createStore(db, OBJECT_STORES.schedules, [
        { name: 'by_studentId', keyPath: 'studentId', options: { unique: false } },
        { name: 'by_horario', keyPath: 'horario', options: { unique: false } },
        { name: 'by_ativo', keyPath: 'ativo', options: { unique: false } }
      ]);

      createStore(db, OBJECT_STORES.workoutTemplates, [
        { name: 'by_studentId', keyPath: 'studentId', options: { unique: false } },
        { name: 'by_diaSemana', keyPath: 'diaSemana', options: { unique: false } }
      ]);

      createStore(db, OBJECT_STORES.workoutLogs, [
        { name: 'by_studentId', keyPath: 'studentId', options: { unique: false } },
        { name: 'by_data', keyPath: 'data', options: { unique: false } },
        { name: 'by_diaSemana', keyPath: 'diaSemana', options: { unique: false } }
      ]);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      ensureSettingsSeed(dbInstance);
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

export function getDatabase() {
  if (!dbInstance) {
    throw new Error('Banco local ainda não foi inicializado.');
  }

  return dbInstance;
}
