// Controlador principal: estado, rotas, eventos, diálogos, backup e lembretes.
import { load, save, wipeAll, exportJSON, parseBackup, stashBeforeImport } from './storage.js';
import { defaultState, applyTemplate, makePracticesFromCatalog, uid, PERIODS } from './defaults.js';
import { toKey } from './dates.js';
import { togglePractice, syncToday, dayStats } from './goals.js';
import { computeStreaks, MILESTONES } from './streak.js';
import { MILESTONE_TEXT } from './defaults.js';
import { support, requestPermission, show, dueNow, markFired } from './notify.js';
import { brandMark } from './icons.js';
import {
  navHTML, viewInicio, viewRotina, viewPerseveranca, viewCalendario, viewEstatisticas, viewConfig,
  practiceDialog, routineDialog, confirmDialog, onboardingDialog,
} from './views.js';

const VIEWS = { inicio: viewInicio, rotina: viewRotina, perseveranca: viewPerseveranca, calendario: viewCalendario, estatisticas: viewEstatisticas, config: viewConfig };
const TITLES = { inicio: 'Início', rotina: 'Minha rotina', perseveranca: 'Perseverança', calendario: 'Calendário', estatisticas: 'Estatísticas', config: 'Configurações' };

const loaded = load();
let state = loaded.state;
let today = toKey();
let route = 'inicio';
const now0 = new Date();
const ui = {
  rMode: 'check', editRid: null, calY: now0.getFullYear(), calM: now0.getMonth(), calSel: null, calEdit: false,
  pop: null, celebrate: false, canInstall: false, offlineReady: false,
};
let deferredInstall = null;

const $ = (s) => document.querySelector(s);
const main = $('#main');
const dlg = $('#dlg');
const dlgBody = $('#dlg-body');

// ---------- Tema ----------
function applyTheme() {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0E1828' : '#14243A');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// ---------- Aviso (toast) ----------
let toastTimer;
function toast(msg, ms = 4800) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------- Render ----------
function render() {
  const active = document.activeElement;
  const fk = active && active.dataset ? active.dataset.fk : null;
  const fn = active && active.matches && active.matches('[data-setting]') ? active.dataset.setting : null;
  main.innerHTML = VIEWS[route]({ state, today, ui });
  $('#nav-side').innerHTML = navHTML(route, 'side');
  $('#nav-bar').innerHTML = navHTML(route, 'bar');
  document.title = `${TITLES[route]} — Rezaí`;
  ui.pop = null;
  ui.celebrate = false;
  if (fk) {
    const el = main.querySelector(`[data-fk="${CSS.escape(fk)}"]`);
    if (el && !el.disabled) el.focus({ preventScroll: true });
    else {
      const alt = main.querySelector(`[data-fk="${CSS.escape(fk.replace(/^(up|dn):/, 'ed:'))}"]`);
      if (alt) alt.focus({ preventScroll: true });
    }
  } else if (fn) {
    const el = main.querySelector(`[data-setting="${fn}"]`);
    if (el && !(el.type === 'checkbox' || el.type === 'radio')) el.focus({ preventScroll: true });
  }
}

function commit() {
  syncToday(state, today);
  if (!save(state)) toast('Não foi possível salvar neste navegador. Exporte um backup para não perder seus dados.', 8000);
  render();
}

// ---------- Rotas ----------
function readRoute() {
  const r = location.hash.replace(/^#\/?/, '');
  const next = VIEWS[r] ? r : 'inicio';
  const changed = next !== route;
  route = next;
  if (route === 'calendario' && !ui.calSel) ui.calSel = today;
  if (changed) { ui.calEdit = false; }
  render();
  if (changed) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
}
window.addEventListener('hashchange', readRoute);

// ---------- Diálogos ----------
let onSubmit = null;
let onClosed = null;
function openDialog(html, submit, closed) {
  dlgBody.innerHTML = html;
  onSubmit = submit || null;
  onClosed = closed || null;
  if (!dlg.open) dlg.showModal();
  const first = dlgBody.querySelector('input:not([type=radio]):not([type=checkbox]), select, button.primary');
  if (first) first.focus();
}
// Fechamento programático limpa na hora; o evento "close" (assíncrono) só trata o fechamento por ESC.
let ignoreClose = 0;
function finishDialog() {
  const f = onClosed;
  onSubmit = null;
  onClosed = null;
  dlgBody.innerHTML = '';
  if (f) f();
}
function closeDialog() {
  if (!dlg.open) return;
  ignoreClose += 1;
  dlg.close();
  finishDialog();
}
dlg.addEventListener('close', () => {
  if (ignoreClose > 0) { ignoreClose -= 1; return; }
  finishDialog();
});
dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(); });
dlg.addEventListener('submit', (e) => {
  e.preventDefault();
  if (onSubmit) onSubmit(e.target);
});

function ask(opts) {
  return new Promise((resolve) => {
    let answered = false;
    openDialog(confirmDialog(opts), () => { answered = true; closeDialog(); resolve(true); }, () => { if (!answered) resolve(false); });
  });
}
const tell = (title, text) => ask({ title, text, ok: 'Entendi', cancel: false });

function formError(form, msg) {
  const el = form.querySelector('.form-err');
  if (el) { el.textContent = msg; el.hidden = false; }
}

// ---------- Práticas ----------
const editRid = () => (state.routines.some((r) => r.id === ui.editRid) ? ui.editRid : state.settings.defaultRoutineId);

function blankPractice(period = 'dia') {
  return { id: '', name: '', desc: '', icon: 'star', period, time: '', days: [], active: true, counts: true, required: false, notify: true };
}

function openPractice(p, isNew) {
  openDialog(practiceDialog(p, isNew), (form) => {
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    if (!name) { formError(form, 'Dê um nome à prática.'); form.querySelector('[name=name]').focus(); return; }
    const data = {
      name: name.slice(0, 80), desc: String(fd.get('desc') || '').trim().slice(0, 120),
      period: PERIODS.some((x) => x.id === fd.get('period')) ? fd.get('period') : 'dia',
      time: /^\d{2}:\d{2}$/.test(fd.get('time') || '') ? fd.get('time') : '',
      icon: String(fd.get('icon') || 'star'),
      days: fd.getAll('days').map(Number).filter((n) => n >= 0 && n <= 6),
      active: fd.has('active'), counts: fd.has('counts') || fd.has('required'), required: fd.has('required'), notify: fd.has('notify'),
    };
    const rid = isNew ? editRid() : p.routineId;
    const nextOrder = (period) => 1 + Math.max(0, ...state.practices.filter((x) => x.routineId === rid && x.period === period).map((x) => x.order));
    if (isNew) {
      state.practices.push({ id: uid('p_'), routineId: rid, ...data, order: nextOrder(data.period) });
    } else {
      const cur = state.practices.find((x) => x.id === p.id);
      if (!cur) { closeDialog(); return; }
      const periodChanged = cur.period !== data.period;
      Object.assign(cur, data);
      if (periodChanged) cur.order = nextOrder(data.period);
    }
    closeDialog();
    commit();
    toast(isNew ? 'Prática adicionada.' : 'Prática atualizada.');
  });
}

function movePractice(id, dir) {
  const p = state.practices.find((x) => x.id === id);
  if (!p) return;
  const list = state.practices.filter((x) => x.routineId === p.routineId && x.period === p.period).sort((a, b) => a.order - b.order);
  list.forEach((x, i) => { x.order = i + 1; });
  const i = list.indexOf(p);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i].order, list[j].order] = [list[j].order, list[i].order];
  commit();
}

// ---------- Rotinas ----------
function openRoutine(r, isNew) {
  const isDefault = !isNew && r.id === state.settings.defaultRoutineId;
  openDialog(routineDialog(r, isNew, isDefault), (form) => {
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    if (!name) { formError(form, 'Dê um nome à rotina.'); return; }
    const weekdays = isDefault ? [] : fd.getAll('weekdays').map(Number);
    if (isNew) {
      const id = uid('r_');
      state.routines.push({ id, name: name.slice(0, 60), weekdays });
      state.practices.push(...makePracticesFromCatalog(id, []));
      ui.editRid = id;
    } else {
      const cur = state.routines.find((x) => x.id === r.id);
      if (cur) { cur.name = name.slice(0, 60); cur.weekdays = weekdays; }
    }
    closeDialog();
    commit();
    toast(isNew ? 'Rotina criada. Ative as práticas que quiser.' : 'Rotina atualizada.');
  });
}

function duplicateRoutine() {
  const src = state.routines.find((r) => r.id === editRid());
  if (!src) return;
  const id = uid('r_');
  state.routines.push({ id, name: `${src.name} (cópia)`.slice(0, 60), weekdays: [] });
  state.practices.filter((p) => p.routineId === src.id).forEach((p) => state.practices.push({ ...p, id: uid('p_'), routineId: id, days: [...p.days] }));
  ui.editRid = id;
  commit();
  toast('Rotina duplicada.');
}

async function deleteRoutine() {
  const r = state.routines.find((x) => x.id === editRid());
  if (!r || state.routines.length < 2) return;
  const ok = await ask({ title: 'Excluir rotina?', text: `“${r.name}” e suas práticas serão removidas. O histórico de orações já registradas não é apagado.`, ok: 'Excluir', danger: true });
  if (!ok) return;
  state.routines = state.routines.filter((x) => x.id !== r.id);
  state.practices = state.practices.filter((p) => p.routineId !== r.id);
  if (state.settings.defaultRoutineId === r.id) state.settings.defaultRoutineId = state.routines[0].id;
  ui.editRid = state.settings.defaultRoutineId;
  commit();
  toast('Rotina excluída.');
}

// ---------- Marcar / desmarcar ----------
function doToggle(id) {
  const before = computeStreaks(state, today);
  const metBefore = dayStats(state, today, today).met;
  const res = togglePractice(state, today, id);
  if (res === null) return;
  syncToday(state, today);
  ui.pop = res ? id : null;
  let msg = null;
  if (res) {
    const after = computeStreaks(state, today);
    const metAfter = dayStats(state, today, today).met;
    const grew = after.current > before.current;
    if (grew && MILESTONES.includes(after.current)) msg = MILESTONE_TEXT[after.current];
    else if (grew && after.current === after.longest && after.longest > state.meta.bestAck && state.meta.bestAck >= 1) msg = `Novo recorde pessoal: ${after.longest} dias seguidos.`;
    else if (metAfter && !metBefore) msg = 'Meta concluída. Permaneça fiel à oração de cada dia.';
    else if (grew && before.current === 0 && after.current === 1) msg = 'Sequência iniciada. Um dia de cada vez.';
    if (metAfter && !metBefore) ui.celebrate = true;
    state.meta.bestAck = Math.max(state.meta.bestAck, after.longest);
  }
  commit();
  if (msg) toast(msg);
}

function calToggle(id) {
  const key = ui.calSel;
  if (!key || key > today) return;
  togglePractice(state, key, id, { manual: key !== today });
  commit();
}

// ---------- Configurações ----------
function setSetting(path, el) {
  const s = state.settings;
  let value;
  if (el.type === 'checkbox') value = el.checked;
  else if (el.type === 'number') value = Math.min(50, Math.max(1, Math.round(Number(el.value) || 1)));
  else value = el.value;
  switch (path) {
    case 'name': s.name = String(value).trim().slice(0, 40); break;
    case 'phrase': s.phrase = String(value).trim().slice(0, 140); break;
    case 'showTime': s.showTime = value; break;
    case 'goalMode': s.goalMode = value === 'routine' ? 'routine' : 'count'; break;
    case 'goalCount': s.goalCount = value; break;
    case 'theme': s.theme = ['light', 'dark'].includes(value) ? value : 'auto'; applyTheme(); break;
    case 'notif.enabled': s.notifications.enabled = value; break;
    case 'notif.quiet.enabled': s.notifications.quiet.enabled = value; break;
    case 'notif.quiet.start': if (/^\d{2}:\d{2}$/.test(value)) s.notifications.quiet.start = value; break;
    case 'notif.quiet.end': if (/^\d{2}:\d{2}$/.test(value)) s.notifications.quiet.end = value; break;
    default: return;
  }
  commit();
  if (path === 'notif.enabled' && value) {
    const sup = support();
    if (!sup.supported) toast('Este navegador não oferece notificações do sistema. Os lembretes aparecerão dentro do app, enquanto ele estiver aberto.', 7000);
    else if (sup.permission === 'default') requestPermission().then((p) => { render(); toast(p === 'granted' ? 'Permissão concedida. Os lembretes aparecem enquanto o app estiver aberto.' : 'Permissão não concedida. Os lembretes aparecerão dentro do app.', 6500); });
    else if (sup.permission === 'denied') toast('As notificações estão bloqueadas no navegador. Os lembretes aparecerão dentro do app.', 6500);
  }
}

// ---------- Backup ----------
function exportBackup() {
  state.settings.lastExport = new Date().toISOString();
  save(state);
  const blob = new Blob([exportJSON(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rezai-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  render();
  toast('Backup exportado. Guarde o arquivo em um lugar seguro.');
}

async function importBackup(file) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { await tell('Arquivo muito grande', 'O backup do Rezaí é bem menor que 8 MB. Verifique se escolheu o arquivo correto.'); return; }
  let text;
  try { text = await file.text(); } catch { await tell('Não foi possível ler o arquivo', 'Tente novamente.'); return; }
  const r = parseBackup(text);
  if (!r.ok) { await tell('Backup inválido', `${r.error} Seus dados atuais não foram alterados.`); return; }
  const n = Object.keys(r.state.log).length;
  const ok = await ask({
    title: 'Importar backup?',
    text: `O backup contém ${r.state.practices.length} práticas e ${n} ${n === 1 ? 'dia registrado' : 'dias registrados'}. Seus dados atuais serão substituídos (uma cópia de segurança é guardada neste aparelho).`,
    ok: 'Importar',
  });
  if (!ok) return;
  stashBeforeImport(state);
  state = r.state;
  state.meta.onboarded = true;
  state.meta.bestAck = Math.max(state.meta.bestAck, computeStreaks(state, today).longest);
  applyTheme();
  commit();
  toast('Backup importado com sucesso.');
}

// ---------- Eventos ----------
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-action]');
  if (!t || t.matches('input,select')) return;
  const a = t.dataset.action;
  const id = t.dataset.id;
  switch (a) {
    case 'dlg-close': closeDialog(); break;
    case 'rmode': ui.rMode = t.dataset.mode; render(); break;
    case 'goto-edit': ui.rMode = 'edit'; break;
    case 'edit-practice': { const p = state.practices.find((x) => x.id === id); if (p) openPractice(p, false); break; }
    case 'add-practice': openPractice(blankPractice(t.dataset.period), true); break;
    case 'practice-del': {
      const idp = dlgBody.querySelector('form').dataset.id;
      const p = state.practices.find((x) => x.id === idp);
      if (!p) break;
      closeDialog();
      if (await ask({ title: 'Excluir prática?', text: `“${p.name}” sai da rotina. As orações já registradas no histórico são mantidas.`, ok: 'Excluir', danger: true })) {
        state.practices = state.practices.filter((x) => x.id !== idp);
        commit();
        toast('Prática excluída.');
      }
      break;
    }
    case 'move': movePractice(id, Number(t.dataset.dir)); break;
    case 'routine-new': openRoutine({ id: '', name: '', weekdays: [] }, true); break;
    case 'routine-dup': duplicateRoutine(); break;
    case 'routine-edit': { const r = state.routines.find((x) => x.id === editRid()); if (r) openRoutine(r, false); break; }
    case 'routine-main': {
      const r = state.routines.find((x) => x.id === editRid());
      if (r) { state.settings.defaultRoutineId = r.id; r.weekdays = []; commit(); toast(`“${r.name}” agora é a rotina principal.`); }
      break;
    }
    case 'routine-del': deleteRoutine(); break;
    case 'apply-template':
      if (await ask({ title: 'Aplicar modelo?', text: 'As práticas sugeridas deste modelo serão ativadas e as demais sugestões, desativadas nesta rotina. Práticas que você criou e o histórico não mudam. A meta será ajustada ao modelo; você pode alterá-la depois.', ok: 'Aplicar' })) {
        applyTemplate(state, editRid(), id);
        commit();
        toast('Modelo aplicado. Ajuste o que quiser.');
      }
      break;
    case 'restore-defaults':
      if (await ask({ title: 'Restaurar sugestões iniciais?', text: 'Suas rotinas e práticas voltam ao conjunto inicial. O histórico de orações é mantido.', ok: 'Restaurar', danger: true })) {
        const d = defaultState();
        state.routines = d.routines;
        state.practices = d.practices;
        state.settings.defaultRoutineId = d.settings.defaultRoutineId;
        state.settings.goalMode = 'count';
        state.settings.goalCount = d.settings.goalCount;
        ui.editRid = null;
        commit();
        toast('Sugestões iniciais restauradas.');
      }
      break;
    case 'cal-shift': { const t2 = ui.calY * 12 + ui.calM + Number(t.dataset.d); ui.calY = Math.floor(t2 / 12); ui.calM = t2 % 12; render(); break; }
    case 'cal-today': { const d = new Date(); ui.calY = d.getFullYear(); ui.calM = d.getMonth(); ui.calSel = today; ui.calEdit = false; render(); break; }
    case 'cal-pick': ui.calSel = t.dataset.key; ui.calEdit = false; render(); break;
    case 'cal-edit':
      if (ui.calSel < today) {
        if (!(await ask({ title: 'Editar um dia anterior?', text: 'Acrescentar ou remover registros de um dia passado atualiza as estatísticas e a sequência. Os registros acrescentados ficam identificados como manuais.', ok: 'Editar' }))) break;
      }
      ui.calEdit = true;
      render();
      break;
    case 'cal-edit-end': ui.calEdit = false; render(); break;
    case 'export': exportBackup(); break;
    case 'import': $('#file-in').click(); break;
    case 'clear-history':
      if (await ask({ title: 'Apagar todo o histórico?', text: 'Todos os registros de orações, a sequência e o recorde serão apagados. Sua rotina e suas configurações permanecem. Não é possível desfazer: considere exportar um backup antes.', ok: 'Apagar histórico', danger: true })) {
        state.log = {};
        state.meta.bestAck = 0;
        commit();
        toast('Histórico apagado.');
      }
      break;
    case 'reset-all':
      if (await ask({ title: 'Restaurar configurações iniciais?', text: 'Isto apaga o histórico, as rotinas e as configurações, e recomeça do zero. Não é possível desfazer: considere exportar um backup antes.', ok: 'Restaurar tudo', danger: true })) {
        wipeAll();
        state = defaultState();
        ui.editRid = null;
        applyTheme();
        commit();
        startOnboarding();
      }
      break;
    case 'notif-permission': { const p = await requestPermission(); render(); toast(p === 'granted' ? 'Permissão concedida.' : p === 'denied' ? 'Permissão negada pelo navegador.' : 'Permissão não concedida.'); break; }
    case 'notif-test': {
      const r = await show('Rezaí', 'Este é um lembrete de teste.');
      toast(r.ok ? 'Notificação de teste exibida.' : `${r.message} Os lembretes aparecerão dentro do app.`, 6500);
      break;
    }
    case 'install':
      if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice.catch(() => {}); deferredInstall = null; ui.canInstall = false; render(); }
      break;
    default: break;
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'file-in') { const f = t.files && t.files[0]; t.value = ''; importBackup(f); return; }
  if (t.dataset.setting) { setSetting(t.dataset.setting, t); return; }
  const a = t.dataset.action;
  if (a === 'toggle') doToggle(t.dataset.id);
  else if (a === 'cal-toggle') calToggle(t.dataset.id);
  else if (a === 'toggle-active') {
    const p = state.practices.find((x) => x.id === t.dataset.id);
    if (p) { p.active = t.checked; commit(); }
  } else if (a === 'switch-routine') { ui.editRid = t.value; render(); }
});

// ---------- Primeira abertura ----------
function startOnboarding() {
  let done = false;
  openDialog(onboardingDialog(), (form) => {
    const fd = new FormData(form);
    state.settings.name = String(fd.get('name') || '').trim().slice(0, 40);
    applyTemplate(state, state.settings.defaultRoutineId, String(fd.get('tpl') || 'essencial'));
    state.meta.onboarded = true;
    done = true;
    closeDialog();
    commit();
  }, () => {
    if (!done) { state.meta.onboarded = true; commit(); }
  });
}

// ---------- Lembretes, virada de dia e instalação ----------
function tick() {
  const t = toKey();
  if (t !== today) {
    today = t;
    if (route === 'calendario' && !ui.calEdit) { const d = new Date(); ui.calY = d.getFullYear(); ui.calM = d.getMonth(); ui.calSel = today; }
    syncToday(state, today);
    render();
  }
  const due = dueNow(state);
  if (due.length) {
    markFired(due);
    due.forEach((p) => show('Hora de rezar', p.name));
    toast(`Hora de rezar: ${due.map((p) => p.name).join(', ')}`, 9000);
  }
}
setInterval(tick, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; ui.canInstall = true; if (route === 'config') render(); });
window.addEventListener('appinstalled', () => { ui.canInstall = false; deferredInstall = null; if (route === 'config') render(); });

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const ok = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!ok) return;
  navigator.serviceWorker.register('./service-worker.js').then((reg) => {
    const ready = () => { ui.offlineReady = true; if (route === 'config') render(); };
    if (reg.active) ready();
    else navigator.serviceWorker.ready.then(ready);
  }).catch(() => {});
}

// ---------- Início ----------
document.querySelectorAll('[data-brand]').forEach((el) => { el.innerHTML = brandMark('brand'); });
applyTheme();
syncToday(state, today);
readRoute();
registerSW();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if (loaded.notice) tell('Aviso sobre seus dados', loaded.notice).then(() => { if (!state.meta.onboarded) startOnboarding(); });
else if (!state.meta.onboarded) startOnboarding();
tick();
