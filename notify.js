// Lembretes locais. Funcionam enquanto o app estiver aberto (inclusive em segundo plano no navegador).
// Navegadores não permitem agendar alertas com o app fechado sem um servidor push; o app não promete isso.
import { scheduled } from './goals.js';
import { timeToMinutes, nowMinutes, toKey } from './dates.js';

const FIRED_KEY = 'rezai:lembretes';

export function support() {
  const supported = typeof Notification !== 'undefined';
  return { supported, permission: supported ? Notification.permission : 'unsupported' };
}

export async function requestPermission() {
  if (!support().supported) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

// Retorna { ok, message } com o que realmente aconteceu.
export async function show(title, body) {
  const s = support();
  if (!s.supported) return { ok: false, message: 'Este navegador não oferece notificações.' };
  if (s.permission !== 'granted') return { ok: false, message: 'A permissão de notificações não foi concedida.' };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg && reg.showNotification) { await reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'rezai' }); return { ok: true, message: 'Notificação exibida.' }; }
    new Notification(title, { body, icon: 'icons/icon-192.png', tag: 'rezai' });
    return { ok: true, message: 'Notificação exibida.' };
  } catch (e) {
    return { ok: false, message: 'O navegador recusou exibir a notificação.' };
  }
}

function readFired() { try { return JSON.parse(localStorage.getItem(FIRED_KEY)) || {}; } catch { return {}; } }
function writeFired(o) { try { localStorage.setItem(FIRED_KEY, JSON.stringify(o)); } catch { /* ignore */ } }

function inQuiet(q, mins) {
  if (!q.enabled) return false;
  const a = timeToMinutes(q.start);
  const b = timeToMinutes(q.end);
  if (a === null || b === null || a === b) return false;
  return a < b ? mins >= a && mins < b : mins >= a || mins < b;
}

// Verifica o que está no horário. Janela de 10 minutos após o horário, uma vez por dia por prática.
export function dueNow(state, now = new Date()) {
  const n = state.settings.notifications;
  if (!n.enabled) return [];
  const key = toKey(now);
  const mins = nowMinutes(now);
  if (inQuiet(n.quiet, mins)) return [];
  const fired = readFired();
  const todayFired = fired[key] || {};
  const done = (state.log[key] && state.log[key].entries) || {};
  return scheduled(state, key).filter((p) => {
    if (!p.notify || !p.time || done[p.id] || todayFired[p.id]) return false;
    const t = timeToMinutes(p.time);
    return t !== null && mins >= t && mins <= t + 10;
  });
}

export function markFired(practices, now = new Date()) {
  const key = toKey(now);
  const fired = { [key]: { ...(readFired()[key] || {}) } }; // descarta dias antigos
  practices.forEach((p) => { fired[key][p.id] = true; });
  writeFired(fired);
}
