/* Static audit: things that can be checked without a browser. */
const fs = require('fs'), path = require('path');
const base = path.join(__dirname, '..') + path.sep;
const html = fs.readFileSync(base + 'index.html', 'utf8');
const srcFiles = fs.readdirSync(base + 'src').filter(f => f.endsWith('.js'));
const findings = [];
const flag = (sev, area, msg) => findings.push({sev, area, msg});

/* 1. duplicate top-level declarations across the concatenated engine */
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const decls = {};
for(const m of script.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)){
  decls[m[1]] = (decls[m[1]] || 0) + 1;
}
Object.entries(decls).filter(([,n]) => n > 1)
  .forEach(([name,n]) => flag('high', 'js', 'declared ' + n + ' times at top level: ' + name));

/* 2. translation keys referenced but not defined, and vice versa */
const tKeys = new Set();
const i18n = fs.readFileSync(base + 'src/vm-i18n.js', 'utf8');
const tBlock = i18n.slice(i18n.indexOf('const T = {'), i18n.indexOf('\nconst t = key'));
for(const m of tBlock.matchAll(/^\s{2}([A-Za-z][\w]*)\s*:/gm)) tKeys.add(m[1]);
const used = new Set();
for(const m of script.matchAll(/\bt\(["']([A-Za-z][\w]*)["']\)/g)) used.add(m[1]);
[...used].filter(k => !tKeys.has(k)).forEach(k => flag('high', 'i18n', 't("' + k + '") has no entry in T'));
const unused = [...tKeys].filter(k => !used.has(k));
if(unused.length) flag('low', 'i18n', unused.length + ' T entries not seen by static analysis ' +
  '(most are reached dynamically, e.g. t(a.k) over the advice table) — verify in the browser');

/* 3. every T entry has both languages and neither is empty by accident */
const T = new Function(tBlock + '; return T;')();
for(const k in T){
  const v = T[k];
  if(typeof v !== 'object') { flag('high','i18n','T.'+k+' is not a {sv,en} pair'); continue; }
  if(v.sv == null) flag('high','i18n','T.'+k+' missing sv');
  if(v.en == null) flag('high','i18n','T.'+k+' missing en');
  if(v.sv === v.en && k !== 'brandA' && v.sv && v.sv.length > 12)
    flag('low','i18n','T.'+k+' is identical in both languages');
}

/* 4. placeholders left unresolved */
for(const k in T){
  ['sv','en'].forEach(l => {
    const s = T[k][l] || '';
    const ph = s.match(/\{[a-z]+\}/g);
    if(ph && !/^advice|^rep/.test(k)) flag('med','i18n','T.'+k+'.'+l+' has a placeholder but is not an advice/report string: '+ph);
  });
}

/* 4b. t() called inside a scope where a callback parameter shadows it. This has
   bitten three times now (renderQuiz, quizStep, renderCourse): the parameter is
   the loop item, so t("key") calls that item and throws at render time. */
for(const f of srcFiles){
  const text = fs.readFileSync(base + 'src/' + f, 'utf8');
  const lines = text.split(/\r?\n/);
  let shadowLine = -1, depth = 0;
  lines.forEach((ln, i) => {
    if(shadowLine < 0 && /(?:function\s*)?\(\s*t\s*(?:,[^)]*)?\)\s*=>|function\s*\(\s*t\s*[,)]/.test(ln)){
      shadowLine = i; depth = 0;
    }
    if(shadowLine >= 0){
      depth += (ln.match(/\{/g) || []).length - (ln.match(/\}/g) || []).length;
      if(/\bt\(\s*["']/.test(ln) && i > shadowLine)
        flag('high', 'js', f + ':' + (i+1) + ' calls t("...") inside a callback whose parameter t shadows it (opened line ' + (shadowLine+1) + ')');
      if(depth <= 0 && i > shadowLine) shadowLine = -1;
    }
  });
}

/* 5. ids referenced in JS that never appear in generated or static markup */
const ids = new Set();
for(const m of html.matchAll(/id="([^"]+)"/g)) ids.add(m[1]);
for(const m of script.matchAll(/id=\\?"([a-z][\w-]*)\\?"/g)) ids.add(m[1]);
for(const m of script.matchAll(/\bid\s*=\s*"([a-z][\w-]*)"/g)) ids.add(m[1]);
const referenced = new Set();
for(const m of script.matchAll(/\$\("([a-z][\w-]*)"\)/g)) referenced.add(m[1]);
[...referenced].filter(i => !ids.has(i)).forEach(i => flag('med','dom','$("'+i+'") — id never created'));

/* 6. leftover debugging or placeholder text */
['console.log(', 'TODO', 'FIXME', 'XXX', 'lorem'].forEach(needle => {
  const n = (script.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'g')) || []).length;
  if(n) flag('med', 'hygiene', needle + ' appears ' + n + ' time(s) in the shipped script');
});

/* 7. source files present in the build */
const buildJs = fs.readFileSync(base + 'src/build.js', 'utf8');
srcFiles.filter(f => f !== 'build.js').forEach(f => {
  /* pv-*.js are picked up by a readdir glob for preview.html rather than named
     one by one, so their absence from the vm-* list is the design, not a gap */
  if(/^pv-.*\.js$/.test(f)){
    if(!/pv-.*\\\.js|\^pv-/.test(buildJs))
      flag('high','build', 'preview files exist but build.js has no pv-*.js rule');
    return;
  }
  if(!buildJs.includes("read('" + f + "')")) flag('high','build', f + ' is in src/ but not spliced by build.js');
});

/* 8. the generated block is present exactly once and the file is self-contained */
['BEGIN simulated machine','END simulated machine','---------- course lab ----------']
  .forEach(mark => { const n = html.split(mark).length - 1;
    if(n !== 1) flag('high','build','marker "'+mark+'" appears '+n+' times'); });
const ext = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
ext.filter(u => !/fonts\.(googleapis|gstatic)\.com/.test(u))
   .forEach(u => flag('high','offline','external resource beyond Google Fonts: ' + u));

/* 9. course/quiz data integrity */
const load = f => fs.readFileSync(base + 'src/' + f, 'utf8');
eval(load('vm-core.js') + load('vm-cmds.js') + load('vm-seed.js') + load('vm-python.js') + load('vm-labs.js'));
const COURSE = buildCourse();
const qz = load('vm-quizzes.js');
const COURSE_QUIZZES = new Function(qz + '; return COURSE_QUIZZES;')();
const courses = load('vm-courses.js');
const PROGRAMME = new Function(courses.slice(courses.indexOf('const PROGRAMME'), courses.indexOf('const allEntries')) + '; return PROGRAMME;')();

PROGRAMME.courses.concat(PROGRAMME.tools).forEach(c => {
  if(c.ready && !c.modes) flag('high','courses', c.id + ' is ready but declares no modes');
  if(c.provisional && !COURSE_QUIZZES[c.id]) flag('high','courses', c.id + ' is provisional but has no quiz');
  if(c.modes && c.modes.includes('quiz') && c.id !== 'tool-quiz' && c.id !== 'grund-it' && !COURSE_QUIZZES[c.id])
    flag('high','courses', c.id + ' offers a quiz tab with no quiz set');
  if(!c.blurb || !c.blurb.sv || !c.blurb.en) flag('med','courses', c.id + ' blurb is not bilingual');
});
for(const id in COURSE_QUIZZES){
  if(!PROGRAMME.courses.some(c => c.id === id)) flag('med','quizzes','quiz set for unknown course: ' + id);
  COURSE_QUIZZES[id].forEach((tier, i) => {
    if(!tier.tier || !tier.tier.sv || !tier.tier.en) flag('med','quizzes', id + ' tier ' + i + ' title not bilingual');
    tier.items.forEach((it, j) => {
      const where = id + ' ' + i + ':' + j;
      if(!it.q || !it.q.sv || !it.q.en) flag('high','quizzes', where + ' question not bilingual');
      if(!it.e || !it.e.sv || !it.e.en) flag('high','quizzes', where + ' explanation not bilingual');
      const right = it.o.filter(o => o.c).length;
      if(right === 0) flag('high','quizzes', where + ' has no correct option');
      if(right === it.o.length) flag('high','quizzes', where + ' has every option correct');
      it.o.forEach((o,k) => { if(!o.t || !o.t.sv || !o.t.en)
        flag('high','quizzes', where + ' option ' + k + ' not bilingual'); });
    });
  });
}

const order = {high:0, med:1, low:2};
findings.sort((a,b) => order[a.sev] - order[b.sev] || a.area.localeCompare(b.area));
console.log('AUDIT 1 — static\n');
if(!findings.length) console.log('  nothing found');
findings.forEach(f => console.log('  [' + f.sev.toUpperCase().padEnd(4) + '] ' + f.area.padEnd(9) + ' ' + f.msg));
console.log('\n  ' + findings.length + ' finding(s): ' +
  ['high','med','low'].map(s => findings.filter(f=>f.sev===s).length + ' ' + s).join(', '));
