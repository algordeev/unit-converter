'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculate, format } = require('../calculator.js');
function near(expression, expected, target='') {
  const result = calculate(expression,target);
  assert.ok(Math.abs(result.value-expected) <= Math.max(1,Math.abs(expected))*1e-12, `${expression}: ${result.value} ≠ ${expected}`);
  return result;
}
for(const [expression,expected,unit] of [
 ['24 V * 2 A in W',48,'W'], ['12 N*m * 1500 rpm in kW',1.884955592153876,'kW'],
 ['100 km / 2 h in km/h',50,'km/h'], ['5 ft + 20 cm in m',1.724,'m'],
 ['(12 V * 2 A) * 3 h in Wh',72,'Wh'], ['10 cm * 20 cm in cm²',200,'cm^2']
]) test(expression,()=>assert.equal(near(expression,expected).unit,unit));
test('compatible mixed addition/subtraction',()=>{near('1 m - 20 cm in cm',80);near('2 lb + 1 kg in kg',1.90718474);near('5 ft + 20 cm - 2 mm to m',1.722);});
test('precedence, parentheses and quantity binding',()=>{near('2 + 3 * 4',14);near('(2 + 3) * 4',20);near('100 m / 2 s',50);near('12 kg*m/s² in N',12);near('10 m / (2 s * 5 s)',1);near('8 / 2 * 2',8);});
test('powers and Unicode',()=>{near('(2 m)^2 in cm²',40000);near('2 m² in cm²',20000);near('2 m³ in L',2000);near('6 N·m × 2 ÷ 3 in J',4);near('2 m^-2 in cm^-2',.0002);near('1e3 m / 2e1 s in m/s',50);near('.5 m + 2.5e-1 m in cm',75);});
test('case-sensitive prefixes',()=>{near('1 MW in mW',1e9);near('1 mW in W',.001);assert.throws(()=>calculate('1 mw'),/Unknown unit/);});
test('dimensionless results and radians',()=>{const q=near('10 m / 2 m',5);assert.equal(q.unit,'');near('1 rev in rad',2*Math.PI);near('60 rpm in rad/s',2*Math.PI);});
test('rpm explanation comes from actual units',()=>{const q=calculate('12 N*m * 1500 rpm in kW');assert.ok(q.explanation.some(s=>s.includes('2π/60')));assert.ok(!calculate('24 V * 2 A in W').explanation.some(s=>s.includes('2π')));});
test('temperature conversions and differences',()=>{near('0 °C in °F',32);near('−40 °C to °F',-40);near('32 °F in K',273.15);near('0 K in °C',-273.15);near('10 deltaC + 18 deltaF in deltaK',20);near('1 deltaF in deltaC',5/9);});
for(const expression of ['5 °C + 3 °C','5 °F * 2','1 K / 2 K','1 K^2','(1 °C)^1','1 °C in deltaC','1 deltaC in °C','-274 °C']) test('reject temperature: '+expression,()=>assert.throws(()=>calculate(expression),/temperature|Temperature|Absolute|absolute/));
for(const [expression,pattern] of [
 ['5 m + 3 s',/Length and time cannot be added/],['10 kg in m',/mass to length/],
 ['1 gal',/gal_US or gal_imp/],['1 ton',/tonne, ton_short, or ton_long/],['1 psig',/reference/],['1 barg',/reference/],
 ['1 blarg',/Unknown unit/],['2 m + 1',/cannot be added/], ['1 C',/°C/], ['1 F',/°F/],
 ['1 / 0',/zero/], ['1 m / 0 s',/zero/],['0^-1',/Zero/],['0^0',/Zero/],
 ['1e309 W',/finite/],['1e200 * 1e200',/finite/], ['(1e100)^12',/finite/],
 ['2 m 3 m',/explicit/],['2(3)',/explicit/],['2 ** 3',/Expected/],['1,000 m',/commas/],
 ['1.5.5 m',/Unexpected/],['(2 m',/parenthesis/],['2 m)',/Unexpected/],['',/Enter an expression/],
 ['alert(1)',/Unknown unit/],['1; alert(1)',/Unsupported/],['2^1.5',/integer exponent/], ['2^13',/integer exponent/],
 ['2^2^2',/Chained/]
]) test('clear failure: '+expression,()=>assert.throws(()=>calculate(expression),pattern));
test('explicit variants',()=>{near('1 gal_US in L',3.785411784);near('1 gal_imp in L',4.54609);near('1 tonne in kg',1000);near('1 ton_short in lb',2000);near('1 ton_long in lb',2240);});
test('aliases and inch separator',()=>{near('1 foot in m',.3048);near('5 in + 2 in',.1778);near('5 inch in cm',12.7);near('5 in in cm',12.7);});
test('zero, signs and formatting',()=>{assert.equal(calculate('0 m in cm').text,'0 cm');assert.equal(format(-0).text,'0');near('-5 m + 3 m in m',-2);near('-(2 m + 3 m) in m',-5);near('+1e-3 MW in W',1000);assert.equal(format(1/3).rounded,true);assert.equal(format(48).rounded,false);assert.match(format(1e-9).text,/e-9/);assert.match(format(1e12).text,/e\+12/);});
test('target field and conflicts',()=>{near('24 V * 2 A',48,'W');for(const target of ['W','kW']) assert.throws(()=>calculate('24 V * 2 A in W',target),/Two output targets/);assert.throws(()=>calculate('1 m','m+cm'),/Unexpected/);assert.throws(()=>calculate('1 m','2 m'),/Expected a unit/);assert.throws(()=>calculate('1 m in cm to mm'),/only one/);});
test('complexity limits',()=>{assert.throws(()=>calculate('1'.repeat(513)),/512/);assert.throws(()=>calculate('1','m'.repeat(513)),/512/);assert.throws(()=>calculate(Array(90).fill('1').join('+')),/160 tokens/);assert.throws(()=>calculate('('.repeat(25)+'1'+')'.repeat(25)),/24 levels/);});
test('preserves requested unit rather than inferring physical meaning',()=>{assert.equal(calculate('1 N*m in N*m').unit,'N*m');assert.equal(calculate('1 N*m in J').unit,'J');assert.ok(!calculate('1 N*m').explanation.join(' ').includes('torque'));});

test('unary signs and powers follow standard precedence',()=>{near('-2^2',-4);near('(-2)^2',4);near('-(2)^2',-4);near('-2 m^2',-2);assert.throws(()=>calculate('2 m^2^2'),/Chained/);assert.throws(()=>calculate('1e-999 m'),/too small/);});

test('inch output target remains unambiguous',()=>{near('1 ft in in',12);near('1 in to in',1);near('1 in in in',1);});
test('underflow is rejected instead of becoming a false zero',()=>{for(const e of ['1e-300 * 1e-300','(1e-300)^2','1e-300 m in km^12']) assert.throws(()=>calculate(e),/too small|Cannot convert/);});

test('absolute-zero bounds reject even tiny physical violations',()=>{for(const e of ['-1e-11 K','-273.15000000001 °C','-459.67000000001 °F']) assert.throws(()=>calculate(e),/absolute zero/);near('-459.67 °F in K',0);});
