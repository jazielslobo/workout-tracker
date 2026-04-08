export function ensureTimeValue(value = '') {
  if (!value) return '';
  const clean = String(value).replace(/[^\d:]/g, '');
  if (/^\d{2}:\d{2}$/.test(clean)) return clean;
  const digits = clean.replace(/\D/g, '').slice(0, 4);
  if (digits.length < 4) return clean;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

export function isValidTime(value = '') {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function getScheduleSlots(schedule = {}) {
  if (Array.isArray(schedule.slots) && schedule.slots.length) {
    return schedule.slots
      .map((slot) => ({
        dayKey: String(slot.dayKey || '').trim(),
        horario: ensureTimeValue(slot.horario || ''),
        gymId: slot.gymId || schedule.gymId || '',
        observacoes: slot.observacoes || ''
      }))
      .filter((slot) => slot.dayKey && isValidTime(slot.horario));
  }

  if (Array.isArray(schedule.diasSemana) && schedule.horario) {
    return schedule.diasSemana
      .map((dayKey) => ({
        dayKey,
        horario: ensureTimeValue(schedule.horario),
        gymId: schedule.gymId || '',
        observacoes: schedule.observacoes || ''
      }))
      .filter((slot) => slot.dayKey && isValidTime(slot.horario));
  }

  return [];
}

export function getScheduleSlotForDay(schedule = {}, dayKey = '') {
  return getScheduleSlots(schedule).find((slot) => slot.dayKey === dayKey) || null;
}

export function scheduleMatchesDay(schedule = {}, dayKey = '') {
  return Boolean(getScheduleSlotForDay(schedule, dayKey));
}

export function buildSearchTokens(slots = []) {
  return slots.map((slot) => `${slot.dayKey}-${slot.horario}`);
}

export function buildSchedulePayload({ existingSchedule = null, studentId, gymId, observacoes = '', ativo = true, slots = [] }) {
  const normalizedSlots = slots
    .map((slot) => ({
      dayKey: String(slot.dayKey || '').trim(),
      horario: ensureTimeValue(slot.horario || ''),
      gymId: slot.gymId || gymId || ''
    }))
    .filter((slot) => slot.dayKey && isValidTime(slot.horario));

  const sortedSlots = normalizedSlots.sort((a, b) => {
    if (a.dayKey === b.dayKey) return a.horario.localeCompare(b.horario);
    return a.dayKey.localeCompare(b.dayKey);
  });

  return {
    id: existingSchedule?.id,
    studentId,
    gymId,
    observacoes,
    ativo,
    slots: sortedSlots,
    diasSemana: sortedSlots.map((slot) => slot.dayKey),
    horario: sortedSlots[0]?.horario || '',
    searchTokens: buildSearchTokens(sortedSlots),
    createdAt: existingSchedule?.createdAt,
    updatedAt: new Date().toISOString()
  };
}

export function expandSchedulesForDay(schedules = [], dayKey = '') {
  return schedules.flatMap((schedule) => {
    const slot = getScheduleSlotForDay(schedule, dayKey);
    if (!slot) return [];
    return [{
      ...schedule,
      dayKey,
      horario: slot.horario,
      slotGymId: slot.gymId || schedule.gymId || '',
      slotKey: `${schedule.id}::${dayKey}::${slot.horario}`
    }];
  });
}

export function describeSlots(slots = [], getDayLabel = (key) => key) {
  return slots
    .map((slot) => `${getDayLabel(slot.dayKey)} às ${slot.horario}`)
    .join(', ');
}
