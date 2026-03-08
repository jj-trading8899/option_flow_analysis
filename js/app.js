// ============================================================
// Options Flow Terminal — App Logic
// ============================================================

let DATA = null;
let currentDate = null;
let currentFilter = 'all';
let currentSort = 'premium';

// Utility functions
const fmt = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n;
};

const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(0) + '%' : '—';

const spotChangeHtml = (spot, prevSpot) => {
  if (!prevSpot) return '';
  const chg = ((spot / prevSpot) - 1) * 100;
  const cls = chg >= 0 ? 'up' : 'down';
  return `<span class="spot-chg ${cls}">(${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%)</span>`;
};

const premDeltaHtml = (cur, prev) => {
  if (!prev || prev === 0) return '';
  const chg = ((cur / prev) - 1) * 100;
  const cls = chg >= 0 ? 'up' : 'down';
  return `<span class="prem-delta ${cls}">${chg >= 0 ? '+' : ''}${chg.toFixed(0)}%</span>`;
};

// Get data for a ticker on a specific date, and optionally the previous date
function getTickerData(ticker, date) {
  const td = DATA.tickers[ticker];
  if (!td || !td[date]) return null;
  return td[date];
}

function getPrevDate(date) {
  const idx = DATA.dates.indexOf(date);
  if (idx > 0) return DATA.dates[idx - 1];
  return null;
}

// Build summary cards
function renderSummary(date) {
  const row = document.getElementById('summaryRow');
  const tickers = Object.keys(DATA.tickers);
  let totalPrem = 0, totalTrades = 0, totalBull = 0, totalBear = 0;

  tickers.forEach(t => {
    const d = getTickerData(t, date);
    if (!d) return;
    totalPrem += d.totalPrem || 0;
    totalTrades += d.trades || 0;
    totalBull += d.bullPrem || 0;
    totalBear += d.bearPrem || 0;
  });

  const items = [
    { label: 'Total Premium', value: fmt(totalPrem), color: 'var(--text-primary)' },
    { label: 'Trades', value: totalTrades.toLocaleString(), color: 'var(--text-primary)' },
    { label: 'Bull Premium', value: fmt(totalBull), color: 'var(--green)' },
    { label: 'Bear Premium', value: fmt(totalBear), color: 'var(--red)' },
  ];

  row.innerHTML = items.map((s, i) => `
    <div class="summary-card" style="animation-delay: ${i * 60}ms">
      <div class="summary-label">${s.label}</div>
      <div class="summary-value" style="color: ${s.color}">${s.value}</div>
    </div>
  `).join('');
}

// Build ticker cards
function renderCards(date) {
  const grid = document.getElementById('cardsGrid');
  const prevDate = getPrevDate(date);
  const allTickers = Object.keys(DATA.tickers);

  // Filter to tickers that have data for this date
  let tickers = allTickers.filter(t => getTickerData(t, date));

  // Apply filter
  if (currentFilter === 'bullish') {
    tickers = tickers.filter(t => getTickerData(t, date).trend === 'bullish');
  } else if (currentFilter === 'bearish') {
    tickers = tickers.filter(t => getTickerData(t, date).trend === 'bearish');
  } else if (currentFilter === 'other') {
    tickers = tickers.filter(t => ['mixed', 'hedging'].includes(getTickerData(t, date).trend));
  } else if (currentFilter === 'crypto') {
    tickers = tickers.filter(t => ['IBIT', 'ETHA'].includes(t));
  }

  // Sort
  tickers.sort((a, b) => {
    const da = getTickerData(a, date), db = getTickerData(b, date);
    switch (currentSort) {
      case 'premium': return (db.totalPrem || 0) - (da.totalPrem || 0);
      case 'trades': return (db.trades || 0) - (da.trades || 0);
      case 'bullpct': return (db.totalPrem > 0 ? db.bullPrem / db.totalPrem : 0) - (da.totalPrem > 0 ? da.bullPrem / da.totalPrem : 0);
      case 'bearpct': return (db.totalPrem > 0 ? db.bearPrem / db.totalPrem : 0) - (da.totalPrem > 0 ? da.bearPrem / da.totalPrem : 0);
      case 'alpha': return a.localeCompare(b);
      default: return 0;
    }
  });

  grid.innerHTML = tickers.map((ticker, idx) => {
    const d = getTickerData(ticker, date);
    const prev = prevDate ? getTickerData(ticker, prevDate) : null;
    const callPct = d.trades > 0 ? ((d.calls / d.trades) * 100).toFixed(0) : 0;
    const bullPct = d.totalPrem > 0 ? (d.bullPrem / d.totalPrem * 100) : 0;
    const bearPct = d.totalPrem > 0 ? (d.bearPrem / d.totalPrem * 100) : 0;
    const neutPct = 100 - bullPct - bearPct;

    const prevTrendHtml = prev && prev.trend !== d.trend
      ? `<span class="prev-trend">was ${prev.trend}</span>` : '';

    const prevSentHtml = prev && prev.totalPrem > 0
      ? `<span class="prev-sent">Mon: ${pct(prev.bullPrem, prev.totalPrem)} bull / ${pct(prev.bearPrem, prev.totalPrem)} bear</span>` : '';

    const topTradesHtml = (d.topTrades || []).map((t, i) => `
      <div class="trade-row">
        <span class="trade-type ${t.type.toLowerCase()}">${t.type}</span>
        <span class="trade-strike">$${t.strike}</span>
        <span class="trade-exp">${t.exp}</span>
        <span class="trade-prem">${fmt(t.prem)}</span>
        <span class="trade-sent ${t.sent.toLowerCase()}">${t.sent}</span>
        <span class="trade-act ${t.act.toLowerCase()}">${t.act}</span>
      </div>
    `).join('');

    const stats = [
      { label: 'Calls', value: `${d.calls} (${callPct}%)`, cls: 'green' },
      { label: 'Puts', value: `${d.puts} (${100 - callPct}%)`, cls: 'red' },
      { label: 'Sweeps', value: `${d.sweeps} / ${d.trades}`, cls: 'purple' },
      { label: 'Sweep Prem', value: fmt(d.sweepPrem), cls: 'purple' },
    ];
    if (d.avgCallStrike > 0) stats.push({ label: 'Avg Call $', value: `$${d.avgCallStrike.toFixed(2)}`, cls: 'green' });
    if (d.avgPutStrike > 0) stats.push({ label: 'Avg Put $', value: `$${d.avgPutStrike.toFixed(2)}`, cls: 'red' });

    return `
    <div class="ticker-card" data-ticker="${ticker}" style="animation-delay: ${idx * 40}ms">
      <div class="card-header" onclick="toggleCard('${ticker}')">
        <div class="card-left">
          <span class="ticker-name">${ticker}</span>
          <span class="ticker-spot">$${d.spot?.toFixed(2) || '—'} ${prev ? spotChangeHtml(d.spot, prev.spot) : ''}</span>
          <span class="trend-badge ${d.trend}">${d.trend}</span>
          ${prevTrendHtml}
        </div>
        <div class="card-right">
          <span>${d.trades} trades</span>
          <span>${fmt(d.totalPrem)}</span>
          ${prev ? premDeltaHtml(d.totalPrem, prev.totalPrem) : ''}
          <span class="expand-arrow">▾</span>
        </div>
      </div>
      <div class="sent-bar-wrap">
        <div class="sent-bar">
          <div class="bull" style="width: ${bullPct}%"></div>
          <div class="bear" style="width: ${bearPct}%"></div>
          <div class="neut" style="width: ${neutPct}%"></div>
        </div>
        <div class="sent-labels">
          <span><span class="dot-green">●</span> Bull ${bullPct.toFixed(0)}%</span>
          <span><span class="dot-red">●</span> Bear ${bearPct.toFixed(0)}%</span>
          <span><span class="dot-grey">●</span> Neut ${neutPct.toFixed(0)}%</span>
          ${prevSentHtml}
        </div>
      </div>
      <div class="card-body">
        <div class="card-body-inner">
          <p class="card-summary">${d.summary || ''}</p>
          <div class="stats-grid">
            ${stats.map(s => `
              <div class="stat-cell">
                <div class="stat-label">${s.label}</div>
                <div class="stat-value ${s.cls}">${s.value}</div>
              </div>
            `).join('')}
          </div>
          ${topTradesHtml ? `
            <div class="top-trades-label">Top Trades</div>
            ${topTradesHtml}
          ` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// Toggle card expansion
function toggleCard(ticker) {
  const cards = document.querySelectorAll('.ticker-card');
  cards.forEach(c => {
    if (c.dataset.ticker === ticker) {
      c.classList.toggle('expanded');
    } else {
      c.classList.remove('expanded');
    }
  });
}
// Make toggleCard globally available
window.toggleCard = toggleCard;

// Render shifts summary
function renderShifts(date) {
  const box = document.getElementById('shiftsBox');
  const prevDate = getPrevDate(date);
  if (!prevDate) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';

  const turnedBullish = [], turnedBearish = [], narrowing = [], steady = [], newTickers = [];

  Object.keys(DATA.tickers).forEach(t => {
    const cur = getTickerData(t, date);
    const prev = getTickerData(t, prevDate);
    if (!cur) return;
    if (!prev) { newTickers.push(t); return; }

    const curBullPct = cur.totalPrem > 0 ? cur.bullPrem / cur.totalPrem : 0;
    const prevBullPct = prev.totalPrem > 0 ? prev.bullPrem / prev.totalPrem : 0;
    const bullShift = curBullPct - prevBullPct;

    if (cur.trend !== prev.trend) {
      if (cur.trend === 'bullish' || (bullShift > 0.1)) turnedBullish.push(t);
      else if (cur.trend === 'bearish' || (bullShift < -0.1)) turnedBearish.push(t);
      else narrowing.push(t);
    } else {
      steady.push(t);
    }
  });

  let html = '<div class="shifts-title">Key Shifts vs Previous Day</div>';
  if (turnedBullish.length) html += `<span class="up">▲ Turned Bullish:</span> ${turnedBullish.join(', ')}<br>`;
  if (turnedBearish.length) html += `<span class="dn">▼ Turned Bearish:</span> ${turnedBearish.join(', ')}<br>`;
  if (narrowing.length) html += `<span class="mix">◆ Shifting:</span> ${narrowing.join(', ')}<br>`;
  if (steady.length) html += `<span class="steady">● Steady:</span> ${steady.join(', ')}<br>`;
  if (newTickers.length) html += `<span class="new">★ New:</span> ${newTickers.join(', ')}`;

  box.innerHTML = html;
}

// Render everything for current date
function render() {
  document.getElementById('header-date').textContent =
    `${currentDate} — ${Object.keys(DATA.tickers).filter(t => getTickerData(t, currentDate)).length} tickers`;
  renderSummary(currentDate);
  renderCards(currentDate);
  renderShifts(currentDate);
}

// Populate date selector
function initDateNav() {
  const sel = document.getElementById('dateSelect');
  sel.innerHTML = DATA.dates.map(d => `<option value="${d}" ${d === currentDate ? 'selected' : ''}>${d}</option>`).join('');
  sel.addEventListener('change', () => { currentDate = sel.value; render(); });

  document.getElementById('prevDate').addEventListener('click', () => {
    const idx = DATA.dates.indexOf(currentDate);
    if (idx > 0) { currentDate = DATA.dates[idx - 1]; sel.value = currentDate; render(); }
  });
  document.getElementById('nextDate').addEventListener('click', () => {
    const idx = DATA.dates.indexOf(currentDate);
    if (idx < DATA.dates.length - 1) { currentDate = DATA.dates[idx + 1]; sel.value = currentDate; render(); }
  });
}

// Filter buttons
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderCards(currentDate);
    });
  });
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderCards(currentDate);
  });
}

// Load data and initialize
async function init() {
  try {
    const resp = await fetch('data/flow.json');
    DATA = await resp.json();
    currentDate = DATA.latest_date;
    initDateNav();
    initFilters();
    render();
  } catch (err) {
    console.error('Failed to load data:', err);
    document.getElementById('cardsGrid').innerHTML =
      '<p style="color: var(--red); padding: 20px; font-family: var(--mono);">Error loading data/flow.json — check console.</p>';
  }
}

document.addEventListener('DOMContentLoaded', init);
