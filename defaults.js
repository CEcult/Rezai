// Sugestões iniciais, modelos de rotina e estado padrão.
// Importante: o aplicativo guarda apenas NOMES de práticas (checklist). Nenhum texto de oração.
import { toKey } from './dates.js';

export const SCHEMA_VERSION = 1;

export const PERIODS = [
  { id: 'manha', label: 'Manhã', icon: 'sunrise' },
  { id: 'dia', label: 'Durante o dia', icon: 'sun' },
  { id: 'tarde', label: 'Tarde', icon: 'sunset' },
  { id: 'noite', label: 'Noite', icon: 'moon' },
  { id: 'devocoes', label: 'Devoções e práticas especiais', icon: 'star' },
];

// [sid, nome, período, ícone, horário sugerido, descrição curta]
export const CATALOG = [
  ['oracao-manha', 'Oração da manhã', 'manha', 'sunrise', '06:30', ''],
  ['oferecimento', 'Oferecimento do dia', 'manha', 'heart', '06:40', ''],
  ['consagracao', 'Entrega do dia a Deus', 'manha', 'hands', '', 'Consagração do dia'],
  ['espirito-santo', 'Invocação ao Espírito Santo', 'manha', 'dove', '', ''],
  ['anjo-guarda', 'Oração ao Anjo da Guarda', 'manha', 'wing', '', ''],

  ['angelus', 'Angelus', 'dia', 'bell', '12:00', ''],
  ['regina-caeli', 'Regina Caeli', 'dia', 'bell', '12:00', 'Durante o Tempo Pascal'],
  ['antes-refeicoes', 'Oração antes das refeições', 'dia', 'cup', '', ''],
  ['apos-refeicoes', 'Oração após as refeições', 'dia', 'cup', '', ''],
  ['santissimo', 'Visita ao Santíssimo Sacramento', 'dia', 'chalice', '', ''],
  ['oracao-pessoal', 'Breve momento de oração pessoal', 'dia', 'hands', '', ''],
  ['imagem-sagrada', 'Oração diante de uma imagem sagrada', 'dia', 'candle', '', ''],
  ['oferecimento-trabalho', 'Oferecer trabalho, estudo ou dificuldade', 'dia', 'heart', '', ''],

  ['recolhimento', 'Momento de recolhimento', 'tarde', 'leaf', '', ''],
  ['exame-breve', 'Exame breve das atitudes do dia', 'tarde', 'eye', '', ''],
  ['oracao-tarde', 'Oração da tarde', 'tarde', 'sunset', '', ''],
  ['terco', 'Terço ou devoção mariana', 'tarde', 'beads', '15:00', ''],
  ['agradecimento-gracas', 'Agradecimento pelas graças recebidas', 'tarde', 'star', '', ''],

  ['acao-gracas', 'Ação de graças pelo dia', 'noite', 'star', '', ''],
  ['exame-consciencia', 'Exame de consciência', 'noite', 'eye', '21:00', ''],
  ['ato-contricao', 'Ato de contrição', 'noite', 'cross', '', ''],
  ['oracao-noite', 'Oração da noite', 'noite', 'moon', '21:30', ''],
  ['oracao-familia', 'Oração pela família', 'noite', 'house', '', ''],
  ['entrega-descanso', 'Entrega do descanso a Deus', 'noite', 'moon', '', ''],

  ['sagrada-familia', 'Oração diante da Sagrada Família', 'devocoes', 'house', '', ''],
  ['nossa-senhora', 'Oração a Nossa Senhora', 'devocoes', 'star', '', ''],
  ['misericordia', 'Coroa da Divina Misericórdia', 'devocoes', 'flame', '15:00', ''],
  ['ladainhas', 'Ladainhas', 'devocoes', 'candle', '', ''],
  ['novenas', 'Novena', 'devocoes', 'candle', '', ''],
  ['falecidos', 'Oração pelos falecidos', 'devocoes', 'cross', '', ''],
  ['intercessao', 'Orações por sacerdotes, familiares e necessitados', 'devocoes', 'heart', '', ''],
  ['adoracao', 'Adoração eucarística', 'devocoes', 'chalice', '', ''],
  ['leitura-orante', 'Leitura orante ou meditação (opcional)', 'devocoes', 'book', '', ''],
];

export const TEMPLATES = [
  { id: 'essencial', name: 'Rotina essencial', goal: 3,
    desc: 'Poucas práticas, para criar constância sem peso.',
    sids: ['oracao-manha', 'angelus', 'acao-gracas', 'oracao-noite'] },
  { id: 'tradicional', name: 'Rotina tradicional', goal: 6,
    desc: 'Orações distribuídas ao longo de todo o dia.',
    sids: ['oracao-manha', 'oferecimento', 'angelus', 'terco', 'exame-consciencia', 'ato-contricao', 'oracao-noite'] },
  { id: 'mariana', name: 'Rotina mariana', goal: 3,
    desc: 'Práticas de devoção a Nossa Senhora.',
    sids: ['anjo-guarda', 'angelus', 'terco', 'nossa-senhora', 'ladainhas'] },
  { id: 'manha-noite', name: 'Manhã e noite', goal: 4,
    desc: 'Duas janelas de oração: ao começar e ao terminar o dia.',
    sids: ['oracao-manha', 'oferecimento', 'espirito-santo', 'acao-gracas', 'exame-consciencia', 'ato-contricao', 'oracao-noite'] },
  { id: 'personalizada', name: 'Personalizada', goal: 1,
    desc: 'Comece em branco e adicione apenas o que fizer sentido para você.',
    sids: [] },
];

export const PHRASES = [
  'Fidelidade nas pequenas coisas, perseverança até o fim.',
  'Um dia de cada vez, diante de Deus.',
  'Rezar é recomeçar com confiança.',
  'A constância nasce de gestos simples.',
  'Há sempre um momento para voltar à oração.',
  'Pouco, mas todos os dias, e com amor.',
  'A graça sustenta o que a disciplina começa.',
];

export const MILESTONE_TEXT = {
  3: 'Três dias seguidos. O começo de um hábito.',
  7: 'Uma semana inteira de fidelidade.',
  14: 'Duas semanas de perseverança serena.',
  30: 'Um mês de oração constante.',
  60: 'Dois meses caminhando com fidelidade.',
  100: 'Cem dias. A perseverança já tem raízes.',
  365: 'Um ano inteiro. Deo gratias.',
};

export function uid(prefix = 'p') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function makePracticesFromCatalog(routineId, activeSids) {
  const counters = {};
  return CATALOG.map(([sid, name, period, icon, time, desc]) => {
    counters[period] = (counters[period] || 0) + 1;
    return {
      id: `p_${routineId}_${sid}`, sid, routineId, name, desc, icon, period, time,
      days: [], active: activeSids.includes(sid), counts: true, required: false, notify: true,
      order: counters[period],
    };
  });
}

export function defaultState(templateId = 'essencial') {
  const tpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  return {
    version: SCHEMA_VERSION,
    settings: {
      name: '', phrase: '', theme: 'auto', goalMode: 'count', goalCount: tpl.goal, showTime: true,
      defaultRoutineId: 'r_main',
      notifications: { enabled: false, quiet: { enabled: false, start: '22:00', end: '06:00' } },
      lastExport: null,
    },
    routines: [{ id: 'r_main', name: 'Rotina diária', weekdays: [] }],
    practices: makePracticesFromCatalog('r_main', tpl.sids),
    log: {},
    meta: { createdAt: toKey(), onboarded: false, bestAck: 0 },
  };
}

// Aplica um modelo (sugestão editável) a uma rotina: ativa/desativa as práticas sugeridas,
// preserva práticas personalizadas e nunca toca no histórico.
export function applyTemplate(state, routineId, templateId) {
  const tpl = TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return;
  const have = new Set(state.practices.filter((p) => p.routineId === routineId && p.sid).map((p) => p.sid));
  const extra = makePracticesFromCatalog(routineId, []).filter((p) => !have.has(p.sid));
  const maxOrder = {};
  state.practices.filter((p) => p.routineId === routineId).forEach((p) => { maxOrder[p.period] = Math.max(maxOrder[p.period] || 0, p.order); });
  extra.forEach((p) => { p.order = (maxOrder[p.period] || 0) + p.order; p.id = `${p.id}_${Math.random().toString(36).slice(2, 5)}`; });
  state.practices.push(...extra);
  state.practices.filter((p) => p.routineId === routineId && p.sid).forEach((p) => { p.active = tpl.sids.includes(p.sid); });
  state.settings.goalMode = 'count';
  state.settings.goalCount = tpl.goal;
}
