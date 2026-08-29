/* A deeper static pass than test/audit.js: that one guards the things that have
   broken before, this one goes looking. It reads the built page and every source
   file and reports anything that looks like a defect waiting to happen.

   Run: node test/deepaudit.js
   Exit code is 1 only for high-severity findings, so it can gate a commit. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const srcDir = path.join(root, 'src');
const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.js') && f !== 'build.js');
const sources = Object.fromEntries(srcFiles.map(f => [f, fs.readFileSync(path.join(srcDir, f), 'utf8')]));

const findings = [];
const flag = (sev, area, msg) => findings.push({sev, area, msg});

/* ---------- 1. every declared function is reachable ---------- */
{
  const declared = new Map();       // name -> file
  for(const [f, text] of Object.entries(sources))
    for(const m of text.matchAll(/^function\s+([A-Za-z_$][\w$]*)/gm))
      declared.set(m[1], f);

  for(const [name, file] of declared){
    /* count uses outside the declaration itself */
    const uses = (script.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length;
    if(uses <= 1) flag('med', 'dead code', name + '() in ' + file + ' is declared and never called');
  }
}

/* ---------- 2. (removed) ----------
   There was a check here for identifiers called but never declared. A regex
   cannot do scope analysis: it matched text inside string literals and every
   nested function, and reported about ninety false positives against zero real
   ones. Undefined identifiers are caught by the runtime console sweep instead,
   which actually executes the code. A check that cries wolf is worse than no
   check, because it trains you to skim past the output. */

/* ---------- 3. every user-visible string is bilingual ---------- */
{
  const i18n = sources['vm-i18n.js'];
  const tBlock = i18n.slice(i18n.indexOf('const T = {'), i18n.indexOf('\nconst t = key'));
  const modes = sources['vm-modes.js'];
  const aBlock = modes.slice(modes.indexOf('Object.assign(T, {') + 'Object.assign(T, '.length,
                            modes.indexOf('});') + 1);
  const T = Object.assign(
    new Function(tBlock + '; return T;')(),
    new Function('return ' + aBlock + ';')());

  for(const k in T){
    const v = T[k];
    if(typeof v !== 'object' || v === null){ flag('high','i18n', 'T.'+k+' is not a {sv,en} pair'); continue; }
    if(!('sv' in v)) flag('high','i18n','T.'+k+' has no sv');
    if(!('en' in v)) flag('high','i18n','T.'+k+' has no en');
    if(v.sv === '') flag('high','i18n','T.'+k+'.sv is empty');
    if(v.en === '') flag('high','i18n','T.'+k+'.en is empty');
    /* a Swedish string with no Swedish characters and identical to English is
       usually a forgotten translation rather than a deliberate passthrough */
    if(v.sv === v.en && v.sv && v.sv.length > 14 && !/^[A-Z0-9 +/·—-]+$/.test(v.sv))
      flag('low','i18n','T.'+k+' is the same in both languages: "'+String(v.sv).slice(0,44)+'"');
  }

  /* placeholders must be filled by something */
  for(const k in T) ['sv','en'].forEach(l => {
    const s = String(T[k][l] || '');
    const ph = s.match(/\{[a-z]+\}/g) || [];
    ph.forEach(p => {
      const token = p.slice(1, -1);
      const filled = new RegExp('split\\("\\{' + token + '\\}"\\)|replace\\("\\{' + token + '\\}"').test(script);
      if(!filled) flag('med','i18n','T.'+k+'.'+l+' has '+p+' and nothing in the script fills it');
    });
  });
}

/* ---------- 4. course and quiz data integrity ---------- */
{
  const load = f => sources[f];
  eval(load('vm-core.js') + load('vm-cmds.js') + load('vm-seed.js') + load('vm-python.js') + load('vm-labs.js'));
  const COURSE = buildCourse();
  const COURSE_QUIZZES = new Function(load('vm-quizzes.js') + '; return COURSE_QUIZZES;')();
  const courses = load('vm-courses.js');
  const PROGRAMME = new Function(courses.slice(courses.indexOf('const PROGRAMME'),
                                               courses.indexOf('const allEntries')) + '; return PROGRAMME;')();

  /* lectures */
  COURSE.forEach((lec, i) => {
    if(!lec.tasks || !lec.tasks.length) flag('high','course','lecture '+i+' has no tasks');
    if(!lec.check || !lec.check.length) flag('med','course','lecture '+i+' has no check-yourself questions');
    if(!lec.title) flag('high','course','lecture '+i+' has no title');
    lec.tasks.forEach((t, j) => {
      if(!t.q) flag('high','course','lecture '+i+' task '+j+' has no question');
      if(!t.hint) flag('med','course','lecture '+i+' task '+j+' has no hint');
      if(typeof t.check !== 'function') flag('high','course','lecture '+i+' task '+j+' has no check()');
    });
  });
  /* LAB_ANSWERS is an object keyed "lecture:task" with the lecture 1-based, not
     an array indexed by lecture */
  if(typeof LAB_ANSWERS !== 'undefined')
    COURSE.forEach((lec, i) => lec.tasks.forEach((t, j) => {
      if(!LAB_ANSWERS[(i + 1) + ':' + j])
        flag('high','course','no answer for lecture ' + (i+1) + ' task ' + j);
    }));

  /* quizzes */
  let qTotal = 0;
  for(const id in COURSE_QUIZZES){
    COURSE_QUIZZES[id].forEach((tier, i) => tier.items.forEach((it, j) => {
      qTotal++;
      const where = id + ' ' + i + ':' + j;
      const right = it.o.filter(o => o.c).length;
      if(right === 0) flag('high','quiz', where + ' has no correct option');
      if(right === it.o.length) flag('high','quiz', where + ' has every option correct');
      if(it.o.length < 3) flag('med','quiz', where + ' has only ' + it.o.length + ' options');
      /* duplicate option text inside one question */
      const texts = it.o.map(o => JSON.stringify(o.t));
      if(new Set(texts).size !== texts.length) flag('high','quiz', where + ' repeats an option');
    }));
  }

  /* duplicate questions across the whole site */
  const seen = new Map();
  for(const id in COURSE_QUIZZES)
    COURSE_QUIZZES[id].forEach((tier,i) => tier.items.forEach((it,j) => {
      const key = JSON.stringify(it.q);
      if(seen.has(key)) flag('med','quiz','question repeated: '+seen.get(key)+' and '+id+' '+i+':'+j);
      else seen.set(key, id + ' ' + i + ':' + j);
    }));

  /* programme wiring */
  PROGRAMME.courses.concat(PROGRAMME.tools).forEach(c => {
    if(!c.id) flag('high','programme','an entry has no id');
    if(!c.title) flag('high','programme', c.id + ' has no title');
    if(c.ready && (!c.modes || !c.modes.length)) flag('high','programme', c.id + ' is ready with no modes');
    if(c.modes && c.entry && !c.modes.includes(c.entry))
      flag('high','programme', c.id + ' entry "' + c.entry + '" is not among its modes');
    if(c.provisional && !COURSE_QUIZZES[c.id])
      flag('high','programme', c.id + ' is provisional but has no quiz');
  });
  const ids = PROGRAMME.courses.concat(PROGRAMME.tools).map(c => c.id);
  if(new Set(ids).size !== ids.length) flag('high','programme','duplicate entry id');
}

/* ---------- 5. markup and accessibility ---------- */
{
  /* inputs need a label or an aria-label */
  for(const m of html.matchAll(/<input\b[^>]*>/g)){
    const tag = m[0];
    if(/type="(hidden|file)"/.test(tag)) continue;
    const id = (tag.match(/id="([^"]+)"/) || [])[1];
    const labelled = /aria-label=/.test(tag) ||
      (id && new RegExp('<label[^>]*for="' + id + '"').test(html));
    if(!labelled) flag('med','a11y','input without a label or aria-label: ' + tag.slice(0, 70));
  }
  /* buttons built in JS should carry text, not only an icon */
  for(const m of script.matchAll(/<button[^>]*>(\s*)<\/button>/g))
    flag('med','a11y','a button is generated with no text content');
  /* Only the static markup. Two branches of one render function may reuse an id
     and never co-exist in the DOM, so scanning the script reports those as
     clashes when they are not. Real runtime duplicates are caught in the
     browser sweep, which inspects the live document. */
  const staticHtml = html.replace(/<script>[\s\S]*?<\/script>/g, '');
  const ids = [...staticHtml.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const dupes = ids.filter((v,i) => ids.indexOf(v) !== i);
  [...new Set(dupes)].forEach(d => flag('high','dom','id "'+d+'" appears twice in the markup'));
  /* the page needs a language and a viewport */
  if(!/<html[^>]*lang=/.test(html)) flag('med','a11y','<html> has no lang attribute');
  if(!/name="viewport"/.test(html)) flag('high','a11y','no viewport meta');
  if(!/<title>/.test(html)) flag('high','a11y','no title');
}

/* ---------- 6. hygiene ---------- */
{
  /* 'debugger' as a bare word appears in prose and in the drill's own debug
     command, so match the statement rather than the string */
  const debuggerStatements = (script.match(/(?:^|[;{}\s])debugger\s*;/g) || []).length;
  if(debuggerStatements) flag('high','hygiene', debuggerStatements + ' debugger statement(s) shipped');
  ['console.log(', 'TODO', 'FIXME', 'XXX'].forEach(needle => {
    const n = (script.split(needle).length - 1);
    if(n) flag('med','hygiene', needle + ' appears ' + n + ' time(s) in the shipped script');
  });
  /* every external reference must be a font, or the page is not offline-capable */
  [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1])
    .filter(u => !/fonts\.(googleapis|gstatic)\.com/.test(u))
    .forEach(u => flag('high','offline','external resource: ' + u));
  /* innerHTML built from data that is not escaped is how a stray < breaks a page */
  const risky = (script.match(/innerHTML\s*=\s*[^;]*\+\s*(?:L\(|[a-z]\w*\.(?:q|title|name))/g) || []);
  risky.forEach(r => flag('low','safety','innerHTML built from data without esc(): ' + r.slice(0, 60)));
}

/* ---------- 7. the build is reproducible ---------- */
{
  const build = fs.readFileSync(path.join(srcDir, 'build.js'), 'utf8');
  srcFiles.forEach(f => {
    if(/^pv-/.test(f)) return;
    if(!build.includes("read('" + f + "')"))
      flag('high','build', f + ' is in src/ but build.js never reads it');
  });
  ['BEGIN simulated machine','END simulated machine',
   '---------- course lab ----------','---------- end course lab ----------']
    .forEach(mark => {
      const n = html.split(mark).length - 1;
      if(n !== 1) flag('high','build','marker "'+mark+'" appears '+n+' times, expected once');
    });
}

/* ---------- report ---------- */
const order = {high:0, med:1, low:2};
findings.sort((a,b) => order[a.sev]-order[b.sev] || a.area.localeCompare(b.area) || a.msg.localeCompare(b.msg));
console.log('DEEP AUDIT\n');
if(!findings.length) console.log('  nothing found');
findings.forEach(f => console.log('  [' + f.sev.toUpperCase().padEnd(4) + '] ' + f.area.padEnd(10) + ' ' + f.msg));
const counts = ['high','med','low'].map(s => findings.filter(f => f.sev===s).length);
console.log('\n  ' + findings.length + ' finding(s): ' +
  counts[0] + ' high, ' + counts[1] + ' med, ' + counts[2] + ' low');
process.exit(counts[0] ? 1 : 0);
