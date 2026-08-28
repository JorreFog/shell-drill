# Shell Drill

Learn the Linux terminal by typing in it — a single-file, no-dependency practice
site with three modes and no install of any kind.

**Live:** https://jorrefog.github.io/shell-drill/

## The three tabs

- **Terminal drill** — 123 tasks across ten modules. You type the real command;
  it tells you what was wrong when you don't.
- **Knowledge quiz** — 34 multiple-answer questions with explanations.
- **Course plan** — one lab per lecture, following the weeks 36-42 schedule,
  worked on a simulated Linux machine that runs in the page.

## The simulated machine

The Course plan tab contains a small but real Linux: a virtual filesystem with
owners, groups and permission bits, and a shell that handles pipes,
redirection, quoting, globbing and `&&`. Around 80 commands are implemented
against actual machine state rather than canned output, so `chmod 600 id_rsa`
really changes the mode that `ls -l` then reports, and `cat /etc/shadow` really
is denied until you put `sudo` in front of it.

It also includes a small Python interpreter covering what lectures 10-12 teach —
types, arithmetic, f-strings, lists, dicts, sets, control flow, functions and
file I/O — so `python3 script.py` runs the code you wrote against the same
filesystem. `edit <file>` opens an editor pane for writing scripts and crontabs.

Lab tasks check themselves by inspecting the machine afterwards, so a task
completes because you did the work, not because you typed a matching string.
Completed tasks persist; the machine resets on reload, or with `reset`.

Nothing here needs a Linux computer, a VM, or an internet connection beyond
loading the page.

## Running locally

Open `index.html` in any browser. No build step, no server.

## Editing

`index.html` is the deliverable and is self-contained, but the simulated machine
inside it is generated. Edit the sources in `src/`, then re-splice them into the
page — the script is idempotent, so it is safe to run repeatedly:

    node src/build.js index.html

Tests run on plain Node with no dependencies:

    node test/vmtest.js                 # 102 shell tests
    node test/pytest.js                 #  70 python tests
    node test/solutions.js              # works every lab task, checks each registers
    node test/selfcheck.js index.html   # drill + quiz integrity
