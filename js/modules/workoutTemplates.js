import { OBJECT_STORES, WEEK_DAYS } from '../utils/constants.js';
import { addRecord, deleteRecord, generateId, getAllRecords, updateRecord } from '../db/repository.js';
import { sortByName } from '../utils/formatters.js';
import { confirmAction, showErrorDialog, showToast } from './ui.js';

function app() {
  return window.jpApp;
}

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

function createPopup({ title, subtitle, content, submitLabel, onSubmit, afterOpen }) {
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
                <form class="jp-form" data-template-form>
                  ${content}
                  <div class="jp-form-footer">
                    <button type="submit" class="button button-fill button-round button-large">${escapeHtml(submitLabel)}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>`
  });

  popup.open();
  popup.on('opened', () => {
    const form = popup.el.querySelector('[data-template-form]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const shouldClose = await onSubmit(form, popup.el);
        if (shouldClose !== false) popup.close();
      } catch (error) {
        console.error(error);
        showErrorDialog(error.message || 'Não foi possível salvar o treino.');
      }
    });
    afterOpen?.(popup.el, form);
  });
  popup.on('closed', () => popup.destroy());
  return popup;
}

function renderExerciseRow({ exercises, row = {}, index = 0 }) {
  return `
    <article class="jp-template-row" data-template-row>
      <div class="jp-template-row-head">
        <strong>Exercício ${index + 1}</strong>
        <button type="button" class="button button-small button-tonal button-round" data-remove-template-row><i class="f7-icons">trash</i>Remover</button>
      </div>
      <div class="jp-form-grid">
        <label class="jp-field jp-field-full">
          <span>Exercício *</span>
          <select name="exerciseId" required>
            <option value="">Selecione</option>
            ${sortByName(exercises).map((exercise) => `<option value="${exercise.id}" ${row.exerciseId === exercise.id ? 'selected' : ''}>${escapeHtml(exercise.nome)} · ${escapeHtml(exercise.grupoMuscular)}</option>`).join('')}
          </select>
        </label>
        <label class="jp-field">
          <span>Séries</span>
          <input type="number" min="1" step="1" name="series" value="${escapeHtml(row.series ?? '')}" placeholder="4" />
        </label>
        <label class="jp-field">
          <span>Repetições</span>
          <input type="text" name="repeticoes" value="${escapeHtml(row.repeticoes || '')}" placeholder="8-10" />
        </label>
        <label class="jp-field">
          <span>Carga</span>
          <input type="text" name="carga" value="${escapeHtml(row.carga || '')}" placeholder="30kg" />
        </label>
        <label class="jp-field">
          <span>Descanso (s)</span>
          <input type="number" min="0" step="5" name="descansoSegundos" value="${escapeHtml(row.descansoSegundos ?? '')}" placeholder="60" />
        </label>
        <label class="jp-field jp-field-full">
          <span>Observações</span>
          <input type="text" name="observacoes" value="${escapeHtml(row.observacoes || '')}" placeholder="Observações do exercício" />
        </label>
      </div>
    </article>`;
}

function collectExerciseRows(form) {
  return Array.from(form.querySelectorAll('[data-template-row]')).map((row) => ({
    exerciseId: row.querySelector('[name="exerciseId"]').value,
    series: Number(row.querySelector('[name="series"]').value || 0) || '',
    repeticoes: row.querySelector('[name="repeticoes"]').value.trim(),
    carga: row.querySelector('[name="carga"]').value.trim(),
    descansoSegundos: Number(row.querySelector('[name="descansoSegundos"]').value || 0) || '',
    observacoes: row.querySelector('[name="observacoes"]').value.trim()
  })).filter((row) => row.exerciseId);
}

export async function openWorkoutTemplateForm({ student, template = null, exercises = [], onSaved }) {
  const isEdit = Boolean(template);
  createPopup({
    title: isEdit ? 'Editar treino do aluno' : 'Novo treino do aluno',
    subtitle: `${student.nome} · organize o treino por dia da semana`,
    submitLabel: isEdit ? 'Salvar treino' : 'Criar treino',
    content: `
      <section class="jp-form-section jp-card jp-panel-card">
        <div class="jp-form-grid">
          <label class="jp-field">
            <span>Dia da semana *</span>
            <select name="diaSemana" required>
              <option value="">Selecione</option>
              ${WEEK_DAYS.map((day) => `<option value="${day.key}" ${template?.diaSemana === day.key ? 'selected' : ''}>${day.label}</option>`).join('')}
            </select>
          </label>
          <label class="jp-field jp-field-full">
            <span>Nome do treino *</span>
            <input type="text" name="nomeTreino" value="${escapeHtml(template?.nomeTreino || '')}" placeholder="Ex.: Treino A — Peito e tríceps" required />
          </label>
          <label class="jp-field jp-field-full">
            <span>Observações gerais</span>
            <textarea name="observacoes" rows="3" placeholder="Ex.: foco em execução, progressão de carga, dor no ombro">${escapeHtml(template?.observacoes || '')}</textarea>
          </label>
        </div>
      </section>
      <section class="jp-form-section jp-card jp-panel-card">
        <div class="jp-section-line">
          <div>
            <strong>Exercícios do treino</strong>
            <p>Monte a ficha com a ordem ideal para execução.</p>
          </div>
          <button type="button" class="button button-tonal button-round" data-add-template-row><i class="f7-icons">plus</i>Adicionar exercício</button>
        </div>
        <div class="jp-template-rows" data-template-rows></div>
      </section>`,
    afterOpen: (popupEl, form) => {
      const rowsEl = popupEl.querySelector('[data-template-rows]');
      const drawRows = (rows) => {
        rowsEl.innerHTML = rows.map((row, index) => renderExerciseRow({ exercises, row, index })).join('');
      };
      drawRows(template?.exercicios?.length ? template.exercicios : [{}]);

      popupEl.addEventListener('click', (event) => {
        const addButton = event.target.closest('[data-add-template-row]');
        const removeButton = event.target.closest('[data-remove-template-row]');
        if (addButton) {
          const rows = collectExerciseRows(form);
          rows.push({});
          drawRows(rows);
        }
        if (removeButton) {
          const rowEl = removeButton.closest('[data-template-row]');
          rowEl?.remove();
          const remaining = popupEl.querySelectorAll('[data-template-row]');
          if (!remaining.length) drawRows([{}]);
          else drawRows(collectExerciseRows(form));
        }
      }, { once: false });
    },
    onSubmit: async (form) => {
      const diaSemana = String(form.querySelector('[name="diaSemana"]').value || '').trim();
      const nomeTreino = String(form.querySelector('[name="nomeTreino"]').value || '').trim();
      const observacoes = String(form.querySelector('[name="observacoes"]').value || '').trim();
      const exercicios = collectExerciseRows(form);
      if (!diaSemana) throw new Error('Selecione o dia da semana do treino.');
      if (!nomeTreino) throw new Error('Informe o nome do treino.');
      if (!exercicios.length) throw new Error('Adicione pelo menos um exercício ao treino.');
      if (exercicios.some((item) => !item.exerciseId)) throw new Error('Todos os exercícios precisam ser válidos.');

      const existingTemplates = await getAllRecords(OBJECT_STORES.workoutTemplates);
      const duplicate = existingTemplates.find((item) => item.studentId === student.id && item.diaSemana === diaSemana && item.id !== template?.id);
      if (duplicate) throw new Error('Este aluno já possui um treino configurado para esse dia da semana. Edite o treino existente.');

      const payload = {
        id: template?.id || generateId('template'),
        studentId: student.id,
        diaSemana,
        nomeTreino,
        exercicios,
        observacoes,
        createdAt: template?.createdAt || nowIso(),
        updatedAt: nowIso()
      };

      if (template?.id) {
        await updateRecord(OBJECT_STORES.workoutTemplates, template.id, payload);
        showToast('Treino atualizado com sucesso.');
      } else {
        await addRecord(OBJECT_STORES.workoutTemplates, payload);
        showToast('Treino criado com sucesso.');
      }
      await onSaved?.();
    }
  });
}

export async function deleteWorkoutTemplate(template, onDeleted) {
  const confirmed = await confirmAction(`Excluir o treino "${template.nomeTreino}"?`);
  if (!confirmed) return;
  await deleteRecord(OBJECT_STORES.workoutTemplates, template.id);
  showToast('Treino excluído com sucesso.');
  await onDeleted?.();
}

export async function openWorkoutTemplatesManager({ student, onSaved }) {
  const [templates, exercises] = await Promise.all([
    getAllRecords(OBJECT_STORES.workoutTemplates),
    getAllRecords(OBJECT_STORES.exercises)
  ]);
  const studentTemplates = templates
    .filter((item) => item.studentId === student.id)
    .sort((a, b) => WEEK_DAYS.findIndex((day) => day.key === a.diaSemana) - WEEK_DAYS.findIndex((day) => day.key === b.diaSemana));
  const exercisesMap = Object.fromEntries(exercises.map((item) => [item.id, item]));

  const popup = app().popup.create({
    swipeToClose: 'to-bottom',
    content: `
      <div class="popup popup-tablet-fullscreen jp-popup-form">
        <div class="view">
          <div class="page">
            <div class="navbar navbar-large transparent">
              <div class="navbar-bg"></div>
              <div class="navbar-inner sliding jp-shell">
                <div class="left"><a href="#" class="link popup-close">Fechar</a></div>
                <div class="title jp-navbar-title">
                  <strong>Treinos de ${escapeHtml(student.nome)}</strong>
                  <small>Gerencie a ficha por dia da semana</small>
                </div>
              </div>
            </div>
            <div class="page-content">
              <div class="jp-shell">
                <div class="jp-page-header-card jp-card jp-panel-card">
                  <div class="jp-page-header-top">
                    <div>
                      <h2>Modelos de treino</h2>
                      <p>Cadastre uma ficha diferente para cada dia da semana do aluno.</p>
                    </div>
                    <button class="button button-fill button-round jp-primary-btn" data-template-create><i class="f7-icons">plus</i>Novo treino</button>
                  </div>
                </div>
                <div data-template-list></div>
              </div>
            </div>
          </div>
        </div>
      </div>`
  });

  const renderList = async () => {
    const allTemplates = await getAllRecords(OBJECT_STORES.workoutTemplates);
    const items = allTemplates
      .filter((item) => item.studentId === student.id)
      .sort((a, b) => WEEK_DAYS.findIndex((day) => day.key === a.diaSemana) - WEEK_DAYS.findIndex((day) => day.key === b.diaSemana));
    const listEl = popup.el.querySelector('[data-template-list]');
    if (!items.length) {
      listEl.innerHTML = `
        <div class="jp-empty-state">
          <i class="f7-icons">list_bullet_rectangle</i>
          <h3>Nenhum treino cadastrado</h3>
          <p>Crie o primeiro treino do aluno para organizar o dia a dia por ficha.</p>
          <button class="button button-fill button-round jp-empty-action" data-template-create>Criar treino</button>
        </div>`;
      return;
    }

    listEl.innerHTML = items.map((template) => {
      const day = WEEK_DAYS.find((item) => item.key === template.diaSemana);
      return `
        <article class="jp-list-card jp-template-card">
          <div class="jp-card-head">
            <div>
              <h3>${escapeHtml(template.nomeTreino)}</h3>
              <p>${escapeHtml(day?.label || template.diaSemana)} · ${(template.exercicios || []).length} exercício(s)</p>
            </div>
            <span class="jp-status-chip is-active">${escapeHtml(day?.short || 'Dia')}</span>
          </div>
          <div class="jp-template-preview">
            ${(template.exercicios || []).slice(0, 4).map((exercise, index) => `<span>${index + 1}. ${escapeHtml(exercisesMap[exercise.exerciseId]?.nome || 'Exercício')}</span>`).join('')}
            ${(template.exercicios || []).length > 4 ? `<span>+ ${(template.exercicios || []).length - 4} exercício(s)</span>` : ''}
          </div>
          <div class="jp-card-actions">
            <button class="button button-small button-tonal button-round" data-template-edit="${template.id}"><i class="f7-icons">square_pencil</i>Editar</button>
            <button class="button button-small button-outline button-round color-red" data-template-delete="${template.id}"><i class="f7-icons">trash</i>Excluir</button>
          </div>
        </article>`;
    }).join('');
  };

  popup.open();
  popup.on('opened', async () => {
    await renderList();
    popup.el.addEventListener('click', async (event) => {
      const createButton = event.target.closest('[data-template-create]');
      const editButton = event.target.closest('[data-template-edit]');
      const deleteButton = event.target.closest('[data-template-delete]');
      if (createButton) {
        await openWorkoutTemplateForm({ student, exercises, onSaved: async () => { await renderList(); await onSaved?.(); } });
      }
      if (editButton) {
        const all = await getAllRecords(OBJECT_STORES.workoutTemplates);
        const template = all.find((item) => item.id === editButton.dataset.templateEdit);
        if (template) await openWorkoutTemplateForm({ student, template, exercises, onSaved: async () => { await renderList(); await onSaved?.(); } });
      }
      if (deleteButton) {
        const all = await getAllRecords(OBJECT_STORES.workoutTemplates);
        const template = all.find((item) => item.id === deleteButton.dataset.templateDelete);
        if (template) await deleteWorkoutTemplate(template, async () => { await renderList(); await onSaved?.(); });
      }
    });
  });
  popup.on('closed', () => popup.destroy());
}
