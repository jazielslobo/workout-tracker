import { APP_VERSION, OBJECT_STORES } from '../utils/constants.js';
import { clearStore, getAllRecords, putRecord } from '../db/repository.js';

const BACKUP_STORES = [
  OBJECT_STORES.students,
  OBJECT_STORES.gyms,
  OBJECT_STORES.exercises,
  OBJECT_STORES.schedules,
  OBJECT_STORES.workoutTemplates,
  OBJECT_STORES.workoutLogs,
  OBJECT_STORES.settings
];

function app() {
  return window.jpApp;
}

function showToast(text, icon = 'checkmark_circle_fill') {
  app().toast.create({
    text: `<div class="jp-toast-body"><i class="f7-icons">${icon}</i><span>${text}</span></div>`,
    closeTimeout: 2500,
    position: 'center'
  }).open();
}

function showError(message) {
  app().dialog.alert(message, 'Jeferson Personal');
}

function downloadTextFile(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value = '') {
  const stringValue = String(value ?? '');
  if (/[",;\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}
export async function exportFullBackup() {
  const stores = {};
  for (const storeName of BACKUP_STORES) {
    stores[storeName] = await getAllRecords(storeName);
  }

  const payload = {
    app: 'Jeferson Personal',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    stores
  };

  downloadTextFile(`jeferson-personal-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
  showToast('Backup JSON exportado com sucesso.');
}

async function replaceAllStores(storesPayload = {}) {
  for (const storeName of BACKUP_STORES) {
    await clearStore(storeName);
    const records = Array.isArray(storesPayload[storeName]) ? storesPayload[storeName] : [];
    for (const record of records) {
      await putRecord(storeName, record);
    }
  }
}

export function triggerBackupImport(onDone) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      if (!payload?.stores || typeof payload.stores !== 'object') {
        throw new Error('O arquivo não parece ser um backup válido do app.');
      }

      app().dialog.confirm(
        'Importar este backup irá sobrescrever os dados atuais do aplicativo. Deseja continuar?',
        'Jeferson Personal',
        async () => {
          try {
            await replaceAllStores(payload.stores);
            showToast('Backup restaurado com sucesso.');
            await onDone?.();
          } catch (error) {
            console.error(error);
            showError('Não foi possível restaurar o backup JSON.');
          }
        }
      );
    } catch (error) {
      console.error(error);
      showError(error.message || 'Não foi possível ler o arquivo JSON informado.');
    }
  });
  input.click();
}

export async function exportStudentsCsv() {
  const [students, gyms] = await Promise.all([
    getAllRecords(OBJECT_STORES.students),
    getAllRecords(OBJECT_STORES.gyms)
  ]);
  const gymsMap = Object.fromEntries(gyms.map((gym) => [gym.id, gym]));
  const headers = ['id', 'nome', 'telefone', 'status', 'academiaPrincipal', 'observacoes', 'createdAt'];
  const rows = students.map((student) => [
    student.id,
    student.nome,
    student.telefone,
    student.status,
    gymsMap[student.academiaPrincipalId]?.nome || '',
    student.observacoes || '',
    student.createdAt || ''
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
  downloadTextFile(`jeferson-personal-alunos-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
  showToast('CSV de alunos exportado.');
}

export async function exportGymsCsv() {
  const gyms = await getAllRecords(OBJECT_STORES.gyms);
  const headers = ['id', 'nome', 'endereco', 'googleMapsUrl', 'wazeUrl', 'observacoes'];
  const rows = gyms.map((gym) => [
    gym.id,
    gym.nome,
    gym.endereco || '',
    gym.googleMapsUrl || '',
    gym.wazeUrl || '',
    gym.observacoes || ''
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
  downloadTextFile(`jeferson-personal-academias-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
  showToast('CSV de academias exportado.');
}
