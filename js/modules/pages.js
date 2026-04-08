import { OBJECT_STORES, STATUS, WEEK_DAYS } from '../utils/constants.js';
import { countRecords, getAllRecords, getRecordById } from '../db/repository.js';
import { createGoogleMapsUrl, createWazeUrl, formatDateLabel, formatIsoDate, formatPhone, formatTimeLabel, getCurrentTimeValue, getCurrentWeekDayKey, getWeekDayLabel, normalizeText, sortByName } from '../utils/formatters.js';
import { expandSchedulesForDay, getScheduleSlots } from '../utils/scheduleSlots.js';
import { createWhatsAppLink, deleteExercise, deleteGym, deleteStudent, openExerciseForm, openGymForm, openStudentForm, toggleStudentStatus } from './crud.js';
import { deleteSchedule, openScheduleForm, openTimeSlotDetails } from './schedule.js';
import { openWorkoutTemplatesManager } from './workoutTemplates.js';
import { openStudentHistory } from './history.js';
import { exportFullBackup, exportGymsCsv, exportStudentsCsv, triggerBackupImport } from './backup.js';
import { renderErrorState } from './ui.js';

function qs(pageEl, selector) {
  return pageEl.querySelector(selector);
}

function setHTML(pageEl, selector, html) {
  const target = qs(pageEl, selector);
  if (target) target.innerHTML = html;
}

function emptyState(icon, title, text, actionLabel = '', actionAttr = '') {
  return `
    <div class="jp-empty-state">
      <i class="f7-icons">${icon}</i>
      <h3>${title}</h3>
      <p>${text}</p>
      ${actionLabel ? `<button class="button button-fill button-round jp-empty-action" ${actionAttr}>${actionLabel}</button>` : ''}
    </div>
  `;
}

function badgeStatus(status) {
  return status === STATUS.ACTIVE
    ? '<span class="jp-status-chip is-active">Ativo</span>'
    : '<span class="jp-status-chip is-inactive">Inativo</span>';
}

async function loadBaseData() {
  const [students, gyms, exercises, schedules, templates, logs, settings] = await Promise.all([
    getAllRecords(OBJECT_STORES.students),
    getAllRecords(OBJECT_STORES.gyms),
    getAllRecords(OBJECT_STORES.exercises),
    getAllRecords(OBJECT_STORES.schedules),
    getAllRecords(OBJECT_STORES.workoutTemplates),
    getAllRecords(OBJECT_STORES.workoutLogs),
    getRecordById(OBJECT_STORES.settings, 'app-settings')
  ]);

  return {
    students,
    gyms,
    exercises,
    schedules,
    templates,
    logs,
    settings,
    gymsMap: Object.fromEntries(gyms.map((gym) => [gym.id, gym])),
    studentsMap: Object.fromEntries(students.map((student) => [student.id, student])),
    exercisesMap: Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise]))
  };
}

function setupSearch(input, onChange) {
  if (!input) return;
  input.addEventListener('input', (event) => onChange(event.target.value));
}

function setupSegmented(pageEl, selector, onSelect) {
  const buttons = pageEl.querySelectorAll(selector);
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      onSelect(button.dataset.value);
    });
  });
}

function renderActionHeader({ title, subtitle, buttonLabel, buttonAttr, stats = [] }) {
  return `
    <div class="jp-page-header-card jp-card jp-panel-card">
      <div class="jp-page-header-top">
        <div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
        ${buttonLabel ? `<button class="button button-fill button-round jp-primary-btn" ${buttonAttr}><i class="f7-icons">plus</i>${buttonLabel}</button>` : ''}
      </div>
      ${stats.length ? `<div class="jp-inline-stats">${stats.map((item) => `<span class="jp-link-chip"><strong>${item.value}</strong>${item.label}</span>`).join('')}</div>` : ''}
    </div>
  `;
}

function buildDashboardEntries(data, now = new Date()) {
  const currentDayKey = getCurrentWeekDayKey(now);
  const currentDateValue = formatIsoDate(now);
  const currentTimeValue = getCurrentTimeValue(now);
  const activeStudentsMap = Object.fromEntries(
    data.students.filter((student) => student.status === STATUS.ACTIVE).map((student) => [student.id, student])
  );

  const todaySchedules = expandSchedulesForDay(data.schedules.filter((schedule) => schedule.ativo), currentDayKey)
    .filter((schedule) => activeStudentsMap[schedule.studentId])
    .sort((a, b) => a.horario.localeCompare(b.horario));

  const concludedLogsToday = data.logs.filter((log) => log.data === currentDateValue && log.concluido);

  const entries = todaySchedules.map((schedule) => {
    const student = activeStudentsMap[schedule.studentId];
    const gym = data.gymsMap[schedule.slotGymId || schedule.gymId];
    const template = data.templates.find((item) => item.studentId === schedule.studentId && item.diaSemana === currentDayKey);
    const log = concludedLogsToday.find((item) => item.studentId === schedule.studentId && item.horario === schedule.horario)
      || concludedLogsToday.find((item) => item.studentId === schedule.studentId);
    const completedByLog = Boolean(log);
    const section = completedByLog || schedule.horario < currentTimeValue ? 'completed' : 'upcoming';
    return {
      ...schedule,
      student,
      gym,
      template,
      log,
      completedByLog,
      section,
      dayKey: currentDayKey,
      mapsUrl: gym?.googleMapsUrl || createGoogleMapsUrl(gym?.endereco || ''),
      wazeUrl: gym?.wazeUrl || createWazeUrl(gym?.endereco || '')
    };
  });

  return {
    currentDayKey,
    currentDateValue,
    currentTimeValue,
    todaySchedules,
    concludedLogsToday,
    entries,
    upcomingEntries: entries.filter((item) => item.section === 'upcoming'),
    completedEntries: entries.filter((item) => item.section === 'completed')
  };
}

function groupEntriesByTime(entries) {
  return Object.entries(entries.reduce((acc, item) => {
    acc[item.horario] ??= [];
    acc[item.horario].push(item);
    return acc;
  }, {})).sort((a, b) => a[0].localeCompare(b[0]));
}

async function renderHome(pageEl) {
  const data = await loadBaseData();
  const now = new Date();
  const dashboard = buildDashboardEntries(data, now);

  const renderDashboardGroups = (entries, sectionType) => {
    if (!entries.length) {
      return sectionType === 'upcoming'
        ? emptyState('calendar_badge_exclamationmark', 'Sem próximos treinos para hoje', 'A partir do horário atual do dispositivo, não restam treinos programados para o restante do dia.')
        : emptyState('checkmark_circle', 'Ninguém já treinou hoje', 'Quando o horário passar ou houver logs concluídos hoje, os alunos aparecerão aqui.');
    }

    return groupEntriesByTime(entries).map(([horario, items]) => `
      <section class="jp-time-group jp-dashboard-group ${sectionType === 'upcoming' ? 'is-priority' : 'is-completed'} ${items.length > 1 ? 'is-shared' : ''}" data-open-slot="${horario}" data-slot-day="${dashboard.currentDayKey}">
        <div class="jp-time-group-head">
          <div>
            <strong>${horario}</strong>
            <span>${items.length > 1 ? `${items.length} alunos` : '1 aluno'}</span>
          </div>
          <div class="jp-group-head-actions">
            <span class="jp-badge-soft">${sectionType === 'upcoming' ? 'próximos' : 'já treinaram'}</span>
            <i class="f7-icons">chevron_right</i>
          </div>
        </div>
        <div class="jp-time-group-preview">
          ${items.map((item) => `
            <article class="jp-dashboard-item ${item.completedByLog ? 'is-confirmed' : ''}">
              <div class="jp-dashboard-item-main">
                <div class="jp-dashboard-line-top">
                  <span class="jp-time-pill">${item.horario}</span>
                  ${item.completedByLog ? '<span class="jp-check-chip is-success">log concluído</span>' : ''}
                </div>
                <h3>${item.student?.nome ?? 'Aluno não encontrado'}</h3>
                <p>${item.gym?.nome ?? 'Academia não informada'}</p>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `).join('');
  };

  setHTML(pageEl, '[data-home-clock]', `
    <div class="jp-now-grid">
      <article class="jp-now-card"><span>Dia da semana</span><strong>${getWeekDayLabel(dashboard.currentDayKey)}</strong></article>
      <article class="jp-now-card"><span>Data</span><strong>${formatDateLabel(now)}</strong></article>
      <article class="jp-now-card"><span>Horário atual</span><strong>${formatTimeLabel(now)}</strong></article>
    </div>
  `);

  setHTML(pageEl, '[data-home-overview]', `
    <div class="jp-metrics jp-metrics-4">
      <div class="jp-card jp-metric jp-metric-priority"><strong>${dashboard.upcomingEntries.length}</strong><span>próximos</span></div>
      <div class="jp-card jp-metric"><strong>${dashboard.completedEntries.length}</strong><span>já treinaram</span></div>
      <div class="jp-card jp-metric"><strong>${dashboard.todaySchedules.length}</strong><span>agenda ativa hoje</span></div>
      <div class="jp-card jp-metric"><strong>${dashboard.concludedLogsToday.length}</strong><span>logs concluídos</span></div>
    </div>
  `);

  setHTML(pageEl, '[data-home-switcher]', `
    <div class="jp-segmented-control jp-dashboard-segmented">
      <button class="is-active" data-home-view="upcoming">Próximos treinos <span>${dashboard.upcomingEntries.length}</span></button>
      <button data-home-view="completed">Já treinaram hoje <span>${dashboard.completedEntries.length}</span></button>
    </div>
  `);

  setHTML(pageEl, '[data-home-upcoming-panel]', `<div class="jp-dashboard-panel is-active" data-home-panel="upcoming">${renderDashboardGroups(dashboard.upcomingEntries, 'upcoming')}</div>`);
  setHTML(pageEl, '[data-home-completed-panel]', `<div class="jp-dashboard-panel" data-home-panel="completed">${renderDashboardGroups(dashboard.completedEntries, 'completed')}</div>`);

  if (pageEl._homeClickHandler) pageEl.removeEventListener('click', pageEl._homeClickHandler);
  pageEl._homeClickHandler = async (event) => {
    const refreshButton = event.target.closest('[data-home-refresh]');
    const toggleButton = event.target.closest('[data-home-view]');
    const slotButton = event.target.closest('[data-open-slot]');

    if (refreshButton) return renderHome(pageEl);
    if (toggleButton) {
      const view = toggleButton.dataset.homeView;
      pageEl.querySelectorAll('[data-home-view]').forEach((button) => button.classList.remove('is-active'));
      toggleButton.classList.add('is-active');
      pageEl.querySelectorAll('[data-home-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.homePanel === view));
      return;
    }
    if (slotButton) {
      openTimeSlotDetails({
        dayKey: slotButton.dataset.slotDay,
        horario: slotButton.dataset.openSlot,
        data,
        source: 'dashboard',
        onUpdated: async () => renderHome(pageEl)
      });
    }
  };
  pageEl.addEventListener('click', pageEl._homeClickHandler);
}

async function renderStudents(pageEl) {
  const refresh = () => renderStudents(pageEl);
  const data = await loadBaseData();
  const listEl = qs(pageEl, '[data-students-list]');
  const totalEl = qs(pageEl, '[data-students-total]');
  const filtersEl = qs(pageEl, '[data-students-filters]');
  let searchTerm = qs(pageEl, '[data-students-search]')?.value || '';
  let statusFilter = pageEl.dataset.studentsStatus || 'all';
  let gymFilter = pageEl.dataset.studentsGym || 'all';

  if (filtersEl) {
    filtersEl.innerHTML = renderActionHeader({
      title: 'Cadastro de alunos',
      subtitle: 'Crie, edite, filtre e controle status sem sair do celular.',
      buttonLabel: 'Novo aluno',
      buttonAttr: 'data-student-create',
      stats: [
        { value: data.students.length, label: 'cadastros' },
        { value: data.students.filter((item) => item.status === STATUS.ACTIVE).length, label: 'ativos' },
        { value: data.students.filter((item) => item.status === STATUS.INACTIVE).length, label: 'inativos' }
      ]
    }) + `
      <div class="jp-search-card jp-card jp-panel-card">
        <label class="jp-search-input"><i class="f7-icons">search</i><input type="search" placeholder="Buscar por nome, academia ou telefone" data-students-search value="${searchTerm}" /></label>
        <div class="jp-segmented-control">
          <button class="${statusFilter === 'all' ? 'is-active' : ''}" data-students-filter data-value="all">Todos</button>
          <button class="${statusFilter === 'active' ? 'is-active' : ''}" data-students-filter data-value="active">Ativos</button>
          <button class="${statusFilter === 'inactive' ? 'is-active' : ''}" data-students-filter data-value="inactive">Inativos</button>
        </div>
        <label class="jp-field jp-field-filter">
          <span>Academia</span>
          <select data-students-gym-filter>
            <option value="all">Todas as academias</option>
            <option value="none" ${gymFilter === 'none' ? 'selected' : ''}>Sem academia principal</option>
            ${sortByName(data.gyms).map((gym) => `<option value="${gym.id}" ${gymFilter === gym.id ? 'selected' : ''}>${gym.nome}</option>`).join('')}
          </select>
        </label>
      </div>
    `;
  }

  const studentsWithExtras = sortByName(data.students).map((student) => {
    const gym = data.gymsMap[student.academiaPrincipalId];
    const schedules = data.schedules.filter((schedule) => schedule.studentId === student.id && schedule.ativo);
    const schedulesCount = schedules.reduce((sum, schedule) => sum + getScheduleSlots(schedule).length, 0);
    return { ...student, gym, schedulesCount };
  });

  function draw() {
    let items = [...studentsWithExtras];
    if (searchTerm) {
      items = items.filter((student) => [student.nome, student.telefone, student.gym?.nome, student.observacoes]
        .some((value) => normalizeText(value).includes(normalizeText(searchTerm))));
    }
    if (statusFilter !== 'all') items = items.filter((student) => student.status === statusFilter);
    if (gymFilter === 'none') items = items.filter((student) => !student.academiaPrincipalId);
    else if (gymFilter !== 'all') items = items.filter((student) => student.academiaPrincipalId === gymFilter);

    pageEl.dataset.studentsStatus = statusFilter;
    pageEl.dataset.studentsGym = gymFilter;
    if (totalEl) totalEl.textContent = `${items.length} aluno(s)`;

    listEl.innerHTML = items.length ? items.map((student) => {
      const whatsappLink = createWhatsAppLink(student.telefone);
      return `
        <article class="jp-list-card jp-crud-card">
          <div class="jp-card-head"><div><h3>${student.nome}</h3><p>${student.gym?.nome ?? 'Sem academia principal'} · ${formatPhone(student.telefone)}</p></div>${badgeStatus(student.status)}</div>
          <div class="jp-card-info-row"><span><i class="f7-icons">calendar</i> ${student.schedulesCount} agenda(s) ativa(s)</span><span><i class="f7-icons">text_quote</i> ${student.observacoes || 'Sem observações'}</span></div>
          <div class="jp-card-actions">
            ${whatsappLink ? `<a class="button button-small button-tonal button-round" href="${whatsappLink}" target="_blank" rel="noopener"><i class="f7-icons">chat_bubble_2_fill</i>WhatsApp</a>` : ''}
            <button class="button button-small button-tonal button-round" data-student-history="${student.id}"><i class="f7-icons">clock_arrow_circlepath</i>Histórico</button>
            <button class="button button-small button-tonal button-round" data-student-templates="${student.id}"><i class="f7-icons">list_bullet_rectangle</i>Treinos</button>
            <button class="button button-small button-tonal button-round" data-student-edit="${student.id}"><i class="f7-icons">square_pencil</i>Editar</button>
            <button class="button button-small button-tonal button-round" data-student-toggle="${student.id}"><i class="f7-icons">${student.status === STATUS.ACTIVE ? 'pause_circle' : 'play_circle'}</i>${student.status === STATUS.ACTIVE ? 'Inativar' : 'Reativar'}</button>
            <button class="button button-small button-outline button-round color-red" data-student-delete="${student.id}"><i class="f7-icons">trash</i>Excluir</button>
          </div>
        </article>
      `;
    }).join('') : emptyState('person_2_square_stack_fill', 'Nenhum aluno encontrado', 'Ajuste a busca ou o filtro para localizar outro cadastro.', 'Criar aluno', 'data-student-create');
  }

  setupSearch(qs(pageEl, '[data-students-search]'), (value) => { searchTerm = value; draw(); });
  setupSegmented(pageEl, '[data-students-filter]', (value) => { statusFilter = value; draw(); });
  qs(pageEl, '[data-students-gym-filter]')?.addEventListener('change', (event) => { gymFilter = event.target.value; draw(); });

  if (pageEl._studentsClickHandler) pageEl.removeEventListener('click', pageEl._studentsClickHandler);
  pageEl._studentsClickHandler = async (event) => {
    const createButton = event.target.closest('[data-student-create]');
    const historyButton = event.target.closest('[data-student-history]');
    const templatesButton = event.target.closest('[data-student-templates]');
    const editButton = event.target.closest('[data-student-edit]');
    const toggleButton = event.target.closest('[data-student-toggle]');
    const deleteButton = event.target.closest('[data-student-delete]');
    if (createButton) await openStudentForm({ gyms: sortByName(data.gyms), onSaved: refresh });
    if (historyButton) {
      const student = data.students.find((item) => item.id === historyButton.dataset.studentHistory);
      if (student) await openStudentHistory({ student, gymsMap: data.gymsMap });
    }
    if (templatesButton) {
      const student = data.students.find((item) => item.id === templatesButton.dataset.studentTemplates);
      if (student) await openWorkoutTemplatesManager({ student, onSaved: refresh });
    }
    if (editButton) {
      const student = data.students.find((item) => item.id === editButton.dataset.studentEdit);
      if (student) await openStudentForm({ student, gyms: sortByName(data.gyms), onSaved: refresh });
    }
    if (toggleButton) {
      const student = data.students.find((item) => item.id === toggleButton.dataset.studentToggle);
      if (student) await toggleStudentStatus(student, refresh);
    }
    if (deleteButton) {
      const student = data.students.find((item) => item.id === deleteButton.dataset.studentDelete);
      if (student) await deleteStudent(student, refresh);
    }
  };
  pageEl.addEventListener('click', pageEl._studentsClickHandler);
  draw();
}

async function renderGyms(pageEl) {
  const refresh = () => renderGyms(pageEl);
  const data = await loadBaseData();
  const listEl = qs(pageEl, '[data-gyms-list]');
  const topEl = qs(pageEl, '[data-gyms-top]');
  let searchTerm = qs(pageEl, '[data-gyms-search]')?.value || '';

  if (topEl) {
    topEl.innerHTML = renderActionHeader({
      title: 'Academias e locais de treino',
      subtitle: 'Cadastre unidades, endereços e links de navegação para agilizar o dia.',
      buttonLabel: 'Nova academia',
      buttonAttr: 'data-gym-create',
      stats: [
        { value: data.gyms.length, label: 'academias' },
        { value: data.students.filter((item) => item.academiaPrincipalId).length, label: 'alunos vinculados' }
      ]
    }) + `
      <div class="jp-search-card jp-card jp-panel-card"><label class="jp-search-input"><i class="f7-icons">search</i><input type="search" placeholder="Buscar academia ou endereço" data-gyms-search value="${searchTerm}" /></label></div>
    `;
  }

  const gymsWithStats = sortByName(data.gyms).map((gym) => {
    const students = data.students.filter((student) => student.academiaPrincipalId === gym.id && student.status === STATUS.ACTIVE);
    const schedules = data.schedules.filter((schedule) => schedule.ativo);
    const activeSchedules = schedules.reduce((sum, schedule) => sum + getScheduleSlots(schedule).filter((slot) => (slot.gymId || schedule.gymId) === gym.id).length, 0);
    return { ...gym, activeStudents: students.length, activeSchedules };
  });

  function draw() {
    let items = [...gymsWithStats];
    if (searchTerm) items = items.filter((gym) => [gym.nome, gym.endereco, gym.observacoes].some((value) => normalizeText(value).includes(normalizeText(searchTerm))));

    listEl.innerHTML = items.length ? items.map((gym) => `
      <article class="jp-list-card is-gym-card jp-crud-card">
        <div class="jp-card-head"><div><h3>${gym.nome}</h3><p>${gym.endereco || 'Endereço não informado'}</p></div><span class="jp-badge-soft">${gym.activeStudents} ativos</span></div>
        <div class="jp-card-info-row"><span><i class="f7-icons">calendar_badge_plus</i> ${gym.activeSchedules} horários ativos</span><span><i class="f7-icons">info_circle</i> ${gym.observacoes || 'Sem observações'}</span></div>
        <div class="jp-card-actions">
          ${gym.googleMapsUrl ? `<a class="button button-small button-tonal button-round" href="${gym.googleMapsUrl}" target="_blank" rel="noopener"><i class="f7-icons">map_fill</i>Maps</a>` : ''}
          ${gym.wazeUrl ? `<a class="button button-small button-tonal button-round" href="${gym.wazeUrl}" target="_blank" rel="noopener"><i class="f7-icons">location_fill</i>Waze</a>` : ''}
          <button class="button button-small button-tonal button-round" data-gym-edit="${gym.id}"><i class="f7-icons">square_pencil</i>Editar</button>
          <button class="button button-small button-outline button-round color-red" data-gym-delete="${gym.id}"><i class="f7-icons">trash</i>Excluir</button>
        </div>
      </article>
    `).join('') : emptyState('building_2_crop_circle', 'Nenhuma academia encontrada', 'Cadastros de academia aparecerão aqui em cards com endereço e indicadores.', 'Criar academia', 'data-gym-create');
  }

  setupSearch(qs(pageEl, '[data-gyms-search]'), (value) => { searchTerm = value; draw(); });
  if (pageEl._gymsClickHandler) pageEl.removeEventListener('click', pageEl._gymsClickHandler);
  pageEl._gymsClickHandler = async (event) => {
    const createButton = event.target.closest('[data-gym-create]');
    const editButton = event.target.closest('[data-gym-edit]');
    const deleteButton = event.target.closest('[data-gym-delete]');
    if (createButton) await openGymForm({ onSaved: refresh });
    if (editButton) {
      const gym = data.gyms.find((item) => item.id === editButton.dataset.gymEdit);
      if (gym) await openGymForm({ gym, onSaved: refresh });
    }
    if (deleteButton) {
      const gym = data.gyms.find((item) => item.id === deleteButton.dataset.gymDelete);
      if (gym) await deleteGym(gym, refresh);
    }
  };
  pageEl.addEventListener('click', pageEl._gymsClickHandler);
  draw();
}

async function renderExercises(pageEl) {
  const refresh = () => renderExercises(pageEl);
  const data = await loadBaseData();
  const groups = [...new Set(data.exercises.map((item) => item.grupoMuscular))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const topEl = qs(pageEl, '[data-exercises-top]');
  const listEl = qs(pageEl, '[data-exercises-list]');
  let searchTerm = qs(pageEl, '[data-exercises-search]')?.value || '';
  let currentGroup = pageEl.dataset.exerciseGroup || 'all';

  if (topEl) {
    topEl.innerHTML = renderActionHeader({
      title: 'Biblioteca de exercícios',
      subtitle: 'Mantenha sua base organizada por grupo muscular e pronta para montar treinos.',
      buttonLabel: 'Novo exercício',
      buttonAttr: 'data-exercise-create',
      stats: [
        { value: data.exercises.length, label: 'exercícios' },
        { value: groups.length, label: 'grupos musculares' }
      ]
    }) + `
      <div class="jp-search-card jp-card jp-panel-card">
        <label class="jp-search-input"><i class="f7-icons">search</i><input type="search" placeholder="Buscar exercício ou grupo muscular" data-exercises-search value="${searchTerm}" /></label>
        <div class="jp-chip-row" data-exercises-groups></div>
      </div>
    `;
  }

  const updatedChipsEl = qs(pageEl, '[data-exercises-groups]');
  if (updatedChipsEl) {
    updatedChipsEl.innerHTML = [`<button class="jp-chip-filter ${currentGroup === 'all' ? 'is-active' : ''}" data-ex-group="all">Todos</button>`]
      .concat(groups.map((group) => `<button class="jp-chip-filter ${currentGroup === group ? 'is-active' : ''}" data-ex-group="${group}">${group}</button>`)).join('');
  }

  function draw() {
    let items = sortByName(data.exercises);
    if (currentGroup !== 'all') items = items.filter((item) => item.grupoMuscular === currentGroup);
    if (searchTerm) items = items.filter((item) => normalizeText(item.nome).includes(normalizeText(searchTerm)) || normalizeText(item.grupoMuscular).includes(normalizeText(searchTerm)));
    pageEl.dataset.exerciseGroup = currentGroup;

    if (!items.length) {
      listEl.innerHTML = emptyState('bolt_circle', 'Nenhum exercício encontrado', 'Tente outro grupo muscular ou termo de busca.', 'Criar exercício', 'data-exercise-create');
      return;
    }

    const grouped = items.reduce((acc, item) => {
      acc[item.grupoMuscular] ??= [];
      acc[item.grupoMuscular].push(item);
      return acc;
    }, {});

    listEl.innerHTML = Object.entries(grouped).map(([group, exercises]) => `
      <section class="jp-group-block">
        <div class="jp-group-header"><h3>${group}</h3><span>${exercises.length} exercício(s)</span></div>
        ${exercises.map((exercise) => `
          <article class="jp-inline-card jp-crud-inline-card">
            <div><strong>${exercise.nome}</strong><p>${exercise.observacoes || 'Base inicial para montagem de treinos.'}</p></div>
            <div class="jp-inline-actions">
              <span class="jp-mini-tag">${group}</span>
              <button class="button button-small button-tonal button-round" data-exercise-edit="${exercise.id}"><i class="f7-icons">square_pencil</i></button>
              <button class="button button-small button-outline button-round color-red" data-exercise-delete="${exercise.id}"><i class="f7-icons">trash</i></button>
            </div>
          </article>
        `).join('')}
      </section>
    `).join('');
  }

  setupSearch(qs(pageEl, '[data-exercises-search]'), (value) => { searchTerm = value; draw(); });
  if (pageEl._exercisesClickHandler) pageEl.removeEventListener('click', pageEl._exercisesClickHandler);
  pageEl._exercisesClickHandler = async (event) => {
    const chip = event.target.closest('[data-ex-group]');
    const createButton = event.target.closest('[data-exercise-create]');
    const editButton = event.target.closest('[data-exercise-edit]');
    const deleteButton = event.target.closest('[data-exercise-delete]');

    if (chip) {
      currentGroup = chip.dataset.exGroup;
      pageEl.querySelectorAll('[data-ex-group]').forEach((item) => item.classList.remove('is-active'));
      chip.classList.add('is-active');
      draw();
    }
    if (createButton) await openExerciseForm({ groups, onSaved: refresh });
    if (editButton) {
      const exercise = data.exercises.find((item) => item.id === editButton.dataset.exerciseEdit);
      if (exercise) await openExerciseForm({ exercise, groups, onSaved: refresh });
    }
    if (deleteButton) {
      const exercise = data.exercises.find((item) => item.id === deleteButton.dataset.exerciseDelete);
      if (exercise) await deleteExercise(exercise, refresh);
    }
  };
  pageEl.addEventListener('click', pageEl._exercisesClickHandler);
  draw();
}

async function renderAgenda(pageEl) {
  const refresh = () => renderAgenda(pageEl);
  const data = await loadBaseData();
  const activeStudents = sortByName(data.students.filter((student) => student.status === STATUS.ACTIVE));
  const topEl = qs(pageEl, '[data-agenda-top]');
  const chipsEl = qs(pageEl, '[data-agenda-days]');
  const listEl = qs(pageEl, '[data-agenda-list]');
  let selectedDay = pageEl.dataset.agendaSelectedDay || getCurrentWeekDayKey();

  if (topEl) {
    topEl.innerHTML = renderActionHeader({
      title: 'Agenda semanal recorrente',
      subtitle: 'Cadastre horários, confirme treinos simultâneos e abra o treino do dia por faixa horária.',
      buttonLabel: 'Nova agenda',
      buttonAttr: 'data-schedule-create',
      stats: [
        { value: data.schedules.filter((item) => item.ativo).reduce((sum, item) => sum + getScheduleSlots(item).length, 0), label: 'horários ativos' },
        { value: activeStudents.length, label: 'alunos ativos' }
      ]
    });
  }

  if (chipsEl) {
    chipsEl.innerHTML = WEEK_DAYS.map((day) => `
      <button class="jp-day-filter ${day.key === selectedDay ? 'is-active' : ''}" data-agenda-day="${day.key}">
        <span>${day.short}</span>
        <small>${day.label}</small>
      </button>
    `).join('');
  }

  function renderDay(dayKey) {
    pageEl.dataset.agendaSelectedDay = dayKey;
    const daySchedules = expandSchedulesForDay(data.schedules.filter((schedule) => schedule.ativo), dayKey)
      .filter((schedule) => data.studentsMap[schedule.studentId])
      .sort((a, b) => a.horario.localeCompare(b.horario));

    if (!daySchedules.length) {
      listEl.innerHTML = emptyState('calendar_badge_minus', 'Dia sem agenda', 'Esse dia ainda não possui horários recorrentes cadastrados.', 'Criar agenda', 'data-schedule-create');
      return;
    }

    const groupedByTime = daySchedules.reduce((acc, schedule) => {
      acc[schedule.horario] ??= [];
      acc[schedule.horario].push(schedule);
      return acc;
    }, {});

    listEl.innerHTML = Object.entries(groupedByTime).sort((a,b)=>a[0].localeCompare(b[0])).map(([horario, schedules]) => {
      const gym = data.gymsMap[schedules[0].slotGymId || schedules[0].gymId];
      return `
        <section class="jp-time-group ${schedules.length > 1 ? 'is-shared' : ''}">
          <div class="jp-time-group-head">
            <div><strong>${horario}</strong><span>${gym?.nome ?? 'Academia'}</span></div>
            <div class="jp-group-head-actions">
              <span class="jp-badge-soft">${schedules.length > 1 ? `${schedules.length} alunos juntos` : '1 aluno'}</span>
              <button class="button button-small button-tonal button-round" data-open-slot="${horario}" data-slot-day="${dayKey}">Abrir</button>
            </div>
          </div>
          ${schedules.map((schedule) => {
            const student = data.studentsMap[schedule.studentId];
            const template = data.templates.find((item) => item.studentId === schedule.studentId && item.diaSemana === dayKey);
            return `
              <article class="jp-inline-card is-schedule-card">
                <div>
                  <strong>${student?.nome ?? 'Aluno'}</strong>
                  <p>${template?.nomeTreino ?? 'Treino ainda não configurado'} · ${schedule.observacoes || 'Sem observações'}</p>
                </div>
                <div class="jp-inline-actions">
                  ${badgeStatus(student?.status)}
                  <button class="button button-small button-tonal button-round" data-schedule-edit="${schedule.id}"><i class="f7-icons">square_pencil</i></button>
                  <button class="button button-small button-outline button-round color-red" data-schedule-delete="${schedule.id}"><i class="f7-icons">trash</i></button>
                </div>
              </article>
            `;
          }).join('')}
        </section>
      `;
    }).join('');
  }

  if (pageEl._agendaClickHandler) pageEl.removeEventListener('click', pageEl._agendaClickHandler);
  pageEl._agendaClickHandler = async (event) => {
    const dayButton = event.target.closest('[data-agenda-day]');
    const createButton = event.target.closest('[data-schedule-create]');
    const editButton = event.target.closest('[data-schedule-edit]');
    const deleteButton = event.target.closest('[data-schedule-delete]');
    const slotButton = event.target.closest('[data-open-slot]');

    if (dayButton) {
      selectedDay = dayButton.dataset.agendaDay;
      pageEl.querySelectorAll('[data-agenda-day]').forEach((item) => item.classList.remove('is-active'));
      dayButton.classList.add('is-active');
      renderDay(selectedDay);
      return;
    }
    if (createButton) {
      await openScheduleForm({ students: sortByName(data.students), gyms: sortByName(data.gyms), initialDayKey: selectedDay, onSaved: refresh });
      return;
    }
    if (editButton) {
      const schedule = data.schedules.find((item) => item.id === editButton.dataset.scheduleEdit);
      if (schedule) await openScheduleForm({ schedule, students: sortByName(data.students), gyms: sortByName(data.gyms), initialDayKey: selectedDay, onSaved: refresh });
      return;
    }
    if (deleteButton) {
      const schedule = data.schedules.find((item) => item.id === deleteButton.dataset.scheduleDelete);
      if (schedule) await deleteSchedule(schedule, refresh);
      return;
    }
    if (slotButton) {
      openTimeSlotDetails({ dayKey: slotButton.dataset.slotDay, horario: slotButton.dataset.openSlot, data, source: 'agenda', onUpdated: refresh });
    }
  };
  pageEl.addEventListener('click', pageEl._agendaClickHandler);

  renderDay(selectedDay);
}

async function renderSettings(pageEl) {
  const refresh = () => renderSettings(pageEl);
  const data = await loadBaseData();
  const [studentsCount, gymsCount, logsCount, schedulesCount, exercisesCount] = await Promise.all([
    countRecords(OBJECT_STORES.students),
    countRecords(OBJECT_STORES.gyms),
    countRecords(OBJECT_STORES.workoutLogs),
Promise.resolve(data.schedules.reduce((sum, item) => sum + getScheduleSlots(item).length, 0)),
    countRecords(OBJECT_STORES.exercises)
  ]);

  setHTML(pageEl, '[data-settings-summary]', `
    <div class="jp-summary-grid">
      <article class="jp-soft-card"><span class="jp-soft-label">Banco local</span><strong>IndexedDB</strong><p>dados persistidos no dispositivo.</p></article>
      <article class="jp-soft-card"><span class="jp-soft-label">Versão seed</span><strong>${data.settings?.seedVersionApplied ?? 'v1'}</strong><p>carga inicial controlada.</p></article>
    </div>
  `);

  setHTML(pageEl, '[data-settings-stats]', `
    <div class="list simple-list no-hairlines jp-glass-list">
      <ul>
        <li><span>Alunos salvos</span><span>${studentsCount}</span></li>
        <li><span>Academias salvas</span><span>${gymsCount}</span></li>
        <li><span>Exercícios salvos</span><span>${exercisesCount}</span></li>
        <li><span>Horários recorrentes</span><span>${schedulesCount}</span></li>
        <li><span>Logs de treino</span><span>${logsCount}</span></li>
        <li><span>Tema base</span><span>iOS</span></li>
      </ul>
    </div>
  `);

  setHTML(pageEl, '[data-settings-backup]', `
    <div class="jp-card jp-panel-card">
      <div class="jp-page-intro">
        <div>
          <h2>Backup e restauração</h2>
          <p>Exporte um JSON completo com todas as stores do app ou importe um backup para restaurar o banco local.</p>
        </div>
        <i class="f7-icons">arrow_clockwise_circle</i>
      </div>
      <div class="jp-button-stack">
        <button class="button button-fill button-round" data-backup-export><i class="f7-icons">square_arrow_up</i>Exportar backup JSON</button>
        <button class="button button-outline button-round" data-backup-import><i class="f7-icons">square_arrow_down</i>Importar backup JSON</button>
      </div>
      <div class="jp-export-grid">
        <button class="button button-tonal button-round" data-export-students-csv><i class="f7-icons">doc_text</i>Exportar alunos em CSV</button>
        <button class="button button-tonal button-round" data-export-gyms-csv><i class="f7-icons">doc_text_fill</i>Exportar academias em CSV</button>
      </div>
    </div>
  `);

  if (pageEl._settingsClickHandler) pageEl.removeEventListener('click', pageEl._settingsClickHandler);
  pageEl._settingsClickHandler = async (event) => {
    if (event.target.closest('[data-backup-export]')) return exportFullBackup();
    if (event.target.closest('[data-backup-import]')) return triggerBackupImport(refresh);
    if (event.target.closest('[data-export-students-csv]')) return exportStudentsCsv();
    if (event.target.closest('[data-export-gyms-csv]')) return exportGymsCsv();
  };
  pageEl.addEventListener('click', pageEl._settingsClickHandler);
}

export async function renderPageByName(pageName, pageEl) {
  if (!pageEl) return;

  const pageContent = pageEl.querySelector('.page-content .jp-shell');

  try {
    switch (pageName) {
      case 'home':
        await renderHome(pageEl);
        break;
      case 'agenda':
        await renderAgenda(pageEl);
        break;
      case 'alunos':
        await renderStudents(pageEl);
        break;
      case 'academias':
        await renderGyms(pageEl);
        break;
      case 'exercicios':
        await renderExercises(pageEl);
        break;
      case 'configuracoes':
        await renderSettings(pageEl);
        break;
      default:
        break;
    }
    pageEl.dataset.renderedOnce = 'true';
  } catch (error) {
    console.error(`Falha ao renderizar a página "${pageName}"`, error);
    if (pageContent) {
      pageContent.innerHTML = `<section class="jp-section">${renderErrorState({ text: 'Ocorreu um erro ao carregar os dados locais desta tela.' })}</section>`;
    }
  }
}
