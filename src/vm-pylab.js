/* ===================== Python, taught from zero =====================
   The course meets Python in lectures 10-12 and assumes you already know what a
   variable is. This is the part before that: eight chapters, each teaching one
   idea and then asking for it back.

   Every exercise is checked by running the code on the same interpreter the
   lab terminal uses and reading what it printed — so it passes because the
   program worked, not because the source matched a pattern. Where the point of
   the exercise IS the construct (a loop, a function, a comprehension), the
   check also insists the construct is there; otherwise "print the answer you
   already know" would count as writing a loop.

   Only what the interpreter really supports is taught here: f-strings and their
   format specs, list comprehensions, try/except, with open. Not lambda, and
   not input() — there is no stdin behind this page. */

const PYLAB = [
{id:"basics",
 title:{sv:"Skriva ut och spara värden", en:"Printing and storing values"},
 teach:{sv:"Ett program är rader som körs uppifrån och ned. <code>print()</code> skriver ut, "+
           "och ett variabelnamn är en etikett du sätter på ett värde med <code>=</code>. "+
           "Med f-sträng — <code>f\"...{namn}...\"</code> — kan du klistra in värden i text.",
        en:"A program is lines that run top to bottom. <code>print()</code> writes something out, "+
           "and a variable name is a label you put on a value with <code>=</code>. "+
           "An f-string — <code>f\"...{name}...\"</code> — drops values into text."},
 ex:[
  {task:{sv:"Skriv ut texten <code>Hej världen</code>.",
         en:"Print the text <code>Hello world</code>."},
   hint:{sv:"print(\"...\") med texten inom citattecken.",
         en:"print(\"...\") with the text in quotes."},
   start:'', answer:'print("Hello world")',
   check:o => /^\s*Hello world\s*$/i.test(o) || /^\s*Hej världen\s*$/i.test(o)},

  {task:{sv:"Spara ditt namn i en variabel som heter <code>name</code> och skriv ut "+
            "<code>Hej, </code> följt av namnet, med en f-sträng.",
         en:"Store your name in a variable called <code>name</code> and print "+
            "<code>Hello, </code> followed by it, using an f-string."},
   hint:{sv:"name = \"Jorre\" och sedan print(f\"Hello, {name}\").",
         en:"name = \"Jorre\", then print(f\"Hello, {name}\")."},
   start:'name = \n', answer:'name = "Jorre"\nprint(f"Hello, {name}")',
   check:(o,s) => /Hello,\s*\S/.test(o) && /f["']/.test(s) && /\bname\b/.test(s)},

  {task:{sv:"Sätt <code>a = 7</code> och <code>b = 5</code> och skriv ut summan.",
         en:"Set <code>a = 7</code> and <code>b = 5</code> and print their sum."},
   hint:{sv:"print(a + b) — utan citattecken, annars skrivs bokstäverna ut.",
         en:"print(a + b) — no quotes, or it prints the letters instead."},
   start:'a = 7\nb = 5\n', answer:'a = 7\nb = 5\nprint(a + b)',
   check:(o,src) => /(^|\s)12(\s|$)/.test(o) && /a\s*[+]\s*b|b\s*[+]\s*a/.test(src)}]},

{id:"types",
 title:{sv:"Tal och text är olika saker", en:"Numbers and text are different things"},
 teach:{sv:"<code>5</code> är ett tal, <code>\"5\"</code> är text. Du kan räkna med det ena "+
           "och inte med det andra. <code>int(x)</code> gör om text till heltal, <code>str(x)</code> "+
           "åt andra hållet, och <code>type(x)</code> säger vad något är. "+
           "Division med <code>/</code> ger alltid decimaltal.",
        en:"<code>5</code> is a number, <code>\"5\"</code> is text. You can do arithmetic with one "+
           "and not the other. <code>int(x)</code> turns text into a whole number, <code>str(x)</code> "+
           "goes the other way, and <code>type(x)</code> tells you what something is. "+
           "Dividing with <code>/</code> always gives a decimal."},
 ex:[
  {task:{sv:"Skriv ut typen av <code>\"5\"</code> och typen av <code>5</code>, på var sin rad.",
         en:"Print the type of <code>\"5\"</code> and the type of <code>5</code>, one per line."},
   hint:{sv:"print(type(\"5\")) och print(type(5)).",
         en:"print(type(\"5\")) and print(type(5))."},
   start:'', answer:'print(type("5"))\nprint(type(5))',
   check:(o,src) => /str/.test(o) && /int/.test(o) && /type\(/.test(src)},

  {task:{sv:"Texten <code>\"42\"</code> ligger i <code>raw</code>. Gör om den till ett tal, "+
            "lägg till 8 och skriv ut resultatet.",
         en:"The text <code>\"42\"</code> is in <code>raw</code>. Turn it into a number, "+
            "add 8, and print the result."},
   hint:{sv:"int(raw) + 8.", en:"int(raw) + 8."},
   start:'raw = "42"\n', answer:'raw = "42"\nprint(int(raw) + 8)',
   check:(o,src) => /(^|\s)50(\s|$)/.test(o) && /\bint\(/.test(src)},

  {task:{sv:"Skriv ut <code>7 / 2</code> avrundat till två decimaler med en f-sträng.",
         en:"Print <code>7 / 2</code> to two decimal places using an f-string."},
   hint:{sv:"f\"{7/2:.2f}\" — kolon och .2f styr hur talet visas.",
         en:"f\"{7/2:.2f}\" — the colon and .2f control how the number is shown."},
   start:'', answer:'print(f"{7 / 2:.2f}")',
   check:(o,src) => /3\.50/.test(o) && /\.2f/.test(src)}]},

{id:"strings",
 title:{sv:"Arbeta med text", en:"Working with text"},
 teach:{sv:"Text har inbyggda verktyg: <code>.upper()</code>, <code>.strip()</code> tar bort "+
           "blanksteg i kanterna, <code>.split(\",\")</code> delar upp i en lista, och "+
           "<code>.replace(a, b)</code> byter ut. De ändrar inte originalet utan ger ett nytt värde.",
        en:"Text comes with tools: <code>.upper()</code>, <code>.strip()</code> removes spaces at "+
           "the edges, <code>.split(\",\")</code> breaks it into a list, and "+
           "<code>.replace(a, b)</code> swaps parts. None of them change the original — they hand "+
           "back a new value."},
 ex:[
  {task:{sv:"Ta bort blankstegen runt <code>\"  analyst  \"</code> och skriv ut resultatet "+
            "med versaler.",
         en:"Strip the spaces around <code>\"  analyst  \"</code> and print the result in capitals."},
   hint:{sv:"Du kan kedja: .strip().upper().", en:"You can chain them: .strip().upper()."},
   start:'raw = "  analyst  "\n', answer:'raw = "  analyst  "\nprint(raw.strip().upper())',
   check:(o,src) => /^\s*ANALYST\s*$/.test(o) && /\.strip\(/.test(src) && /\.upper\(/.test(src)},

  {task:{sv:"Dela <code>\"10.0.0.24,10.0.0.5,10.0.0.99\"</code> vid varje komma och skriv ut listan.",
         en:"Split <code>\"10.0.0.24,10.0.0.5,10.0.0.99\"</code> at each comma and print the list."},
   hint:{sv:".split(\",\") ger en lista.", en:".split(\",\") gives you a list."},
   start:'ips = "10.0.0.24,10.0.0.5,10.0.0.99"\n',
   answer:'ips = "10.0.0.24,10.0.0.5,10.0.0.99"\nprint(ips.split(","))',
   check:(o,src) => /\[.*10\.0\.0\.24.*10\.0\.0\.99.*\]/.test(o) && /\.split\(/.test(src)},

  {task:{sv:"Skriv ut hur många tecken <code>\"password123\"</code> har.",
         en:"Print how many characters <code>\"password123\"</code> has."},
   hint:{sv:"len() räknar tecken.", en:"len() counts characters."},
   start:'', answer:'print(len("password123"))',
   check:(o,src) => /(^|\s)11(\s|$)/.test(o) && /len\(/.test(src)}]},

{id:"lists",
 title:{sv:"Listor", en:"Lists"},
 teach:{sv:"En lista håller flera värden i ordning: <code>[1, 2, 3]</code>. "+
           "<code>lista[0]</code> är det första, <code>.append(x)</code> lägger till på slutet, "+
           "<code>len()</code> räknar och <code>sorted()</code> ger en sorterad kopia.",
        en:"A list holds several values in order: <code>[1, 2, 3]</code>. "+
           "<code>list[0]</code> is the first one, <code>.append(x)</code> adds to the end, "+
           "<code>len()</code> counts, and <code>sorted()</code> hands back a sorted copy."},
 ex:[
  {task:{sv:"Lägg till <code>\"ssh\"</code> i listan <code>ports</code> och skriv ut listan.",
         en:"Append <code>\"ssh\"</code> to the list <code>ports</code> and print the list."},
   hint:{sv:"ports.append(\"ssh\").", en:"ports.append(\"ssh\")."},
   start:'ports = ["http", "dns"]\n',
   answer:'ports = ["http", "dns"]\nports.append("ssh")\nprint(ports)',
   check:(o,src) => /\[.*http.*dns.*ssh.*\]/.test(o) && /\.append\(/.test(src)},

  {task:{sv:"Skriv ut det <b>första</b> och det <b>sista</b> värdet i <code>hosts</code>.",
         en:"Print the <b>first</b> and the <b>last</b> value in <code>hosts</code>."},
   hint:{sv:"hosts[0] och hosts[-1] — minus ett räknar bakifrån.",
         en:"hosts[0] and hosts[-1] — minus one counts from the end."},
   start:'hosts = ["gw", "srv-web", "srv-db", "printer"]\n',
   answer:'hosts = ["gw", "srv-web", "srv-db", "printer"]\nprint(hosts[0])\nprint(hosts[-1])',
   check:(o,src) => /gw/.test(o) && /printer/.test(o) && /hosts\[/.test(src)},

  {task:{sv:"Skriv ut <code>[5, 3, 9, 1]</code> sorterat i stigande ordning.",
         en:"Print <code>[5, 3, 9, 1]</code> sorted in ascending order."},
   hint:{sv:"sorted(listan).", en:"sorted(the list)."},
   start:'nums = [5, 3, 9, 1]\n', answer:'nums = [5, 3, 9, 1]\nprint(sorted(nums))',
   check:(o,src) => /\[\s*1,\s*3,\s*5,\s*9\s*\]/.test(o) && /sorted\(/.test(src)}]},

{id:"dicts",
 title:{sv:"Nyckel och värde", en:"Keys and values"},
 teach:{sv:"En dictionary parar ihop en nyckel med ett värde: "+
           "<code>{\"port\": 22, \"tjänst\": \"ssh\"}</code>. Du slår upp med <code>d[\"port\"]</code>, "+
           "men <code>d.get(\"x\")</code> är säkrare — den kraschar inte om nyckeln saknas.",
        en:"A dictionary pairs a key with a value: "+
           "<code>{\"port\": 22, \"service\": \"ssh\"}</code>. You look one up with <code>d[\"port\"]</code>, "+
           "but <code>d.get(\"x\")</code> is safer — it does not crash when the key is missing."},
 ex:[
  {task:{sv:"Skriv ut tjänsten som hör till port 22 ur <code>services</code>.",
         en:"Print the service that belongs to port 22 from <code>services</code>."},
   hint:{sv:"services[22].", en:"services[22]."},
   start:'services = {22: "ssh", 80: "http", 443: "https"}\n',
   answer:'services = {22: "ssh", 80: "http", 443: "https"}\nprint(services[22])',
   check:(o,src) => /\bssh\b/.test(o) && /services\[|\.get\(/.test(src)},

  {task:{sv:"Port 23 finns inte i <code>services</code>. Skriv ut <code>okänd</code> "+
            "i stället för att krascha.",
         en:"Port 23 is not in <code>services</code>. Print <code>unknown</code> instead of crashing."},
   hint:{sv:"services.get(23, \"unknown\") — andra argumentet är svaret när nyckeln saknas.",
         en:"services.get(23, \"unknown\") — the second argument is the answer when it is missing."},
   start:'services = {22: "ssh", 80: "http"}\n',
   answer:'services = {22: "ssh", 80: "http"}\nprint(services.get(23, "unknown"))',
   check:(o,s) => /unknown|okänd/i.test(o) && !/Traceback/.test(o) && /\.get\(/.test(s)},

  {task:{sv:"Skriv ut varje port och tjänst på formen <code>22 ssh</code>, en per rad.",
         en:"Print every port and service as <code>22 ssh</code>, one per line."},
   hint:{sv:"for port, name in services.items(): och print(port, name).",
         en:"for port, name in services.items(): then print(port, name)."},
   start:'services = {22: "ssh", 80: "http"}\n',
   answer:'services = {22: "ssh", 80: "http"}\nfor port, name in services.items():\n    print(port, name)',
   check:(o,s) => /22\s+ssh/.test(o) && /80\s+http/.test(o) && /\.items\(\)/.test(s)}]},

{id:"logic",
 title:{sv:"Val och villkor", en:"Choices and conditions"},
 teach:{sv:"<code>if</code> kör en rad bara när något stämmer, <code>elif</code> prövar nästa "+
           "möjlighet och <code>else</code> tar resten. Jämför med <code>==</code>, <code>&gt;</code>, "+
           "<code>&lt;</code>, och kolla medlemskap med <code>in</code>. "+
           "Indraget under raden är det som styr vad som hör till villkoret.",
        en:"<code>if</code> runs a line only when something holds, <code>elif</code> tries the next "+
           "possibility and <code>else</code> catches the rest. Compare with <code>==</code>, "+
           "<code>&gt;</code>, <code>&lt;</code>, and test membership with <code>in</code>. "+
           "The indent under the line is what decides which code belongs to the condition."},
 ex:[
  {task:{sv:"Skriv ut <code>svagt</code> om lösenordet är kortare än 12 tecken, annars <code>ok</code>.",
         en:"Print <code>weak</code> if the password is shorter than 12 characters, otherwise <code>ok</code>."},
   hint:{sv:"if len(pw) < 12: ... else: ...", en:"if len(pw) < 12: ... else: ..."},
   start:'pw = "hunter2"\n',
   answer:'pw = "hunter2"\nif len(pw) < 12:\n    print("weak")\nelse:\n    print("ok")',
   check:(o,s) => /weak|svagt/i.test(o) && /\bif\b/.test(s)},

  {task:{sv:"Skriv <code>hittad</code> om <code>\"10.0.0.99\"</code> finns i listan, annars <code>ren</code>.",
         en:"Print <code>found</code> if <code>\"10.0.0.99\"</code> is in the list, otherwise <code>clean</code>."},
   hint:{sv:"if \"10.0.0.99\" in hosts:", en:"if \"10.0.0.99\" in hosts:"},
   start:'hosts = ["10.0.0.1", "10.0.0.24", "10.0.0.99"]\n',
   answer:'hosts = ["10.0.0.1", "10.0.0.24", "10.0.0.99"]\nif "10.0.0.99" in hosts:\n    print("found")\nelse:\n    print("clean")',
   check:(o,s) => /found|hittad/i.test(o) && /\bin\b/.test(s)},

  {task:{sv:"Antal misslyckade inloggningar ligger i <code>fails</code>. Skriv <code>larm</code> "+
            "vid fler än 10, <code>kolla</code> vid fler än 3, annars <code>lugnt</code>.",
         en:"A count of failed logins is in <code>fails</code>. Print <code>alert</code> above 10, "+
            "<code>check</code> above 3, otherwise <code>quiet</code>."},
   hint:{sv:"Ordningen spelar roll: pröva det största villkoret först.",
         en:"Order matters: test the largest condition first."},
   start:'fails = 7\n',
   answer:'fails = 7\nif fails > 10:\n    print("alert")\nelif fails > 3:\n    print("check")\nelse:\n    print("quiet")',
   check:(o,s) => /check|kolla/i.test(o) && /\belif\b/.test(s)}]},

{id:"loops",
 title:{sv:"Loopar", en:"Loops"},
 teach:{sv:"<code>for x in lista:</code> kör en gång per värde. <code>range(5)</code> ger "+
           "0 till 4. En räknare som du ökar inuti loopen är det vanligaste sättet att "+
           "räkna saker. <code>break</code> avbryter loopen.",
        en:"<code>for x in list:</code> runs once per value. <code>range(5)</code> gives 0 to 4. "+
           "A counter you increase inside the loop is the usual way to count things. "+
           "<code>break</code> stops the loop early."},
 ex:[
  {task:{sv:"Skriv ut talen 1 till 5, en per rad, med en loop.",
         en:"Print the numbers 1 to 5, one per line, using a loop."},
   hint:{sv:"range(1, 6) — slutet räknas inte med.",
         en:"range(1, 6) — the end is not included."},
   start:'', answer:'for i in range(1, 6):\n    print(i)',
   check:(o,s) => /^\s*1\s*\n\s*2\s*\n\s*3\s*\n\s*4\s*\n\s*5\s*$/.test(o.trim()) && /\bfor\b/.test(s)},

  {task:{sv:"Räkna hur många rader i <code>lines</code> som innehåller <code>\"Failed\"</code> "+
            "och skriv ut antalet.",
         en:"Count how many lines in <code>lines</code> contain <code>\"Failed\"</code> and print the number."},
   hint:{sv:"Sätt en räknare till 0 före loopen och öka den när villkoret stämmer.",
         en:"Set a counter to 0 before the loop and add to it when the condition holds."},
   start:'lines = ["Failed password for root", "Accepted password", "Failed password for admin"]\n',
   answer:'lines = ["Failed password for root", "Accepted password", "Failed password for admin"]\n'+
          'count = 0\nfor line in lines:\n    if "Failed" in line:\n        count = count + 1\nprint(count)',
   check:(o,s) => /(^|\s)2(\s|$)/.test(o) && /\bfor\b/.test(s)},

  {task:{sv:"Skriv ut varje port i <code>ports</code> dubblerad, som en lista, "+
            "med en listbyggare.",
         en:"Print every port in <code>ports</code> doubled, as a list, using a comprehension."},
   hint:{sv:"[p * 2 for p in ports] bygger en ny lista på en rad.",
         en:"[p * 2 for p in ports] builds a new list in one line."},
   start:'ports = [22, 80, 443]\n',
   answer:'ports = [22, 80, 443]\nprint([p * 2 for p in ports])',
   check:(o,s) => /\[\s*44,\s*160,\s*886\s*\]/.test(o) && /for .* in .*\]/.test(s)}]},

{id:"functions",
 title:{sv:"Funktioner", en:"Functions"},
 teach:{sv:"En funktion är kod du ger ett namn så du kan köra den flera gånger. "+
           "<code>def namn(argument):</code> och <code>return</code> skickar tillbaka svaret. "+
           "Utan <code>return</code> ger funktionen <code>None</code>.",
        en:"A function is code you give a name so you can run it more than once. "+
           "<code>def name(argument):</code> and <code>return</code> hands the answer back. "+
           "Without <code>return</code> a function gives you <code>None</code>."},
 ex:[
  {task:{sv:"Skriv en funktion <code>double(n)</code> som returnerar n gånger två, "+
            "och skriv ut <code>double(21)</code>.",
         en:"Write a function <code>double(n)</code> that returns n times two, "+
            "and print <code>double(21)</code>."},
   hint:{sv:"def double(n):, indraget return n * 2, sedan print(double(21)).",
         en:"def double(n):, indented return n * 2, then print(double(21))."},
   start:'', answer:'def double(n):\n    return n * 2\n\nprint(double(21))',
   check:(o,s) => /(^|\s)42(\s|$)/.test(o) && /\bdef\b/.test(s) && /\breturn\b/.test(s)},

  {task:{sv:"Skriv <code>is_weak(pw)</code> som returnerar True när lösenordet är kortare "+
            "än 12 tecken. Skriv ut resultatet för <code>\"kort\"</code>.",
         en:"Write <code>is_weak(pw)</code> returning True when the password is shorter than "+
            "12 characters. Print the result for <code>\"short\"</code>."},
   hint:{sv:"return len(pw) < 12 räcker — jämförelsen är redan True eller False.",
         en:"return len(pw) < 12 is enough — the comparison is already True or False."},
   start:'', answer:'def is_weak(pw):\n    return len(pw) < 12\n\nprint(is_weak("short"))',
   check:(o,s) => /True/.test(o) && /\bdef\b/.test(s) && /\breturn\b/.test(s)},

  {task:{sv:"Skriv <code>count_failed(lines)</code> som returnerar antalet rader med "+
            "<code>\"Failed\"</code>, och skriv ut svaret för listan i rutan.",
         en:"Write <code>count_failed(lines)</code> returning how many lines contain "+
            "<code>\"Failed\"</code>, and print the answer for the list in the editor."},
   hint:{sv:"Samma räknare som förut, men inuti en funktion med return på slutet.",
         en:"The same counter as before, but inside a function with a return at the end."},
   start:'log = ["Failed password", "Accepted", "Failed password", "Failed none"]\n',
   answer:'log = ["Failed password", "Accepted", "Failed password", "Failed none"]\n\n'+
          'def count_failed(lines):\n    n = 0\n    for line in lines:\n        if "Failed" in line:\n'+
          '            n = n + 1\n    return n\n\nprint(count_failed(log))',
   check:(o,s) => /(^|\s)3(\s|$)/.test(o) && /\bdef\b/.test(s) && /\breturn\b/.test(s)}]},

{id:"files",
 title:{sv:"Filer och en riktig logg", en:"Files, and a real log"},
 teach:{sv:"<code>with open(sökväg) as f:</code> öppnar en fil och stänger den åt dig. "+
           "<code>f.read()</code> ger hela innehållet som text, och <code>.splitlines()</code> "+
           "delar upp det i rader. Maskinen bakom den här sidan har riktiga filer — "+
           "<code>/var/log/access.log</code> finns på riktigt.",
        en:"<code>with open(path) as f:</code> opens a file and closes it for you. "+
           "<code>f.read()</code> gives the whole content as text and <code>.splitlines()</code> "+
           "breaks it into lines. The machine behind this page has real files — "+
           "<code>/var/log/access.log</code> is actually there."},
 ex:[
  {task:{sv:"Skriv texten <code>hej</code> till <code>/tmp/note.txt</code> och skriv ut <code>klart</code>.",
         en:"Write the text <code>hi</code> to <code>/tmp/note.txt</code> and print <code>done</code>."},
   hint:{sv:"with open(\"/tmp/note.txt\", \"w\") as f: och f.write(\"hej\").",
         en:"with open(\"/tmp/note.txt\", \"w\") as f: then f.write(\"hi\")."},
   start:'', answer:'with open("/tmp/note.txt", "w") as f:\n    f.write("hi")\n\nprint("done")',
   check:(o,s) => /done|klart/i.test(o) && /open\(/.test(s) && /\.write\(/.test(s)},

  {task:{sv:"Läs <code>/etc/hostname</code> och skriv ut innehållet.",
         en:"Read <code>/etc/hostname</code> and print what is in it."},
   hint:{sv:"with open(\"/etc/hostname\") as f: print(f.read()).",
         en:"with open(\"/etc/hostname\") as f: print(f.read())."},
   start:'', answer:'with open("/etc/hostname") as f:\n    print(f.read())',
   check:(o,s) => /workstation-07/.test(o) && /open\(/.test(s)},

  {task:{sv:"I <code>/var/log/access.log</code> ligger 40 rader från webbservern. "+
            "Räkna hur många som svarade <code>404</code> och skriv ut antalet. "+
            "Många 404 från samma adress brukar betyda att någon letar efter sidor "+
            "som inte ska finnas.",
         en:"<code>/var/log/access.log</code> holds 40 lines from the web server. "+
            "Count how many answered <code>404</code> and print the number. A lot of 404s "+
            "from one address usually means somebody is looking for pages that should "+
            "not be there."},
   hint:{sv:"Läs filen, dela med .splitlines(), loopa och räkna raderna där \" 404 \" finns.",
         en:"Read the file, split with .splitlines(), loop, and count the lines where \" 404 \" appears."},
   start:'', answer:'with open("/var/log/access.log") as f:\n    lines = f.read().splitlines()\n\nn = 0\nfor line in lines:\n    if " 404 " in line:\n        n = n + 1\n\nprint(n)',
   check:(o,s) => /(^|\s)5(\s|$)/.test(o) && /access\.log/.test(s) && /\bfor\b/.test(s)}]},
];

if (typeof globalThis !== "undefined") globalThis.PYLAB = PYLAB;
