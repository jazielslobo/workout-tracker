export const APP_NAME = 'Jeferson Personal';
export const APP_VERSION = '1.3.0';

export const DB_NAME = 'jeferson-personal-db';
export const DB_VERSION = 3;

export const OBJECT_STORES = {
  students: 'students',
  gyms: 'gyms',
  exercises: 'exercises',
  schedules: 'schedules',
  workoutTemplates: 'workoutTemplates',
  workoutLogs: 'workoutLogs',
  settings: 'settings'
};

export const DEFAULT_SETTINGS = {
  trainerName: 'Jeferson Personal',
  theme: 'ios-light',
  weekStartsOn: 'monday',
  onboardingCompleted: true,
  seedVersionApplied: 'v4',
  backupEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const WEEK_DAYS = [
  { key: 'monday', short: 'Seg', label: 'Segunda' },
  { key: 'tuesday', short: 'Ter', label: 'Terça' },
  { key: 'wednesday', short: 'Qua', label: 'Quarta' },
  { key: 'thursday', short: 'Qui', label: 'Quinta' },
  { key: 'friday', short: 'Sex', label: 'Sexta' },
  { key: 'saturday', short: 'Sáb', label: 'Sábado' },
  { key: 'sunday', short: 'Dom', label: 'Domingo' }
];

export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};
