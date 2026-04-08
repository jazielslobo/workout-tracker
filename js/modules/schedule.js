import { OBJECT_STORES, STATUS, WEEK_DAYS } from '../utils/constants.js';
import { addRecord, deleteRecord, filterRecords, generateId, getAllRecords, updateRecord } from '../db/repository.js';
import { openWhatsAppForWorkoutSummary } from './whatsapp.js';
import { createGoogleMapsUrl, createWazeUrl, digitsOnly, formatIsoDate, formatPhone, getWeekDayLabel } from '../utils/formatters.js';

function nowIso() {
  return new Date().toISOString();
}

function app() {
  return window.jpApp;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function confirmDialog(text, title = 'Jeferson Personal') {
  return new Promise((resolve) => {
    app().dialog.confirm(text, title, () => resolve(true), () => resolve(false));
  });
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
        showError(error.message || 'Não foi possível salvar agora.');
      }
    });
    afterOpen?.(popup.el, form);
  });
  popup.on('closed', () => popup.destroy());
  return popup;
}

function buildDayCheckboxes(selectedDays = []) {
  return `
    <div class="jp-weekday-grid">
      ${WEEK_DAYS.map((day) => `
        <label class="jp-weekday-check ${selectedDays.includes(day.key) ? 'is-active' : ''}">
          <input type="checkbox" name="diasSemana" value="${day.key}" ${selectedDays.includes(day.key) ? 'checked' : ''} />
          <span>${day.short}</span>
          <small>${day.label}</small>
        </label>
      `).join('')}
    </div>
  `;
}

function ensureTimeValue(value = '') {
  if (!value) return '';
  const clean = value.replace(/[^\d:]/g, '');
  if (/^\d{2}:\d{2}$/.test(clean)) return clean;
  const digits = clean.replace(/\D/g, '').slice(0, 4);
  if (digits.length < 4) return clean;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

function isValidTime(value = '') {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function buildWorkoutView({ template, exercisesMap, existingLog }) {
  if (!template) {
    return '<div class="jp-mini-empty">Treino do dia ainda não configurado para este aluno.</div>';
  }

  const logLoads = Object.fromEntries((existingLog?.exerciciosRealizados || []).map((item) => [item.exerciseId, item]));
  return `
    <div class="jp-workout-head">
      <strong>${escapeHtml(template.nomeTreino)}</strong>
      <span>${(template.exercicios || []).length} exercício(s)</span>
    </div>
    <div class="jp-exercise-stack">
      ${(template.exercicios || []).map((item, index) => {
        const exercise = exercisesMap[item.exerciseId];
        const logEntry = logLoads[item.exerciseId] || {};
        return `
          <article class="jp-exercise-item">
            <div class="jp-exercise-order">${index + 1}</div>
            <div class="jp-exercise-body">
              <strong>${escapeHtml(exercise?.nome || logEntry.nome || 'Exercício')}</strong>
              <div class="jp-exercise-meta">
                <span>${item.series || '-'} séries</span>
                <span>${escapeHtml(item.repeticoes || '-')} reps</span>
                <span>Carga: ${escapeHtml(logEntry.carga || item.carga || '—')}</span>
              </div>
              <p>${escapeHtml(item.observacoes || '') || 'Sem observações.'}</p>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function buildLogPayload({ existingLog, studentId, dayKey, horario, gymId, template, exercisesMap, cargas = {}, concluido = false, observacoes = '' }) {
  const exerciciosRealizados = (template?.exercicios || []).map((item) => ({
    exerciseId: item.exerciseId,
    nome: exercisesMap[item.exerciseId]?.nome || 'Exercício',
    seriesPlanejadas: item.series || '',
    seriesRealizadas: existingLog?.concluido ? (existingLog.exerciciosRealizados || []).find((ex) => ex.exerciseId === item.exerciseId)?.seriesRealizadas ?? item.series : item.series,
    repeticoes: item.repeticoes || '',
    carga: cargas[item.exerciseId] ?? (existingLog?.exerciciosRealizados || []).find((ex) => ex.exerciseId === item.exerciseId)?.carga ?? item.carga ?? ''
  }));

  return {
    id: existingLog?.id || generateId('log'),
    studentId,
    data: formatIsoDate(new Date()),
    diaSemana: dayKey,
    horario,
    gymId,
    exerciciosRealizados,
    concluido,
    observacoes,
    createdAt: existingLog?.createdAt || nowIso(),
    updatedAt: nowIso()
  };
}

async function saveLogPayload(payload) {
  if (payload.id && (await filterRecords(OBJECT_STORES.workoutLogs, (item) => item.id === payload.id)).length) {
    await updateRecord(OBJECT_STORES.workoutLogs, payload.id, payload);
  } else {
    await addRecord(OBJECT_STORES.workoutLogs, payload);
  }
}

export async function openScheduleForm({ schedule = null, students = [], gyms = [], initialDayKey = 'monday', onSaved }) {
  const isEdit = Boolean(schedule);
  const selectedDays = schedule?.diasSemana?.length ? schedule.diasSemana : [initialDayKey];
  createPopup({
    title: isEdit ? 'Editar horário recorrente' : 'Nova agenda recorrente',
    subtitle: isEdit ? 'Ajuste aluno, dias, horário e local' : 'Cadastre o horário semanal e confirme treinos juntos quando houver conflito',
    submitLabel: isEdit ? 'Salvar agenda' : 'Criar agenda',
    content: `
      <section class="jp-form-section jp-card jp-panel-card">
        <div class="jp-form-grid">
          <label class="jp-field jp-field-full">
            <span>Aluno *</span>
            <select name="studentId" required>
              <option value="">Selecione o aluno</option>
              ${students.map((student) => `<option value="${student.id}" ${schedule?.studentId === student.id ? 'selected' : ''}>${escapeHtml(student.nome)}${student.status === STATUS.INACTIVE ? ' · inativo' : ''}</option>`).join('')}
            </select>
          </label>
          <label class="jp-field">
            <span>Horário *</span>
            <input name="horario" type="time" value="${escapeHtml(schedule?.horario || '')}" required />
          </label>
          <label class="jp-field">
            <span>Academia *</span>
            <select name="gymId" required>
              <option value="">Selecione a academia</option>
              ${gyms.map((gym) => `<option value="${gym.id}" ${schedule?.gymId === gym.id ? 'selected' : ''}>${escapeHtml(gym.nome)}</option>`).join('')}
            </select>
          </label>
          <label class="jp-field jp-field-full">
            <span>Dias da semana *</span>
            ${buildDayCheckboxes(selectedDays)}
          </label>
          <label class="jp-field">
            <span>Status da agenda</span>
            <select name="ativo">
              <option value="true" ${schedule?.ativo !== false ? 'selected' : ''}>Ativa</option>
              <option value="false" ${schedule?.ativo === false ? 'selected' : ''}>Inativa</option>
            </select>
          </label>
          <label class="jp-field jp-field-full">
            <span>Observações</span>
            <textarea name="observacoes" rows="4" placeholder="Ex.: treino em conjunto, ajustes do horário, observações de logística">${escapeHtml(schedule?.observacoes || '')}</textarea>
          </label>
        </div>
      </section>
    `,
    onSubmit: async (formData, popupEl) => {
      const studentId = String(formData.get('studentId') || '').trim();
      const horario = ensureTimeValue(String(formData.get('horario') || '').trim());
      const gymId = String(formData.get('gymId') || '').trim();
      const observacoes = String(formData.get('observacoes') || '').trim();
      const ativo = String(formData.get('ativo') || 'true') === 'true';
      const diasSemana = Array.from(popupEl.querySelectorAll('input[name="diasSemana"]:checked')).map((item) => item.value);

      if (!studentId) throw new Error('Selecione o aluno da agenda.');
      if (!gymId) throw new Error('Selecione a academia do horário.');
      if (!isValidTime(horario)) throw new Error('Informe um horário válido no formato HH:MM.');
      if (!diasSemana.length) throw new Error('Selecione pelo menos um dia da semana.');

      const selectedStudent = students.find((student) => student.id === studentId);
      if (!selectedStudent) throw new Error('Aluno não encontrado.');

      const [allSchedules, allStudents] = await Promise.all([
        getAllRecords(OBJECT_STORES.schedules),
        getAllRecords(OBJECT_STORES.students)
      ]);
      const studentsMap = Object.fromEntries(allStudents.map((item) => [item.id, item]));

      const conflicts = allSchedules.filter((item) => {
        if (schedule && item.id === schedule.id) return false;
        if (!item.ativo || !ativo) return false;
        if (item.horario !== horario) return false;
        if (!item.diasSemana.some((day) => diasSemana.includes(day))) return false;
        const otherStudent = studentsMap[item.studentId];
        return otherStudent?.status === STATUS.ACTIVE;
      });

      if (conflicts.length) {
        const label = conflicts.length === 1 ? 'Já existe 1 aluno cadastrado neste horário. Deseja confirmar que eles treinarão juntos?' : `Já existem ${conflicts.length} alunos cadastrados neste horário. Deseja confirmar que eles treinarão juntos?`;
        const confirmed = await confirmDialog(label);
        if (!confirmed) return false;
      }

      const payload = {
        studentId,
        diasSemana,
        horario,
        gymId,
        observacoes,
        ativo,
        updatedAt: nowIso()
      };

      if (isEdit) {
        await updateRecord(OBJECT_STORES.schedules, schedule.id, payload);
        showToast('Agenda atualizada com sucesso.');
      } else {
        await addRecord(OBJECT_STORES.schedules, {
          id: generateId('schedule'),
          ...payload,
          createdAt: nowIso()
        });
        showToast('Agenda criada com sucesso.');
      }

      await onSaved?.();
    },
    afterOpen: (popupEl) => {
      popupEl.querySelectorAll('.jp-weekday-check input').forEach((input) => {
        input.addEventListener('change', () => {
          input.closest('.jp-weekday-check')?.classList.toggle('is-active', input.checked);
        });
      });
    }
  });
}

export async function deleteSchedule(schedule, onSaved) {
  const confirmed = await confirmDialog('Excluir este horário recorrente?');
  if (!confirmed) return;
  await deleteRecord(OBJECT_STORES.schedules, schedule.id);
  showToast('Agenda excluída com sucesso.');
  await onSaved?.();
}

export async function openWorkoutLoadEditor({ student, schedule, dayKey, template, exercisesMap, existingLog, onSaved }) {
  if (!template) {
    showError('Este aluno ainda não possui treino configurado para este dia da semana.');
    return;
  }

  const existingLoads = Object.fromEntries((existingLog?.exerciciosRealizados || []).map((item) => [item.exerciseId, item.carga || '']));

  createPopup({
    title: `Cargas do dia`,
    subtitle: `${student.nome} · ${getWeekDayLabel(dayKey)} · ${schedule.horario}`,
    submitLabel: 'Salvar cargas',
    content: `
      <section class="jp-form-section jp-card jp-panel-card">
        <div class="jp-form-grid">
          ${(template.exercicios || []).map((item, index) => `
            <label class="jp-field jp-field-full">
              <span>${index + 1}. ${escapeHtml(exercisesMap[item.exerciseId]?.nome || 'Exercício')}</span>
              <input name="carga_${item.exerciseId}" type="text" value="${escapeHtml(existingLoads[item.exerciseId] || item.carga || '')}" placeholder="Ex.: 20kg / halter 12kg" />
              <small>${escapeHtml(item.series || '-') } séries · ${escapeHtml(item.repeticoes || '-')} reps</small>
            </label>
          `).join('')}
          <label class="jp-field jp-field-full">
            <span>Observações do dia</span>
            <textarea name="observacoes" rows="3" placeholder="Ex.: aumentar carga no próximo treino">${escapeHtml(existingLog?.observacoes || '')}</textarea>
          </label>
        </div>
      </section>
    `,
    onSubmit: async (formData) => {
      const cargas = Object.fromEntries((template.exercicios || []).map((item) => [item.exerciseId, String(formData.get(`carga_${item.exerciseId}`) || '').trim()]));
      const observacoes = String(formData.get('observacoes') || '').trim();
      const payload = buildLogPayload({
        existingLog,
        studentId: student.id,
        dayKey,
        horario: schedule.horario,
        gymId: schedule.gymId,
        template,
        exercisesMap,
        cargas,
        concluido: existingLog?.concluido || false,
        observacoes
      });
      await saveLogPayload(payload);
      showToast('Cargas do dia salvas.');
      await onSaved?.();
    }
  });
}

export async function completeWorkoutForToday({ student, schedule, dayKey, template, exercisesMap, existingLog, onSaved }) {
  if (!template) {
    showError('Este aluno ainda não possui treino configurado para este dia.');
    return;
  }

  const confirmed = await confirmDialog(`Marcar o treino de <strong>${escapeHtml(student.nome)}</strong> como concluído?`);
  if (!confirmed) return;

  const existingLoads = Object.fromEntries((existingLog?.exerciciosRealizados || []).map((item) => [item.exerciseId, item.carga || '']));
  const payload = buildLogPayload({
    existingLog,
    studentId: student.id,
    dayKey,
    horario: schedule.horario,
    gymId: schedule.gymId,
    template,
    exercisesMap,
    cargas: existingLoads,
    concluido: true,
    observacoes: existingLog?.observacoes || 'Treino concluído pelo dashboard.'
  });

  await saveLogPayload(payload);
  showToast('Treino concluído e registrado no histórico.');
  await onSaved?.();
}

export function openTimeSlotDetails({ dayKey, horario, data, onUpdated, source = 'dashboard' }) {
  const schedules = data.schedules
    .filter((item) => item.ativo && item.horario === horario && item.diasSemana.includes(dayKey))
    .filter((item) => data.studentsMap[item.studentId]?.status === STATUS.ACTIVE)
    .sort((a, b) => (data.studentsMap[a.studentId]?.nome || '').localeCompare(data.studentsMap[b.studentId]?.nome || '', 'pt-BR'));

  const currentDate = formatIsoDate(new Date());
  const logsToday = data.logs.filter((item) => item.data === currentDate && item.diaSemana === dayKey);

  const buildBody = () => {
    if (!schedules.length) return '<div class="jp-empty-state"><h3>Sem alunos neste horário</h3></div>';

    return schedules.map((schedule) => {
      const student = data.studentsMap[schedule.studentId];
      const gym = data.gymsMap[schedule.gymId];
      const template = data.templates.find((item) => item.studentId === schedule.studentId && item.diaSemana === dayKey);
      const enrichedTemplate = template ? {
        ...template,
        exercicios: (template.exercicios || []).map((item) => ({ ...item, nome: data.exercisesMap[item.exerciseId]?.nome || 'Exercício' }))
      } : null;
      const existingLog = logsToday.find((item) => item.studentId === schedule.studentId && item.horario === schedule.horario) || logsToday.find((item) => item.studentId === schedule.studentId);
      const mapsUrl = gym?.googleMapsUrl || createGoogleMapsUrl(gym?.endereco || '');
      const wazeUrl = gym?.wazeUrl || createWazeUrl(gym?.endereco || '');

      return `
        <article class="jp-workout-student-card ${existingLog?.concluido ? 'is-completed' : ''}">
          <div class="jp-workout-student-head">
            <div>
              <h3>${escapeHtml(student?.nome || 'Aluno')}</h3>
              <p>${formatPhone(student?.telefone || '')} · ${escapeHtml(gym?.nome || 'Academia')}</p>
              <small>${escapeHtml(gym?.endereco || 'Endereço não informado')}</small>
            </div>
            <div class="jp-workout-student-badges">
              <span class="jp-time-pill">${horario}</span>
              ${existingLog?.concluido ? '<span class="jp-check-chip is-success">concluído</span>' : '<span class="jp-badge-soft">pendente</span>'}
            </div>
          </div>
          <div class="jp-workout-student-actions-top">
            ${mapsUrl ? `<a class="button button-small button-tonal button-round" href="${mapsUrl}" target="_blank" rel="noopener"><i class="f7-icons">map_fill</i>Maps</a>` : ''}
            ${wazeUrl ? `<a class="button button-small button-tonal button-round" href="${wazeUrl}" target="_blank" rel="noopener"><i class="f7-icons">location_fill</i>Waze</a>` : ''}
          </div>
          <div class="jp-workout-body">
            ${buildWorkoutView({ template: enrichedTemplate, exercisesMap: data.exercisesMap, existingLog })}
          </div>
          <div class="jp-card-actions jp-card-actions-tight jp-workout-actions">
            <button class="button button-small button-tonal button-round" data-edit-loads="${schedule.id}"><i class="f7-icons">scalemass</i>Cargas</button>
            <button class="button button-small button-fill button-round" data-complete-workout="${schedule.id}"><i class="f7-icons">checkmark_alt_circle_fill</i>Concluir</button>
            <button class="button button-small button-tonal button-round" data-whatsapp-workout="${schedule.id}"><i class="f7-icons">chat_bubble_2_fill</i>WhatsApp</button>
          </div>
        </article>
      `;
    }).join('');
  };

  const popup = app().popup.create({
    swipeToClose: 'to-bottom',
    closeByBackdropClick: true,
    content: `
      <div class="popup popup-tablet-fullscreen jp-popup-form jp-slot-popup">
        <div class="view">
          <div class="page">
            <div class="navbar navbar-large transparent">
              <div class="navbar-bg"></div>
              <div class="navbar-inner sliding jp-shell">
                <div class="left"><a href="#" class="link popup-close">Voltar</a></div>
                <div class="title jp-navbar-title">
                  <strong>${escapeHtml(getWeekDayLabel(dayKey))} · ${escapeHtml(horario)}</strong>
                  <small>${schedules.length} aluno(s) neste horário · ${source === 'dashboard' ? 'treinos do dia' : 'agenda recorrente'}</small>
                </div>
              </div>
            </div>
            <div class="page-content">
              <div class="jp-shell">
                <section class="jp-section">
                  <div class="jp-stack" data-slot-students>${buildBody()}</div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  });

  const rerender = async () => {
    onUpdated && await onUpdated();
    popup.close();
  };

  popup.on('opened', () => {
    popup.el.addEventListener('click', async (event) => {
      const editButton = event.target.closest('[data-edit-loads]');
      const completeButton = event.target.closest('[data-complete-workout]');
      const whatsappButton = event.target.closest('[data-whatsapp-workout]');
      if (!editButton && !completeButton && !whatsappButton) return;

      const schedule = schedules.find((item) => item.id === (editButton?.dataset.editLoads || completeButton?.dataset.completeWorkout || whatsappButton?.dataset.whatsappWorkout));
      if (!schedule) return;
      const student = data.studentsMap[schedule.studentId];
      const template = data.templates.find((item) => item.studentId === schedule.studentId && item.diaSemana === dayKey);
      const existingLog = logsToday.find((item) => item.studentId === schedule.studentId && item.horario === schedule.horario) || logsToday.find((item) => item.studentId === schedule.studentId);

      if (editButton) {
        await openWorkoutLoadEditor({ student, schedule, dayKey, template, exercisesMap: data.exercisesMap, existingLog, onSaved: rerender });
      }
      if (completeButton) {
        await completeWorkoutForToday({ student, schedule, dayKey, template, exercisesMap: data.exercisesMap, existingLog, onSaved: rerender });
      }
      if (whatsappButton) {
        const gym = data.gymsMap[schedule.gymId];
        openWhatsAppForWorkoutSummary({ student, log: existingLog, gym });
      }
    });
  });
  popup.on('closed', () => popup.destroy());
  popup.open();
}
