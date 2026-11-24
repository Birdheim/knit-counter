import { firebaseConfig } from "./firebase-config.js";

var KEY = "knitcounter-v1";
var YARNS = [
  ["bringebaer","Bringebær","#D9577B"],["blabaer","Blåbær","#6B7DD3"],["mose","Mose","#6F9D5C"],
  ["smor","Smør","#E0AC2B"],["lyng","Lyng","#A46DC6"],["hav","Hav","#3E9FAB"]
];
var TYPES = [["inc","Øk"],["dec","Fell"],["plain","Rett frem"]];
var MAX_PARTS = 12, MAX_PROJECTS = 20, MAX_BANK = 20;
var $ = function(id){ return document.getElementById(id); };
function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function empty(node){ while (node.firstChild) node.removeChild(node.firstChild); }

function int(v,min,max,d){ v = Math.floor(Number(v)); return isFinite(v) ? Math.min(max,Math.max(min,v)) : d; }
function newId(){ return (Math.random().toString(36).slice(2,10) || "x") + (Date.now() % 1000); }
function okId(v){ return typeof v === "string" && /^[a-z0-9-]{1,24}$/.test(v) ? v : newId(); }
function yarnHex(id){ for (var i = 0; i < YARNS.length; i++) if (YARNS[i][0] === id) return YARNS[i][2]; return YARNS[0][2]; }

function cleanPart(p){
  p = p && typeof p === "object" ? p : {};
  var type = p.type === "dec" || p.type === "plain" ? p.type : "inc";
  return {
    type: type, by: int(p.by,1,9,1), every: int(p.every,1,99,2), target: int(p.target,0,999,10),
    rows: int(p.rows,0,9999,0), note: typeof p.note === "string" ? p.note.slice(0,60) : ""
  };
}
function exampleParts(){
  return [
    {type:"inc",by:1,every:6,target:15,rows:0,note:""},
    {type:"plain",by:1,every:2,target:10,rows:0,note:"til skjerfet er langt nok"},
    {type:"dec",by:1,every:6,target:5,rows:0,note:""}
  ];
}
/* Ready-made patterns. The scarf's numbers are examples, not from any published pattern. */
var BUILTIN = [
  {id:"b-skjerf", name:"Skjerf fra spiss til spiss", desc:"Øk, strikk til mål, fell. Tallene er eksempler.", castOn:5, parts:exampleParts(), example:true, projectName:"Nytt skjerf"},
  {id:"b-tom", name:"Bare tell rader", desc:"Ingen oppskrift. Du kan legge til deler senere.", castOn:5, parts:[], example:false, projectName:"Nytt prosjekt"}
];

function cleanProject(o){
  o = o && typeof o === "object" ? o : {};
  var has = Array.isArray(o.parts), closed = {};
  if (has && o.closed && typeof o.closed === "object"){
    Object.keys(o.closed).forEach(function(k){ if (/^\d+$/.test(k)) closed[k] = int(o.closed[k],0,99999,0); });
  }
  return {
    id: okId(o.id),
    name: typeof o.name === "string" ? o.name.slice(0,40) : "Mitt strikketøy",
    count: int(o.count,0,99999,0),
    yarn: YARNS.some(function(y){ return y[0] === o.yarn; }) ? o.yarn : "bringebaer",
    castOn: int(o.castOn,1,999,5),
    parts: has ? o.parts.slice(0,MAX_PARTS).map(cleanPart) : exampleParts(),
    closed: closed,
    example: has ? o.example === true : true
  };
}
function cleanPattern(o){
  o = o && typeof o === "object" ? o : {};
  return {
    id: okId(o.id),
    name: typeof o.name === "string" && o.name.trim() ? o.name.slice(0,40) : "Uten navn",
    castOn: int(o.castOn,1,999,5),
    parts: Array.isArray(o.parts) ? o.parts.slice(0,MAX_PARTS).map(cleanPart) : []
  };
}
function unique(list){ var seen = {}; list.forEach(function(x){ while (seen[x.id]) x.id = newId(); seen[x.id] = true; }); return list; }
function clean(o){
  o = o && typeof o === "object" ? o : {};
  /* an older save held one project at the top level */
  var projects = Array.isArray(o.projects) ? o.projects.slice(0,MAX_PROJECTS).map(cleanProject) : [cleanProject(o)];
  if (!projects.length) projects = [cleanProject({})];
  unique(projects);
  var bank = unique(Array.isArray(o.bank) ? o.bank.slice(0,MAX_BANK).map(cleanPattern) : []);
  var activeId = projects.some(function(p){ return p.id === o.activeId; }) ? o.activeId : projects[0].id;
  return {activeId:activeId, projects:projects, bank:bank, updatedAt:int(o.updatedAt,0,8.64e15,0)};
}

var state = clean({}), P = state.projects[0];
var lastAction = null, lastReset = null;
function pickActive(){
  P = state.projects[0];
  state.projects.forEach(function(p){ if (p.id === state.activeId) P = p; });
  state.activeId = P.id;
}

/* ---------- the pattern: where am I, what do I do on this row ---------- */
function plan(p){
  var st = p.castOn;
  return p.parts.map(function(part,i){
    var s = {i:i, type:part.type, start:st, by:part.by, every:part.every, note:part.note, open:false, times:0, len:0, end:st};
    if (part.type === "plain"){
      if (part.rows > 0) s.len = part.rows;
      else { s.open = true; s.len = p.closed[i] != null ? p.closed[i] : Infinity; }
    } else {
      var diff = part.type === "inc" ? part.target - st : st - part.target;
      s.times = Math.max(0, Math.ceil(diff / part.by));
      s.len = s.times * part.every;
      s.end = part.type === "inc" ? st + part.by * s.times : Math.max(0, st - part.by * s.times);
    }
    st = s.end;
    return s;
  });
}
function locate(p, segs){
  var rem = p.count, st = p.castOn;
  for (var i = 0; i < segs.length; i++){
    var s = segs[i];
    if (rem < s.len){
      var loc = {seg:s, r:rem, st:s.start, shape:false, toNext:0, k:0, pos:0};
      if (s.type !== "plain"){
        loc.k = Math.floor(rem / s.every);
        loc.pos = rem % s.every;
        loc.shape = loc.pos === s.every - 1;
        loc.toNext = s.every - 1 - loc.pos;
        loc.st = s.type === "inc" ? s.start + s.by * loc.k : Math.max(0, s.start - s.by * loc.k);
      }
      return loc;
    }
    rem -= s.len; st = s.end;
  }
  return {finished:true, st:st};
}
function masker(n){ return n + (n === 1 ? " maske" : " masker"); }
function rader(n){ return n + (n === 1 ? " rad" : " rader"); }
function deler(n){ return n + (n === 1 ? " del" : " deler"); }
function summary(p){
  var segs = plan(p), loc = locate(p, segs);
  if (!segs.length) return "Rad " + (p.count + 1);
  if (loc.finished) return "Ferdig · " + rader(p.count);
  return "Rad " + (p.count + 1) + " · del " + (loc.seg.i + 1) + " av " + segs.length;
}

/* ---------- main screen ---------- */
function drawNow(loc, segs, arrived){
  var box = $("now"), title = $("now-title"), sub = $("now-sub"), foot = $("now-foot");
  empty(foot);
  var status = "";
  box.classList.toggle("shape", !!loc.shape);
  if (!segs.length){
    title.textContent = "Tell rader";
    sub.textContent = "Legg inn oppskriften i Oppsett, så sier telleren fra når du skal øke eller felle.";
    status = "Ingen oppskrift";
  } else if (loc.finished){
    title.textContent = "Oppskriften er ferdig";
    sub.textContent = masker(loc.st) + " på pinnen";
    foot.textContent = "Ingen flere deler.";
    status = "Alle " + deler(segs.length) + " er strikket";
  } else {
    var s = loc.seg, inc = s.type === "inc";
    status = "Del " + (s.i + 1) + " av " + segs.length;
    if (s.type === "plain"){
      title.textContent = "Vanlig rad";
      if (s.open){
        sub.textContent = masker(loc.st) + (s.note ? " · " + s.note : "");
        foot.textContent = "Rad " + (loc.r + 1) + " i denne delen. Trykk Neste del når du er ferdig.";
      } else {
        sub.textContent = masker(loc.st) + " · " + rader(s.len - loc.r) + " igjen";
        var bar = el("span","bar"), fill = el("i"); fill.style.width = Math.round(loc.r / s.len * 100) + "%";
        bar.appendChild(fill); foot.appendChild(bar);
      }
    } else {
      var word = inc ? "økning" : "felling", end = Math.max(0, loc.st + (inc ? s.by : -s.by));
      status += " · " + loc.k + " av " + s.times + (inc ? " økninger" : " fellinger");
      if (loc.shape){
        title.textContent = (inc ? "Øk " : "Fell ") + masker(s.by);
        sub.textContent = loc.st + " → " + masker(end);
      } else {
        title.textContent = "Vanlig rad";
        sub.textContent = masker(loc.st) + " · " + (loc.toNext === 1 ? word + " på neste rad" : word + " om " + rader(loc.toNext));
      }
      if (s.every <= 12){
        var dots = el("span","dots");
        for (var d = 0; d < s.every; d++){
          var last = d === s.every - 1;
          dots.appendChild(el("i", (d < loc.pos ? "past" : "") + (d === loc.pos ? " cur" : "") + (last ? " mark" : ""), last ? (inc ? "+" : "−") : null));
        }
        foot.appendChild(dots);
      } else {
        var b2 = el("span","bar"), f2 = el("i"); f2.style.width = Math.round(loc.pos / s.every * 100) + "%";
        b2.appendChild(f2); foot.appendChild(b2);
      }
    }
  }
  $("status").textContent = (P.example && segs.length ? "Eksempel · " : "") + status;
  $("next").hidden = !(loc.seg && loc.seg.open);
  if (arrived && loc.shape){ box.classList.remove("nudge"); void box.offsetWidth; box.classList.add("nudge"); }
}

function render(arrived){
  document.documentElement.setAttribute("data-yarn", P.yarn);
  $("proj-name").textContent = P.name.trim() || "Uten navn";
  var name = $("name"); if (document.activeElement !== name) name.value = P.name;
  var s = String(P.count + 1), num = $("num");
  num.textContent = s; num.setAttribute("data-len", String(Math.max(3, s.length)));
  $("undo").disabled = P.count === 0 && !lastAction;
  var segs = plan(P), loc = locate(P, segs);
  drawNow(loc, segs, arrived);
  drawSums(segs);
  var radios = document.querySelectorAll("#yarns input");
  for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === P.yarn;
  var y = YARNS.filter(function(v){ return v[0] === P.yarn; })[0];
  $("yarn-name").textContent = y ? y[1] : "";
  $("example-note").hidden = !(P.example && P.parts.length);
  $("save-bank").hidden = !P.parts.length;
  $("picks").hidden = P.parts.length > 0;
  var co = $("cast-on"); if (document.activeElement !== co) co.value = String(P.castOn);
  return loc;
}

/* ---------- pattern editor ---------- */
function fixClosed(){
  Object.keys(P.closed).forEach(function(k){
    var part = P.parts[k];
    if (!part || part.type !== "plain" || part.rows > 0) delete P.closed[k];
  });
}
function edited(){ P.example = false; fixClosed(); lastAction = null; changed(false); }

function numField(id, label, value, wide, placeholder){
  var i = el("input","n" + (wide ? " wide" : ""));
  i.type = "text"; i.inputMode = "numeric"; i.autocomplete = "off"; i.id = id;
  i.setAttribute("aria-label", label); i.value = value;
  if (placeholder) i.placeholder = placeholder;
  return i;
}
function bind(input, min, max, emptyValue, set, get){
  input.addEventListener("input", function(){
    var raw = input.value.trim();
    if (raw === ""){ if (emptyValue == null) return; set(emptyValue); }
    else { var v = Math.floor(Number(raw)); if (!isFinite(v)) return; set(Math.min(max, Math.max(min, v))); }
    edited();
  });
  input.addEventListener("blur", function(){ input.value = get(); });
}

function drawParts(){
  var list = $("parts");
  empty(list);
  P.parts.forEach(function(p, idx){
    var li = el("li","part"), head = el("div","part-head");
    head.appendChild(el("span","part-no","Del " + (idx + 1)));
    var x = el("button","x","×"); x.type = "button"; x.setAttribute("aria-label","Slett del " + (idx + 1));
    x.addEventListener("click", function(){
      var closed = {};
      Object.keys(P.closed).forEach(function(k){ k = Number(k); if (k < idx) closed[k] = P.closed[k]; else if (k > idx) closed[k - 1] = P.closed[k]; });
      P.closed = closed; P.parts.splice(idx, 1); edited(); drawParts();
    });
    head.appendChild(x); li.appendChild(head);

    var seg = el("div","seg"); seg.setAttribute("role","group"); seg.setAttribute("aria-label","Type del");
    TYPES.forEach(function(t){
      var b = el("button", null, t[1]); b.type = "button"; b.setAttribute("aria-pressed", String(p.type === t[0]));
      b.addEventListener("click", function(){ if (p.type !== t[0]){ p.type = t[0]; edited(); drawParts(); } });
      seg.appendChild(b);
    });
    li.appendChild(seg);

    var pre = "p" + idx + "-";
    if (p.type === "plain"){
      var line = el("p","line");
      var lab = el("label", null, "Antall rader"); lab.htmlFor = pre + "rows";
      var rows = numField(pre + "rows", "Antall rader", p.rows > 0 ? String(p.rows) : "", true, "til mål");
      bind(rows, 0, 9999, 0, function(v){ p.rows = v; }, function(){ return p.rows > 0 ? String(p.rows) : ""; });
      line.appendChild(lab); line.appendChild(rows); li.appendChild(line);
      var note = el("input","text"); note.type = "text"; note.id = pre + "note"; note.maxLength = 60; note.autocomplete = "off";
      note.placeholder = "Notat, f.eks. til arbeidet måler 30 cm"; note.setAttribute("aria-label","Notat til delen"); note.value = p.note;
      note.addEventListener("input", function(){ p.note = note.value.slice(0,60); edited(); });
      li.appendChild(note);
    } else {
      var l2 = el("p","line"), l3 = el("p","line"), verb = p.type === "inc" ? "Øk" : "Fell";
      var by = numField(pre + "by", "Antall masker per gang", String(p.by));
      var every = numField(pre + "every", "Hvor mange rader mellom", String(p.every));
      var target = numField(pre + "target", "Masker når delen er ferdig", String(p.target));
      bind(by, 1, 9, null, function(v){ p.by = v; }, function(){ return String(p.by); });
      bind(every, 1, 99, null, function(v){ p.every = v; }, function(){ return String(p.every); });
      bind(target, 0, 999, null, function(v){ p.target = v; }, function(){ return String(p.target); });
      l2.appendChild(document.createTextNode(verb)); l2.appendChild(by);
      l2.appendChild(document.createTextNode("m hver")); l2.appendChild(every);
      l2.appendChild(document.createTextNode(". rad"));
      l3.appendChild(document.createTextNode("til du har")); l3.appendChild(target);
      l3.appendChild(document.createTextNode("masker"));
      li.appendChild(l2); li.appendChild(l3);
    }
    var sum = el("p","part-sum"); sum.id = pre + "sum"; li.appendChild(sum);
    list.appendChild(li);
  });
  $("add-part").hidden = P.parts.length >= MAX_PARTS;
  drawPicks();
  drawSums(plan(P));
}
function drawSums(segs){
  var total = 0, open = false;
  segs.forEach(function(s){
    var out = $("p" + s.i + "-sum"), text = "", warn = false;
    if (s.type === "plain"){
      text = s.open ? masker(s.start) + " · til du trykker Neste del" : masker(s.start) + " hele veien";
      if (s.open) open = true; else total += s.len;
    } else if (!s.times){
      warn = true;
      text = "Du har allerede " + masker(s.start) + " her. Sett et " + (s.type === "inc" ? "høyere" : "lavere") + " tall.";
    } else {
      text = s.times + (s.type === "inc" ? (s.times === 1 ? " økning" : " økninger") : (s.times === 1 ? " felling" : " fellinger")) +
             " · " + rader(s.len) + " · " + s.start + " → " + masker(s.end);
      total += s.len;
    }
    if (out){ out.textContent = text; out.classList.toggle("warn", warn); }
  });
  $("total").textContent = !segs.length ? "Uten deler teller den bare rader."
    : "I alt " + rader(total) + (open ? ", pluss delene du strikker til mål." : ".");
}

/* ---------- bank and projects ---------- */
function bankEntries(withParts){
  var all = state.bank.concat(BUILTIN);
  return withParts ? all.filter(function(b){ return b.parts.length; }) : all;
}
function row(title, sub, color, tag){
  var b = el("button","rowbtn"); b.type = "button";
  if (color){ var d = el("span","dot"); d.style.background = color; b.appendChild(d); }
  var t = el("span","txt"); t.appendChild(el("b", null, title)); t.appendChild(el("small", null, sub)); b.appendChild(t);
  if (tag) b.appendChild(el("span","tag",tag));
  return b;
}
function patternSub(b){ return b.desc || ("Legg opp " + b.castOn + " · " + deler(b.parts.length)); }
function usePattern(b){
  P.castOn = b.castOn; P.parts = b.parts.map(cleanPart); P.closed = {}; P.example = !!b.example;
  lastAction = null; changed(false); drawParts();
}
function drawPicks(){
  var box = $("picks");
  while (box.children.length > 1) box.removeChild(box.lastChild);
  bankEntries(true).forEach(function(b){
    var r = row(b.name, patternSub(b));
    r.addEventListener("click", function(){ usePattern(b); });
    box.appendChild(r);
  });
}
function drawProjects(){
  var list = $("proj-list"); empty(list);
  state.projects.forEach(function(p){
    var li = el("li"), on = p.id === P.id;
    var r = row(p.name.trim() || "Uten navn", summary(p), yarnHex(p.yarn), on ? "Åpent" : null);
    if (on){ r.classList.add("on"); r.setAttribute("aria-current","true"); }
    r.addEventListener("click", function(){
      if (!on){ state.activeId = p.id; pickActive(); lastAction = null; forgetReset(); changed(false); }
      closeSheets();
    });
    li.appendChild(r); list.appendChild(li);
  });
  var bank = $("bank-list"); empty(bank);
  var full = state.projects.length >= MAX_PROJECTS;
  $("bank-help").textContent = full ? "Du har " + MAX_PROJECTS + " prosjekter. Slett ett for å starte et nytt."
    : "Velg en oppskrift fra banken. Tellingen starter på rad 1.";
  if (full) return;
  state.bank.forEach(function(b){
    var li = el("li"), r = row(b.name, patternSub(b));
    r.addEventListener("click", function(){ startProject(b, b.name); });
    var x = el("button","x","×"); x.type = "button"; x.setAttribute("aria-label","Slett " + b.name + " fra banken");
    x.addEventListener("click", function(){
      state.bank = state.bank.filter(function(v){ return v.id !== b.id; });
      changed(false); drawProjects();
    });
    li.appendChild(r); li.appendChild(x); bank.appendChild(li);
  });
  BUILTIN.forEach(function(b){
    var li = el("li"), r = row(b.name, patternSub(b));
    r.addEventListener("click", function(){ startProject(b, b.projectName); });
    li.appendChild(r); bank.appendChild(li);
  });
}
function startProject(b, name){
  if (state.projects.length >= MAX_PROJECTS) return;
  var used = {}; state.projects.forEach(function(p){ used[p.yarn] = true; });
  var free = YARNS.filter(function(y){ return !used[y[0]]; })[0] || YARNS[state.projects.length % YARNS.length];
  var p = cleanProject({id:newId(), name:name, count:0, yarn:free[0], castOn:b.castOn, parts:b.parts, closed:{}, example:!!b.example});
  state.projects.push(p); state.activeId = p.id; pickActive();
  lastAction = null; forgetReset(); changed(false);
  openSheet("sheet");
}
function saveToBank(){
  if (!P.parts.length) return false;
  var name = P.name.trim() || "Uten navn", key = name.toLowerCase();
  var entry = {id:newId(), name:name, castOn:P.castOn, parts:P.parts.map(cleanPart)};
  var at = -1;
  state.bank.forEach(function(b,i){ if (b.name.trim().toLowerCase() === key) at = i; });
  if (at >= 0){ entry.id = state.bank[at].id; state.bank[at] = entry; }
  else if (state.bank.length < MAX_BANK) state.bank.push(entry);
  else return false;
  changed(false);
  return true;
}

/* ---------- saving ----------
   Everything is kept in localStorage so the counter is instant and works offline.
   When Firebase is set up and you are signed in, the same state is also stored in
   Firestore at users/<uid>, and the newest copy wins. */
var FB = "https://www.gstatic.com/firebasejs/13.4.0/";
var cloud = firebaseConfig && firebaseConfig.apiKey ? "loading" : "off";
var fb = null, user = null, ref = null;
var writing = null, dirty = false, timer = null, retried = false;
var synced = true, syncError = false, mergeNext = false;

function saveLocal(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} }
function drawAccount(){
  $("sign-in").hidden = !(cloud === "ready" && !user);
  $("sign-out").hidden = !user;
  var who = user ? (user.email || user.displayName || "Google-kontoen din") : "";
  $("sync").textContent =
    user ? (syncError ? "Logget inn som " + who + ", men får ikke lagret på kontoen akkurat nå."
                      : "Logget inn som " + who + ". Prosjektene følger kontoen din.")
    : cloud === "off" ? "Lagres på denne enheten. Innlogging er ikke satt opp ennå."
    : cloud === "loading" ? "Lagres på denne enheten. Kobler til …"
    : cloud === "failed" ? "Lagres på denne enheten. Fikk ikke kontakt med innloggingen."
    : "Lagres på denne enheten. Logg inn for å ha de samme prosjektene på alle enhetene dine.";
}
function authError(text){ var box = $("auth-error"); box.textContent = text || ""; box.hidden = !text; }

function changed(arrived){
  state.updatedAt = Date.now();
  var loc = render(arrived); saveLocal();
  if (ref){ synced = false; clearTimeout(timer); timer = setTimeout(flush, 700); }
  return loc;
}
function flush(){
  clearTimeout(timer);
  if (!ref) return Promise.resolve();
  if (writing){ dirty = true; return writing; }
  var stamp = state.updatedAt;
  writing = ref.set(JSON.parse(JSON.stringify(state))).then(function(){
    retried = false; syncError = false;
    if (state.updatedAt === stamp) synced = true;
  }, function(e){
    if (e && e.code === "unavailable" && !retried){ retried = true; dirty = true; }
    else syncError = true;
  }).then(function(){
    writing = null; drawAccount();
    if (dirty && ref){ dirty = false; timer = setTimeout(flush, 1200); }
  });
  return writing;
}
function adopt(next){
  state = next; pickActive(); lastAction = null; forgetReset(); saveLocal(); render(false);
  if (!$("sheet").hidden) drawParts();
  if (!$("psheet").hidden) drawProjects();
}
/* First sign-in on a device that already has projects: keep both sets. */
function mergeStates(remote, local){
  var ids = {}, names = {};
  remote.projects.forEach(function(p){ ids[p.id] = true; });
  local.projects.forEach(function(p){ if (!ids[p.id] && remote.projects.length < MAX_PROJECTS) remote.projects.push(p); });
  remote.bank.forEach(function(b){ names[b.name.trim().toLowerCase()] = true; });
  local.bank.forEach(function(b){ if (!names[b.name.trim().toLowerCase()] && remote.bank.length < MAX_BANK) remote.bank.push(b); });
  remote.activeId = local.activeId;
  return clean(remote);
}
function pull(){
  if (!ref) return;
  var merge = mergeNext; mergeNext = false;
  ref.get().then(function(snap){
    if (snap.exists){
      var remote = clean(snap.data());
      if (merge && state.updatedAt > 0){ adopt(mergeStates(remote, state)); changed(false); }
      else if (remote.updatedAt > state.updatedAt) adopt(remote);
      else if (state.updatedAt > remote.updatedAt){ synced = false; flush(); }
    } else if (state.updatedAt > 0){ synced = false; flush(); }
    syncError = false; drawAccount();
  }, function(e){
    if (e && e.code === "permission-denied"){ syncError = true; drawAccount(); }
  });
}
function connect(){
  drawAccount();
  if (cloud === "off") return;
  Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]).then(function(m){
    var app = m[0].initializeApp(firebaseConfig), auth = m[1].getAuth(app), db = m[2].getFirestore(app);
    fb = {
      signIn: function(){ return m[1].signInWithPopup(auth, new m[1].GoogleAuthProvider()); },
      signOut: function(){ return m[1].signOut(auth); }
    };
    m[1].onAuthStateChanged(auth, function(u){
      user = u; cloud = "ready";
      if (u){
        var d = m[2].doc(db, "users", u.uid);
        ref = {
          get: function(){ return m[2].getDoc(d).then(function(s){ return {exists: s.exists(), data: function(){ return s.data(); }}; }); },
          set: function(body){ return m[2].setDoc(d, body); }
        };
        pull();
      } else ref = null;
      drawAccount();
    });
  }).catch(function(){ cloud = "failed"; drawAccount(); });
}
function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
function signIn(){
  if (!fb) return;
  authError(""); mergeNext = true;
  fb.signIn().catch(function(e){
    mergeNext = false;
    var code = e && e.code;
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    authError(
      code === "auth/popup-blocked" ? "Nettleseren blokkerte innloggingsvinduet. Tillat popup-vinduer for siden og prøv igjen."
      : code === "auth/unauthorized-domain" ? "Dette domenet er ikke godkjent i Firebase ennå. Legg det til under Authentication, Settings, Authorized domains."
      : code === "auth/operation-not-allowed" ? "Google-innlogging er ikke slått på i Firebase-prosjektet."
      : "Innloggingen gikk ikke (" + (code || "ukjent feil") + "). Prøv igjen.");
  });
}
function signOut(){
  if (!fb || !user) return;
  authError("");
  /* signing out clears this device, so make sure the account has the latest copy first */
  var tries = 0;
  (function settle(){
    if (synced || tries++ >= 3) return Promise.resolve();
    return Promise.race([flush(), wait(3000)]).then(function(){ return synced ? null : wait(1300).then(settle); });
  })().then(function(){
    if (!synced){ authError("De siste endringene er ikke lagret på kontoen ennå. Sjekk nettet og prøv igjen."); return; }
    return fb.signOut().then(function(){
      try { localStorage.removeItem(KEY); } catch(e){}
      ref = null; user = null; synced = true;
      adopt(clean({})); drawAccount();
    });
  }).catch(function(){ authError("Fikk ikke logget ut. Prøv igjen."); });
}

/* ---------- actions ---------- */
function buzz(ms){ try { if (navigator.vibrate) navigator.vibrate(ms); } catch(e){} }
function pop(){ var n = $("num"); n.classList.remove("pop"); void n.offsetWidth; n.classList.add("pop"); }
function flash(label, text){
  var old = label.getAttribute("data-text") || label.textContent;
  label.setAttribute("data-text", old); label.textContent = text;
  clearTimeout(label._t); label._t = setTimeout(function(){ label.textContent = old; }, 1600);
}
function hold(btn, fn, doneText){
  var t = null, label = btn.firstElementChild;
  function stop(){ clearTimeout(t); t = null; btn.classList.remove("holding"); }
  function go(){
    if (t) return;
    btn.classList.add("holding");
    t = setTimeout(function(){ stop(); fn(); buzz(40); if (doneText) flash(label, doneText); }, 2000);
  }
  btn.addEventListener("pointerdown", function(e){ if (!e.button) go(); });
  ["pointerup","pointerleave","pointercancel","blur"].forEach(function(ev){ btn.addEventListener(ev, stop); });
  btn.addEventListener("keydown", function(e){ if (e.key === " " || e.key === "Enter"){ e.preventDefault(); if (!e.repeat) go(); } });
  btn.addEventListener("keyup", stop);
  btn.addEventListener("contextmenu", function(e){ e.preventDefault(); });
}
function forgetReset(){ lastReset = null; $("restore").hidden = true; }

var opener = null;
function openSheet(id){
  closeSheets(true);
  if (id === "sheet") drawParts(); else drawProjects();
  var sh = $(id); sh.hidden = false;
  var body = sh.querySelector(".card-body"); if (body) body.scrollTop = 0;
  sh.querySelector(".done").focus();
}
function closeSheets(quiet){
  $("sheet").hidden = true; $("psheet").hidden = true;
  if (!quiet && opener) opener.focus();
}

function wire(){
  var box = $("yarns");
  YARNS.forEach(function(y){
    var l = el("label"), i = el("input"), c = el("span");
    i.type = "radio"; i.name = "yarn"; i.value = y[0]; i.id = "yarn-" + y[0]; i.setAttribute("aria-label", y[1]);
    c.style.background = y[2];
    l.appendChild(i); l.appendChild(c); box.appendChild(l);
    i.addEventListener("change", function(){ P.yarn = y[0]; changed(false); });
  });

  $("add").addEventListener("click", function(){
    if (P.count >= 99999) return;
    forgetReset(); P.count++; lastAction = "row";
    var loc = changed(true); pop();
    buzz(loc.shape ? [25,70,25,70,25] : 12);
  });
  $("undo").addEventListener("click", function(){
    if (lastAction && lastAction.close != null){ delete P.closed[lastAction.close]; lastAction = null; changed(false); return; }
    if (P.count === 0) return;
    P.count--; lastAction = null;
    var loc = locate(P, plan(P)), at = loc.seg ? loc.seg.i : P.parts.length;
    Object.keys(P.closed).forEach(function(k){ if (Number(k) >= at) delete P.closed[k]; });
    changed(false);
  });
  $("next").addEventListener("click", function(){
    var loc = locate(P, plan(P));
    if (!loc.seg || !loc.seg.open) return;
    P.closed[loc.seg.i] = loc.r; lastAction = {close: loc.seg.i};
    var after = changed(true); buzz(after.shape ? [25,70,25,70,25] : 20);
  });

  $("name").addEventListener("input", function(e){ P.name = e.target.value.slice(0,40); changed(false); });
  $("name").addEventListener("keydown", function(e){ if (e.key === "Enter") e.target.blur(); });

  bind($("cast-on"), 1, 999, null, function(v){ P.castOn = v; }, function(){ return String(P.castOn); });
  $("add-part").addEventListener("click", function(){
    if (P.parts.length >= MAX_PARTS) return;
    var segs = plan(P), st = segs.length ? segs[segs.length - 1].end : P.castOn;
    P.parts.push(cleanPart({type:"inc", by:1, every:2, target:st + 10}));
    edited(); drawParts();
    var card = $("parts").lastElementChild; if (card && card.scrollIntoView) card.scrollIntoView({block:"nearest"});
  });
  $("save-bank").addEventListener("click", function(){
    flash($("save-bank"), saveToBank() ? "Lagret i banken som " + (P.name.trim() || "Uten navn") : "Banken er full. Slett en oppskrift først.");
  });

  hold($("reset"), function(){
    if (P.count > 0){
      lastReset = {count: P.count, closed: JSON.parse(JSON.stringify(P.closed))};
      var r = $("restore"); r.textContent = "Angre, gå tilbake til rad " + (P.count + 1); r.hidden = false;
    }
    P.count = 0; P.closed = {}; lastAction = null; changed(false);
  }, "Tilbake på rad 1");
  $("restore").addEventListener("click", function(){
    if (lastReset){ P.count = lastReset.count; P.closed = lastReset.closed; changed(false); }
    forgetReset();
  });
  hold($("delete"), function(){
    var id = P.id;
    state.projects = state.projects.filter(function(p){ return p.id !== id; });
    if (!state.projects.length) state.projects = [cleanProject({name:"Nytt prosjekt", parts:[], count:0})];
    state.activeId = state.projects[0].id; pickActive();
    lastAction = null; forgetReset(); changed(false);
    opener = $("open-projects"); closeSheets();
  }, null);

  $("open-setup").addEventListener("click", function(){ opener = $("open-setup"); openSheet("sheet"); });
  $("open-projects").addEventListener("click", function(){ opener = $("open-projects"); openSheet("psheet"); });
  var closers = document.querySelectorAll("[data-close]");
  for (var i = 0; i < closers.length; i++) closers[i].addEventListener("click", function(){ closeSheets(); });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape") closeSheets(); });
  $("sign-in").addEventListener("click", signIn);
  $("sign-out").addEventListener("click", signOut);
  /* leaving the page: push only if this device has unsaved changes, so a stale tab never overwrites a newer copy */
  document.addEventListener("visibilitychange", function(){
    if (document.visibilityState === "hidden"){ if (!synced) flush(); }
    else pull();
  });
}

var saved = null;
try { saved = JSON.parse(localStorage.getItem(KEY)); } catch(e){}
state = clean(saved); pickActive();
wire(); render(false); connect();
