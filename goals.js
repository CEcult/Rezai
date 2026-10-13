// Metas diárias e cálculo do estado de cada dia.
import { dow } from './dates.js';

const byOrder = (a, b) => a.order - b.order;

export function routineForDate(state, key) {
  const d = dow(key);
  const special = state.routines.find((r) => r.id !== state.settings.defaultRoutineId && r.weekdays.includes(d));
  return special || state.routines.find((r) => r.id === state.settings.defaultRoutineId) || state.routines[0];
}

export function scheduled(state, key) {
  const r = routineForDate(state, key);
  const d = dow(key);
  return state.practices
    .filter((p) => p.routineId === r.id && p.active && (p.days.length === 0 || p.days.includes(d)))
    .sort(byOrder);
}

// Meta calculada com a configuração atual.
export function liveGoal(state, key) {
  const list = scheduled(state, key).filter((p) => p.counts);
  const requiredIds = list.filter((p) => p.required).map((p) => p.id);
  const s = state.settings;
  const target = s.goalMode === 'routine'
    ? list.length
    : Math.min(Math.max(s.goalCount, requiredIds.length), list.length);
  return { target, requiredIds, available: list.length };
}

// Estado de um dia. Dias passados usam o "retrato" da meta guardado no registro,
// para que mudar a meta hoje nunca reescreva o histórico.
export function dayStats(state, key, today) {
  const day = state.log[key];
  const entries = day ? day.entries : {};
  const done = Object.values(entries).filter((e) => e.counts).length;
  const g = (key !== today && day && day.goal) ? day.goal : liveGoal(state, key);
  const okIds = g.requiredIds.filter((id) => entries[id] && entries[id].counts);
  const target = g.target;
  const met = target > 0 && done >= target && okIds.length === g.requiredIds.length;
  return {
    done, target, met,
    pct: target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0,
    remaining: Math.max(0, target - done),
    requiredMissing: g.requiredIds.length - okIds.length,
    prayed: done > 0,
    total: Object.keys(entries).length,
    available: g.available ?? target,
  };
}

// Marca/desmarca. Retorna true (marcada), false (desmarcada) ou null (prática inexistente).
export function togglePractice(state, key, id, { manual = false } = {}) {
  const day = state.log[key] || (state.log[key] = { entries: {}, goal: null });
  if (day.entries[id]) {
    delete day.entries[id];
    if (!Object.keys(day.entries).length) delete state.log[key];
    return false;
  }
  const p = state.practices.find((x) => x.id === id);
  if (!p) { if (!Object.keys(day.entries).length) delete state.log[key]; return null; }
  day.entries[id] = { at: manual ? null : new Date().toISOString(), name: p.name, counts: p.counts, manual };
  if (!day.goal) day.goal = liveGoal(state, key);
  return true;
}

// Mantém o retrato da meta de HOJE alinhado à configuração atual.
export function syncToday(state, today) {
  if (state.log[today]) state.log[today].goal = liveGoal(state, today);
}
