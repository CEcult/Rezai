// Interface: funções que recebem o estado e devolvem HTML. Todo texto dinâmico passa por esc().
import { icon, brandMark, PRACTICE_ICONS } from './icons.js';
import { PERIODS, TEMPLATES, PHRASES, MILESTONE_TEXT } from './defaults.js';
import { longDate, shortDate, monthLabel, hhmm, greeting, WEEKDAYS_SHORT, WEEKDAYS_LONG, parseKey } from './dates.js';
import { scheduled, routineForDate, dayStats } from './goals.js';
import { computeStreaks, MILESTONES } from './streak.js';
import { monthGrid } from './calendar.js';
import { rate, weekly, monthly, frequency, hours, heatmap } from './stats.js';
import { support } from './notify.js';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const byOrder = (a, b) => a.order - b.order;

export const NAV = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'rotina', label: 'Minha rotina', short: 'Rotina', icon: 'list' },
  { id: 'perseveranca', label: 'Perseverança', short: 'Sequência', icon: 'flame' },
  { id: 'calendario', label: 'Calendário', icon: 'calendar' },
  { id: 'estatisticas', label: 'Estatísticas', short: 'Números', icon: 'chart' },
  { id: 'config', label: 'Configurações', short: 'Ajustes', icon: 'sliders' },
];

export function navHTML(route, variant) {
  return NAV.map((n) => `<a href="#/${n.id}" class="nav-link" ${route === n.id ? 'aria-current="page"' : ''}>${icon(n.icon)}<span>${esc(variant === 'bar' ? (n.short || n.label) : n.label)}</span></a>`).join('');
}

function emptyState(title, text, action) {
  return `<div class="empty"><div class="empty-mark">${icon('star')}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action || ''}</div>`;
}

function dayDiff(key) { return parseKey(key).getFullYear() * 400 + parseKey(key).getMonth() * 31 + parseKey(key).getDate(); }

// ---------- Linha de prática ----------
function metaLine(c, p, entry, key) {
  const parts = [];
  if (entry) {
    if (entry.manual) parts.push('Registro manual');
    else if (c.state.settings.showTime && entry.at) parts.push(`Concluída às ${hhmm(entry.at)}`);
    else parts.push('Concluída');
  } else if (p.time) parts.push(`Horário: ${p.time}`);
  if (p.desc && !entry) parts.push(p.desc);
  return parts.join(' · ');
}

function practiceRow(c, p, key, { enabled = true, note = '' } = {}) {
  const entry = c.state.log[key] && c.state.log[key].entries[p.id];
  const meta = note || metaLine(c, p, entry, key);
  return `<li class="prac ${entry ? 'is-done' : ''} ${c.ui.pop === p.id ? 'pop' : ''} ${enabled ? '' : 'is-off'}">
    <label class="prac-check">
      <input type="checkbox" class="chk" data-action="toggle" data-id="${esc(p.id)}" data-fk="chk:${esc(p.id)}" ${entry ? 'checked' : ''} ${enabled ? '' : 'disabled'}>
      <span class="box" aria-hidden="true">${icon('check')}</span>
      <span class="prac-ico" aria-hidden="true">${icon(p.icon)}</span>
      <span class="prac-body"><span class="prac-name">${esc(p.name)}${p.required ? '<span class="tag">Essencial</span>' : ''}</span>${meta ? `<span class="prac-meta">${esc(meta)}</span>` : ''}</span>
    </label>
    <button type="button" class="icon-btn" data-action="edit-practice" data-id="${esc(p.id)}" data-fk="ed:${esc(p.id)}" aria-label="Ajustar ${esc(p.name)}">${icon('edit')}</button>
  </li>`;
}

function periodBlocks(c, list, key, opts = {}) {
  return PERIODS.map((per) => {
    const items = list.filter((p) => p.period === per.id).sort(byOrder);
    if (!items.length) return '';
    const done = items.filter((p) => c.state.log[key] && c.state.log[key].entries[p.id]).length;
    return `<section class="period" aria-labelledby="per-${per.id}">
      <h2 id="per-${per.id}" class="period-h">${icon(per.icon)}<span>${esc(per.label)}</span><small>${done}/${items.length}</small></h2>
      <ul class="prac-list">${items.map((p) => practiceRow(c, p, key, opts.rowOpts ? opts.rowOpts(p) : {})).join('')}</ul>
    </section>`;
  }).join('');
}

// ---------- Início ----------
function goalMessage(s) {
  if (s.target === 0) return 'Escolha as práticas que entram na sua meta.';
  if (s.met) return 'Meta concluída. Permaneça fiel à oração de cada dia.';
  if (s.done === 0) return 'Nenhuma prática ainda hoje. Quando puder, comece por uma.';
  if (s.done >= s.target && s.requiredMissing) return `Falta ${plural(s.requiredMissing, 'prática essencial', 'práticas essenciais')}.`;
  return `${s.remaining === 1 ? 'Resta 1 prática' : `Restam ${s.remaining} práticas`} para a meta.`;
}
function streakText(st) {
  if (st.current === 0) return st.longest ? 'Uma nova sequência pode começar hoje' : 'Sua sequência começa com a primeira oração';
  if (st.current === 1) return 'Sequência iniciada: 1 dia';
  return `${st.current} dias consecutivos`;
}

export function viewInicio(c) {
  const { state, today } = c;
  const s = dayStats(state, today, today);
  const st = computeStreaks(state, today);
  const list = scheduled(state, today);
  const name = state.settings.name;
  const phrase = state.settings.phrase || PHRASES[Math.abs(dayDiff(today)) % PHRASES.length];
  const routine = routineForDate(state, today);
  const special = routine.id !== state.settings.defaultRoutineId;
  const hasAny = state.practices.some((p) => p.active);

  const hero = `<section class="hero ${s.met ? 'is-met' : ''} ${c.ui.celebrate ? 'celebrate' : ''}" aria-labelledby="h-title">
    <svg class="hero-rays" viewBox="0 0 200 140" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width=".8"><circle cx="190" cy="-10" r="40"/><circle cx="190" cy="-10" r="62" opacity=".7"/><circle cx="190" cy="-10" r="86" opacity=".45"/><circle cx="190" cy="-10" r="112" opacity=".25"/></g><path d="M168 30c.8 6 3 8 9 9-6 1-8.200 3-9 9-.8-6-3-8-9-9 6-1 8.200-3 9-9z" fill="currentColor"/></svg>
    <p class="hero-date">${esc(longDate(today))}</p>
    <h1 id="h-title" class="hero-title">${greeting()}${name ? `, ${esc(name)}` : ''}.</h1>
    <p class="hero-phrase">“${esc(phrase)}”</p>
    <div class="hero-streak">${icon('flame')}<div><strong>Seu caminho de oração</strong><span>${esc(streakText(st))}${st.current > 0 && !st.todayDone ? ' · registre hoje para continuar' : ''}</span></div></div>
    <div class="goal">
      <div class="goal-row"><span>${s.target ? `Meta diária: ${s.done} de ${s.target} ${s.target === 1 ? 'prática concluída' : 'práticas concluídas'}` : 'Meta diária não definida'}</span><span class="goal-pct">${s.pct}%</span></div>
      <div class="bar" role="progressbar" aria-label="Progresso da meta diária" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.pct}"><span class="bar-fill" style="width:${s.pct}%"></span>${s.pct > 0 && s.pct < 100 ? `<i class="bar-star" style="left:${s.pct}%">${icon('star')}</i>` : ''}</div>
      <p class="goal-msg" role="status">${esc(goalMessage(s))}</p>
    </div>
  </section>`;

  let body;
  if (!hasAny) {
    body = emptyState('Sua rotina ainda não está configurada', 'Escolha um modelo ou adicione as práticas que fazem sentido para você. Nada é obrigatório.',
      `<a class="btn primary" href="#/rotina" data-action="goto-edit">Montar minha rotina</a>`);
  } else if (!list.length) {
    body = emptyState('Nenhuma prática prevista para hoje', 'As práticas ativas desta rotina não estão marcadas para este dia da semana. Você pode ajustar isso em Minha rotina.',
      `<a class="btn" href="#/rotina" data-action="goto-edit">Ajustar rotina</a>`);
  } else {
    body = `${special ? `<p class="note">${icon('info')}<span>Hoje vale a rotina especial “${esc(routine.name)}”.</span></p>` : ''}${periodBlocks(c, list, today)}`;
  }
  const first = !Object.keys(state.log).length && hasAny && list.length ? `<p class="soft">Seu histórico começa com a primeira oração que você marcar.</p>` : '';
  return `${hero}${first}${body}`;
}

// ---------- Minha rotina ----------
function daysSummary(days) {
  if (!days.length || days.length === 7) return 'Todos os dias';
  return days.map((d) => WEEKDAYS_SHORT[d]).join(', ');
}

export function viewRotina(c) {
  const { state, today, ui } = c;
  const seg = `<div class="seg" role="group" aria-label="Modo">
    <button type="button" data-action="rmode" data-mode="check" aria-pressed="${ui.rMode !== 'edit'}">Marcar</button>
    <button type="button" data-action="rmode" data-mode="edit" aria-pressed="${ui.rMode === 'edit'}">Editar</button></div>`;
  const head = `<header class="page-head"><h1>Minha rotina</h1>${seg}</header>`;
  if (ui.rMode === 'edit') return head + editView(c);

  const routine = routineForDate(state, today);
  const all = state.practices.filter((p) => p.routineId === routine.id && p.active);
  if (!all.length) {
    return head + emptyState('Sua rotina ainda está vazia', 'Aplique um modelo ou adicione sua primeira prática.', `<button class="btn primary" type="button" data-action="rmode" data-mode="edit">Editar rotina</button>`);
  }
  const todayIds = new Set(scheduled(state, today).map((p) => p.id));
  const intro = `<p class="soft">${esc(routine.name)}. As práticas em tom claro não estão previstas para hoje. Este é um checklist: reze com o seu livro, de memória ou na liturgia.</p>`;
  return head + intro + periodBlocks(c, all, today, {
    rowOpts: (p) => (todayIds.has(p.id) ? {} : { enabled: false, note: `Não é para hoje · ${daysSummary(p.days)}` }),
  });
}

function editRow(p, first, last) {
  const flags = [];
  if (p.time) flags.push(p.time);
  flags.push(daysSummary(p.days));
  if (!p.counts) flags.push('Não conta para a meta');
  if (p.required) flags.push('Essencial');
  if (p.notify && p.time) flags.push('Com lembrete');
  return `<li class="erow ${p.active ? '' : 'is-off'}">
    <span class="prac-ico" aria-hidden="true">${icon(p.icon)}</span>
    <button type="button" class="erow-main" data-action="edit-practice" data-id="${esc(p.id)}" data-fk="ed:${esc(p.id)}"><span class="prac-name">${esc(p.name)}</span><span class="prac-meta">${esc(flags.join(' · '))}</span></button>
    <div class="erow-ctrl">
      <button type="button" class="icon-btn sm" data-action="move" data-id="${esc(p.id)}" data-dir="-1" data-fk="up:${esc(p.id)}" aria-label="Mover para cima: ${esc(p.name)}" ${first ? 'disabled' : ''}>${icon('chevUp')}</button>
      <button type="button" class="icon-btn sm" data-action="move" data-id="${esc(p.id)}" data-dir="1" data-fk="dn:${esc(p.id)}" aria-label="Mover para baixo: ${esc(p.name)}" ${last ? 'disabled' : ''}>${icon('chevDown')}</button>
      <label class="switch"><input type="checkbox" data-action="toggle-active" data-id="${esc(p.id)}" data-fk="act:${esc(p.id)}" ${p.active ? 'checked' : ''} aria-label="Ativa: ${esc(p.name)}"><span aria-hidden="true"></span></label>
    </div></li>`;
}

function editView(c) {
  const { state, ui } = c;
  const rid = state.routines.some((r) => r.id === ui.editRid) ? ui.editRid : state.settings.defaultRoutineId;
  const routine = state.routines.find((r) => r.id === rid);
  const isDefault = rid === state.settings.defaultRoutineId;
  const list = state.practices.filter((p) => p.routineId === rid).sort(byOrder);
  const activeN = list.filter((p) => p.active).length;

  const top = `<section class="card">
    <div class="field"><label for="rsel">Rotina em edição</label>
      <select id="rsel" data-action="switch-routine">${state.routines.map((r) => `<option value="${esc(r.id)}" ${r.id === rid ? 'selected' : ''}>${esc(r.name)}${r.id === state.settings.defaultRoutineId ? ' (principal)' : ''}${r.weekdays.length && r.id !== state.settings.defaultRoutineId ? ` — ${esc(daysSummary(r.weekdays))}` : ''}</option>`).join('')}</select></div>
    <p class="hint">${plural(activeN, 'prática ativa', 'práticas ativas')} nesta rotina. ${isDefault ? 'A rotina principal vale nos dias sem rotina especial.' : (routine.weekdays.length ? `Vale automaticamente: ${esc(daysSummary(routine.weekdays))}.` : 'Sem dias definidos: esta rotina só é usada se você defini-la para algum dia da semana.')}</p>
    <div class="btn-row">
      <button type="button" class="btn" data-action="routine-new">${icon('plus')}Nova rotina</button>
      <button type="button" class="btn" data-action="routine-dup">${icon('copy')}Duplicar</button>
      <button type="button" class="btn" data-action="routine-edit">${icon('edit')}Nome e dias</button>
      ${isDefault ? '' : `<button type="button" class="btn" data-action="routine-main">Tornar principal</button>`}
      ${state.routines.length > 1 ? `<button type="button" class="btn danger" data-action="routine-del">${icon('trash')}Excluir</button>` : ''}
    </div></section>`;

  const tpls = `<details class="card fold"><summary>Modelos de rotina<span class="hint">sugestões editáveis</span></summary>
    <ul class="tpl-list">${TEMPLATES.map((t) => `<li><div><strong>${esc(t.name)}</strong><span class="prac-meta">${esc(t.desc)}</span></div><button type="button" class="btn" data-action="apply-template" data-id="${t.id}">Aplicar</button></li>`).join('')}</ul>
    <p class="hint">Aplicar um modelo apenas ativa ou desativa as práticas sugeridas nesta rotina. Suas práticas personalizadas e seu histórico não são alterados.</p></details>`;

  const periods = PERIODS.map((per) => {
    const items = list.filter((p) => p.period === per.id);
    return `<section class="period" aria-labelledby="ep-${per.id}">
      <h2 id="ep-${per.id}" class="period-h">${icon(per.icon)}<span>${esc(per.label)}</span>
        <button type="button" class="btn sm" data-action="add-practice" data-period="${per.id}">${icon('plus')}Adicionar</button></h2>
      ${items.length ? `<ul class="prac-list">${items.map((p, i) => editRow(p, i === 0, i === items.length - 1)).join('')}</ul>` : '<p class="hint pad">Nenhuma prática neste período.</p>'}
    </section>`;
  }).join('');

  return `${top}${tpls}${periods}<div class="foot-actions"><button type="button" class="btn" data-action="restore-defaults">Restaurar sugestões iniciais</button></div>`;
}

// ---------- Perseverança ----------
export function viewPerseveranca(c) {
  const { state, today } = c;
  const st = computeStreaks(state, today);
  const next = MILESTONES.find((m) => m > st.current);
  let msg;
  if (st.current > 0) msg = st.todayDone ? 'Hoje já está registrado.' : 'Ainda dá tempo de registrar hoje.';
  else msg = st.longest ? `Uma nova sequência pode começar hoje. Seu recorde de ${plural(st.longest, 'dia', 'dias')} continua guardado.` : 'Sua sequência começa com a primeira oração registrada.';

  const hero = `<section class="card streak-card"><p class="soft">Sequência atual</p>
    <p class="streak-num"><span>${st.current}</span> ${st.current === 1 ? 'dia' : 'dias'}</p>
    <p>${esc(msg)}${next && st.current > 0 ? ` Próximo marco: ${next} dias (faltam ${next - st.current}).` : ''}</p>
    <dl class="kv"><div><dt>Recorde pessoal</dt><dd>${plural(st.longest, 'dia', 'dias')}</dd></div><div><dt>Dias com oração</dt><dd>${st.totalDays}</dd></div><div><dt>Metas concluídas</dt><dd>${st.goalsDone}</dd></div></dl></section>`;

  const miles = `<section class="card"><h2>Marcos de perseverança</h2><ul class="miles">${st.milestones.map((m) => `<li class="${m.achievedOn ? 'got' : ''}">
      <span class="mile-ico">${icon(m.achievedOn ? 'star' : 'candle')}</span>
      <span><strong>${m.days} dias</strong><span class="prac-meta">${m.achievedOn ? `${esc(MILESTONE_TEXT[m.days])} Alcançado em ${esc(shortDate(m.achievedOn))}.` : 'Ainda por vir.'}</span></span></li>`).join('')}</ul></section>`;

  const runs = [...st.runs].reverse().slice(0, 8);
  const hist = `<section class="card"><h2>Histórico de sequências</h2>${runs.length ? `<ul class="runs">${runs.map((r) => `<li>
      <strong>${r.start === r.end ? esc(shortDate(r.start)) : `${esc(shortDate(r.start))} a ${esc(shortDate(r.end))}`}</strong>
      <span>${plural(r.length, 'dia', 'dias')}${r.ongoing ? ' · em andamento' : ''}</span>
      <span class="prac-meta">${r.ongoing ? 'Continua enquanto houver registro a cada dia.' : `Pausada em ${esc(shortDate(r.ended.firstMissed))}: ${r.ended.missed === 1 ? '1 dia' : `${r.ended.missed} dias`} sem registro. Recomeçar é sempre possível.`}</span></li>`).join('')}</ul>` : '<p class="hint">Quando você registrar sua primeira oração, as sequências aparecerão aqui, com o motivo de cada pausa.</p>'}</section>`;

  const how = `<details class="card fold"><summary>Como a sequência funciona</summary><ul class="plain">
    <li>Conta como dia de oração aquele em que você conclui ao menos uma prática que conta para a meta.</li>
    <li>A sequência cresce com dias seguidos e se interrompe se um dia inteiro passar sem registro. O recorde fica guardado.</li>
    <li>Os dias seguem a data local do aparelho. Abrir o app várias vezes no mesmo dia não soma dias.</li>
    <li>Nada é registrado automaticamente. A sequência é um instrumento de organização, não uma medida de santidade nem da graça de Deus.</li></ul></details>`;
  return `<header class="page-head"><h1>Perseverança</h1></header>${hero}${miles}${hist}${how}`;
}

// ---------- Calendário ----------
export function viewCalendario(c) {
  const { state, today, ui } = c;
  const cells = monthGrid(state, ui.calY, ui.calM, today);
  const sel = ui.calSel;
  const head = `<header class="page-head"><h1>Calendário</h1><button type="button" class="btn sm" data-action="cal-today">Hoje</button></header>`;
  const nav = `<div class="cal-nav"><button type="button" class="icon-btn" data-action="cal-shift" data-d="-12" aria-label="Ano anterior">${icon('dchevL')}</button>
    <button type="button" class="icon-btn" data-action="cal-shift" data-d="-1" aria-label="Mês anterior">${icon('chevL')}</button>
    <h2 class="cal-title" aria-live="polite">${esc(monthLabel(ui.calY, ui.calM))}</h2>
    <button type="button" class="icon-btn" data-action="cal-shift" data-d="1" aria-label="Próximo mês">${icon('chevR')}</button>
    <button type="button" class="icon-btn" data-action="cal-shift" data-d="12" aria-label="Próximo ano">${icon('dchevR')}</button></div>`;
  const labels = { complete: 'meta concluída', partial: 'oração registrada, meta incompleta', none: 'sem práticas registradas', future: 'dia futuro' };
  const grid = `<div class="cal-grid" role="group" aria-label="Dias do mês">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => `<span class="cal-wd" aria-hidden="true" title="${WEEKDAYS_LONG[i]}">${d}</span>`).join('')}
    ${cells.map((d) => (d ? `<button type="button" class="cal-day ${d.status} ${d.key === today ? 'is-today' : ''}" data-action="cal-pick" data-key="${d.key}" data-fk="day:${d.key}" ${d.status === 'future' ? 'disabled' : ''} ${d.key === sel ? 'aria-pressed="true"' : 'aria-pressed="false"'} ${d.key === today ? 'aria-current="date"' : ''} aria-label="${d.d} de ${esc(monthLabel(ui.calY, ui.calM).split(' ')[0].toLowerCase())}: ${labels[d.status]}"><span>${d.d}</span></button>` : '<span></span>')).join('')}</div>`;
  const legend = `<ul class="legend"><li><i class="dot complete"></i>Meta concluída</li><li><i class="dot partial"></i>Oração registrada, meta incompleta</li><li><i class="dot none"></i>Sem registro</li><li><i class="dot future"></i>Dia futuro</li></ul>`;
  return `${head}<section class="card">${nav}${grid}${legend}</section>${sel ? dayDetail(c) : '<p class="soft">Toque em um dia para ver os detalhes.</p>'}`;
}

function dayDetail(c) {
  const { state, today, ui } = c;
  const key = ui.calSel;
  const s = dayStats(state, key, today);
  const day = state.log[key];
  const entries = day ? day.entries : {};
  const planned = scheduled(state, key);
  const editing = ui.calEdit && key <= today;
  const logged = Object.entries(entries);
  let list;
  if (editing) {
    const ids = new Set(planned.map((p) => p.id));
    const rows = [...planned.map((p) => ({ id: p.id, name: p.name })), ...logged.filter(([id]) => !ids.has(id)).map(([id, e]) => ({ id, name: e.name }))];
    list = rows.length ? `<ul class="plain checks">${rows.map((r) => `<li><label class="check-line"><input type="checkbox" data-action="cal-toggle" data-id="${esc(r.id)}" data-fk="ct:${esc(r.id)}" ${entries[r.id] ? 'checked' : ''}><span>${esc(r.name)}${entries[r.id] && entries[r.id].manual ? ' <em class="prac-meta">(registro manual)</em>' : ''}</span></label></li>`).join('')}</ul>` : '<p class="hint">Nenhuma prática prevista neste dia.</p>';
  } else {
    const doneHtml = logged.length ? `<h3>Concluídas</h3><ul class="plain">${logged.map(([, e]) => `<li>${icon('check')}<span>${esc(e.name)}<span class="prac-meta"> ${e.at ? `· ${hhmm(e.at)}` : '· registro manual'}</span></span></li>`).join('')}</ul>` : '';
    const pend = day ? planned.filter((p) => !entries[p.id]) : [];
    const pendHtml = pend.length ? `<h3>Pendentes</h3><ul class="plain muted">${pend.map((p) => `<li>${icon('candle')}<span>${esc(p.name)}</span></li>`).join('')}</ul>` : '';
    list = logged.length ? doneHtml + pendHtml : '<p class="hint">Nenhuma prática registrada neste dia.</p>';
  }
  const goalLine = s.target ? `Meta: ${s.done} de ${s.target} (${s.pct}%)${s.met ? ' · concluída' : ''}` : 'Sem meta definida para este dia';
  return `<section class="card day-detail" aria-live="polite"><h2>${esc(longDate(key))}</h2><p class="goal-line">${esc(goalLine)}</p>${list}
    ${key <= today ? `<div class="btn-row">${editing ? `<button type="button" class="btn primary" data-action="cal-edit-end">Concluir edição</button>` : `<button type="button" class="btn" data-action="cal-edit">${icon('edit')}Editar registro deste dia</button>`}</div>${editing && key < today ? '<p class="hint">Alterar um dia anterior atualiza as estatísticas e a sequência. Os registros acrescentados aqui ficam identificados como manuais.</p>' : ''}` : ''}</section>`;
}

// ---------- Estatísticas ----------
function bars(items, id, legend = true) {
  const sum = items.map((i) => `${i.label}: ${i.prayed} dias com oração, ${i.met} metas`).join('; ');
  return `<div class="cols" role="img" aria-label="${esc(sum)}">${items.map((i) => `<div class="col"><div class="col-bar"><span class="p" style="height:${Math.round((i.prayed / i.max) * 100)}%"></span><span class="m" style="height:${Math.round((i.met / i.max) * 100)}%"></span></div><span class="col-l">${esc(i.label)}</span></div>`).join('')}</div>
    ${legend ? '<ul class="legend"><li><i class="dot partial"></i>Dias com oração</li><li><i class="dot complete"></i>Metas concluídas</li></ul>' : ''}`;
}

export function viewEstatisticas(c) {
  const { state, today } = c;
  const head = `<header class="page-head"><h1>Minha perseverança</h1></header>`;
  if (!Object.keys(state.log).length) {
    return head + emptyState('Seu histórico ainda está vazio', 'As estatísticas aparecem a partir das orações que você marcar. Elas mostram somente o que você registrou.', '<a class="btn primary" href="#/inicio">Ir para o início</a>');
  }
  const st = computeStreaks(state, today);
  const r7 = rate(state, today, 7);
  const r30 = rate(state, today, 30);
  const hr = hours(state);
  const freq = frequency(state);
  const topN = freq[0] ? freq[0].count : 1;
  const rateRow = (label, r) => `<div class="rate"><div class="goal-row"><span>${label}</span><span>${r ? `${r.met} de ${r.elig} dias · ${r.pct}%` : '—'}</span></div><div class="bar thin" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r ? r.pct : 0}"><span class="bar-fill" style="width:${r ? r.pct : 0}%"></span></div></div>`;
  const hm = heatmap(state, today);
  const hmLabel = 'Calendário de consistência das últimas 16 semanas';
  return `${head}
  <section class="stat-grid"><div class="stat"><span>${st.totalDays}</span>dias com oração</div><div class="stat"><span>${st.current}</span>sequência atual</div><div class="stat"><span>${st.longest}</span>recorde pessoal</div><div class="stat"><span>${st.goalsDone}</span>metas concluídas</div></section>
  <section class="card"><h2>Metas concluídas</h2>${rateRow('Últimos 7 dias', r7)}${rateRow('Últimos 30 dias', r30)}<p class="hint">Hoje só entra na conta depois de concluído.</p></section>
  <section class="card"><h2>Evolução semanal</h2>${bars(weekly(state, today), 'w')}</section>
  <section class="card"><h2>Evolução mensal</h2>${bars(monthly(state, today), 'm', false)}</section>
  <section class="card"><h2>Práticas mais frequentes</h2><ul class="hbars">${freq.map((f) => `<li><span class="hb-name">${esc(f.name)}</span><span class="hb-track"><span style="width:${Math.round((f.count / topN) * 100)}%"></span></span><span class="hb-n">${f.count}</span></li>`).join('')}</ul></section>
  <section class="card"><h2>Horários mais comuns</h2>${hr.total ? `<div class="cols hours" role="img" aria-label="Orações marcadas por hora do dia. Horário mais frequente: ${hr.peak}h">${hr.h.map((n, i) => `<div class="col"><div class="col-bar"><span class="p" style="height:${Math.round((n / Math.max(...hr.h)) * 100)}%"></span></div><span class="col-l">${i % 6 === 0 ? i : ''}</span></div>`).join('')}</div><p class="hint">Você costuma marcar suas práticas por volta das ${hr.peak}h.</p>` : '<p class="hint">Os horários aparecem quando você marca práticas pelo aplicativo.</p>'}</section>
  <section class="card"><h2>Calendário de consistência</h2><div class="heat" role="img" aria-label="${hmLabel}">${hm.map((col) => `<div>${col.map((d) => `<i class="hm ${d.status}" title="${esc(shortDate(d.key))}"></i>`).join('')}</div>`).join('')}</div>
  <ul class="legend"><li><i class="dot complete"></i>Meta concluída</li><li><i class="dot partial"></i>Parcial</li><li><i class="dot none"></i>Sem registro</li></ul></section>
  <p class="soft">Estes números refletem apenas o que você registrou. Não medem sua santidade nem a sua relação com Deus.</p>`;
}

// ---------- Configurações ----------
export function viewConfig(c) {
  const { state, ui } = c;
  const s = state.settings;
  const n = s.notifications;
  const sup = support();
  const permText = !sup.supported ? 'Este navegador não oferece notificações.' : sup.permission === 'granted' ? 'Permissão concedida.' : sup.permission === 'denied' ? 'Permissão negada. Para mudar, use as configurações do navegador para este site.' : 'Permissão ainda não solicitada.';
  const sw = (id, label, checked, extra = '') => `<label class="set-line"><span>${label}</span><span class="switch"><input type="checkbox" ${id} ${checked ? 'checked' : ''} ${extra}><span aria-hidden="true"></span></span></label>`;
  const days = Object.keys(state.log).length;
  return `<header class="page-head"><h1>Configurações</h1></header>
  <section class="card"><h2>Perfil</h2>
    <div class="field"><label for="s-name">Seu nome (opcional)</label><input id="s-name" data-setting="name" maxlength="40" autocomplete="given-name" value="${esc(s.name)}"></div>
    <div class="field"><label for="s-phrase">Frase espiritual do topo</label><input id="s-phrase" data-setting="phrase" maxlength="140" value="${esc(s.phrase)}" placeholder="Em branco: uma frase diferente a cada dia"></div>
    ${sw('data-setting="showTime"', 'Mostrar o horário em que marquei cada prática', s.showTime)}</section>

  <section class="card"><h2>Meta diária</h2>
    <fieldset class="field radios"><legend class="sr-only">Tipo de meta</legend>
      <label><input type="radio" name="goalMode" data-setting="goalMode" value="count" ${s.goalMode === 'count' ? 'checked' : ''}><span>Por quantidade de práticas</span></label>
      <label><input type="radio" name="goalMode" data-setting="goalMode" value="routine" ${s.goalMode === 'routine' ? 'checked' : ''}><span>Concluir todas as práticas do dia que contam para a meta</span></label></fieldset>
    ${s.goalMode === 'count' ? `<div class="field"><label for="s-goal">Práticas por dia</label><input id="s-goal" type="number" inputmode="numeric" min="1" max="50" data-setting="goalCount" value="${s.goalCount}"></div>` : ''}
    <p class="hint">Mudar a meta vale a partir de hoje e não altera o histórico. Para escolher quais práticas contam, ou quais são essenciais, use Minha rotina → Editar.</p></section>

  <section class="card"><h2>Aparência</h2><fieldset class="field radios row"><legend class="sr-only">Tema</legend>
    ${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([v, l]) => `<label><input type="radio" name="theme" data-setting="theme" value="${v}" ${s.theme === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset></section>

  <section class="card"><h2>Lembretes</h2>
    ${sw('data-setting="notif.enabled"', 'Ativar lembretes nos horários das práticas', n.enabled)}
    <p class="hint">${esc(permText)} Só geram lembrete as práticas com horário e com “Lembrete” ligado.</p>
    <div class="btn-row"><button type="button" class="btn" data-action="notif-permission" ${!sup.supported || sup.permission === 'granted' ? 'disabled' : ''}>Permitir notificações</button><button type="button" class="btn" data-action="notif-test" ${!sup.supported ? 'disabled' : ''}>Enviar teste</button></div>
    ${sw('data-setting="notif.quiet.enabled"', 'Silenciar em um período', n.quiet.enabled)}
    ${n.quiet.enabled ? `<div class="field-row"><div class="field"><label for="q1">De</label><input id="q1" type="time" data-setting="notif.quiet.start" value="${esc(n.quiet.start)}"></div><div class="field"><label for="q2">Até</label><input id="q2" type="time" data-setting="notif.quiet.end" value="${esc(n.quiet.end)}"></div></div>` : ''}
    <p class="hint">Limitação dos navegadores: os lembretes aparecem enquanto o Rezaí estiver aberto, inclusive em segundo plano. Sem servidor, nenhum navegador permite agendar alertas com o app totalmente fechado, e por isso o Rezaí não promete isso. Para alertas garantidos, use também o alarme do celular. Quando a notificação do sistema não estiver disponível, o lembrete aparece dentro do app.</p></section>

  <section class="card"><h2>Seus dados</h2>
    <p class="hint">Tudo fica somente neste aparelho: sem conta, sem servidor, sem rastreamento. Limpar os dados do navegador ou desinstalar o app pode apagar o histórico. Exporte um backup de vez em quando.</p>
    <p class="hint">${days ? `${plural(days, 'dia registrado', 'dias registrados')}.` : 'Nenhum dia registrado ainda.'} ${s.lastExport ? `Último backup: ${esc(new Date(s.lastExport).toLocaleDateString('pt-BR'))}.` : 'Nenhum backup exportado ainda.'}</p>
    <div class="btn-row"><button type="button" class="btn primary" data-action="export">${icon('download')}Exportar backup</button><button type="button" class="btn" data-action="import">${icon('upload')}Importar backup</button></div>
    <input type="file" id="file-in" accept="application/json,.json" hidden>
    <div class="btn-row"><button type="button" class="btn danger" data-action="clear-history">Apagar histórico</button><button type="button" class="btn danger" data-action="reset-all">Restaurar configurações iniciais</button></div></section>

  <section class="card"><h2>Instalar como aplicativo</h2>
    ${ui.canInstall ? `<div class="btn-row"><button type="button" class="btn primary" data-action="install">Instalar o Rezaí</button></div>` : ''}
    <p class="hint">Android (Chrome): menu ⋮ → Instalar app. iPhone (Safari): Compartilhar → Adicionar à Tela de Início. Computador (Chrome/Edge): ícone de instalar na barra de endereço. ${ui.offlineReady ? 'Pronto para uso offline.' : 'O modo offline fica pronto depois da primeira abertura via http://localhost ou https.'}</p></section>
  <p class="soft center">Rezaí não exibe textos de oração: é um companheiro de organização e constância. Sem anúncios, sem telemetria.</p>`;
}

// ---------- Diálogos ----------
const chips = (name, selected) => `<div class="chips">${WEEKDAYS_SHORT.map((w, i) => `<label class="chip"><input type="checkbox" name="${name}" value="${i}" ${selected.includes(i) ? 'checked' : ''}><span>${w}</span></label>`).join('')}</div>`;

export function practiceDialog(p, isNew) {
  return `<form class="dlg-form" data-form="practice" data-id="${esc(p.id || '')}" novalidate>
    <h2>${isNew ? 'Nova prática' : 'Ajustar prática'}</h2>
    <div class="field"><label for="f-name">Nome</label><input id="f-name" name="name" maxlength="80" required value="${esc(p.name)}"></div>
    <div class="field"><label for="f-desc">Descrição curta (opcional)</label><input id="f-desc" name="desc" maxlength="120" value="${esc(p.desc)}"></div>
    <div class="field-row"><div class="field"><label for="f-per">Período</label><select id="f-per" name="period">${PERIODS.map((x) => `<option value="${x.id}" ${x.id === p.period ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>
      <div class="field"><label for="f-time">Horário sugerido</label><input id="f-time" type="time" name="time" value="${esc(p.time)}"></div></div>
    <fieldset class="field"><legend>Ícone</legend><div class="icon-grid">${PRACTICE_ICONS.map((n) => `<label class="ico-opt"><input type="radio" name="icon" value="${n}" ${n === p.icon ? 'checked' : ''}><span title="${n}">${icon(n)}</span></label>`).join('')}</div></fieldset>
    <fieldset class="field"><legend>Dias da semana</legend>${chips('days', p.days)}<p class="hint">Sem nenhum dia marcado, vale para todos os dias.</p></fieldset>
    <div class="switch-list">
      <label class="set-line"><span>Ativa na rotina</span><span class="switch"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}><span aria-hidden="true"></span></span></label>
      <label class="set-line"><span>Conta para a meta e para a sequência</span><span class="switch"><input type="checkbox" name="counts" ${p.counts ? 'checked' : ''}><span aria-hidden="true"></span></span></label>
      <label class="set-line"><span>Essencial (a meta exige esta prática)</span><span class="switch"><input type="checkbox" name="required" ${p.required ? 'checked' : ''}><span aria-hidden="true"></span></span></label>
      <label class="set-line"><span>Lembrete no horário</span><span class="switch"><input type="checkbox" name="notify" ${p.notify ? 'checked' : ''}><span aria-hidden="true"></span></span></label></div>
    <p class="form-err" role="alert" hidden></p>
    <div class="dlg-actions">${isNew ? '' : `<button type="button" class="btn danger" data-action="practice-del">${icon('trash')}Excluir</button>`}<span class="grow"></span><button type="button" class="btn" data-action="dlg-close">Cancelar</button><button type="submit" class="btn primary">Salvar</button></div></form>`;
}

export function routineDialog(r, isNew, isDefault) {
  return `<form class="dlg-form" data-form="routine" data-id="${esc(r.id || '')}" novalidate>
    <h2>${isNew ? 'Nova rotina' : 'Nome e dias da rotina'}</h2>
    <div class="field"><label for="r-name">Nome</label><input id="r-name" name="name" maxlength="60" required value="${esc(r.name)}"></div>
    ${isDefault ? '<p class="hint">Esta é a rotina principal: vale nos dias sem rotina especial.</p>' : `<fieldset class="field"><legend>Usar automaticamente nestes dias</legend>${chips('weekdays', r.weekdays)}<p class="hint">Útil para domingos, solenidades ou outros dias: a rotina especial substitui a principal nos dias marcados.</p></fieldset>`}
    <p class="form-err" role="alert" hidden></p>
    <div class="dlg-actions"><span class="grow"></span><button type="button" class="btn" data-action="dlg-close">Cancelar</button><button type="submit" class="btn primary">Salvar</button></div></form>`;
}

export function confirmDialog({ title, text, ok = 'Confirmar', danger = false, cancel = true }) {
  return `<form class="dlg-form" data-form="confirm"><h2>${esc(title)}</h2><p>${esc(text)}</p>
    <div class="dlg-actions"><span class="grow"></span>${cancel ? '<button type="button" class="btn" data-action="dlg-close">Cancelar</button>' : ''}<button type="submit" class="btn ${danger ? 'danger solid' : 'primary'}">${esc(ok)}</button></div></form>`;
}

export function onboardingDialog() {
  return `<form class="dlg-form" data-form="onboarding" novalidate>
    <div class="dlg-brand">${brandMark('brand-lg')}</div>
    <h2>Bem-vindo ao Rezaí</h2>
    <p>Um companheiro para organizar e perseverar na sua rotina de oração. Aqui você marca o que rezou; as orações em si ficam com você.</p>
    <div class="field"><label for="o-name">Como podemos chamar você? (opcional)</label><input id="o-name" name="name" maxlength="40" autocomplete="given-name"></div>
    <fieldset class="field radios"><legend>Comece com um modelo (você pode mudar tudo depois)</legend>
      ${TEMPLATES.map((t, i) => `<label><input type="radio" name="tpl" value="${t.id}" ${i === 0 ? 'checked' : ''}><span><strong>${esc(t.name)}</strong><br><small>${esc(t.desc)}</small></span></label>`).join('')}</fieldset>
    <div class="dlg-actions"><span class="grow"></span><button type="submit" class="btn primary">Começar</button></div></form>`;
}
