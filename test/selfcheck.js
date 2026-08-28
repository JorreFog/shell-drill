// Regression check: every task's own canonical answer (s) must be accepted by its own patterns (p).
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const start = src.indexOf('const MODULES = [');
const end = src.indexOf('/* ---------- cheatsheet shown in the drawer ---------- */');
const MODULES = new Function(src.slice(start, end) + '; return MODULES;')();

const rx = p => new RegExp("^(?:sudo\\s+)?(?:" + p.replace(/ \?/g, "\\s*").replace(/ /g, "\\s+") + ")$");

let n = 0, bad = 0;
for (const m of MODULES) {
  for (const t of (m.tasks || [])) {
    const variants = t.v ? Object.entries(t.v) : [[null, t]];
    for (const [pm, def] of variants) {
      n++;
      if (!def.p.some(p => rx(p).test(def.s))) {
        bad++;
        console.log('MISMATCH [' + m.id + (pm ? '/' + pm : '') + '] answer: ' + def.s);
        console.log('         patterns: ' + JSON.stringify(def.p));
      }
    }
  }
}
console.log(bad ? bad + ' of ' + n + ' canonical answers no longer match their patterns'
                : 'all ' + n + ' canonical answers still accepted by their own patterns');

// quiz sanity: every question must have at least one correct option, and at least one wrong one
const qs = src.indexOf('const QUIZ = [');
const qe = src.indexOf('/* ---------- quiz state & rendering ---------- */');
const QUIZ = new Function(src.slice(qs, qe) + '; return QUIZ;')();
let qn = 0, qbad = 0;
for (const tier of QUIZ) for (const it of tier.items) {
  qn++;
  const right = it.o.filter(o => o.c).length;
  if (right === 0 || right === it.o.length) { qbad++; console.log('QUIZ ISSUE: ' + it.q + ' (' + right + '/' + it.o.length + ' correct)'); }
}
console.log(qbad ? qbad + ' quiz issues' : 'all ' + qn + ' quiz questions have a valid mix of correct/incorrect options');
process.exitCode = (bad || qbad) ? 1 : 0;
