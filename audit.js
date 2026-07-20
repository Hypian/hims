// Quick audit script — run with: node audit.js
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');

// Extract all id="..." from HTML
const htmlIds = new Set();
const idRegex = /id="([^"]+)"/g;
let m;
while ((m = idRegex.exec(html)) !== null) htmlIds.add(m[1]);

// Extract all getElementById("...") from JS
const jsIds = new Set();
const jsIdRegex = /getElementById\("([^"]+)"\)/g;
while ((m = jsIdRegex.exec(js)) !== null) jsIds.add(m[1]);

console.log('=== IDs referenced in JS but MISSING from HTML ===');
let missingCount = 0;
for (const id of jsIds) {
  if (!htmlIds.has(id)) {
    console.log('  MISSING:', id);
    missingCount++;
  }
}
if (missingCount === 0) console.log('  ✅ None — all JS references have matching HTML elements');

console.log('\n=== Checking all onclick handlers in JS innerHTML have matching functions ===');
const onclickRegex = /onclick="([a-zA-Z_]+)\(/g;
const allOnclicks = new Set();
while ((m = onclickRegex.exec(js)) !== null) allOnclicks.add(m[1]);
while ((m = onclickRegex.exec(html)) !== null) allOnclicks.add(m[1]);

const funcRegex = /^function\s+([a-zA-Z_]+)\s*\(/gm;
const definedFuncs = new Set();
while ((m = funcRegex.exec(js)) !== null) definedFuncs.add(m[1]);

let missingFuncs = 0;
for (const fn of allOnclicks) {
  if (!definedFuncs.has(fn)) {
    console.log('  MISSING FUNCTION:', fn);
    missingFuncs++;
  }
}
if (missingFuncs === 0) console.log('  ✅ All onclick handlers have matching function definitions');

console.log('\n=== Checking all onsubmit handlers ===');
const onsubmitRegex = /onsubmit="return\s+([a-zA-Z_]+)\(/g;
const allSubmits = new Set();
const combined = html + js;
while ((m = onsubmitRegex.exec(combined)) !== null) allSubmits.add(m[1]);
let missingSubmits = 0;
for (const fn of allSubmits) {
  if (!definedFuncs.has(fn)) {
    console.log('  MISSING FUNCTION:', fn);
    missingSubmits++;
  }
}
if (missingSubmits === 0) console.log('  ✅ All onsubmit handlers have matching function definitions');

console.log('\n=== Summary ===');
console.log(`HTML element IDs: ${htmlIds.size}`);
console.log(`JS getElementById refs: ${jsIds.size}`);
console.log(`onclick handlers: ${allOnclicks.size}`);
console.log(`onsubmit handlers: ${allSubmits.size}`);
console.log(`Defined functions: ${definedFuncs.size}`);
console.log(`Missing IDs: ${missingCount}`);
console.log(`Missing onclick functions: ${missingFuncs}`);
console.log(`Missing onsubmit functions: ${missingSubmits}`);
