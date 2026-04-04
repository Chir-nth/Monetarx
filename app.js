/* ═══════════════════════════════════════════════════════════
   MONETRAX — app.js
   Track Smarter. Live Better.
   All state, rendering, and event wiring in one clean file.
═══════════════════════════════════════════════════════════ */

'use strict';

/* ── CONSTANTS ── */
const DEFAULTS = {
  incSrcs: ['Salary','Blocked amount','Savings return','Freelance','Bonus','Rental income','Pocket money'],
  expDscs: ['Penny','Aldi','Kaufland','Burgerme','Rewe','Lidl','Edeka','Netto','DM','Rossmann','Amazon','Zalando'],
  prods:   ['Bread','Milk','Eggs','Butter','Cheese','Yogurt','Rice','Pasta','Shampoo','Soap',
             'Detergent','Toothpaste','Coffee','Tea','Juice','Water','Chicken','Vegetables','Fruits','Cereal']
};

const PAGES = {
  dash:'Dashboard', add:'Add transaction', hist:'History',
  cart:'Shopping cart', recur:'Recurring', budget:'Budget',
  cats:'Categories', slist:'Shopping list', accs:'Accounts', ai:'AI Insights'
};

/* ── STATE ── */
const S = {
  txs: [], cart: [], sl: [], recur: [], accs: [],
  lists: {}, isDark: false, sbOpen: false, cur: '€', chartType: 'bar'
};

/* ── PERSISTENCE ── */
const LS = localStorage;

function loadState() {
  try { S.txs    = JSON.parse(LS.getItem('mtx_txs')   || '[]'); } catch (_) {}
  try { S.cart   = JSON.parse(LS.getItem('mtx_cart')  || '[]'); } catch (_) {}
  try { S.sl     = JSON.parse(LS.getItem('mtx_sl')    || '[]'); } catch (_) {}
  try { S.recur  = JSON.parse(LS.getItem('mtx_recur') || '[]'); } catch (_) {}
  try { S.accs   = JSON.parse(LS.getItem('mtx_accs')  || '[]'); } catch (_) {}
  try { S.isDark = JSON.parse(LS.getItem('mtx_dark')  || 'false'); } catch (_) {}
  try { S.sbOpen = JSON.parse(LS.getItem('mtx_sb')    || 'false'); } catch (_) {}
  S.cur       = LS.getItem('mtx_cur') || '€';
  S.chartType = LS.getItem('mtx_ct')  || 'bar';

  // Merge saved custom list items with defaults
  let saved = {};
  try { saved = JSON.parse(LS.getItem('mtx_lists') || '{}'); } catch (_) {}
  Object.keys(DEFAULTS).forEach(k => {
    S.lists[k] = [...new Set([...(DEFAULTS[k] || []), ...(saved[k] || [])])];
  });
}

function saveAll() {
  LS.setItem('mtx_txs',   JSON.stringify(S.txs));
  LS.setItem('mtx_cart',  JSON.stringify(S.cart));
  LS.setItem('mtx_sl',    JSON.stringify(S.sl));
  LS.setItem('mtx_recur', JSON.stringify(S.recur));
  LS.setItem('mtx_accs',  JSON.stringify(S.accs));
  LS.setItem('mtx_dark',  S.isDark);
  LS.setItem('mtx_sb',    S.sbOpen);
  LS.setItem('mtx_cur',   S.cur);
  LS.setItem('mtx_ct',    S.chartType);

  const custom = {};
  Object.keys(DEFAULTS).forEach(k => {
    custom[k] = S.lists[k].filter(i => !DEFAULTS[k].includes(i));
  });
  LS.setItem('mtx_lists', JSON.stringify(custom));
}

/* ── DOM HELPER ── */
const $ = id => document.getElementById(id);
function val(id)     { return $(id).value; }
function setVal(id,v){ $(id).value = v; }
function flt(id)     { return parseFloat(val(id)) || 0; }
function int(id)     { return parseInt(val(id))   || 0; }

/* ── DATE ── */
function today() { return new Date().toISOString().split('T')[0]; }

/* ── CURRENCY FORMAT ── */
function fmt(n) {
  return S.cur + Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── MONTH UTILITIES ── */
function selMon() { return val('msel') || new Date().toISOString().slice(0, 7); }
function mTxs()   { const m = selMon(); return S.txs.filter(t => t.date?.startsWith(m)); }
function prevMon() {
  const [y, m] = selMon().split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

/* ── TRANSACTION HELPERS ── */
function isIn(t)  { return t.type === 'income'  || t.type === 'transfer_in';  }
function isOut(t) { return t.type === 'expense' || t.type === 'transfer_out'; }
function totals(list) {
  const inc = list.filter(isIn).reduce((s, t) => s + t.amount, 0);
  const exp = list.filter(isOut).reduce((s, t) => s + t.amount, 0);
  return { inc, exp, bal: inc - exp };
}

/* ── CUSTOM LISTS ── */
function addToList(k, v) {
  if (!v?.trim()) return;
  const val = v.trim();
  if (!S.lists[k]) S.lists[k] = [];
  if (!S.lists[k].some(i => i.toLowerCase() === val.toLowerCase())) {
    S.lists[k].unshift(val);
    saveAll();
  }
}
function removeFromList(k, v) {
  if (S.lists[k]) S.lists[k] = S.lists[k].filter(i => i !== v);
  saveAll();
}

/* ── ACCOUNT NAME LOOKUP ── */
function accName(id) {
  const a = S.accs.find(a => a.id === id);
  return a ? a.name : '';
}

/* ── TOAST ── */
let _toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('on'), 2800);
}

/* ── DARK MODE ── */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.isDark ? 'dark' : 'light');
  $('dark-lbl').textContent = S.isDark ? 'Light' : 'Dark';
  $('dark-ic').innerHTML = S.isDark
    ? '<path d="M13 8a5 5 0 1 1-5-5 3.5 3.5 0 0 0 5 5z"/>'
    : '<path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/><circle cx="8" cy="8" r="3"/>';
  destroyCharts();
}

/* ── CHART REFERENCES ── */
let trendC = null, catC = null, cmpC = null;
function destroyCharts() {
  if (trendC) { trendC.destroy(); trendC = null; }
  if (catC)   { catC.destroy();   catC   = null; }
  if (cmpC)   { cmpC.destroy();   cmpC   = null; }
}

/* ── SIDEBAR ── */
function applySidebar() {
  $('sb').classList.toggle('open', S.sbOpen);
}

/* ══════════════════════════════════════════
   MONTH SELECTOR BUILD
══════════════════════════════════════════ */
function buildMonths() {
  const el = $('msel'), now = new Date(), opts = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    opts.push(`<option value="${v}"${i === 0 ? ' selected' : ''}>${d.toLocaleString('en', { month: 'long', year: 'numeric' })}</option>`);
  }
  el.innerHTML = opts.join('');
}

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */
function navigate(pageId) {
  document.querySelectorAll('.ni').forEach(b => b.classList.toggle('act', b.dataset.page === pageId));
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('s-' + pageId).classList.add('active');
  $('pg-title').textContent = PAGES[pageId] || pageId;

  // Close sidebar on mobile tap
  if (window.innerWidth <= 640 && S.sbOpen) {
    S.sbOpen = false;
    saveAll();
    applySidebar();
  }

  if (pageId === 'cart')  renderCart();
  if (pageId === 'slist') renderSl();
  if (pageId === 'recur') renderRecur();
  if (pageId === 'accs')  renderAccs();
  if (pageId === 'ai')    renderAI();
  renderAll();
}

/* ══════════════════════════════════════════
   AUTOCOMPLETE / COMBO-BOX
══════════════════════════════════════════ */
function showSugg(inputId, listKey, query) {
  const el = $(inputId + '-s');
  if (!el) return;
  const items = S.lists[listKey] || [];
  const q = query.trim().toLowerCase();
  const filtered = q === '' ? items : items.filter(i => i.toLowerCase().includes(q));
  if (!filtered.length) { el.classList.remove('open'); return; }

  el.innerHTML = filtered.map(item => {
    const esc = item.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `<div class="si" onmousedown="pickSugg('${inputId}','${listKey}','${esc}')">
      <span>${item}</span>
      <span class="sdel" onmousedown="event.stopPropagation();delSugg('${listKey}','${esc}','${inputId}')">✕</span>
    </div>`;
  }).join('');
  el.classList.add('open');
}

function hideSugg(sugId, delay) {
  setTimeout(() => { const el = $(sugId); if (el) el.classList.remove('open'); }, delay || 0);
}

function pickSugg(inputId, listKey, value) {
  setVal(inputId, value);
  hideSugg(inputId + '-s', 0);
  // Auto-fill price if picking from cart product list
  if (inputId === 'sh-n') {
    const last = [...S.cart].reverse().find(i => i.name.toLowerCase() === value.toLowerCase());
    if (last) setVal('sh-p', last.price.toFixed(2));
  }
}

function delSugg(listKey, value, inputId) {
  removeFromList(listKey, value);
  showSugg(inputId, listKey, val(inputId));
}

function bindCombo(inputId, listKey) {
  const el = $(inputId);
  if (!el) return;
  el.addEventListener('input',  () => showSugg(inputId, listKey, el.value));
  el.addEventListener('focus',  () => showSugg(inputId, listKey, el.value));
  el.addEventListener('blur',   () => hideSugg(inputId + '-s', 200));
}

/* ══════════════════════════════════════════
   RENDER PIPELINE
══════════════════════════════════════════ */
function renderAll() {
  renderMetrics();
  renderInsights();
  renderRecent();
  renderHist();
  renderTrend();
  renderBudget();
  renderCats();

  const { bal } = totals(S.txs);
  const pill = $('top-bal');
  pill.textContent = 'Balance: ' + (bal < 0 ? '-' : '') + fmt(bal);
  pill.style.color = bal < 0 ? 'var(--exp)' : 'var(--t2)';
}

/* ── METRICS ── */
function renderMetrics() {
  const mt = mTxs(), { inc, exp } = totals(mt), { bal } = totals(S.txs);
  $('d-inc').textContent = fmt(inc);
  $('d-exp').textContent = fmt(exp);
  const b = $('d-bal');
  b.textContent = (bal < 0 ? '-' : '') + fmt(bal);
  b.className = 'met-v ' + (bal < 0 ? 'r' : 'b');
}

/* ── INSIGHTS ── */
function renderInsights() {
  const mt  = mTxs();
  const inc = mt.filter(isIn).reduce((s, t) => s + t.amount, 0);
  const exp = mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Savings rate
  const sr = inc > 0 ? Math.round((inc - exp) / inc * 100) : null;
  const savEl = $('i-sav');
  savEl.textContent = sr !== null ? sr + '%' : '—';
  savEl.style.color = sr === null ? 'var(--t3)' : sr >= 20 ? 'var(--inc)' : sr >= 0 ? 'var(--bal)' : 'var(--exp)';

  // Top category
  const catMap = {};
  mt.filter(t => t.type === 'expense').forEach(t => { catMap[t.cat] = (catMap[t.cat] || 0) + t.amount; });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  $('i-cat').textContent   = cats.length ? cats[0][0] : '—';
  $('i-cat-a').textContent = cats.length ? fmt(cats[0][1]) : '';

  // Avg daily spend
  const now = new Date(), [sy, smm] = selMon().split('-').map(Number);
  const isCur = sy === now.getFullYear() && smm - 1 === now.getMonth();
  const days   = isCur ? now.getDate() : new Date(sy, smm, 0).getDate();
  $('i-daily').textContent = exp > 0 ? fmt(exp / days) : '—';
  $('i-daily-s').textContent = `over ${days} days`;
}

/* ── TX HTML BUILDER ── */
function txIco(t)    { return t.type === 'transfer_in' ? '↙' : t.type === 'transfer_out' ? '↗' : (t.cat?.split(' ')[0] || '💰'); }
function txBg(t)     { return (t.type === 'income' || t.type === 'transfer_in') ? 'rgba(29,158,117,.15)' : 'rgba(216,90,48,.12)'; }
function txSign(t)   { return isIn(t) ? '+' : '-'; }
function txColor(t)  { return isIn(t) ? 'var(--inc)' : 'var(--exp)'; }
function txBadge(t) {
  if (!t.ttype) return '';
  const map = { recv: '<span class="badge bg">received</span>', sent: '<span class="badge br">sent</span>', adde: '<span class="badge bb">account</span>' };
  return map[t.ttype] || '';
}

function txHTML(t, showDel) {
  const acc = t.accId ? ` · ${accName(t.accId)}` : '';
  const cat = t.cat ? t.cat.split(' ').slice(1).join(' ') + ' · ' : '';
  const date = new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `<div class="tx">
    <div class="tx-ico" style="background:${txBg(t)}">${txIco(t)}</div>
    <div class="tx-inf">
      <div class="tx-n">${t.desc}${txBadge(t)}</div>
      <div class="tx-m">${cat}${date}${acc}</div>
    </div>
    <div class="tx-amt" style="color:${txColor(t)}">${txSign(t)}${fmt(t.amount)}</div>
    ${showDel ? `<button class="tx-d" onclick="deleteTx(${t.id})">✕</button>` : ''}
  </div>`;
}

/* ── RECENT ── */
function renderRecent() {
  const el = $('recent');
  const rows = [...S.txs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  el.innerHTML = rows.length ? rows.map(t => txHTML(t, false)).join('') : '<div class="empty">No transactions yet.</div>';
}

/* ── HISTORY ── */
function renderHist() {
  const el = $('hist-list'), cnt = $('h-count');
  const q  = ($('h-search')?.value || '').toLowerCase();
  const mt = mTxs();
  const filtered = q
    ? mt.filter(t => t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q) || String(t.amount).includes(q))
    : mt;
  cnt.textContent = filtered.length ? `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''} this month` : '';
  el.innerHTML = filtered.length
    ? [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => txHTML(t, true)).join('')
    : `<div class="empty">No transactions${q ? ` matching "${q}"` : ' this month'}.</div>`;
}

function deleteTx(id) {
  S.txs = S.txs.filter(t => t.id !== id);
  saveAll(); renderAll(); toast('Transaction deleted.');
}

function clearMonthTxs() {
  const m = mTxs();
  if (!m.length) { toast('Nothing to clear this month.'); return; }
  if (!confirm(`Delete all ${m.length} transactions for this month? This cannot be undone.`)) return;
  const mk = selMon();
  S.txs = S.txs.filter(t => !t.date?.startsWith(mk));
  saveAll(); renderAll(); toast('Month cleared.');
}

/* ── TREND CHART ── */
function renderTrend() {
  const now = new Date(), mons = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    mons.push({ l: d.toLocaleString('en', { month: 'short' }), y: d.getFullYear(), m: d.getMonth() });
  }
  const mE = mons.map(mo => S.txs.filter(t => isOut(t) && new Date(t.date).getMonth() === mo.m && new Date(t.date).getFullYear() === mo.y).reduce((s, t) => s + t.amount, 0));
  const mI = mons.map(mo => S.txs.filter(t => isIn(t)  && new Date(t.date).getMonth() === mo.m && new Date(t.date).getFullYear() === mo.y).reduce((s, t) => s + t.amount, 0));

  if (trendC) trendC.destroy();
  const isLine = S.chartType === 'line';
  trendC = new Chart($('trendChart'), {
    type: S.chartType,
    data: { labels: mons.map(m => m.l), datasets: [
      { label: 'Income',   data: mI, backgroundColor: '#9fe1cb', borderColor: '#1d9e75', fill: isLine, tension: .35, borderRadius: isLine ? 0 : 3, pointRadius: isLine ? 3 : 0 },
      { label: 'Expenses', data: mE, backgroundColor: '#f5c4b3', borderColor: '#d85a30', fill: isLine, tension: .35, borderRadius: isLine ? 0 : 3, pointRadius: isLine ? 3 : 0 }
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#888780' } },
        y: { ticks: { callback: v => S.cur + v, font: { size: 10 }, color: '#888780' }, grid: { color: 'rgba(128,128,128,.1)' } }
      }
    }
  });
}

/* ── BUDGET ── */
function renderBudget() {
  const mt  = mTxs();
  const inc = flt('b-inc') || mt.filter(isIn).reduce((s, t) => s + t.amount, 0);
  const needs   = mt.filter(t => t.type === 'expense' && t.btype === 'needs').reduce((s, t) => s + t.amount, 0);
  const wants   = mt.filter(t => t.type === 'expense' && t.btype === 'wants').reduce((s, t) => s + t.amount, 0);
  const savings = mt.filter(t => t.type === 'expense' && t.btype === 'savings').reduce((s, t) => s + t.amount, 0);
  const bN = inc * .5, bW = inc * .3, bS = inc * .2;

  function bar(lbl, spent, budget, color) {
    const pct  = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;
    const over = spent > budget && budget > 0;
    return `<div class="brow"><div class="bl">${lbl}</div><div class="bt"><div class="bf" style="width:${pct}%;background:${over ? '#e24b4a' : color}"></div></div><div class="bn">${fmt(spent)} / ${fmt(budget)}</div></div>`;
  }

  $('b-bars').innerHTML = inc
    ? [bar('Needs', needs, bN, '#378add'), bar('Wants', wants, bW, '#7f77dd'), bar('Savings', savings, bS, '#1d9e75')].join('')
    : '<div class="empty">Log income or set a target above.</div>';

  $('b-rule').innerHTML = inc
    ? [{ l:'Needs',p:50,b:bN,bg:'#e6f1fb',c:'#185fa5' }, { l:'Wants',p:30,b:bW,bg:'#eeedfe',c:'#534ab7' }, { l:'Savings',p:20,b:bS,bg:'#e1f5ee',c:'#0f6e56' }]
        .map(r => `<div class="rcc" style="background:${r.bg}"><div style="font-size:16px;font-weight:500;color:${r.c}">${r.p}%</div><div style="font-size:10px;color:${r.c}">${r.l}<br>${fmt(r.b)}</div></div>`).join('')
    : '';
}

/* ── CATEGORIES ── */
function renderCats() {
  const mt = mTxs().filter(t => t.type === 'expense');
  const catMap = {};
  mt.forEach(t => { catMap[t.cat] = (catMap[t.cat] || 0) + t.amount; });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const cols  = ['#378add','#1d9e75','#d4537e','#ba7517','#7f77dd','#d85a30','#639922','#888780','#e24b4a','#5dcaa5'];

  if (catC) catC.destroy();
  const cv = $('catChart');
  if (!cats.length) {
    cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    $('cat-leg').innerHTML = '';
    $('cat-bd').innerHTML  = '<div class="empty">No expenses this month.</div>';
    return;
  }
  catC = new Chart(cv, {
    type: 'doughnut',
    data: { labels: cats.map(c => c[0]), datasets: [{ data: cats.map(c => c[1]), backgroundColor: cols.slice(0, cats.length), borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed) } } } }
  });

  $('cat-leg').innerHTML = cats.map((c, i) => `<span class="ld"><span class="ldot" style="background:${cols[i]}"></span>${c[0].split(' ').slice(1).join(' ')} ${fmt(c[1])}</span>`).join('');
  const total = cats.reduce((s, c) => s + c[1], 0);
  $('cat-bd').innerHTML  = cats.map(([cat, amt]) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:0.5px solid var(--bd);font-size:12px;color:var(--t)"><span>${cat}</span><span style="color:var(--t2)">${fmt(amt)} (${total > 0 ? Math.round(amt / total * 100) : 0}%)</span></div>`
  ).join('');
}

/* ══════════════════════════════════════════
   ADD INCOME
══════════════════════════════════════════ */
function addIncome() {
  const amount = flt('i-amt'), source = val('i-src').trim(), date = val('i-date'), accId = val('i-acc');
  if (!amount || amount <= 0) { toast('Enter a valid amount.'); return; }
  addToList('incSrcs', source);
  S.txs.push({ id: Date.now(), type: 'income', amount, desc: source || 'Income', date, cat: '💰 Income', btype: 'income', accId });
  saveAll(); renderAll(); toast('Income added!');
  setVal('i-amt', ''); setVal('i-src', ''); setVal('i-date', today());
  navigate('hist');
}

/* ══════════════════════════════════════════
   ADD EXPENSE
══════════════════════════════════════════ */
function addExpense() {
  const amount = flt('e-amt'), desc = val('e-dsc').trim(), date = val('e-date');
  const cat = val('e-cat'), btype = val('e-btype'), accId = val('e-acc');
  if (!amount || amount <= 0) { toast('Enter a valid amount.'); return; }
  if (desc) addToList('expDscs', desc);
  S.txs.push({ id: Date.now(), type: 'expense', amount, desc: desc || cat, date, cat, btype, accId });
  saveAll(); renderAll(); toast('Expense added!');
  setVal('e-amt', ''); setVal('e-dsc', ''); setVal('e-date', today());
  navigate('hist');
}

/* ══════════════════════════════════════════
   TRANSFER
══════════════════════════════════════════ */
function updateTransferPreview() {
  const amount = flt('t-amt'), name = val('t-name').trim() || '…', type = val('t-type'), el = $('tp');
  if (!amount) { el.style.display = 'none'; return; }
  const isI = type === 'recv' || type === 'adde';
  const msgs = {
    recv: `+ ${fmt(amount)} added to balance — received from ${name}`,
    sent: `− ${fmt(amount)} deducted from balance — sent to ${name}`,
    adde: `+ ${fmt(amount)} added to balance — from ${name}`
  };
  el.textContent = msgs[type];
  el.style.display   = 'block';
  el.style.background = isI ? 'var(--wg)' : 'var(--wo)';
  el.style.color      = isI ? 'var(--wgt)' : 'var(--wot)';
}

function addTransfer() {
  const amount = flt('t-amt'), name = val('t-name').trim(), type = val('t-type');
  const date = val('t-date'), note = val('t-note').trim();
  if (!amount || amount <= 0) { toast('Enter a valid amount.'); return; }
  const isI  = type === 'recv' || type === 'adde';
  const icos = { recv: '↙️', sent: '↗️', adde: '🏦' };
  const lbls = { recv: 'From', sent: 'To', adde: 'From' };
  S.txs.push({
    id: Date.now(), type: isI ? 'transfer_in' : 'transfer_out', amount,
    desc: `${icos[type]} ${lbls[type]}: ${name || '—'}${note ? ' — ' + note : ''}`,
    date, cat: icos[type] + ' Transfer', btype: 'transfer', ttype: type
  });
  saveAll(); renderAll(); toast('Transfer logged!');
  ['t-amt','t-name','t-note'].forEach(id => setVal(id, ''));
  setVal('t-date', today());
  $('tp').style.display = 'none';
  navigate('hist');
}

/* ══════════════════════════════════════════
   SHOPPING CART
══════════════════════════════════════════ */
function addCartItem() {
  const name = val('sh-n').trim(), price = flt('sh-p'), qty = int('sh-q') || 1;
  if (!name)            { toast('Enter a product name.'); return; }
  if (!price || price <= 0) { toast('Enter a valid price.');   return; }
  addToList('prods', name);
  S.cart.push({ id: Date.now(), name, price, qty });
  saveAll(); renderCart();
  setVal('sh-n', ''); setVal('sh-p', ''); setVal('sh-q', '1');
  $('sh-n').focus();
}

function changeQty(id, delta) {
  const item = S.cart.find(i => i.id === id);
  if (item) { item.qty = Math.max(1, item.qty + delta); saveAll(); renderCart(); }
}

function removeCartItem(id) {
  S.cart = S.cart.filter(i => i.id !== id);
  saveAll(); renderCart();
}

function clearCart() {
  if (!S.cart.length) { toast('Cart is already empty.'); return; }
  if (!confirm('Clear all items from cart?')) return;
  S.cart = []; saveAll(); renderCart(); toast('Cart cleared.');
}

function renderCart() {
  const el   = $('cart-items'), foot = $('cart-foot'), cc = $('cart-checkout'), cnt = $('sh-cnt');
  const cap  = flt('sh-cap');

  if (!S.cart.length) {
    el.innerHTML = '<div class="empty">Cart is empty.</div>';
    foot.innerHTML = ''; cc.style.display = 'none'; cnt.textContent = ''; return;
  }

  const total = S.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const units = S.cart.reduce((s, i) => s + i.qty, 0);
  cnt.textContent = `${S.cart.length} product${S.cart.length !== 1 ? 's' : ''} · ${units} unit${units !== 1 ? 's' : ''}`;

  el.innerHTML = S.cart.map(item => `
    <div class="si-row">
      <div class="si-name">${item.name}</div>
      <div class="si-pr">${fmt(item.price)}/unit</div>
      <div class="qc">
        <button class="qb" onclick="changeQty(${item.id},-1)">−</button>
        <div class="qn">${item.qty}</div>
        <button class="qb" onclick="changeQty(${item.id},+1)">+</button>
      </div>
      <div class="si-sub">${fmt(item.price * item.qty)}</div>
      <button class="tx-d" onclick="removeCartItem(${item.id})">✕</button>
    </div>`).join('');

  let warn = '';
  if (cap > 0) {
    const over = total > cap, diff = Math.abs(total - cap);
    warn = over
      ? `<div style="font-size:11px;padding:6px 10px;border-radius:7px;margin-top:7px;text-align:center;font-weight:500;background:var(--wo);color:var(--wot)">Over budget by ${fmt(diff)}</div>`
      : `<div style="font-size:11px;padding:6px 10px;border-radius:7px;margin-top:7px;text-align:center;font-weight:500;background:var(--wg);color:var(--wgt)">${fmt(diff)} remaining</div>`;
  }

  foot.innerHTML = `<div class="sfooter">
    <div class="srow"><span>Units</span><span>${units}</span></div>
    <div class="srow"><span>Products</span><span>${S.cart.length}</span></div>
    <div class="srow big"><span>Total</span><span>${fmt(total)}</span></div>
    ${warn}
  </div>`;
  cc.style.display = 'block';
}

function checkoutCart() {
  if (!S.cart.length) return;
  const date  = val('sh-date') || today(), btype = val('sh-bt');
  const total = S.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const names = S.cart.slice(0, 3).map(i => i.name).join(', ') + (S.cart.length > 3 ? ` +${S.cart.length - 3} more` : '');
  S.txs.push({ id: Date.now(), type: 'expense', amount: total, desc: 'Shopping: ' + names, date, cat: '🛒 Shopping', btype });
  saveAll(); S.cart = []; saveAll(); renderCart(); renderAll();
  toast('Shopping added to expenses!'); navigate('hist');
}

/* ══════════════════════════════════════════
   RECURRING TRANSACTIONS
══════════════════════════════════════════ */
function addRecurring() {
  const name  = val('rc-n').trim(), amount = flt('rc-amt');
  const type  = val('rc-type'), cat = val('rc-cat'), day = Math.min(28, int('rc-day') || 1);
  if (!name)            { toast('Enter a name.');         return; }
  if (!amount || amount <= 0) { toast('Enter a valid amount.'); return; }
  S.recur.push({ id: Date.now(), name, amount, type, cat, day });
  saveAll(); renderRecur(); toast('Recurring added!');
  setVal('rc-n', ''); setVal('rc-amt', '');
}

function deleteRecurring(id) {
  S.recur = S.recur.filter(r => r.id !== id);
  saveAll(); renderRecur(); toast('Recurring removed.');
}

function applyRecurring(r) {
  const m = selMon();
  const dayStr = String(Math.min(r.day, new Date(parseInt(m.split('-')[0]), parseInt(m.split('-')[1]), 0).getDate())).padStart(2, '0');
  const date   = m + '-' + dayStr;
  if (S.txs.find(t => t.recurId === r.id && t.date === date)) { toast('Already applied this month.'); return; }
  S.txs.push({ id: Date.now(), recurId: r.id, type: r.type, amount: r.amount, desc: r.name + ' (recurring)', date, cat: r.cat, btype: 'needs' });
  saveAll(); renderAll(); renderRecur(); toast(`${r.name} applied!`);
}

function renderRecur() {
  const rList = $('recur-list'), dList = $('due-list');
  const m     = selMon();

  if (!S.recur.length) {
    rList.innerHTML = '<div class="empty">No recurring set up.</div>';
    dList.innerHTML = '<div class="empty">Nothing due.</div>';
    return;
  }

  const icons = { expense: '🔁', income: '💰' };
  rList.innerHTML = S.recur.map(r => {
    const rJson = JSON.stringify(r).replace(/"/g, '&quot;');
    return `<div class="rec-i">
      <div class="rec-ico">${icons[r.type] || '🔁'}</div>
      <div class="rec-inf"><div class="rec-n">${r.name}</div><div class="rec-m">${r.cat} · Day ${r.day} monthly</div></div>
      <div class="rec-amt" style="color:${r.type === 'income' ? 'var(--inc)' : 'var(--exp)'}">${r.type === 'income' ? '+' : '-'}${fmt(r.amount)}</div>
      <button class="btn sm" onclick="applyRecurring(${rJson})">Apply</button>
      <button class="rec-d" onclick="deleteRecurring(${r.id})">✕</button>
    </div>`;
  }).join('');

  const due = S.recur.filter(r => !S.txs.find(t => t.recurId === r.id && t.date?.startsWith(m)));
  dList.innerHTML = due.length
    ? due.map(r => {
        const rJson = JSON.stringify(r).replace(/"/g, '&quot;');
        return `<div class="rec-i">
          <div class="rec-ico">⚠️</div>
          <div class="rec-inf"><div class="rec-n">${r.name}</div><div class="rec-m">Due day ${r.day}</div></div>
          <div class="rec-amt" style="color:${r.type === 'income' ? 'var(--inc)' : 'var(--exp)'}">${r.type === 'income' ? '+' : '-'}${fmt(r.amount)}</div>
          <button class="btn sm pri" onclick="applyRecurring(${rJson})">Apply now</button>
        </div>`;
      }).join('')
    : '<div class="empty">All up to date!</div>';
}

/* ══════════════════════════════════════════
   SHOPPING LIST
══════════════════════════════════════════ */
function hideDupWarn() { $('dup-warn').style.display = 'none'; }

function addShoppingListItem() {
  const name = val('sl-n').trim(), qty = val('sl-q').trim();
  if (!name) { toast('Enter an item name.'); return; }
  if (S.sl.find(i => i.name.toLowerCase() === name.toLowerCase() && !i.done)) {
    const w = $('dup-warn');
    w.textContent = `"${name}" is already in your list! Update the quantity there instead.`;
    w.style.display = 'block'; return;
  }
  hideDupWarn();
  addToList('prods', name);
  S.sl.push({ id: Date.now(), name, qty, done: false });
  saveAll(); renderSl();
  setVal('sl-n', ''); setVal('sl-q', '');
  $('sl-n').focus();
}

function toggleSlItem(id) {
  const item = S.sl.find(i => i.id === id);
  if (item) { item.done = !item.done; saveAll(); renderSl(); }
}

function deleteSlItem(id) {
  S.sl = S.sl.filter(i => i.id !== id);
  saveAll(); renderSl();
}

function clearPurchased() {
  const before = S.sl.length;
  S.sl = S.sl.filter(i => !i.done);
  saveAll(); renderSl();
  if (S.sl.length === before) toast('No purchased items to clear.'); else toast('Purchased items cleared.');
}

function clearAllSl() {
  if (!S.sl.length) { toast('List is already empty.'); return; }
  if (!confirm('Clear entire shopping list?')) return;
  S.sl = []; saveAll(); renderSl(); toast('Shopping list cleared.');
}

function slItemHTML(item) {
  return `<div class="sl-i${item.done ? ' dn' : ''}">
    <div class="sl-cb${item.done ? ' on' : ''}" onclick="toggleSlItem(${item.id})">${item.done ? '✓' : ''}</div>
    <div class="sl-n">${item.name}</div>
    ${item.qty ? `<div class="sl-q">${item.qty}</div>` : ''}
    <button class="tx-d" onclick="deleteSlItem(${item.id})">✕</button>
  </div>`;
}

function renderSl() {
  const el = $('sl-list');
  if (!S.sl.length) { el.innerHTML = '<div class="empty">List is empty.</div>'; return; }
  const pending = S.sl.filter(i => !i.done), done = S.sl.filter(i => i.done);
  let h = '';
  if (pending.length) h += `<div class="sl-hdr">To buy (${pending.length})</div>` + pending.map(slItemHTML).join('');
  if (done.length)    h += `<div class="sl-hdr" style="margin-top:10px">Purchased (${done.length})</div>` + done.map(slItemHTML).join('');
  el.innerHTML = h;
}

/* ══════════════════════════════════════════
   ACCOUNTS
══════════════════════════════════════════ */
function populateAccDropdowns() {
  const opts = S.accs.length
    ? S.accs.map(a => `<option value="${a.id}">${a.name}</option>`).join('')
    : '<option value="">No accounts</option>';
  ['i-acc','e-acc'].forEach(id => { if ($(id)) $(id).innerHTML = opts; });
}

function addAccount() {
  const name = val('ac-n').trim(), type = val('ac-type');
  if (!name) { toast('Enter an account name.'); return; }
  if (S.accs.find(a => a.name.toLowerCase() === name.toLowerCase())) { toast('Account already exists.'); return; }
  S.accs.push({ id: 'acc_' + Date.now(), name, type });
  saveAll(); renderAccs(); populateAccDropdowns(); toast('Account added!');
  setVal('ac-n', '');
}

function deleteAccount(id) {
  if (!confirm('Delete this account?')) return;
  S.accs = S.accs.filter(a => a.id !== id);
  saveAll(); renderAccs(); populateAccDropdowns(); toast('Account deleted.');
}

function accBalance(a) {
  const txs = S.txs.filter(t => t.accId === a.id);
  return txs.filter(isIn).reduce((s, t) => s + t.amount, 0) - txs.filter(isOut).reduce((s, t) => s + t.amount, 0);
}

function renderAccs() {
  const el    = $('acc-grid');
  const icons = { bank: '🏦', cash: '💵', savings: '💰', card: '💳' };
  if (!S.accs.length) { el.innerHTML = '<div class="empty" style="grid-column:1/-1">No accounts yet.</div>'; return; }

  const total = S.accs.reduce((s, a) => s + accBalance(a), 0);
  el.innerHTML = S.accs.map(a => {
    const bal = accBalance(a);
    return `<div class="acc">
      <div class="acc-ico">${icons[a.type] || '🏦'}</div>
      <div class="acc-name">${a.name}</div>
      <div class="acc-type">${a.type}</div>
      <div class="acc-bal" style="color:${bal < 0 ? 'var(--exp)' : 'var(--inc)'}">${(bal < 0 ? '-' : '') + fmt(bal)}</div>
      <button class="tx-d" style="margin-top:6px" onclick="deleteAccount('${a.id}')">Delete</button>
    </div>`;
  }).join('') + `<div class="acc" style="border-style:dashed">
    <div class="acc-name" style="color:var(--t3)">All accounts</div>
    <div class="acc-bal" style="color:${total < 0 ? 'var(--exp)' : 'var(--inc)'}">${(total < 0 ? '-' : '') + fmt(total)}</div>
  </div>`;
}

/* ══════════════════════════════════════════
   AI INSIGHTS
══════════════════════════════════════════ */
function renderAI() {
  $('ai-body').innerHTML = '<div class="ai-spin">Analysing your transactions…</div>';
  setTimeout(() => {
    const mt = mTxs(), pm = S.txs.filter(t => t.date?.startsWith(prevMon()));
    const { inc, exp } = totals(mt), { inc: pi, exp: pe } = totals(pm);
    const insights = [];

    // Food category comparison
    const foodNow  = mt.filter(t => t.type === 'expense' && t.cat === '🍔 Food').reduce((s, t) => s + t.amount, 0);
    const foodPrev = pm.filter(t => t.type === 'expense' && t.cat === '🍔 Food').reduce((s, t) => s + t.amount, 0);
    if (foodNow > 0 && foodPrev > 0) {
      const d = Math.round((foodNow - foodPrev) / foodPrev * 100);
      insights.push(d > 0 ? `You spent ${d}% more on food vs last month (${fmt(foodNow)} vs ${fmt(foodPrev)}).` : `Food spending dropped ${Math.abs(d)}% vs last month — great discipline!`);
    }

    // Savings rate vs last month
    const sr  = inc  > 0 ? Math.round((inc  - exp)  / inc  * 100) : null;
    const psr = pi   > 0 ? Math.round((pi   - pe)   / pi   * 100) : null;
    if (sr !== null) {
      if (psr !== null) {
        const d = sr - psr;
        insights.push(d < 0 ? `Your savings rate dropped ${Math.abs(d)}% (now ${sr}%, was ${psr}%). Try cutting Wants spending.` : `Savings rate improved ${d}% to ${sr}% — keep it up!`);
      } else {
        insights.push(sr >= 20 ? `Savings rate is ${sr}% — above the 20% goal. Excellent!` : `Savings rate is ${sr}%. Aim for 20%+ by reducing discretionary spend.`);
      }
    }

    // Top spending category
    const catMap = {};
    mt.filter(t => t.type === 'expense').forEach(t => { catMap[t.cat] = (catMap[t.cat] || 0) + t.amount; });
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      const pct = exp > 0 ? Math.round(topCat[1] / exp * 100) : 0;
      insights.push(`${topCat[0]} is your top expense at ${fmt(topCat[1])} (${pct}% of total spending this month).`);
    }

    // Overspending alert
    if (exp > inc && inc > 0) insights.push('⚠️ Spending exceeds income this month. Review your Wants category to find savings.');
    else if (inc > 0) insights.push(`You are net positive ${fmt(inc - exp)} this month. Well done!`);

    // Recurring reminder
    const due = S.recur.filter(r => !S.txs.find(t => t.recurId === r.id && t.date?.startsWith(selMon())));
    if (due.length) insights.push(`${due.length} recurring transaction${due.length > 1 ? 's' : ''} not yet applied this month: ${due.map(r => r.name).join(', ')}.`);

    if (!insights.length) insights.push('Add more transactions this month to unlock personalised AI insights.');

    $('ai-body').innerHTML = insights.map(i => `<div class="ai-item"><div class="ai-dot"></div><div>${i}</div></div>`).join('');
    renderCmp();
  }, 400);
}

function renderCmp() {
  const now = new Date(), mons = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    mons.push({ l: d.toLocaleString('en', { month: 'short' }), y: d.getFullYear(), m: d.getMonth() });
  }
  const mE = mons.map(mo => S.txs.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === mo.m && new Date(t.date).getFullYear() === mo.y).reduce((s, t) => s + t.amount, 0));
  const mI = mons.map(mo => S.txs.filter(t => t.type === 'income'  && new Date(t.date).getMonth() === mo.m && new Date(t.date).getFullYear() === mo.y).reduce((s, t) => s + t.amount, 0));
  if (cmpC) cmpC.destroy();
  cmpC = new Chart($('cmpChart'), {
    type: 'bar',
    data: { labels: mons.map(m => m.l), datasets: [{ label: 'Income', data: mI, backgroundColor: '#9fe1cb', borderRadius: 3 }, { label: 'Expenses', data: mE, backgroundColor: '#f5c4b3', borderRadius: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#888780' } }, y: { ticks: { callback: v => S.cur + v, font: { size: 10 }, color: '#888780' }, grid: { color: 'rgba(128,128,128,.1)' } } } }
  });
}

/* ══════════════════════════════════════════
   CSV EXPORT
══════════════════════════════════════════ */
function exportCSV() {
  if (!S.txs.length) { toast('No transactions to export.'); return; }
  const rows = [['Date','Description','Category','Type','Amount','Currency','Account','Budget type']];
  [...S.txs].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
    rows.push([
      t.date,
      `"${(t.desc || '').replace(/"/g, '""')}"`,
      t.cat || '',
      t.type,
      (isIn(t) ? '' : '-') + t.amount.toFixed(2),
      S.cur,
      accName(t.accId) || '',
      t.btype || ''
    ]);
  });
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'monetrax_transactions.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  toast('Exported to CSV!');
}

/* ══════════════════════════════════════════
   PWA — SERVICE WORKER & INSTALL PROMPT
══════════════════════════════════════════ */
let _installPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  $('install-banner').classList.add('show');
});

$('install-btn').addEventListener('click', async () => {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  if (outcome === 'accepted') toast('Monetrax installed! Find it on your home screen.');
  _installPrompt = null;
  $('install-banner').classList.remove('show');
});

window.addEventListener('appinstalled', () => {
  $('install-banner').classList.remove('show');
  toast('Monetrax installed successfully!');
});

/* ══════════════════════════════════════════
   EVENT WIRING
══════════════════════════════════════════ */
function wireEvents() {
  // Sidebar toggle
  $('sb-toggle').addEventListener('click', () => {
    S.sbOpen = !S.sbOpen; saveAll(); applySidebar();
  });

  // Navigation — delegate to all nav buttons
  document.querySelectorAll('.ni[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Add-transaction tabs
  document.querySelectorAll('.at[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.at').forEach(b => b.classList.remove('act'));
      btn.classList.add('act');
      document.querySelectorAll('.ap').forEach(p => p.classList.remove('act'));
      $('ap-' + btn.dataset.tab).classList.add('act');
    });
  });

  // Dark mode
  $('dark-btn').addEventListener('click', () => {
    S.isDark = !S.isDark; saveAll(); applyTheme(); renderAll();
  });

  // Currency
  $('cur-sel').addEventListener('change', () => {
    S.cur = $('cur-sel').value; saveAll(); renderAll();
  });

  // Export buttons
  $('export-btn').addEventListener('click',    exportCSV);
  $('hist-export-btn').addEventListener('click', exportCSV);

  // Month change
  $('msel').addEventListener('change', renderAll);

  // Chart type toggle
  $('ct-bar').addEventListener('click',  () => { S.chartType = 'bar';  saveAll(); $('ct-bar').classList.add('act'); $('ct-line').classList.remove('act'); if (trendC) { trendC.destroy(); trendC = null; } renderTrend(); });
  $('ct-line').addEventListener('click', () => { S.chartType = 'line'; saveAll(); $('ct-line').classList.add('act'); $('ct-bar').classList.remove('act'); if (trendC) { trendC.destroy(); trendC = null; } renderTrend(); });

  // History search + clear
  $('h-search').addEventListener('input', renderHist);
  $('clear-month-btn').addEventListener('click', clearMonthTxs);

  // Income form
  $('add-inc-btn').addEventListener('click', addIncome);
  $('i-date').value = today();

  // Expense form
  $('add-exp-btn').addEventListener('click', addExpense);
  $('e-date').value = today();

  // Transfer form
  $('add-trf-btn').addEventListener('click', addTransfer);
  $('t-amt').addEventListener('input', updateTransferPreview);
  $('t-name').addEventListener('input', updateTransferPreview);
  $('t-type').addEventListener('change', updateTransferPreview);
  $('t-date').value = today();

  // Shopping cart
  $('cart-add-btn').addEventListener('click', addCartItem);
  $('sh-n').addEventListener('keydown', e => { if (e.key === 'Enter') addCartItem(); });
  $('sh-p').addEventListener('keydown', e => { if (e.key === 'Enter') addCartItem(); });
  $('sh-cap').addEventListener('input', renderCart);
  $('cart-clear-btn').addEventListener('click', clearCart);
  $('cart-checkout-btn').addEventListener('click', checkoutCart);
  $('sh-date').value = today();

  // Recurring
  $('recur-add-btn').addEventListener('click', addRecurring);

  // Budget
  $('b-inc').addEventListener('input', renderBudget);

  // Shopping list
  $('sl-add-btn').addEventListener('click', addShoppingListItem);
  $('sl-n').addEventListener('input', hideDupWarn);
  $('sl-n').addEventListener('keydown', e => { if (e.key === 'Enter') addShoppingListItem(); });
  $('sl-q').addEventListener('keydown', e => { if (e.key === 'Enter') addShoppingListItem(); });
  $('sl-done-btn').addEventListener('click', clearPurchased);
  $('sl-all-btn').addEventListener('click', clearAllSl);

  // Accounts
  $('acc-add-btn').addEventListener('click', addAccount);

  // Autocomplete bindings
  bindCombo('i-src', 'incSrcs');
  bindCombo('e-dsc', 'expDscs');
  bindCombo('sh-n',  'prods');
  bindCombo('sl-n',  'prods');

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', e => {
    if (window.innerWidth <= 640 && S.sbOpen && !$('sb').contains(e.target) && !$('sb-toggle').contains(e.target)) {
      S.sbOpen = false; saveAll(); applySidebar();
    }
  });
}

/* ══════════════════════════════════════════
   BOOT
══════════════════════════════════════════ */
(function init() {
  loadState();
  buildMonths();
  $('cur-sel').value = S.cur;
  if (S.isDark) applyTheme();
  applySidebar();
  $('ct-bar').classList.toggle('act',  S.chartType === 'bar');
  $('ct-line').classList.toggle('act', S.chartType === 'line');
  populateAccDropdowns();
  wireEvents();
  renderAll();
  renderCart();
  renderSl();
})();
