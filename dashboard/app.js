// Token Radar's plain dashboard. It reads window.RADAR (written beside dashboard/
// by main.ts) and renders the ranked board, filters, sorting, a per-protocol detail
// view with the model's own factors and the protocol's farm plan, and the live-token
// view. No network: every byte it shows is in data.js.
//
// Deep links, for screenshots and sharing: #detail=<slug> opens one protocol,
// #cat=<category> filters by category, #q=<text> searches, #tab=live shows the
// already-trading view.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;

  var WATCH = {};
  DATA.watchlist.forEach(function (s) { WATCH[s] = true; });

  var state = { q: '', category: 'all', chain: 'all', watchOnly: false, tab: 'pre', sort: 'implied_value_usd', dir: -1, selected: null };

  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $('board'), liveEl = $('live'), rowsEl = $('rows'), liveRowsEl = $('live-rows');

  var usdFull = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usdFull.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) { return 'x' + n.toFixed(2); }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  // ---- stats strip ---------------------------------------------------------
  (function stats() {
    var top = DATA.rows[0];
    var items = [
      ['Protocols scanned', String(DATA.protocols_scanned)],
      ['Watchlist', String(DATA.watchlist_size)],
      ['Board rows', String(DATA.board_size)],
      ['Early finds', String(DATA.early_size)],
      ['Top implied value', top ? fmtUsd(top.implied_value_usd) : 'n/a'],
    ];
    var dl = $('stats');
    items.forEach(function (it) {
      var wrap = el('div');
      wrap.appendChild(el('dt', null, it[0]));
      var dd = el('dd');
      dd.textContent = it[1];
      wrap.appendChild(dd);
      dl.appendChild(wrap);
    });
    $('asof').textContent = DATA.as_of;
  })();

  // ---- filter controls -----------------------------------------------------
  (function fillSelects() {
    var cats = {}, chains = {};
    DATA.rows.forEach(function (r) {
      if (r.category) cats[r.category] = true;
      r.chains.forEach(function (c) { chains[c] = true; });
    });
    Object.keys(cats).sort().forEach(function (c) {
      $('cat').appendChild(el('option', null, c)).value = c;
    });
    Object.keys(chains).sort().forEach(function (c) {
      $('chain').appendChild(el('option', null, c)).value = c;
    });
  })();

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.watchOnly && !WATCH[r.slug]) return false;
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.chain !== 'all' && r.chains.indexOf(state.chain) === -1) return false;
      if (q && r.name.toLowerCase().indexOf(q) === -1 && r.slug.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function sortRows(rows) {
    var key = state.sort, dir = state.dir;
    var val = function (r) {
      if (key === 'name' || key === 'category') return (r[key] || '').toLowerCase();
      if (key === 'change_7d') return r.change_7d === null ? -Infinity : r.change_7d;
      if (key === 'age_days') return r.age_days === null ? -1 : r.age_days;
      return r[key];
    };
    return rows.slice().sort(function (a, b) {
      var va = val(a), vb = val(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return a.slug < b.slug ? -1 : 1;
    });
  }

  // ---- board table ---------------------------------------------------------
  function renderBoard() {
    var rows = sortRows(filteredRows());
    rowsEl.textContent = '';
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      if (state.selected === r.slug) tr.className = 'selected';
      tr.setAttribute('data-slug', r.slug);
      var tdRank = el('td', 'rank num', '#' + r.rank);
      tr.appendChild(tdRank);
      var tdName = el('td');
      tdName.appendChild(el('strong', null, r.name));
      var sub = el('span', 'sub', r.slug + (WATCH[r.slug] ? ' · watchlist' : ' · early find'));
      tdName.appendChild(sub);
      tr.appendChild(tdName);
      tr.appendChild(el('td', null, r.category || '—'));
      tr.appendChild(el('td', null, r.chains.slice(0, 2).join(', ') + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '')));
      tr.appendChild(el('td', 'num', fmtUsd(r.tvl_usd)));
      var tdChg = el('td', 'num ' + (r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg'), fmtPct(r.change_7d));
      tr.appendChild(tdChg);
      tr.appendChild(el('td', 'num', fmtAge(r.age_days)));
      tr.appendChild(el('td', 'num', fmtUsd(r.implied_value_usd)));
      tr.addEventListener('click', function () { select(r.slug, true); });
      rowsEl.appendChild(tr);
    });
    $('count').textContent = rows.length + ' of ' + DATA.rows.length + ' pre-token protocols shown' +
      (state.watchOnly ? ' · watchlist only' : '') + '. Click a row for its model breakdown and farm plan.';
    $('hint').textContent = state.sort === 'implied_value_usd'
      ? 'Sorted by implied value, highest first. Click any column header to re-sort.'
      : 'Sorted by ' + state.sort + ' ' + (state.dir === -1 ? 'descending' : 'ascending') + '. Click “Implied value” to return to the ranking.';
  }

  // ---- live view -----------------------------------------------------------
  function renderLive() {
    liveRowsEl.textContent = '';
    DATA.live.forEach(function (r) {
      var tr = document.createElement('tr');
      var tdName = el('td');
      tdName.appendChild(el('strong', null, r.name));
      tdName.appendChild(el('span', 'sub', r.slug));
      tr.appendChild(tdName);
      tr.appendChild(el('td', null, r.category || '—'));
      tr.appendChild(el('td', null, r.chains.slice(0, 2).join(', ') + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '')));
      tr.appendChild(el('td', 'num', fmtUsd(r.tvl_usd)));
      tr.appendChild(el('td', 'num', r.mcap_usd === null ? 'n/a' : fmtUsd(r.mcap_usd)));
      tr.appendChild(el('td', 'num ' + (r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg'), fmtPct(r.change_7d)));
      liveRowsEl.appendChild(tr);
    });
    $('count').textContent = DATA.live.length + ' largest already-trading protocols by market cap. Their tokens trade, so the board shows the market\u2019s own value, not a model\u2019s.';
  }

  // ---- detail view ---------------------------------------------------------
  function barRow(label, value, lo, hi, cls) {
    var row = el('div', 'bar');
    row.appendChild(el('span', null, label));
    var track = el('div', 'track');
    var fill = el('div', 'fill' + (cls ? ' ' + cls : ''));
    var pct = Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
    fill.style.width = pct.toFixed(1) + '%';
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', 'val', fmtMult(value)));
    return row;
  }

  function select(slug, pushHash) {
    var r = null;
    DATA.rows.forEach(function (row) { if (row.slug === slug) r = row; });
    var detail = $('detail');
    if (!r) {
      state.selected = null;
      detail.hidden = true;
      detail.textContent = '';
      renderBoard();
      return;
    }
    state.selected = slug;
    if (pushHash) {
      try { history.replaceState(null, '', '#detail=' + encodeURIComponent(slug)); } catch (e) { /* hash only */ }
    }
    detail.hidden = false;
    detail.textContent = '';
    var close = el('button', 'close', 'Close ×');
    close.addEventListener('click', function () { select(null, true); });
    detail.appendChild(close);
    var h2 = el('h2');
    h2.appendChild(document.createTextNode('#' + r.rank + ' ' + r.name + ' '));
    if (WATCH[r.slug]) h2.appendChild(el('span', 'badge', 'Watchlist'));
    else h2.appendChild(el('span', 'badge', 'Early find'));
    detail.appendChild(h2);
    var facts = el('div', 'facts');
    [['Category', r.category || 'not named'], ['Chains', r.chains.join(', ') || '—'],
     ['TVL', fmtUsd(r.tvl_usd)], ['7-day change', fmtPct(r.change_7d)],
     ['Tracked since', r.listed_at || 'unknown'], ['Age', fmtAge(r.age_days)],
     ['Token', 'records no token']].forEach(function (f) {
      var span = el('span');
      span.appendChild(document.createTextNode(f[0] + ': '));
      span.appendChild(el('b', null, f[1]));
      facts.appendChild(span);
    });
    detail.appendChild(facts);
    detail.appendChild(el('h3', null, 'How the implied value is built'));
    var bars = el('div', 'bars');
    bars.appendChild(barRow('Size factor', r.size_multiplier, 0.55, 1.45, ''));
    bars.appendChild(barRow('Growth factor', r.growth_multiplier, 0.32, 2.1, ''));
    bars.appendChild(barRow('Maturity factor', r.maturity_multiplier, 0.55, 1.0, ''));
    bars.appendChild(barRow('Breadth factor', r.breadth_multiplier, 1.0, 1.16, ''));
    detail.appendChild(bars);
    var line = el('p', 'implied-line');
    line.appendChild(document.createTextNode('TVL ' + fmtUsd(r.tvl_usd) + ' × 0.30 × the four factors above = '));
    line.appendChild(el('b', null, fmtUsd(r.implied_value_usd) + ' implied value'));
    detail.appendChild(line);
    detail.appendChild(el('h3', null, 'Farm plan — six steps'));
    var ol = el('ol', 'steps');
    r.farm_steps.forEach(function (s) { ol.appendChild(el('li', null, s)); });
    detail.appendChild(ol);
    renderBoard();
    detail.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  // ---- tabs, sorting, filters ---------------------------------------------
  function setTab(tab) {
    state.tab = tab;
    $('tab-pre').setAttribute('aria-selected', tab === 'pre' ? 'true' : 'false');
    $('tab-live').setAttribute('aria-selected', tab === 'live' ? 'true' : 'false');
    boardEl.hidden = tab !== 'pre';
    liveEl.hidden = tab !== 'live';
    if (tab === 'live') renderLive(); else renderBoard();
  }
  $('tab-pre').addEventListener('click', function () { setTab('pre'); });
  $('tab-live').addEventListener('click', function () { setTab('live'); });

  boardEl.querySelectorAll('th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-sort');
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'name' || key === 'category' ? 1 : -1; }
      boardEl.querySelectorAll('th').forEach(function (h) { h.classList.remove('sorted-asc', 'sorted-desc'); });
      th.classList.add(state.dir === 1 ? 'sorted-asc' : 'sorted-desc');
      renderBoard();
    });
  });

  $('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); });
  $('cat').addEventListener('change', function (e) { state.category = e.target.value; renderBoard(); });
  $('chain').addEventListener('change', function (e) { state.chain = e.target.value; renderBoard(); });
  $('watch').addEventListener('change', function (e) { state.watchOnly = e.target.checked; renderBoard(); });

  // ---- deep links ----------------------------------------------------------
  (function fromHash() {
    var hash = window.location.hash || '';
    var get = function (name) {
      var m = hash.match(new RegExp('(?:#|&)' + name + '=([^&]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    };
    var tab = get('tab');
    if (tab === 'live') setTab('live');
    var cat = get('cat');
    if (cat) { state.category = cat; $('cat').value = cat; }
    var q = get('q');
    if (q) { state.q = q; $('q').value = q; }
    renderBoard();
    var slug = get('detail');
    if (slug) select(slug, false);
  })();
})();
