import { durationLabel, monthDiff, parseDate } from './dates.js';

const DATA_URL = './src/data/products.json';

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalise(value, values) {
  const low = Math.min(...values);
  const high = Math.max(...values);
  return high === low ? 0 : (value - low) / (high - low);
}

export function analyseRegistry(data) {
  const asOf = parseDate(data.asOf);
  const completed = data.products.flatMap(product => product.periods
    .filter(period => period.end)
    .map(period => ({ ...period, productId: product.id, productName: product.name, family: product.family })));
  const latestRenameDate = completed.reduce((latest, period) => !latest || period.end > latest ? period.end : latest, null);
  const latestRenamePeriods = completed.filter(period => period.end === latestRenameDate);
  const latestRename = latestRenameDate ? {
    date: latestRenameDate,
    daysAgo: Math.max(0, Math.floor((asOf - parseDate(latestRenameDate)) / 86_400_000)),
    products: latestRenamePeriods.map(period => period.productName).sort((a, b) => a.localeCompare(b))
  } : null;

  const renameYears = completed.reduce((years, period) => {
    const year = parseDate(period.end).getUTCFullYear();
    years.set(year, (years.get(year) || 0) + 1);
    return years;
  }, new Map());
  const annualRenames = [...renameYears].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);
  const busiest = [...annualRenames].sort((a, b) => b.count - a.count || a.year - b.year)[0] || null;

  const familyMap = new Map();
  for (const product of data.products) {
    const entry = familyMap.get(product.family) || { family: product.family, products: 0, renames: 0, durations: [] };
    entry.products += 1;
    const former = product.periods.filter(period => period.end);
    entry.renames += former.length;
    entry.durations.push(...former.map(period => monthDiff(parseDate(period.start), parseDate(period.end))));
    familyMap.set(product.family, entry);
  }
  const families = [...familyMap.values()].map(entry => ({
    ...entry,
    renamesPerProduct: entry.renames / entry.products,
    medianMonths: median(entry.durations),
    evidence: entry.renames >= 2 ? 'sufficient' : 'sparse'
  })).sort((a, b) => b.renamesPerProduct - a.renamesPerProduct || a.family.localeCompare(b.family));

  const repeatOffenders = data.products.map(product => ({
    id: product.id,
    name: product.name,
    family: product.family,
    identities: product.periods.length
  })).sort((a, b) => b.identities - a.identities || a.name.localeCompare(b.name)).slice(0, 8);

  const globalMedian = median(completed.map(period => monthDiff(parseDate(period.start), parseDate(period.end))));
  const riskInputs = data.products.map(product => {
    const current = product.periods.find(period => !period.end);
    const family = familyMap.get(product.family);
    const ageMonths = monthDiff(parseDate(current.start), asOf);
    const expectedRun = family.renames >= 2 ? median(family.durations) : globalMedian;
    const remaining = expectedRun - ageMonths;
    const window = remaining <= 0 ? 'Overdue by historical standards'
      : remaining <= 12 ? 'Historical window: within 12 months'
      : remaining <= 36 ? 'Historical window: 1–3 years'
      : 'Historical window: more than 3 years';
    return {
      id: product.id,
      name: product.name,
      family: product.family,
      ageMonths,
      priorNames: product.periods.length - 1,
      familyRate: family.renames / family.products,
      familyEvidence: family.renames,
      window
    };
  });
  const ages = riskInputs.map(item => item.ageMonths);
  const histories = riskInputs.map(item => item.priorNames);
  const rates = riskInputs.map(item => item.familyRate);
  const forecast = riskInputs.map(item => {
    const score = Math.round(100 * (
      normalise(item.ageMonths, ages) * 0.45
      + normalise(item.priorNames, histories) * 0.35
      + normalise(item.familyRate, rates) * 0.20
    ));
    const status = score >= 60
      ? { symbol: '●', label: 'Elevated' }
      : score >= 35 ? { symbol: '◐', label: 'Watchlist' } : { symbol: '○', label: 'Not imminent' };
    return { ...item, score, ...status };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return {
    asOf: data.asOf,
    products: data.products.length,
    renames: completed.length,
    latestRename,
    medianMonths: median(completed.map(period => monthDiff(parseDate(period.start), parseDate(period.end)))),
    busiest,
    annualRenames,
    families,
    repeatOffenders,
    forecast
  };
}

function dateAsOf(value) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parseDate(value));
}

function renderBars(items, value, label) {
  const max = Math.max(...items.map(value), 1);
  return items.map(item => `<li class="analysis-bar-row">
    <span class="analysis-bar-label">${item.label}</span>
    <span class="analysis-bar-track" aria-hidden="true"><span style="width:${value(item) / max * 100}%"></span></span>
    <strong>${label(item)}</strong>
  </li>`).join('');
}

function render(result) {
  document.querySelector('#analysis-as-of').textContent = `Analysis uses registry data as at ${dateAsOf(result.asOf)}.`;
  document.querySelector('#footer-as-of').textContent = `Data as at ${dateAsOf(result.asOf)}`;
  if (result.latestRename) {
    const productNames = new Intl.ListFormat('en-AU', { style: 'long', type: 'conjunction' }).format(result.latestRename.products);
    document.querySelector('#rename-days').textContent = result.latestRename.daysAgo.toLocaleString('en-AU');
    document.querySelector('#rename-tracker-detail').textContent = `Last recorded on ${dateAsOf(result.latestRename.date)}: ${productNames}. Counted to ${dateAsOf(result.asOf)}.`;
    document.querySelector('#rename-tracker').hidden = false;
  }
  document.querySelector('#analysis-summary').innerHTML = `
    <div><strong>${result.products}</strong><span>surviving products</span></div>
    <div><strong>${result.renames}</strong><span>documented renames</span></div>
    <div><strong>${durationLabel(Math.round(result.medianMonths))}</strong><span>median former-name run</span></div>
    <div><strong>${result.busiest ? result.busiest.year : '—'}</strong><span>busiest rename year${result.busiest ? ` (${result.busiest.count})` : ''}</span></div>`;

  const familyRows = result.families.map(family => `<tr>
    <th scope="row">${family.family}</th><td>${family.products}</td><td>${family.renames}</td>
    <td>${family.medianMonths === null ? 'Not available' : durationLabel(Math.round(family.medianMonths))}</td>
    <td>${family.evidence === 'sparse' ? '○ Limited history' : '● Comparable'}</td>
  </tr>`).join('');
  document.querySelector('#family-body').innerHTML = familyRows;

  const waveItems = result.annualRenames.map(item => ({ ...item, label: String(item.year) }));
  document.querySelector('#rename-waves').innerHTML = renderBars(waveItems, item => item.count, item => `${item.count} rename${item.count === 1 ? '' : 's'}`);

  document.querySelector('#repeat-offenders').innerHTML = result.repeatOffenders.map((product, index) => `<li>
    <span class="rank">${index + 1}</span><span><strong>${product.name}</strong><small>${product.family}</small></span>
    <b>${product.identities} identities</b>
  </li>`).join('');

  document.querySelector('#forecast').innerHTML = result.forecast.slice(0, 8).map(item => `<article class="forecast-card">
    <p class="risk-status"><span aria-hidden="true">${item.symbol}</span> ${item.label}</p>
    <h3>${item.name}</h3>
    <p>${item.priorNames ? `${item.priorNames} previous ${item.priorNames === 1 ? 'name' : 'names'}` : 'No previous rename documented'}; current identity age ${durationLabel(item.ageMonths)}.${item.familyEvidence < 2 ? ' ○ Limited family history.' : ''}</p>
    <div class="risk-meter" aria-label="Playful rebrand pressure score ${item.score} out of 100"><span style="width:${item.score}%"></span></div>
    <small>Rebrand Pressure™ ${item.score}/100 · ${item.family}<br>${item.window}</small>
  </article>`).join('');
}

async function loadAnalysis() {
  const loading = document.querySelector('#analysis-loading');
  const error = document.querySelector('#analysis-error');
  const content = document.querySelector('#analysis-content');
  loading.hidden = false;
  error.hidden = true;
  content.hidden = true;
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const result = analyseRegistry(data);
    if (!result.renames) {
      loading.textContent = '○ There is not enough completed rename history to calculate a pattern yet.';
      return;
    }
    render(result);
    loading.hidden = true;
    content.hidden = false;
  } catch (errorValue) {
    console.error(errorValue);
    loading.hidden = true;
    error.hidden = false;
  }
}

if (typeof document !== 'undefined') {
  document.querySelector('#analysis-retry')?.addEventListener('click', loadAnalysis);
  loadAnalysis();
}
