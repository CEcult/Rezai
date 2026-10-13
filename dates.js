// Datas sempre tratadas como "dia do calendário local" (AAAA-MM-DD).
// Nunca se compara diferença de milissegundos entre datas locais.
export const pad = (n) => String(n).padStart(2, '0');

export function toKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// Meio-dia local evita deslocamentos de horário de verão.
export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}
export function dow(k) { return parseKey(k).getDay(); }
export function isValidKey(k) {
  return typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && toKey(parseKey(k)) === k;
}
// Dias de calendário entre duas chaves (aritmética por componentes, imune a DST).
export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate(); // m: 0-11

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export function longDate(k) {
  return cap(parseKey(k).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
}
export function shortDate(k) {
  return parseKey(k).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}
export function monthLabel(y, m) {
  return cap(new Date(y, m, 1, 12).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
}
export function hhmm(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function nowMinutes(d = new Date()) { return d.getHours() * 60 + d.getMinutes(); }
export function timeToMinutes(t) {
  const m = /^(\d{2}):(\d{2})$/.exec(t || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
