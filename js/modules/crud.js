import { OBJECT_STORES, STATUS } from '../utils/constants.js';
import { addRecord, deleteRecord, filterRecords, generateId, getAllRecords, updateRecord } from '../db/repository.js';
import { createGoogleMapsUrl, createWazeUrl, digitsOnly, normalizeText } from '../utils/formatters.js';

function nowIso() {
  return new Date().toISOString();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function app() {
  return window.jpApp;
}

function showToast(text, icon = 'checkmark_circle_fill') {
  app().toast.create({
    text: `<div class="jp-toast-body"><i class="f7-icons">${icon}</i><span>${text}</span></div>`,
    closeTimeout: 2300,
    position: 'center'
  }).open();
}

function showError(message) {
  app().dialog.alert(message, 'Jeferson Personal');
}

function isValidUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function formatPhoneInput(value = '') {
  const digits = digitsOnly(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function createPopup({ title, subtitle, content, submitLabel, submitColor = 'fill', onSubmit, afterOpen }) {
  const popup = app().popup.create({
    closeByBackdropClick: false,
    swipeToClose: 'to-bottom',
    content: `
      <div class="popup popup-tablet-fullscreen jp-popup-form">
        <div class="view">
          <div class="page">
            <div class="navbar navbar-large transparent">
              <div class="navbar-bg"></div>
              <div class="navbar-inner sliding jp-shell">
                <div class="left"><a href="#" class="link popup-close">Cancelar</a></div>
                <div class="title jp-navbar-title">
                  <strong>${escapeHtml(title)}</strong>
                  <small>${escapeHtml(subtitle)}</small>
                </div>
              </div>
            </div>
            <div class="page-content">
              <div class="jp-shell">
                <form class="jp-form" data-entity-form>
                  ${content}
                  <div class="jp-form-footer">
                    <button type="submit" class="button button-${submitColor} button-round button-large">${escapeHtml(submitLabel)}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  });

  popup.open();

  popup.on('opened', () => {
    const form = popup.el.querySelector('[data-entity-form]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const maybeClose = await onSubmit(new FormData(form), popup.el, form);
        if (maybeClose !== false) popup.close();
      } catch (error) {
        console.error(error);
        showError(error.message || 'Ocorreu um erro ao salvar.');
      }
    });

    afterOpen?.(popup.el, form);
  });

  popup.on('closed', () => popup.destroy());
}

export async function openStudentForm({ student = null, gyms = [], onSaved }) {
  const isEdit = Boolean(student);
  createPopup({
    title: isEdit ? 'Editar aluno' : 'Novo aluno',
    subtitle: isEdit ? 'Atualize o cadastro e o status do aluno' : 'Cadastro rápido e confortável no celular',
    submitLabel: isEdit ? 'Salvar alterações' : 'Criar aluno',
    content: `
      <section class="jp-form-section jp-card jp-panel-card">
        <div class="jp-form-grid">
          <label class="jp-field">
            <span>Nome completo *</span>
            <input name="nome" type="text" maxlength="120" value="${escapeHtml(student?.nome || '')}" placeholder="Ex.: Camila Andrade" required />
          </label>
          <label class="jp-field">
            <span>Telefone / WhatsApp</span>
            <input name="telefone" type="tel" inputmode="numeric" maxlength="16" value="${escapeHtml(student?.telefone || '')}" placeholder="(79) 99999-9999" />
          </label>
          <label class="jp-field">
            <span>Status</span>
            <select name="status">
              <option value="active" ${student?.status !== STATUS.INACTIVE ? 'selected' : ''}>Ativo</option>
              <option value="inactive" ${student?.status === STATUS.INACTIVE ? 'selected' : ''}>Inativo</option>
            </select>
          </label>
          <label class="jp-field">
            <span>Academia principal</span>
            <select name="academiaPrincipalId">
              <option value="">Sem academia principal</option>
              ${gyms.map((gym) => `<option value="${gym.id}" ${student?.academiaPrincipalId === gym.id ? 'selected' : ''}>${escapeHtml(gym.nome)}</option>`).join('')}
            </select>
          </label>
          <label class="jp-field jp-field-full">
            <span>Observações</span>
            <textarea name="observacoes" rows="4" placeholder="Objetivo, restrições, observações gerais">${escapeHtml(student?.observacoes || '')}</textarea>
          </label>
        </div>
      </section>
    `,
    onSubmit: async (formData, popupEl) => {
      const nome = (formData.get('nome') || '').toString().trim();
      const telefone = formatPhoneInput((formData.get('telefone') || '').toString());
      const status = (formData.get('status') || STATUS.ACTIVE).toString();
      const academiaPrincipalId = (formData.get('academiaPrincipalId') || '').toString() || null;
      const observacoes = (formData.get('observacoes') || '').toString().trim();

      if (!nome) throw new Error('Informe o nome completo do aluno.');
      const digits = digitsOnly(telefone);
      if (telefone && digits.length < 10) throw new Error('Informe um telefone válido com DDD.');
      if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) throw new Error('Selecione um status válido.');

      const baseRecord = {
        nome,
        telefone,
        status,
        observacoes,
        academiaPrincipalId,
        updatedAt: nowIso()
      };

      if (isEdit) {
        await updateRecord(OBJECT_STORES.students, student.id, {
          ...baseRecord,
          inactivatedAt: status === STATUS.INACTIVE ? (student.inactivatedAt || nowIso()) : null
        });
        showToast('Aluno atualizado com sucesso.');
      } else {
        await addRecord(OBJECT_STORES.students, {
          id: generateId('student'),
          ...baseRecord,
          createdAt: nowIso(),
          inactivatedAt: status === STATUS.INACTIVE ? nowIso() : null
        });
        showToast('Aluno criado com sucesso.');
      }

      await onSaved?.();
    },
    afterOpen: (popupEl) => {
      const phoneInput = popupEl.querySelector('input[name="telefone"]');
      phoneInput?.addEventListener('input', (event) => {
        event.target.value = formatPhoneInput(event.target.value);
      });
    }
  });
}

export async function toggleStudentStatus(student, onSaved) {
  const nextStatus = student.status === STATUS.ACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE;
  const label = nextStatus === STATUS.INACTIVE ? 'inativar' : 'reativar';

  app().dialog.confirm(
    `Deseja ${label} o aluno <strong>${escapeHtml(student.nome)}</strong>?`,
    'Jeferson Personal',
    async () => {
      await updateRecord(OBJECT_STORES.students, student.id, {
        status: nextStatus,
        inactivatedAt: nextStatus === STATUS.INACTIVE ? nowIso() : null
      });
      showToast(nextStatus === STATUS.INACTIVE ? 'Aluno inativado.' : 'Aluno reativado.');
      await onSaved?.();
    }
  );
}

export async function deleteStudent(student, onSaved) {
  app().dialog.confirm(
    `Excluir o aluno <strong>${escapeHtml(student.nome)}</strong>? Os agendamentos, modelos e logs relacionados também serão removidos.`,
    'Jeferson Personal',
    async () => {
      const [schedules, templates, logs] = await Promise.all([
        filterRecords(OBJECT_STORES.schedules, (item) => item.studentId === student.id),
        filterRecords(OBJECT_STORES.workoutTemplates, (item) => item.studentId === student.id),
        filterRecords(OBJECT_STORES.workoutLogs, (item) => item.studentId === student.id)
      ]);

      for (const schedule of schedules) await deleteRecord(OBJECT_STORES.schedules, schedule.id);
      for (const template of templates) await deleteRecord(OBJECT_STORES.workoutTemplates, template.id);
      for (const log of logs) await deleteRecord(OBJECT_STORES.workoutLogs, log.id);
      await deleteRecord(OBJECT_STORES.students, student.id);
      showToast('Aluno excluído com sucesso.');
      await onSaved?.();
    }
  );
}

export async function openGymForm({ gym = null, onSaved }) {
  const isEdit = Boolean(gym);
  createPopup({
    title: isEdit ? 'Editar academia' : 'Nova academia',
    subtitle: isEdit ? 'Atualize endereço, links e observações' : 'Cadastre uma unidade para organizar os treinos',
    submitLabel: isEdit ? 'Salvar alterações' : 'Criar academia',
    content: `
      <section class="jp-form-section jp-card jp-panel-card">
        <div class="jp-form-grid">
          <label class="jp-field jp-field-full">
            <span>Nome da academia *</span>
            <input name="nome" type="text" maxlength="120" value="${escapeHtml(gym?.nome || '')}" placeholder="Ex.: Academia Alpha Fit" required />
          </label>
          <label class="jp-field jp-field-full">
            <span>Endereço completo</span>
            <textarea name="endereco" rows="3" placeholder="Rua, número, bairro, cidade e estado">${escapeHtml(gym?.endereco || '')}</textarea>
          </label>
          <label class="jp-field jp-field-full">
            <span>Link Google Maps</span>
            <input name="googleMapsUrl" type="url" value="${escapeHtml(gym?.googleMapsUrl || '')}" placeholder="https://maps.google.com/..." />
          </label>
          <label class="jp-field jp-field-full">
            <span>Link Waze</span>
            <input name="wazeUrl" type="url" value="${escapeHtml(gym?.wazeUrl || '')}" placeholder="https://waze.com/..." />
          </label>
          <label class="jp-field jp-field-full">
            <span>Observações</span>
            <textarea name="observacoes" rows="4" placeholder="Horários, observações do local, estacionamento...">${escapeHtml(gym?.observacoes || '')}</textarea>
          </label>
        </div>
      </section>
    `,
    onSubmit: async (formData) => {
      const nome = (formData.get('nome') || '').toString().trim();
      const endereco = (formData.get('endereco') || '').toString().trim();
      let googleMapsUrl = (formData.get('googleMapsUrl') || '').toString().trim();
      let wazeUrl = (formData.get('wazeUrl') || '').toString().trim();
      const observacoes = (formData.get('observacoes') || '').toString().trim();

      if (!nome) throw new Error('Informe o nome da academia.');
      if (googleMapsUrl && !isValidUrl(googleMapsUrl)) throw new Error('O link do Google Maps precisa ser uma URL válida.');
      if (wazeUrl && !isValidUrl(wazeUrl)) throw new Error('O link do Waze precisa ser uma URL válida.');
      if (!googleMapsUrl && endereco) googleMapsUrl = createGoogleMapsUrl(endereco);
      if (!wazeUrl && endereco) wazeUrl = createWazeUrl(endereco);

      const baseRecord = { nome, endereco, googleMapsUrl, wazeUrl, observacoes, updatedAt: nowIso() };

      if (isEdit) {
        await updateRecord(OBJECT_STORES.gyms, gym.id, baseRecord);
        showToast('Academia atualizada com sucesso.');
      } else {
        await addRecord(OBJECT_STORES.gyms, {
          id: generateId('gym'),
          ...baseRecord,
          createdAt: nowIso()
        });
        showToast('Academia criada com sucesso.');
      }

      await onSaved?.();
    }
  });
}

export async function deleteGym(gym, onSaved) {
  app().dialog.confirm(
    `Excluir a academia <strong>${escapeHtml(gym.nome)}</strong>?`,
    'Jeferson Personal',
    async () => {
      const [students, schedules, logs] = await Promise.all([
        filterRecords(OBJECT_STORES.students, (item) => item.academiaPrincipalId === gym.id),
        filterRecords(OBJECT_STORES.schedules, (item) => item.gymId === gym.id),
        filterRecords(OBJECT_STORES.workoutLogs, (item) => item.gymId === gym.id)
      ]);

      if (students.length || schedules.length || logs.length) {
        showError('Esta academia ainda está vinculada a alunos, agendas ou logs. Ajuste esses registros antes de excluir.');
        return;
      }

      await deleteRecord(OBJECT_STORES.gyms, gym.id);
      showToast('Academia excluída com sucesso.');
      await onSaved?.();
    }
  );
}

export async function openExerciseForm({ exercise = null, groups = [], onSaved }) {
  const isEdit = Boolean(exercise);
  const datalistId = `exercise-groups-${Date.now()}`;
  createPopup({
    title: isEdit ? 'Editar exercício' : 'Novo exercício',
    subtitle: isEdit ? 'Ajuste nome, grupo e observações' : 'Amplie sua base de musculação',
    submitLabel: isEdit ? 'Salvar alterações' : 'Criar exercício',
    content: `
      <section class="jp-form-section jp-card jp-panel-card">
        <div class="jp-form-grid">
          <label class="jp-field jp-field-full">
            <span>Nome do exercício *</span>
            <input name="nome" type="text" maxlength="120" value="${escapeHtml(exercise?.nome || '')}" placeholder="Ex.: Supino inclinado com halteres" required />
          </label>
          <label class="jp-field jp-field-full">
            <span>Grupo muscular *</span>
            <input name="grupoMuscular" type="text" maxlength="60" list="${datalistId}" value="${escapeHtml(exercise?.grupoMuscular || '')}" placeholder="Ex.: Peito" required />
            <datalist id="${datalistId}">
              ${groups.map((group) => `<option value="${escapeHtml(group)}"></option>`).join('')}
            </datalist>
          </label>
          <label class="jp-field jp-field-full">
            <span>Observações</span>
            <textarea name="observacoes" rows="4" placeholder="Variações, ajustes de execução, observações úteis">${escapeHtml(exercise?.observacoes || '')}</textarea>
          </label>
        </div>
      </section>
    `,
    onSubmit: async (formData) => {
      const nome = (formData.get('nome') || '').toString().trim();
      const grupoMuscular = (formData.get('grupoMuscular') || '').toString().trim();
      const observacoes = (formData.get('observacoes') || '').toString().trim();

      if (!nome) throw new Error('Informe o nome do exercício.');
      if (!grupoMuscular) throw new Error('Informe o grupo muscular.');

      const baseRecord = { nome, grupoMuscular, observacoes, updatedAt: nowIso() };
      if (isEdit) {
        await updateRecord(OBJECT_STORES.exercises, exercise.id, baseRecord);
        showToast('Exercício atualizado com sucesso.');
      } else {
        await addRecord(OBJECT_STORES.exercises, {
          id: generateId('exercise'),
          ...baseRecord,
          createdAt: nowIso()
        });
        showToast('Exercício criado com sucesso.');
      }
      await onSaved?.();
    }
  });
}

export async function deleteExercise(exercise, onSaved) {
  app().dialog.confirm(
    `Excluir o exercício <strong>${escapeHtml(exercise.nome)}</strong>?`,
    'Jeferson Personal',
    async () => {
      const [templates, logs] = await Promise.all([
        getAllRecords(OBJECT_STORES.workoutTemplates),
        getAllRecords(OBJECT_STORES.workoutLogs)
      ]);

      const usedInTemplates = templates.some((template) => (template.exercicios || []).some((item) => item.exerciseId === exercise.id));
      const usedInLogs = logs.some((log) => (log.exerciciosRealizados || []).some((item) => item.exerciseId === exercise.id));

      if (usedInTemplates || usedInLogs) {
        showError('Este exercício já foi usado em modelos de treino ou histórico e não pode ser excluído agora.');
        return;
      }

      await deleteRecord(OBJECT_STORES.exercises, exercise.id);
      showToast('Exercício excluído com sucesso.');
      await onSaved?.();
    }
  );
}

export function createWhatsAppLink(phone = '') {
  const digits = digitsOnly(phone);
  return digits ? `https://wa.me/55${digits.length === 11 ? digits : digits}` : '';
}
