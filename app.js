'use strict';

const { categories } = ConvertLabUnits;
let activeCategory = 'length';
let currentResult = null;
let copyTimer;
const input = document.querySelector('#input-value');
const fromSelect = document.querySelector('#from-unit');
const toSelect = document.querySelector('#to-unit');
const result = document.querySelector('#result');
const formula = document.querySelector('#formula');
const error = document.querySelector('#input-error');
const tabs = [...document.querySelectorAll('[role="tab"]')];
const selections = {};

function convert(value, from, to, category) {
  if (category !== 'temperature') return value * from[3] / to[3];
  const celsius = from[0] === '°C' ? value : from[0] === '°F' ? (value - 32) * 5 / 9 : value - 273.15;
  return to[0] === '°C' ? celsius : to[0] === '°F' ? celsius * 9 / 5 + 32 : celsius + 273.15;
}
function format(value) {
  if (Math.abs(value) < 1e-12 && activeCategory === 'temperature') value = 0;
  if (Object.is(value, -0)) value = 0;
  if (value !== 0 && (Math.abs(value) < 1e-6 || Math.abs(value) >= 1e12)) return value.toExponential(8).replace(/\.?0+e/, 'e');
  return new Intl.NumberFormat('en-US', { maximumSignificantDigits: 12 }).format(value);
}
function unitName(unit, value) {
  return Math.abs(value) === 1 && activeCategory !== 'temperature' ? unit[1].toLowerCase() : unit[2];
}
function update() {
  const units = categories[activeCategory].units;
  const from = units.find(unit => unit[0] === fromSelect.value);
  const to = units.find(unit => unit[0] === toSelect.value);
  selections[activeCategory] = [fromSelect.value, toSelect.value];
  error.textContent = '';
  currentResult = null;
  document.querySelector('#copy-label').textContent = 'Copy result';
  if (input.value === '' || !Number.isFinite(input.valueAsNumber)) {
    result.textContent = '—';
    formula.textContent = 'Enter a number to get started.';
    return;
  }
  const value = input.valueAsNumber;
  const kelvin = activeCategory === 'temperature' ? convert(value, from, ['K'], 'temperature') : 0;
  if (kelvin < -1e-10) {
    result.textContent = '—';
    formula.textContent = 'Check your temperature.';
    error.textContent = 'Temperature cannot be below absolute zero (−273.15 °C / −459.67 °F / 0 K).';
    return;
  }
  const converted = convert(value, from, to, activeCategory);
  if (!Number.isFinite(converted)) {
    result.textContent = '—';
    formula.textContent = 'This result is outside the supported numeric range.';
    return;
  }
  currentResult = converted;
  result.textContent = format(converted);
  result.style.fontSize = result.textContent.length > 16 ? '27px' : '';
  if (activeCategory === 'temperature') {
    const formulas = { '°C:°F': '°F = (°C × 9/5) + 32', '°F:°C': '°C = (°F − 32) × 5/9', '°C:K': 'K = °C + 273.15', 'K:°C': '°C = K − 273.15', '°F:K': 'K = (°F − 32) × 5/9 + 273.15', 'K:°F': '°F = (K − 273.15) × 9/5 + 32' };
    formula.textContent = formulas[`${from[0]}:${to[0]}`] || `${from[0]} = ${to[0]}`;
  } else {
    const ratio = convert(1, from, to, activeCategory);
    formula.textContent = `1 ${unitName(from, 1)} = ${format(ratio)} ${unitName(to, ratio)}`;
  }
}
function selectCategory(category) {
  activeCategory = category;
  tabs.forEach(tab => {
    const selected = tab.dataset.category === category;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  document.querySelector('#conversion-panel').setAttribute('aria-labelledby', `tab-${category}`);
  const { units, defaults } = categories[category];
  [fromSelect, toSelect].forEach((select, index) => {
    select.replaceChildren(...units.map(unit => new Option(`${unit[1]} (${unit[0]})`, unit[0])));
    select.value = (selections[category] || defaults)[index];
  });
  update();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectCategory(tab.dataset.category));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    tabs[next].focus();
    selectCategory(tabs[next].dataset.category);
  });
});
input.addEventListener('input', update);
fromSelect.addEventListener('change', update);
toSelect.addEventListener('change', update);
document.querySelector('#swap').addEventListener('click', () => {
  const previous = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = previous;
  update();
});
document.querySelector('#copy').addEventListener('click', async () => {
  const label = document.querySelector('#copy-label');
  clearTimeout(copyTimer);
  if (currentResult === null) { label.textContent = 'Enter a valid value'; return; }
  const text = `${format(currentResult)} ${toSelect.value}`;
  try {
    await navigator.clipboard.writeText(text);
    label.textContent = 'Copied!';
  } catch {
    label.textContent = 'Select result to copy';
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(result);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  copyTimer = setTimeout(() => { label.textContent = 'Copy result'; }, 2200);
});
const dialog = document.querySelector('#pro-dialog');
document.querySelector('#pro-info').addEventListener('click', () => dialog.showModal());
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('#back-to-converter').addEventListener('click', () => { dialog.close(); document.querySelector('#converter').scrollIntoView({ behavior: 'smooth' }); input.focus({ preventScroll: true }); });
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
document.querySelector('#year').textContent = new Date().getFullYear();
selectCategory('length');
