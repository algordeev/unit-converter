/* Shared converter definitions: SI factors, no UI dependencies. */
(function (root) {
'use strict';
const categories = {
  length: { units: [['m', 'Meter', 'meters', 1], ['cm', 'Centimeter', 'centimeters', 0.01], ['mm', 'Millimeter', 'millimeters', 0.001], ['km', 'Kilometer', 'kilometers', 1000], ['in', 'Inch', 'inches', 0.0254], ['ft', 'Foot', 'feet', 0.3048], ['yd', 'Yard', 'yards', 0.9144], ['mi', 'Mile', 'miles', 1609.344], ['µm', 'Micrometer', 'micrometers', 1e-6]], defaults: ['m', 'cm'] },
  mass: { units: [['kg', 'Kilogram', 'kilograms', 1], ['g', 'Gram', 'grams', 0.001], ['mg', 'Milligram', 'milligrams', 1e-6], ['t', 'Metric tonne', 'metric tonnes', 1000], ['lb', 'Pound', 'pounds', 0.45359237], ['oz', 'Ounce', 'ounces', 0.028349523125]], defaults: ['kg', 'lb'] },
  pressure: { units: [['Pa', 'Pascal', 'pascals', 1], ['kPa', 'Kilopascal', 'kilopascals', 1000], ['MPa', 'Megapascal', 'megapascals', 1e6], ['bar', 'Bar', 'bar', 1e5], ['psi', 'Pound per square inch', 'pounds per square inch', 6894.757293168], ['atm', 'Standard atmosphere', 'standard atmospheres', 101325], ['Torr', 'Torr', 'torr', 101325 / 760]], defaults: ['bar', 'Pa'] },
  energy: { units: [['J', 'Joule', 'joules', 1], ['kJ', 'Kilojoule', 'kilojoules', 1000], ['MJ', 'Megajoule', 'megajoules', 1e6], ['Wh', 'Watt-hour', 'watt-hours', 3600], ['kWh', 'Kilowatt-hour', 'kilowatt-hours', 3.6e6], ['cal', 'Calorie (thermochemical)', 'calories (thermochemical)', 4.184], ['kcal', 'Kilocalorie (thermochemical)', 'kilocalories (thermochemical)', 4184], ['BTU', 'BTU (IT)', 'BTU (IT)', 1055.05585262]], defaults: ['kWh', 'J'] },
  temperature: { units: [['°C', 'Celsius', 'degrees Celsius'], ['°F', 'Fahrenheit', 'degrees Fahrenheit'], ['K', 'Kelvin', 'kelvin']], defaults: ['°C', '°F'] }
};

const api = { categories };
if (typeof module !== 'undefined') module.exports = api;
else root.ConvertLabUnits = api;
})(globalThis);
