/* One lab per lecture. Every task carries a check() that inspects the machine
   afterwards, so a task completes because the student actually did it — not
   because they typed a matching string. */
/* The context every check() receives: the machine plus what has been run in it. */
function makeLabCtx(K, hist){
  const node = p => K.lookup(p).node;
  return {
    K, hist,
    ran:    rx => hist.some(h => rx.test(h.cmd)),
    said:   rx => hist.some(h => rx.test(h.out) || rx.test(h.err||"")),
    exists: p => !!node(p),
    isDir:  p => { const n = node(p); return !!n && n.t === "d"; },
    // a task that asks for a file must not be satisfied by a directory of
    // the same name — mkdir a.txt is not touch a.txt
    isFile: p => { const n = node(p); return !!n && n.t === "f"; },
    read:   p => { const n = node(p); return n && n.t === "f" ? n.c : null; },
    mode:   p => { const n = node(p); return n ? n.mode : null; },
    owner:  p => { const n = node(p); return n ? n.owner : null; },
    group:  p => { const n = node(p); return n ? n.group : null; },
    unit:   n => K.vm.units[n],
    git:    () => K.vm.git,
    // run a student's script and hand back its output
    py:     p => { const r = K.run("python3 " + p); return {out: r.out || "", err: r.err || "", code: r.code}; }
  };
}

function buildCourse(){
  return [
{wk:36, n:1, date:"Mon 31 Aug", iso:"2026-08-31", title:"Introduktion, Linux grunder, CLI, användare",
 topics:"Projektförberedelser, Linux intro, filsystem, kommandoraden, användare",
 brief:"Get your bearings: where am I, what is here, and how do I make and move things. Everything below happens on the simulated machine to the right.",
 tasks:[
  {q:"Print the directory you are standing in.", hint:"Three letters — print working directory.",
   check:c => c.ran(/^pwd\s*$/m)},
  {q:"List your home directory in long format, including hidden files.",
   hint:"Two options after a single dash: long, and all.",
   // the listing itself has to show a mode column (long format) against a
   // dotfile that only exists in home, so listing somewhere else will not do
   check:c => c.said(/(^|\n)[-d][rwx-]{9}\s.*\s\.bashrc\s*$/m)},
  {q:"Create the directory tree <code>~/kurs/v36/lab1</code> with a single command.",
   hint:"mkdir needs one option to create missing parents.",
   check:c => c.isDir("/home/analyst/kurs/v36/lab1")},
  {q:"Inside <code>~/kurs/v36/lab1</code>, create three empty files: <code>a.txt</code>, <code>b.txt</code> and <code>c.txt</code>.",
   hint:"The names have to match exactly — a.txt, b.txt and c.txt. Use touch, not mkdir, and either cd into the directory first or give touch the full paths; it takes several filenames at once.",
   check:c => ["a","b","c"].every(n => c.isFile("/home/analyst/kurs/v36/lab1/"+n+".txt"))},
  {q:"Copy <code>a.txt</code> into <code>~/kurs</code> and give the copy the name <code>first.txt</code>.",
   hint:"Either cp then mv, or cp straight to the new path.",
   check:c => c.isFile("/home/analyst/kurs/first.txt")},
  {q:"Read <code>/etc/os-release</code> and find out which distribution this machine runs.",
   hint:"cat, or grep for the PRETTY_NAME line.",
   check:c => c.said(/Arch Linux/)},
  {q:"Show your own user ID, group ID and group memberships.",
   hint:"Two letters.", check:c => c.said(/uid=1000\(analyst\)/)}],
 check:[
  ["Which option makes <code>mkdir</code> create every missing parent?",
   "<code>-p</code>. Without it, <code>mkdir a/b/c</code> fails as soon as <code>a</code> does not exist."],
  ["What is the difference between an absolute and a relative path?",
   "An absolute path starts at <code>/</code> and means the same from anywhere. A relative path is resolved from your current directory."],
  ["Why does <code>ls</code> hide <code>.bashrc</code> by default?",
   "A leading dot is the convention for hidden files. It is naming, not security — <code>ls -a</code> shows everything."]]},

{wk:36, n:2, date:"Thu 3 Sep", iso:"2026-09-03", title:"Nätverk",
 topics:"Interfaces, adresser, routing, namnuppslagning, portar",
 brief:"This machine sits on 10.0.0.0/24 behind a gateway. Find out its address, how it reaches the outside, and what it is listening on.",
 tasks:[
  {q:"Show the IP addresses configured on every interface.", hint:"Two characters after the tool name.",
   check:c => c.said(/10\.0\.0\.24\/24/)},
  {q:"Show the routing table and find the default gateway.", hint:"Same tool, different object.",
   check:c => c.said(/default via 10\.0\.0\.1/)},
  {q:"Send exactly 4 ping packets to the gateway.", hint:"One option sets the count, or it pings forever.",
   check:c => c.hist.some(h => /4 packets transmitted/.test(h.out) && /PING 10\.0\.0\.1/.test(h.out))},
  {q:"Look up the A record for <code>example.com</code>.", hint:"dig, host or nslookup all work.",
   check:c => c.said(/93\.184\.216\.34/)},
  {q:"List every listening TCP and UDP port <b>with the process that owns it</b>. You will need root for the process column.",
   hint:"ss with five option letters, and sudo.",
   check:c => c.said(/users:\(\("sshd"/)},
  {q:"Check whether TCP port 22 is open on <code>10.0.0.5</code>, without sending data.",
   hint:"netcat in scan mode, verbose.",
   check:c => c.said(/succeeded/)}],
 check:[
  ["What does the <code>default via</code> line in the routing table tell you?",
   "Where anything not on your local network is sent — your gateway. Without it you can reach neighbours but not the internet."],
  ["Why does <code>ss -tulpn</code> usually need <code>sudo</code>?",
   "Without root it lists the sockets but leaves the owning-process column empty."],
  ["You can ping 10.0.0.1 but names do not resolve. What is broken?",
   "DNS, not routing. Check <code>/etc/resolv.conf</code>."]]},

{wk:37, n:3, date:"Mon 7 Sep", iso:"2026-09-07", title:"SELinux, SUID/SGID, permissions, user & group management",
 topics:"Rättigheter, ägarskap, specialbitar, konton och grupper",
 brief:"Permissions are the topic students lose the most marks on. Do every step here and read the ls -l output each time.",
 tasks:[
  {q:"Lock down <code>~/id_rsa</code> so only its owner can read and write it.",
   hint:"Numeric mode: read+write for the owner, nothing for anyone else.",
   check:c => c.mode("/home/analyst/id_rsa") === 0o600},
  {q:"Make <code>~/deploy.sh</code> executable without disturbing its other bits.",
   hint:"Symbolic mode adds a single bit.",
   check:c => (c.mode("/home/analyst/deploy.sh") & 0o111) !== 0},
  {q:"Create a group called <code>projekt</code>.", hint:"Creating groups writes to /etc, so it needs root.",
   check:c => /(^|\n)projekt:/.test(c.read("/etc/group")||"")},
  {q:"Create the user <code>elev</code> <b>with a home directory</b>.",
   hint:"One option to useradd creates and populates the home directory.",
   check:c => c.isDir("/home/elev")},
  {q:"Create <code>/srv/projekt</code>, give it to <code>root:projekt</code>, and set mode <code>2775</code> so new files inherit the group.",
   hint:"Three commands: mkdir, chown user:group, chmod. All need root.",
   check:c => c.isDir("/srv/projekt") && c.group("/srv/projekt")==="projekt" && (c.mode("/srv/projekt") & 0o2777)===0o2775},
  {q:"Find every SUID binary on the system, discarding the permission errors.",
   hint:"find from /, by permission bits, with stderr sent to /dev/null.",
   check:c => c.hist.some(h => /\bfind\b/.test(h.cmd) && /2\s*>\s*\/dev\/null/.test(h.cmd) &&
     /\/opt\/legacy-helper/.test(h.out))},
  {q:"Check whether SELinux is enforcing on this machine.", hint:"One word.",
   check:c => c.said(/Enforcing/)}],
 check:[
  ["What does <code>2775</code> mean digit by digit?",
   "<code>2</code> sets SGID, then rwx for the owner, rwx for the group, r-x for others."],
  ["What does SGID do on a directory?",
   "New files inside inherit the directory's group, which is what keeps a shared project directory shared."],
  ["<code>/opt/legacy-helper</code> is SUID root. Why is that worth investigating?",
   "It runs as root no matter who launches it. An unexplained SUID root binary is a standard privilege-escalation route."]]},

{wk:37, n:4, date:"Thu 10 Sep", iso:"2026-09-10", title:"Networking, Firewalls, Subnetting, Update policy",
 topics:"Subnät, brandväggsregler, härdning, uppdateringsrutiner",
 brief:"Subnetting is arithmetic you must be able to do without a calculator. Work each answer out on paper, then echo it into the terminal to check yourself.",
 tasks:[
  {q:"How many <b>usable hosts</b> are in <code>192.168.10.0/26</code>? Answer with <code>echo &lt;number&gt;</code>.",
   hint:"64 addresses in the block, minus the network and broadcast addresses.",
   check:c => c.hist.some(h => /^\s*echo\b/.test(h.cmd) && /\b62\b/.test(h.out))},
  {q:"What is the netmask of a <code>/26</code>? Answer with <code>echo &lt;netmask&gt;</code>.",
   hint:"Two bits borrowed from the last octet.",
   check:c => c.hist.some(h => /^\s*echo\b/.test(h.cmd) && /255\.255\.255\.192/.test(h.out))},
  {q:"What is the broadcast address of <code>192.168.10.64/26</code>? Answer with <code>echo &lt;address&gt;</code>.",
   hint:"The block runs from .64 to the last address before the next block starts.",
   check:c => c.hist.some(h => /^\s*echo\b/.test(h.cmd) && /192\.168\.10\.127/.test(h.out))},
  {q:"Read <code>/etc/ssh/sshd_config</code> and confirm root login over SSH is disabled.",
   hint:"grep for the relevant directive rather than reading the whole file.",
   check:c => c.said(/PermitRootLogin no/)},
  {q:"Harden it further: change <code>PasswordAuthentication yes</code> to <code>no</code> in that file.",
   hint:"sed can edit in place with -i, and the file belongs to root.",
   check:c => /PasswordAuthentication no/.test(c.read("/etc/ssh/sshd_config")||"")},
  {q:"List the listening sockets again and note which are bound to <code>0.0.0.0</code> — those are reachable from the network.",
   hint:"The same ss command as last week.",
   check:c => c.said(/0\.0\.0\.0:22/)}],
 check:[
  ["How many usable hosts in a <code>/26</code>, and why not 64?",
   "62. The first address identifies the network and the last is the broadcast address, so neither can be given to a host."],
  ["Why is default-deny inbound the normal firewall stance?",
   "You only have to reason about what you deliberately opened, rather than enumerating everything an attacker might try."],
  ["What is the difference between a service bound to <code>127.0.0.1</code> and one bound to <code>0.0.0.0</code>?",
   "<code>127.0.0.1</code> only accepts connections from the machine itself. <code>0.0.0.0</code> accepts them from any interface — that is what the network can reach."]]},

{wk:38, n:5, date:"Mon 14 Sep", iso:"2026-09-14", title:"Boot process, systemd, cron, ssh",
 topics:"Uppstart, units, schemalagda jobb, nycklar",
 brief:"systemctl to see state, journalctl to find out why. This pair answers most 'it is broken' questions on a modern system.",
 tasks:[
  {q:"Check whether the <code>sshd</code> service is running.", hint:"The systemd control command plus the obvious sub-command.",
   check:c => c.hist.some(h => /sshd/.test(h.out) && /active \(running\)/.test(h.out))},
  {q:"List the units that have <b>failed</b>.", hint:"list-units with a long option.",
   check:c => c.hist.some(h => /--failed/.test(h.cmd) && /bluetooth/.test(h.out))},
  {q:"Start the <code>docker</code> service now <b>and</b> make it start at every boot, in one command.",
   hint:"enable handles boot; one option also starts it immediately.",
   check:c => c.unit("docker") && c.unit("docker").enabled && c.unit("docker").state==="running"},
  {q:"nginx will not start. Read its journal and find the line that explains why.",
   hint:"journalctl filtered to one unit.",
   check:c => c.said(/Address already in use/)},
  {q:"Generate an ed25519 SSH key pair.", hint:"The key generator with a type option.",
   check:c => c.isFile("/home/analyst/.ssh/id_ed25519.pub")},
  {q:"Set <code>~/.ssh</code> to the mode SSH insists on.", hint:"Full access for you, nothing for anyone else.",
   check:c => c.mode("/home/analyst/.ssh") === 0o700},
  {q:"Schedule <code>/home/analyst/backup.sh</code> to run every day at 02:00. <code>crontab -e</code> opens an editor here.",
   hint:"Five schedule fields then the command: minute hour day month weekday.",
   check:c => /(^|\n)\s*0\s+2\s+\*\s+\*\s+\*\s+\S+backup\.sh/.test(c.read("/var/spool/cron/analyst")||"")}],
 check:[
  ["What is the difference between <code>start</code> and <code>enable</code>?",
   "<code>start</code> runs it now. <code>enable</code> makes it start at boot. <code>enable --now</code> does both — and forgetting this is the classic reason a demo dies after a reboot."],
  ["What is the field order in a crontab line?",
   "minute, hour, day-of-month, month, day-of-week, then the command. Daily at 02:00 is <code>0 2 * * *</code>."],
  ["Which permissions does SSH demand on <code>~/.ssh</code> and a private key?",
   "<code>700</code> on the directory and <code>600</code> on the key, or it refuses to use them."]]},

{wk:38, n:6, date:"Thu 17 Sep", iso:"2026-09-17", title:"Logs, database, webserver, intro to security",
 topics:"Loggar, tjänster, grundläggande härdning",
 brief:"There is a real attack in this machine's auth log. Find it, count it, and identify where it came from.",
 tasks:[
  {q:"Show the last 20 lines of <code>/var/log/auth.log</code>. It needs root to read.",
   hint:"tail with a line count, behind sudo.",
   check:c => c.hist.some(h => /\btail\b/.test(h.cmd) && /Failed password/.test(h.out))},
  {q:"Count how many failed password attempts the log contains.",
   hint:"grep can count on its own with one option.",
   check:c => c.hist.some(h => /grep/.test(h.cmd) && /^\s*13\s*$/m.test(h.out))},
  {q:"Which single IP address is responsible for most of them? Pull the addresses out and rank them.",
   hint:"grep -o prints only the matching part, so grep the failures, then grep -o an IP pattern, then sort | uniq -c | sort -rn.",
   check:c => c.hist.some(h => /uniq/.test(h.cmd) && /91\.240\.118\.44/.test(h.out))},
  {q:"Start the nginx web server.", hint:"It is currently dead — and starting a service needs root.",
   check:c => c.unit("nginx") && c.unit("nginx").state==="running"},
  {q:"Confirm it answers, fetching only the response headers from <code>localhost</code>.",
   hint:"An uppercase option that means 'head'.",
   check:c => c.said(/HTTP\/1\.1 200 OK/)},
  {q:"Find which process is listening on port 80. You need root to see the process name.",
   hint:"List sockets with sudo and filter for the port.",
   check:c => c.hist.some(h => /\b(ss|netstat|lsof)\b/.test(h.cmd) && /:80\b/.test(h.out) && /nginx/.test(h.out))}],
 check:[
  ["Where do SSH authentication failures land?",
   "<code>/var/log/auth.log</code> on Debian and Ubuntu, <code>/var/log/secure</code> on RHEL. <code>journalctl -u ssh</code> works on systemd too."],
  ["Why must <code>sort</code> come before <code>uniq -c</code>?",
   "<code>uniq</code> only collapses adjacent duplicates. Unsorted input gives you nonsense counts."],
  ["What does <code>curl -I</code> do that plain <code>curl</code> does not?",
   "Sends a HEAD request — status line and headers, no body."]]},

{wk:39, n:7, date:"Mon 21 Sep", iso:"2026-09-21", title:"Backup, rsync, git, linuxadministration",
 topics:"Säkerhetskopiering, synkronisering, versionshantering",
 brief:"A backup you have never restored is not a backup. Every task here ends with proving the data came back.",
 tasks:[
  {q:"Create a gzip-compressed archive <code>~/backup.tar.gz</code> of the <code>~/projects</code> directory.",
   hint:"create, gzip, file — and f must come last, immediately before the archive name.",
   // the archive must really be gzip: leaving -z out produces a plain tar
   // wearing a .gz name, which is the mistake this task is teaching against
   check:c => { try{ return JSON.parse(c.read("/home/analyst/backup.tar.gz")).fmt === "gzip"; }
               catch(e){ return false; } }},
  {q:"Extract that archive into <code>/tmp</code> and prove the contents came back by reading <code>app.conf</code>.",
   hint:"cd there first, then extract. The compression flag must match the archive.",
   check:c => c.said(/port=8080/) && c.isFile("/tmp/projects/webshop/app.conf")},
  {q:"Sync <code>~/projects/</code> to <code>/tmp/bak</code> with rsync in archive mode, verbose.",
   hint:"Create the destination first. -a is archive mode, -v is verbose.",
   check:c => c.isFile("/tmp/bak/webshop/app.conf") || c.isFile("/tmp/bak/projects/webshop/app.conf")},
  {q:"Compute the SHA-256 checksum of your archive.", hint:"The algorithm name plus 'sum'.",
   check:c => c.hist.some(h => /sha256sum/.test(h.cmd) && /backup\.tar\.gz/.test(h.cmd) &&
     /[0-9a-f]{64}/.test(h.out))},
  {q:"Turn <code>~/projects</code> into a git repository, stage everything, and make a first commit.",
   hint:"Three commands: init, add, commit with a message.",
   check:c => c.git() && c.git().commits.length >= 1},
  {q:"Show the history, one line per commit.", hint:"log with a long option.",
   check:c => c.hist.some(h => /git\s+log/.test(h.cmd) && /--oneline/.test(h.cmd) &&
     h.code===0 && /^\w+\s+\S/m.test(h.out))}],
 check:[
  ["Why run <code>rsync --delete</code> with <code>--dry-run</code> first?",
   "<code>--delete</code> removes anything on the destination missing from the source. One wrong source path empties the backup."],
  ["What does <code>-a</code> give you in <code>rsync -av</code>?",
   "Archive mode: recursive, preserving permissions, ownership, timestamps and symlinks."],
  ["What is the difference between <code>git add</code> and <code>git commit</code>?",
   "<code>add</code> stages what you want included; <code>commit</code> records the staged set as a snapshot with a message."]]},

{wk:39, n:8, date:"Thu 24 Sep", iso:"2026-09-24", title:"Datacenter, moln, hybrid — on-prem och cloudlösningar",
 topics:"Driftsformer, ansvarsfördelning, kostnad",
 brief:"A written week. Use the terminal as your notebook: write the answers to files, which is also good practice with redirection.",
 tasks:[
  {q:"Create <code>~/cloud/ansvar.txt</code> with four lines — on-prem, IaaS, PaaS, SaaS — each naming who manages the operating system.",
   hint:"mkdir the directory, then use echo with >> to append a line at a time.",
   check:c => { const t = c.read("/home/analyst/cloud/ansvar.txt")||"";
     return /iaas/i.test(t) && /paas/i.test(t) && /saas/i.test(t) && t.trim().split("\n").length >= 4; }},
  {q:"Create <code>~/cloud/workloads.txt</code> listing three workloads from your project, each line ending in <code>on-prem</code> or <code>cloud</code>.",
   hint:"Three lines, appended one at a time.",
   check:c => { const t = c.read("/home/analyst/cloud/workloads.txt")||"";
     const ls = t.trim().split("\n").filter(Boolean);
     return ls.length >= 3 && ls.filter(l=>/on-?prem|cloud/i.test(l)).length >= 3; }},
  {q:"Add a line to <code>~/cloud/rto.txt</code> defining an RTO and an RPO for one service, in concrete numbers.",
   hint:"Something like: webshop RTO 4h RPO 24h.",
   check:c => { const t = c.read("/home/analyst/cloud/rto.txt")||"";
     return /rto/i.test(t) && /rpo/i.test(t) && /\d/.test(t); }},
  {q:"Read your three files back in one command to check them over.",
   hint:"cat accepts more than one filename, and a glob saves typing.",
   check:c => c.hist.some(h => /^\s*cat\b/.test(h.cmd) && /rto/i.test(h.out) && /iaas/i.test(h.out))}],
 check:[
  ["Under IaaS, who patches the operating system?",
   "You do. The provider stops at the virtual hardware. Under PaaS they take the OS and runtime as well."],
  ["What is the difference between RTO and RPO?",
   "RTO is how long you may take to come back. RPO is how much data you may lose — which is a statement about backup frequency."],
  ["Name one cloud cost people forget.",
   "Egress. Data in is usually free; data out, or between regions, is billed."]]},

{wk:40, n:9, date:"Thu 1 Oct", iso:"2026-10-01", title:"Logging and Auditing, setting up Python",
 topics:"Journalen, revision, Python-miljö",
 brief:"Finish the logging half, then check the Python toolchain works — everything from here on needs it.",
 tasks:[
  {q:"Show journal entries of priority error or worse.", hint:"One option filters by priority.",
   check:c => c.said(/Address already in use/) && c.hist.some(h=>/journalctl/.test(h.cmd) && /-p/.test(h.cmd))},
  {q:"Show the last 5 journal entries for the <code>sshd</code> unit.",
   hint:"Filter by unit and limit the number of lines.",
   check:c => c.hist.some(h => /journalctl/.test(h.cmd) && /-u\s*sshd/.test(h.cmd) &&
     /-n/.test(h.cmd) && /sshd/.test(h.out))},
  {q:"Read the audit rules in <code>/etc/audit/audit.rules</code> and note which files are watched.",
   hint:"cat is enough.", check:c => c.said(/-w \/etc\/shadow/)},
  {q:"Read <code>/etc/logrotate.conf</code> and note how many old copies are kept.",
   hint:"Look for the rotate line.", check:c => c.said(/rotate 4/)},
  {q:"Confirm which Python version this machine has.", hint:"A capital V, or the long option.",
   check:c => c.said(/Python 3\./)},
  {q:"Write <code>~/py/hello.py</code> that prints one line, then run it. Use <code>edit ~/py/hello.py</code> to open the editor.",
   hint:"mkdir -p ~/py first. Then edit, write your code, Save, and run it with python3.",
   check:c => c.isFile("/home/analyst/py/hello.py") &&
     c.hist.some(h => /python3?\s+.*hello\.py/.test(h.cmd) && h.code===0 && h.out.trim().length>0)}],
 check:[
  ["What is the difference between logging and auditing?",
   "Logging records what the system did, for troubleshooting. Auditing records who did what, for accountability."],
  ["What does <code>journalctl -b</code> limit you to?",
   "The current boot. <code>-b -1</code> is the previous one — where you look after an unexpected reboot."],
  ["Why use a virtual environment?",
   "It keeps a project's dependencies separate and stops pip fighting your distribution's package manager."]]},

{wk:41, n:10, date:"Mon 5 Oct", iso:"2026-10-05", title:"Introduction to Python 1",
 topics:"Variabler, typer, aritmetik, boolesk logik, strängar, utskrift",
 brief:"Write each script with <code>edit &lt;file&gt;</code>, save it, then run it with <code>python3 &lt;file&gt;</code>. The checks below run your file and read its output.",
 tasks:[
  {q:"Write <code>~/py/types.py</code> that creates one int, one float, one str and one bool, and prints each value together with its <code>type(x).__name__</code>.",
   hint:"print(x, type(x).__name__) — four times, or in a loop.",
   check:c => { const r = c.py("/home/analyst/py/types.py");
     return /\bint\b/.test(r.out) && /\bfloat\b/.test(r.out) && /\bstr\b/.test(r.out) && /\bbool\b/.test(r.out); }},
  {q:"Write <code>~/py/greet.py</code> that stores a name and an age in variables and prints one sentence with an <b>f-string</b> containing both.",
   hint:'print(f"{name} is {age}")',
   check:c => { const src = c.read("/home/analyst/py/greet.py")||"";
     const r = c.py("/home/analyst/py/greet.py");
     return /f["']/.test(src) && r.out.trim().length > 3 && /\d/.test(r.out); }},
  {q:"Write <code>~/py/division.py</code> that prints the results of <code>7 / 2</code>, <code>7 // 2</code> and <code>7 % 2</code>, one per line.",
   hint:"Three print statements. Notice which one gives you a float.",
   check:c => { const r = c.py("/home/analyst/py/division.py");
     return /3\.5/.test(r.out) && /(^|\n)\s*3\s*(\n|$)/.test(r.out) && /(^|\n)\s*1\s*(\n|$)/.test(r.out); }},
  {q:"Write <code>~/py/strings.py</code> that takes the string <code>\"  Hello World  \"</code> and prints it stripped, in upper case, and split into a list of words.",
   hint:".strip(), .upper() and .split() — they can be chained.",
   check:c => { const r = c.py("/home/analyst/py/strings.py");
     return /HELLO WORLD/.test(r.out) && /\['Hello', 'World'\]/.test(r.out); }},
  {q:"Write <code>~/py/logic.py</code> that prints the result of an <code>and</code>, an <code>or</code> and a <code>not</code> expression.",
   hint:"print(True and False) and so on — Python prints True and False capitalised.",
   check:c => { const r = c.py("/home/analyst/py/logic.py");
     return /True/.test(r.out) && /False/.test(r.out); }}],
 check:[
  ["What type does <code>input()</code> always return?",
   "<code>str</code>, even when the user types digits. Wrap it in <code>int()</code> before doing arithmetic."],
  ["Why does <code>4 / 2</code> print <code>2.0</code> rather than <code>2</code>?",
   "<code>/</code> is true division and always produces a float. <code>//</code> gives you the integer."],
  ["What happens with <code>\"5\" + 5</code>?",
   "A TypeError. Python will not silently mix a string and an int — convert one first."]]},

{wk:41, n:11, date:"Thu 8 Oct", iso:"2026-10-08", title:"Introduction to Python 2",
 topics:"Listor, dictionaries, sets, if/then, loopar, funktioner",
 brief:"The four containers and the three control structures. Everything you write from here uses these.",
 tasks:[
  {q:"Write <code>~/py/lista.py</code> that builds a list of five usernames, appends one, sorts it, and prints the sorted list.",
   hint:".append() then .sort(), then print the list itself.",
   check:c => { const r = c.py("/home/analyst/py/lista.py");
     const m = r.out.match(/\[[^\]]*\]/);
     if(!m) return false;
     const items = m[0].slice(1,-1).split(",").map(s=>s.trim().replace(/^'|'$/g,""));
     return items.length >= 6 && items.slice().sort().join()===items.join(); }},
  {q:"Write <code>~/py/dict.py</code> that builds a dictionary of username to UID, then loops over <code>.items()</code> printing one line per pair.",
   hint:"for k, v in d.items(): print(k, v)",
   check:c => { const src = c.read("/home/analyst/py/dict.py")||"";
     const r = c.py("/home/analyst/py/dict.py");
     return /\.items\(\)/.test(src) && r.out.trim().split("\n").length >= 2; }},
  {q:"Write <code>~/py/safe.py</code> that looks up a key which does not exist using <code>.get()</code> with a default, and prints the default instead of crashing.",
   hint:"d.get('nope', 0) — no KeyError.",
   check:c => { const src = c.read("/home/analyst/py/safe.py")||"";
     const r = c.py("/home/analyst/py/safe.py");
     return /\.get\(/.test(src) && r.code===0 && r.out.trim().length>0; }},
  {q:"Write <code>~/py/unika.py</code> that reduces a list of IP addresses containing duplicates to unique values with a <code>set</code>, and prints how many are left.",
   hint:"len(set(ips))",
   check:c => { const src = c.read("/home/analyst/py/unika.py")||"";
     const r = c.py("/home/analyst/py/unika.py");
     return /set\(/.test(src) && /\d/.test(r.out); }},
  {q:"Write <code>~/py/betyg.py</code> with a function <code>grade(score)</code> using if/elif/else, and print the grade for three different scores.",
   hint:"def grade(score): ... return — then call it three times.",
   check:c => { const src = c.read("/home/analyst/py/betyg.py")||"";
     const r = c.py("/home/analyst/py/betyg.py");
     return /def\s+grade/.test(src) && /elif/.test(src) && r.out.trim().split("\n").length >= 3; }},
  {q:"Write <code>~/py/jamna.py</code> that loops over <code>range(1, 11)</code> and prints only the even numbers.",
   hint:"if i % 2 == 0",
   check:c => { const r = c.py("/home/analyst/py/jamna.py");
     return r.out.replace(/\s+/g," ").trim() === "2 4 6 8 10"; }}],
 check:[
  ["When would you choose a set over a list?",
   "When you only care about uniqueness and membership, not order or duplicates."],
  ["Why prefer <code>d.get(key)</code> over <code>d[key]</code>?",
   "<code>[ ]</code> raises KeyError on a missing key; <code>.get()</code> returns None, or a default you supply."],
  ["What does a function return with no <code>return</code> statement?",
   "<code>None</code> — a common surprise when you print the result of a function that only prints."]]},

{wk:42, n:12, date:"Mon 12 Oct", iso:"2026-10-12", title:"Introduction to Python 3 — files",
 topics:"Läsa och skriva filer, felhantering",
 brief:"Files are where Python meets the sysadmin work from the first half of the course. The machine's real log files are here to practise on.",
 tasks:[
  {q:"Write <code>~/py/skriv.py</code> that uses <code>with open(...)</code> to write five lines to <code>/tmp/rader.txt</code>.",
   hint:'with open("/tmp/rader.txt", "w") as f: — then f.write("...\\n") five times, or a loop.',
   check:c => { c.py("/home/analyst/py/skriv.py");
     return (c.read("/tmp/rader.txt")||"").trim().split("\n").length >= 5; }},
  {q:"Write <code>~/py/las.py</code> that reads that file back line by line and prints each line <b>without</b> the trailing newline.",
   hint:"for line in f: print(line.strip())",
   check:c => { const src = c.read("/home/analyst/py/las.py")||"";
     const r = c.py("/home/analyst/py/las.py");
     return /strip\(\)/.test(src) && !/\n\n/.test(r.out) && r.out.trim().split("\n").length >= 5; }},
  {q:"Write <code>~/py/rakna.py</code> that counts how many lines in <code>/var/log/app.log</code> contain <code>ERROR</code> and prints just the number. This is grep, in Python.",
   hint:'if "ERROR" in line: n += 1',
   check:c => { const r = c.py("/home/analyst/py/rakna.py");
     return /(^|\D)2(\D|$)/.test(r.out.trim()); }},
  {q:"Write <code>~/py/passwd.py</code> that reads <code>/etc/passwd</code>, splits each line on <code>:</code>, and prints the username and login shell of every account.",
   hint:'parts = line.strip().split(":") then print(parts[0], parts[6])',
   check:c => { const r = c.py("/home/analyst/py/passwd.py");
     return /analyst/.test(r.out) && /\/bin\/bash/.test(r.out) && /root/.test(r.out); }},
  {q:"Write <code>~/py/saker.py</code> that tries to open a file which does not exist and handles the error with try/except instead of crashing.",
   hint:"except FileNotFoundError: — and print something friendly.",
   check:c => { const src = c.read("/home/analyst/py/saker.py")||"";
     const r = c.py("/home/analyst/py/saker.py");
     return /except/.test(src) && r.code===0 && r.out.trim().length>0; }}],
 check:[
  ["Why open files with <code>with</code>?",
   "It closes the file for you even if an exception is raised part-way through, so buffered writes are not lost."],
  ["What is the difference between mode <code>\"w\"</code> and <code>\"a\"</code>?",
   "<code>\"w\"</code> truncates the file to empty first; <code>\"a\"</code> appends. Choosing wrong destroys the file."],
  ["Which exception does opening a missing file raise?",
   "<code>FileNotFoundError</code>. Catch that specifically rather than a bare <code>except:</code>."]]},

{wk:42, n:13, date:"Thu 15 Oct", iso:"2026-10-15", title:"Repetition och tentaförberedelse",
 topics:"Genomgång inför tentan — börjar 10:00",
 brief:"A mixed set drawn from the whole course, with no hints pointing at a single command. If one of these stalls you, go back to that week's lab.",
 tasks:[
  {q:"Find every <code>.conf</code> file anywhere under <code>/home/analyst</code>.",
   hint:"find, starting at a path, filtered by name. Quote the pattern.",
   check:c => c.said(/app\.conf/) && c.hist.some(h=>/^\s*find\b/.test(h.cmd))},
  {q:"Count how many accounts in <code>/etc/passwd</code> use <code>/bin/bash</code> as their shell.",
   hint:"grep with a counting option, or grep into wc -l.",
   check:c => c.hist.some(h => /passwd/.test(h.cmd) && /(^|\n)\s*2\s*(\n|$)/.test(h.out))},
  {q:"Produce a ranked count of the HTTP status codes in <code>/var/log/access.log</code>.",
   hint:"awk to pull the status column, then sort | uniq -c | sort -rn.",
   check:c => c.hist.some(h => /uniq/.test(h.cmd) && /200/.test(h.out) && /404/.test(h.out))},
  {q:"Set <code>~/reports</code> so that only you can enter or read it.",
   hint:"Numeric mode: everything for the owner, nothing for anyone else.",
   check:c => c.mode("/home/analyst/reports") === 0o700},
  {q:"Save the output of <code>ls -la /etc</code> into <code>~/etc-listing.txt</code>, then confirm how many lines it has.",
   hint:"Redirect with >, then wc -l the file.",
   check:c => c.isFile("/home/analyst/etc-listing.txt") &&
     c.hist.some(h => /wc\s+-l/.test(h.cmd) && /etc-listing/.test(h.cmd))},
  {q:"Write <code>~/py/sammanfatta.py</code> that reads <code>/var/log/access.log</code> and prints how many lines it contains.",
   hint:"Open the file, loop, count. Or read it and count the lines in the result.",
   check:c => { const r = c.py("/home/analyst/py/sammanfatta.py");
     return /40/.test(r.out); }}],
 check:[
  ["What is the best use of your last few days?",
   "Retrieval practice, not re-reading. Close the notes and try to produce the command — that is what the exam asks for."],
  ["Which topics carry the most weight across this course?",
   "Permissions, systemd, the networking basics and the pipes-and-redirection toolkit. They reappear in every later week, including the Python file handling."]]}
]; }

/* A worked answer for every task, shown by the "show answer" button and
   used by test/solutions.js — so what a student is shown is exactly what
   the test proves works. A string is a command; {edit, body} is a file
   written through the editor pane. */
const LAB_ANSWERS = {
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
 "5:6": [{edit:"/var/spool/cron/analyst", open:"crontab -e", body:"# m h dom mon dow  command\n0 2 * * * /home/analyst/backup.sh\n"}],

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

 "10:0": ["mkdir -p ~/py", {edit:"/home/analyst/py/types.py", body:
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

 "11:0": ["mkdir -p ~/py", {edit:"/home/analyst/py/lista.py", body:
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

 "12:0": ["mkdir -p ~/py", {edit:"/home/analyst/py/skriv.py", body:
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
 "13:5": ["mkdir -p ~/py", {edit:"/home/analyst/py/sammanfatta.py", body:
   'n = 0\nwith open("/var/log/access.log") as f:\n    for line in f:\n        n += 1\nprint(n)\n'},
   "python3 ~/py/sammanfatta.py"]
};

// const does not escape an eval, so the node test suite needs this handle
if (typeof globalThis !== "undefined") globalThis.LAB_ANSWERS = LAB_ANSWERS;
