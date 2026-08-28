/* Exercise the mini-Python against what lectures 10-12 actually teach. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'src'), load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('vm-core.js') + load('vm-cmds.js') + load('vm-seed.js') + load('vm-python.js'));

let pass = 0, fail = 0;
function fresh(){ const K = attachShell(makeVM()); seedVM(K); attachPython(K); return K; }
function t(name, src, want, opts){
  const K = fresh();
  const r = K.py(src, opts || {});
  const got = (r.out + (r.err ? r.err : '')).trim();
  const w = want.trim();
  if(got === w){ pass++; return; }
  fail++;
  console.log('FAIL  ' + name + '\n      got:  ' + JSON.stringify(got) + '\n      want: ' + JSON.stringify(w));
}

/* ---- types, printing, arithmetic ---- */
t('print a string', 'print("hello")', 'hello');
t('print several values', 'print("a", 1, True)', 'a 1 True');
t('int stays int', 'print(7)', '7');
t('true division gives a float', 'print(7 / 2)', '3.5');
t('exact division still shows .0', 'print(4 / 2)', '2.0');
t('floor division', 'print(7 // 2)', '3');
t('modulo', 'print(7 % 2)', '1');
t('power', 'print(2 ** 10)', '1024');
t('float arithmetic', 'print(0.5 + 0.25)', '0.75');
t('type() of each', 'print(type(1).__name__, type(1.5).__name__, type("a").__name__, type(True).__name__)',
  'int float str bool');
t('string times int', 'print("ab" * 3)', 'ababab');
t('str + int is a TypeError', 'print("5" + 5)',
  'Traceback (most recent call last):\n  File "<stdin>"\nTypeError: can only concatenate str (not "int") to str');
t('division by zero', 'print(1 / 0)',
  'Traceback (most recent call last):\n  File "<stdin>"\nZeroDivisionError: division by zero');
t('int() converts', 'print(int("42") + 1)', '43');
t('int() rejects junk', 'print(int("abc"))',
  'Traceback (most recent call last):\n  File "<stdin>"\nValueError: invalid literal for int() with base 10: \'abc\'');

/* ---- variables, f-strings, strings ---- */
t('variables', 'name = "Ada"\nage = 36\nprint(name, age)', 'Ada 36');
t('f-string', 'n = "Ada"\na = 36\nprint(f"{n} is {a}")', 'Ada is 36');
t('f-string with expression', 'print(f"{2 + 3} items")', '5 items');
t('f-string float format', 'x = 3.14159\nprint(f"{x:.2f}")', '3.14');
t('augmented assignment', 'x = 5\nx += 3\nprint(x)', '8');
t('string methods', 's = "  Hello World  "\nprint(s.strip().upper())', 'HELLO WORLD');
t('split default', 'print("a b  c".split())', "['a', 'b', 'c']");
t('split on a char', 'print("a:b:c".split(":"))', "['a', 'b', 'c']");
t('replace', 'print("http://x".replace("http", "https"))', 'https://x');
t('len of a string', 'print(len("hello"))', '5');
t('indexing and slicing', 's = "python"\nprint(s[0], s[-1], s[1:4])', 'p n yth');
t('join', 'print("-".join(["a","b","c"]))', 'a-b-c');

/* ---- booleans ---- */
t('boolean logic', 'print(True and False, True or False, not True)', 'False True False');
t('comparison chain', 'print(3 > 2, 3 == 3, 3 != 4, 2 <= 2)', 'True True True True');

/* ---- lists ---- */
t('list basics', 'x = [3,1,2]\nx.append(4)\nx.sort()\nprint(x)', '[1, 2, 3, 4]');
t('insert and remove', 'x = ["b"]\nx.insert(0,"a")\nx.append("c")\nx.remove("b")\nprint(x)', "['a', 'c']");
t('pop', 'x = [1,2,3]\nprint(x.pop(), x)', '3 [1, 2]');
t('list index error', 'x = [1]\nprint(x[5])',
  'Traceback (most recent call last):\n  File "<stdin>"\nIndexError: list index out of range');
t('list slicing', 'x = [1,2,3,4,5]\nprint(x[1:3])', '[2, 3]');
t('in operator', 'print("a" in ["a","b"], "z" in ["a","b"])', 'True False');

/* ---- dicts ---- */
t('dict basics', 'd = {"a": 1, "b": 2}\nprint(d["a"], len(d))', '1 2');
t('dict loop over items', 'd = {"a":1,"b":2}\nfor k, v in d.items():\n    print(k, v)', 'a 1\nb 2');
t('dict missing key raises', 'd = {}\nprint(d["x"])',
  'Traceback (most recent call last):\n  File "<stdin>"\nKeyError: \'x\'');
t('dict .get returns None', 'd = {}\nprint(d.get("x"))', 'None');
t('dict .get with default', 'd = {}\nprint(d.get("x", 0))', '0');
t('dict assignment', 'd = {}\nd["k"] = 9\nprint(d)', "{'k': 9}");
t('keys and values', 'd = {"a":1}\nprint(d.keys(), d.values())', "['a'] [1]");

/* ---- sets ---- */
t('set dedupes', 'ips = ["a","b","a"]\nu = set(ips)\nprint(len(u))', '2');
t('set operations', 'a = {1,2,3}\nb = {2,3,4}\nprint(sorted(a.intersection(b)))', '[2, 3]');

/* ---- control flow ---- */
t('if/elif/else', 'x = 75\nif x >= 90:\n    print("A")\nelif x >= 70:\n    print("B")\nelse:\n    print("F")', 'B');
t('for over range', 'for i in range(3):\n    print(i)', '0\n1\n2');
t('range with start and stop', 'print(list(range(1, 5)))', '[1, 2, 3, 4]');
t('for with if inside', 'for i in range(1, 7):\n    if i % 2 == 0:\n        print(i)', '2\n4\n6');
t('while loop', 'i = 0\nwhile i < 3:\n    print(i)\n    i += 1', '0\n1\n2');
t('break', 'for i in range(10):\n    if i == 2:\n        break\n    print(i)', '0\n1');
t('continue', 'for i in range(4):\n    if i == 1:\n        continue\n    print(i)', '0\n2\n3');
t('runaway while is stopped', 'while True:\n    x = 1',
  'Traceback (most recent call last):\n  File "<stdin>"\nRuntimeError: this while loop did not terminate');

/* ---- functions ---- */
t('function with return', 'def add(a, b):\n    return a + b\nprint(add(2, 3))', '5');
t('function without return gives None', 'def f():\n    print("hi")\nprint(f())', 'hi\nNone');
t('default argument', 'def greet(name, greeting="Hej"):\n    return greeting + " " + name\nprint(greet("Ada"))\nprint(greet("Ada", "Hello"))',
  'Hej Ada\nHello Ada');
t('grading function', 'def grade(s):\n    if s >= 90:\n        return "A"\n    if s >= 70:\n        return "B"\n    return "F"\nprint(grade(95), grade(75), grade(20))', 'A B F');
t('missing argument errors', 'def f(a):\n    return a\nprint(f())',
  'Traceback (most recent call last):\n  File "<stdin>"\nTypeError: f() missing required positional argument: \'a\'');
t('undefined name errors', 'print(nope)',
  'Traceback (most recent call last):\n  File "<stdin>"\nNameError: name \'nope\' is not defined');

/* ---- input ---- */
t('input reads queued stdin', 'a = int(input())\nb = int(input())\nprint(a + b)', '7', {stdin:'3\n4'});
t('input returns a string', 'x = input()\nprint(type(x).__name__)', 'str', {stdin:'5'});

/* ---- files, backed by the simulated filesystem ---- */
t('write then read a file',
  'with open("/tmp/t.txt", "w") as f:\n    f.write("one\\ntwo\\n")\nwith open("/tmp/t.txt") as f:\n    print(f.read().strip())',
  'one\ntwo');
t('append mode keeps content',
  'with open("/tmp/a.txt", "w") as f:\n    f.write("first\\n")\nwith open("/tmp/a.txt", "a") as f:\n    f.write("second\\n")\nwith open("/tmp/a.txt") as f:\n    print(f.read().strip())',
  'first\nsecond');
t('iterate over lines and strip',
  'with open("/tmp/l.txt", "w") as f:\n    f.write("a\\nb\\n")\nwith open("/tmp/l.txt") as f:\n    for line in f:\n        print(line.strip())',
  'a\nb');
t('missing file raises FileNotFoundError', 'open("/tmp/nope.txt")',
  'Traceback (most recent call last):\n  File "<stdin>"\nFileNotFoundError: [Errno 2] No such file or directory: \'/tmp/nope.txt\'');
t('try/except catches it',
  'try:\n    f = open("/tmp/nope.txt")\nexcept FileNotFoundError:\n    print("no such file")',
  'no such file');
t('count matching lines, a grep in python',
  'n = 0\nwith open("/var/log/app.log") as f:\n    for line in f:\n        if "ERROR" in line:\n            n += 1\nprint(n)',
  '2');
t('parse /etc/passwd',
  'with open("/etc/passwd") as f:\n    for line in f:\n        p = line.strip().split(":")\n        if p[0] == "analyst":\n            print(p[0], p[6])',
  'analyst /bin/bash');

/* ---- run a .py file through the shell ---- */
(function(){
  const K = fresh();
  K.run('mkdir -p /home/analyst/py');
  K.py('with open("/home/analyst/py/hello.py","w") as f:\n    f.write(\'print("hi from a file")\\n\')');
  const r = K.run('python3 /home/analyst/py/hello.py');
  if(r.out.trim() === 'hi from a file'){ pass++; } else { fail++;
    console.log('FAIL  python3 runs a file from the shell\n      got: ' + JSON.stringify(r.out + r.err)); }
  const r2 = K.run('python3 /home/analyst/py/nope.py');
  if(r2.err.includes('No such file or directory')){ pass++; } else { fail++;
    console.log('FAIL  python3 on a missing file\n      got: ' + JSON.stringify(r2.err)); }
  const r3 = K.run('python3 -c "print(1+1)"');
  if(r3.out.trim() === '2'){ pass++; } else { fail++;
    console.log('FAIL  python3 -c\n      got: ' + JSON.stringify(r3.out + r3.err)); }
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;
