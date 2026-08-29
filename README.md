# Säk·labb / Sec·lab

Practice material for **IT-säkerhetsanalytiker ITA26D** — a single-file,
no-dependency site that runs entirely in the browser. No install, no server.

The repository is still called `shell-drill`, which is where the site started;
renaming it would change the published URL, so it stays.

**Live:** https://jorrefog.github.io/shell-drill/

## The menu

The site opens on a menu covering the IT-säkerhet programme. **Kurser** lists the
taught courses; only *Grundläggande IT och nätverk* has material so far, the rest
are placeholders that open when their content exists. **Verktyg** holds the two
standalone practice tools. A **Menu** button in the header switches between them
at any time.

Nine courses carry **provisional** quizzes — 72 questions written from each
course title and what such a course usually covers, since no real syllabus
exists yet. Entering one shows a notice saying exactly that, so nobody mistakes
them for the real thing. Replace the set in `src/vm-quizzes.js` and drop the
`provisional` flag when the material arrives.

Adding a course later is a data change in `src/vm-courses.js` plus its content —
set `ready:true`, list the tabs it offers in `modes`, and it appears.

## Language

A **SV/EN** button in the header switches the interface and the nine provisional
course quizzes between Swedish and English. Content is written as `{sv, en}` and
`L()` picks the active one; plain strings pass through unchanged, which is how
the original English-only Linux material keeps working. That material is not
translated, and the menu says so when Swedish is selected.

LIA, examensarbete and kompetensportfölj are deliberately absent: placement,
thesis and portfolio work have nothing to practise in a browser.

## Reports

Finishing a lab or a quiz opens a report, also reachable any time from a
**Report** button. It is built from what actually happened — which tasks were
done unaided, which needed a hint, which needed the answer, and what the
terminal returned — so the advice is earned rather than generic. Repeated
command-not-found suggests Tab completion; repeated permission errors suggest
checking who owns the path; a high error rate suggests reading the message
first. Quizzes report per section and quote the questions missed with their
explanations.

## Inside a course

- **Terminal drill** — 99 tasks across ten modules. You type the real command;
  it tells you what was wrong when you don't.
- **Knowledge quiz** — 34 multiple-answer questions with explanations.
- **Grundläggande IT och nätverk** — one lab per lecture, following the weeks
  36-42 schedule, worked on a simulated Linux machine that runs in the page.

## The simulated machine

The course lab contains a small but real Linux: a virtual filesystem with
owners, groups, permission bits and hard links, and a shell with pipes,
redirection, quoting, globbing, brace expansion, `~` and variable expansion,
command substitution, `$?`, `!!` history expansion and `&&`. Around 100
commands are implemented against actual machine state rather than canned
output, so `chmod 600 id_rsa` really changes the mode that `ls -l` reports,
`cat /etc/shadow` really is denied until you put `sudo` in front of it, and
`mkdir -p /kurs` really fails the way it would on a machine you do not own.

That includes a package database behind four front ends — `pacman`, `apt`,
`dnf` and `zypper` — so the install, search, remove and "which package owns
this file" tasks from the drill do the same real thing whichever distro you
practise on.

It also includes a small Python interpreter covering what lectures 10-12 teach —
types, arithmetic, f-strings, lists, dicts, sets, control flow, functions and
file I/O — so `python3 script.py` runs the code you wrote against the same
filesystem. `edit <file>` opens an editor pane for writing scripts and crontabs.

Lab tasks check themselves by inspecting the machine afterwards, so a task
completes because you did the work, not because you typed a matching string.
Every task has a hint and a **show answer** button. The answers are the same
worked solutions `test/solutions.js` runs against every task, so what a stuck
student is shown is exactly what the suite proves works.
Each lecture keeps its own machine, and both the machine and your completed
tasks survive a reload. `reset` starts a lecture's machine over.

Nothing here needs a Linux computer, a VM, or an internet connection beyond
loading the page.

## Exam mode, review, progress, network lab

These arrived through `preview.html` and now ship. `src/pv-*.js` remains the
staging area: anything named that is spliced into `preview.html` and left out
of `index.html`, so the next batch can be tried on a real copy of the page
before it goes live. Nothing is named that at the moment.

- **Network lab** — the simulated machine has a LAN. `ip`, `ping`, `ss`, `arp`,
  `dig`, `host`, `nmap`, `nc`, `traceroute`, `curl`, `ufw` and `iptables` all
  read one shared state, so a `ufw deny` really does stop the next ping and
  drop the host out of the next scan. Seven self-checking tasks build on it.
- **Exam mode** — a timed test drawn round-robin across every quiz set, so a
  20-question paper is 2 from each of the ten rather than a third Linux.
- **Review** — everything answered wrong or revealed, handed back one at a
  time. An item leaves only by being answered correctly with no help.
- **Progress** — the whole programme at once, and a JSON backup that restores
  here or on another machine.
- **Ctrl+K** — searches every entry, command, task and question by subsequence.
- The tutorial opens on a contents page with counts read from the data.

## Running locally

Open `index.html` in any browser. No build step, no server.

## Editing

`index.html` is the deliverable and is self-contained, but the simulated machine
inside it is generated. Edit the sources in `src/`, then re-splice them into the
page — the script is idempotent, so it is safe to run repeatedly:

    node src/build.js index.html

Tests run on plain Node with no dependencies:

    node test/vmtest.js                 # 154 shell tests
    node test/pytest.js                 #  87 python tests
    node test/solutions.js              # works every task; 85 near-miss cases must NOT pass
    node test/selfcheck.js index.html   # drill + quiz integrity
    node test/audit.js                  # duplicate declarations, i18n gaps, data integrity
    node test/nettest.js                #  83 network engine + network lab checks
    node test/pvtest.js                 # exam sampling: bias and course spread
    node test/deepaudit.js              # dead code, i18n, data integrity, a11y, hygiene
