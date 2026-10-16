'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { categories } = require('../units.js');
const root = path.join(__dirname, '..');
function page(t) {
  const dom = new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'), { runScripts:'outside-only', url:'https://convertlab.example/' });
  t.after(()=>dom.window.close());
  for (const file of ['units.js','calculator.js','app.js','calculator-ui.js']) {
    new vm.Script(fs.readFileSync(path.join(root,file),'utf8'), { filename:file }).runInContext(dom.getInternalVMContext());
  }
  const { window } = dom, $ = selector=>window.document.querySelector(selector);
  const set = (selector,value)=>{ const el=$(selector); el.value=value; el.dispatchEvent(new window.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true})); };
  const submit = ()=>$('#calculate-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  return { window, $, set, submit };
}
test('page references all scripts, default mode and accessible labels',t=>{
 const {$}=page(t);
 assert.equal($('#convert-mode').hidden,false); assert.equal($('#calculate-mode').hidden,true);
 assert.equal($('#mode-convert').getAttribute('aria-pressed'),'true');
 for(const id of ['expression','target-unit']) assert.equal($(`label[for="${id}"]`).control,$('#'+id));
 assert.equal($('#calc-error').getAttribute('role'),'alert');
 assert.ok($('#expression').getAttribute('aria-describedby').includes('calc-error'));
 assert.equal($('#result').textContent,'100');
});
test('mode switching preserves original converter input and category',t=>{
 const {$,set}=page(t); $('#tab-mass').click(); set('#input-value','2');
 $('#mode-calculate').click(); assert.equal($('#convert-mode').hidden,true);
 assert.equal($('#mode-calculate').getAttribute('aria-pressed'),'true');
 $('#mode-convert').click(); assert.equal($('#input-value').value,'2');
 assert.equal($('#tab-mass').getAttribute('aria-selected'),'true');
 assert.equal($('#convert-mode').hidden,false);
});
test('every example chip fills, clears old target, and calculates',t=>{
 const {$,window,set}=page(t); $('#mode-calculate').click();
 const chips=[...window.document.querySelectorAll('[data-expression]')];
 const expected=['48 W','1.884955592 kW','50 km/h','1.724 m','72 Wh','200 cm^2'];
 chips.forEach((chip,index)=>{set('#target-unit','m');chip.click();assert.equal($('#expression').value,chip.dataset.expression);assert.equal($('#target-unit').value,'');assert.ok($('#calculation-result').textContent.endsWith(expected[index]),$('#calculation-result').textContent);assert.equal($('#calc-error').textContent,'');assert.equal($('#calculation-explanation').hidden,false);});
});
test('Enter submits, Shift+Enter remains available for a newline',t=>{
 const {$,window,set}=page(t);set('#expression','24 V * 2 A in W');
 const enter=new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});
 $('#expression').dispatchEvent(enter);assert.equal(enter.defaultPrevented,true);assert.equal($('#calculation-result').textContent,'48 W');
 set('#expression','1 m');const shift=new window.KeyboardEvent('keydown',{key:'Enter',shiftKey:true,bubbles:true,cancelable:true});$('#expression').dispatchEvent(shift);assert.equal(shift.defaultPrevented,false);assert.equal($('#copy-calculation').disabled,true);
});
test('editing either field invalidates result without typing errors',t=>{
 const {$,set,submit}=page(t);set('#expression','24 V * 2 A');set('#target-unit','W');submit();
 assert.equal($('#calculation-result').textContent,'48 W');
 set('#expression','24 V *');assert.equal($('#calculation-result').textContent,'Ready to calculate.');assert.equal($('#calc-error').textContent,'');assert.equal($('#copy-calculation').disabled,true);assert.equal($('#calculation-explanation').hidden,true);
 set('#expression','24 V * 2 A');submit();set('#target-unit','kW');assert.equal($('#copy-calculation').disabled,true);submit();assert.equal($('#calculation-result').textContent,'0.048 kW');
});
test('inline/field conflicts are visible and recover after clearing one',t=>{
 const {$,set,submit}=page(t);set('#expression','24 V * 2 A in W');set('#target-unit','kW');submit();
 assert.match($('#calc-error').textContent,/Two output targets/);assert.equal($('#expression').getAttribute('aria-invalid'),'true');assert.equal($('#copy-calculation').disabled,true);
 set('#target-unit','');assert.equal($('#calc-error').textContent,'');submit();assert.equal($('#calculation-result').textContent,'48 W');assert.equal($('#expression').hasAttribute('aria-invalid'),false);
});
test('dimension errors recover and explanation is replaced, not accumulated',t=>{
 const {$,set,submit}=page(t);set('#expression','5 m + 3 s');submit();assert.match($('#calc-error').textContent,/Length and time/);
 set('#expression','12 N*m * 1500 rpm in kW');submit();assert.match($('#calculation-steps').textContent,/2π\/60/);
 set('#expression','24 V * 2 A in W');submit();assert.ok(!$('#calculation-steps').textContent.includes('2π'));
});
test('copy includes result, approximation indicator and unit',async t=>{
 const {$,window,set,submit}=page(t);let copied;
 Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}}});
 set('#expression','12 N*m * 1500 rpm in kW');submit();$('#copy-calculation').click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(copied,$('#calculation-result').textContent);assert.match(copied,/^≈ .* kW$/);assert.equal($('#copy-calculation').textContent,'Copied!');
});
test('copy fallback selects the full result',async t=>{
 const {$,window,set,submit}=page(t);set('#expression','24 V * 2 A in W');submit();$('#copy-calculation').click();await Promise.resolve();
 assert.equal(window.getSelection().toString(),'48 W');assert.match($('#copy-calculation').textContent,/copy manually/);
});
test('late clipboard completion cannot label a changed result as copied',async t=>{
 const {$,window,set,submit}=page(t);let done;
 Object.defineProperty(window.navigator,'clipboard',{value:{writeText:()=>new Promise(resolve=>{done=resolve;})}});
 set('#expression','1 m');submit();$('#copy-calculation').click();set('#expression','2 m');done();await new Promise(resolve=>setImmediate(resolve));assert.equal($('#copy-calculation').textContent,'Copy result');assert.equal($('#copy-calculation').disabled,true);
});
test('long expressions/results and malicious input remain plain text',t=>{
 const {$,set,submit}=page(t);set('#expression',Array(50).fill('1 m').join(' + '));submit();assert.equal($('#calc-error').textContent,'');
 set('#expression','1e200 m^12');submit();assert.match($('#calculation-result').textContent,/1e\+200 m\^12/);
 set('#expression','<img src=x onerror=alert(1)>');submit();assert.equal($('#calculation-result img'),null);assert.match($('#calc-error').textContent,/Unsupported/);
});
test('original converter all category unit pairs still work',t=>{
 const {$,set}=page(t);let checked=0;
 for(const [category,{units}] of Object.entries(categories)) {
  $(`#tab-${category}`).click();
  for(const from of units) for(const to of units) {
   set('#from-unit',from[0]);set('#to-unit',to[0]);set('#input-value','123.456');
   let expected;
   if(category==='temperature') {const c=from[0]==='°C'?123.456:from[0]==='°F'?(123.456-32)*5/9:123.456-273.15;expected=to[0]==='°C'?c:to[0]==='°F'?c*9/5+32:c+273.15;}
   else expected=123.456*from[3]/to[3];
   const actual=Number($('#result').textContent.replace(/,/g,''));
   assert.ok(Math.abs(actual-expected)<=Math.max(1,Math.abs(expected))*1e-10,`${category}: ${from[0]} to ${to[0]}`);checked++;
  }
 }
 assert.equal(checked,239);
});
test('original converter swap, category keyboard and copy',async t=>{
 const {$,window,set}=page(t);set('#input-value','1');$('#swap').click();assert.equal($('#from-unit').value,'cm');assert.equal($('#result').textContent,'0.01');
 $('#tab-length').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.equal($('#tab-mass').getAttribute('aria-selected'),'true');
 let copied;Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async value=>{copied=value;}}});$('#copy').click();await Promise.resolve();assert.ok(copied.endsWith(' lb'));
});
