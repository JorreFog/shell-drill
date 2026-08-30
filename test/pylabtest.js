/* Every Python exercise must be solvable by its own worked answer, and must not
   already pass on the starter code. Same contract as test/solutions.js: the
   answer shown to a stuck student is the one this suite proves works. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'src'), load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('vm-core.js') + load('vm-cmds.js') + load('vm-seed.js') + load('vm-python.js'));
eval(load('vm-pylab.js'));

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if(cond) pass++;
  else { fail++; console.log('FAIL ' + name + (extra ? '\n      ' + String(extra).replace(/\n/g,'\n      ') : '')); }
};

/* run a program the way the tool does: write it to the machine and execute it */
function run(code){
  const K = attachPython(seedVM(attachShell(makeVM())));
  K.vm.put('/home/analyst/main.py', code, 0o644, 'analyst', 'analyst');
  const r = K.run('python3 /home/analyst/main.py');
  return ((r.out || '') + (r.err || ''));
}

let n = 0;
PYLAB.forEach(ch => {
  ok('chapter ' + ch.id + ' has a title in both languages', !!(ch.title.sv && ch.title.en));
  ok('chapter ' + ch.id + ' teaches something in both languages', !!(ch.teach.sv && ch.teach.en));
  ok('chapter ' + ch.id + ' has exercises', ch.ex.length > 0);

  ch.ex.forEach((e, i) => {
    const where = ch.id + ' #' + (i + 1);
    n++;
    ok(where + ' has a task in both languages', !!(e.task.sv && e.task.en));
    ok(where + ' has a hint in both languages', !!(e.hint.sv && e.hint.en));
    ok(where + ' has a worked answer', typeof e.answer === 'string' && e.answer.length > 0);

    /* the answer runs without an interpreter error */
    const out = run(e.answer);
    ok(where + ' answer runs cleanly', !/Traceback|SyntaxError/.test(out), out.slice(0, 200));

    /* and satisfies its own check */
    let satisfied = false;
    try{ satisfied = !!e.check(out, e.answer); }catch(err){ satisfied = false; }
    ok(where + ' answer satisfies its own check', satisfied, 'printed: ' + JSON.stringify(out.slice(0,120)));

    /* the starter must not already pass, or the exercise teaches nothing */
    const startOut = run(e.start || '');
    let early = false;
    try{ early = !!e.check(startOut, e.start || ''); }catch(err){ early = false; }
    ok(where + ' starter does not already pass', !early);

    /* and neither does an empty program */
    let empty = false;
    try{ empty = !!e.check('', ''); }catch(err){ empty = false; }
    ok(where + ' an empty program does not pass', !empty);
  });
});

/* Can the exercise be passed by printing the answer instead of working it out?
   Found by hand: print("12") satisfied "print the sum of a and b". For a
   teaching tool that is worse than useless, so every check whose expected output
   is a constant now also insists on the construct being taught. This replays the
   answer's own output as a bare print and demands it be rejected. */
let fakeable = 0;
PYLAB.forEach(ch => ch.ex.forEach((e, i) => {
  /* the very first exercise asks you to write a print statement, so passing it
     by writing a print statement is the exercise working, not a loophole */
  if(ch.id === 'basics' && i === 0) return;
  const real = run(e.answer).trim();
  if(!real || /Traceback/.test(real)) return;          // nothing to fake
  if(real.split('\n').length > 6) return;               // too long to type out by hand
  const faked = real.split('\n').map(l => 'print(' + JSON.stringify(l) + ')').join('\n');
  const out = run(faked);
  let passes = false;
  try{ passes = !!e.check(out, faked); }catch(err){ passes = false; }
  if(passes){
    fakeable++;
    console.log('FAKEABLE [' + ch.id + ' #' + (i+1) + '] passes by printing the answer: ' +
                JSON.stringify(real.slice(0, 50)));
  }
}));
ok('no exercise passes by printing its answer', fakeable === 0, fakeable + ' fakeable');

console.log('\n' + PYLAB.length + ' chapters, ' + n + ' exercises');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
