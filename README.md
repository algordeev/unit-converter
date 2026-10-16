# ConvertLab

A buildless, browser-local engineering unit converter and deterministic unit calculator. Open `index.html` directly, or serve this directory with a static HTTP server. No production packages, network calculation services, or build step are required. Google Fonts are optional; system sans-serif fallbacks work offline. Clipboard access depends on browser permissions/secure context; the UI selects the result for manual copying when unavailable.

## Development

Node 24+ is required only for tests. Run `npm ci`, `npm test`, and `npm run check`. jsdom is a pinned development-only dependency. The original repository had no test runner or dependencies.

- `units.js`: shared original converter categories and SI scale factors.
- `app.js`: original converter UI.
- `calculator.js`: pure restricted tokenizer/parser, dimensional arithmetic, number formatting and explanation data; also importable from Node.
- `calculator-ui.js`: mode switching, form state, examples, accessibility and copying.
- `tests/`: calculator and real-page DOM interaction/regression tests.

A small purpose-built parser keeps this bounded grammar auditable and avoids adding a general math expression runtime or a large production bundle. Unit factors already present in the converter are reused. Input is never executed as JavaScript. UI text is inserted with `textContent`.

## Supported expressions

```
24 V * 2 A in W                 → 48 W
12 N*m * 1500 rpm in kW         → ≈ 1.884955592 kW
100 km / 2 h in km/h            → 50 km/h
5 ft + 20 cm in m               → 1.724 m
(12 V * 2 A) * 3 h in Wh        → 72 Wh
10 cm * 20 cm in cm²           → 200 cm^2
10 m / 2 m                     → 5
```

Both `in` and `to` introduce an optional final target. Alternatively, enter a unit in **Convert result to**. Providing both is always an error, even when identical; clear one. Example chips intentionally clear the target field because their expressions contain targets. Editing either input clears the previous result, error and explanation. Calculate with the button or Enter (Shift+Enter inserts a newline).

Precedence, highest first:

1. Parentheses and integer unit powers, e.g. `m^2`, `m²`, `m³`, `s^-2`.
2. An attached unit product: `12 kg*m/s²` is one quantity. Consecutive unit-only factors bind together. This also makes `10 m / 2 m` mean `(10 m) / (2 m)`.
3. Powers of a whole quantity, e.g. `(2 m)^2`. `2 m²` means two square meters, not four. Chained powers must be parenthesized.
4. Unary signs: `-2^2 = -4`; `(-2)^2 = 4`. A sign immediately before an absolute-temperature number is part of that temperature literal.
5. Multiplication and division, left to right.
6. Addition and subtraction, left to right.

Use explicit `*` / `×` and `/` / `÷`; `·` is also multiplication. Group multi-quantity denominators: `10 m / (2 s * 3 s)`. Powers must be integers between −12 and 12. Numbers accept signs, a decimal point and scientific notation, e.g. `-1.25e3`. Commas and thousands separators are rejected. Arbitrary functions, variables, implicit multiplication between quantities, target parentheses and target numeric scale factors are unsupported. The exact case-sensitive symbols and deliberately limited aliases are listed in the page's expandable syntax help and exported by `calculator.js`.

## Physical behavior and display

- SI dimension vectors track length, mass, time, electric current and temperature differences. Addition/subtraction and target conversions require compatible dimensions. Outputs default to a product of SI base units, without guessing torque versus energy or another physical interpretation. Explicit output unit names are preserved after safe Unicode normalization.
- Angles use the SI dimensionless radian convention. `rpm` has scale `2π/60` relative to `rad/s`; the explanation explicitly shows this. No interpretation as cyclic frequency is inferred.
- `°C`, `°F`, and `K` are absolute-temperature literals, supporting direct conversions only. Any arithmetic involving them is rejected. Use `deltaC`, `deltaF`, `deltaK` for differences. Values below absolute zero are rejected.
- `gal`/`gallon(s)` and `ton(s)` are ambiguous and rejected. Use `gal_US`, `gal_imp`, `tonne`/`t`, `ton_short`, or `ton_long`. `cal`/`kcal` are thermochemical and `BTU` uses the international-table definition. Pressure conversions apply only scale factors; no gauge/absolute atmospheric offset is inferred. Gauge symbols such as `psig` and `barg` are rejected.
- Calculations use JavaScript's IEEE-754 double precision. Only the displayed value is rounded to at most 10 significant digits. `≈` appears when that changes the represented result. This does not imply measurement accuracy or propagate significant figures. Scientific notation is used for nonzero magnitudes below `1e-6` or at least `1e10`. Negative zero displays as zero. Non-finite results and detectable underflow are rejected.
- Complexity is limited to 512 characters per input field, 160 tokens per expression/target, 24 nesting levels and exponent magnitude 12.
- Explanations are a faithful fallback for arbitrary supported expressions: the normalized parsed expression, actual unit scale/offset notes, SI evaluation, and final target result. They do not invent a physical interpretation or claim an exact symbolic derivation. Display rounding is noted.

## Verification

`npm test` includes every example, mixed arithmetic, precedence, Unicode, prefixes, cancellation, rpm, temperature restrictions, ambiguity and malformed input, limits, formatting, DOM mode switching, Enter submission, all example chips, target conflicts and changes, stale-result clearing, clipboard success/fallback/races, error recovery and long input/results. Original converter regression coverage checks all 239 source/target pairs plus swapping, keyboard category navigation and copying.

Desktop/mobile browser visual QA could not be performed in this session: the computer-use tool reported no connected browsers. DOM tests do not verify layout. CSS provides a single-column mobile action area, wrapping example chips, breakable long results, keyboard focus outlines and the existing reduced-motion rule. Visually verify at 1280px and 390px when a browser is available.
