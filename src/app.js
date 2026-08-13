import { currentThenChronological, dateLabel, durationLabel, monthDiff, parseDate } from './dates.js';

const DATA_URL = './src/data/products.json';
const state = { data: null, view: 'table', query: '', family: 'all', status: 'all' };
const $ = (selector) => document.querySelector(selector);
const els = {
  loading: $('#loading'), error: $('#error'), empty: $('#empty'), table: $('#table-view'),
  timeline: $('#timeline-view'), body: $('#history-body'), timelineGrid: $('#timeline')
};

function visibleProducts() {
  const query = state.query.toLowerCase();
  return state.data.products.map(product => {
    const periods = currentThenChronological(product.periods.filter(period => state.status === 'all'
      || (state.status === 'current') === !period.end));
    return { product, periods };
  }).filter(({ product, periods }) => (state.family === 'all' || product.family === state.family)
    && periods.length && (!query || product.name.toLowerCase().includes(query)
      || periods.some(period => period.name.toLowerCase().includes(query))));
}

function sourcesFor(periods) {
  const ids = [...new Set(periods.flatMap(period => period.sources))];
  return ids.map(id => state.data.sources.find(source => source.id === id));
}

function renderPeriod(period, max, asOf) {
  const months = monthDiff(parseDate(period.start), period.end ? parseDate(period.end) : asOf);
  return `<div class="name-period">
    <div class="name-identity ${period.end ? '' : 'current'}"><span class="period-name">${period.name}</span><span class="badge ${period.end ? 'former' : ''}">${period.end ? '○ Former' : '● Current'}</span></div>
    <div class="period-date">${dateLabel(period.start, period.startPrecision, period.startQualifier)}<span class="precision">${period.startQualifier}; ${period.startPrecision} precision</span></div>
    <div class="period-date">${dateLabel(period.end, period.endPrecision, period.endQualifier)}${period.end ? `<span class="precision">${period.endQualifier}; ${period.endPrecision} precision</span>` : ''}</div>
    <div class="duration"><span class="duration-label">${durationLabel(months)}</span><div class="duration-track" aria-hidden="true"><span class="duration-bar" style="width:${Math.max(3, months / max * 100)}%"></span></div></div>
    <div><ul class="sources">${sourcesFor([period]).map(source => `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.publisher}<span class="sr-only"> (opens in a new tab)</span></a></li>`).join('')}</ul></div>
  </div>`;
}

function renderTable(groups) {
  const asOf = parseDate(state.data.asOf);
  const allPeriods = groups.flatMap(group => group.periods);
  const max = Math.max(...allPeriods.map(period => monthDiff(parseDate(period.start), period.end ? parseDate(period.end) : asOf)), 1);
  els.body.innerHTML = groups.map(({ product, periods }) => `<tr>
    <th scope="row" class="product-cell"><div class="product-identity"><img class="product-logo" src="${product.logo.src}" alt="${product.logo.alt}" width="52" height="52"><div><span class="product-name">${product.name}</span><span class="family">${product.family}</span></div></div></th>
    <td colspan="5" class="history-cell">${periods.map(period => renderPeriod(period, max, asOf)).join('')}</td>
  </tr>`).join('');
}

function renderTimeline(groups) {
  const allPeriods = groups.flatMap(group => group.periods);
  const minYear = Math.min(...allPeriods.map(period => parseDate(period.start).getUTCFullYear()));
  const maxDate = parseDate(state.data.asOf), maxYear = maxDate.getUTCFullYear() + 1, span = maxYear - minYear;
  const years = Array.from({ length: span + 1 }, (_, index) => minYear + index)
    .filter((_, index) => index % Math.max(1, Math.ceil(span / 9)) === 0);
  const pct = date => (date.getUTCFullYear() + date.getUTCMonth() / 12 - minYear) / span * 100;
  els.timelineGrid.innerHTML = `<div class="timeline-grid"><div class="timeline-axis"><div></div><div class="axis-years">${years.map(year => `<span class="axis-year" style="left:${(year - minYear) / span * 100}%">${year}</span>`).join('')}</div></div>${groups.map(({ product, periods }) =>
    `<div class="timeline-row"><div class="timeline-product"><img src="${product.logo.src}" alt="" width="32" height="32"><span>${product.name}</span></div><div class="timeline-lanes" style="min-height:${Math.max(72, periods.length * 29 + 19)}px">${periods.map((period, index) => {
      const left = pct(parseDate(period.start)), right = pct(period.end ? parseDate(period.end) : maxDate);
      const label = `${period.name}: ${dateLabel(period.start, period.startPrecision, period.startQualifier)} to ${dateLabel(period.end, period.endPrecision, period.endQualifier)}`;
      return `<div class="timeline-bar ${period.end ? '' : 'current'}" tabindex="0" aria-label="${label}" style="left:${left}%;width:${Math.max(.5, right - left)}%;top:${10 + index * 29}px" title="${label}">${period.name}</div>`;
    }).join('')}</div></div>`).join('')}</div>`;
}

function render() {
  const groups = visibleProducts(), hasRows = groups.length > 0;
  els.loading.hidden = true; els.error.hidden = true; els.empty.hidden = hasRows;
  els.table.hidden = !hasRows || state.view !== 'table';
  els.timeline.hidden = !hasRows || state.view !== 'timeline';
  if (hasRows) { renderTable(groups); renderTimeline(groups); }
}

async function load() {
  els.loading.hidden = false; els.error.hidden = true; els.table.hidden = true; els.timeline.hidden = true;
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    $('#product-count').textContent = state.data.products.length;
    $('#name-count').textContent = state.data.products.reduce((count, product) => count + product.periods.length, 0);
    $('#as-of').textContent = `Dataset as of ${dateLabel(state.data.asOf, 'day', '')}.`;
    [...new Set(state.data.products.map(product => product.family))].sort().forEach(family => $('#family').add(new Option(family, family)));
    render();
  } catch (error) {
    console.error(error); els.loading.hidden = true; els.error.hidden = false;
  }
}

document.querySelectorAll('.view-button').forEach(button => button.addEventListener('click', () => {
  state.view = button.dataset.view;
  document.querySelectorAll('.view-button').forEach(candidate => {
    const active = candidate === button;
    candidate.classList.toggle('active', active); candidate.setAttribute('aria-pressed', active);
  });
  render();
}));
$('#search').addEventListener('input', event => { state.query = event.target.value; render(); });
$('#family').addEventListener('change', event => { state.family = event.target.value; render(); });
$('#status').addEventListener('change', event => { state.status = event.target.value; render(); });
$('#retry').addEventListener('click', load);
load();
