import { dateLabel, durationLabel, monthDiff, parseDate } from './dates.js';

const DATA_URL = './src/data/products.json';
const state = { data: null, view: 'table', query: '', family: 'all', status: 'all' };
const $ = (selector) => document.querySelector(selector);
const els = { loading: $('#loading'), error: $('#error'), empty: $('#empty'), table: $('#table-view'), timeline: $('#timeline-view'), body: $('#history-body'), timelineGrid: $('#timeline') };

function visiblePeriods() {
  const q=state.query.toLowerCase();
  return state.data.products.flatMap(product => product.periods.map(period => ({product,period}))).filter(({product,period}) =>
    (state.family==='all'||product.family===state.family) &&
    (state.status==='all'||(state.status==='current')===!period.end) &&
    (!q||product.name.toLowerCase().includes(q)||period.name.toLowerCase().includes(q)));
}
function sourcesFor(period) { return period.sources.map(id => state.data.sources.find(source => source.id===id)); }
function renderTable(rows) {
  const asOf=parseDate(state.data.asOf), max=Math.max(...rows.map(({period})=>monthDiff(parseDate(period.start),period.end?parseDate(period.end):asOf)),1);
  els.body.innerHTML=rows.map(({product,period})=>{const months=monthDiff(parseDate(period.start),period.end?parseDate(period.end):asOf); return `<tr>
    <td><span class="product-name">${product.name}</span><span class="family">${product.family}</span></td>
    <td><span class="period-name">${period.name}</span><br><span class="badge ${period.end?'former':''}">${period.end?'○ Former':'● Current'}</span></td>
    <td>${dateLabel(period.start,period.startPrecision,period.startQualifier)}<span class="precision">${period.startQualifier}; ${period.startPrecision} precision</span></td>
    <td>${dateLabel(period.end,period.endPrecision,period.endQualifier)}${period.end?`<span class="precision">${period.endQualifier}; ${period.endPrecision} precision</span>`:''}</td>
    <td class="duration"><span class="duration-label">${durationLabel(months)}</span><div class="duration-track" aria-hidden="true"><span class="duration-bar" style="width:${Math.max(3,months/max*100)}%"></span></div></td>
    <td><ul class="sources">${sourcesFor(period).map(s=>`<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.publisher}<span class="sr-only"> (opens in a new tab)</span></a></li>`).join('')}</ul></td></tr>`}).join('');
}
function renderTimeline(rows) {
  const minYear=Math.min(...rows.map(({period})=>parseDate(period.start).getUTCFullYear()));
  const maxDate=parseDate(state.data.asOf), maxYear=maxDate.getUTCFullYear()+1, span=maxYear-minYear;
  const products=[...new Map(rows.map(row=>[row.product.id,row.product])).values()];
  const years=Array.from({length:span+1},(_,i)=>minYear+i).filter((_,i)=>i%Math.max(1,Math.ceil(span/9))===0);
  const pct=date=>(date.getUTCFullYear()+date.getUTCMonth()/12-minYear)/span*100;
  els.timelineGrid.innerHTML=`<div class="timeline-grid"><div class="timeline-axis"><div></div><div class="axis-years">${years.map(y=>`<span class="axis-year" style="left:${(y-minYear)/span*100}%">${y}</span>`).join('')}</div></div>${products.map(product=>{
    const periods=rows.filter(row=>row.product.id===product.id).map(row=>row.period);
    return `<div class="timeline-row"><div class="timeline-product">${product.name}</div><div class="timeline-lanes">${periods.map((p,i)=>{const left=pct(parseDate(p.start)),right=pct(p.end?parseDate(p.end):maxDate); return `<div class="timeline-bar ${p.end?'':'current'}" tabindex="0" style="left:${left}%;width:${Math.max(.5,right-left)}%;top:${10+i*29}px" title="${p.name}: ${dateLabel(p.start,p.startPrecision,p.startQualifier)} to ${dateLabel(p.end,p.endPrecision,p.endQualifier)}">${p.name}</div>`}).join('')}</div></div>`}).join('')}</div>`;
}
function render() {
  const rows=visiblePeriods(), hasRows=rows.length>0;
  els.loading.hidden=true; els.error.hidden=true; els.empty.hidden=hasRows; els.table.hidden=!hasRows||state.view!=='table'; els.timeline.hidden=!hasRows||state.view!=='timeline';
  if(hasRows){renderTable(rows);renderTimeline(rows)}
}
async function load() {
  els.loading.hidden=false; els.error.hidden=true; els.table.hidden=true; els.timeline.hidden=true;
  try { const response=await fetch(DATA_URL); if(!response.ok) throw new Error(`HTTP ${response.status}`); state.data=await response.json();
    $('#product-count').textContent=state.data.products.length; $('#name-count').textContent=state.data.products.reduce((n,p)=>n+p.periods.length,0); $('#as-of').textContent=`Dataset as of ${dateLabel(state.data.asOf,'day','')}.`;
    [...new Set(state.data.products.map(p=>p.family))].sort().forEach(f=>$('#family').add(new Option(f,f))); render();
  } catch(error) { console.error(error); els.loading.hidden=true; els.error.hidden=false; }
}
document.querySelectorAll('.view-button').forEach(button=>button.addEventListener('click',()=>{state.view=button.dataset.view;document.querySelectorAll('.view-button').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});render()}));
$('#search').addEventListener('input',event=>{state.query=event.target.value;render()}); $('#family').addEventListener('change',event=>{state.family=event.target.value;render()}); $('#status').addEventListener('change',event=>{state.status=event.target.value;render()}); $('#retry').addEventListener('click',load); load();
