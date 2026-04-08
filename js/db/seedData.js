import { DEFAULT_SETTINGS, OBJECT_STORES, STATUS } from '../utils/constants.js';
import { addRecord, countRecords, generateId, putRecord } from './repository.js';

function timestamp() {
  return new Date().toISOString();
}

function slugMap(items) {
  return items.reduce((acc, item) => {
    acc[item.slug] = item.id;
    return acc;
  }, {});
}

function exercise(nome, grupoMuscular, observacoes = '') {
  return {
    id: generateId('exercise'),
    nome,
    grupoMuscular,
    observacoes,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
}

export async function seedInitialData() {
  const settingsCount = await countRecords(OBJECT_STORES.settings);
  if (!settingsCount) {
    await putRecord(OBJECT_STORES.settings, { id: 'app-settings', ...DEFAULT_SETTINGS });
  }

  const studentsCount = await countRecords(OBJECT_STORES.students);
  if (studentsCount > 0) return { seeded: false };

  const gyms = [
    {
      id: generateId('gym'), slug: 'alpha-fit', nome: 'Academia Alpha Fit', endereco: 'Av. Beira Mar, 1200 - Aracaju/SE',
      googleMapsUrl: 'https://maps.google.com', wazeUrl: 'https://www.waze.com', observacoes: 'Unidade com pico cedo.',
      createdAt: timestamp(), updatedAt: timestamp()
    },
    {
      id: generateId('gym'), slug: 'power-house', nome: 'Studio Power House', endereco: 'Rua José do Prado, 88 - Barra dos Coqueiros/SE',
      googleMapsUrl: 'https://maps.google.com', wazeUrl: 'https://www.waze.com', observacoes: 'Atendimento personalizado e funcional.',
      createdAt: timestamp(), updatedAt: timestamp()
    },
    {
      id: generateId('gym'), slug: 'iron-club', nome: 'CT Iron Club', endereco: 'Av. Hermes Fontes, 455 - Aracaju/SE',
      googleMapsUrl: 'https://maps.google.com', wazeUrl: 'https://www.waze.com', observacoes: 'Foco em musculação e performance.',
      createdAt: timestamp(), updatedAt: timestamp()
    }
  ];

  for (const gym of gyms) {
    await addRecord(OBJECT_STORES.gyms, gym);
  }
  const gymIds = slugMap(gyms);

  const students = [
    {
      id: generateId('student'), slug: 'camila', nome: 'Camila Andrade', telefone: '(79) 99911-2233', status: STATUS.ACTIVE,
      observacoes: 'Objetivo: hipertrofia em membros inferiores.', academiaPrincipalId: gymIds['alpha-fit'],
      createdAt: timestamp(), updatedAt: timestamp()
    },
    {
      id: generateId('student'), slug: 'lucas', nome: 'Lucas Menezes', telefone: '(79) 99888-7711', status: STATUS.ACTIVE,
      observacoes: 'Treino cedo antes do trabalho.', academiaPrincipalId: gymIds['alpha-fit'],
      createdAt: timestamp(), updatedAt: timestamp()
    },
    {
      id: generateId('student'), slug: 'mariana', nome: 'Mariana Santos', telefone: '(79) 99666-4422', status: STATUS.ACTIVE,
      observacoes: 'Precisa atenção especial ao ombro.', academiaPrincipalId: gymIds['power-house'],
      createdAt: timestamp(), updatedAt: timestamp()
    },
    {
      id: generateId('student'), slug: 'pedro', nome: 'Pedro Henrique', telefone: '(79) 99777-1900', status: STATUS.INACTIVE,
      observacoes: 'Aluno pausado por viagem.', academiaPrincipalId: gymIds['iron-club'],
      createdAt: timestamp(), updatedAt: timestamp(), inactivatedAt: timestamp()
    }
  ];

  for (const student of students) {
    await addRecord(OBJECT_STORES.students, student);
  }
  const studentIds = slugMap(students);

  const exercises = [
    exercise('Supino reto com barra', 'Peito'),
    exercise('Supino inclinado com halteres', 'Peito'),
    exercise('Crucifixo máquina', 'Peito'),
    exercise('Puxada frontal aberta', 'Costas'),
    exercise('Remada curvada com barra', 'Costas'),
    exercise('Remada baixa triangulo', 'Costas'),
    exercise('Desenvolvimento com halteres', 'Ombros'),
    exercise('Elevação lateral', 'Ombros'),
    exercise('Face pull', 'Ombros'),
    exercise('Rosca direta com barra', 'Bíceps'),
    exercise('Rosca alternada', 'Bíceps'),
    exercise('Tríceps pulley', 'Tríceps'),
    exercise('Tríceps francês unilateral', 'Tríceps'),
    exercise('Agachamento livre', 'Quadríceps'),
    exercise('Leg press 45°', 'Quadríceps'),
    exercise('Cadeira extensora', 'Quadríceps'),
    exercise('Stiff com barra', 'Posterior de coxa'),
    exercise('Mesa flexora', 'Posterior de coxa'),
    exercise('Elevação pélvica', 'Glúteos'),
    exercise('Abdução máquina', 'Glúteos'),
    exercise('Panturrilha em pé', 'Panturrilhas'),
    exercise('Panturrilha sentada', 'Panturrilhas'),
    exercise('Prancha abdominal', 'Core'),
    exercise('Abdominal infra no banco', 'Core'),
    exercise('Dead bug', 'Core')
  ];

  for (const item of exercises) {
    await addRecord(OBJECT_STORES.exercises, item);
  }

  const exerciseIdByName = Object.fromEntries(exercises.map((item) => [item.nome, item.id]));

  const schedules = [
    {
      id: generateId('schedule'),
      studentId: studentIds.camila,
      diasSemana: ['monday', 'wednesday', 'friday'],
      horario: '06:00',
      gymId: gymIds['alpha-fit'],
      observacoes: 'Treino de inferiores e progressão de carga.',
      ativo: true,
      createdAt: timestamp(),
      updatedAt: timestamp()
    },
    {
      id: generateId('schedule'),
      studentId: studentIds.lucas,
      diasSemana: ['monday', 'thursday', 'friday'],
      horario: '06:00',
      gymId: gymIds['alpha-fit'],
      observacoes: 'Treino curto e objetivo.',
      ativo: true,
      createdAt: timestamp(),
      updatedAt: timestamp()
    },
    {
      id: generateId('schedule'),
      studentId: studentIds.mariana,
      diasSemana: ['tuesday', 'thursday'],
      horario: '18:30',
      gymId: gymIds['power-house'],
      observacoes: 'Ajustar exercícios acima da cabeça.',
      ativo: true,
      createdAt: timestamp(),
      updatedAt: timestamp()
    },
    {
      id: generateId('schedule'),
      studentId: studentIds.pedro,
      diasSemana: ['saturday'],
      horario: '09:00',
      gymId: gymIds['iron-club'],
      observacoes: 'Agenda pausada junto com status do aluno.',
      ativo: false,
      createdAt: timestamp(),
      updatedAt: timestamp()
    }
  ];

  for (const item of schedules) {
    await addRecord(OBJECT_STORES.schedules, item);
  }

  const workoutTemplates = [
    {
      id: generateId('template'),
      studentId: studentIds.camila,
      diaSemana: 'monday',
      nomeTreino: 'Treino A — Inferiores',
      exercicios: [
        { exerciseId: exerciseIdByName['Agachamento livre'], series: 4, repeticoes: '8-10', carga: '30kg', descansoSegundos: 90, observacoes: 'Priorizar técnica.' },
        { exerciseId: exerciseIdByName['Leg press 45°'], series: 4, repeticoes: '10-12', carga: '120kg', descansoSegundos: 75, observacoes: '' },
        { exerciseId: exerciseIdByName['Elevação pélvica'], series: 4, repeticoes: '12', carga: '60kg', descansoSegundos: 60, observacoes: 'Pico de contração.' }
      ],
      observacoes: 'Foco em glúteos e quadríceps.',
      createdAt: timestamp(), updatedAt: timestamp()
    },
    {
      id: generateId('template'),
      studentId: studentIds.lucas,
      diaSemana: 'monday',
      nomeTreino: 'Treino A — Peito e Tríceps',
      exercicios: [
        { exerciseId: exerciseIdByName['Supino reto com barra'], series: 4, repeticoes: '6-8', carga: '50kg', descansoSegundos: 90, observacoes: '' },
        { exerciseId: exerciseIdByName['Supino inclinado com halteres'], series: 3, repeticoes: '8-10', carga: '20kg', descansoSegundos: 75, observacoes: '' },
        { exerciseId: exerciseIdByName['Tríceps pulley'], series: 3, repeticoes: '12', carga: '30kg', descansoSegundos: 45, observacoes: '' }
      ],
      observacoes: 'Sessão rápida antes do trabalho.',
      createdAt: timestamp(), updatedAt: timestamp()
    },
    {
      id: generateId('template'),
      studentId: studentIds.mariana,
      diaSemana: 'thursday',
      nomeTreino: 'Treino B — Costas e Core',
      exercicios: [
        { exerciseId: exerciseIdByName['Puxada frontal aberta'], series: 4, repeticoes: '10', carga: '35kg', descansoSegundos: 60, observacoes: '' },
        { exerciseId: exerciseIdByName['Remada baixa triangulo'], series: 3, repeticoes: '10-12', carga: '30kg', descansoSegundos: 60, observacoes: '' },
        { exerciseId: exerciseIdByName['Prancha abdominal'], series: 3, repeticoes: '40s', carga: 'Peso corporal', descansoSegundos: 40, observacoes: 'Manter lombar neutra.' }
      ],
      observacoes: 'Sem exercícios que irritem o ombro.',
      createdAt: timestamp(), updatedAt: timestamp()
    }
  ];

  for (const item of workoutTemplates) {
    await addRecord(OBJECT_STORES.workoutTemplates, item);
  }

  const workoutLogs = [
    {
      id: generateId('log'),
      studentId: studentIds.camila,
      data: '2026-04-06',
      diaSemana: 'monday',
      horario: '06:00',
      gymId: gymIds['alpha-fit'],
      exerciciosRealizados: [
        { exerciseId: exerciseIdByName['Agachamento livre'], nome: 'Agachamento livre', seriesPlanejadas: 4, seriesRealizadas: 4, repeticoes: '8-10', carga: '30kg' },
        { exerciseId: exerciseIdByName['Leg press 45°'], nome: 'Leg press 45°', seriesPlanejadas: 4, seriesRealizadas: 4, repeticoes: '10-12', carga: '120kg' }
      ],
      concluido: true,
      observacoes: 'Boa execução e progressão controlada.',
      createdAt: timestamp(), updatedAt: timestamp()
    },
    {
      id: generateId('log'),
      studentId: studentIds.lucas,
      data: '2026-04-06',
      diaSemana: 'monday',
      horario: '06:00',
      gymId: gymIds['alpha-fit'],
      exerciciosRealizados: [
        { exerciseId: exerciseIdByName['Supino reto com barra'], nome: 'Supino reto com barra', seriesPlanejadas: 4, seriesRealizadas: 4, repeticoes: '6-8', carga: '50kg' }
      ],
      concluido: true,
      observacoes: 'Treino rápido e completo.',
      createdAt: timestamp(), updatedAt: timestamp()
    }
  ];

  for (const item of workoutLogs) {
    await addRecord(OBJECT_STORES.workoutLogs, item);
  }

  return {
    seeded: true,
    summary: {
      gyms: gyms.length,
      students: students.length,
      exercises: exercises.length,
      schedules: schedules.length,
      workoutTemplates: workoutTemplates.length,
      workoutLogs: workoutLogs.length
    }
  };
}
