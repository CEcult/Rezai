import { addDays, dow, daysInMonth, pad, shortDate } from './dates.js';
import { dayStats } from './goals.js';

export const windowKeys = (today, n) => Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)));

export function rate(state, today, n) {
  const keys = Object.keys(state.log).sort();
  if (!keys.length) return null;
  const first = keys[0];
  let elig = 0;
  let met = 0;
  for (const k of windowKeys(today, n)) {
    if (k < first) continue;
    const s = dayStats(state, k, today);
    if (k === today && !s.met) continue; // hoje só entra se já foi concluído
    elig++;
    if (s.met) met++;
  }
  return { met, elig, pct: elig ? Math.round((met / elig) * 100) : 0 };
}

export function weekly(state, today, weeks = 8) {
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDays(today, -7 * w);
    const keys = windowKeys(end, 7);
    let prayed = 0;
    let met = 0;
    keys.forEach((k) => { const s = dayStats(state, k, today); if (s.prayed) prayed++; if (s.met) met++; });
    out.push({ label: shortDate(keys[0]), prayed, met, max: 7 });
  }
  return out;
}

export function monthly(state, today, months = 6) {
  const [ty, tm] = today.split('-').map(Number);
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const t = ty * 12 + (tm - 1) - i;
    const y = Math.floor(t / 12);
    const m = t % 12;
    const n = daysInMonth(y, m);
    let prayed = 0;
    let met = 0;
    for (let d = 1; d <= n; d++) {
      const k = `${y}-${pad(m + 1)}-${pad(d)}`;
      if (k > today) break;
      const s = dayStats(state, k, today);
      if (s.prayed) prayed++;
      if (s.met) met++;
    }
    out.push({ label: new Date(y, m, 1, 12).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), prayed, met, max: n });
  }
  return out;
}

export function frequency(state, limit = 6) {
  const map = new Map();
  for (const day of Object.values(state.log)) {
    for (const [id, e] of Object.entries(day.entries)) {
      const cur = map.get(id) || { name: e.name, count: 0 };
      cur.count++;
      cur.name = (state.practices.find((p) => p.id === id) || {}).name || e.name;
      map.set(id, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function hours(state) {
  const h = Array(24).fill(0);
  for (const day of Object.values(state.log)) {
    for (const e of Object.values(day.entries)) {
      if (!e.at) continue;
      const d = new Date(e.at);
      if (!Number.isNaN(d.getTime())) h[d.getHours()]++;
    }
  }
  const total = h.reduce((a, b) => a + b, 0);
  const peak = total ? h.indexOf(Math.max(...h)) : null;
  return { h, total, peak };
}

export function heatmap(state, today, weeks = 16) {
  const weekStart = addDays(today, -dow(today));
  const start = addDays(weekStart, -7 * (weeks - 1));
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(start, w * 7 + d);
      if (key > today) col.push({ key, status: 'future' });
      else { const s = dayStats(state, key, today); col.push({ key, status: s.met ? 'complete' : s.prayed ? 'partial' : 'none' }); }
    }
    cols.push(col);
  }
  return cols;
}
