/* The most important test: a worked solution for every lab task, proving each
   one can actually be completed inside the browser, and that its check()
   recognises the work. Also proves a fresh machine does NOT pass any task. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'src'), load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('vm-core.js') + load('vm-cmds.js') + load('vm-seed.js') + load('vm-python.js') + load('vm-labs.js'));

const COURSE = buildCourse();

/* Solutions, keyed by "lecture:task". A string is a shell command; an object
   {edit, body} writes a file the way the editor pane does. */
const SOL = {
 "1:0": ["pwd"],
 "1:1": ["ls -la"],
 "1:2": ["mkdir -p ~/kurs/v36/lab1"],
 "1:3": ["touch ~/kurs/v36/lab1/a.txt ~/kurs/v36/lab1/b.txt ~/kurs/v36/lab1/c.txt"],
 "1:4": ["cp ~/kurs/v36/lab1/a.txt ~/kurs/first.txt"],
 "1:5": ["cat /etc/os-release"],
 "1:6": ["id"],

 "2:0": ["ip a"],
 "2:1": ["ip r"],
 "2:2": ["ping -c 4 10.0.0.1"],
 "2:3": ["dig example.com"],
 "2:4": ["sudo ss -tulpn"],
 "2:5": ["nc -zv 10.0.0.5 22"],

 "3:0": ["chmod 600 ~/id_rsa"],
 "3:1": ["chmod +x ~/deploy.sh"],
 "3:2": ["sudo groupadd projekt"],
 "3:3": ["sudo useradd -m elev"],
 "3:4": ["sudo mkdir -p /srv/projekt", "sudo chown root:projekt /srv/projekt", "sudo chmod 2775 /srv/projekt"],
 "3:5": ["sudo find / -perm -4000 2>/dev/null"],
 "3:6": ["getenforce"],

 "4:0": ["echo 62"],
 "4:1": ["echo 255.255.255.192"],
 "4:2": ["echo 192.168.10.127"],
 "4:3": ["grep PermitRootLogin /etc/ssh/sshd_config"],
 "4:4": ["sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config"],
 "4:5": ["sudo ss -tulpn"],

 "5:0": ["systemctl status sshd"],
 "5:1": ["systemctl list-units --failed"],
 "5:2": ["sudo systemctl enable --now docker"],
 "5:3": ["journalctl -u nginx"],
 "5:4": ["ssh-keygen -t ed25519"],
 "5:5": ["chmod 700 ~/.ssh"],
 "5:6": [{edit:"/var/spool/cron/analyst", body:"# m h dom mon dow  command\n0 2 * * * /home/analyst/backup.sh\n"}],

 "6:0": ["sudo tail -n 20 /var/log/auth.log"],
 "6:1": ["sudo grep -c 'Failed password' /var/log/auth.log"],
 "6:2": ["sudo grep 'Failed password' /var/log/auth.log | grep -oE '([0-9]{1,3}[.]){3}[0-9]{1,3}' | sort | uniq -c | sort -rn"],
 "6:3": ["sudo systemctl start nginx"],
 "6:4": ["curl -I http://localhost"],
 "6:5": ["sudo ss -tulpn | grep :80"],

 "7:0": ["tar -czvf ~/backup.tar.gz projects"],
 "7:1": ["cd /tmp", "tar -xzvf ~/backup.tar.gz", "cat /tmp/projects/webshop/app.conf", "cd ~"],
 "7:2": ["mkdir -p /tmp/bak", "rsync -av projects/ /tmp/bak"],
 "7:3": ["sha256sum ~/backup.tar.gz"],
 "7:4": ["cd ~/projects", "git init", "git add .", "git commit -m 'first commit'"],
 "7:5": ["git log --oneline", "cd ~"],

 "8:0": ["mkdir -p ~/cloud",
         "echo 'on-prem: we manage the OS' > ~/cloud/ansvar.txt",
         "echo 'IaaS: we manage the OS, provider manages hardware' >> ~/cloud/ansvar.txt",
         "echo 'PaaS: provider manages the OS and runtime' >> ~/cloud/ansvar.txt",
         "echo 'SaaS: provider manages everything' >> ~/cloud/ansvar.txt"],
 "8:1": ["echo 'webshop frontend - cloud' > ~/cloud/workloads.txt",
         "echo 'student records database - on-prem' >> ~/cloud/workloads.txt",
         "echo 'nightly batch job - cloud' >> ~/cloud/workloads.txt"],
 "8:2": ["echo 'webshop RTO 4h RPO 24h' > ~/cloud/rto.txt"],
 "8:3": ["cat ~/cloud/ansvar.txt ~/cloud/workloads.txt ~/cloud/rto.txt"],

 "9:0": ["journalctl -p err"],
 "9:1": ["journalctl -u sshd -n 5"],
 "9:2": ["cat /etc/audit/audit.rules"],
 "9:3": ["cat /etc/logrotate.conf"],
 "9:4": ["python3 --version"],
 "9:5": ["mkdir -p ~/py",
         {edit:"/home/analyst/py/hello.py", body:'print("hi from a file")\n'},
         "python3 ~/py/hello.py"],

 "10:0": [{edit:"/home/analyst/py/types.py", body:
   'a = 5\nb = 2.5\nc = "text"\nd = True\nfor x in [a, b, c, d]:\n    print(x, type(x).__name__)\n'},
   "python3 ~/py/types.py"],
 "10:1": [{edit:"/home/analyst/py/greet.py", body:
   'name = "Ada"\nage = 36\nprint(f"{name} is {age} years old")\n'}, "python3 ~/py/greet.py"],
 "10:2": [{edit:"/home/analyst/py/division.py", body:
   'print(7 / 2)\nprint(7 // 2)\nprint(7 % 2)\n'}, "python3 ~/py/division.py"],
 "10:3": [{edit:"/home/analyst/py/strings.py", body:
   's = "  Hello World  "\nprint(s.strip())\nprint(s.strip().upper())\nprint(s.split())\n'},
   "python3 ~/py/strings.py"],
 "10:4": [{edit:"/home/analyst/py/logic.py", body:
   'print(True and False)\nprint(True or False)\nprint(not True)\n'}, "python3 ~/py/logic.py"],

 "11:0": [{edit:"/home/analyst/py/lista.py", body:
   'users = ["dave", "ada", "linus", "grace", "ken"]\nusers.append("alan")\nusers.sort()\nprint(users)\n'},
   "python3 ~/py/lista.py"],
 "11:1": [{edit:"/home/analyst/py/dict.py", body:
   'uids = {"root": 0, "analyst": 1000}\nfor k, v in uids.items():\n    print(k, v)\n'},
   "python3 ~/py/dict.py"],
 "11:2": [{edit:"/home/analyst/py/safe.py", body:
   'd = {"a": 1}\nprint(d.get("nope", 0))\n'}, "python3 ~/py/safe.py"],
 "11:3": [{edit:"/home/analyst/py/unika.py", body:
   'ips = ["10.0.0.1", "10.0.0.2", "10.0.0.1"]\nprint(len(set(ips)))\n'}, "python3 ~/py/unika.py"],
 "11:4": [{edit:"/home/analyst/py/betyg.py", body:
   'def grade(score):\n    if score >= 90:\n        return "A"\n    elif score >= 70:\n        return "B"\n    else:\n        return "F"\nprint(grade(95))\nprint(grade(75))\nprint(grade(20))\n'},
   "python3 ~/py/betyg.py"],
 "11:5": [{edit:"/home/analyst/py/jamna.py", body:
   'for i in range(1, 11):\n    if i % 2 == 0:\n        print(i)\n'}, "python3 ~/py/jamna.py"],

 "12:0": [{edit:"/home/analyst/py/skriv.py", body:
   'with open("/tmp/rader.txt", "w") as f:\n    for i in range(1, 6):\n        f.write(f"rad {i}\\n")\n'},
   "python3 ~/py/skriv.py"],
 "12:1": [{edit:"/home/analyst/py/las.py", body:
   'with open("/tmp/rader.txt") as f:\n    for line in f:\n        print(line.strip())\n'},
   "python3 ~/py/las.py"],
 "12:2": [{edit:"/home/analyst/py/rakna.py", body:
   'n = 0\nwith open("/var/log/app.log") as f:\n    for line in f:\n        if "ERROR" in line:\n            n += 1\nprint(n)\n'},
   "python3 ~/py/rakna.py"],
 "12:3": [{edit:"/home/analyst/py/passwd.py", body:
   'with open("/etc/passwd") as f:\n    for line in f:\n        p = line.strip().split(":")\n        if len(p) > 6:\n            print(p[0], p[6])\n'},
   "python3 ~/py/passwd.py"],
 "12:4": [{edit:"/home/analyst/py/saker.py", body:
   'try:\n    f = open("/tmp/finns-inte.txt")\nexcept FileNotFoundError:\n    print("filen finns inte")\n'},
   "python3 ~/py/saker.py"],

 "13:0": ["find /home/analyst -name '*.conf'"],
 "13:1": ["grep -c /bin/bash /etc/passwd"],
 "13:2": ["awk '{print $9}' /var/log/access.log | sort | uniq -c | sort -rn"],
 "13:3": ["chmod 700 ~/reports"],
 "13:4": ["ls -la /etc > ~/etc-listing.txt", "wc -l ~/etc-listing.txt"],
 "13:5": [{edit:"/home/analyst/py/sammanfatta.py", body:
   'n = 0\nwith open("/var/log/access.log") as f:\n    for line in f:\n        n += 1\nprint(n)\n'},
   "python3 ~/py/sammanfatta.py"]
};

function fresh(){
  const K = attachShell(makeVM()); seedVM(K); attachPython(K);
  return K;
}
function applyStep(K, hist, step){
  if(typeof step === 'object'){
    // the editor pane: ensure the parent exists, then write the body
    K.run('mkdir -p ' + K.parentOf(step.edit));
    K.put(step.edit, step.body, 0o644, 'analyst', 'analyst');
    hist.push({cmd:'edit ' + step.edit, out:'', err:'', code:0});
    return;
  }
  const r = K.run(step);
  hist.push({cmd:step.trim(), out:r.out||'', err:r.err||'', code:r.code});
}

let pass = 0, fail = 0, missing = 0, falsePass = 0;

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

    // 2. the worked solution must satisfy it
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

const total = COURSE.reduce((n,l)=>n+l.tasks.length,0);
console.log('\nlectures: ' + COURSE.length + ', tasks: ' + total);
console.log(pass + ' solvable, ' + fail + ' not satisfied, ' + missing + ' without a solution, ' +
            falsePass + ' passing untouched');
process.exitCode = (fail || missing || falsePass) ? 1 : 0;
