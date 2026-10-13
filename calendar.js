import { daysInMonth, pad } from './dates.js';
import { dayStats } from './goals.js';

export function monthGrid(state, y, m, today) {
  const lead = new Date(y, m, 1, 12).getDay();
  const n = daysInMonth(y, m);
  const cells = Array(lead).fill(null);
  for (let d = 1; d <= n; d++) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`;
    let status = 'none';
    let pct = 0;
    if (key > today) status = 'future';
    else {
      const s = dayStats(state, key, today);
      pct = s.pct;
      status = s.met ? 'complete' : s.prayed ? 'partial' : 'none';
    }
    cells.push({ key, d, status, pct });
  }
  return cells;
}

export function shiftMonth(y, m, delta) {
  const t = y * 12 + m + delta;
  return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
}
