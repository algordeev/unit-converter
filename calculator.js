/* Restricted quantity grammar. Never evaluates input as executable code. */
(function (root) {
'use strict';
const { categories } = typeof module !== 'undefined' ? require('./units.js') : root.ConvertLabUnits;
// Dimension order: length, mass, time, electric current, temperature.
const zero = [0, 0, 0, 0, 0];
const registry = new Map();
function add(symbol, factor, dims, offset = null) { registry.set(symbol, { factor, dims, offset, symbol }); }
const dimensionSets = { length: [1,0,0,0,0], mass: [0,1,0,0,0], pressure: [-1,1,-2,0,0], energy: [2,1,-2,0,0] };
for (const [category, dims] of Object.entries(dimensionSets)) {
  for (const [symbol,,,factor] of categories[category].units) add(symbol, factor, dims);
}
for (const [symbol, factor, dims] of [
  ['s',1,[0,0,1,0,0]], ['min',60,[0,0,1,0,0]], ['h',3600,[0,0,1,0,0]],
  ['A',1,[0,0,0,1,0]], ['mA',.001,[0,0,0,1,0]],
  ['V',1,[2,1,-3,-1,0]], ['mV',.001,[2,1,-3,-1,0]], ['kV',1000,[2,1,-3,-1,0]],
  ['N',1,[1,1,-2,0,0]], ['kN',1000,[1,1,-2,0,0]],
  ['W',1,[2,1,-3,0,0]], ['mW',.001,[2,1,-3,0,0]], ['kW',1000,[2,1,-3,0,0]], ['MW',1e6,[2,1,-3,0,0]],
  ['rad',1,zero], ['rev',2*Math.PI,zero], ['rpm',2*Math.PI/60,[0,0,-1,0,0]],
  ['L',.001,[3,0,0,0,0]], ['mL',1e-6,[3,0,0,0,0]],
  ['gal_US',.003785411784,[3,0,0,0,0]], ['gal_imp',.00454609,[3,0,0,0,0]],
  ['ton_short',907.18474,[0,1,0,0,0]], ['ton_long',1016.0469088,[0,1,0,0,0]],
  ['deltaC',1,[0,0,0,0,1]], ['deltaF',5/9,[0,0,0,0,1]], ['deltaK',1,[0,0,0,0,1]]
]) add(symbol,factor,dims);
add('°C',1,[0,0,0,0,1],273.15); add('°F',5/9,[0,0,0,0,1],273.15-32*5/9); add('K',1,[0,0,0,0,1],0);
const aliases = { meter:'m',meters:'m',metre:'m',metres:'m',inch:'in',inches:'in',foot:'ft',feet:'ft',second:'s',seconds:'s',hour:'h',hours:'h',minute:'min',minutes:'min',tonne:'t',tonnes:'t',Celsius:'°C',Fahrenheit:'°F',kelvin:'K',um:'µm',μm:'µm' };
const ambiguous = { gal:'Use gal_US or gal_imp.', gallon:'Use gal_US or gal_imp.', gallons:'Use gal_US or gal_imp.', ton:'Use tonne, ton_short, or ton_long.', tons:'Use tonne, ton_short, or ton_long.', C:'Use °C for absolute temperature; electrical coulombs are unsupported.', F:'Use °F for absolute temperature; electrical farads are unsupported.', psig:'Gauge pressure needs an explicit reference; use psi only for a pressure magnitude.', psia:'Use psi for a pressure magnitude; no atmospheric offset is applied.', barg:'Gauge pressure needs an explicit reference; use bar only for a pressure magnitude.' };
function fail(message) { throw new Error(message); }
function checked(value) { if (!Number.isFinite(value)) fail('Result is outside the finite numeric range.'); return Object.is(value,-0) ? 0 : value; }
function scaled(a,b,divide=false) {
  const value=checked(divide?a/b:a*b);
  if(value===0 && a!==0 && b!==0) fail('Result is too small for browser numeric precision.');
  return value;
}
function equal(a,b) { return a.every((n,i)=>n===b[i]); }
function dimensionName(d) {
  for (const [name,dims] of Object.entries(dimensionSets)) if(equal(d,dims)) return name;
  if(equal(d,[0,0,1,0,0])) return 'time';
  if(equal(d,[0,0,0,0,1])) return 'temperature difference';
  return d.every(n=>n===0) ? 'dimensionless quantity' : `quantity with units ${baseUnit(d)}`;
}
function baseUnit(d) { return d.map((n,i)=>n ? ['m','kg','s','A','deltaK'][i]+(n===1?'':`^${n}`):'').filter(Boolean).join('*'); }
function normalize(source) {
  if (typeof source !== 'string' || source.length > 512) fail('Use at most 512 characters per field.');
  if (source.includes(',')) fail('Use a decimal point, without commas or thousands separators.');
  return source.replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/²/g,'^2').replace(/³/g,'^3').trim();
}
function tokenize(source) {
  const tokens=[]; let i=0;
  while(i<source.length) {
    if (/\s/.test(source[i])) { i++; continue; }
    const rest=source.slice(i);
    const number=rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    const name=rest.match(/^[a-zA-Zµμ°_]+/);
    if(number) { tokens.push({type:'number',text:number[0]}); i+=number[0].length; }
    else if(name) { tokens.push({type:'unit',text:name[0]}); i+=name[0].length; }
    else if('+-*/^()'.includes(source[i])) tokens.push({type:source[i],text:source[i++]});
    else fail(`Unsupported character “${source[i]}”. Use numbers, units, and arithmetic operators.`);
    if(tokens.length>160) fail('Expression is too complex. Use at most 160 tokens.');
  }
  return tokens;
}
function quantity(value,dims=zero,absolute=false) { return {value:checked(value),dims:[...dims],absolute}; }
class Parser {
  constructor(tokens, unitOnly=false) { this.tokens=tokens; this.pos=0; this.depth=0; this.unitOnly=unitOnly; this.notes=new Set(); }
  peek(n=0) { return this.tokens[this.pos+n]; }
  take(type) { if(this.peek()?.type===type) return this.tokens[this.pos++]; }
  unit() {
    const token=this.take('unit');
    if(!token) fail('Expected a unit symbol.');
    if(Object.hasOwn(ambiguous,token.text)) fail(`“${token.text}” is ambiguous. ${ambiguous[token.text]}`);
    const symbol=Object.hasOwn(aliases,token.text)?aliases[token.text]:token.text;
    const unit=registry.get(symbol);
    if(!unit) fail(`Unknown unit “${token.text}”. Check the supported units and letter case.`);
    if(symbol==='rpm') this.notes.add('1 rpm = 2π/60 rad/s (one revolution is 2π radians).');
    if(unit.offset!==null) {
      const formula={'°C':'K = °C + 273.15','°F':'K = (°F − 32) × 5/9 + 273.15',K:'K is already the absolute SI temperature'}[symbol];
      this.notes.add(`${formula}. Absolute-temperature arithmetic is disabled.`);
    } else if(unit.factor!==1) {
      const display=format(unit.factor);
      this.notes.add(`1 ${symbol} ${display.rounded?'≈':'='} ${display.text} ${baseUnit(unit.dims)||'1'} (SI).`);
    }
    let exponent=1;
    if(this.take('^')) { exponent=this.exponent(); if(this.peek()?.type==='^') fail('Chained powers are ambiguous. Use parentheses.'); }
    if(unit.offset!==null && exponent!==1) fail('Absolute temperatures cannot be raised to powers. Use deltaC, deltaF, or deltaK.');
    return {...quantity(checked(unit.factor**exponent),unit.dims.map(n=>n*exponent),unit.offset!==null),offset:unit.offset,symbol};
  }
  exponent() {
    let sign=1;
    if(this.take('-')) sign=-1; else this.take('+');
    const token=this.take('number');
    if(!token || !/^\d+$/.test(token.text) || Number(token.text)>12) fail('Use an integer exponent from −12 to 12.');
    return sign*Number(token.text);
  }
  units() {
    let q=this.unit();
    while(['*','/'].includes(this.peek()?.type) && this.peek(1)?.type==='unit') {
      const op=this.tokens[this.pos++].type;
      q=this.combine(q,this.unit(),op);
    }
    return q;
  }
  combine(a,b,op) {
    if(a.absolute || b.absolute) fail('Absolute temperatures support direct conversions only. Use deltaC, deltaF, or deltaK for arithmetic.');
    if(op==='+' || op==='-') {
      if(!equal(a.dims,b.dims)) {
        const message=`${dimensionName(a.dims)} and ${dimensionName(b.dims)} cannot be ${op==='+'?'added':'subtracted'}.`;
        fail(message[0].toUpperCase()+message.slice(1));
      }
      return quantity(op==='+'?a.value+b.value:a.value-b.value,a.dims);
    }
    if(op==='/' && b.value===0) fail('Cannot divide by zero.');
    return quantity(scaled(a.value,b.value,op==='/'),a.dims.map((n,i)=>n+(op==='*'?1:-1)*b.dims[i]));
  }
  primary() {
    if(++this.depth>24) fail('Too many nested operations. Use at most 24 levels.');
    let q, unarySign=1;
    if(this.take('(')) { q=this.sum(); if(!this.take(')')) fail('Missing closing parenthesis.'); }
    else {
      let sign=1;
      if(this.take('-')) sign=-1; else this.take('+');
      unarySign=sign;
      if(this.peek()?.type==='(') { q=this.primary(); if(q.absolute) fail('Put the sign before the temperature value.'); /* Apply the unary sign after quantity powers. */ }
      else {
        const number=this.take('number');
        if(number) {
          const value=checked(Number(number.text));
          if(value===0 && /[1-9]/.test(number.text.split(/[eE]/)[0])) fail('Number is too small for browser numeric precision.');
          if(this.peek()?.type==='unit') {
            const unit=this.units();
            q=quantity((unit.absolute?sign:1)*scaled(value,unit.value)+(unit.absolute?unit.offset:0),unit.dims,unit.absolute);
            if(unit.absolute) unarySign=1;
            if(q.absolute) {
              const minimum={'°C':-273.15,'°F':-459.67,K:0}[unit.symbol];
              if(sign*value<minimum) fail('Temperature cannot be below absolute zero.');
              q.value=Math.max(0,q.value); // Remove offset roundoff at exactly absolute zero.
            }
          } else q=quantity(value);
        } else if(this.peek()?.type==='unit') { q=this.units(); if(q.absolute) fail('Put a numeric value before an absolute temperature.'); /* Unary sign is applied below. */ }
        else fail('Expected a number, quantity, or parenthesized expression.');
      }
    }
    // Unit powers bind to the unit; parenthesize to raise a whole quantity.
    if(this.take('^')) {
      if(q.absolute) fail('Absolute temperatures cannot be raised to powers. Use delta units.');
      const exp=this.exponent();
      if(q.value===0 && exp<=0) fail('Zero cannot be raised to a zero or negative power.');
      const powered=checked(q.value**exp);
      if(powered===0 && q.value!==0) fail('Result is too small for browser numeric precision.');
      q=quantity(powered,q.dims.map(n=>n*exp));
      if(this.peek()?.type==='^') fail('Chained powers are ambiguous. Use parentheses.');
    }
    q.value=checked(unarySign*q.value);
    this.depth--; return q;
  }
  product() { let q=this.primary(); while(['*','/'].includes(this.peek()?.type)) { const op=this.tokens[this.pos++].type; q=this.combine(q,this.primary(),op); } return q; }
  sum() { let q=this.product(); while(['+','-'].includes(this.peek()?.type)) { const op=this.tokens[this.pos++].type; q=this.combine(q,this.product(),op); } return q; }
  parse() {
    if(!this.tokens.length) fail(this.unitOnly?'Enter a target unit.':'Enter an expression to calculate.');
    const q=this.unitOnly?this.units():this.sum();
    if(this.peek()) fail(`Unexpected “${this.peek().text}”. Use explicit * between quantities; group denominators with parentheses.`);
    return q;
  }
}
function format(value) {
  checked(value); if(value===0) return {text:'0',rounded:false};
  const roundedValue=Number(value.toPrecision(10));
  let text=(Math.abs(value)>=1e10 || Math.abs(value)<1e-6)?value.toExponential(9).replace(/\.?0+e/,'e'):String(roundedValue);
  return {text,rounded:roundedValue!==value};
}
function calculate(expression, separateTarget='') {
  const normalized=normalize(expression), field=normalize(separateTarget);
  let tokens=tokenize(normalized), inline='';
  // 'in' is also inches; it is a separator only before another unit token.
  const separators=tokens.map((t,i)=>t.type==='unit' && ['in','to'].includes(t.text) && i>0 && tokens[i+1]?.type==='unit' && tokens[i+1].text!=='to' && (tokens[i+1].text!=='in' || tokens[i+2]?.type!=='unit')?i:-1).filter(i=>i>=0);
  if(separators.length>1) fail('Use only one output target.');
  if(separators.length) { const i=separators[0]; inline=tokens.slice(i+1).map(t=>t.text).join(' '); tokens=tokens.slice(0,i); }
  if(inline && field) fail('Two output targets were supplied. Clear “Convert result to” or remove the inline target.');
  const parser=new Parser(tokens); const q=parser.parse();
  const target=inline||field;
  let value=q.value,unit=baseUnit(q.dims);
  const notes=[...parser.notes];
  if(target) {
    const targetParser=new Parser(tokenize(target),true); const out=targetParser.parse();
    if(!equal(q.dims,out.dims)) fail(`Cannot convert ${dimensionName(q.dims)} to ${dimensionName(out.dims)}. Choose compatible units.`);
    if(q.absolute!==out.absolute) fail('Absolute temperatures and temperature differences are different. Use °C/°F/K for absolute values or deltaC/deltaF/deltaK for differences.');
    value=scaled(q.value-(out.absolute?out.offset:0),out.value,true);
    unit=target.replace(/\s+/g,''); notes.push(...targetParser.notes);
  } else if(q.absolute) { unit='K'; }
  const display=format(value);
  const text=`${display.rounded?'≈ ':''}${display.text}${unit?' '+unit:''}`;
  const normalizedExpression=tokens.map(t=>t.text).join(' ');
  return { value, unit, text, rounded:display.rounded, normalizedExpression,
    explanation:[`Parsed expression: ${normalizedExpression}.`,...new Set(notes),`Evaluated in SI units${format(q.value).rounded?' (rounded display)':''}: ${format(q.value).text} ${q.absolute?'K':baseUnit(q.dims)||'(dimensionless)'}.`,`${normalizedExpression} ${display.rounded?'≈':'='} ${display.text}${unit?' '+unit:''}.`,'Display uses up to 10 significant digits; ≈ indicates display rounding, not measurement accuracy.'] };
}
const api={calculate,format,units:[...registry.keys()],aliases};
if(typeof module!=='undefined') module.exports=api; else root.ConvertLabCalculator=api;
})(globalThis);
