import { digitsOnly, formatDateLabel } from '../utils/formatters.js';

function app() {
  return window.jpApp;
}

function showToast(text, icon = 'info_circle_fill') {
  app().toast.create({
    text: `<div class="jp-toast-body"><i class="f7-icons">${icon}</i><span>${text}</span></div>`,
    closeTimeout: 2400,
    position: 'center'
  }).open();
}

export function buildWorkoutSummaryMessage({ student, log, gym }) {
  if (!log) return '';
  const lines = [
    'Treino de hoje 💪',
    '',
    `Aluno: ${student?.nome || 'Aluno'}`,
    `Dia: ${formatDateLabel(new Date(`${log.data}T12:00:00`))}`,
    `Horário: ${log.horario || '—'}`,
    gym?.nome ? `Academia: ${gym.nome}` : null,
    '',
    ...((log.exerciciosRealizados || []).map((item) => `${item.nome || 'Exercício'} — ${item.carga || 'sem carga registrada'}`)),
    '',
    log.observacoes ? `Obs.: ${log.observacoes}` : null,
    'Bom treino e seguimos evoluindo!'
  ].filter(Boolean);

  return lines.join('\n');
}

export function createWorkoutSummaryLink({ student, log, gym }) {
  const digits = digitsOnly(student?.telefone || '');
  if (!digits || !log) return '';
  const message = buildWorkoutSummaryMessage({ student, log, gym });
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppForWorkoutSummary({ student, log, gym }) {
  if (!student?.telefone) {
    showToast('Este aluno ainda não possui telefone cadastrado.', 'phone_badge_plus');
    return false;
  }
  if (!log) {
    showToast('Salve as cargas ou conclua o treino de hoje para gerar o resumo do WhatsApp.', 'exclamationmark_circle_fill');
    return false;
  }

  const link = createWorkoutSummaryLink({ student, log, gym });
  if (!link) {
    showToast('Não foi possível montar a mensagem para o WhatsApp.', 'exclamationmark_triangle_fill');
    return false;
  }

  window.open(link, '_blank', 'noopener');
  return true;
}
