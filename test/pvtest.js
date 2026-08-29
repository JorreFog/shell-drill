/* Tests for the preview features that can be checked without a browser: the
   exam draw and the review queue's rules. The draw is the interesting one — it
   shipped with a biased shuffle that quietly turned a mixed test into a Linux
   test, and nothing would have caught that by eye. */
const fs = require('fs'), path = require('path');
const base = path.join(__dirname, '..', 'src');
const read = f => fs.readFileSync(path.join(base, f), 'utf8');

/* the exam file only needs its sampling half, which touches no DOM */
const examSrc = read('vm-exam.js');
eval(examSrc.slice(0, examSrc.indexOf('function pvStartExam')));

let pass = 0, fail = 0;
function ok(name, cond, extra){
  if(cond) pass++;
  else { fail++; console.log('FAIL ' + name + (extra ? '\n  ' + extra : '')); }
}

/* a pool shaped like the real one: Linux 34, plus nine courses of 8 */
function pool(){
  const p = [];
  for(let i = 0; i < 34; i++) p.push({setId:"", course:"Linux", n:i});
  for(let c = 0; c < 9; c++)
    for(let i = 0; i < 8; i++) p.push({setId:"c"+c+":", course:"course"+c, n:i});
  return p;
}
const share = (picks, name) => picks.filter(q => q.course === name).length;

/* ---------------- the shuffle itself ---------------- */
{
  const list = Array.from({length: 60}, (_, i) => i);
  const a = pvShuffle(list, 12345), b = pvShuffle(list, 12345), c = pvShuffle(list, 999);
  ok('the same seed gives the same order', JSON.stringify(a) === JSON.stringify(b));
  ok('a different seed gives a different order', JSON.stringify(a) !== JSON.stringify(c));
  ok('nothing is lost or duplicated',
     JSON.stringify(a.slice().sort((x,y)=>x-y)) === JSON.stringify(list));

  /* the low-bit bug showed up as the last index barely moving; check every
     position is reachable rather than trusting one sample */
  const seen = new Set();
  for(let s = 0; s < 300; s++) seen.add(pvShuffle(list, 1000 + s * 7919)[0]);
  ok('the first slot takes many different values', seen.size > 30, 'got ' + seen.size);
}

/* ---------------- the draw spreads across courses ---------------- */
{
  const runs = 2000, want = 20;
  let linuxTotal = 0, worstLinux = 0, coursesSeenMin = 99;
  for(let r = 0; r < runs; r++){
    const picks = pvDraw(pool(), want, 1750000000000 + r * 997);
    ok('draw returns the number asked for', picks.length === want);
    const n = share(picks, "Linux");
    linuxTotal += n; if(n > worstLinux) worstLinux = n;
    coursesSeenMin = Math.min(coursesSeenMin, new Set(picks.map(q => q.course)).size);
    if(fail) break;   // no point flooding output
  }
  const mean = linuxTotal / runs;
  ok('a 20-question test is not dominated by one course, on average',
     mean <= 3.2, 'mean Linux per 20 was ' + mean.toFixed(2));
  ok('and not in the worst case either',
     worstLinux <= 4, 'worst Linux count was ' + worstLinux);
  ok('every test covers all ten sets',
     coursesSeenMin === 10, 'fewest courses seen in one test: ' + coursesSeenMin);
}

/* a draw larger than one round still spreads evenly */
{
  const picks = pvDraw(pool(), 30, 4242);
  const counts = {};
  picks.forEach(q => counts[q.course] = (counts[q.course] || 0) + 1);
  const vals = Object.values(counts);
  ok('30 questions stay balanced across courses',
     Math.max(...vals) - Math.min(...vals) <= 1,
     JSON.stringify(counts));
}

/* asking for more than exists returns everything, without duplicates */
{
  const p = pool();
  const picks = pvDraw(p, 500, 7);
  ok('asking for more than the pool holds returns the pool', picks.length === p.length);
  ok('and repeats nothing', new Set(picks).size === p.length);
}

/* a pool with a single course must still work */
{
  const one = Array.from({length: 5}, (_, i) => ({setId:"x:", course:"x", n:i}));
  const picks = pvDraw(one, 3, 11);
  ok('a single-course pool still draws', picks.length === 3);
  ok('and does not repeat', new Set(picks).size === 3);
}

/* the draw is reproducible from its seed, like the shuffle */
{
  const a = pvDraw(pool(), 12, 555).map(q => q.course + q.n).join(",");
  const b = pvDraw(pool(), 12, 555).map(q => q.course + q.n).join(",");
  ok('the same seed draws the same test', a === b);
}

/* ---------- switching between quizzes of different shapes ----------
   A crash found by clicking through every entry in the browser rather than by
   reading code: the Linux quiz has five sections, the course quizzes have two,
   and the position carries across the switch. Section 4 of a two-section quiz
   does not exist, and activeQuiz()[Q.tier].items threw. */
{
  const courses = fs.readFileSync(path.join(base, 'vm-courses.js'), 'utf8');
  eval(courses.slice(courses.indexOf('function clampQuizPos'),
                     courses.indexOf('if (typeof globalThis')));

  const five = Array.from({length:5}, () => ({items: Array.from({length:8}, (_,j)=>j)}));
  const two  = Array.from({length:2}, () => ({items: Array.from({length:4}, (_,j)=>j)}));

  ok('a valid position is left alone',
     JSON.stringify(clampQuizPos(five, 3, 5)) === JSON.stringify({tier:3, i:5}));
  ok('a section past the end resets to the first', clampQuizPos(two, 4, 3).tier === 0);
  ok('a question past the end of its section resets', clampQuizPos(two, 1, 99).i === 0);
  ok('negatives are clamped',
     JSON.stringify(clampQuizPos(five, -2, -7)) === JSON.stringify({tier:0, i:0}));
  ok('an empty quiz does not throw',
     JSON.stringify(clampQuizPos([], 3, 3)) === JSON.stringify({tier:0, i:0}));
  ok('a missing quiz does not throw',
     JSON.stringify(clampQuizPos(null, 1, 1)) === JSON.stringify({tier:0, i:0}));
  ok('a section with no items resets the question', clampQuizPos([{items:[]}], 0, 4).i === 0);
  const moved = clampQuizPos(two, 4, 3);
  ok('the reported crash case lands on a section that exists',
     !!(two[moved.tier] && moved.i < two[moved.tier].items.length));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
