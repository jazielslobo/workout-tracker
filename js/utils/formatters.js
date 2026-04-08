import { WEEK_DAYS } from './constants.js';

export function getWeekDayLabel(key) {
  return WEEK_DAYS.find((day) => day.key === key)?.label ?? key;
}

export function getWeekDayShort(key) {
  return WEEK_DAYS.find((day) => day.key === key)?.short ?? key;
}

export function getCurrentWeekDayKey(date = new Date()) {
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[date.getDay()];
}

export function capitalize(text = '') {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function sortByName(items, field = 'nome') {
  return [...items].sort((a, b) => String(a[field]).localeCompare(String(b[field]), 'pt-BR'));
}

export function normalizeText(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function formatPhone(phone = '') {
  return phone || 'Sem telefone';
}

export function digitsOnly(value = '') {
  return String(value).replace(/\D/g, '');
}

export function createGoogleMapsUrl(address = '') {
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
}

export function createWazeUrl(address = '') {
  return address ? `https://waze.com/ul?q=${encodeURIComponent(address)}` : '';
}

export function formatDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export function formatTimeLabel(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeValue(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
