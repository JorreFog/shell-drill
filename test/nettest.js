/* Tests for the simulated network: the commands must agree with each other and
   with the firewall, because a lab that checks machine state is only as honest
   as the state. Plain node, no dependencies, same shape as vmtest.js. */
const fs = require('fs'), path = require('path');
const base = path.join(__dirname, '..', 'src');
const read = f => fs.readFileSync(path.join(base, f), 'utf8');

/* the engine files the network needs, minus anything that touches the DOM */
eval(read('vm-core.js') + read('vm-cmds.js') + read('vm-seed.js') + read('pv-05-net.js'));
eval(read('pv-06-netlab.js').replace(/^if\(typeof attachPython[\s\S]*?\n}\n/m, ''));

let pass = 0, fail = 0;
function check(name, got, want){
  const g = String(got), w = String(want);
  if(g === w || (want instanceof RegExp && want.test(g))) { pass++; return; }
  fail++;
  console.log('FAIL ' + name + '\n  got:  ' + JSON.stringify(g).slice(0, 220) +
              '\n  want: ' + String(want).slice(0, 220));
}
function ok(name, cond){ if(cond) pass++; else { fail++; console.log('FAIL ' + name); } }

const fresh = () => attachNet(seedVM(attachShell(makeVM())));
const run = (K, line) => K.run(line);
const out = (K, line) => run(K, line).out;

/* ---------------- addressing ---------------- */
{
  const K = fresh();
  check('ip a shows our address',      out(K,'ip a'), /inet 10\.0\.0\.10\/24/);
  check('ip a shows loopback',         out(K,'ip a'), /127\.0\.0\.1\/8/);
  check('ip r shows a default route',  out(K,'ip r'), /default via 10\.0\.0\.1/);
  check('ip link has the mac',         out(K,'ip link'), /52:54:00:9d:2b:1a/);
  check('ifconfig agrees with ip',     out(K,'ifconfig'), /inet 10\.0\.0\.10/);
  check('unknown ip object errors',    run(K,'ip frobnicate').code, 1);
}

/* ---------------- ping ---------------- */
{
  const K = fresh();
  check('ping a live host',        out(K,'ping -c 2 10.0.0.20'), /2 received, 0% packet loss/);
  check('ping resolves a name',    out(K,'ping -c 1 srv-web'), /PING srv-web \(10\.0\.0\.20\)/);
  check('ping honours -c',         (out(K,'ping -c 3 10.0.0.20').match(/icmp_seq=/g)||[]).length, 3);
  check('ping a host that is off', out(K,'ping -c 1 10.0.0.41'), /100% packet loss/);
  check('host that is off is unreachable', out(K,'ping -c 1 10.0.0.41'), /Destination Host Unreachable/);
  check('ping empty address in subnet', out(K,'ping -c 1 10.0.0.77'), /0 received/);
  check('ping unknown name fails', run(K,'ping nosuchhost').code, 1);
  ok('ping populates the arp cache', /10\.0\.0\.20/.test(out(K,'arp -a')));
}

/* ---------------- scanning ---------------- */
{
  const K = fresh();
  const sweep = out(K,'nmap -sn 10.0.0.0/24');
  ['10.0.0.1','10.0.0.10','10.0.0.20','10.0.0.21','10.0.0.22','10.0.0.30','10.0.0.99']
    .forEach(ip => ok('sweep finds ' + ip, sweep.includes(ip)));
  ok('sweep omits the host that is off', !sweep.includes('10.0.0.41'));
  check('sweep counts the hosts',      sweep, /7 hosts up/);

  const one = out(K,'nmap 10.0.0.22');
  check('port scan lists ftp',   one, /21\/tcp\s+open\s+ftp/);
  check('port scan lists samba', one, /445\/tcp\s+open/);
  check('-sV adds versions',     out(K,'nmap -sV 10.0.0.20'), /nginx 1\.24\.0/);
  check('the rogue host runs telnet', out(K,'nmap -sV 10.0.0.99'), /23\/tcp\s+open\s+telnet/);
  check('scanning a dead host',  out(K,'nmap 10.0.0.41'), /Host seems down/);
}

/* ---------------- name resolution ---------------- */
{
  const K = fresh();
  check('dig +short',        out(K,'dig +short srv-db.lan'), '10.0.0.21\n');
  check('dig full answer',   out(K,'dig srv-web.lan'), /ANSWER SECTION/);
  check('dig unknown name',  out(K,'dig nope.lan'), /NXDOMAIN/);
  check('host by name',      out(K,'host srv-files.lan'), /has address 10\.0\.0\.22/);
  check('host reverse',      out(K,'host 10.0.0.20'), /srv-web\.lan/);
}

/* ---------------- tcp reachability ---------------- */
{
  const K = fresh();
  check('nc to an open port',   run(K,'nc -zv srv-web 80').err, /succeeded/);
  check('open port exits zero', run(K,'nc -zv srv-web 80').code, 0);
  check('nc to a closed port',  run(K,'nc -zv srv-web 8080').err, /Connection refused/);
  check('nc to a host that is off', run(K,'nc -zv 10.0.0.41 22').err, /refused/);
  check('curl fetches a page',  out(K,'curl http://srv-web'), /Internal web/);
  check('curl -I shows headers',out(K,'curl -I http://srv-web'), /Server: nginx\/1\.24\.0/);
  check('curl a port with no service', run(K,'curl http://srv-db').err, /refused/);
  check('curl the printer',     out(K,'curl http://10.0.0.30'), /password/i);
}

/* ---------------- listening sockets ---------------- */
{
  const K = fresh();
  check('ss -tulpn lists sshd', out(K,'ss -tulpn'), /sshd/);
  check('ss shows the ssh port', out(K,'ss -tulpn'), /0\.0\.0\.0:22/);
  check('cups is bound to loopback only', out(K,'ss -tulpn'), /127\.0\.0\.1:631/);
  check('netstat is the same view', out(K,'netstat -tulpn'), /sshd/);
}

/* ---------------- the firewall actually filters ---------------- */
{
  const K = fresh();
  check('ufw needs root',        run(K,'ufw status').err, /need to be root/);
  check('status starts inactive',out(K,'sudo ufw status'), /Status: inactive/);

  run(K,'sudo ufw enable');
  check('status turns active',   out(K,'sudo ufw status'), /Status: active/);
  check('an enabled firewall still allows by default',
        out(K,'ping -c 1 10.0.0.99'), /1 received/);

  run(K,'sudo ufw deny out to 10.0.0.99');
  check('the denied host is blocked', run(K,'ping -c 1 10.0.0.99').err, /not permitted/);
  check('blocking sets a non-zero exit', run(K,'ping -c 1 10.0.0.99').code, 2);
  check('other hosts still answer',   out(K,'ping -c 1 10.0.0.20'), /1 received/);
  check('the rule shows in status',   out(K,'sudo ufw status'), /10\.0\.0\.99/);
  check('nc to the blocked host',     run(K,'nc -zv 10.0.0.99 23').err, /not permitted/);
  check('curl to the blocked host',   run(K,'curl http://10.0.0.99:8080').err, /not permitted/);
  check('a blocked host drops out of the sweep',
        out(K,'nmap -sn 10.0.0.0/24').includes('10.0.0.99'), 'false');
  check('iptables shows the same rule', out(K,'sudo iptables -L'), /DROP/);

  run(K,'sudo ufw reset');
  check('reset clears the rules',  out(K,'sudo ufw status'), /Status: inactive/);
  check('and the host answers again', out(K,'ping -c 1 10.0.0.99'), /1 received/);
}

/* port-scoped rules must not block unrelated traffic */
{
  const K = fresh();
  run(K,'sudo ufw enable');
  run(K,'sudo ufw deny out 23');
  check('the named port is blocked',  run(K,'nc -zv 10.0.0.99 23').err, /not permitted/);
  check('another port on the same host is not',
        run(K,'nc -zv 10.0.0.99 8080').err, /succeeded/);
  check('icmp is unaffected by a port rule', out(K,'ping -c 1 10.0.0.99'), /1 received/);
}

/* ---------------- the lab's own checks ---------------- */
{
  /* every task must be solvable by its own listed answer, and must not already
     pass on an untouched machine — the same contract test/solutions.js enforces
     for the published labs */
  const K = fresh();
  NETLAB.tasks.forEach((task, i) => {
    let passesEarly = false;
    try{ passesEarly = !!task.check(K); }catch(e){}
    ok('task ' + (i+1) + ' does not pass untouched', !passesEarly);
  });

  const K2 = fresh();
  NETLAB.tasks.forEach((task, i) => {
    task.answer.forEach(line => run(K2, line));
    let solved = false;
    try{ solved = !!task.check(K2); }catch(e){ solved = false; }
    ok('task ' + (i+1) + ' is solved by its own answer', solved);
  });

  /* and the near miss: the sweep must not accept a list that includes the host
     which is switched off, since that would mean the student invented it */
  const K3 = fresh();
  run(K3, 'mkdir -p ~/net');
  run(K3, 'printf "10.0.0.1\\n10.0.0.10\\n10.0.0.20\\n10.0.0.21\\n10.0.0.22\\n10.0.0.30\\n10.0.0.99\\n10.0.0.41\\n" > ~/net/hosts.txt');
  ok('the sweep rejects a list with the host that is off', !NETLAB.tasks[1].check(K3));

  const K4 = fresh();
  run(K4, 'mkdir -p ~/net');
  run(K4, 'echo 10.0.0.1 > ~/net/hosts.txt');
  ok('the sweep rejects an incomplete list', !NETLAB.tasks[1].check(K4));

  /* blocking the wrong host must not satisfy the firewall task */
  const K5 = fresh();
  run(K5, 'sudo ufw enable');
  run(K5, 'sudo ufw deny out to 10.0.0.20');
  ok('blocking the wrong host does not count', !NETLAB.tasks[3].check(K5));

  /* a rule added without enabling the firewall must not count either */
  const K6 = fresh();
  run(K6, 'sudo ufw deny out to 10.0.0.99');
  ok('a rule with the firewall off does not count', !NETLAB.tasks[3].check(K6));
}

/* ---------------- the network survives normal shell use ---------------- */
{
  const K = fresh();
  run(K, 'mkdir -p ~/net');
  run(K, 'nmap -sn 10.0.0.0/24 > ~/net/scan.txt');
  check('redirection captures a scan',
        out(K, 'grep -c "Nmap scan report" ~/net/scan.txt'), /^7\n$/);
  check('a scan can be piped',
        out(K, 'nmap -sV 10.0.0.99 | grep telnet'), /telnet/);
  check('command substitution reaches the network',
        out(K, 'echo "self is $(dig +short workstation-07.lan)"'), /self is 10\.0\.0\.10/);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
