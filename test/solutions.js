/* The most important test: a worked solution for every lab task, proving each
   one can actually be completed inside the browser, and that its check()
   recognises the work. Also proves a fresh machine does NOT pass any task. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'src'), load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('vm-core.js') + load('vm-cmds.js') + load('vm-seed.js') + load('vm-python.js') + load('vm-labs.js'));

const COURSE = buildCourse();

/* Solutions, keyed by "lecture:task". A string is a shell command; an object
   {edit, body} writes a file the way the editor pane does. */
/* Answers live with the lab data so the button and this test cannot drift. */
const SOL = LAB_ANSWERS;


/* Near misses: commands that look right but do the wrong thing, and must NOT
   complete the task. These guard against checks that match the typed string
   instead of verifying what actually happened. */
const NEAR_MISS = {
 "1:0": [["cd /etc"]],
 "1:1": [["ls -la /etc"],                       // long+hidden, but not home
         ["ls -l"],                             // long, but no hidden files
         ["ls -a"]],                            // hidden, but not long format
 "1:2": [["mkdir -p /kurs/v36/lab1"],           // at the root, not in home
         ["mkdir -p ~/kurs/v36"]],              // stopped one level short
 "1:3": [["mkdir -p ~/kurs/v36/lab1", "touch a.txt b.txt c.txt"],   // left in home
         ["mkdir -p ~/kurs/v36/lab1", "touch ~/kurs/v36/lab1/a.txt"],
         // mkdir makes directories, not empty files
         ["mkdir -p ~/kurs/v36/lab1/a.txt ~/kurs/v36/lab1/b.txt ~/kurs/v36/lab1/c.txt"],
         // right idea, wrong names
         ["mkdir -p ~/kurs/v36/lab1", "cd ~/kurs/v36/lab1", "touch 1.txt 2.txt 3.txt"]],
 "1:4": [["cp ~/notes.txt ~/kurs/first.txt"]],  // right name, but nothing to copy from lab1
 "1:5": [["cat /etc/hostname"]],
 "1:6": [["whoami"]],                           // username only, not uid/gid/groups
 "2:0": [["ip r"]],
 "2:1": [["ip a"]],
 "2:2": [["ping -c 4 example.com"],             // right count, wrong host
         ["ping -c 1 10.0.0.1"]],               // right host, wrong count
 "2:3": [["dig archlinux.org"]],
 "2:4": [["ss -tulpn"]],                        // no root, so no process column
 "2:5": [["nc -zv 10.0.0.5 9999"]],             // a closed port
 "3:0": [["chmod 644 ~/id_rsa"], ["chmod 600 ~/notes.txt"]],
 "3:1": [["chmod 644 ~/deploy.sh"]],
 "3:2": [["groupadd projekt"]],                 // refused without root
 "3:3": [["sudo useradd elev"]],                // no home directory
 "3:4": [["sudo mkdir -p /srv/projekt", "sudo chmod 2775 /srv/projekt"]],  // group never set
 "3:5": [["find / -perm -4000"]],               // no sudo, so the interesting paths are unreadable
 "3:6": [["cat /etc/os-release"]],
 "4:0": [["echo 64"]], "4:1": [["echo 255.255.255.0"]], "4:2": [["echo 192.168.10.63"]],
 "4:3": [["cat /etc/ssh/sshd_config | head -1"]],
 "4:4": [["grep PasswordAuthentication /etc/ssh/sshd_config"]],  // read, not changed
 "5:0": [["systemctl status cron"]],            // a running service, but not sshd
 "5:1": [["systemctl list-units"]],
 "5:2": [["sudo systemctl start docker"],       // started but not enabled
         ["sudo systemctl enable docker"]],     // enabled but not started
 "5:3": [["journalctl -u sshd"]],
 "5:4": [["ssh-keygen -t rsa"]],                // wrong key type
 "5:5": [["chmod 755 ~/.ssh"]],
 "5:6": [["crontab -l"]],
 "6:0": [["sudo grep 'Failed password' /var/log/auth.log"]],     // right text, not tail
 "6:1": [["sudo grep 'Failed password' /var/log/auth.log"]],     // listed, never counted
 "6:2": [["sudo grep -c 'Failed password' /var/log/auth.log"]],  // counted, never ranked
 "6:3": [["systemctl status nginx"]],           // looked at it, did not start it
 "6:4": [["curl http://localhost"]],            // body, not headers
 "6:5": [["ss -tulpn"]],                        // no root, so no process name
 "7:0": [["tar -cvf ~/backup.tar.gz projects"]],// uncompressed despite the .gz name
 "7:1": [["tar -czvf ~/backup.tar.gz projects"]],
 "7:2": [["mkdir -p /tmp/bak", "rsync -av --dry-run projects/ /tmp/bak"]],
 "7:3": [["sha256sum ~/notes.txt"]],            // hashed, but no archive was made
 "7:4": [["cd ~/projects", "git init"]],        // repo but no commit
 "7:5": [["cd ~/projects", "git init", "git add .", "git commit -m x", "git log"]],
 "8:0": [["mkdir -p ~/cloud", "echo 'on-prem' > ~/cloud/ansvar.txt"]],
 "8:1": [["mkdir -p ~/cloud", "echo 'webshop' > ~/cloud/workloads.txt"]],
 "8:2": [["mkdir -p ~/cloud", "echo 'webshop matters' > ~/cloud/rto.txt"]],
 "8:3": [["mkdir -p ~/cloud", "echo x > ~/cloud/rto.txt", "cat ~/cloud/rto.txt"]],
 "9:0": [["journalctl"]],
 "9:1": [["journalctl -u sshd"]],               // no line limit
 "9:2": [["cat /etc/logrotate.conf"]],
 "9:3": [["cat /etc/audit/audit.rules"]],
 "9:4": [["python3 -c 'print(1)'"]],
 "9:5": [["mkdir -p ~/py"]],
 "10:0": [[{edit:"/home/analyst/py/types.py", body:'print(5)\n'}, "python3 ~/py/types.py"]],
 "10:1": [[{edit:"/home/analyst/py/greet.py", body:'print("Ada is 36")\n'}, "python3 ~/py/greet.py"]],
 "10:2": [[{edit:"/home/analyst/py/division.py", body:'print(7 / 2)\n'}, "python3 ~/py/division.py"]],
 "10:3": [[{edit:"/home/analyst/py/strings.py", body:'print("  Hello World  ".strip())\n'}, "python3 ~/py/strings.py"]],
 "10:4": [[{edit:"/home/analyst/py/logic.py", body:'print(True)\n'}, "python3 ~/py/logic.py"]],
 "11:0": [[{edit:"/home/analyst/py/lista.py", body:'print(["b","a"])\n'}, "python3 ~/py/lista.py"]],
 "11:1": [[{edit:"/home/analyst/py/dict.py", body:'d={"a":1}\nprint(d)\n'}, "python3 ~/py/dict.py"]],
 "11:2": [[{edit:"/home/analyst/py/safe.py", body:'d={}\nprint(d["x"])\n'}, "python3 ~/py/safe.py"]],
 "11:3": [[{edit:"/home/analyst/py/unika.py", body:'print(len(["a","b","a"]))\n'}, "python3 ~/py/unika.py"]],
 "11:4": [[{edit:"/home/analyst/py/betyg.py", body:'def grade(s):\n    return "A"\nprint(grade(1))\n'}, "python3 ~/py/betyg.py"]],
 "11:5": [[{edit:"/home/analyst/py/jamna.py", body:'for i in range(1, 11):\n    print(i)\n'}, "python3 ~/py/jamna.py"]],
 "12:0": [[{edit:"/home/analyst/py/skriv.py", body:'with open("/tmp/rader.txt","w") as f:\n    f.write("one\\n")\n'}, "python3 ~/py/skriv.py"]],
 "12:1": [[{edit:"/home/analyst/py/las.py", body:'with open("/tmp/rader.txt") as f:\n    print(f.read())\n'}, "python3 ~/py/las.py"]],
 "12:2": [[{edit:"/home/analyst/py/rakna.py", body:'print(0)\n'}, "python3 ~/py/rakna.py"]],
 "12:3": [[{edit:"/home/analyst/py/passwd.py", body:'print("analyst")\n'}, "python3 ~/py/passwd.py"]],
 "12:4": [[{edit:"/home/analyst/py/saker.py", body:'open("/tmp/nope.txt")\n'}, "python3 ~/py/saker.py"]],
 "13:0": [["find /etc -name '*.conf'"]],
 "13:1": [["grep /bin/bash /etc/passwd"]],      // listed, never counted
 "13:2": [["awk '{print $9}' /var/log/access.log | sort"]],
 "13:3": [["chmod 755 ~/reports"]],
 "13:4": [["ls -la /etc > ~/etc-listing.txt"]], // never counted the lines
 "13:5": [[{edit:"/home/analyst/py/sammanfatta.py", body:'print(1)\n'}, "python3 ~/py/sammanfatta.py"]]
};

function fresh(){
  const K = attachShell(makeVM()); seedVM(K); attachPython(K);
  return K;
}
function applyStep(K, hist, step){
  if(typeof step === 'object'){
    // Drive the editor exactly as the page does: run `edit`, and only write if
    // it opened. Creating the parent here would hide answers that forget the
    // mkdir, which is precisely the kind of gap this suite exists to catch.
    const open = step.open || ('edit ' + step.edit);
    const r = K.run(open);
    hist.push({cmd:open, out:r.out||'', err:r.err||'', code:r.code});
    if(r.editor) K.lookup(r.editor).node.c = step.body;
    return;
  }
  const r = K.run(step);
  hist.push({cmd:step.trim(), out:r.out||'', err:r.err||'', code:r.code});
}

let pass = 0, fail = 0, missing = 0, falsePass = 0, loose = 0;

COURSE.forEach(lec => {
  // one machine per lecture, worked through in order — the way a student does it
  const K = fresh(); const hist = [];

  lec.tasks.forEach((task, ti) => {
    const key = lec.n + ':' + ti;
    const sol = SOL[key];
    if(!sol){ missing++; console.log('NO SOLUTION  [' + key + '] ' + task.q.replace(/<[^>]+>/g,'').slice(0,70)); return; }

    // 1. an untouched machine must NOT already satisfy the task, or the check is vacuous
    const K0 = fresh();
    let already = false;
    try { already = !!task.check(makeLabCtx(K0, [])); } catch(e){ already = false; }
    if(already){ falsePass++;
      console.log('PASSES UNTOUCHED  [' + key + '] ' + task.q.replace(/<[^>]+>/g,'').slice(0,70)); }

    // 2. near misses must NOT satisfy it — each on its own clean machine
    (NEAR_MISS[key] || []).forEach(seq => {
      const Kn = fresh(); const hn = [];
      for(const step of seq) applyStep(Kn, hn, step);
      let accepted = false;
      try { accepted = !!task.check(makeLabCtx(Kn, hn)); } catch(e){ accepted = false; }
      if(accepted){ loose++;
        console.log('ACCEPTS A NEAR MISS  [' + key + '] "' + seq.join(' ; ') + '"' +
                    '\n      task: ' + task.q.replace(/<[^>]+>/g,'').slice(0,70)); }
    });

    // 3. the worked solution must satisfy it
    for(const step of sol) applyStep(K, hist, step);
    let okNow = false, thrown = null;
    try { okNow = !!task.check(makeLabCtx(K, hist)); }
    catch(e){ thrown = e.message; }
    if(okNow) pass++;
    else {
      fail++;
      console.log('NOT SATISFIED  [' + key + '] ' + task.q.replace(/<[^>]+>/g,'').slice(0,70));
      if(thrown) console.log('      check() threw: ' + thrown);
      const last = hist[hist.length-1];
      if(last) console.log('      last cmd: ' + last.cmd +
        '\n      out: ' + JSON.stringify((last.out||'').slice(0,160)) +
        (last.err ? '\n      err: ' + JSON.stringify(last.err.slice(0,160)) : ''));
    }
  });
});

/* Cross-contamination: a task must need its own work, not merely the work of
   its neighbours. Lecture 5's "set ~/.ssh to the mode SSH insists on" used to
   pass for free because the task before it ran ssh-keygen, which created the
   directory at 0700 — so the fix task completed itself in the normal order and
   the student never typed a chmod. Running every OTHER answer in a lecture and
   asserting the task still fails is what catches that shape. */
let contaminated = 0;
COURSE.forEach((lec, li) => {
  lec.tasks.forEach((task, ti) => {
    const K = seedVM(attachShell(makeVM()));
    lec.tasks.forEach((_, tj) => {
      if(tj === ti) return;
      const a = LAB_ANSWERS[(li + 1) + ':' + tj];
      if(a) (Array.isArray(a) ? a : [a]).forEach(step => {
        try{ applyStep(K, [], step); }catch(e){ /* a neighbour's answer failing here is fine */ }
      });
    });
    let passed = false;
    try{ passed = !!task.check(makeLabCtx(K)); }catch(e){}
    if(passed){
      contaminated++;
      console.log('CONTAMINATED [lecture ' + (li+1) + ' task ' + ti + '] passes ' +
                  'after only its neighbours\' answers: ' + plainQ(task.q));
    }
  });
});

const total = COURSE.reduce((n,l)=>n+l.tasks.length,0);
const nm = Object.values(NEAR_MISS).reduce((n,v)=>n+v.length,0);
console.log('\nlectures: ' + COURSE.length + ', tasks: ' + total + ', near-miss cases: ' + nm);
console.log(pass + ' solvable, ' + fail + ' not satisfied, ' + missing + ' without a solution, ' +
            falsePass + ' passing untouched, ' + loose + ' accepting a near miss, ' +
            contaminated + ' completed by a neighbour');
process.exitCode = (fail || missing || falsePass || loose || contaminated) ? 1 : 0;
