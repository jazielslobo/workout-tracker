import { DEFAULT_SETTINGS, OBJECT_STORES, STATUS } from '../utils/constants.js';
import { addRecord, countRecords, generateId, getRecordById, putRecord } from './repository.js';

function timestamp() {
  return new Date().toISOString();
}

function exercise(id, nome, grupoMuscular, observacoes = '') {
  return {
    id,
    nome,
    grupoMuscular,
    observacoes,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
}

function gym(id, nome, endereco, googleMapsUrl, wazeUrl, observacoes = '') {
  return {
    id,
    nome,
    endereco,
    googleMapsUrl,
    wazeUrl,
    observacoes,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
}

function student(id, nome, academiaPrincipalId, observacoes = '', telefone = '', status = STATUS.ACTIVE) {
  const now = timestamp();
  return {
    id,
    nome,
    telefone,
    status,
    observacoes,
    academiaPrincipalId,
    createdAt: now,
    updatedAt: now,
    ...(status === STATUS.INACTIVE ? { inactivatedAt: now } : {})
  };
}

function schedule({ id, studentId, gymId, observacoes = '', ativo = true, slots = [] }) {
  const normalizedSlots = slots.map((slot) => ({
    dayKey: slot.dayKey,
    horario: slot.horario,
    gymId: slot.gymId || gymId,
    observacoes: slot.observacoes || ''
  }));

  return {
    id,
    studentId,
    gymId,
    observacoes,
    ativo,
    slots: normalizedSlots,
    diasSemana: normalizedSlots.map((slot) => slot.dayKey),
    horario: normalizedSlots[0]?.horario || '',
    searchTokens: normalizedSlots.map((slot) => `${slot.dayKey}-${slot.horario}`),
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
}

function workoutTemplate({ id, studentId, diaSemana, nomeTreino, exercicios = [], observacoes = '' }) {
  return {
    id,
    studentId,
    diaSemana,
    nomeTreino,
    exercicios,
    observacoes,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
}

async function ensureSettingsRecord() {
  const existing = await getRecordById(OBJECT_STORES.settings, 'app-settings');
  if (!existing) {
    await putRecord(OBJECT_STORES.settings, { id: 'app-settings', ...DEFAULT_SETTINGS });
    return { id: 'app-settings', ...DEFAULT_SETTINGS };
  }

  return existing;
}

async function upsertRecords(storeName, records = []) {
  for (const record of records) {
    await putRecord(storeName, record);
  }
}

export async function seedInitialData() {
  const settings = await ensureSettingsRecord();
  const studentsCount = await countRecords(OBJECT_STORES.students);
  const shouldRunFullSeed = studentsCount === 0;
  const shouldApplyRealDataPatch = settings.seedVersionApplied !== 'v4';

  const gyms = [
    gym(
      'gym_smartfit_jardins',
      'Smart Fit Jardins',
      'Av. Deputado Pedro Valadares, 890 - Jardins, Aracaju - SE, 49025-090',
      'https://www.google.com/maps/search/?api=1&query=Av.+Deputado+Pedro+Valadares,+890,+Jardins,+Aracaju,+SE',
      'https://waze.com/ul?q=Av.%20Deputado%20Pedro%20Valadares%2C%20890%2C%20Jardins%2C%20Aracaju%2C%20SE',
      'Unidade Smart Fit pesquisada na web; academia principal de Jaziel e Mariângela.'
    ),
    gym(
      'gym_smartfit_farolandia',
      'Smart Fit Farolândia',
      'Avenida Capitão Joaquim Martins Fontes, 250 - Farolândia, Aracaju - SE, 49032-016',
      'https://www.google.com/maps/search/?api=1&query=Avenida+Capit%C3%A3o+Joaquim+Martins+Fontes,+250,+Farol%C3%A2ndia,+Aracaju,+SE',
      'https://waze.com/ul?q=Avenida%20Capit%C3%A3o%20Joaquim%20Martins%20Fontes%2C%20250%2C%20Farol%C3%A2ndia%2C%20Aracaju%2C%20SE'
    ),
    gym(
      'gym_smartfit_atakarejo_adelia_franco',
      'Smart Fit Atakarejo Adélia Franco',
      'Avenida Adélia Franco, 2351 - Luzia, Aracaju - SE, 49048-010',
      'https://www.google.com/maps/search/?api=1&query=Avenida+Ad%C3%A9lia+Franco,+2351,+Luzia,+Aracaju,+SE',
      'https://waze.com/ul?q=Avenida%20Ad%C3%A9lia%20Franco%2C%202351%2C%20Luzia%2C%20Aracaju%2C%20SE'
    ),
    gym(
      'gym_smartfit_jabotiana',
      'Smart Fit Jabotiana',
      'Rua Dois, 3093 - Jabotiana, Aracaju - SE, 49095-683',
      'https://www.google.com/maps/search/?api=1&query=Rua+Dois,+3093,+Jabotiana,+Aracaju,+SE',
      'https://waze.com/ul?q=Rua%20Dois%2C%203093%2C%20Jabotiana%2C%20Aracaju%2C%20SE'
    ),
    gym(
      'gym_smartfit_siqueira_campos',
      'Smart Fit Siqueira Campos',
      'Rua Desembargador Enock Santiago, 62 - Siqueira Campos, Aracaju - SE, 49082-160',
      'https://www.google.com/maps/search/?api=1&query=Rua+Desembargador+Enock+Santiago,+62,+Siqueira+Campos,+Aracaju,+SE',
      'https://waze.com/ul?q=Rua%20Desembargador%20Enock%20Santiago%2C%2062%2C%20Siqueira%20Campos%2C%20Aracaju%2C%20SE'
    ),
    gym(
      'gym_smartfit_riomar',
      'Smart Fit Riomar Shopping',
      'Avenida Delmiro Gouveia, 400, Loja 174 - Coroa do Meio, Aracaju - SE, 49035-900',
      'https://www.google.com/maps/search/?api=1&query=Avenida+Delmiro+Gouveia,+400,+Loja+174,+Coroa+do+Meio,+Aracaju,+SE',
      'https://waze.com/ul?q=Avenida%20Delmiro%20Gouveia%2C%20400%2C%20Loja%20174%2C%20Coroa%20do%20Meio%2C%20Aracaju%2C%20SE'
    ),
    gym(
      'gym_smartfit_visconde_maracaju',
      'Smart Fit Visconde de Maracaju',
      'Avenida Visconde de Maracaju, s/n - Cidade Nova, Aracaju - SE, 49070-070',
      'https://www.google.com/maps/search/?api=1&query=Avenida+Visconde+de+Maracaju,+Cidade+Nova,+Aracaju,+SE',
      'https://waze.com/ul?q=Avenida%20Visconde%20de%20Maracaju%2C%20Cidade%20Nova%2C%20Aracaju%2C%20SE'
    ),
    gym(
      'gym_smartfit_melicio_machado',
      'Smart Fit Av. Melício Machado',
      'Avenida Melício Machado, 850 - Atalaia, Aracaju - SE, 49037-440',
      'https://www.google.com/maps/search/?api=1&query=Avenida+Mel%C3%ADcio+Machado,+850,+Atalaia,+Aracaju,+SE',
      'https://waze.com/ul?q=Avenida%20Mel%C3%ADcio%20Machado%2C%20850%2C%20Atalaia%2C%20Aracaju%2C%20SE'
    ),
    gym(
      'gym_smartfit_santa_maria',
      'Smart Fit Aracaju - Santa Maria',
      'Avenida Alexandre Alcino, 1436 - Marivan, Aracaju - SE, 49039-241',
      'https://www.google.com/maps/search/?api=1&query=Avenida+Alexandre+Alcino,+1436,+Marivan,+Aracaju,+SE',
      'https://waze.com/ul?q=Avenida%20Alexandre%20Alcino%2C%201436%2C%20Marivan%2C%20Aracaju%2C%20SE'
    ),
    gym(
      'gym_smartfit_praia_sul',
      'Smart Fit Shopping Praia Sul',
      'Avenida Melício Machado, s/n - Aruana, Aracaju - SE, 49038-445',
      'https://www.google.com/maps/search/?api=1&query=Avenida+Mel%C3%ADcio+Machado,+Shopping+Praia+Sul,+Aruana,+Aracaju,+SE',
      'https://waze.com/ul?q=Avenida%20Mel%C3%ADcio%20Machado%2C%20Shopping%20Praia%20Sul%2C%20Aruana%2C%20Aracaju%2C%20SE'
    ),
    gym(
      'gym_bm_fitclub_grageru',
      'ACADEMIA B&M FitClub - Grageru',
      'Rua Manoel Espírito Santo, 20 - Grageru, Aracaju - SE, 49025-440',
      'https://www.google.com/maps/search/?api=1&query=Rua+Manoel+Esp%C3%ADrito+Santo,+20,+Grageru,+Aracaju,+SE',
      'https://waze.com/ul?q=Rua%20Manoel%20Esp%C3%ADrito%20Santo%2C%2020%2C%20Grageru%2C%20Aracaju%2C%20SE',
      'Unidade citada pela própria B&M FitClub em redes sociais e em cadastros empresariais.'
    ),
    gym(
      'gym_bm_fitclub_13_julho',
      'ACADEMIA B&M FitClub - 13 de Julho',
      'Rua José Ramos da Silva, 59 - 13 de Julho, Aracaju - SE, 49020-200',
      'https://www.google.com/maps/search/?api=1&query=Rua+Jos%C3%A9+Ramos+da+Silva,+59,+13+de+Julho,+Aracaju,+SE',
      'https://waze.com/ul?q=Rua%20Jos%C3%A9%20Ramos%20da%20Silva%2C%2059%2C%2013%20de%20Julho%2C%20Aracaju%2C%20SE',
      'Unidade citada pela própria B&M FitClub em redes sociais e em cadastros empresariais.'
    ),
    gym(
      'gym_paulo_bedeu_club',
      'Academia Paulo Bedeu Club',
      'Avenida Jorge Amado, 1589 - Jardins, Aracaju - SE, 49025-330',
      'https://www.google.com/maps/search/?api=1&query=Avenida+Jorge+Amado,+1589,+Jardins,+Aracaju,+SE',
      'https://waze.com/ul?q=Avenida%20Jorge%20Amado%2C%201589%2C%20Jardins%2C%20Aracaju%2C%20SE',
      'Unidade oficial Paulo Bedeu Club.'
    )
  ];

  const students = [
    student(
      'student_jaziel_lobo',
      'Jaziel Lobo',
      'gym_smartfit_jardins',
      'Treina junto com Mariângela. Academia principal: Smart Fit Jardins.'
    ),
    student(
      'student_mariangela_lobo',
      'Mariângela Lobo',
      'gym_smartfit_jardins',
      'Treina junto com Jaziel. Academia principal: Smart Fit Jardins.'
    )
  ];

  const exercises = [
    exercise('exercise_supino_reto_barra', 'Supino reto com barra', 'Peito'),
    exercise('exercise_supino_inclinado_halteres', 'Supino inclinado com halteres', 'Peito'),
    exercise('exercise_crucifixo_maquina', 'Crucifixo máquina', 'Peito'),
    exercise('exercise_puxada_frontal_aberta', 'Puxada frontal aberta', 'Costas'),
    exercise('exercise_remada_curvada_barra', 'Remada curvada com barra', 'Costas'),
    exercise('exercise_remada_baixa_triangulo', 'Remada baixa triângulo', 'Costas'),
    exercise('exercise_desenvolvimento_halteres', 'Desenvolvimento com halteres', 'Ombros'),
    exercise('exercise_elevacao_lateral', 'Elevação lateral', 'Ombros'),
    exercise('exercise_face_pull', 'Face pull', 'Ombros'),
    exercise('exercise_rosca_direta_barra', 'Rosca direta com barra', 'Bíceps'),
    exercise('exercise_rosca_alternada', 'Rosca alternada', 'Bíceps'),
    exercise('exercise_triceps_pulley', 'Tríceps pulley', 'Tríceps'),
    exercise('exercise_triceps_frances_unilateral', 'Tríceps francês unilateral', 'Tríceps'),
    exercise('exercise_agachamento_livre', 'Agachamento livre', 'Quadríceps'),
    exercise('exercise_leg_press_45', 'Leg press 45°', 'Quadríceps'),
    exercise('exercise_cadeira_extensora', 'Cadeira extensora', 'Quadríceps'),
    exercise('exercise_stiff_barra', 'Stiff com barra', 'Posterior de coxa'),
    exercise('exercise_mesa_flexora', 'Mesa flexora', 'Posterior de coxa'),
    exercise('exercise_elevacao_pelvica', 'Elevação pélvica', 'Glúteos'),
    exercise('exercise_abducao_maquina', 'Abdução máquina', 'Glúteos'),
    exercise('exercise_panturrilha_pe', 'Panturrilha em pé', 'Panturrilhas'),
    exercise('exercise_panturrilha_sentada', 'Panturrilha sentada', 'Panturrilhas'),
    exercise('exercise_prancha_abdominal', 'Prancha abdominal', 'Core'),
    exercise('exercise_abdominal_infra_banco', 'Abdominal infra no banco', 'Core'),
    exercise('exercise_dead_bug', 'Dead bug', 'Core')
  ];

  const workoutTemplates = [
    workoutTemplate({
      id: 'template_jaziel_tuesday',
      studentId: 'student_jaziel_lobo',
      diaSemana: 'tuesday',
      nomeTreino: 'Treino A — Peito, Ombros e Tríceps',
      exercicios: [
        { exerciseId: 'exercise_supino_reto_barra', series: 4, repeticoes: '8-10', carga: '40kg', descansoSegundos: 90, observacoes: '' },
        { exerciseId: 'exercise_supino_inclinado_halteres', series: 3, repeticoes: '10-12', carga: '18kg', descansoSegundos: 75, observacoes: '' },
        { exerciseId: 'exercise_desenvolvimento_halteres', series: 3, repeticoes: '10', carga: '14kg', descansoSegundos: 60, observacoes: '' },
        { exerciseId: 'exercise_triceps_pulley', series: 3, repeticoes: '12', carga: '30kg', descansoSegundos: 45, observacoes: '' }
      ],
      observacoes: 'Sessão de terça às 11:30 na Smart Fit Jardins.'
    }),
    workoutTemplate({
      id: 'template_jaziel_wednesday',
      studentId: 'student_jaziel_lobo',
      diaSemana: 'wednesday',
      nomeTreino: 'Treino B — Costas, Bíceps e Core',
      exercicios: [
        { exerciseId: 'exercise_puxada_frontal_aberta', series: 4, repeticoes: '10', carga: '40kg', descansoSegundos: 60, observacoes: '' },
        { exerciseId: 'exercise_remada_baixa_triangulo', series: 3, repeticoes: '10-12', carga: '35kg', descansoSegundos: 60, observacoes: '' },
        { exerciseId: 'exercise_rosca_direta_barra', series: 3, repeticoes: '10', carga: '20kg', descansoSegundos: 45, observacoes: '' },
        { exerciseId: 'exercise_prancha_abdominal', series: 3, repeticoes: '40s', carga: 'Peso corporal', descansoSegundos: 40, observacoes: '' }
      ],
      observacoes: 'Sessão de quarta às 14:00 na Smart Fit Jardins.'
    }),
    workoutTemplate({
      id: 'template_jaziel_friday',
      studentId: 'student_jaziel_lobo',
      diaSemana: 'friday',
      nomeTreino: 'Treino C — Inferiores',
      exercicios: [
        { exerciseId: 'exercise_agachamento_livre', series: 4, repeticoes: '8-10', carga: '50kg', descansoSegundos: 90, observacoes: '' },
        { exerciseId: 'exercise_leg_press_45', series: 4, repeticoes: '10-12', carga: '140kg', descansoSegundos: 75, observacoes: '' },
        { exerciseId: 'exercise_stiff_barra', series: 3, repeticoes: '10', carga: '40kg', descansoSegundos: 60, observacoes: '' },
        { exerciseId: 'exercise_panturrilha_sentada', series: 4, repeticoes: '15', carga: '35kg', descansoSegundos: 40, observacoes: '' }
      ],
      observacoes: 'Sessão de sexta às 11:30 na Smart Fit Jardins.'
    }),
    workoutTemplate({
      id: 'template_mariangela_tuesday',
      studentId: 'student_mariangela_lobo',
      diaSemana: 'tuesday',
      nomeTreino: 'Treino A — Peito, Ombros e Tríceps',
      exercicios: [
        { exerciseId: 'exercise_supino_reto_barra', series: 4, repeticoes: '8-10', carga: '25kg', descansoSegundos: 90, observacoes: '' },
        { exerciseId: 'exercise_supino_inclinado_halteres', series: 3, repeticoes: '10-12', carga: '10kg', descansoSegundos: 75, observacoes: '' },
        { exerciseId: 'exercise_elevacao_lateral', series: 3, repeticoes: '12', carga: '5kg', descansoSegundos: 45, observacoes: '' },
        { exerciseId: 'exercise_triceps_pulley', series: 3, repeticoes: '12', carga: '20kg', descansoSegundos: 45, observacoes: '' }
      ],
      observacoes: 'Sessão de terça às 11:30 na Smart Fit Jardins.'
    }),
    workoutTemplate({
      id: 'template_mariangela_wednesday',
      studentId: 'student_mariangela_lobo',
      diaSemana: 'wednesday',
      nomeTreino: 'Treino B — Costas, Bíceps e Core',
      exercicios: [
        { exerciseId: 'exercise_puxada_frontal_aberta', series: 4, repeticoes: '10', carga: '25kg', descansoSegundos: 60, observacoes: '' },
        { exerciseId: 'exercise_remada_baixa_triangulo', series: 3, repeticoes: '10-12', carga: '22kg', descansoSegundos: 60, observacoes: '' },
        { exerciseId: 'exercise_rosca_alternada', series: 3, repeticoes: '10', carga: '6kg', descansoSegundos: 45, observacoes: '' },
        { exerciseId: 'exercise_dead_bug', series: 3, repeticoes: '12', carga: 'Peso corporal', descansoSegundos: 40, observacoes: '' }
      ],
      observacoes: 'Sessão de quarta às 14:00 na Smart Fit Jardins.'
    }),
    workoutTemplate({
      id: 'template_mariangela_friday',
      studentId: 'student_mariangela_lobo',
      diaSemana: 'friday',
      nomeTreino: 'Treino C — Inferiores',
      exercicios: [
        { exerciseId: 'exercise_agachamento_livre', series: 4, repeticoes: '8-10', carga: '25kg', descansoSegundos: 90, observacoes: '' },
        { exerciseId: 'exercise_leg_press_45', series: 4, repeticoes: '10-12', carga: '90kg', descansoSegundos: 75, observacoes: '' },
        { exerciseId: 'exercise_elevacao_pelvica', series: 3, repeticoes: '12', carga: '40kg', descansoSegundos: 60, observacoes: '' },
        { exerciseId: 'exercise_panturrilha_sentada', series: 4, repeticoes: '15', carga: '20kg', descansoSegundos: 40, observacoes: '' }
      ],
      observacoes: 'Sessão de sexta às 11:30 na Smart Fit Jardins.'
    })
  ];

  const schedules = [
    schedule({
      id: 'schedule_jaziel',
      studentId: 'student_jaziel_lobo',
      gymId: 'gym_smartfit_jardins',
      observacoes: 'Treina com Mariângela na unidade Jardins.',
      ativo: true,
      slots: [
        { dayKey: 'tuesday', horario: '11:30', gymId: 'gym_smartfit_jardins' },
        { dayKey: 'wednesday', horario: '14:00', gymId: 'gym_smartfit_jardins' },
        { dayKey: 'friday', horario: '11:30', gymId: 'gym_smartfit_jardins' }
      ]
    }),
    schedule({
      id: 'schedule_mariangela',
      studentId: 'student_mariangela_lobo',
      gymId: 'gym_smartfit_jardins',
      observacoes: 'Treina com Jaziel na unidade Jardins.',
      ativo: true,
      slots: [
        { dayKey: 'tuesday', horario: '11:30', gymId: 'gym_smartfit_jardins' },
        { dayKey: 'wednesday', horario: '14:00', gymId: 'gym_smartfit_jardins' },
        { dayKey: 'friday', horario: '11:30', gymId: 'gym_smartfit_jardins' }
      ]
    })
  ];

  if (shouldRunFullSeed) {
    await upsertRecords(OBJECT_STORES.gyms, gyms);
    await upsertRecords(OBJECT_STORES.students, students);
    await upsertRecords(OBJECT_STORES.exercises, exercises);
    await upsertRecords(OBJECT_STORES.schedules, schedules);
    await upsertRecords(OBJECT_STORES.workoutTemplates, workoutTemplates);
  } else if (shouldApplyRealDataPatch) {
    await upsertRecords(OBJECT_STORES.gyms, gyms);
    await upsertRecords(OBJECT_STORES.students, students);
    await upsertRecords(OBJECT_STORES.schedules, schedules);
    await upsertRecords(OBJECT_STORES.workoutTemplates, workoutTemplates);

    for (const item of exercises) {
      const existing = await getRecordById(OBJECT_STORES.exercises, item.id);
      if (!existing) {
        await addRecord(OBJECT_STORES.exercises, item);
      }
    }
  }

  if (shouldRunFullSeed || shouldApplyRealDataPatch) {
    await putRecord(OBJECT_STORES.settings, {
      ...(await ensureSettingsRecord()),
      seedVersionApplied: 'v4',
      updatedAt: timestamp()
    });
  }

  return {
    seeded: shouldRunFullSeed || shouldApplyRealDataPatch,
    summary: {
      gyms: gyms.length,
      students: students.length,
      exercises: exercises.length,
      schedules: schedules.length,
      workoutTemplates: workoutTemplates.length,
      workoutLogs: 0,
      mode: shouldRunFullSeed ? 'full-seed' : shouldApplyRealDataPatch ? 'patch-v4' : 'no-op'
    }
  };
}
