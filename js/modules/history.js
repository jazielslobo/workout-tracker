import { OBJECT_STORES } from '../utils/constants.js';
import { getAllRecords } from '../db/repository.js';
import { formatDateLabel, formatPhone, getWeekDayLabel } from '../utils/formatters.js';
import { openWhatsAppForWorkoutSummary } from './whatsapp.js';

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

function emptyState() {
  return `
    <div class="jp-empty-state">
      <i class="f7-icons">clock_badge_questionmark</i>
      <h3>Nenhum treino registrado</h3>
      <p>Quando este aluno tiver treinos concluídos, o histórico completo aparecerá aqui em ordem do mais recente para o mais antigo.</p>
    </div>
  `;
}

function computeLatestLoads(logs) {
  const latest = {};
  logs.forEach((log) => {
    (log.exerciciosRealizados || []).forEach((item) => {
      if (!latest[item.exerciseId] && item.carga) {
        latest[item.exerciseId] = item.carga;
      }
    });
  });
  return latest;
}

export async function openStudentHistory({ student, gymsMap = {} }) {
  const allLogs = await getAllRecords(OBJECT_STORES.workoutLogs);
  const studentLogs = allLogs
    .filter((log) => log.studentId === student.id)
    .sort((a, b) => `${b.data} ${b.horario || ''}`.localeCompare(`${a.data} ${a.horario || ''}`));

  const latestLoads = computeLatestLoads(studentLogs);

  const body = studentLogs.length ? studentLogs.map((log) => {
    const gym = gymsMap[log.gymId];
    return `
      <article class="jp-history-card">
        <div class="jp-history-head">
          <div>
            <h3>${escapeHtml(formatDateLabel(new Date(`${log.data}T12:00:00`)))}</h3>
            <p>${escapeHtml(getWeekDayLabel(log.diaSemana))} · ${escapeHtml(log.horario || '—')} · ${escapeHtml(gym?.nome || 'Academia não informada')}</p>
            <small>${escapeHtml(gym?.endereco || 'Endereço não informado')}</small>
          </div>
          <div class="jp-history-status">
            <span class="jp-check-chip ${log.concluido ? 'is-success' : ''}">${log.concluido ? 'concluído' : 'pendente'}</span>
            <button class="button button-small button-tonal button-round" data-history-whatsapp="${log.id}"><i class="f7-icons">chat_bubble_2_fill</i>WhatsApp</button>
          </div>
        </div>
        <div class="jp-history-exercises">
          ${(log.exerciciosRealizados || []).map((item) => {
            const latestLabel = latestLoads[item.exerciseId];
            const isLatest = latestLabel && latestLabel === item.carga;
            return `
              <div class="jp-history-exercise">
                <div>
                  <strong>${escapeHtml(item.nome || 'Exercício')}</strong>
                  <p>${escapeHtml(item.seriesPlanejadas || '—')} séries · ${escapeHtml(item.repeticoes || '—')} reps</p>
                </div>
                <div class="jp-history-loads">
                  <span class="jp-weight-chip">Carga: ${escapeHtml(item.carga || '—')}</span>
                  ${latestLabel ? `<span class="jp-last-load-chip ${isLatest ? 'is-current' : ''}">${isLatest ? 'último peso' : `último: ${escapeHtml(latestLabel)}`}</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="jp-history-footer">
          <span><i class="f7-icons">text_quote</i> ${escapeHtml(log.observacoes || 'Sem observações')}</span>
        </div>
      </article>
    `;
  }).join('') : emptyState();

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
                  <strong>Histórico de ${escapeHtml(student.nome)}</strong>
                  <small>${escapeHtml(formatPhone(student.telefone || ''))} · ${studentLogs.length} treino(s)</small>
                </div>
              </div>
            </div>
            <div class="page-content">
              <div class="jp-shell">
                <section class="jp-section">
                  <div class="jp-stack" data-history-list>${body}</div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  });

  popup.on('opened', () => {
    popup.el.addEventListener('click', (event) => {
      const button = event.target.closest('[data-history-whatsapp]');
      if (!button) return;
      const log = studentLogs.find((item) => item.id === button.dataset.historyWhatsapp);
      if (!log) return;
      const gym = gymsMap[log.gymId];
      openWhatsAppForWorkoutSummary({ student, log, gym });
    });
  });

  popup.on('closed', () => popup.destroy());
  popup.open();
}
