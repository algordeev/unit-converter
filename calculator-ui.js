/* UI state is separate from the pure calculator and shared unit definitions. */
'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const expression = $('#expression');
  const target = $('#target-unit');
  const output = $('#calculation-result');
  const error = $('#calc-error');
  const copy = $('#copy-calculation');
  let resultText = '';
  let revision = 0;
  function invalidate() {
    revision++;
    resultText = '';
    output.textContent = 'Ready to calculate.';
    $('#calc-result-note').textContent = 'Expression changed. Calculate to see the updated result.';
    error.textContent = '';
    expression.removeAttribute('aria-invalid');
    target.removeAttribute('aria-invalid');
    copy.disabled = true;
    copy.textContent = 'Copy result';
    $('#calculation-explanation').hidden = true;
    $('#calculation-steps').replaceChildren();
  }
  function run() {
    invalidate();
    try {
      const calculated = ConvertLabCalculator.calculate(expression.value, target.value);
      resultText = calculated.text;
      output.textContent = resultText;
      $('#calc-result-note').textContent = calculated.rounded ? '≈ Rounded for display · up to 10 significant digits' : 'Calculated locally on your device';
      copy.disabled = false;
      $('#calculation-steps').replaceChildren(...calculated.explanation.map(text => {
        const item = document.createElement('li'); item.textContent = text; return item;
      }));
      $('#calculation-explanation').hidden = false;
    } catch (err) {
      error.textContent = err.message;
      expression.setAttribute('aria-invalid', 'true');
      if (target.value.trim()) target.setAttribute('aria-invalid', 'true');
      output.textContent = 'Check your expression.';
      $('#calc-result-note').textContent = 'Adjust the input above, then calculate again.';
    }
  }
  for (const mode of ['convert', 'calculate']) {
    $(`#mode-${mode}`).addEventListener('click', () => {
      for (const item of ['convert', 'calculate']) {
        $(`#mode-${item}`).setAttribute('aria-pressed', String(item === mode));
        $(`#${item}-mode`).hidden = item !== mode;
      }
      $('.live-badge').lastChild.textContent = mode === 'convert' ? ' Live conversion' : ' Local calculation';
    });
  }
  $('#calculate-form').addEventListener('submit', event => { event.preventDefault(); run(); });
  expression.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); run(); }
  });
  [expression, target].forEach(field => field.addEventListener('input', invalidate));
  document.querySelectorAll('[data-expression]').forEach(chip => chip.addEventListener('click', () => {
    expression.value = chip.dataset.expression;
    target.value = ''; // Examples specify their own output unit.
    run();
  }));
  copy.addEventListener('click', async () => {
    if (!resultText) return;
    const copiedRevision = revision;
    try {
      await navigator.clipboard.writeText(resultText);
      if (copiedRevision === revision) copy.textContent = 'Copied!';
    } catch {
      if (copiedRevision !== revision) return;
      const selection = window.getSelection();
      const range = document.createRange(); range.selectNodeContents(output);
      selection.removeAllRanges(); selection.addRange(range);
      copy.textContent = 'Result selected — copy manually';
    }
  });
  $('#supported-units').textContent = ConvertLabCalculator.units.join(', ');
  $('#supported-aliases').textContent = Object.entries(ConvertLabCalculator.aliases).map(([alias, symbol]) => `${alias} → ${symbol}`).join('; ');
})();
