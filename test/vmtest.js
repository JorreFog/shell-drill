/* Exercise the simulated machine the way a student would. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'src');
const load = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(load('vm-core.js') + load('vm-cmds.js') + load('vm-seed.js'));

let pass = 0, fail = 0;
function fresh(){ const K = attachShell(makeVM()); seedVM(K); return K; }

function t(name, fn){
  try { fn(); pass++; }
  catch(e){ fail++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}
const eq = (got, want, what) => {
  if (got !== want) throw new Error((what||'') + '\n      got:  ' + JSON.stringify(got) +
                                    '\n      want: ' + JSON.stringify(want));
};
const has = (got, sub, what) => {
  if (!String(got).includes(sub)) throw new Error((what||'') + '\n      got: ' + JSON.stringify(String(got).slice(0,200)) +
                                                  '\n      expected to contain: ' + JSON.stringify(sub));
};

/* ---------- navigation ---------- */
t('pwd starts at home', () => { const K = fresh(); eq(K.run('pwd').out, '/home/analyst\n'); });
t('cd absolute + pwd', () => { const K = fresh(); K.run('cd /etc'); eq(K.run('pwd').out, '/etc\n'); });
t('cd .. goes up', () => { const K = fresh(); K.run('cd /etc/ssh'); K.run('cd ..'); eq(K.run('pwd').out, '/etc\n'); });
t('cd - toggles back', () => { const K = fresh(); K.run('cd /etc'); K.run('cd /tmp'); K.run('cd -');
  eq(K.run('pwd').out, '/etc\n'); });
t('cd with no arg goes home', () => { const K = fresh(); K.run('cd /etc'); K.run('cd'); eq(K.run('pwd').out, '/home/analyst\n'); });
t('cd into a missing dir errors', () => { const K = fresh(); const r = K.run('cd /nope');
  has(r.err, 'No such file or directory'); eq(r.code, 1); });
t('~ expands', () => { const K = fresh(); K.run('cd /etc'); K.run('cd ~/projects'); eq(K.run('pwd').out, '/home/analyst/projects\n'); });

/* ---------- listing ---------- */
t('ls hides dotfiles, -a shows them', () => { const K = fresh();
  const plain = K.run('ls').out, all = K.run('ls -a').out;
  if (plain.includes('.bashrc')) throw new Error('ls showed a dotfile');
  has(all, '.bashrc'); });
t('ls -l shows mode, owner, group', () => { const K = fresh();
  const out = K.run('ls -l notes.txt').out;
  has(out, '-rw-r--r--'); has(out, 'analyst'); });
t('ls -la combined works', () => { const K = fresh(); has(K.run('ls -la').out, '.bashrc'); });
t('ls on missing path errors', () => { const K = fresh();
  has(K.run('ls /nope').err, 'No such file or directory'); });

/* ---------- create / copy / move / delete ---------- */
t('mkdir -p builds a tree', () => { const K = fresh();
  K.run('mkdir -p kurs/v36/lab1');
  if (!K.vm && !K.exists) {} // guard
  has(K.run('ls kurs/v36').out, 'lab1'); });
t('mkdir without -p fails on missing parent', () => { const K = fresh();
  has(K.run('mkdir a/b/c').err, 'No such file or directory'); });
t('touch creates an empty file', () => { const K = fresh();
  K.run('touch a.txt'); has(K.run('ls').out, 'a.txt'); eq(K.run('cat a.txt').out, ''); });
t('touch multiple files', () => { const K = fresh();
  K.run('touch a.txt b.txt c.txt');
  const o = K.run('ls').out; has(o,'a.txt'); has(o,'b.txt'); has(o,'c.txt'); });
t('cp copies content', () => { const K = fresh();
  K.run('cp notes.txt copy.txt'); eq(K.run('cat copy.txt').out, K.run('cat notes.txt').out); });
t('cp into a directory keeps the name', () => { const K = fresh();
  K.run('cp notes.txt /tmp'); has(K.run('ls /tmp').out, 'notes.txt'); });
t('cp of a directory needs -r', () => { const K = fresh();
  has(K.run('cp projects /tmp/p').err, 'omitting directory'); });
t('cp -r copies a tree', () => { const K = fresh();
  K.run('cp -r projects /tmp'); has(K.run('ls /tmp/projects/webshop').out, 'index.html'); });
t('mv renames', () => { const K = fresh();
  K.run('mv notes.txt renamed.txt');
  has(K.run('ls').out, 'renamed.txt');
  has(K.run('ls').out.includes('notes.txt') ? 'still there' : 'gone', 'gone'); });
t('rm deletes a file', () => { const K = fresh();
  K.run('rm temp.log'); has(K.run('ls').out.includes('temp.log') ? 'still' : 'gone', 'gone'); });
t('rm on a directory needs -r', () => { const K = fresh();
  has(K.run('rm cache').err, 'Is a directory'); });
t('rm -rf removes a tree', () => { const K = fresh();
  K.run('rm -rf cache'); has(K.run('ls').out.includes('cache') ? 'still' : 'gone', 'gone'); });
t('rmdir refuses a non-empty dir', () => { const K = fresh();
  has(K.run('rmdir cache').err, 'Directory not empty'); });
t('rmdir removes an empty dir', () => { const K = fresh();
  K.run('rmdir scratch'); has(K.run('ls').out.includes('scratch') ? 'still' : 'gone', 'gone'); });
t('ln -s creates a symlink shown by ls -l', () => { const K = fresh();
  K.run('ln -s /var/log/syslog ~/syslog');
  has(K.run('ls -l syslog').out, '-> /var/log/syslog'); });
t('reading through a symlink works', () => { const K = fresh();
  K.run('ln -s /var/log/syslog ~/syslog');
  has(K.run('cat syslog').out, 'systemd'); });

/* ---------- reading ---------- */
t('cat prints a file', () => { const K = fresh(); has(K.run('cat /etc/hostname').out, 'workstation-07'); });
t('cat on a missing file errors', () => { const K = fresh();
  has(K.run('cat /etc/nope').err, 'No such file or directory'); });
t('head -n 3', () => { const K = fresh();
  eq(K.run('head -n 3 /var/log/access.log').out.split('\n').filter(Boolean).length, 3); });
t('head -3 shorthand', () => { const K = fresh();
  eq(K.run('head -3 /var/log/access.log').out.split('\n').filter(Boolean).length, 3); });
t('tail -n 2 returns the last lines', () => { const K = fresh();
  const all = K.run('cat /var/log/app.log').out.trim().split('\n');
  eq(K.run('tail -n 2 /var/log/app.log').out.trim().split('\n')[1], all[all.length-1]); });
t('wc -l counts lines', () => { const K = fresh();
  eq(K.run('wc -l /var/log/access.log').out.trim().split(/\s+/)[0], '40'); });

/* ---------- search ---------- */
t('grep finds matching lines', () => { const K = fresh();
  has(K.run('grep ERROR /var/log/app.log').out, 'failed to connect'); });
t('grep -i is case-insensitive', () => { const K = fresh();
  // ERROR twice, plus the mixed-case "Error timeout" line
  const n = K.run('grep -i error /var/log/app.log').out.trim().split('\n').length;
  if (n !== 3) throw new Error('expected 3 case-insensitive matches, got ' + n); });
t('grep -c counts', () => { const K = fresh();
  eq(K.run('grep -c ERROR /var/log/app.log').out, '2\n'); });
t('grep -n adds line numbers', () => { const K = fresh();
  has(K.run('grep -n ERROR /var/log/app.log').out, '2:'); });
t('grep -r searches a tree and prefixes paths', () => { const K = fresh();
  has(K.run('grep -r Port /etc/ssh').out, '/etc/ssh/sshd_config:'); });
t('grep on a directory without -r errors', () => { const K = fresh();
  has(K.run('grep Port /etc/ssh').err, 'Is a directory'); });
t('find -name with a glob', () => { const K = fresh();
  has(K.run('find /home/analyst -name "*.tmp"').out, 'tmp1.tmp'); });
t('find -type d', () => { const K = fresh();
  const o = K.run('find /home/analyst -type d').out;
  has(o, '/home/analyst/projects');
  if (o.includes('notes.txt')) throw new Error('-type d returned a file'); });
t('find -perm -4000 finds suid', () => { const K = fresh();
  const o = K.run('find / -perm -4000').out;
  has(o, '/usr/bin/passwd'); has(o, '/opt/legacy-helper'); });
t('find -delete removes matches', () => { const K = fresh();
  K.run('find /home/analyst -name "*.tmp" -delete');
  eq(K.run('find /home/analyst -name "*.tmp"').out, ''); });
t('which resolves a known command', () => { const K = fresh();
  eq(K.run('which grep').out, '/usr/bin/grep\n'); });

/* ---------- pipes, redirection, globs ---------- */
t('pipe feeds the next command', () => { const K = fresh();
  eq(K.run('cat /var/log/app.log | grep -c ERROR').out, '2\n'); });
t('multi-stage pipe', () => { const K = fresh();
  const o = K.run('cat ~/hosts.txt | sort | uniq -c | sort -rn').out;
  has(o, 'web01'); eq(o.trim().split('\n')[0].trim().split(/\s+/)[0], '3'); });
t('> writes and truncates', () => { const K = fresh();
  K.run('ls > files.txt'); has(K.run('cat files.txt').out, 'notes.txt');
  K.run('echo hi > files.txt'); eq(K.run('cat files.txt').out, 'hi\n'); });
t('>> appends', () => { const K = fresh();
  K.run('echo one > f.txt'); K.run('echo two >> f.txt'); eq(K.run('cat f.txt').out, 'one\ntwo\n'); });
t('2>/dev/null discards errors', () => { const K = fresh();
  const r = K.run('cat /etc/nope 2>/dev/null'); eq(r.err, ''); });
t('2>&1 folds stderr into stdout', () => { const K = fresh();
  const r = K.run('cat /etc/nope 2>&1'); eq(r.err, ''); has(r.out, 'No such file'); });
t('glob expands', () => { const K = fresh();
  K.run('cd cache'); has(K.run('ls *.tmp').out, 'tmp1.tmp'); });
t('quoted glob is not expanded by the shell', () => { const K = fresh();
  has(K.run('find /home/analyst -name "*.tmp"').out, 'tmp1.tmp'); });
t('&& chains on success', () => { const K = fresh();
  const r = K.run('mkdir demo && cd demo && pwd'); has(r.out, '/home/analyst/demo'); });
t('&& stops on failure', () => { const K = fresh();
  const r = K.run('cd /nope && pwd');
  if (r.out.includes('/home')) throw new Error('second command ran after a failure'); });
t('tee writes and passes through', () => { const K = fresh();
  const r = K.run('echo hello | tee out.txt'); eq(r.out, 'hello\n'); eq(K.run('cat out.txt').out, 'hello\n'); });
t('xargs turns lines into arguments', () => { const K = fresh();
  K.run('find /home/analyst -name "*.tmp" | xargs rm');
  eq(K.run('find /home/analyst -name "*.tmp"').out, ''); });

/* ---------- text tools ---------- */
t('cut -d: -f1 on /etc/passwd', () => { const K = fresh();
  const o = K.run('cut -d: -f1 /etc/passwd').out; has(o, 'root'); has(o, 'analyst');
  if (o.includes('/bin/bash')) throw new Error('cut returned the whole line'); });
t('awk prints the first column', () => { const K = fresh();
  const o = K.run("awk '{print $1}' /var/log/access.log").out;
  has(o, '10.0.0.24'); if (o.includes('GET')) throw new Error('awk returned more than $1'); });
t('awk -F: works like cut', () => { const K = fresh();
  has(K.run("awk -F: '{print $1}' /etc/passwd").out, 'analyst'); });
t('sed substitutes', () => { const K = fresh();
  const o = K.run("sed 's/http/https/g' urls.txt").out;
  has(o, 'https://example.com/a'); });
t('sort -rn ranks numerically', () => { const K = fresh();
  K.run('printf'); // no-op
  const o = K.run('cat ~/hosts.txt | sort | uniq -c | sort -rn').out.trim().split('\n');
  const first = parseInt(o[0].trim(), 10), last = parseInt(o[o.length-1].trim(), 10);
  if (!(first >= last)) throw new Error('sort -rn did not rank descending'); });

/* ---------- permissions ---------- */
t('chmod numeric sets the mode', () => { const K = fresh();
  K.run('chmod 600 id_rsa'); has(K.run('ls -l id_rsa').out, '-rw-------'); });
t('chmod +x adds execute', () => { const K = fresh();
  K.run('chmod +x deploy.sh'); has(K.run('ls -l deploy.sh').out, 'rwxr-xr-x'); });
t('chmod 755 exact', () => { const K = fresh();
  K.run('chmod 755 deploy.sh'); has(K.run('ls -l deploy.sh').out, '-rwxr-xr-x'); });
t('a file with no read permission cannot be read', () => { const K = fresh();
  K.run('chmod 000 notes.txt'); has(K.run('cat notes.txt').err, 'Permission denied'); });
t('sudo bypasses the permission check', () => { const K = fresh();
  K.run('chmod 000 notes.txt'); has(K.run('sudo cat notes.txt').out, 'backup job'); });
t('chown needs root', () => { const K = fresh();
  has(K.run('chown www-data:www-data /var/www').err, 'Operation not permitted'); });
t('sudo chown works and shows up in ls -l', () => { const K = fresh();
  K.run('sudo chown www-data:www-data /var/www');
  has(K.run('ls -ld /var/www').out, 'www-data'); });
t('setgid shows as s in the group field', () => { const K = fresh();
  K.run('sudo mkdir -p /srv/projekt');
  K.run('sudo chmod 2775 /srv/projekt');
  has(K.run('ls -ld /srv/projekt').out, 'rwxrwsr-x'); });
t('id reports the user', () => { const K = fresh(); has(K.run('id').out, 'uid=1000(analyst)'); });
t('whoami under sudo is root', () => { const K = fresh(); eq(K.run('sudo whoami').out, 'root\n'); });

/* ---------- users ---------- */
t('useradd -m creates a home', () => { const K = fresh();
  K.run('sudo useradd -m elev'); has(K.run('ls /home').out, 'elev');
  has(K.run('grep elev /etc/passwd').out, 'elev'); });
t('useradd without sudo is refused', () => { const K = fresh();
  has(K.run('useradd elev').err, 'Permission denied'); });
t('groupadd appends to /etc/group', () => { const K = fresh();
  K.run('sudo groupadd projekt'); has(K.run('grep projekt /etc/group').out, 'projekt'); });

/* ---------- services ---------- */
t('systemctl status reports state', () => { const K = fresh();
  has(K.run('systemctl status sshd').out, 'active (running)'); });
t('nginx starts on demand', () => { const K = fresh();
  has(K.run('systemctl status nginx').out, 'inactive');
  K.run('sudo systemctl start nginx');
  has(K.run('systemctl status nginx').out, 'active (running)'); });
t('enable --now starts and enables', () => { const K = fresh();
  K.run('sudo systemctl enable --now docker');
  eq(K.run('systemctl is-enabled docker').out, 'enabled\n');
  eq(K.run('systemctl is-active docker').out, 'active\n'); });
t('list-units --failed finds the broken unit', () => { const K = fresh();
  has(K.run('systemctl list-units --failed').out, 'bluetooth'); });
t('journalctl -u filters by unit', () => { const K = fresh();
  const o = K.run('journalctl -u nginx').out;
  has(o, 'nginx'); if (o.includes('Bluetooth')) throw new Error('unit filter leaked'); });
t('journalctl -p err shows only errors and worse', () => { const K = fresh();
  const o = K.run('journalctl -p err').out;
  has(o, 'Address already in use');
  if (o.includes('Startup finished')) throw new Error('priority filter leaked an info line'); });

/* ---------- networking ---------- */
t('ip a shows the address', () => { const K = fresh(); has(K.run('ip a').out, '10.0.0.24/24'); });
t('ip r shows the default gateway', () => { const K = fresh(); has(K.run('ip r').out, 'default via 10.0.0.1'); });
t('ss -tulpn lists listeners', () => { const K = fresh();
  const o = K.run('sudo ss -tulpn').out; has(o, ':22'); has(o, 'sshd'); });
t('ss -p without root hides the process', () => { const K = fresh();
  const o = K.run('ss -tulpn').out;
  if (o.includes('users:((')) throw new Error('process shown without root'); });
t('ping -c 4 sends four', () => { const K = fresh();
  has(K.run('ping -c 4 example.com').out, '4 packets transmitted'); });
t('ping an unknown host fails', () => { const K = fresh();
  has(K.run('ping -c 1 nosuch.invalid').err, 'Name or service not known'); });
t('curl -I returns headers only', () => { const K = fresh();
  const o = K.run('curl -I https://example.com').out;
  has(o, 'HTTP/1.1 200'); if (o.includes('<h1>')) throw new Error('body returned for -I'); });
t('nc -zv reports an open port', () => { const K = fresh();
  has(K.run('nc -zv 10.0.0.5 22').out, 'succeeded'); });
t('nc -zv reports a closed port', () => { const K = fresh();
  has(K.run('nc -zv 10.0.0.5 9999').err, 'refused'); });

/* ---------- archives ---------- */
t('tar -czvf then -xzvf round-trips', () => { const K = fresh();
  K.run('tar -czvf backup.tar.gz projects');
  K.run('cd /tmp && tar -xzvf ~/backup.tar.gz');
  has(K.run('cat /tmp/projects/webshop/app.conf').out, 'port=8080'); });
t('tar -xjvf on a gzip archive fails like the real thing', () => { const K = fresh();
  K.run('tar -czvf b.tar.gz projects');
  has(K.run('tar -xjvf b.tar.gz').err, 'not a bzip2 file'); });
t('tar -cfz writes a file called z', () => { const K = fresh();
  const r = K.run('tar -cfz b.tar.gz projects');
  has(r.err, 'Cannot open'); });
t('sha256sum is stable for the same content', () => { const K = fresh();
  const a = K.run('sha256sum notes.txt').out.split(' ')[0];
  const b = K.run('sha256sum notes.txt').out.split(' ')[0];
  eq(a, b); eq(a.length, 64); });
t('rsync --dry-run changes nothing', () => { const K = fresh();
  K.run('mkdir -p /tmp/bak');
  K.run('rsync -av --dry-run projects/ /tmp/bak');
  eq(K.run('ls /tmp/bak').out, ''); });
t('rsync -av copies', () => { const K = fresh();
  K.run('mkdir -p /tmp/bak');
  K.run('rsync -av projects/ /tmp/bak');
  has(K.run('ls /tmp/bak').out, 'webshop'); });

/* ---------- git ---------- */
t('git init then commit then log', () => { const K = fresh();
  K.run('mkdir -p ~/repo && cd ~/repo && touch a.txt');
  K.run('git init'); K.run('git add a.txt');
  has(K.run('git commit -m "first"').out, 'first');
  has(K.run('git log --oneline').out, 'first'); });
t('git outside a repo fails', () => { const K = fresh();
  has(K.run('git log').err, 'not a git repository'); });

/* ---------- shell niceties ---------- */
t('unknown command reports command not found', () => { const K = fresh();
  const r = K.run('frobnicate'); has(r.err, 'command not found'); eq(r.code, 127); });
t('history records commands', () => { const K = fresh();
  K.run('pwd'); K.run('ls'); has(K.run('history').out, 'pwd'); });
t('history | grep works', () => { const K = fresh();
  K.run('ssh-keygen -t ed25519'); has(K.run('history | grep ssh').out, 'ssh-keygen'); });
t('ssh-keygen creates a key pair with correct modes', () => { const K = fresh();
  K.run('ssh-keygen -t ed25519');
  has(K.run('ls -l ~/.ssh/id_ed25519').out, '-rw-------');
  has(K.run('ls ~/.ssh').out, 'id_ed25519.pub'); });
t('echo expands $HOME', () => { const K = fresh(); eq(K.run('echo $HOME').out, '/home/analyst\n'); });

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;
