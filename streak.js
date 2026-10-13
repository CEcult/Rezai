// Perseverança: sequência atual, recorde e marcos — sempre derivados do registro real.
import { addDays, daysBetween } from './dates.js';
import { dayStats } from './goals.js';

export const MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export function computeStreaks(state, today) {
  const keys = Object.keys(state.log).sort();
  const days = keys.filter((k) => dayStats(state, k, today).prayed);
  const goalsDone = keys.filter((k) => dayStats(state, k, today).met).length;

  const runs = [];
  for (const k of days) {
    const last = runs[runs.length - 1];
    if (last && addDays(last.end, 1) === k) { last.end = k; last.length += 1; }
    else runs.push({ start: k, end: k, length: 1 });
  }

  let current = 0;
  let todayDone = false;
  const last = runs[runs.length - 1];
  if (last) {
    if (last.end === today) { current = last.length; todayDone = true; }
    else if (addDays(last.end, 1) === today) current = last.length; // ainda dá tempo de rezar hoje
  }
  const longestRun = runs.reduce((b, r) => (!b || r.length > b.length ? r : b), null);
  const longest = longestRun ? longestRun.length : 0;

  const milestones = MILESTONES.map((m) => {
    let on = null;
    for (const r of runs) {
      if (r.length >= m) { const d = addDays(r.start, m - 1); if (!on || d < on) on = d; }
    }
    return { days: m, achievedOn: on };
  });

  const annotated = runs.map((r, i) => {
    const next = runs[i + 1];
    let ended = null;
    if (next) ended = { firstMissed: addDays(r.end, 1), missed: daysBetween(r.end, next.start) - 1 };
    else if (current === 0) ended = { firstMissed: addDays(r.end, 1), missed: daysBetween(r.end, today) };
    return { ...r, ended, ongoing: !ended };
  });

  return { current, longest, longestRun, totalDays: days.length, goalsDone, runs: annotated, milestones, todayDone, firstDay: days[0] || null };
}
