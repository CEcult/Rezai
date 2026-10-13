// Persistência local (LocalStorage), validação, migração, backup e restauração.
// Nenhum dado sai do dispositivo.
import { SCHEMA_VERSION, PERIODS, defaultState } from './defaults.js';
import { PRACTICE_ICONS } from './icons.js';
import { isValidKey, toKey, addDays } from './dates.js';

export const STORAGE_KEY = 'rezai:data';
const BACKUP_KEY = 'rezai:before-import';
const PERIOD_IDS = PERIODS.map((p) => p.id);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const str = (v, max, fb = '') => (typeof v === 'string' ? v.trim().slice(0, max) : fb);
const bool = (v, fb) => (typeof v === 'boolean' ? v : fb);
const int = (v, min, max, fb) => (Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fb);
const days = (v) => (Array.isArray(v) ? [...new Set(v.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort() : []);

// ---------- Migração ----------
// Cada passo converte da versão N para N+1. Hoje existe apenas a versão 1.
const MIGRATIONS = {
  // 1: (d) => { ...; d.version = 2; return d; },
};
export function migrate(raw) {
  let d = raw;
  let v = Number.isInteger(d.version) ? d.version : 1;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) break;
    d = step(d);
    v = d.version;
  }
  return d;
}

// ---------- Validação / saneamento ----------
// Reconstrói um estado confiável a partir de dados desconhecidos. Lança Error com mensagem clara.
export function sanitize(input, today = toKey()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('O arquivo não contém dados do Rezaí.');
  if (Number.isInteger(input.version) && input.version > SCHEMA_VERSION) {
    throw new Error('Este backup foi criado por uma versão mais recente do Rezaí. Atualize o aplicativo e tente novamente.');
  }
  const raw = migrate(input);
  if (!Array.isArray(raw.practices) || typeof raw.log !== 'object' || raw.log === null || Array.isArray(raw.log)) {
    throw new Error('Estrutura inválida: faltam as práticas ou o histórico.');
  }
  const base = defaultState();
  const rs = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const rn = rs.notifications && typeof rs.notifications === 'object' ? rs.notifications : {};
  const rq = rn.quiet && typeof rn.quiet === 'object' ? rn.quiet : {};

  // Rotinas
  const routines = [];
  const seenR = new Set();
  (Array.isArray(raw.routines) ? raw.routines : []).forEach((r) => {
    if (!r || typeof r.id !== 'string' || seenR.has(r.id)) return;
    seenR.add(r.id);
    routines.push({ id: r.id.slice(0, 60), name: str(r.name, 60, 'Rotina') || 'Rotina', weekdays: days(r.weekdays) });
  });
  if (!routines.length) routines.push({ id: 'r_main', name: 'Rotina diária', weekdays: [] });
  const defRoutine = routines.some((r) => r.id === rs.defaultRoutineId) ? rs.defaultRoutineId : routines[0].id;

  // Práticas (sem duplicatas de id)
  const practices = [];
  const seenP = new Set();
  raw.practices.forEach((p, i) => {
    if (!p || typeof p.id !== 'string' || seenP.has(p.id)) return;
    const name = str(p.name, 80);
    if (!name) return;
    seenP.add(p.id);
    practices.push({
      id: p.id.slice(0, 80),
      sid: typeof p.sid === 'string' ? p.sid.slice(0, 60) : undefined,
      routineId: seenR.has(p.routineId) ? p.routineId : defRoutine,
      name,
      desc: str(p.desc, 120),
      icon: PRACTICE_ICONS.includes(p.icon) ? p.icon : 'star',
      period: PERIOD_IDS.includes(p.period) ? p.period : 'dia',
      time: TIME_RE.test(p.time) ? p.time : '',
      days: days(p.days),
      active: bool(p.active, true), counts: bool(p.counts, true), required: bool(p.required, false), notify: bool(p.notify, true),
      order: Number.isFinite(p.order) ? p.order : i + 1,
    });
  });

  // Histórico (datas válidas, sem futuro, sem entradas duplicadas — o mapa por id já impede duplicatas)
  const limit = addDays(today, 1);
  const log = {};
  for (const [k, d] of Object.entries(raw.log)) {
    if (!isValidKey(k) || k > limit || !d || typeof d.entries !== 'object' || d.entries === null) continue;
    const entries = {};
    for (const [id, e] of Object.entries(d.entries)) {
      if (!e || typeof e !== 'object') continue;
      const at = typeof e.at === 'string' && !Number.isNaN(new Date(e.at).getTime()) ? e.at : null;
      entries[id.slice(0, 80)] = { at, name: str(e.name, 80, 'Prática') || 'Prática', counts: bool(e.counts, true), manual: bool(e.manual, !at) };
    }
    if (!Object.keys(entries).length) continue;
    const g = d.goal && typeof d.goal === 'object' ? d.goal : null;
    log[k] = {
      entries,
      goal: g ? {
        target: int(g.target, 0, 200, 0),
        requiredIds: Array.isArray(g.requiredIds) ? g.requiredIds.filter((x) => typeof x === 'string').slice(0, 200) : [],
        available: int(g.available, 0, 200, int(g.target, 0, 200, 0)),
      } : null,
    };
  }

  const state = {
    version: SCHEMA_VERSION,
    settings: {
      name: str(rs.name, 40),
      phrase: str(rs.phrase, 140),
      theme: ['auto', 'light', 'dark'].includes(rs.theme) ? rs.theme : 'auto',
      goalMode: rs.goalMode === 'routine' ? 'routine' : 'count',
      goalCount: int(rs.goalCount, 1, 50, base.settings.goalCount),
      showTime: bool(rs.showTime, true),
      defaultRoutineId: defRoutine,
      notifications: {
        enabled: bool(rn.enabled, false),
        quiet: {
          enabled: bool(rq.enabled, false),
          start: TIME_RE.test(rq.start) ? rq.start : '22:00',
          end: TIME_RE.test(rq.end) ? rq.end : '06:00',
        },
      },
      lastExport: typeof rs.lastExport === 'string' ? rs.lastExport.slice(0, 40) : null,
    },
    routines, practices, log,
    meta: {
      createdAt: isValidKey(raw.meta && raw.meta.createdAt) ? raw.meta.createdAt : today,
      onboarded: raw.meta ? bool(raw.meta.onboarded, true) : true,
      bestAck: int(raw.meta && raw.meta.bestAck, 0, 100000, 0),
    },
  };
  return state;
}

// ---------- LocalStorage ----------
// Retorna { state, notice }. notice descreve problemas (dados corrompidos) para mostrar ao usuário.
export function load() {
  let text = null;
  try { text = localStorage.getItem(STORAGE_KEY); } catch { return { state: defaultState(), notice: 'Armazenamento local indisponível: as alterações não serão salvas neste navegador.' }; }
  if (!text) return { state: defaultState(), notice: null, fresh: true };
  try {
    return { state: sanitize(JSON.parse(text)), notice: null };
  } catch {
    try { localStorage.setItem(`rezai:corrompido:${Date.now()}`, text); } catch { /* sem espaço: segue sem cópia */ }
    return { state: defaultState(), notice: 'Os dados salvos estavam corrompidos e não puderam ser lidos. Uma cópia foi preservada e o aplicativo foi reiniciado com a rotina padrão.' };
  }
}

export function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export function wipeAll() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// ---------- Backup ----------
export function exportJSON(state) {
  return JSON.stringify({ app: 'rezai', schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: state }, null, 2);
}

export function parseBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { ok: false, error: 'O arquivo não é um JSON válido.' }; }
  const payload = parsed && parsed.app === 'rezai' && parsed.data ? parsed.data : parsed;
  try { return { ok: true, state: sanitize(payload) }; }
  catch (e) { return { ok: false, error: e.message }; }
}

// Guarda uma cópia de segurança dos dados atuais antes de substituí-los por uma importação.
export function stashBeforeImport(state) {
  try { localStorage.setItem(BACKUP_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}
