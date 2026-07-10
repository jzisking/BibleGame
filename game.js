'use strict';

/* ============================================================
   EIN STERN ÜBER BETHLEHEM – Kapitel 1–19
   Ein Point-&-Click-Adventure nach Lukas 1–8 und Matthäus 2
   ============================================================ */

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;

function cssPx(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

function viewportSize() {
  const vv = window.visualViewport;
  return {
    width: vv ? vv.width : window.innerWidth,
    height: vv ? vv.height : window.innerHeight,
  };
}

function fitGameToViewport() {
  const pad = cssPx('--page-pad', 12);
  const sentenceH = cssPx('--sentence-height', 30);
  const uiH = cssPx('--ui-height', 152);
  const viewport = viewportSize();
  const availableW = Math.max(1, viewport.width - pad * 2);
  const availableCanvasH = Math.max(1, viewport.height - pad * 2 - sentenceH - uiH);
  const fittedW = Math.max(1, Math.min(W, availableW, availableCanvasH * (W / H)));
  document.documentElement.style.setProperty('--game-width', `${fittedW}px`);
}

function scheduleViewportFit() {
  fitGameToViewport();
  requestAnimationFrame(fitGameToViewport);
  setTimeout(fitGameToViewport, 120);
}

scheduleViewportFit();
window.addEventListener('resize', scheduleViewportFit);
window.addEventListener('orientationchange', scheduleViewportFit);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleViewportFit);
  window.visualViewport.addEventListener('scroll', scheduleViewportFit);
}

const sentenceEl = document.getElementById('sentence');
const verbsEl    = document.getElementById('verbs');
const invItemsEl = document.getElementById('invItems');
const choicesEl  = document.getElementById('choices');

const VERBS = ['Gehe zu', 'Schau an', 'Nimm', 'Rede mit', 'Benutze', 'Gib'];

/* ---------------- Spielzustand ---------------- */

const state = {
  room: 'feldtag',
  verb: 'Gehe zu',
  item: null,          // gewähltes Inventar-Item (für Benutze/Gib)
  inventory: [],
  started: false,
};

const F = {              // Story-Flags
  tookEimer: false,
  eimerVoll: false,
  traenkeVoll: false,
  tookFloete: false,
  floeteGiven: false,
  tagDone: false,
  tookWood: false,
  tookStaff: false,
  fireLit: false,
  lambSaved: false,
  starDone: false,
  angelDone: false,
  wirtOut: false,
  metWaechter: false,
  knowsCouple: false,
  foundStable: false,
  tookKrug: false,
  soldierBusy: false,
  fleeing: false,
  tookSchlauch: false,
  schlauchVoll: false,
  eselWasser: false,
  dattelnTaken: false,
  dattelnGiven: false,
  abendDone: false,
  toldRahel: false,
  toldEli: false,
  toldMirjam: false,
  josefDa: false,
  heimkehrDone: false,
  simonMet: false,
  netzeSauber: false,
  bootAngefragt: false,
  bootDraussen: false,
  fangDone: false,
  tragerMet: false,
  tookSeil: false,
  seileBefestigt: false,
  leiterBereit: false,
  dachOffen: false,
  mannGeheilt: false,
  zoellnerMet: false,
  zoellnerCalled: false,
  tookEinladung: false,
  gaesteEingeladen: false,
  mahlDone: false,
  fastenFrage: false,
  alterSchlauchGesehen: false,
  neuerSchlauchGesehen: false,
  weinVerstanden: false,
  sabbatStart: false,
  tookAehren: false,
  koernerGerieben: false,
  sabbatDone: false,
  mannMet: false,
  lauerErkannt: false,
  handGeheilt: false,
  bergReisig: false,
  bergFeuer: false,
  simonNacht: false,
  jesusUnten: false,
  zwoelfDone: false,
  witweGeheilt: false,
  steinmetzMet: false,
  feldredeDone: false,
  hauptmannMet: false,
  aeltesteLos: false,
  jesusKommt: false,
  knechtGesund: false,
  traegerMet: false,
  mengeStill: false,
  juenglingLebt: false,
  johannesBotenMet: false,
  blinderGefuehrt: false,
  blinderGeheilt: false,
  armeHoeren: false,
  antwortGesandt: false,
  pharisaeerMahlBegonnen: false,
  wasserVermisst: false,
  kussVermisst: false,
  oelVermisst: false,
  frauEingetreten: false,
  frauVergeben: false,
  reiseFrauenVorgestellt: false,
  samenErhalten: false,
  wegBesaet: false,
  felsBesaet: false,
  dornenBesaet: false,
  guterBodenBesaet: false,
  gleichnisErklaert: false,
  sturmFahrtBegonnen: false,
  sturmBegonnen: false,
  sturmSegelGesichert: false,
  sturmWasserGeschoepft: false,
  sturmJuengerBereit: false,
  sturmGestillt: false,
  ended: false,
};

const fx = {             // animierte Werte
  starGrow: 0,
  angelY: -220,
  angelGlow: 0,
  angelVisible: false,
  famX: 320,
  abend: 0,           // 0 = Abendrot, 1 = Nacht (Raum 'aegypten')
  sonne: 0,           // 0 = Nachmittag, 1 = Sonnenuntergang (Raum 'feldtag')
  boot: 0,            // 0 = am Strand, 1 = zum Lehren, 1.5 = im Tiefen (Raum 'see')
  boot2: 0,           // zweites Boot kommt zu Hilfe (Lukas 5,7)
  trage: 0,           // 0 = auf dem Dach, 1 = vor Jesus herabgelassen (Raum 'haus')
  mitte: 0,           // 0 = am Rand, 1 = in der Mitte (Raum 'synagoge2', Lukas 6,8)
  morgen: 0,          // 0 = Nacht, 1 = Morgen (Raum 'berg', Lukas 6,13)
  sturm: 0,           // 0 = ruhiger See, 1 = voller Sturm (Raum 'sturmsee')
  fade: 0,
};

const player = {
  x: 560, y: 500, tx: 560, ty: 500,
  facing: -1, walking: false, walkT: 0, visible: true,
};

let walkRes = null;      // Resolver des aktuellen Laufbefehls
let blockCount = 0;
const block = () => blockCount++;
const unblock = () => blockCount--;
const isBlocked = () => blockCount > 0;

let hoverName = '';
let bleatTimer = 4;      // Lamm blökt regelmäßig als Hinweis
let bleatUntil = 0;

/* ---------------- Gegenstände ---------------- */

const ITEMS = {
  holz: { name: 'Reisig',     look: 'Trockene Zweige. Genau das Richtige, um ein müdes Feuer aufzuwecken.' },
  stab: { name: 'Hirtenstab', look: 'Mein treuer Hirtenstab. Gut gegen Wölfe, Langeweile und festgeklemmte Lämmer.' },
  lamm: { name: 'Lamm',       look: 'Das kleine Lamm. Es zittert noch ein bisschen und knabbert an meinem Ärmel.' },
  krug: { name: 'Weinkrug',   look: 'Ein bauchiger Krug süßer Wein vom verlassenen Marktstand. Ich habe eine Münze dagelassen – Hirtenehre.' },
  schlauch: { name: 'Wasserschlauch',
    get look() {
      return F.schlauchVoll
        ? 'Der Wasserschlauch ist prall gefüllt. Kühles Quellwasser – das beste Ägyptens, vermutlich.'
        : 'Ein lederner Wasserschlauch vom Packsattel des Esels. Leer und knittrig wie Schimons Laune am Morgen.';
    } },
  datteln:  { name: 'Datteln', look: 'Eine ganze Rispe süßer Datteln, frisch von der Palme. Reiseproviant, wie ihn die Karawanen lieben.' },
  eimer: { name: 'Eimer',
    get look() {
      return F.eimerVoll
        ? 'Der Eimer ist randvoll mit kühlem Bachwasser. Nicht kleckern.'
        : 'Ein hölzerner Eimer. Leer. Schreit förmlich nach dem Bach da drüben.';
    } },
  floete: { name: 'Hirtenflöte', look: 'Levis Hirtenflöte aus Schilfrohr. Sie sieht harmlos aus. Sie klingt nicht so.' },
  seil: { name: 'Seile', look: 'Zwei feste Seile. Nicht schön, aber tragfähig – was bei Seilen deutlich wichtiger ist.' },
  einladung: { name: 'Einladung', look: 'Levis Einladung zum Mahl. Ein kleiner Wachstafel-Zettel mit erstaunlich viel Mut darauf.' },
  aehren: { name: 'Ähren', look: 'Ein paar reife Ähren vom Feldrand. Zwischen den Händen gerieben werden daraus Körner – einfache Nahrung für müde Wanderer.' },
  samen: { name: 'Saatkörner', look: 'Eine Handvoll Saatkörner aus dem Beutel des Sämanns. In jedem steckt eine Möglichkeit – wenn der Boden sie aufnimmt.' },
};

function addItem(id)    { state.inventory.push(id); renderInv(); }
function removeItem(id) { state.inventory = state.inventory.filter(i => i !== id); if (state.item === id) state.item = null; renderInv(); }

function renderInv() {
  invItemsEl.innerHTML = '';
  for (const id of state.inventory) {
    const b = document.createElement('button');
    b.className = 'item' + (state.item === id ? ' sel' : '');
    b.textContent = ITEMS[id].name;
    b.onclick = () => onItemClick(id);
    b.onmouseenter = () => { hoverName = ITEMS[id].name; updateSentence(); };
    b.onmouseleave = () => { hoverName = ''; updateSentence(); };
    invItemsEl.appendChild(b);
  }
}

function onItemClick(id) {
  if (isBlocked()) return;
  if (state.verb === 'Schau an') {
    say('joel', ITEMS[id].look);
    resetVerb();
  } else if (state.verb === 'Benutze' || state.verb === 'Gib') {
    state.item = id;
    renderInv();
    updateSentence();
  } else {
    say('joel', 'Das habe ich doch schon.');
  }
}

/* ---------------- Verben-UI ---------------- */

function renderVerbs() {
  verbsEl.innerHTML = '';
  for (const v of VERBS) {
    const b = document.createElement('button');
    b.className = 'verb' + (state.verb === v ? ' sel' : '');
    b.textContent = v;
    b.onclick = () => { if (isBlocked()) return; state.verb = v; state.item = null; renderVerbs(); renderInv(); updateSentence(); };
    verbsEl.appendChild(b);
  }
}

function resetVerb() {
  state.verb = 'Gehe zu';
  state.item = null;
  renderVerbs();
  renderInv();
  updateSentence();
}

function updateSentence() {
  const it = state.item ? ITEMS[state.item].name : null;
  let txt;
  switch (state.verb) {
    case 'Schau an': txt = hoverName ? `Schau ${hoverName} an` : 'Schau an'; break;
    case 'Benutze':  txt = it ? `Benutze ${it} mit ${hoverName || '...'}` : `Benutze ${hoverName || ''}`; break;
    case 'Gib':      txt = it ? `Gib ${it} an ${hoverName || '...'}` : `Gib ${hoverName || ''}`; break;
    default:         txt = `${state.verb} ${hoverName || ''}`;
  }
  sentenceEl.textContent = txt.trim() || ' ';
}

/* ---------------- Sprache & Skript-Helfer ---------------- */

const ACTORS = {
  joel:     { color: '#f2f2f2', pos: () => [player.x, player.y - 128] },
  levi:     { color: '#b8e070', pos: () => state.room === 'sturmsee' ? [350, 350] : state.room === 'saemannfeld' ? [120, 390] : state.room === 'nain' ? [320, 392] : state.room === 'kapernaum' ? [150, 392] : state.room === 'ebene' ? [250, 390] : state.room === 'berg' ? [180, 395] : state.room === 'sabbatfeld' ? [232, 382] : state.room === 'zollhaus' ? [220, 380] : state.room === 'haus' ? [825, 380] : state.room === 'see' ? [840, 382] : (state.room === 'synagoge' || state.room === 'synagoge2') ? [215, 380] : (state.room === 'field' || state.room === 'feldtag') ? [468, 365] : state.room === 'weg' ? [560, 370] : state.room === 'city' ? [190, 372] : [225, 390] },
  schimon:  { color: '#ffb060', pos: () => state.room === 'feldtag' ? [295, 370] : state.room === 'field' ? [295, 398] : state.room === 'weg' ? [462, 374] : state.room === 'city' ? [135, 370] : [150, 412] },
  wirt:     { color: '#ff9a8a', pos: () => [530, 200] },
  waechter: { color: '#c8b8ff', pos: () => [722, 378] },
  katze:    { color: '#ffffff', pos: () => [318, 420] },
  engel:    { color: '#aef3ff', pos: () => [480, Math.max(60, fx.angelY - 95)] },
  chor:     { color: '#fff0a0', pos: () => [480, 150] },
  maria:    { color: '#9fb6ff', pos: () => state.room === 'aegypten' ? [700, 362] : state.room === 'flucht' ? [258, 358] : [405, 392] },
  josef:    { color: '#d8b48a', pos: () => state.room === 'nazaret' ? [840, 372] : state.room === 'aegypten' ? [765, 358] : state.room === 'flucht' ? [228, 326] : [560, 380] },
  rahel:    { color: '#ffb8d0', pos: () => [540, 372] },
  eli:      { color: '#d8d870', pos: () => [720, 378] },
  mirjam:   { color: '#a0e8d8', pos: () => [280, 425] },
  jesus:    { color: '#ffe8b0', pos: () => state.room === 'sturmsee' ? [710, 330] : state.room === 'saemannfeld' ? [560, 300] : state.room === 'pharisaeerhaus' ? [610, 390] : state.room === 'nain' ? [250, 372] : state.room === 'kapernaum' ? [300, 372] : state.room === 'ebene' ? [480, 332] : state.room === 'berg' ? (F.jesusUnten ? [620, 372] : [790, 140]) : state.room === 'sabbatfeld' ? [640, 350] : state.room === 'zollhaus' ? (F.gaesteEingeladen ? [540, 350] : F.zoellnerCalled ? [705, 360] : [420, 365]) : state.room === 'haus' ? [505, 286] : state.room === 'see' ? (fx.boot > 0 ? [640 - fx.boot * 140, 310 - fx.boot * 55] : [255, 375]) : [480, 240] },
  simon:    { color: '#8ad8f0', pos: () => state.room === 'sturmsee' ? [560, 350] : state.room === 'ebene' ? [600, 372] : state.room === 'berg' ? [520, 372] : fx.boot > 0 ? [640 - fx.boot * 140 + 30, 320 - fx.boot * 55] : [520, 380] },
  menge:    { color: '#e0c8ff', pos: () => state.room === 'nain' ? [120, 392] : state.room === 'ebene' ? [200, 392] : state.room === 'sabbatfeld' ? [440, 390] : state.room === 'zollhaus' ? [430, 380] : state.room === 'haus' ? [430, 372] : state.room === 'see' ? [210, 395] : [700, 380] },
  freund:   { color: '#a8e090', pos: () => state.room === 'kapernaum' ? [360, 378] : state.room === 'haus' ? [160, 382] : [480, 380] },
  gelaehmter:{ color: '#d8c8b0', pos: () => state.room === 'haus' ? (F.mannGeheilt ? [470, 372] : (fx.trage > 0 ? [505, 245 + fx.trage * 125] : [165, 420])) : [480, 380] },
  pharisaeer:{ color: '#f0d080', pos: () => state.room === 'pharisaeerhaus' ? [350, 390] : state.room === 'synagoge2' ? [700, 392] : state.room === 'sabbatfeld' ? [770, 372] : state.room === 'zollhaus' ? [720, 360] : state.room === 'haus' ? [650, 355] : [660, 380] },
  mann:     { color: '#e8c8a8', pos: () => state.room === 'ebene' ? [790, 378] : [870 - fx.mitte * 395, 395 - fx.mitte * 20] },
  witwe:    { color: '#f0c8e0', pos: () => F.witweGeheilt ? [370, 385] : [95, 412] },
  hauptmann:{ color: '#ffa890', pos: () => [760, 370] },
  aelteste: { color: '#d8c8a0', pos: () => [430, 375] },
  knecht:   { color: '#b8e8c8', pos: () => [806, 380] },
  traeger:  { color: '#b8c8d8', pos: () => [620, 385] },
  mutter:   { color: '#e8d0f0', pos: () => [745, 382] },
  juengling:{ color: '#d8f0c8', pos: () => [660, 380] },
  bote:     { color: '#d7c4a0', pos: () => state.room === 'johannesfrage' ? [430, 390] : [480, 380] },
  blinder:  { color: '#e0d0b0', pos: () => state.room === 'johannesfrage' ? (F.blinderGeheilt ? [610, 392] : [705, 392]) : [520, 380] },
  arme:     { color: '#e8d0a0', pos: () => state.room === 'johannesfrage' ? [180, 402] : [480, 380] },
  frau:     { color: '#f0c8dc', pos: () => [690, 430] },
  magdalena:{ color: '#e8b8d0', pos: () => [210, 388] },
  johanna:  { color: '#b8d8e8', pos: () => [260, 388] },
  susanna:  { color: '#d8c8a0', pos: () => [310, 388] },
  saemann:  { color: '#e8cf8a', pos: () => [470, 382] },
  levizoellner:{ color: '#e8b070', pos: () => state.room === 'zollhaus' ? (F.gaesteEingeladen ? [610, 350] : F.zoellnerCalled ? [760, 372] : [548, 376]) : [520, 380] },
  zoellner: { color: '#c8b0e8', pos: () => [310, 385] },
  juenger:  { color: '#c0d8ff', pos: () => state.room === 'sturmsee' ? [470, 350] : state.room === 'ebene' ? [660, 380] : state.room === 'berg' ? [300, 400] : state.room === 'sabbatfeld' ? [420, 382] : [500, 380] },
  soldat:   { color: '#ff8a7a', pos: () => F.soldierBusy ? [690, 398] : [370, 374] },
  esel:     { color: '#cabba8', pos: () => state.room === 'aegypten' ? [450, 385] : [430, 428] },
  kind:     { color: '#ffd8b0', pos: () => [706, 408] },
  erzaehler:{ color: '#9ad1ff', pos: () => [480, 60] },
  lamm:     { color: '#ffffff', pos: () => [840, 432] },
  schaf:    { color: '#ffffff', pos: () => [630, 420] },
  ochse:    { color: '#c8a070', pos: () => [705, 392] },
};

let speech = null;

function say(actor, text) {
  if (speech) finishSpeech();
  return new Promise(res => {
    const dur = Math.max(1700, 900 + text.length * 52);
    speech = { actor, text, until: performance.now() + dur, res };
  });
}

function finishSpeech() {
  if (!speech) return;
  const s = speech;
  speech = null;
  s.res();
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

const anims = [];
function animate(ms, fn) {
  return new Promise(res => anims.push({ t0: performance.now(), ms, fn, res }));
}

async function cutscene(fn) {
  block();
  try { await fn(); } finally { unblock(); updateSentence(); }
}

function choose(options) {
  return new Promise(res => {
    choicesEl.innerHTML = '';
    choicesEl.classList.remove('hidden');
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = '● ' + o;
      b.onclick = () => { choicesEl.classList.add('hidden'); res(i); };
      choicesEl.appendChild(b);
    });
  });
}

/* ---------------- Bewegung ---------------- */

const WALK = { x0: 40, x1: 920, y0: 442, y1: 524 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function walkPlayerTo(x, y) {
  if (walkRes) { const r = walkRes; walkRes = null; r(false); }
  player.tx = clamp(x, WALK.x0, WALK.x1);
  player.ty = clamp(y, WALK.y0, WALK.y1);
  player.walking = true;
  return new Promise(r => { walkRes = r; });
}

function updatePlayer(dt) {
  if (!player.walking) return;
  const dx = player.tx - player.x, dy = player.ty - player.y;
  const d = Math.hypot(dx, dy);
  if (d < 3) {
    player.walking = false;
    if (walkRes) { const r = walkRes; walkRes = null; r(true); }
    return;
  }
  if (Math.abs(dx) > 2) player.facing = dx > 0 ? 1 : -1;
  const k = Math.min(1, 175 * dt / d);
  player.x += dx * k;
  player.y += dy * k;
  player.walkT += dt * 9;
}

/* ---------------- Verb-Dispatch ---------------- */

async function doAction(hs, v, it) {
  if (!hs.noWalk) {
    const ok = await walkPlayerTo(hs.walk[0], hs.walk[1]);
    if (!ok) return;
    player.facing = (hs.rect[0] + hs.rect[2] / 2) >= player.x ? 1 : -1;
  }
  block();
  try { await dispatchVerb(hs, v, it); } finally { unblock(); updateSentence(); }
}

async function dispatchVerb(hs, v, it) {
  switch (v) {
    case 'Gehe zu':
      if (hs.goto) await hs.goto();
      break;
    case 'Schau an':
      if (hs.look) await hs.look();
      else await say('joel', 'Nichts Besonderes.');
      break;
    case 'Nimm':
      if (hs.take) await hs.take();
      else await say('joel', 'Das nehme ich lieber nicht mit.');
      break;
    case 'Rede mit':
      if (hs.talk) await hs.talk();
      else await say('joel', `Ich unterhalte mich doch nicht mit ${hs.name}. Was sollen die Schafe denken?`);
      break;
    case 'Benutze':
      if (it) {
        if (hs.useItem) await hs.useItem(it);
        else await say('joel', 'Das funktioniert so nicht.');
      } else {
        if (hs.use) await hs.use();
        else await say('joel', 'Und wie genau stellst du dir das vor?');
      }
      break;
    case 'Gib':
      if (!it) await say('joel', 'Erst muss ich auswählen, WAS ich geben will.');
      else if (hs.giveItem) await hs.giveItem(it);
      else await say('joel', 'Das behalte ich lieber.');
      break;
  }
}

/* ============================================================
   STORY-SZENEN
   ============================================================ */

async function intro() {
  await cutscene(async () => {
    await wait(500);
    await say('erzaehler', 'Felder bei Bethlehem. Später Nachmittag, irgendwann zwischen Lukas 1 und Lukas 2.');
    await say('joel', 'Ich bin Joel. Hirte. Der Jüngste von uns dreien – das heißt: Ich mache die Arbeit.');
    await say('schimon', 'JOEL! Bevor die Sonne untergeht, braucht die Herde Wasser. Die Tränke ist staubtrocken!');
    await say('levi', 'Und meine Flöte ist WEG! Ohne Flöte kann ich nicht Wache halten! Die Nacht ist verloren!');
    await say('joel', '(Wasser in die Tränke, Levis Flöte wiederfinden. Und das alles vor Sonnenuntergang.)');
    await say('joel', '(Ein ganz normaler Tag.)');
  });
}

async function checkAbendrot() {
  if (F.traenkeVoll && F.floeteGiven && !F.tagDone) {
    F.tagDone = true;
    await sonnenuntergang();
  }
}

async function sonnenuntergang() {
  await wait(700);
  await say('schimon', 'Tränke voll, Flöte gefunden, Herde satt. Dann zählt durch, bevor das Licht geht!');
  await say('joel', 'Eins, zwei, drei... achtzehn, neunzehn... zwanzig! Alle da, Schimon.');
  await say('schimon', 'Zwanzig. Merk dir die Zahl, Junge. Nachts zählt man sie wieder.');
  await say('levi', 'Und ich spiele das Abendlied! ♪ Fidel-di-düü... ♪');
  await say('joel', '(Die Sonne flieht. Ich kann es ihr nicht verdenken.)');
  await say('erzaehler', 'Die Sonne versinkt hinter den Hügeln Judäas...');
  await animate(4500, p => { fx.sonne = p; });
  await say('schimon', 'Joel, du hast die erste Wache. Levi die zweite. Ich übernehme die... Gesamtaufsicht. Im Sitzen.');
  await say('joel', 'Du meinst: schlafen.');
  await say('schimon', 'ÜBERWACHEN. Mit geschlossenen Augen. Das nennt man Erfahrung.');
  await animate(1500, p => { fx.fade = p; });
  state.room = 'field';
  player.x = 560; player.y = 500;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = -1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'Stunden später. Mitten in der Nacht.');
  await say('joel', 'Schimon „überwacht“ mit beachtlicher Lautstärke, und das Lagerfeuer ist schon wieder fast aus.');
  await say('joel', 'Und irgendwo blökt ein Lamm. Das klingt aber nicht, als läge es gemütlich bei der Herde...');
  await say('joel', 'Na großartig. Dann wollen wir mal.');
}

async function lightFire() {
  removeItem('holz');
  F.fireLit = true;
  await say('joel', 'So... ein bisschen Reisig auf die Glut...');
  await wait(600);
  await say('joel', 'Ha! Es brennt! Ich bin praktisch ein Feuermacher-Meister.');
  await wait(300);
  await say('schimon', 'Schnarch... hm... WAS? Brennt die Herberge?');
  await say('joel', 'Nur das Lagerfeuer, Schimon. Gern geschehen.');
  await say('schimon', 'Hmpf. Wenn du schon wach bist: Zähl die Herde. Ich komme vorhin nur auf NEUNZEHN Schafe.');
  await say('joel', 'Es müssten zwanzig sein...');
  await checkStar();
}

async function rescueLamb() {
  await say('joel', 'Ich angle mit dem Stab vorsichtig hinter den Felsen...');
  await wait(700);
  await say('lamm', 'Määäh!');
  F.lambSaved = true;
  addItem('lamm');
  await say('joel', 'Hab dich! Komm her, du kleiner Ausreißer.');
  await say('joel', 'Das macht zwanzig Schafe. Schimon kann wieder beruhigt... sitzen.');
  await checkStar();
}

async function checkStar() {
  if (F.fireLit && F.lambSaved && !F.starDone) {
    F.starDone = true;
    await starCutscene();
  }
}

async function starCutscene() {
  await wait(900);
  await say('erzaehler', 'Und plötzlich...');
  await animate(2800, p => { fx.starGrow = p; });
  await say('joel', 'Levi... siehst du das auch?');
  await say('levi', 'D-d-der Stern! So einen gab es noch NIE am Himmel!');
  await say('schimon', 'Ich zähle seit vierzig Jahren nachts Sterne statt Schafe. Aber DEN kenne ich nicht.');
  await wait(400);
  fx.angelVisible = true;
  await animate(2600, p => { fx.angelY = -220 + p * 520; fx.angelGlow = p; });
  await say('erzaehler', 'Da trat der Engel des Herrn zu ihnen, und die Herrlichkeit des Herrn umstrahlte sie. (Lukas 2,9)');
  await say('levi', 'AAAAH!');
  await say('schimon', '...');
  await say('joel', '(Ich würde ja wegrennen, aber meine Beine haben gekündigt.)');
  await say('engel', 'Fürchtet euch nicht! Siehe, ich verkünde euch große Freude, die allem Volk widerfahren wird:');
  await say('engel', 'Euch ist heute der Retter geboren – Christus, der Herr – in der Stadt Davids.');
  await say('engel', 'Und das ist das Zeichen: Ihr werdet ein Kind finden, in Windeln gewickelt und in einer Krippe liegend. (Lukas 2,10-12)');
  await say('erzaehler', 'Und plötzlich war bei dem Engel die Menge der himmlischen Heerscharen, die lobten Gott:');
  await say('chor', '„Ehre sei Gott in der Höhe und Friede auf Erden bei den Menschen seines Wohlgefallens!“ (Lukas 2,14)');
  await animate(2200, p => { fx.angelY = 300 - p * 520; fx.angelGlow = 1 - p; });
  fx.angelVisible = false;
  await say('schimon', 'Lasst uns nach Bethlehem gehen und sehen, was da geschehen ist, was der Herr uns verkündet hat!');
  await say('levi', 'Und... und die Schafe?');
  await say('schimon', 'Rahels Hund passt auf. Der nimmt seinen Beruf ernster als du.');
  await say('joel', 'Dann los! Der Weg nach Bethlehem ist da drüben, rechts am Schild.');
  F.angelDone = true;
}

async function leaveField() {
  await say('joel', 'Auf nach Bethlehem!');
  await walkPlayerTo(920, 470);
  await animate(900, p => { fx.fade = p; });
  await say('erzaehler', 'Noch in derselben Nacht eilten die Hirten nach Bethlehem... (Lukas 2,16)');
  await wegSzene();
  await arriveCity();
}

async function wegSzene() {
  state.room = 'weg';
  player.x = 40; player.y = 508; player.facing = 1;
  await animate(900, p => { fx.fade = 1 - p; });
  await walkPlayerTo(360, 502);
  await say('levi', 'Schaut mal, wie nah Bethlehem schon ist! Man sieht sogar das Stadttor.');
  await say('joel', 'Und der Stern... er steht GENAU über der Stadt. Als würde er auf sie zeigen.');
  await say('schimon', 'Natürlich tut er das, Junge. Habt ihr zwei in der Schriftstunde wieder geschlafen?');
  await say('levi', 'Nur bei den Geschlechtsregistern...');
  await say('schimon', 'Schon der Seher Bileam hat es angekündigt, vor über tausend Jahren: „Es wird ein Stern aus Jakob aufgehen und ein Zepter aus Israel aufkommen.“ (4. Mose 24,17)');
  await say('joel', 'Ein Stern... als Zeichen für einen König?');
  await say('schimon', 'Für DEN König. Und der Prophet Micha schrieb: „Du, Bethlehem, bist keineswegs die kleinste – denn aus dir wird der kommen, der Herr über Israel ist.“ (Micha 5,1)');
  await say('levi', 'Eine uralte Prophezeiung... und sie geht ausgerechnet in UNSERER Nachtschicht auf?');
  await say('schimon', 'Sieht ganz so aus. Also trödelt nicht – einer Verheißung läuft man entgegen!');
  await walkPlayerTo(920, 490);
  await animate(900, p => { fx.fade = p; });
}

async function arriveCity() {
  state.room = 'city';
  player.x = 40; player.y = 505; player.facing = 1;
  await animate(900, p => { fx.fade = 1 - p; });
  await walkPlayerTo(250, 508);
  await say('levi', 'Wow. Ich war noch nie nachts in der Stadt.');
  await say('schimon', 'Voll wie ein Schafpferch vor der Schur. Diese Volkszählung...');
  await say('joel', 'Der Engel sagte: ein Kind in einer Krippe. Aber WO? Bethlehem hat hundert Höfe und Ställe.');
  await say('joel', 'Wir müssen wohl jemanden fragen.');
}

async function leaveCity() {
  await say('joel', 'Die Gasse rechts, den Hang hinunter, zum alten Stall. Los!');
  await walkPlayerTo(920, 485);
  await animate(900, p => { fx.fade = p; });
  state.room = 'stable';
  player.x = 40; player.y = 505; player.facing = 1;
  await animate(900, p => { fx.fade = 1 - p; });
  await walkPlayerTo(190, 505);
  await say('joel', 'Da ist er. Der alte Stall am Hang, genau unter dem Stern.');
  await say('joel', 'Und da... in der Krippe... genau wie der Engel gesagt hat.');
}

async function knockDoor() {
  if (!F.wirtOut) {
    await say('joel', 'KLOPF. KLOPF. KLOPF.');
    await wait(500);
    F.wirtOut = true;
    await say('wirt', 'BELEGT! B-E-L-E-G-T! Steht doch an der Tür!');
    await say('joel', 'Wir suchen kein Zimmer, wir...');
    await say('wirt', 'Das sagen ALLE. Und dann wollen sie doch eins. Mit Frühstück!');
    await say('joel', '(Er bleibt misstrauisch am Fenster hängen. Vielleicht kann ich ihn etwas fragen.)');
  } else {
    await say('wirt', 'IMMER NOCH BELEGT!');
    await say('joel', 'Ich wollte nur... schon gut.');
  }
}

async function finale() {
  removeItem('lamm');
  await say('joel', 'Maria... wir sind nur Hirten. Wir haben nicht viel. Aber das hier ist für das Kind.');
  await say('lamm', 'Mäh!');
  await say('maria', 'Danke, Joel. Es ist wunderschön.');
  await say('joel', 'Der Engel hat gesagt: Euch ist heute der Retter geboren. Christus, der Herr.');
  await say('maria', '...');
  await say('erzaehler', 'Maria aber bewahrte alle diese Worte und bewegte sie in ihrem Herzen. (Lukas 2,19)');
  await wait(600);
  await say('schimon', 'Vierzig Jahre Nachtschicht... und DAS ist die erste, die sich wirklich gelohnt hat.');
  await say('levi', 'Das müssen wir ALLEN erzählen!');
  await say('joel', 'Dann mal los. Wir haben eine frohe Botschaft auszurichten.');
  await say('erzaehler', 'Und die Hirten kehrten wieder um, priesen und lobten Gott für alles, was sie gehört und gesehen hatten. (Lukas 2,20)');
  await chapterTwo();
}

/* ============================================================
   KAPITEL 2: DIE FLUCHT NACH ÄGYPTEN (Matthäus 2)
   ============================================================ */

async function chapterTwo() {
  await animate(1500, p => { fx.fade = p; });
  state.room = 'flucht';
  player.x = 920; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = -1;
  await animate(1000, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 2: DIE FLUCHT NACH ÄGYPTEN (Matthäus 2)');
  await say('erzaehler', 'Monate später. Die Familie wohnt inzwischen in einem kleinen Haus in Bethlehem.');
  await say('erzaehler', 'Weise aus dem Morgenland waren da, einem Stern gefolgt. Sie brachten Gold, Weihrauch und Myrrhe – und zogen auf einem anderen Weg heim, ohne König Herodes zu verraten, wo das Kind ist. (Matthäus 2,11-12)');
  await walkPlayerTo(700, 510);
  await say('joel', 'Ich wollte nur kurz nach der Familie sehen. Aber... wer steht denn DA vor ihrem Haus?');
  await say('soldat', 'HE! DU DA! Hirte!');
  await walkPlayerTo(560, 508);
  player.facing = -1;
  await say('soldat', 'Ich suche ein Kind. Ungefähr ein halbes Jahr alt. „Neugeborener König“, Sterndeuter-Gerede. König Herodes möchte es... anbeten.');
  const c = await choose([
    'Ein Kind? Bethlehem ist VOLLER Kinder.',
    'Versucht es in Jerusalem. Da wohnen die wichtigen Leute.',
    'Ähm... schaut mal, ein Adler!',
  ]);
  if (c === 0) await say('soldat', 'Das sagen ALLE in diesem Kaff. Ich kann warten.');
  else if (c === 1) await say('soldat', 'Glaubst du, das hat noch keiner versucht? Ich. Kann. Warten.');
  else { await say('soldat', 'WO?! ...'); await say('soldat', 'Sehr witzig, Hirte. Ich kann trotzdem warten.'); }
  await say('soldat', 'Ich bleibe genau hier stehen, bis sich in diesem Haus etwas rührt. BEFEHL.');
  await say('joel', '(„Anbeten“. Herodes hat noch nie jemanden angebetet außer sich selbst. Das Kind ist in Gefahr.)');
  await say('joel', '(Ich muss diesen Soldaten irgendwie von der Tür weglocken...)');
}

async function talkSoldat() {
  let done = false;
  while (!done) {
    const c = await choose([
      'Was will Herodes WIRKLICH von dem Kind?',
      'Lange Schicht heute?',
      'Schöner Helm.',
      'Ich muss dann mal weiter.',
    ]);
    if (c === 0) {
      await say('soldat', 'ANBETEN, habe ich gesagt. Der König will es anbeten. Steht so im Befehl.');
      await say('joel', '(Und ich bin der Statthalter von Syrien. Das Kind muss hier weg.)');
    } else if (c === 1) {
      await say('soldat', 'Seit TAGEN stehe ich hier herum! Kein Schluck Wein, keine warme Mahlzeit, NICHTS!');
      await say('soldat', 'Und dieses Kaff hat nicht mal eine Schenke, die um diese Uhrzeit öffnet.');
      await say('joel', '(Durstig also. SEHR durstig. Hmm...)');
    } else if (c === 2) {
      await say('soldat', 'Nicht wahr? Der Busch ist echtes Pferdehaar. Ich kämme ihn jeden Morgen.');
      await say('joel', 'Beeindruckend. Und so... rot.');
    } else {
      await say('soldat', 'Geh nur. Ich. Bleibe. Hier.');
      done = true;
    }
  }
}

async function bribeSoldier() {
  removeItem('krug');
  await say('joel', 'Ihr seht durstig aus, Soldat. Süßer Wein – gegen die lange Wartezeit.');
  await say('soldat', 'Wein? Für MICH?');
  await say('soldat', 'Na ENDLICH versteht einer, was Wachdienst BEDEUTET.');
  F.soldierBusy = true;
  await say('soldat', 'Ich... äh... inspiziere mal gründlich diesen Marktstand da drüben. Aus taktischen Gründen.');
  await say('joel', '(Er hat sich an den Stand verzogen und prostet seinem Helm zu. JETZT oder nie.)');
}

async function warnFamily() {
  await say('joel', '(Klopf, klopf, klopf – ganz leise.)');
  await wait(400);
  await say('josef', 'Joel! Was machst du hier, so früh am Morgen?');
  await say('joel', 'Josef! Ein Soldat des Herodes fragt überall nach dem Kind! Er stand bis eben direkt vor eurer Tür!');
  await say('josef', 'Dann ist es also wahr...');
  await say('josef', 'Heute Nacht stand ein Engel des Herrn im Traum vor mir und sprach: Steh auf, nimm das Kind und seine Mutter und flieh nach Ägypten! Denn Herodes wird das Kind suchen, um es zu töten. (Matthäus 2,13)');
  await say('maria', 'Wir haben schon gepackt, Joel. Die Gaben der Weisen werden uns die Reise bezahlen.');
  await say('joel', 'Der Soldat ist abgelenkt. Ich mache den Esel fertig. SCHNELL!');
  await wait(600);
  await say('josef', 'Joel... der Weg nach Süden ist weit, und Herodes hat überall Augen. Du kennst die Hirtenpfade um die Dörfer herum.');
  await say('maria', 'Komm mit uns, Joel. Wenigstens bis an die Grenze Ägyptens.');
  await say('joel', '(Schimon hütet die Herde, Levi hütet Schimon... die kommen ein paar Tage ohne mich aus.)');
  await say('joel', 'Ich bringe euch hin. Über Hebron, dann der Karawanenweg – sechs Tagesmärsche bis Ägypten.');
  F.fleeing = true;
  fx.famX = 320;
  const dep = animate(7000, p => { fx.famX = 320 + p * 760; });
  await wait(900);
  await say('soldat', 'Hmm? Habt ihr wasch gesagt? ...*hicks*');
  await walkPlayerTo(920, 508);
  await dep;
  await say('erzaehler', 'Da stand Josef auf und floh noch in der Nacht mit dem Kind und dessen Mutter nach Ägypten. (Matthäus 2,14)');
  await animate(1800, p => { fx.fade = p; });
  await chapterThree();
}

/* ============================================================
   KAPITEL 3: AM RAND ÄGYPTENS (Matthäus 2 / Lukas 1)
   ============================================================ */

async function chapterThree() {
  state.room = 'aegypten';
  player.x = 60; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  fx.abend = 0;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 3: AM RAND ÄGYPTENS');
  await say('erzaehler', 'Sechs Tagesmärsche später. Hinter Hebron, hinter der Wüste – am Abend liegt das Land Ägypten vor ihnen.');
  await walkPlayerTo(300, 508);
  await say('joel', 'Da... am Horizont! Was sind DAS für Berge? Die sind ja spitz wie Zeltdächer!');
  await say('josef', 'Das sind die Pyramiden, Joel. Grabmäler der alten Könige Ägyptens. Sie standen schon, als Abraham hier durchzog.');
  await say('joel', 'Und ich dachte immer, Schimons Schafpferch wäre ein beeindruckendes Bauwerk.');
  await say('maria', 'Wir rasten hier an der Quelle. Das Kind braucht Ruhe – und der Esel erst recht.');
  await say('josef', 'Joel, hilfst du mir? Der Esel braucht dringend Wasser, und unsere Vorräte sind aufgebraucht. An der Palme dort hängen Datteln.');
  await say('joel', '(Wasser für den Esel, Datteln für die Familie. Ein Hirte packt an.)');
}

async function traenkeEsel() {
  if (!F.schlauchVoll) { await say('joel', 'Der Schlauch ist leer. Ein leerer Schlauch hat noch keinen Esel glücklich gemacht.'); return; }
  if (F.eselWasser) { await say('joel', 'Er hat genug. Mehr Wasser, und er schwappt beim Laufen.'); return; }
  F.schlauchVoll = false;
  F.eselWasser = true;
  await say('joel', 'Ich gieße das Wasser in meine Hände... Er trinkt, als gäbe es kein Morgen.');
  await say('esel', 'IAAH!');
  await say('joel', 'Gern geschehen. Und den Schlauch fülle ich gleich nochmal für die Familie.');
  await checkAbend();
}

async function checkAbend() {
  if (F.eselWasser && F.dattelnGiven && !F.abendDone) {
    F.abendDone = true;
    await abendCutscene();
  }
}

async function abendCutscene() {
  await wait(700);
  await say('erzaehler', 'Die Sonne sinkt hinter die Pyramiden. Das Lager ist versorgt, das Feuer brennt, das Kind schläft.');
  await animate(4000, p => { fx.abend = p; });
  await say('maria', 'Setz dich zu uns ans Feuer, Joel. Du hast uns den ganzen Weg geholfen – und nie gefragt, wie das alles eigentlich angefangen hat.');
  await say('joel', 'Ich habe mich nicht getraut. Aber... ja. Wie fängt so etwas an?');
  await say('maria', 'Mit einem ganz gewöhnlichen Tag in Nazaret. Ich war allein im Haus – und plötzlich stand er vor mir. Ein Engel. Gabriel.');
  await say('maria', 'Er sagte: „Sei gegrüßt, du Begnadete! Der Herr ist mit dir.“ (Lukas 1,28)');
  await say('joel', 'Ich wäre schreiend weggerannt. Frag Levi – wir haben da Erfahrung.');
  await say('maria', 'Ich bin auch erschrocken, Joel. Aber er sagte: „Fürchte dich nicht, Maria, denn du hast Gnade bei Gott gefunden.“ (Lukas 1,30)');
  await say('maria', '„Du wirst ein Kind empfangen und ihm den Namen Jesus geben. Er wird groß sein und Sohn des Höchsten genannt werden – und seine Herrschaft wird kein Ende haben.“ (Lukas 1,31-33)');
  await say('joel', 'Und du? Was... sagt man auf so etwas?');
  await say('maria', 'Ich habe gefragt, wie das geschehen soll. Und dann habe ich geantwortet: „Siehe, ich bin die Magd des Herrn; mir geschehe, wie du gesagt hast.“ (Lukas 1,38)');
  await say('josef', 'Ein Satz, für den man mehr Mut braucht, als hundert Soldaten zusammen haben.');
  await say('maria', 'Danach bin ich zu meiner Verwandten Elisabet ins Bergland geeilt. Als ich sie grüßte, hüpfte das Kind in ihrem Leib vor Freude. (Lukas 1,41)');
  await say('maria', 'Und ich konnte auf einmal nur noch singen: „Meine Seele erhebt den Herrn, und mein Geist freut sich über Gott, meinen Retter.“ (Lukas 1,46-47)');
  await say('kind', '(schläft friedlich weiter)');
  await say('joel', 'Der Engel auf unserem Feld... der Stern... die Weisen... der Traum. Und ganz am Anfang: dein Ja.');
  await say('maria', 'Gott vergisst nichts von dem, was er verspricht, Joel. Auch hier nicht, am Rand der Fremde.');
  await say('erzaehler', 'Und sie blieben in Ägypten bis zum Tod des Herodes. So erfüllte sich, was der Herr durch den Propheten gesagt hat: „Aus Ägypten habe ich meinen Sohn gerufen.“ (Matthäus 2,15)');
  await say('joel', '(Morgen kehre ich um – zu Schimon, Levi und zwanzig Schafen. Aber diese Geschichte erzähle ich am Lagerfeuer, solange ich lebe.)');
  await animate(1800, p => { fx.fade = p; });
  await chapterFour();
}

/* ============================================================
   KAPITEL 4: HEIMKEHR NACH NAZARET (Matthäus 2,19-23)
   ============================================================ */

async function chapterFour() {
  state.room = 'nazaret';
  player.x = 60; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 4: HEIMKEHR NACH NAZARET');
  await say('erzaehler', 'Als Herodes gestorben war, erschien dem Josef in Ägypten der Engel des Herrn im Traum: „Steh auf, nimm das Kind und seine Mutter und zieh in das Land Israel!“ (Matthäus 2,19-20)');
  await say('erzaehler', 'Doch weil in Judäa nun Archelaus herrschte, fürchtete sich Josef – und zog, einem Traum folgend, nach Galiläa, in die Stadt Nazaret. (Matthäus 2,22-23)');
  await say('erzaehler', 'JAHRE SPÄTER. Aus dem jungen Joel ist ein Hirte mit eigener Herde geworden – und die besten Sommerweiden liegen im Norden: in Galiläa.');
  await walkPlayerTo(300, 508);
  await say('joel', 'Nazaret also. Gutes Gras, ein Brunnen vor der Stadt... und wenn ich richtig gehört habe, wohnt hier eine gewisse Familie aus Bethlehem.');
  await say('joel', 'Kaum stehe ich fünf Minuten hier, schauen schon alle her. Hirten erkennt man eben... am Geruch, würde ein alter Freund sagen.');
  await say('rahel', 'He! Du da! Bist DU der Hirte aus Bethlehem, von dem die ganze Stadt redet?');
  await say('joel', '(Die ganze Stadt? Na, das kann ja heiter werden. Reden wir mit den Leuten.)');
}

async function checkHeimkehr() {
  if (F.toldRahel && F.toldEli && F.toldMirjam && !F.heimkehrDone) {
    F.heimkehrDone = true;
    await heimkehrCutscene();
  }
}

async function heimkehrCutscene() {
  await wait(700);
  F.josefDa = true;
  await say('erzaehler', 'Gegen Abend kommt ein Mann den Weg von Nazaret herab – grauer im Bart, aber mit demselben festen Schritt.');
  await say('josef', 'Joel? JOEL! Der Hirte von Bethlehem – auf meiner Weide!');
  await say('joel', 'Josef! Ich habe gehofft, euch zu finden. Wie geht es euch? Wie geht es... ihm?');
  await say('josef', 'Komm heute Abend zu uns, Maria wird sich freuen. Und der Junge... der Junge fragt nach allem. Nach Gott, nach den Schriften, nach dem Warum hinter jedem Warum.');
  await say('joel', 'Klingt anstrengend.');
  await say('josef', 'Es ist ein Geschenk.');
  await say('erzaehler', 'Das Kind aber wuchs heran und wurde stark, erfüllt mit Weisheit, und Gottes Gnade ruhte auf ihm. (Lukas 2,40)');
  await animate(1800, p => { fx.fade = p; });
  await chapterFive();
}

/* ============================================================
   KAPITEL 5: DIE SYNAGOGE VON NAZARET (Lukas 4,14-30)
   ============================================================ */

async function chapterFive() {
  state.room = 'synagoge';
  player.x = 60; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 5: DIE SYNAGOGE VON NAZARET');
  await say('erzaehler', 'WIEDER VERGEHEN JAHRE. Fast dreißig sind es nun seit jener Nacht von Bethlehem.');
  await say('erzaehler', 'Im ganzen Land erzählt man von Johannes, der am Jordan tauft – und von einem, der zu ihm ans Wasser kam: Jesus von Nazaret. (Lukas 3,21-22)');
  await say('erzaehler', 'Jesus kehrte, erfüllt von der Kraft des Geistes, nach Galiläa zurück. Er lehrte in den Synagogen, und alle priesen ihn. (Lukas 4,14-15)');
  await say('joel', 'Ich bin grau geworden, meine Knie knirschen wie ein alter Stall – aber DAS lasse ich mir nicht entgehen.');
  await walkPlayerTo(280, 508);
  await say('joel', 'Heute liest Josefs Sohn am Sabbat aus der Schrift. Die halbe Stadt ist da... und da vorne sitzt doch... das gibt es nicht.');
  await say('levi', 'JOEL! Alter Strauchdieb! Hier, ich habe dir einen Platz freigehalten!');
  await say('joel', '(Levi. Natürlich. Wo etwas passiert, sitzt Levi in der ersten Reihe.)');
}

async function talkLeviSyn() {
  await say('levi', 'Dass wir das noch erleben, Joel. Wir zwei. Wie damals auf dem Feld.');
  let done = false;
  while (!done) {
    const c = await choose([
      'Wie kommst DU denn nach Nazaret?',
      'Was hört man über ihn?',
      'Und... Schimon?',
      'Still jetzt, es geht los.',
    ]);
    if (c === 0) {
      await say('levi', 'Meine Tochter hat einen Zimmermann geheiratet. HIER. Ausgerechnet. Gott hat Humor, sage ich dir.');
      await say('levi', 'Und ich spiele immer noch Flöte! Die Herden Galiläas kennen mich.');
      await say('joel', 'Die Herden Galiläas FLIEHEN vor dir, Levi.');
      await say('levi', 'Das ist ihre Art zu genießen. Das habe ich dir schon vor dreißig Jahren erklärt.');
    } else if (c === 1) {
      await say('levi', 'Mit zwölf, erzählt man, saß er im Tempel von Jerusalem – mitten unter den Lehrern. Drei Tage! Alle staunten über seine Antworten. (Lukas 2,46-47)');
      await say('levi', 'Und jetzt: Johannes hat ihn am Jordan getauft, und seither predigt er durch ganz Galiläa. In Kapernaum reden sie von nichts anderem mehr.');
      await say('joel', 'Das Kind aus der Krippe... predigt.');
    } else if (c === 2) {
      await say('levi', 'Vor ein paar Jahren eingeschlafen. Im Sitzen, am Feuer, mitten in der „Gesamtaufsicht“. Wie es sich gehört.');
      await say('joel', '...');
      await say('levi', 'Seine letzten Worte? „Zählt die Herde.“ Wir kamen auf zwanzig. Er hat gelächelt.');
      await say('joel', 'Vierzig Jahre Nachtschicht. Und die letzte hat sich gelohnt. Er hätte den heutigen Tag geliebt.');
    } else {
      await say('levi', 'Ja. Setz dich, setz dich! Da vorne ist noch ein Platz frei.');
      done = true;
    }
  }
}

async function predigtCutscene() {
  await wait(600);
  await say('erzaehler', 'Jesus kam nach Nazaret, wo er aufgewachsen war, und ging nach seiner Gewohnheit am Sabbat in die Synagoge. Er stand auf, um vorzulesen. (Lukas 4,16)');
  await say('erzaehler', 'Man reichte ihm die Schriftrolle des Propheten Jesaja. Er öffnete sie und fand die Stelle, wo geschrieben steht:');
  await say('jesus', '„Der Geist des Herrn ruht auf mir; denn er hat mich gesalbt. Er hat mich gesandt, den Armen eine gute Nachricht zu bringen,');
  await say('jesus', 'den Gefangenen die Entlassung zu verkünden und den Blinden das Augenlicht, die Zerschlagenen in Freiheit zu setzen');
  await say('jesus', 'und ein Gnadenjahr des Herrn auszurufen.“ (Lukas 4,18-19)');
  await say('erzaehler', 'Er rollte die Schrift zusammen, gab sie dem Diener und setzte sich. Die Augen aller in der Synagoge waren auf ihn gerichtet. (Lukas 4,20)');
  await wait(800);
  await say('jesus', 'Heute hat sich dieses Schriftwort, das ihr eben gehört habt, erfüllt. (Lukas 4,21)');
  await say('menge', 'Ist das nicht der Sohn Josefs? (Lukas 4,22)');
  await say('levi', 'Joel... er ist es. Das Kind aus der Krippe.');
  await say('joel', 'Ich weiß, Levi. „Euch ist heute der Retter geboren“, hat der Engel gesagt.');
  await say('joel', 'Damals hat es der Engel verkündet. Heute sagt er es selbst.');
  await say('erzaehler', 'Nazaret aber tat sich schwer mit dem Sohn des Zimmermanns – voll Zorn trieben sie ihn zur Stadt hinaus. Doch er schritt mitten durch sie hindurch und ging weiter. (Lukas 4,28-30)');
  await say('erzaehler', 'Er ging hinab nach Kapernaum am See – und verkündete das Reich Gottes. (Lukas 4,31)');
  await say('joel', 'Komm, Levi. Einer Verheißung läuft man entgegen – das hat uns mal ein weiser Mann beigebracht.');
  await say('levi', 'Nach Kapernaum? Joel, das sind STUNDEN zu Fuß!');
  await say('joel', 'Dann reden wir unterwegs. Du hast ja dreißig Jahre nachzuholen.');
  await animate(1800, p => { fx.fade = p; });
  await chapterSix();
}

/* ============================================================
   KAPITEL 6: MENSCHENFISCHER (Lukas 5,1-11)
   ============================================================ */

async function chapterSix() {
  state.room = 'see';
  player.x = 900; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = -1;
  fx.boot = 0; fx.boot2 = 0;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 6: MENSCHENFISCHER');
  await say('erzaehler', 'Die Kunde von Jesus verbreitete sich in der ganzen Gegend. (Lukas 4,37) Und so kamen auch zwei alte Hirten an den See Gennesaret.');
  await walkPlayerTo(740, 508);
  await say('levi', 'Der See Gennesaret! Joel, weißt du, dass ich noch NIE am See war?');
  await say('joel', 'Du warst auch noch nie pünktlich. Heute holst du beides nach... Schau dir die Menge da drüben an. Halb Kapernaum steht am Ufer.');
  await say('levi', 'Und mittendrin – das ist ER! Aber die Fischer da bei den Netzen schauen ziemlich... durchwacht aus.');
  await say('joel', '(Der Fischer bei den Netzen sieht aus, als hätte er eine lange Nacht hinter sich. Reden wir mit ihm.)');
}

async function talkSimon() {
  if (F.bootAngefragt && !F.bootDraussen) {
    await say('simon', 'Worauf wartest du, Hirte? Das Boot! Pack mit an!');
    return;
  }
  if (!F.simonMet) {
    F.simonMet = true;
    await say('simon', 'Wenn du Fische kaufen willst, Hirte: Es gibt KEINE. Nicht eine einzige Flosse.');
    await say('joel', 'So schlimm?');
    await say('simon', 'Die ganze Nacht draußen. Die Netze wieder und wieder ausgeworfen. NICHTS. Ich bin Simon, und das hier ist der schlechteste Morgen meines Berufslebens.');
  }
  let done = false;
  while (!done) {
    const c = await choose([
      'Eine ganze Nacht für nichts – das kenne ich.',
      'Wer ist der Mann da drüben bei der Menge?',
      'Kann ich irgendwie helfen?',
      'Ich lasse dich in Ruhe arbeiten.',
    ]);
    if (c === 0) {
      await say('joel', 'Ich habe einmal eine ganze Nacht lang ein einziges Lamm gesucht. Zwischen Felsen, im Dunkeln, bei Bethlehem.');
      await say('simon', 'Und? Gefunden?');
      await say('joel', 'Gefunden. Es wurde die beste Nacht meines Lebens – aber das ist eine lange Geschichte.');
      await say('simon', 'Hmpf. Fische sind keine Lämmer. Fische BLÖKEN wenigstens nicht, wenn man sie endlich hat.');
    } else if (c === 1) {
      await say('simon', 'Jesus von Nazaret. Er war in meinem Haus – meine Schwiegermutter lag mit hohem Fieber, und er hat sie geheilt. Einfach so. (Lukas 4,38-39)');
      await say('simon', 'Seitdem läuft ihm halb Kapernaum nach. Die andere Hälfte steht da drüben am Ufer.');
      await say('joel', '(Er redet rau über seine Nacht – aber über DIESEN Mann redet er ganz anders.)');
    } else if (c === 2) {
      await say('simon', 'Helfen? Ein HIRTE?');
      await say('simon', '...Na schön. Die Netze müssen gewaschen werden, sonst faulen sie. Wenn du wirklich anpacken willst: nur zu. Sie liegen gleich da.');
      await say('joel', 'Ein Hirte packt an. Das war schon immer so.');
    } else {
      await say('simon', 'Ruhe wäre schön. Aber bei DER Menge da drüben wird das nichts.');
      done = true;
    }
  }
}

async function netzeWaschen() {
  await say('joel', 'Ich knie mich ans Wasser und schrubbe die Netze... Algen, Schlamm, ein einsamer, sehr toter Krebs.');
  await wait(600);
  await say('simon', 'Nicht schlecht für einen Hirten. Du machst das nicht zum ersten Mal.');
  await say('joel', 'Vierzig Jahre Wolle waschen. Netze sind dagegen ein Vergnügen – sie treten einen wenigstens nicht.');
  F.netzeSauber = true;
  await say('erzaehler', 'Die Menge aber drängte sich um Jesus und wollte das Wort Gottes hören, während er am See Gennesaret stand. (Lukas 5,1)');
  await wait(500);
  await say('joel', '(Die Menge schiebt ihn ja fast ins Wasser... Und jetzt kommt er hierher, zu den Booten.)');
  await say('jesus', 'Simon – fährst du mich ein Stück vom Land weg? Vom Boot aus können mich alle hören.');
  await say('simon', 'Vom Land wegfahren... Nach DER Nacht? ...Meinetwegen. Für dich.');
  await say('simon', 'Aber das Boot liegt fest im Sand, und meine Arme sind leer gefischt. Hirte – packst du noch einmal mit an?');
  F.bootAngefragt = true;
  await say('joel', '(Das Boot anschieben also. Levi zählt sicher wieder nur die Möwen.)');
}

async function bootUndFang() {
  await say('joel', 'Alle zusammen! Und... HO!');
  await say('levi', 'Ich übernehme die Gesamtaufsicht!');
  await say('joel', 'SCHIEB, Levi.');
  F.bootDraussen = true;
  await animate(4000, p => { fx.boot = p; });
  await say('erzaehler', 'Jesus stieg in das Boot, das Simon gehörte, und bat ihn, ein Stück vom Land wegzufahren. Dann setzte er sich und lehrte die Menge vom Boot aus. (Lukas 5,3)');
  await wait(800);
  await say('joel', '(Selbst das Wasser ist still geworden. Tausend Menschen am Ufer – und man hört nur ihn.)');
  await say('erzaehler', 'Als er aufgehört hatte zu reden, sagte er zu Simon:');
  await say('jesus', 'Fahr hinaus, wo es tief ist, und werft eure Netze zum Fang aus! (Lukas 5,4)');
  await say('simon', 'Meister, wir haben die ganze Nacht gearbeitet und nichts gefangen. Doch auf dein Wort hin werde ich die Netze auswerfen. (Lukas 5,5)');
  await animate(3000, p => { fx.boot = 1 + p * 0.5; });
  await wait(600);
  await say('erzaehler', 'Das taten sie – und sie fingen eine so große Menge Fische, dass ihre Netze zu reißen drohten. (Lukas 5,6)');
  F.fangDone = true;
  await say('levi', 'JOEL! Das Wasser KOCHT! Sag mir, dass du das auch siehst!');
  await say('joel', 'Ich sehe es, Levi. Ich sehe es.');
  await say('erzaehler', 'Sie winkten ihren Gefährten im anderen Boot, zu kommen und mit anzupacken. Und sie füllten beide Boote, bis sie fast versanken. (Lukas 5,7)');
  await animate(3000, p => { fx.boot2 = p; });
  await say('erzaehler', 'Als Simon Petrus das sah, fiel er Jesus zu Füßen: (Lukas 5,8)');
  await say('simon', 'Herr, geh weg von mir; denn ich bin ein sündiger Mensch!');
  await say('erzaehler', 'Denn Schrecken hatte ihn erfasst über den Fang – ihn und alle bei ihm, auch Jakobus und Johannes, die Söhne des Zebedäus. (Lukas 5,9-10)');
  await say('jesus', 'Fürchte dich nicht! Von nun an wirst du Menschen fangen. (Lukas 5,10)');
  await wait(900);
  await say('joel', '„Fürchte dich nicht.“ ...Levi. LEVI!');
  await say('levi', 'Was denn?');
  await say('joel', 'GENAU SO hat der Engel angefangen. Damals, auf dem Feld. „Fürchtet euch nicht!“ – Wort für Wort.');
  await say('levi', 'Bei uns fing es mit Schafen an. Bei ihm fängt es mit Fischen an. Er sammelt offenbar Leute mit ehrlichen Berufen.');
  await say('erzaehler', 'Und sie zogen die Boote an Land, ließen alles zurück und folgten ihm. (Lukas 5,11)');
  await wait(700);
  await say('joel', 'Alles zurücklassen und ihm folgen... Vierzig Jahre bin ich Herden vorangegangen, Levi.');
  await say('joel', 'Vielleicht ist es Zeit, einmal hinterherzugehen.');
  await animate(1800, p => { fx.fade = p; });
  await chapterSeven();
}

/* ============================================================
   KAPITEL 7: DER GELÄHMTE DURCHS DACH (Lukas 5,17-26)
   ============================================================ */

async function chapterSeven() {
  state.room = 'haus';
  player.x = 920; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = -1;
  fx.trage = 0;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 7: DER GELÄHMTE DURCHS DACH');
  await say('erzaehler', 'Einige Tage später lehrte Jesus in einem Haus in Kapernaum. Pharisäer und Gesetzeslehrer waren aus Galiläa, Judäa und Jerusalem gekommen. (Lukas 5,17)');
  await walkPlayerTo(760, 508);
  await say('levi', 'Joel, ich habe schon volle Herbergen gesehen, aber DAS Haus ist voller als Bethlehems Gassen zur Volkszählung.');
  await say('joel', 'Die Tür ist dicht, die Fenster sind dicht, und drinnen sitzt halb Jerusalem mit verschränkten Armen.');
  await say('freund', 'Macht Platz! Bitte! Unser Freund muss zu Jesus!');
  await say('joel', '(Vier Männer tragen einen Gelähmten auf einer Liege. Und vor ihnen steht eine Wand aus Leuten.)');
  await say('joel', '(Wenn die Tür nicht geht, brauchen sie einen anderen Weg. Bei flachen Dächern gibt es meistens einen.)');
}

async function talkDachTraeger() {
  if (F.mannGeheilt) {
    await say('freund', 'Er läuft, Joel. Er läuft und lobt Gott. Ich weiß gar nicht, wohin mit meinen Händen.');
    await say('joel', 'Heb sie nach oben. Das scheint mir heute passend.');
    return;
  }
  if (!F.tragerMet) {
    F.tragerMet = true;
    await say('freund', 'Du bist doch einer von den Leuten, die mit Jesus unterwegs sind, oder? Hilf uns!');
    await say('joel', 'Ich bin nur ein Hirte, der nicht weiß, wann er genug gesehen hat. Was ist passiert?');
    await say('freund', 'Unser Freund kann nicht gehen. Wir haben gehört, dass Jesus heilt. Aber niemand lässt uns hinein.');
    await say('gelaehmter', 'Wenn ihr mich nicht hineinbekommt, lasst es gut sein. Ich bin schwerer, als ich aussehe.');
    await say('joel', 'Nach vierzig Jahren Schafen beeindruckt mich Gewicht nicht mehr. Wir finden einen Weg.');
  }
  let done = false;
  while (!done) {
    const c = await choose([
      'Warum kommt ihr nicht durch die Tür?',
      'Habt ihr an das Dach gedacht?',
      'Was braucht ihr von mir?',
      'Ich sehe mich um.',
    ]);
    if (c === 0) {
      await say('freund', 'Weil die Menge bis auf die Straße steht. Selbst die Pharisäer sitzen innen wie Steinblöcke.');
      await say('joel', 'Steinblöcke kenne ich. Manche heißen Felsen, manche Schriftgelehrte.');
    } else if (c === 1) {
      await say('freund', 'Das Dach? Die Treppe liegt hinter dem Haus, aber mit der Liege schaffen wir den Rand nicht.');
      await say('joel', 'Eine Leiter, feste Seile und ein paar gelöste Ziegel. Dann wird aus einem Dach eine Tür.');
    } else if (c === 2) {
      if (!F.leiterBereit && !F.seileBefestigt && !F.dachOffen) await say('joel', 'Wir brauchen eine Leiter an der Hauswand, Seile an der Liege und ein Loch zwischen den Dachziegeln.');
      else if (!F.leiterBereit) await say('joel', 'Die Leiter an der Hauswand fehlt noch.');
      else if (!F.seileBefestigt) await say('joel', 'Die Liege braucht feste Seile, sonst wird aus Glauben Leichtsinn.');
      else if (!F.dachOffen) await say('joel', 'Das Dach ist noch geschlossen. Mein Hirtenstab könnte die Ziegel lösen.');
      else await say('joel', 'Alles ist bereit. Jetzt müssen wir nur noch mutig genug sein.');
    } else {
      await say('freund', 'Beeil dich. Drinnen wird Jesus schon sprechen.');
      done = true;
    }
  }
}

async function leiterAnlehnen() {
  if (F.leiterBereit) {
    await say('joel', 'Die Leiter steht fest. Levi hält sie mit dem Gesicht eines Mannes, der lieber woanders wäre.');
    return;
  }
  if (!F.tragerMet) {
    await say('joel', 'Eine Leiter. Praktisch. Aber noch weiß ich nicht, wofür ich sie brauche.');
    return;
  }
  F.leiterBereit = true;
  await say('joel', 'Ich stemme die Leiter an die Hauswand. Vorsichtig... noch ein Stück...');
  await say('levi', 'Ich halte sie! Also, mit meinen Händen. Nicht mit meiner Zuversicht.');
  await say('freund', 'Das reicht bis zum Dachrand. Los, wir bringen die Liege nach oben.');
  await checkDachReady();
}

async function takeSeil() {
  if (F.tookSeil || F.seileBefestigt) {
    await say('joel', 'Mehr Seil brauche ich nicht. Wenn doch, eröffne ich eine Fischerei.');
    return;
  }
  if (!F.tragerMet) {
    await say('joel', 'Feste Seile am Brunnen. Irgendjemand braucht sie bestimmt. Ich nehme sie nicht einfach so mit.');
    return;
  }
  F.tookSeil = true;
  addItem('seil');
  await say('joel', 'Die Seile nehme ich. Für eine Liege, die durchs Dach soll, klingt „fest verknotet“ nach einer guten Idee.');
}

async function befestigeSeile() {
  if (F.seileBefestigt) {
    await say('joel', 'Die Seile sitzen fest an der Liege. Sogar Schimon hätte daran gezupft und nur einmal gemurrt.');
    return;
  }
  if (!state.inventory.includes('seil')) {
    await say('joel', 'Mit guten Absichten allein lässt man niemanden durch ein Dach. Ich brauche Seile.');
    return;
  }
  removeItem('seil');
  F.seileBefestigt = true;
  await say('joel', 'Ich knote die Seile an die vier Ecken der Liege. Links fest, rechts fest, vorne fest...');
  await say('levi', 'Und hinten?');
  await say('joel', 'Hinten besonders fest. Ich mag meinen Ruf als Hirte ohne Fallopfer.');
  await say('freund', 'Gut. Wenn das Dach offen ist und die Leiter steht, schaffen wir es.');
  await checkDachReady();
}

async function oeffneDach(it) {
  if (!F.leiterBereit) {
    await say('joel', 'Von hier unten komme ich nicht an die Dachziegel. Erst muss die Leiter stehen.');
    return;
  }
  if (F.dachOffen) {
    await say('joel', 'Das Dach hat jetzt ein sehr überzeugendes Argument gegen Regen.');
    return;
  }
  if (it !== 'stab') {
    await say('joel', 'Die Ziegel sitzen zu fest. Mit dem Haken meines Hirtenstabs könnte ich sie lösen.');
    return;
  }
  F.dachOffen = true;
  await say('joel', 'Ich hake den Stab unter den ersten Dachziegel... knirsch... noch einer...');
  await say('levi', 'Joel, du machst gerade ein Loch in ein fremdes Dach.');
  await say('joel', 'Ich nenne es: einen Eingang mit Himmelslicht.');
  await say('freund', 'Groß genug. Genau über der Mitte des Raums!');
  await checkDachReady();
}

async function checkDachReady() {
  if (F.leiterBereit && F.seileBefestigt && F.dachOffen && !F.mannGeheilt) {
    await heilungCutscene();
  }
}

async function heilungCutscene() {
  await wait(500);
  await say('freund', 'Langsam. Alle vier zusammen. Nicht loslassen.');
  await say('gelaehmter', 'Falls ich gleich mitten in einer Predigt lande: Sagt bitte, ich wollte nicht stören.');
  await say('joel', 'Glaub mir, Freund. Heute will Glaube stören.');
  await say('erzaehler', 'Weil sie wegen der Menge keinen Weg fanden, stiegen sie auf das Dach, deckten Ziegel ab und ließen ihn mit der Liege mitten vor Jesus hinab. (Lukas 5,19)');
  await animate(4200, p => { fx.trage = p; });
  await wait(600);
  await say('erzaehler', 'Als Jesus ihren Glauben sah, sagte er: (Lukas 5,20)');
  await say('jesus', 'Mensch, deine Sünden sind dir vergeben.');
  await say('pharisaeer', 'Wer ist dieser, der Lästerungen redet? Wer kann Sünden vergeben außer Gott allein? (Lukas 5,21)');
  await say('joel', '(Drinnen wird es stiller als auf dem Feld in jener Nacht, kurz bevor der Himmel aufging.)');
  await say('jesus', 'Was überlegt ihr in euren Herzen? Was ist leichter zu sagen: Deine Sünden sind dir vergeben, oder: Steh auf und geh umher? (Lukas 5,22-23)');
  await say('jesus', 'Damit ihr aber wisst, dass der Menschensohn Vollmacht hat, auf Erden Sünden zu vergeben...');
  await say('jesus', 'Ich sage dir: Steh auf, nimm deine Liege und geh nach Hause! (Lukas 5,24)');
  await wait(700);
  F.mannGeheilt = true;
  fx.trage = 1;
  await say('gelaehmter', 'Ich... ich stehe.');
  await say('erzaehler', 'Sofort stand er vor ihren Augen auf, nahm die Liege, auf der er gelegen hatte, und ging heim, Gott lobend. (Lukas 5,25)');
  await say('menge', 'Heute haben wir Unglaubliches gesehen! (Lukas 5,26)');
  await say('joel', 'Ein Stern, ein Engel, Netze voller Fische... und jetzt ein Mann, der seine Liege trägt.');
  await say('levi', 'Joel, ich glaube, wir kommen mit dem Staunen nicht mehr hinterher.');
  await say('joel', 'Dann gehen wir eben weiter hinter ihm her.');
  await animate(1800, p => { fx.fade = p; });
  await chapterEight();
}

/* ============================================================
   KAPITEL 8: LEVI DER ZÖLLNER (Lukas 5,27-32)
   ============================================================ */

async function chapterEight() {
  state.room = 'zollhaus';
  player.x = 60; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 8: LEVI DER ZÖLLNER');
  await say('erzaehler', 'Nach der Heilung ging Jesus hinaus. Die Gassen Kapernaums waren voller Stimmen – und am Stadtrand stand ein Zollhaus. (Lukas 5,27)');
  await walkPlayerTo(260, 508);
  await say('levi', 'Zollhaus voraus. Joel, wenn ich gleich meinen Namen höre, erinnere mich: Ich bin der Levi ohne Geldkiste.');
  await say('joel', 'Zöllner. Ausgerechnet. Wegen Listen und Abgaben musste damals halb Israel nach Bethlehem laufen.');
  await say('joel', '(Ich habe Soldaten des Herodes gesehen. Ich habe römische Straßen gemieden. Und jetzt bleibt Jesus vor einem Zolltisch stehen.)');
  await say('joel', '(Da sitzt ein Mann namens Levi. Nicht mein Levi. Der andere. Der mit den Münzen.)');
}

async function talkLeviZoellner() {
  if (F.zoellnerCalled) {
    await talkLeviCalled();
    return;
  }
  if (!F.zoellnerMet) {
    F.zoellnerMet = true;
    await say('levizoellner', 'Wenn ihr Fisch vom See hereinbringt, wird am Tisch gezahlt. Wenn ihr nur staubige Sandalen bringt, kostet es nichts.');
    await say('joel', 'Dann sind wir heute ausnahmsweise ein günstiger Anblick.');
  }
  let done = false;
  while (!done) {
    const c = await choose([
      'Warum sitzt du ausgerechnet hier?',
      'Mögen dich die Leute von Kapernaum?',
      'Hast du von Jesus gehört?',
      'Ich lasse dich zählen.',
    ]);
    if (c === 0) {
      await say('levizoellner', 'Weil hier jeder vorbei muss: Fischer, Händler, Bauern. Rom liebt Wege, die Geld bringen.');
      await say('joel', 'Und du? Liebst du sie auch?');
      await say('levizoellner', 'Ich liebe klare Zahlen. Menschen sind... unklarer.');
    } else if (c === 1) {
      await say('levizoellner', 'Sie mögen meine Münzen, wenn sie mir gehören. Sie hassen meine Hand, wenn sie sie hergeben müssen.');
      await say('levizoellner', 'Zöllner sind nützlich wie Dornen: Jeder weiß, warum sie da sind, aber keiner will sie anfassen.');
      await say('joel', '(Er sagt es ohne Spott. Fast, als hätte er es lange geübt.)');
    } else if (c === 2) {
      await say('levizoellner', 'Alle haben von ihm gehört. Der Gelähmte ging eben an meinem Tisch vorbei und trug seine Matte.');
      await say('levizoellner', 'Ich habe gezählt: null Schritte hinein, zwei gesunde Beine hinaus. Das passt in kein Register.');
    } else {
      await say('levizoellner', 'Zählen kann ich. Nur nicht, wie oft ich mir wünsche, jemand würde anders auf mich schauen.');
      done = true;
    }
  }
}

async function rufLeviCutscene() {
  if (F.zoellnerCalled) {
    await say('joel', 'Der Zolltisch ist leer. Der Mann, der eben noch dahinter saß, steht jetzt bei Jesus.');
    return;
  }
  await say('erzaehler', 'Jesus sah einen Zöllner namens Levi am Zoll sitzen und sagte zu ihm: (Lukas 5,27)');
  await say('jesus', 'Folge mir nach!');
  await wait(700);
  await say('levizoellner', 'Mir?');
  await say('joel', '(Ein Wort. Kein Handel, keine lange Rede, kein Blick auf die Münzen.)');
  F.zoellnerCalled = true;
  await say('erzaehler', 'Da stand Levi auf, ließ alles zurück und folgte ihm. (Lukas 5,28)');
  await say('levi', 'Er... lässt die ganze Kasse liegen? Joel, ich habe Leute gesehen, die für eine Kupfermünze drei Stunden feilschen.');
  await say('joel', 'Vielleicht hat er gerade etwas gehört, das schwerer wiegt als Münzen.');
  await say('levizoellner', 'Herr, mein Haus steht offen. Ich will ein großes Mahl bereiten – für dich, für deine Jünger... und für die, die sonst nirgendwo sitzen dürfen.');
  await say('joel', 'Für andere Zöllner?');
  await say('levizoellner', 'Wenn er mich ruft, soll keiner von ihnen glauben, er sei zu weit weg.');
  await say('levizoellner', 'Joel, nimm diese Einladung. Meine alten Kollegen da drüben glauben mir erst, wenn jemand von draußen sie wirklich hineinbittet.');
  if (!F.tookEinladung) {
    F.tookEinladung = true;
    addItem('einladung');
  }
  await say('joel', '(Eine Einladung an Zöllner überbringen. Ich hatte schon angenehmere Hirtenaufgaben. Aber ich habe heute ein Dach geöffnet.)');
}

async function talkLeviCalled() {
  if (F.gaesteEingeladen) {
    await say('levizoellner', 'Mein Haus ist voller Menschen, die sonst an keiner Tafel willkommen sind.');
    await say('levizoellner', 'Ich wusste nicht, dass ein leerer Zolltisch sich so leicht anfühlen kann.');
    return;
  }
  if (!F.tookEinladung) {
    F.tookEinladung = true;
    addItem('einladung');
    await say('levizoellner', 'Nimm diese Einladung, Joel. Bring sie meinen alten Kollegen beim Nebentisch.');
  } else {
    await say('levizoellner', 'Meine Kollegen stehen dort drüben und trauen dem Frieden nicht. Gib ihnen die Einladung.');
  }
}

async function talkZoellnerKollegen() {
  if (F.gaesteEingeladen) {
    await say('zoellner', 'Wir sitzen wirklich an einem Tisch mit ihm. Ich habe die ganze Zeit das Gefühl, gleich merkt jemand den Irrtum.');
    return;
  }
  await say('zoellner', 'Was willst du, Hirte? Wenn du dich über Abgaben beschweren willst, stell dich in die Schlange der ganzen Stadt.');
  if (state.inventory.includes('einladung')) {
    await say('joel', 'Levi lädt euch in sein Haus ein. Jesus ist dort.');
    await say('zoellner', 'Jesus? Bei Levi? Mit uns?');
    await say('joel', 'Ich habe es auch zweimal hören müssen.');
    await say('zoellner', 'Und du überbringst uns das? Ein Hirte?');
    await say('joel', 'Heute scheint jeder etwas zurückzulassen: Netze, Liegen, Münztische. Ich lasse vielleicht meinen Stolz draußen.');
    removeItem('einladung');
    F.gaesteEingeladen = true;
    await mahlCutscene();
  } else {
    await say('joel', 'Noch nichts. Ich... ordne gerade meine Gedanken.');
    await say('zoellner', 'Das klingt teurer, als es wert ist.');
  }
}

async function mahlCutscene() {
  await animate(1200, p => { fx.fade = p; });
  player.x = 250; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'Levi gab für Jesus in seinem Haus ein großes Festmahl. Viele Zöllner und andere waren mit ihnen bei Tisch. (Lukas 5,29)');
  await say('levi', 'Joel. Das sind sehr viele Zöllner. Ich erkenne sie an den Geldbeuteln und daran, dass alle anderen so tun, als würden sie sie nicht sehen.');
  const c = await choose([
    'Ich würde lieber draußen bleiben.',
    'Jesus sitzt dort. Dann gehe ich auch hinein.',
    'Vielleicht braucht gerade diese Tafel Zeugen.',
  ]);
  if (c === 0) {
    await say('joel', 'Ich würde lieber draußen bleiben. Aber ich habe gesehen, wie ein Mann seine Liege trug. Vielleicht ist mein Misstrauen heute dran.');
  } else if (c === 1) {
    await say('joel', 'Jesus sitzt dort. Wenn er keine Angst vor diesem Tisch hat, sollte ich mich nicht hinter meinen Vorurteilen verstecken.');
  } else {
    await say('joel', 'Vielleicht braucht gerade diese Tafel Zeugen. Nicht für die, die sich für gesund halten – für die, die wissen, dass sie Hilfe brauchen.');
  }
  await say('levizoellner', 'Joel, setz dich. Hier ist Brot. Und keine Abgabe darauf, versprochen.');
  await say('joel', 'Das ist das freundlichste Steuerrecht, das ich je gehört habe.');
  await say('pharisaeer', 'Warum esst und trinkt ihr mit Zöllnern und Sündern? (Lukas 5,30)');
  await say('levi', 'Ich glaube, das war nicht als Kompliment gemeint.');
  await say('jesus', 'Nicht die Gesunden brauchen den Arzt, sondern die Kranken.');
  await say('jesus', 'Ich bin nicht gekommen, Gerechte zu rufen, sondern Sünder zur Umkehr. (Lukas 5,31-32)');
  await wait(700);
  await say('joel', '(Damals auf dem Feld hieß es: große Freude für alles Volk. Nicht nur für Hirten, nicht nur für Fischer, nicht nur für Leute, die mir angenehm sind.)');
  await say('joel', '(Alles Volk. Sogar Levi am Zolltisch. Sogar ich mit meinem engen Herzen.)');
  F.mahlDone = true;
  await animate(1800, p => { fx.fade = p; });
  await chapterNine();
}

/* ============================================================
   KAPITEL 9: DER BRÄUTIGAM UND DIE NEUEN SCHLÄUCHE (Lukas 5,33-39)
   ============================================================ */

async function chapterNine() {
  state.room = 'zollhaus';
  player.x = 250; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  F.gaesteEingeladen = true;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 9: DER BRÄUTIGAM UND DIE NEUEN SCHLÄUCHE');
  await say('erzaehler', 'Das Fest war noch nicht vorbei. Brot wurde gebrochen, Becher wurden weitergereicht – und am Rand sammelten sich neue Fragen.');
  await say('pharisaeer', 'Die Jünger des Johannes fasten oft und verrichten Gebete; ebenso die Jünger der Pharisäer. Deine aber essen und trinken! (Lukas 5,33)');
  await say('joel', '(Erst stören sie sich an den Gästen. Jetzt am Essen selbst. Manche Menschen finden in jedem Brotkrümel ein Verfahren.)');
  await say('levizoellner', 'Joel, hinten beim Vorrat liegen zwei Weinschläuche. Einer alt, einer neu. Ich glaube, Jesus wird gleich über so etwas reden.');
  await say('joel', '(Alter Schlauch, neuer Schlauch. Gut. Ein Hirte versteht Leder. Vielleicht verstehe ich dann auch das Gleichnis.)');
}

async function lookAlterSchlauch() {
  F.alterSchlauchGesehen = true;
  await say('joel', 'Ein alter Weinschlauch. Hart, rissig, an den Nähten spröde. Wenn da junger Wein hineinkommt, platzt er wie Levis Geduld bei einer Zählung.');
  await say('levi', 'Meine Geduld ist fein genäht. Meistens.');
}

async function lookNeuerSchlauch() {
  F.neuerSchlauchGesehen = true;
  await say('joel', 'Ein neuer Weinschlauch. Weich, dehnbar, frisch gegerbt. Der gibt nach, wenn der Wein noch lebt und arbeitet.');
  await say('joel', '(Vielleicht ist genau das der Punkt: Das Neue braucht Raum, der mitgehen kann.)');
}

async function weinschlauchAntwort() {
  if (F.weinVerstanden) {
    await say('joel', 'Das Bild sitzt. Neuer Wein braucht neue Schläuche. Und ich brauche offenbar ein beweglicheres Herz.');
    return;
  }
  if (!F.alterSchlauchGesehen || !F.neuerSchlauchGesehen) {
    await say('joel', 'Bevor ich ihn frage, sollte ich mir die beiden Weinschläuche ansehen. Wenn Jesus über Leder redet, will ich vorbereitet sein.');
    return;
  }
  await say('jesus', 'Könnt ihr die Hochzeitsgäste fasten lassen, solange der Bräutigam bei ihnen ist?');
  await say('jesus', 'Es werden Tage kommen, da ihnen der Bräutigam genommen ist; dann werden sie fasten. (Lukas 5,34-35)');
  await say('joel', '(Der Bräutigam. Ein Fest, solange er da ist. Aber in seinem Satz liegt plötzlich ein Schatten.)');
  await say('jesus', 'Niemand reißt ein Stück von einem neuen Kleid ab und setzt es auf ein altes. Sonst zerreißt er das neue, und zum alten passt der neue Flicken nicht. (Lukas 5,36)');
  await say('jesus', 'Und niemand füllt neuen Wein in alte Schläuche; sonst zerreißt der neue Wein die Schläuche, läuft aus, und die Schläuche verderben.');
  await say('jesus', 'Neuen Wein muss man in neue Schläuche füllen. (Lukas 5,37-38)');
  await say('jesus', 'Und niemand, der alten Wein getrunken hat, will neuen; denn er sagt: Der alte ist gut. (Lukas 5,39)');
  await say('levi', 'Joel, ich glaube, er spricht nicht nur über Leder.');
  await say('joel', 'Nein. Er spricht über uns. Über alle, die lieber beim Alten sitzen bleiben, weil es vertraut schmeckt.');
  await say('joel', '(Seit Bethlehem versucht Gott, meine alten Schläuche zu weiten. Sterne. Engel. Fischer. Zöllner. Und ich knirsche immer noch.)');
  F.weinVerstanden = true;
  await animate(1800, p => { fx.fade = p; });
  await chapterTen();
}

/* ============================================================
   KAPITEL 10: ÄHREN AM SABBAT (Lukas 6,1-5)
   ============================================================ */

async function chapterTen() {
  state.room = 'sabbatfeld';
  player.x = 60; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  F.sabbatStart = true;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 10: ÄHREN AM SABBAT');
  await say('erzaehler', 'An einem Sabbat ging Jesus mit seinen Jüngern durch Kornfelder. (Lukas 6,1)');
  await walkPlayerTo(240, 508);
  await say('levi', 'Joel, ich sage es ungern, aber ich bin hungrig genug, um Ähren neidisch anzusehen.');
  await say('juenger', 'Wir haben seit dem Fest kaum gegessen. Ein paar Körner würden reichen.');
  await say('joel', 'Auf dem Feldrand stehen reife Ähren. Nach dem Gesetz darf ein Hungriger mit der Hand pflücken – aber heute ist Sabbat.');
  await say('joel', '(Und dort hinten stehen wieder die Männer, die jede Bewegung wiegen.)');
}

async function nehmeAehren() {
  if (F.tookAehren) {
    await say('joel', 'Ich habe genug Ähren. Mehr, und ich sehe aus wie ein laufender Getreidespeicher.');
    return;
  }
  F.tookAehren = true;
  addItem('aehren');
  await say('joel', 'Ich pflücke ein paar reife Ähren mit der Hand. Kein Sensen, kein Ernten – nur genug gegen den Hunger.');
  await say('pharisaeer', '(räuspert sich sehr laut)');
  await say('joel', '(Natürlich haben sie es gesehen.)');
}

async function reibeKoerner() {
  if (!F.tookAehren || !state.inventory.includes('aehren')) {
    await say('joel', 'Erst brauche ich ein paar Ähren. Leere Hände machen keine Körner.');
    return;
  }
  removeItem('aehren');
  F.koernerGerieben = true;
  await say('joel', 'Ich reibe die Ähren zwischen den Handflächen. Die Spelzen lösen sich, kleine Körner bleiben übrig.');
  await say('juenger', 'Danke, Joel. Das ist nicht viel – aber heute schmeckt es wie ein Fest.');
  await sabbatStreit();
}

async function sabbatStreit() {
  await wait(500);
  await say('pharisaeer', 'Warum tut ihr, was am Sabbat nicht erlaubt ist? (Lukas 6,2)');
  await say('joel', '(Da ist es. Nicht Hunger sehen sie. Nur eine Regel, die sich gegen eine Handvoll Körner stemmt.)');
  await say('jesus', 'Habt ihr nicht gelesen, was David tat, als er und seine Begleiter Hunger hatten?');
  await say('jesus', 'Wie er in das Haus Gottes ging, die Schaubrote nahm, davon aß und auch seinen Begleitern gab – obwohl nur die Priester davon essen durften? (Lukas 6,3-4)');
  await say('levi', 'David. Der Hirtenjunge, der König wurde. Schimon hätte jetzt sehr zufrieden genickt.');
  await say('jesus', 'Der Menschensohn ist Herr über den Sabbat. (Lukas 6,5)');
  await wait(700);
  await say('joel', '(Herr über den Sabbat. Nicht gegen Gottes Ruhe – sondern tiefer hinein. Eine Ruhe, die Hunger nicht übersieht.)');
  await say('joel', '(Ich dachte, ich folge einem Lehrer von Wunder zu Wunder. Aber er führt uns auch durch Streit, Regeln und Herzen, die enger sind als alte Schläuche.)');
  F.sabbatDone = true;
  await animate(1800, p => { fx.fade = p; });
  await chapterEleven();
}

/* ============================================================
   KAPITEL 11: DIE VERDORRTE HAND (Lukas 6,6-11)
   ============================================================ */

async function chapterEleven() {
  state.room = 'synagoge2';
  player.x = 60; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  fx.mitte = 0;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 11: DIE VERDORRTE HAND');
  await say('erzaehler', 'An einem anderen Sabbat ging Jesus in die Synagoge und lehrte. Dort war ein Mann, dessen rechte Hand verdorrt war. (Lukas 6,6)');
  await walkPlayerTo(280, 508);
  await say('levi', 'Schon wieder Sabbat, schon wieder Synagoge. Diesmal Kapernaum. Ich werde langsam fromm auf meine alten Tage, Joel.');
  await say('joel', 'Schau nach vorn: Da lehrt er. Und schau in die erste Reihe – DIESELBEN Gesichter wie am Kornfeld.');
  await say('joel', '(Und dort, ganz am Rand, sitzt ein Mann allein. Er hält die rechte Hand unter dem Gewand versteckt. Mit dem rede ich.)');
}

async function talkMannHand() {
  if (F.handGeheilt) {
    await say('mann', 'Joel! Sieh doch! Ich kann sie öffnen und schließen und ÖFFNEN!');
    await say('joel', 'Ich sehe es, Freund. Ich sehe es.');
    return;
  }
  if (!F.mannMet) {
    F.mannMet = true;
    await say('mann', 'Lass nur, Hirte. Setz dich woandershin – neben mir sitzt man nicht gern.');
    await say('joel', 'Ich habe vierzig Jahre neben Schafen gesessen. Glaub mir: Du riechst besser.');
    await say('mann', '...Das ist das erste Mal seit Jahren, dass hier drin jemand neben mir lacht.');
  }
  let done = false;
  while (!done) {
    const c = await choose([
      'Was ist mit deiner Hand?',
      'Warum sitzt du so weit am Rand?',
      'Hast du gehört, was man über ihn erzählt?',
      'Ich setze mich gleich zu dir, Freund.',
    ]);
    if (c === 0) {
      await say('mann', 'Verdorrt. Die rechte. Seit Jahren. Ich war Steinmetz – eine rechte Hand, die nichts hält, hält auch keine Arbeit.');
      await say('joel', '(Eine Hand, die nichts hält... Ich schaue auf meine eigene, am Stab. Vierzig Jahre hat sie gehalten: Lämmer, Seile, Ähren. Was wäre ich ohne sie?)');
    } else if (c === 1) {
      await say('mann', 'Die Leute schauen. Erst auf die Hand, dann schnell weg. Am Rand schauen weniger.');
      await say('joel', 'Am Rand hat man auch den besseren Überblick. Sagt einer, der sein Leben am Rand von Weiden verbracht hat.');
    } else if (c === 2) {
      await say('mann', 'Der Gelähmte, der seine Liege selbst nach Hause trug? Ich habe davon gehört. Ganz Kapernaum hat davon gehört.');
      await say('mann', 'Aber ich verbiete mir das Hoffen, Hirte. Hoffnung ist teuer, wenn man arm ist.');
      await say('joel', 'Mir hat einmal jemand gesagt: Fürchte dich nicht. Es war das beste Wort meines Lebens. Bleib heute einfach da.');
    } else {
      await say('mann', 'Tu das. Es sitzt sich leichter zu zweit.');
      done = true;
    }
  }
}

async function heilungHandCutscene() {
  await wait(600);
  await say('erzaehler', 'Jesus aber wusste, was sie dachten. Er sagte zu dem Mann mit der verdorrten Hand: (Lukas 6,8)');
  await say('jesus', 'Steh auf und stell dich in die Mitte!');
  await say('mann', '(Ich? In die Mitte? Vor ALLE?)');
  await say('joel', '(Geh, Freund. Geh.)');
  await say('erzaehler', 'Und der Mann stand auf und stellte sich in die Mitte. (Lukas 6,8)');
  await animate(2600, p => { fx.mitte = p; });
  await say('jesus', 'Ich frage euch: Ist es am Sabbat erlaubt, Gutes zu tun oder Böses? Ein Leben zu retten oder zugrunde gehen zu lassen? (Lukas 6,9)');
  await wait(1000);
  await say('joel', '(Niemand antwortet. Man hört die Öllampe flackern.)');
  await say('erzaehler', 'Und er sah sie alle der Reihe nach an. Dann sagte er zu dem Mann: (Lukas 6,10)');
  await say('jesus', 'Streck deine Hand aus!');
  await wait(700);
  F.handGeheilt = true;
  await say('erzaehler', 'Er tat es – und seine Hand war wiederhergestellt. (Lukas 6,10)');
  await say('mann', 'Sie... sie hält. Sie HÄLT! Joel – SIE HÄLT!');
  await say('levi', 'Er kennt deinen Namen?');
  await say('joel', 'Wir haben geredet. Am Rand. Da sitzt es sich leichter zu zweit.');
  await say('erzaehler', 'Sie aber wurden mit Unverstand erfüllt und beredeten miteinander, was sie Jesus antun könnten. (Lukas 6,11)');
  await wait(700);
  await say('joel', '(Eine Hand wird heil – und sie beraten, was sie ihm ANTUN können.)');
  await say('joel', '(Zum ersten Mal seit Bethlehem habe ich Angst. Nicht vor ihm. Um ihn.)');
  await say('levi', 'Komm, Joel. Der Steinmetz da vorne braucht jetzt jemanden, der mit ihm feiert. Das können wir besser als grübeln.');
  await animate(1800, p => { fx.fade = p; });
  await chapterTwelve();
}

/* ============================================================
   KAPITEL 12: DIE ZWÖLF (Lukas 6,12-19)
   ============================================================ */

async function chapterTwelve() {
  state.room = 'berg';
  player.x = 700; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = -1;
  fx.morgen = 0;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 12: DIE ZWÖLF');
  await say('erzaehler', 'In diesen Tagen ging Jesus auf einen Berg, um zu beten. Und er verbrachte die ganze Nacht im Gebet zu Gott. (Lukas 6,12)');
  await walkPlayerTo(480, 508);
  await say('joel', 'Da oben kniet er. Seit Sonnenuntergang. Keiner von uns hier unten kann schlafen – außer denen, die schnarchen.');
  await say('levi', 'Ich WACHE, Joel. Mit geschlossenen Augen. Das nennt man Erfahrung.');
  await say('joel', '(Schimon lebt weiter, in jedem von uns.)');
  await say('joel', '(Das Feuer ist fast aus, und Simon starrt hinein wie in eine Frage. Eine lange Nacht. Gut, dass ich Nachtwachen kann.)');
}

async function talkSimonNacht() {
  if (F.zwoelfDone) {
    await say('simon', 'Petrus. Er nennt mich Petrus.');
    return;
  }
  if (!F.simonNacht) {
    await say('simon', 'Du auch wach, Hirte?');
    await say('joel', 'Vierzig Jahre Nachtschicht. Mein Körper kennt es nicht anders.');
  }
  let done = false;
  while (!done) {
    const c = await choose([
      'Was macht er da oben die ganze Nacht?',
      'Morgen wählt er welche aus, heißt es.',
      'Schau lieber ins Feuer, nicht in deine Sorgen.',
      'Versuch zu schlafen, Simon.',
    ]);
    if (c === 0) {
      await say('simon', 'Beten. Die GANZE Nacht. Ich schlafe beim Abendgebet ein, und er redet bis zum Morgen mit Gott.');
      await say('joel', 'Vor großen Tagen wacht man. Das kenne ich aus Lammnächten.');
      await say('simon', 'Dann wird morgen wohl ein großer Tag.');
      F.simonNacht = true;
      await checkMorgen();
      if (F.zwoelfDone) return;
    } else if (c === 1) {
      await say('simon', 'Zwölf, sagt Johannes. ZWÖLF. Wie die Stämme Israels. Und wenn er mich nicht nimmt?');
      await say('joel', 'Simon. Er hat aus DEINEM Boot gepredigt. Er hat in DEINEM Haus deine Schwiegermutter geheilt. Beruhig dich.');
      await say('simon', 'Felsen sind ruhig. Ich übe schon mal.');
      F.simonNacht = true;
      await checkMorgen();
      if (F.zwoelfDone) return;
    } else if (c === 2) {
      await say('simon', 'Das Feuer ist fast aus, Hirte. Wie soll man da hineinschauen?');
      await say('joel', '(Er hat recht. Zeit, dass ich Reisig nachlege. Manche Dinge ändern sich nie.)');
    } else {
      await say('simon', 'Gleich. Erst noch ein bisschen... wachen.');
      done = true;
    }
  }
}

async function checkMorgen() {
  if (F.bergFeuer && F.simonNacht && !F.zwoelfDone) {
    F.zwoelfDone = true;
    await morgenCutscene();
  }
}

async function morgenCutscene() {
  await wait(800);
  await say('erzaehler', 'Als es Tag wurde, rief er seine Jünger zu sich und wählte zwölf von ihnen aus, die er auch Apostel nannte. (Lukas 6,13)');
  await animate(4500, p => { fx.morgen = p; });
  F.jesusUnten = true;
  await say('joel', '(Da kommt er den Hang herab. Eine ganze Nacht im Gebet – und er sieht wacher aus als wir alle zusammen.)');
  await say('jesus', 'Simon, den ich Petrus nenne. Andreas, sein Bruder. Jakobus und Johannes. Philippus und Bartholomäus.');
  await say('jesus', 'Matthäus. Thomas. Jakobus, der Sohn des Alphäus. Simon, genannt der Zelot.');
  await say('jesus', 'Judas, der Sohn des Jakobus. Und Judas Iskariot. (Lukas 6,14-16)');
  await wait(600);
  await say('levi', '(Joel. Er hat „Matthäus“ gesagt. Einen Atemzug lang dachte ich, gleich fällt „Levi“... na ja. Es gibt würdigere Levis.)');
  await say('joel', '(Der Zöllner Levi – er heißt jetzt Matthäus. Aus dem Mann am Zolltisch ist ein Apostel geworden.)');
  await say('joel', '(Zwölf Namen. Fischer, ein Zöllner, ein Zelot. Kein einziger Schriftgelehrter. Berufen wird nicht nach Verdienst – sondern nach Ruf.)');
  await say('erzaehler', 'So zählt Lukas die Zwölf auf – und fügt bei einem Namen leise hinzu: „...der zum Verräter wurde.“ (Lukas 6,16)');
  await say('joel', '(Ein Schatten über einem der zwölf Namen. Ich spüre ihn schon jetzt.)');
  await say('erzaehler', 'Und er stieg mit ihnen hinab und blieb auf einem ebenen Platz stehen – mit einer großen Schar von Jüngern und viel Volk aus dem ganzen Land, das gekommen war, um ihn zu hören und geheilt zu werden. (Lukas 6,17-18)');
  await say('simon', 'Petrus. Er nennt mich Petrus. FELS.');
  await say('levi', 'Glückwunsch, Fels. Du zitterst.');
  await say('simon', 'Felsen zittern nicht. Das ist Morgenkälte.');
  await say('joel', 'Komm, „Fels“. Da unten wartet eine Menge auf euch – und auf das, was er ihr zu sagen hat.');
  await animate(1800, p => { fx.fade = p; });
  await chapterThirteen();
}

/* ============================================================
   KAPITEL 13: DIE FELDREDE (Lukas 6,20-49)
   ============================================================ */

async function chapterThirteen() {
  state.room = 'ebene';
  player.x = 900; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = -1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 13: DIE FELDREDE');
  await say('erzaehler', 'Er stieg mit ihnen hinab und blieb auf einem ebenen Platz stehen. Eine große Menge war gekommen – aus ganz Judäa, aus Jerusalem und vom Küstenland – um ihn zu hören und von ihren Krankheiten geheilt zu werden. (Lukas 6,17-18)');
  await walkPlayerTo(700, 508);
  await say('levi', 'Joel, so viele Menschen habe ich nicht mal bei der Volkszählung gesehen. Und DIE war Pflicht.');
  await say('joel', 'Schau dir die Zwölf an – sie stehen um ihn herum, als wüssten sie noch nicht, wohin mit ihren neuen Titeln.');
  await say('joel', '(Da hinten winkt mir doch jemand... Und am Rand steht eine alte Frau, die nicht durch die Menge kommt. Erst die Arbeit, dann die Predigt.)');
}

async function talkWitwe() {
  if (F.witweGeheilt) {
    await say('witwe', 'Hirte! Schau: aufrecht! Meine Enkel werden mich nicht wiedererkennen!');
    await say('joel', 'Dann nichts wie heim zu ihnen – aber erst nach der Predigt, ja?');
    return;
  }
  await say('witwe', 'Verzeih, Hirte... hilfst du einer alten Frau?');
  await say('witwe', 'Ich bin den weiten Weg vom See heraufgekommen. Man sagt, eine Kraft geht von ihm aus, die alle heilt, die ihn berühren.');
  await say('witwe', 'Aber die Menge... Mein Rücken ist seit vierzig Jahren krumm, und meine Beine sind zu alt zum Drängeln.');
  await say('joel', 'Vierzig Jahre? Dann wird es Zeit. Nimm meinen Arm – ich habe vierzig Jahre Herden sortiert, eine Menschenmenge schreckt mich nicht.');
  await walkPlayerTo(300, 515);
  await say('joel', 'Platz da, Freunde! Eine Mutter Israels will durch!');
  await say('menge', '(Murren. Aber es entsteht eine Gasse.)');
  await walkPlayerTo(420, 515);
  await say('erzaehler', 'Und alle Leute versuchten, ihn zu berühren; denn es ging eine Kraft von ihm aus und heilte alle. (Lukas 6,19)');
  await wait(700);
  F.witweGeheilt = true;
  await say('witwe', 'Oh... OH! Der Schmerz! Er ist fort! Vierzig Jahre Rücken – und er ist FORT!');
  await say('joel', '(Sie richtet sich auf. Sie ist eine ganze Handbreit größer, als ich dachte.)');
  await say('witwe', 'Gesegnet seist du, Hirte. Und jetzt still – ich will jedes Wort hören.');
  await checkFeldrede();
}

async function talkSteinmetz() {
  if (F.steinmetzMet) {
    await say('mann', 'Gleich fängt er an, Joel. Ich habe uns einen Platz mit guter... Akustik gesucht. Steinmetz-Ohren.');
    return;
  }
  F.steinmetzMet = true;
  await say('mann', 'Joel! JOEL! Der Hirte aus der Synagoge!');
  await say('joel', 'Der Steinmetz! Was machst DU denn hier?');
  await say('mann', 'Schau!');
  await say('mann', '(Er öffnet und schließt die rechte Hand. Wieder und wieder. Er wird es nie leid.)');
  await say('mann', 'Diese Woche habe ich gearbeitet, Joel. ZWEI Türstürze und ein Fundament! Mit DIESER Hand!');
  await say('joel', 'Und jetzt bist du ihm nachgereist?');
  await say('mann', 'Quer durch Galiläa. Er hat mir die Hand wiedergegeben – das Mindeste ist, dass ich ihm auch zuhöre.');
  await checkFeldrede();
}

async function checkFeldrede() {
  if (F.witweGeheilt && F.steinmetzMet && !F.feldredeDone) {
    F.feldredeDone = true;
    await feldredeCutscene();
  }
}

async function feldredeCutscene() {
  await wait(800);
  await say('erzaehler', 'Und er richtete die Augen auf seine Jünger und begann zu reden: (Lukas 6,20)');
  await say('jesus', 'Selig, ihr Armen, denn euch gehört das Reich Gottes.');
  await say('jesus', 'Selig, die ihr jetzt hungert, denn ihr werdet gesättigt werden. Selig, die ihr jetzt weint, denn ihr werdet lachen. (Lukas 6,20-21)');
  await wait(600);
  await say('joel', '(Selig, ihr ARMEN. Nicht: Selig, ihr Gelehrten. Nicht: Selig, ihr Satten. Er fängt bei uns an.)');
  await say('levi', '(Hirten, Fischer, Witwen, Steinmetze. Heute sitzt die erste Reihe ganz hinten, Joel.)');
  await say('jesus', 'Euch, die ihr zuhört, sage ich: Liebt eure Feinde! Tut denen Gutes, die euch hassen! Segnet die, die euch verfluchen; betet für die, die euch beleidigen! (Lukas 6,27-28)');
  await say('joel', '(Feinde lieben. Ich denke an den Soldaten vor der Tür in Bethlehem. Es ist kein leichtes Wort. Nur ein wahres.)');
  await say('jesus', 'Und was ihr von anderen erwartet, das tut ebenso auch ihnen! (Lukas 6,31)');
  await say('jesus', 'Warum siehst du den Splitter im Auge deines Bruders, aber den Balken in deinem eigenen Auge bemerkst du nicht? (Lukas 6,41)');
  await say('levi', 'Joel. Du hast da übrigens wirklich etwas im Auge.');
  await say('joel', 'Levi. Er meint es BILDLICH.');
  await say('levi', 'Ich weiß. Trotzdem. Da ist was.');
  await say('jesus', 'Wer zu mir kommt, meine Worte hört und danach handelt – er gleicht einem Mann, der ein Haus baute: Er grub tief und legte das Fundament auf Fels.');
  await say('jesus', 'Als das Hochwasser kam, prallte der Strom an das Haus und konnte es nicht erschüttern, denn es war gut gebaut. (Lukas 6,47-48)');
  await say('mann', '(Auf Fels gegründet! ENDLICH redet einer, der vom Bauen versteht!)');
  await say('jesus', 'Wer aber hört und nicht handelt, gleicht einem Mann, der sein Haus ohne Fundament auf die Erde baute. Der Strom prallte daran – und es stürzte sofort in sich zusammen. (Lukas 6,49)');
  await wait(800);
  await say('joel', '(Hören UND handeln. Vierzig Jahre habe ich Herden auf festen Grund geführt – jetzt weiß ich, wie sich das von der anderen Seite anfühlt.)');
  await say('witwe', 'Jedes Wort wie Brot.');
  await say('levi', 'Komm, Joel. Wir bauen ab jetzt auf Fels. Du gräbst, ich übernehme die Gesamtaufsicht.');
  await say('joel', 'Natürlich tust du das.');
  await animate(1800, p => { fx.fade = p; });
  await chapterFourteen();
}

/* ============================================================
   KAPITEL 14: DER HAUPTMANN VON KAPERNAUM (Lukas 7,1-10)
   ============================================================ */

async function chapterFourteen() {
  state.room = 'kapernaum';
  player.x = 60; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 14: DER HAUPTMANN VON KAPERNAUM');
  await say('erzaehler', 'Als Jesus seine Rede vor dem Volk beendet hatte, ging er nach Kapernaum hinein. (Lukas 7,1)');
  await say('erzaehler', 'Dort lag der Knecht eines Hauptmanns, den dieser sehr schätzte, todkrank danieder. (Lukas 7,2)');
  await walkPlayerTo(280, 508);
  await say('levi', 'Schau dir das Haus da drüben an, Joel. Und davor... oh. Ein RÖMER.');
  await say('joel', '(Ein Offizier. Mein Magen zieht sich zusammen wie vor vierzig Jahren, als einer vor IHRER Tür stand.)');
  await say('joel', '(Aber dieser hier steht vor seiner EIGENEN Tür. Und er läuft auf und ab wie ein Vater vor einer Krankenstube.)');
  await say('joel', '(„Liebt eure Feinde.“ Gestern klang das einfacher.)');
}

async function talkHauptmann() {
  if (F.knechtGesund) {
    await say('hauptmann', 'Er steht, Hirte. Er isst. Er beschwert sich über die Suppe. Er IST es wieder.');
    await say('joel', 'Dann ist ja alles in Ordnung. Beschwerden über Suppe sind das sicherste Zeichen von Gesundheit.');
    return;
  }
  if (!F.hauptmannMet) {
    F.hauptmannMet = true;
    await say('hauptmann', 'Du da. Hirte.');
    await say('joel', '(Genau SO hat es damals angefangen. Ruhig, Joel. Ruhig.)');
    await say('hauptmann', 'Verzeih. Ich wollte nicht... Schon gut. Ich brauche niemanden.');
    await say('joel', '(Er dreht sich weg. Hundert Männer gehorchen ihm – und seine Stimme zittert.)');
  }
  let done = false;
  while (!done) {
    const c = await choose([
      'Euer Haus trägt einen Kranken, nicht wahr?',
      'Warum bittet Ihr nicht den Rabbi aus Nazaret?',
      'Die Leute hier reden gut über Euch.',
      'Ich lasse Euch in Ruhe.',
    ]);
    if (c === 0) {
      await say('hauptmann', 'Mein Knecht. Mehr Sohn als Diener, wenn ich ehrlich bin. Das Fieber frisst ihn seit Tagen.');
      await say('hauptmann', 'Ich befehle hundert Männern, Hirte. Sage ich GEH, so geht er. Sage ich KOMM, so kommt er. Aber dem Tod kann ich nichts befehlen.');
      await say('joel', '(Da steht ein Mann mit aller Macht der Welt – und sie nützt ihm nichts.)');
    } else if (c === 1) {
      await say('hauptmann', 'ICH? Ein Römer? Ich bin nicht würdig, dass er unter mein Dach tritt. Ich weiß, was euer Gesetz über die Häuser von Heiden sagt.');
      await say('joel', 'Ich habe gestern einen predigen hören: Liebt eure Feinde. Tut Gutes denen, die euch hassen.');
      await say('joel', 'Ich glaube, bei DEM gelten andere Türschwellen.');
      await say('hauptmann', '...Sprich mit den Ältesten, Hirte. Wenn DIE für mich bitten, hört er vielleicht zu.');
    } else if (c === 2) {
      await say('hauptmann', 'Ich habe ihnen die Synagoge gebaut. Stein für Stein bezahlt. Nicht aus Politik – aus Achtung.');
      await say('hauptmann', 'Dieses Volk kennt GOTT. Wir Römer kennen nur Götter. Das ist nicht dasselbe, glaub mir.');
    } else {
      await say('hauptmann', 'Geh nur. Und Hirte... danke, dass du nicht weggelaufen bist. Die meisten laufen weg.');
      await say('joel', '(Ich war nah dran. Sehr nah.)');
      done = true;
    }
  }
}

async function talkAelteste() {
  if (F.knechtGesund) {
    await say('aelteste', 'Gesund, Hirte! Der Knecht ist gesund! Und unsere Synagoge hat ab heute eine Geschichte mehr.');
    return;
  }
  if (!F.hauptmannMet) {
    await say('aelteste', 'Der Hauptmann da drüben läuft seit Tagen vor seinem Haus auf und ab. Sein Knecht liegt im Sterben.');
    await say('aelteste', 'Sprich DU mit ihm, Hirte. Auf uns hört er heute nicht – er schämt sich, uns um etwas zu bitten.');
    return;
  }
  if (F.aeltesteLos) {
    await say('aelteste', 'Wir sind unterwegs zu Jesus, Hirte. Gleich. Sofort. Wir sammeln nur noch... Mut.');
    return;
  }
  await say('aelteste', 'Und? Hat er mit dir geredet?');
  await say('joel', 'Er hat. Sein Knecht stirbt – und er hält sich nicht für würdig, Jesus selbst zu bitten. Ein Römer, der sich vor EURER Schwelle verneigt.');
  await say('aelteste', 'Dann gehen WIR für ihn. Er liebt unser Volk und hat uns die Synagoge gebaut – er verdient es, dass Jesus ihm hilft. (Lukas 7,4-5)');
  await say('joel', 'Dann lauft. Der Tod wartet nicht auf Beratungen.');
  F.aeltesteLos = true;
  await hauptmannCutscene();
}

async function hauptmannCutscene() {
  await wait(700);
  await say('erzaehler', 'Die Ältesten kamen zu Jesus und baten ihn inständig. Und Jesus ging mit ihnen. (Lukas 7,4.6)');
  F.jesusKommt = true;
  await say('joel', '(Da kommen sie zurück – und ER ist dabei. Die halbe Stadt hinterher.)');
  await say('erzaehler', 'Als er nicht mehr weit vom Haus entfernt war, schickte der Hauptmann Freunde zu ihm und ließ ihm sagen: (Lukas 7,6)');
  await say('freund', 'Herr, bemühe dich nicht! Denn ich bin nicht würdig, dass du unter mein Dach einkehrst.');
  await say('freund', 'Darum habe ich mich auch nicht für würdig gehalten, selbst zu dir zu kommen. Aber sprich nur ein Wort, und mein Diener wird gesund. (Lukas 7,7)');
  await say('freund', 'Denn auch ich unterstehe Befehlsgewalt und habe Soldaten unter mir. Sage ich zu einem: Geh!, so geht er; und zu einem andern: Komm!, so kommt er. (Lukas 7,8)');
  await wait(800);
  await say('erzaehler', 'Als Jesus das hörte, staunte er über ihn. Er wandte sich um und sagte zu der Menge, die ihm folgte: (Lukas 7,9)');
  await say('jesus', 'Ich sage euch: Einen solchen Glauben habe ich nicht einmal in Israel gefunden.');
  await say('levi', 'Er... STAUNT? Er? Ich dachte immer, das Staunen wäre unsere Aufgabe.');
  await say('joel', '(Über einen Römer. Über einen SOLDATEN. Gestern: Liebt eure Feinde. Heute zeigt ausgerechnet einer von denen uns allen, was Glaube ist.)');
  await wait(700);
  F.knechtGesund = true;
  await say('knecht', 'Herr! HERR! Ich stehe! Schaut – ich STEHE!');
  await say('hauptmann', 'Du sollst dich schonen, geh wieder hinein! ...Er steht. Hirte, hast du das gesehen? ER STEHT!');
  await say('erzaehler', 'Und als die Boten in das Haus zurückkehrten, fanden sie den Diener gesund. (Lukas 7,10)');
  await wait(700);
  await say('joel', '(„Sprich nur ein Wort.“ Kein Berühren, kein Hinsehen – ein Wort über die Entfernung hinweg. Sein Wort genügt.)');
  await say('levi', 'Joel. Dir ist klar, dass du heute FREIWILLIG mit einem Soldaten geredet hast?');
  await say('joel', 'Ja. Und diesmal hat es nicht einmal einen Weinkrug gebraucht.');
  await say('levi', 'Die Welt ändert sich.');
  await say('joel', 'Nein, Levi. ER ändert sie. Ein Wort nach dem anderen.');
  await animate(1800, p => { fx.fade = p; });
  await chapterFifteen();
}

/* ============================================================
   KAPITEL 15: DER JÜNGLING ZU NAIN (Lukas 7,11-17)
   ============================================================ */

async function chapterFifteen() {
  state.room = 'nain';
  player.x = 60; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 15: DER JÜNGLING ZU NAIN');
  await say('erzaehler', 'Danach ging Jesus in eine Stadt namens Nain; seine Jünger und eine große Volksmenge folgten ihm. (Lukas 7,11)');
  await walkPlayerTo(380, 508);
  await say('levi', 'Joel... hörst du das? Flöten. Klagefrauen.');
  await say('erzaehler', 'Als er in die Nähe des Stadttors kam, trug man gerade einen Toten heraus – den einzigen Sohn seiner Mutter, und sie war Witwe. (Lukas 7,12)');
  await say('joel', '(Zwei Züge treffen sich vor diesem Tor: einer voller Leben – und einer, der zum Grab geht.)');
  await say('joel', '(Und unsere Leute hinter uns lachen noch über die Wunder von gestern. Das geht so nicht.)');
}

async function talkNainTraeger() {
  if (F.juenglingLebt) {
    await say('traeger', 'Ich trage seit zwanzig Jahren Tote zum Grab, Hirte. Heute trage ich eine LEERE Bahre zurück. Ich werde diesen Beruf überdenken.');
    return;
  }
  F.traegerMet = true;
  await say('joel', '(Ich trete leise zu einem der Träger.)');
  await say('joel', 'Wen tragt ihr, Freund?');
  await say('traeger', 'Den jungen Asa. Gestern Abend ist er gegangen – das Fieber. Keine zwanzig Jahre alt.');
  await say('traeger', 'Der einzige Sohn seiner Mutter. Und sie ist Witwe, Hirte. Erst der Mann, jetzt der Junge. Sie hat niemanden mehr.');
  await say('joel', '(Eine Witwe ohne Sohn. Kein Versorger, kein Name, der weiterlebt. Hinter dieser Bahre wird ein ganzes Leben mit zu Grabe getragen.)');
  await say('traeger', 'Wenn du mitgehen willst: Ein Trauerzug weist niemanden ab. So ist der Brauch.');
  await checkNain();
}

async function beruhigeMenge() {
  if (F.mengeStill) {
    await say('joel', '(Sie schweigen. Sogar die Kinder. Gut so.)');
    return;
  }
  await say('menge', '...und dann sagte der Hauptmann: Sprich nur EIN WORT! Ha! Was für ein Tag das war...');
  await say('joel', 'Freunde. FREUNDE. Still jetzt.');
  await say('joel', 'Da vorne trägt eine Mutter ihr einziges Kind zu Grab. Wer jubeln will, jubelt später.');
  await say('menge', '(Das Lachen erstirbt. Einer nach dem anderen nimmt die Mütze ab.)');
  F.mengeStill = true;
  await say('levi', 'Gut gemacht, Joel. Schimon hätte es genauso gesagt. Nur lauter.');
  await checkNain();
}

async function checkNain() {
  if (F.traegerMet && F.mengeStill && !F.juenglingLebt) {
    await nainCutscene();
  }
}

async function nainCutscene() {
  await wait(800);
  await say('erzaehler', 'Als der Herr die Frau sah, hatte er Mitleid mit ihr und sagte zu ihr: (Lukas 7,13)');
  await say('jesus', 'Weine nicht!');
  await say('joel', '(Zwei Worte. Von jedem anderen wären sie grausam. Von ihm klingen sie wie ein Versprechen.)');
  await say('erzaehler', 'Und er trat heran und berührte die Bahre. Die Träger blieben stehen. (Lukas 7,14)');
  await wait(900);
  await say('joel', '(Niemand atmet. Sogar die Flöten schweigen.)');
  await say('jesus', 'Jüngling, ich sage dir: Steh auf!');
  await wait(1000);
  F.juenglingLebt = true;
  await say('erzaehler', 'Da setzte sich der Tote auf und begann zu sprechen. Und Jesus gab ihn seiner Mutter zurück. (Lukas 7,15)');
  await say('juengling', 'Mutter...?');
  await say('mutter', 'Asa! Mein Junge! MEIN JUNGE!');
  await wait(800);
  await say('erzaehler', 'Alle wurden von Furcht ergriffen; sie priesen Gott und sagten: (Lukas 7,16)');
  await say('menge', '„Ein großer Prophet ist unter uns aufgetreten!“ – „Gott hat sein Volk besucht!“');
  await wait(600);
  await say('joel', 'Levi? Du sagst ja gar nichts.');
  await say('levi', 'Ich habe Schimon zu Grabe getragen, Joel. Und meine Frau. Ich weiß gerade nicht, ob ich weinen oder singen soll.');
  await say('joel', 'Beides, alter Freund. Heute geht beides.');
  await say('joel', '(Mein Leben lang dachte ich: Der Tod hat immer das letzte Wort. Heute hat ihm einer ins Wort geredet.)');
  await say('erzaehler', 'Und die Kunde davon verbreitete sich in ganz Judäa und im ganzen Umland. (Lukas 7,17)');
  await animate(1800, p => { fx.fade = p; });
  await chapterSixteen();
}

/* ============================================================
   KAPITEL 16: DIE BOTEN DES JOHANNES (Lukas 7,18-35)
   ============================================================ */

async function chapterSixteen() {
  state.room = 'johannesfrage';
  player.x = 60; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 16: DIE BOTEN DES JOHANNES');
  await say('erzaehler', 'Die Jünger des Johannes berichteten ihm von all dem. Da rief Johannes zwei von ihnen zu sich und schickte sie zum Herrn. (Lukas 7,18-19)');
  await walkPlayerTo(300, 508);
  await say('levi', 'Joel, da vorn sind Männer vom Jordan. Man erkennt sie an den staubigen Füßen und daran, dass sie nicht wissen, wohin mit ihrer Frage.');
  await say('bote', 'Wir kommen von Johannes. Er sitzt im Gefängnis des Herodes.');
  await say('joel', 'Johannes... der Täufer? Der, der am Jordan von Umkehr gesprochen hat?');
  await say('bote', 'Er lässt Jesus fragen: Bist du der, der kommen soll, oder sollen wir auf einen anderen warten? (Lukas 7,19)');
  await say('joel', '(Nach Nain hätte ich gedacht, alle Fragen seien beantwortet. Aber ein Gefängnis macht selbst starke Herzen eng.)');
  F.johannesBotenMet = true;
  await say('joel', '(Jesus antwortet nicht sofort mit einer Rede. Er lässt sie sehen. Dann sollen wir dafür sorgen, dass sie wirklich sehen können.)');
}

async function talkJohannesBote() {
  if (F.antwortGesandt) {
    await say('bote', 'Wir gehen zurück zu Johannes. Nicht mit einer Theorie, sondern mit dem, was wir gesehen und gehört haben.');
    return;
  }
  let done = false;
  while (!done) {
    const c = await choose([
      'Wie geht es Johannes?',
      'Warum fragt er das?',
      'Was habt ihr schon gesehen?',
      'Ich sehe mich um.',
    ]);
    if (c === 0) {
      await say('bote', 'Er ist im Gefängnis, Hirte. Eisen an den Türen, Herodes über ihm, Gerüchte draußen.');
      await say('bote', 'Aber selbst dort hört er, was Jesus tut. Die Kunde von Nain hat die Mauern erreicht.');
    } else if (c === 1) {
      await say('bote', 'Johannes hat auf den Kommenden gezeigt. Jetzt sitzt er fest, und der Kommende heilt, isst mit Sündern und predigt den Armen.');
      await say('bote', 'Vielleicht fragt er nicht aus Zweifel allein. Vielleicht will er, dass wir mit eigenen Augen sehen.');
    } else if (c === 2) {
      if (!F.blinderGeheilt && !F.armeHoeren) await say('bote', 'Noch nicht genug. Die Menge drängt. Da hinten ruft ein blinder Mann, und links stehen Arme, die kaum etwas verstehen können.');
      else if (!F.blinderGeheilt) await say('bote', 'Wir haben gehört, wie er den Armen gute Nachricht zuspricht. Aber der blinde Mann dort ruft immer noch.');
      else if (!F.armeHoeren) await say('bote', 'Der Blinde sieht. Jetzt möchte ich hören, was er den Armen sagt.');
      else {
        await say('bote', 'Wir haben gesehen, was wir sehen mussten. Sprich mit Jesus, Joel. Die Antwort gehört ihm.');
        done = true;
      }
    } else {
      await say('bote', 'Tu das. Johannes hat uns gefragt, aber diese Antwort scheint größer zu sein als wir.');
      done = true;
    }
  }
}

async function hilfBlindem() {
  if (F.blinderGeheilt) {
    await say('blinder', 'Ich sehe, Joel. Das erste Gesicht, das ich erkannte, war seines. Danach deins. Du bist grauer, als du klingst.');
    await say('joel', 'Das ist... fast ein Kompliment.');
    return;
  }
  if (!F.blinderGefuehrt) {
    F.blinderGefuehrt = true;
    await say('blinder', 'Wer ist da? Ich höre die Menge, aber ich finde den Weg nicht.');
    await say('joel', 'Nimm meinen Arm. Ich habe schon Menschenmengen sortiert und störrische Schafe. Der Unterschied ist kleiner, als man denkt.');
    await walkPlayerTo(600, 510);
    await say('joel', 'Platz, Freunde. Lasst ihn durch.');
    await say('menge', '(Die Menge weicht zurück. Die Boten des Johannes schauen genau hin.)');
  }
  await say('erzaehler', 'In jener Stunde heilte Jesus viele von Krankheiten und Leiden und schenkte vielen Blinden das Augenlicht. (Lukas 7,21)');
  await wait(700);
  F.blinderGeheilt = true;
  await say('blinder', 'Licht... Ich sehe LICHT!');
  await say('bote', 'Johannes muss das hören.');
  await checkJohannesAntwort();
}

async function lassArmeHoeren() {
  if (F.armeHoeren) {
    await say('arme', 'Er hat uns nicht übersehen. Sag Johannes das auch: Die Armen stehen nicht mehr draußen.');
    return;
  }
  await say('arme', 'Hirte, wir stehen so weit hinten. Sagt er wirklich, dass Gottes Reich auch für Leute wie uns kommt?');
  await say('joel', 'Kommt näher. Wenn ich eines seit Bethlehem weiß: Gute Nachricht beginnt gern bei Leuten, die hinten stehen.');
  await say('menge', '(Ein paar Schultern rücken zur Seite. Eine kleine Gasse entsteht.)');
  await say('jesus', 'Selig, ihr Armen, denn euch gehört das Reich Gottes. (Lukas 6,20)');
  await say('arme', 'Dann hat er uns gemeint.');
  await say('joel', 'Ja. Euch. Uns. Alle, die sich sonst nicht in der ersten Reihe finden.');
  F.armeHoeren = true;
  await checkJohannesAntwort();
}

async function checkJohannesAntwort() {
  if (F.johannesBotenMet && F.blinderGeheilt && F.armeHoeren && !F.antwortGesandt) {
    await johannesAntwortCutscene();
  }
}

async function johannesAntwortCutscene() {
  await wait(800);
  await say('bote', 'Rabbi, Johannes der Täufer hat uns zu dir geschickt und lässt fragen: Bist du der, der kommen soll, oder sollen wir auf einen anderen warten? (Lukas 7,20)');
  await wait(500);
  await say('jesus', 'Geht und berichtet Johannes, was ihr gesehen und gehört habt:');
  await say('jesus', 'Blinde sehen, Lahme gehen, Aussätzige werden rein, Taube hören, Tote stehen auf, Armen wird das Evangelium verkündet.');
  await say('jesus', 'Und selig ist, wer an mir keinen Anstoß nimmt. (Lukas 7,22-23)');
  F.antwortGesandt = true;
  await say('joel', '(Keine kurze Antwort. Eine Spur aus Zeichen. Ein Weg, dem sogar ein Mann im Gefängnis folgen kann.)');
  await say('bote', 'Wir gehen. Johannes soll nicht nur Worte hören – er soll hören, was wir gesehen haben.');
  await wait(700);
  await say('erzaehler', 'Als die Boten des Johannes weggegangen waren, begann Jesus zur Menge über Johannes zu reden. (Lukas 7,24)');
  await say('jesus', 'Was seid ihr in die Wüste hinausgegangen zu sehen? Ein Schilfrohr, das im Wind schwankt?');
  await say('jesus', 'Oder was seid ihr hinausgegangen zu sehen? Einen Propheten? Ja, ich sage euch: mehr als einen Propheten. (Lukas 7,24-26)');
  await say('jesus', 'Dieser ist es, von dem geschrieben steht: Siehe, ich sende meinen Boten vor dir her; er wird deinen Weg vor dir bereiten. (Lukas 7,27)');
  await say('jesus', 'Unter denen, die von einer Frau geboren sind, ist keiner größer als Johannes; doch der Kleinste im Reich Gottes ist größer als er. (Lukas 7,28)');
  await wait(700);
  await say('levi', 'Der Größte... sitzt im Gefängnis. Und die Kleinsten werden größer, weil Gottes Reich zu ihnen kommt.');
  await say('joel', 'So klingt es. Dieses Reich stellt sogar Ranglisten auf den Kopf.');
  await say('erzaehler', 'Die Weisheit aber wird durch alle ihre Kinder bestätigt. (Lukas 7,35)');
  await say('joel', '(Johannes zeigte auf ihn. Jetzt zeigen die Zeichen zurück: Blinde sehen, Tote leben, Arme hören gute Nachricht.)');
  await animate(1800, p => { fx.fade = p; });
  await chapterSeventeen();
}

/* ============================================================
   KAPITEL 17: DIE SÜNDERIN IM HAUS DES PHARISÄERS (Lukas 7,36-50)
   ============================================================ */

async function chapterSeventeen() {
  state.room = 'pharisaeerhaus';
  player.x = 120; player.y = 508;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 17: DIE SÜNDERIN IM HAUS DES PHARISÄERS');
  await say('erzaehler', 'Einer der Pharisäer lud Jesus zum Essen ein. Jesus ging in sein Haus und legte sich zu Tisch. (Lukas 7,36)');
  F.pharisaeerMahlBegonnen = true;
  await walkPlayerTo(250, 508);
  await say('levi', 'Ein feines Haus, Joel. Feine Speisen, feine Gäste und eine Stille, die schärfer ist als jedes Messer auf dem Tisch.');
  await say('joel', 'Simon hat Jesus eingeladen. Aber irgendetwas an diesem Empfang fühlt sich unfertig an.');
  await say('levi', 'Dann schau genau hin. Bei einem Gastmahl erzählen manchmal die Dinge, die fehlen, die lauteste Geschichte.');
}

async function bemerkeWasser() {
  if (F.wasserVermisst) {
    await say('joel', 'Das Becken ist noch immer trocken. Kein Wasser für die staubigen Füße des Gastes.');
    return;
  }
  F.wasserVermisst = true;
  await say('joel', 'Das Waschbecken an der Tür ist leer. Dabei bietet man jedem Gast Wasser für die staubigen Füße an.');
  await say('levi', 'Jedem Gast, ja. Besonders einem, den man selbst eingeladen hat.');
  await checkGastfreundschaft();
}

async function redeSimonPharisaeer() {
  if (F.kussVermisst) {
    if (F.frauVergeben) await say('pharisaeer', 'Er kannte ihre Gedanken, Joel. Und meine kannte er offenbar auch.');
    else await say('pharisaeer', 'Ich habe ihn eingeladen, damit wir hören und prüfen können. Das muss als Begrüßung genügen.');
    return;
  }
  await say('joel', 'Simon, du hast Jesus eingeladen. Warum hast du ihn an der Tür nicht mit einem Kuss begrüßt?');
  await say('pharisaeer', 'Ein Begrüßungskuss ist Ehre, Hirte. Ich will erst wissen, ob dieser Mann die Ehre verdient, die das Volk ihm gibt.');
  await say('joel', '(Also war die offene Tür keine offene Achtung. Simon empfängt ihn und hält ihn zugleich auf Abstand.)');
  F.kussVermisst = true;
  await checkGastfreundschaft();
}

async function bemerkeOel() {
  if (F.oelVermisst) {
    await say('joel', 'Das Salböl steht unberührt im Regal. Simon hat seinem Gast keinen Tropfen angeboten.');
    return;
  }
  F.oelVermisst = true;
  await say('joel', 'Ein Krug duftendes Öl steht bereit, aber sein Verschluss ist noch versiegelt. Auch damit hätte Simon seinen Gast ehren können.');
  await say('levi', 'Wasser, ein Kuss, ein wenig Öl. Nichts davon wäre kostbar gewesen. Vielleicht ist genau das der Punkt.');
  await checkGastfreundschaft();
}

async function checkGastfreundschaft() {
  if (F.pharisaeerMahlBegonnen && F.wasserVermisst && F.kussVermisst && F.oelVermisst && !F.frauEingetreten) {
    await suenderinCutscene();
  }
}

async function suenderinCutscene() {
  await wait(700);
  await say('erzaehler', 'Da kam eine Frau aus der Stadt, die als Sünderin bekannt war. Sie hatte erfahren, dass Jesus im Haus des Pharisäers zu Tisch lag, und brachte ein Alabastergefäß mit Salböl. (Lukas 7,37)');
  F.frauEingetreten = true;
  await say('joel', '(Sie sagt nichts. Sie geht an den Blicken der Gäste vorbei und bleibt hinter Jesus bei seinen Füßen stehen.)');
  await say('erzaehler', 'Weinend begann sie seine Füße mit ihren Tränen zu benetzen. Sie trocknete sie mit ihrem Haar, küsste seine Füße und salbte sie mit dem Öl. (Lukas 7,38)');
  await wait(700);
  await say('joel', '(Das Wasser, der Kuss, das Öl. Alles, was Simon zurückhielt, gibt sie im Überfluss.)');
  await say('erzaehler', 'Als der Pharisäer das sah, dachte er: Wenn dieser Mann ein Prophet wäre, müsste er wissen, was für eine Frau ihn berührt. (Lukas 7,39)');
  await say('jesus', 'Simon, ich habe dir etwas zu sagen.');
  await say('pharisaeer', 'Meister, sprich!');
  await say('jesus', 'Ein Geldverleiher hatte zwei Schuldner. Der eine schuldete ihm fünfhundert Denare, der andere fünfzig.');
  await say('jesus', 'Da sie nicht bezahlen konnten, erließ er beiden die Schuld. Wer von ihnen wird ihn nun mehr lieben? (Lukas 7,41-42)');
  await say('pharisaeer', 'Ich nehme an, der, dem er mehr erlassen hat.');
  await say('jesus', 'Du hast richtig geurteilt. (Lukas 7,43)');
  await wait(500);
  await say('erzaehler', 'Dann wandte er sich der Frau zu und sagte zu Simon: Siehst du diese Frau? (Lukas 7,44)');
  await say('jesus', 'Ich bin in dein Haus gekommen. Du hast mir kein Wasser für die Füße gegeben; sie aber hat meine Füße mit Tränen benetzt und mit ihrem Haar getrocknet.');
  await say('jesus', 'Du hast mir keinen Kuss gegeben; sie aber hat nicht aufgehört, meine Füße zu küssen.');
  await say('jesus', 'Du hast mein Haupt nicht mit Öl gesalbt; sie aber hat meine Füße mit Salböl gesalbt. (Lukas 7,44-46)');
  await say('jesus', 'Deshalb sage ich dir: Ihre vielen Sünden sind vergeben, denn sie hat viel geliebt. Wem aber wenig vergeben wird, der liebt wenig. (Lukas 7,47)');
  await say('jesus', 'Deine Sünden sind dir vergeben.');
  await say('menge', 'Wer ist dieser, der sogar Sünden vergibt? (Lukas 7,49)');
  await say('jesus', 'Dein Glaube hat dich gerettet. Geh in Frieden! (Lukas 7,50)');
  F.frauVergeben = true;
  await wait(700);
  await say('joel', '(Simon sah eine Vergangenheit. Jesus sah ihren Glauben. Und sie verlässt das Haus nicht mit dem Namen, den die Stadt ihr gab, sondern mit Frieden.)');
  await animate(1800, p => { fx.fade = p; });
  await chapterEighteen();
}

/* ============================================================
   KAPITEL 18: DAS GLEICHNIS VOM SÄMANN (Lukas 8,1-15)
   ============================================================ */

async function chapterEighteen() {
  state.room = 'saemannfeld';
  player.x = 70; player.y = 510;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 18: DAS GLEICHNIS VOM SÄMANN');
  await say('erzaehler', 'Danach zog Jesus von Stadt zu Stadt und von Dorf zu Dorf, verkündete das Reich Gottes und brachte die gute Nachricht. Die Zwölf begleiteten ihn. (Lukas 8,1)');
  await say('erzaehler', 'Auch einige Frauen waren dabei, die von bösen Geistern und Krankheiten geheilt worden waren: Maria, genannt Magdalena, Johanna, Susanna und viele andere. Sie unterstützten Jesus und die Jünger mit dem, was sie besaßen. (Lukas 8,2-3)');
  F.reiseFrauenVorgestellt = true;
  await walkPlayerTo(180, 510);
  await say('magdalena', 'Dieser Weg wird von vielen getragen, Joel. Manche predigen, manche sorgen dafür, dass morgen noch Brot da ist.');
  await say('johanna', 'Und wenn wir eine Stadt erreichen, wartet schon die nächste Menge. Heute sind Menschen aus allen Orten gekommen.');
  await say('joel', '(Am Rand des Feldes beginnt ein Sämann seine Arbeit. Jesus schaut zu ihm hinüber, dann zur Menge.)');
  await say('saemann', 'Hirte! Der Boden hier könnte unterschiedlicher kaum sein. Nimm ein paar Körner und hilf mir bei der Aussaat.');
  await say('levi', 'Ein Saatbeutel, vier Böden und Jesus, der schon so schaut, als würde gleich jedes Korn eine Bedeutung bekommen.');
}

async function nimmSaatkoerner() {
  if (F.samenErhalten) {
    await say('joel', 'Ich habe genug Saatkörner. Jetzt müssen sie auf den Boden.');
    return;
  }
  F.samenErhalten = true;
  addItem('samen');
  await say('joel', 'Eine gute Handvoll Saatkörner. Der Sämann nickt mir zu.');
  await say('saemann', 'Streu mit weitem Arm, Joel. Ein Sämann wählt nicht jedes Fleckchen einzeln aus. Er sät großzügig.');
}

async function saeeAufBoden(art) {
  if (!F.samenErhalten || !state.inventory.includes('samen')) {
    await say('joel', 'Dafür brauche ich Saatkörner. Der Beutel liegt beim Sämann.');
    return;
  }

  const flag = {
    weg: 'wegBesaet',
    fels: 'felsBesaet',
    dornen: 'dornenBesaet',
    gut: 'guterBodenBesaet',
  }[art];
  if (F[flag]) {
    await say('joel', 'Hier habe ich bereits gesät. Ich sollte mir einen anderen Boden ansehen.');
    return;
  }

  F[flag] = true;
  await say('joel', '(Ich greife in den Beutel und streue die Körner mit weitem Arm aus.)');

  if (art === 'weg') {
    await say('erzaehler', 'Ein Teil fiel auf den Weg. Die Körner wurden zertreten, und die Vögel des Himmels fraßen sie. (Lukas 8,5)');
    await say('joel', '(Auf dem harten Weg findet kein Korn einen Ort, an dem es Wurzeln schlagen könnte.)');
  } else if (art === 'fels') {
    await say('erzaehler', 'Ein anderer Teil fiel auf felsigen Boden. Die Saat ging auf, verdorrte aber, weil ihr die Feuchtigkeit fehlte. (Lukas 8,6)');
    await say('joel', '(Schnell aufgegangen, ebenso schnell vergangen. Unter der dünnen Erde ist kein Raum für Wurzeln.)');
  } else if (art === 'dornen') {
    await say('erzaehler', 'Ein anderer Teil fiel mitten unter die Dornen. Die Dornen wuchsen mit der Saat auf und erstickten sie. (Lukas 8,7)');
    await say('levi', 'Die Halme sind da, Joel. Man sieht sie nur kaum noch zwischen allem, was ihnen Licht und Luft nimmt.');
  } else {
    await say('erzaehler', 'Ein anderer Teil fiel auf guten Boden. Die Saat ging auf und brachte hundertfache Frucht. (Lukas 8,8)');
    await say('saemann', 'Gute Erde hält das Korn fest, gibt ihm Tiefe und lässt ihm Zeit. Dann wird aus einer Handvoll eine Ernte.');
  }

  await checkSaemannGleichnis();
}

async function checkSaemannGleichnis() {
  if (F.wegBesaet && F.felsBesaet && F.dornenBesaet && F.guterBodenBesaet && !F.gleichnisErklaert) {
    await saemannGleichnisCutscene();
  }
}

async function saemannGleichnisCutscene() {
  F.gleichnisErklaert = true;
  removeItem('samen');
  await wait(700);
  await say('joel', '(Vier Böden. Dasselbe Saatkorn. Vier völlig verschiedene Geschichten.)');
  await say('jesus', 'Wer Ohren hat zu hören, der höre! (Lukas 8,8)');
  await wait(600);
  await say('juenger', 'Meister, was bedeutet dieses Gleichnis?');
  await say('jesus', 'Euch ist es gegeben, die Geheimnisse des Reiches Gottes zu erkennen. Zu den anderen aber wird in Gleichnissen geredet. (Lukas 8,9-10)');
  await say('jesus', 'Das Gleichnis bedeutet: Der Same ist das Wort Gottes. (Lukas 8,11)');
  await say('jesus', 'Die auf dem Weg sind Menschen, die das Wort hören. Dann kommt der Teufel und nimmt es aus ihrem Herzen, damit sie nicht glauben und gerettet werden. (Lukas 8,12)');
  await say('jesus', 'Die auf dem Felsen nehmen das Wort mit Freude an, wenn sie es hören. Aber sie haben keine Wurzel; eine Zeit lang glauben sie, doch in der Prüfung fallen sie ab. (Lukas 8,13)');
  await say('jesus', 'Was unter die Dornen fiel, sind Menschen, die hören und weitergehen. Sorgen, Reichtum und Freuden des Lebens ersticken das Wort, sodass es keine reife Frucht bringt. (Lukas 8,14)');
  await say('jesus', 'Was auf guten Boden fiel, sind Menschen, die das Wort mit gutem und aufrichtigem Herzen hören, daran festhalten und durch Ausdauer Frucht bringen. (Lukas 8,15)');
  await wait(600);
  await say('magdalena', 'Dann geht es nicht darum, wer dem Wort am nächsten steht, sondern ob es in uns Raum und Tiefe findet.');
  await say('joel', '(Ich dachte, ich hätte vier Felder besät. Jesus hat von vier Arten gesprochen, wie ein Herz hören kann.)');
  await animate(1800, p => { fx.fade = p; });
  await chapterNineteen();
}

/* ============================================================
   KAPITEL 19: DIE STILLUNG DES STURMS (Lukas 8,16-25)
   ============================================================ */

async function chapterNineteen() {
  state.room = 'sturmsee';
  player.x = 300; player.y = 438;
  player.tx = player.x; player.ty = player.y;
  player.walking = false; player.facing = 1;
  fx.sturm = 0;
  await animate(1200, p => { fx.fade = 1 - p; });
  await say('erzaehler', 'KAPITEL 19: DIE STILLUNG DES STURMS');
  await say('erzaehler', 'Jesus sagte: Niemand zündet eine Lampe an und bedeckt sie mit einem Gefäß. Man stellt sie auf einen Leuchter, damit alle das Licht sehen. Achtet also darauf, wie ihr hört. (Lukas 8,16-18)');
  await say('erzaehler', 'Als seine Mutter und seine Brüder wegen der Menge nicht zu ihm gelangen konnten, sagte Jesus: Meine Mutter und meine Brüder sind die, die Gottes Wort hören und danach handeln. (Lukas 8,19-21)');
  await say('erzaehler', 'Eines Tages stieg Jesus mit seinen Jüngern in ein Boot und sagte zu ihnen: (Lukas 8,22)');
  await say('jesus', 'Lasst uns ans andere Ufer des Sees fahren.');
  F.sturmFahrtBegonnen = true;
  await say('simon', 'Der Wind ist ruhig. Wir setzen über, bevor es dunkel wird.');
  await say('joel', '(Das Boot löst sich vom Ufer. Das gleichmäßige Schlagen der Wellen macht selbst die Wachsten müde.)');
  await say('erzaehler', 'Während der Fahrt schlief Jesus ein. Da fiel ein Sturmwind auf den See. Das Boot lief voll Wasser, und sie gerieten in Gefahr. (Lukas 8,23)');
  F.sturmBegonnen = true;
  await animate(1600, p => { fx.sturm = p; });
  await say('levi', 'JOEL! Das Segel schlägt los, und das Wasser steht uns schon an den Knöcheln!');
  await say('simon', 'Sichere das Segel und schöpfe Wasser! Dann müssen wir gemeinsam zu Jesus.');
}

async function sichereSturmsegel() {
  if (F.sturmGestillt) {
    await say('joel', 'Das Segel hängt wieder ruhig. Kein Wind zerrt mehr daran.');
    return;
  }
  if (!F.sturmBegonnen) {
    await say('joel', 'Das Segel steht gut. Noch ist der Wind ruhig.');
    return;
  }
  if (F.sturmSegelGesichert) {
    await say('joel', 'Die Leinen halten. Mehr kann ich am Segel gerade nicht tun.');
    return;
  }
  await say('joel', '(Ich kämpfe mich zum Mast, ziehe die nasse Leine herunter und wickle sie zweimal um den Querbalken.)');
  await say('levi', 'Festhalten! Die nächste Welle kommt von rechts!');
  F.sturmSegelGesichert = true;
  await say('joel', 'Das Segel ist gesichert. Der Sturm hat jetzt wenigstens eine Sache weniger, die er uns entreißen kann.');
}

async function schoepfeSturmwasser() {
  if (F.sturmGestillt) {
    await say('joel', 'Nur noch eine flache Pfütze im Boot. Der See bleibt wieder dort, wo er hingehört.');
    return;
  }
  if (!F.sturmBegonnen) {
    await say('joel', 'Der Bootsboden ist trocken. Noch.');
    return;
  }
  if (F.sturmWasserGeschoepft) {
    await say('joel', 'Ich schöpfe weiter, aber jede Welle bringt neues Wasser. Mit einem Eimer besiegt man keinen See.');
    return;
  }
  await say('joel', '(Eimer füllen, über Bord. Eimer füllen, über Bord. Meine Arme brennen, doch der Wasserspiegel sinkt ein wenig.)');
  F.sturmWasserGeschoepft = true;
  await say('juenger', 'Gut! Wir kommen wieder durch das Boot. Jetzt zu Jesus – schnell!');
}

async function redeSturmSimon() {
  if (F.sturmGestillt) {
    await say('simon', 'Ich kenne diesen See, Joel. Seine Winde, seine Strömungen, seine Tiefen. Aber so gehorchen habe ich ihn noch nie gesehen.');
    return;
  }
  if (!F.sturmSegelGesichert && !F.sturmWasserGeschoepft) {
    await say('simon', 'Das Segel und das Wasser, Joel! Sonst erreichen wir nicht einmal das Heck.');
    return;
  }
  if (!F.sturmSegelGesichert) {
    await say('simon', 'Das Wasser ist niedriger, aber das Segel reißt uns den Mast aus dem Boot. Sichere es!');
    return;
  }
  if (!F.sturmWasserGeschoepft) {
    await say('simon', 'Das Segel hält. Jetzt schöpfe Wasser, damit wir zu Jesus gelangen können!');
    return;
  }
  if (F.sturmJuengerBereit) return;
  F.sturmJuengerBereit = true;
  await say('simon', 'Kommt! Der Sturm ist stärker als alles, was wir tun können. Wir wecken den Meister.');
  await sturmStillungCutscene();
}

async function sturmStillungCutscene() {
  await walkPlayerTo(630, 438);
  await say('simon', 'Meister, Meister, wir gehen zugrunde!');
  await say('erzaehler', 'Jesus stand auf und bedrohte den Wind und die Wellen. Da legten sie sich, und es trat Stille ein. (Lukas 8,24)');
  await animate(1800, p => { fx.sturm = 1 - p; });
  F.sturmGestillt = true;
  await wait(700);
  await say('jesus', 'Wo ist euer Glaube?');
  await say('erzaehler', 'Voll Furcht und Staunen sagten sie zueinander: (Lukas 8,25)');
  await say('juenger', 'Wer ist dieser? Er gebietet sogar den Winden und dem Wasser, und sie gehorchen ihm!');
  await say('levi', 'Vor einem Augenblick konnte ich mein eigenes Schreien nicht hören. Jetzt höre ich jeden Tropfen vom Segel fallen.');
  await say('joel', '(Wir hatten gegen Wasser und Wind gekämpft. Er sprach – und beide hörten besser auf ihn als wir.)');
  F.ended = true;
  await animate(1800, p => { fx.fade = p; });
  const debugPanel = document.getElementById('debug');
  if (debugPanel) debugPanel.classList.add('hidden');
  document.getElementById('ending').classList.remove('hidden');
}

/* ============================================================
   DIALOGE
   ============================================================ */

async function talkSchimonTag() {
  await say('joel', 'Schimon?');
  await say('schimon', 'Wenn du Zeit zum Reden hast, hast du Zeit zum Arbeiten.');
  let done = false;
  while (!done) {
    const c = await choose([
      'Was ist noch zu tun?',
      'Warum schlafen wir eigentlich draußen bei der Herde?',
      'Erzähl mir was von früher.',
      'Schon gut, ich geh ja schon.',
    ]);
    if (c === 0) {
      if (!F.traenkeVoll && !F.floeteGiven) await say('schimon', 'Die Tränke füllen! Der Bach ist da drüben, ein Eimer steht bei der Feuerstelle. Und beruhige Levi, der jammert mir die Ohren voll.');
      else if (!F.traenkeVoll) await say('schimon', 'Die Tränke, Junge! Zwanzig durstige Schafe warten nicht ewig.');
      else if (!F.floeteGiven) await say('schimon', 'Die Herde ist versorgt. Bleibt nur noch Levis Gejammer. Find diese Flöte, bevor ich sie suchen muss.');
      else await say('schimon', 'Nichts mehr. Gleich wird durchgezählt.');
    } else if (c === 1) {
      await say('schimon', 'Volkszählung, Junge. Bethlehem platzt aus allen Nähten – jedes Bett ist dreifach belegt.');
      await say('schimon', 'Außerdem: Die Lämmer für den Tempel brauchen uns Tag UND Nacht. Und Schafe zahlen keine Miete.');
    } else if (c === 2) {
      await say('schimon', 'Wusstest du, dass König David genau hier Schafe gehütet hat?');
      await say('joel', 'Ja, Schimon. Du erzählst es jedem. Jeden Tag.');
      await say('schimon', 'Und heute Abend erzähle ich es WIEDER. Vorfreude ist auch ein Geschenk.');
    } else {
      await say('schimon', 'Braver Junge. Die Sonne wartet nicht.');
      done = true;
    }
  }
}

async function talkLeviTag() {
  if (F.floeteGiven) {
    await say('levi', '♪ Fidel-di-düü... düdel... QUIIIETSCH ♪');
    await say('joel', 'Wunderbar, Levi. Die Herde rückt schon ganz eng zusammen.');
    await say('levi', 'Aus BEGEISTERUNG, Joel. Aus Begeisterung.');
    return;
  }
  await say('levi', 'Joel! Meine Flöte! Sie ist WEG! Einfach weg!');
  let done = false;
  while (!done) {
    const c = await choose([
      'Wo hast du sie zuletzt gehabt?',
      'Wozu brauchst du überhaupt eine Flöte?',
      'Vielleicht hat sie ein Schaf gefressen.',
      'Ich halte die Augen offen.',
    ]);
    if (c === 0) {
      await say('levi', 'Drüben bei den Felsen! Ich habe nur KURZ nach einem Adler geschaut, und zack – weg war sie.');
      await say('joel', 'Bei den Felsen also. Dann schaue ich da mal genauer hin.');
    } else if (c === 1) {
      await say('levi', 'Die Schafe LIEBEN meine Musik! Sie beruhigt die Herde!');
      await say('joel', 'Die Schafe stellen sich taub, Levi.');
      await say('levi', 'Das ist ihre Art zu genießen.');
    } else if (c === 2) {
      await say('levi', 'WAS?! Meinst du... welches denn? Das mit dem frechen Blick?');
      await say('joel', 'Levi. Das war ein Scherz. Schafe fressen keine Flöten.');
      await say('levi', 'Sag das nicht. Die sind zu allem fähig, wenn keiner hinschaut.');
    } else {
      await say('levi', 'Danke, Joel! Ohne Flöte überstehe ich die Nachtwache NICHT.');
      done = true;
    }
  }
}

async function talkSchimon() {
  if (!F.fireLit) {
    await say('schimon', 'Zzz... nein... nicht die Ziegen zählen... die SCHAFE...');
    await say('joel', 'Tief und fest. Den weckt höchstens ein anständiges Feuer wieder auf.');
    return;
  }
  if (F.angelDone) {
    await say('schimon', 'Worauf wartest du noch, Junge? Nach Bethlehem! Der Weg ist rechts!');
    return;
  }
  await say('joel', 'Schimon?');
  await say('schimon', 'Was denn NOCH? Die Nacht ist zum Wachen da, nicht zum Plaudern.');
  let done = false;
  while (!done) {
    const c = await choose([
      'Schöne Nacht, oder?',
      'Sind wirklich alle Schafe da?',
      'Erzähl mir was von früher.',
      'Schon gut, ich lass dich in Ruhe.',
    ]);
    if (c === 0) {
      await say('schimon', 'Schön? Kalt ist sie. Und still. Zu still, wenn du mich fragst.');
      await say('joel', 'Ich habe dich gefragt, ob sie schön ist.');
      await say('schimon', 'Und ich habe geantwortet. Gewöhn dich dran.');
    } else if (c === 1) {
      if (F.lambSaved) {
        await say('schimon', 'Zwanzig. Jetzt stimmt die Zahl wieder. Gut gemacht, Junge.');
      } else {
        await say('schimon', 'Neunzehn. NEUNZEHN! Eines fehlt. Ich höre es drüben bei den Felsen blöken.');
        await say('joel', 'Bei den Felsen also. Da komme ich mit bloßen Händen nicht ran...');
      }
    } else if (c === 2) {
      await say('schimon', 'Wusstest du, dass König David genau hier Schafe gehütet hat?');
      await say('joel', 'Ja. Du erzählst es jedem. Jede Nacht. Seit Jahren.');
      await say('schimon', 'Weil es eine GUTE Geschichte ist!');
    } else {
      await say('schimon', 'Endlich. Und schür das Feuer, bevor es wieder eingeht.');
      done = true;
    }
  }
}

async function talkLevi() {
  if (F.angelDone) {
    await say('levi', 'Ein Engel, Joel! Ein ECHTER Engel! Und ich habe „AAAH“ geschrien...');
    await say('joel', 'Hat bestimmt keiner gemerkt.');
    await say('levi', 'Lass uns nach Bethlehem gehen, bevor ich noch mal schreien muss.');
    return;
  }
  await say('joel', 'He, Levi.');
  await say('levi', 'Joel! Schleich dich nicht so an. Ich dachte, du wärst ein Wolf.');
  await say('joel', 'Wölfe sagen selten „He, Levi“.');
  let done = false;
  while (!done) {
    const c = await choose([
      'Alles ruhig bei der Herde?',
      'Was erzählt man sich Neues im Dorf?',
      'Schon mal überlegt, Pirat zu werden?',
      'Bis später.',
    ]);
    if (c === 0) {
      if (F.lambSaved) {
        await say('levi', 'Jetzt schon. Seit du das Lamm aus den Felsen geholt hast, ist es herrlich still.');
      } else {
        await say('levi', 'Fast. Eines blökt die ganze Zeit, drüben bei den Felsen. Ich finde es nicht.');
        await say('levi', 'Es klingt, als ob es irgendwo FESTSTECKT.');
      }
    } else if (c === 1) {
      await say('levi', 'Merkwürdige Dinge! Dem alten Priester Zacharias ist im Tempel ein Engel erschienen. Jetzt ist er stumm.');
      await say('levi', 'Und aus Nazaret heißt es, ein Mädchen namens Maria erwarte ein Kind... vom Heiligen Geist, sagt man.');
      await say('joel', 'Und die Schriften sagen: Aus Bethlehem soll der Retter kommen. Aus UNSEREM Kaff.');
      await say('levi', 'Stell dir vor, das passiert ausgerechnet in unserer Schicht. Haha. Niemals.');
    } else if (c === 2) {
      await say('levi', 'Pirat? Hier gibt es kein Meer, Joel.');
      await say('joel', 'Details.');
      await say('levi', 'Und auf einem Schaf segelt es sich miserabel. Glaub mir. Ich habe es versucht.');
    } else {
      await say('levi', 'Bis später. Und pass auf die Felsen auf!');
      done = true;
    }
  }
}

async function talkWaechter() {
  if (F.foundStable) {
    await say('waechter', 'Noch da? Die Gasse rechts, den Hang hinunter. Und weckt mir die Stadt nicht auf!');
    return;
  }
  if (!F.metWaechter) {
    F.metWaechter = true;
    await say('waechter', 'Halt! Wer streunt da nachts durch die... ach. Hirten.');
    await say('joel', 'Wie kommen eigentlich alle IMMER sofort darauf?');
    await say('waechter', 'Der Geruch.');
  }
  let done = false;
  while (!done) {
    const c = await choose([
      'Wir suchen ein neugeborenes Kind. In einer Krippe.',
      'Ruhige Nacht heute?',
      'Habt Ihr den Stern gesehen?',
      'Gute Nacht, Wächter.',
    ]);
    if (c === 0) {
      await say('waechter', 'Eine KRIPPE? Junge, in den Herbergen stapeln sich die Leute bis unters Dach. Da bekommt keiner eine Krippe.');
      await say('waechter', 'Aber... wartet. Heute Abend kam ein Paar aus Nazaret an. Die Frau hochschwanger, auf einem Esel.');
      await say('waechter', 'Der Wirt der großen Herberge da hat sie abgewiesen. Fragt IHN, wohin er sie geschickt hat.');
      F.knowsCouple = true;
      await say('joel', 'Ein Paar aus Nazaret... Danke, Wächter!');
    } else if (c === 1) {
      await say('waechter', 'Ruhig?! Die Stadt platzt wegen der Volkszählung. Ich habe heute DREI Schlägereien um EIN Strohlager geschlichtet.');
      await say('joel', 'Wer hat gewonnen?');
      await say('waechter', 'Das Stroh.');
    } else if (c === 2) {
      await say('waechter', 'Den kann man schlecht übersehen. Er steht genau über dem Hang hinter der Herberge.');
      await say('waechter', 'Sehr ordnungswidrig, wenn Ihr mich fragt. Sterne haben zu WANDERN.');
    } else {
      await say('waechter', 'Gute Nacht. Und keine Schafe in der Stadt!');
      done = true;
    }
  }
}

async function talkWirt() {
  if (F.foundStable) {
    await say('wirt', 'Die Gasse rechts, den Hang runter, alter Stall. Und jetzt: GUTE NACHT!');
    return;
  }
  let done = false;
  while (!done) {
    const opts = [];
    opts.push(['Wir suchen ein neugeborenes Kind.', async () => {
      await say('wirt', 'In MEINEM Haus wird nachts geschlafen und nicht geboren! Sonst noch was?');
      await say('joel', '(Charmant wie eine Distel im Sandalenriemen.)');
    }]);
    if (F.knowsCouple) opts.push(['Der Wächter sagt, Ihr habt heute ein Paar aus Nazaret abgewiesen.', async () => {
      await say('wirt', 'Abgewiesen?! ABGEWIESEN?! Ich hatte KEINEN PLATZ mehr! Nicht mal im Flur! Nicht mal auf dem Dach!');
      await say('wirt', 'Aber ich bin ja kein Unmensch. Ich habe sie zum alten Stall am Hang geschickt. Hinter dem Haus, die Gasse rechts runter.');
      await say('joel', 'Ein Stall... mit einer Krippe! DAS ist es! Danke, Wirt!');
      await say('wirt', 'Ja, ja. Und jetzt lasst anständige Leute schlafen!');
      F.foundStable = true;
      done = true;
    }]);
    opts.push(['Ein Engel hat uns geschickt!', async () => {
      await say('wirt', 'Und mich hat ein sechzehn Stunden langer Arbeitstag geschickt. Der gewinnt.');
    }]);
    opts.push(['Schon gut. Gute Nacht.', async () => {
      await say('wirt', 'Endlich ein vernünftiger Satz.');
      done = true;
    }]);
    const c = await choose(opts.map(o => o[0]));
    await opts[c][1]();
  }
}

async function talkMaria() {
  await say('maria', 'Seid gegrüßt. Kommt nur näher, er schläft gerade.');
  let done = false;
  while (!done) {
    const c = await choose([
      'Wer seid ihr?',
      'Ein Engel hat uns von dem Kind erzählt!',
      'Warum ausgerechnet ein Stall?',
      'Wir wollen nicht länger stören.',
    ]);
    if (c === 0) {
      await say('maria', 'Ich bin Maria, das ist Josef. Wir kommen aus Nazaret – wegen der Steuerlisten des Kaisers musste jeder in seine Vaterstadt.');
      await say('joel', 'Den ganzen Weg aus Galiläa? Kurz vor der Geburt?');
      await say('maria', 'Es war... eine lange Reise.');
    } else if (c === 1) {
      await say('joel', 'Ein Engel stand auf unserem Feld! Er sagte: Euch ist heute der Retter geboren!');
      await say('maria', 'Ein Engel... ja. Mir hat einer gesagt: Er wird Sohn des Höchsten genannt werden.');
      await say('maria', 'Und nun erzählt ihr dasselbe. Gott vergisst nichts von dem, was er verspricht.');
    } else if (c === 2) {
      await say('maria', 'In der Herberge war kein Platz für uns. Aber hier ist es warm, und die Tiere sind freundlich.');
      await say('ochse', 'Muh.');
      await say('maria', 'Siehst du?');
    } else {
      await say('maria', 'Ihr stört nicht. Wer einen Engel gesehen hat, darf gerne bleiben.');
      done = true;
    }
  }
}

async function talkJosef() {
  await say('josef', 'Willkommen, Hirten. Vorsicht mit dem Balken da, der hängt etwas tief.');
  const c = await choose([
    'Wie war die Reise aus Nazaret?',
    'Schöner Stall. Sehr... rustikal.',
    'Danke, das war alles.',
  ]);
  if (c === 0) {
    await say('josef', 'Vier Tage Fußmarsch, eine hochschwangere Frau, ein störrischer Esel. Frag lieber nicht.');
    await say('joel', 'Ich hüte nachts Schafe. Ich verstehe Leid.');
    await say('josef', 'Nein. Nein, das tust du nicht.');
  } else if (c === 1) {
    await say('josef', 'Ich bin Zimmermann. Glaub mir: Diese Krippe war deutlich wackliger, bevor ich sie mir vorgenommen habe.');
    await say('joel', 'Erst die Krippe reparieren, dann das Kind hineinlegen. Solide Reihenfolge.');
  } else {
    await say('josef', 'Geht nur. Und... danke, dass ihr gekommen seid.');
  }
}

async function talkRahel() {
  if (F.toldRahel) {
    await say('rahel', 'Ein Engel! Bei HIRTEN! Das erzähle ich heute noch meiner Schwester. Und ihrer Schwägerin. Und dem ganzen Brunnenviertel.');
    await say('joel', '(Die Nachricht ist bei ihr in guten, sehr schnellen Händen.)');
    return;
  }
  await say('rahel', 'Ich bin Rahel. Josef und Maria wohnen gleich da oben – aber aus den beiden bekommt man ja kein Wort heraus über damals!');
  await say('rahel', 'Du warst DABEI, in jener Nacht. Also raus damit: Was hat der Engel zu euch gesagt?');
  const c = await choose([
    '„Schöne Nacht heute, werte Hirten.“',
    '„Fürchtet euch nicht! Euch ist heute der Retter geboren – Christus, der Herr.“',
    '„Folgt dem Stern bis zur nächsten freien Herberge.“',
  ]);
  if (c === 1) {
    await say('rahel', 'Der Retter... Christus, der Herr. Und das sagt er HIRTEN. Nicht dem Hohen Rat, nicht dem Kaiser – Hirten!');
    await say('joel', 'Glaub mir, das hat uns auch gewundert. Levi hat geschrien wie ein Lamm im Dornbusch.');
  } else {
    await say('joel', 'Moment... nein. So fängt höchstens Levi ein Gespräch an. Der Engel sagte: „Fürchtet euch nicht! Euch ist heute der Retter geboren – Christus, der Herr.“ (Lukas 2,10-11)');
    await say('rahel', 'DAS klingt schon eher nach einem Engel.');
  }
  await say('rahel', 'Und Maria hat all das gewusst, schon vorher... Sie bewahrt diese Dinge in ihrem Herzen, sagt sie immer.');
  F.toldRahel = true;
  await checkHeimkehr();
}

async function talkEli() {
  if (F.toldEli) {
    await say('eli', 'Eine Krippe. Hm. Ich denke immer noch darüber nach, Hirte.');
    return;
  }
  await say('eli', 'Eli. Ich pflüge das Feld da drüben. Und ich glaube grundsätzlich NICHTS, was am Brunnen erzählt wird.');
  await say('eli', 'Ein neugeborener KÖNIG, heißt es. Schön. Und wo lag er? In einem Palast, nehme ich an? Auf Purpur und Seide?');
  const c = await choose([
    'Im Obergemach der größten Herberge Bethlehems.',
    'Auf einem Thron aus Gold, was sonst.',
    'In einer Futterkrippe, in Windeln gewickelt.',
  ]);
  if (c === 2) {
    await say('eli', 'Eine KRIPPE?! ...');
    await say('eli', 'Hm. Ausgerechnet eine Krippe. Weißt du, Hirte – SO fängt kein Schwindel an. Schwindler erfinden Paläste.');
    await say('joel', 'Das Zeichen des Engels war genau das: Ihr werdet ein Kind finden, in Windeln gewickelt und in einer Krippe liegend. (Lukas 2,12)');
  } else {
    await say('eli', 'HA! Siehst du! Geschwätz, wie ich...');
    await say('joel', 'Nein, warte. Es war eine FUTTERKRIPPE, in einem Stall am Hang. Ich stand selbst davor. In der Herberge war kein Platz. (Lukas 2,7)');
    await say('eli', 'Eine Krippe... Hm. Ausgerechnet. So fängt kein Schwindel an. Schwindler erfinden Paläste.');
  }
  await say('eli', 'Ich sage nicht, dass ich es glaube. Ich sage nur... ich denke darüber nach. Beim Pflügen denkt man viel.');
  F.toldEli = true;
  await checkHeimkehr();
}

async function talkMirjam() {
  if (F.toldMirjam) {
    await say('mirjam', '♪ EHRE SEI GOTT IN DER HÖÖÖHE ♪');
    await say('joel', '(Sie übt seit Stunden. Die Schafe haben sich ans andere Ende der Weide verzogen.)');
    return;
  }
  await say('mirjam', 'Ich bin Mirjam! Stimmt es, dass du die Engel gehört hast? RICHTIGE Engel? Ganz viele?');
  await say('joel', 'Eine ganze himmlische Heerschar. Der Himmel war voll von ihnen.');
  await say('mirjam', 'Und was haben sie GESUNGEN? Sag es genau! GANZ genau!');
  const c = await choose([
    '„Ehre sei Gott in der Höhe und Friede auf Erden bei den Menschen seines Wohlgefallens!“',
    'Ein Hirtenlied über zwanzig Schafe.',
    'Gesungen? Sie haben eher... gebrummt.',
  ]);
  if (c === 0) {
    await say('mirjam', '♪ Ehre sei Gott in der Höhe... ♪ – so ungefähr?');
    await say('joel', 'So ungefähr. Nur... größer. Als würde der Himmel selbst singen.');
  } else {
    await say('mirjam', 'Das glaube ich dir NICHT. Engel brummen nicht!');
    await say('joel', 'Erwischt. Sie sangen: „Ehre sei Gott in der Höhe und Friede auf Erden bei den Menschen seines Wohlgefallens!“ (Lukas 2,14)');
    await say('mirjam', 'DAS ist schöner. Das übe ich!');
  }
  await say('mirjam', 'Wenn ich groß bin, will ich auch mal einen Engel sehen. Oder wenigstens ein Schaf, das spricht.');
  await say('joel', 'Bleib bei den Engeln. Schafe sagen immer nur dasselbe.');
  F.toldMirjam = true;
  await checkHeimkehr();
}

async function talkMariaReise() {
  if (F.abendDone) {
    await say('maria', 'Schlaf gut, Joel. Und grüße mir Bethlehem.');
    return;
  }
  await say('maria', 'Er hat die ganze Wüste verschlafen. Sechs Tage Sand und Sonne – und er träumt einfach.');
  let done = false;
  while (!done) {
    const c = await choose([
      'Wie geht es dem Kind?',
      'Hast du Angst? Ägypten ist die Fremde.',
      'Was kann ich noch tun?',
      'Ich lasse euch ausruhen.',
    ]);
    if (c === 0) {
      await say('maria', 'Gut. Er ist ein geduldiger Reisender – geduldiger als der Esel jedenfalls.');
      await say('esel', 'Iaah!');
      await say('maria', 'Er hat es gehört.');
    } else if (c === 1) {
      await say('maria', 'Angst? Ein wenig. Aber unser Volk war schon einmal in Ägypten – und Gott hat es heimgeführt.');
      await say('maria', 'Wenn alles vorbei ist, führt er auch uns wieder heim. Da bin ich ganz sicher.');
    } else if (c === 2) {
      if (!F.eselWasser && !F.dattelnGiven) await say('maria', 'Der Esel braucht Wasser, und Josef wünscht sich Datteln von der Palme. Mehr brauchen wir heute nicht.');
      else if (!F.eselWasser) await say('maria', 'Nur noch der Esel. Er schaut schon ganz sehnsüchtig zur Quelle.');
      else if (!F.dattelnGiven) await say('maria', 'Die Datteln an der Palme – mit deinem Hirtenstab kommst du bestimmt heran.');
      else await say('maria', 'Nichts mehr. Setz dich gleich zu uns ans Feuer.');
    } else {
      await say('maria', 'Du störst nicht, Joel. Aber ruh dich auch selbst aus.');
      done = true;
    }
  }
}

async function talkJosefReise() {
  if (F.abendDone) {
    await say('josef', 'Danke für alles, Joel. Ohne dich stünden wir noch in Bethlehem vor einem Soldaten.');
    return;
  }
  const c = await choose([
    'Wie lange bleibt ihr in Ägypten?',
    'Woher weißt du so viel über die Pyramiden?',
    'Ich kümmere mich ums Lager.',
  ]);
  if (c === 0) {
    await say('josef', 'Bis der Engel wieder spricht. Er sagte: Bleib dort, bis ich es dir sage. (Matthäus 2,13)');
    await say('josef', 'Ein Zimmermann findet überall Arbeit. Und in Ägypten leben viele aus unserem Volk – seit Alters her.');
  } else if (c === 1) {
    await say('josef', 'Karawanenleute erzählen gern – und ein Zimmermann hört gern zu, wenn es um große Bauwerke geht.');
    await say('josef', 'Auch wenn ich sagen muss: KEIN einziger Balken ist da verbaut. Reine Steinmetzerei.');
    await say('joel', 'Skandalös.');
  } else {
    await say('josef', 'Danke, Joel. Wasser für den Esel, Datteln für den Weg – dann ist der Abend unser.');
  }
}

/* ============================================================
   RÄUME & HOTSPOTS
   ============================================================ */

const rooms = {
  feldtag: {
    hotspots: [
      {
        id: 'traenke', name: 'Tränke', rect: [484, 478, 88, 30], walk: [528, 520],
        look: async () => {
          if (F.traenkeVoll) await say('joel', 'Die Tränke ist voll. Die Schafe drängeln sich schon davor wie Marktweiber am Brotstand.');
          else await say('joel', 'Die Holztränke der Herde. Staubtrocken. Da drin könnte man Mehl lagern.');
        },
        use: async () => {
          if (F.traenkeVoll) await say('joel', 'Voller geht nicht.');
          else await say('joel', 'Ohne Wasser bleibt das eine sehr leere Geste. Ich brauche einen Eimer.');
        },
        useItem: async it => {
          if (it === 'eimer') {
            if (!F.eimerVoll) await say('joel', 'Der Eimer ist leer. Ich sollte ihn erst am Bach füllen.');
            else if (F.traenkeVoll) await say('joel', 'Voller geht nicht.');
            else {
              F.eimerVoll = false;
              F.traenkeVoll = true;
              F.tookEimer = false;
              removeItem('eimer');
              await say('joel', 'Ich gieße das Wasser in die Tränke... und noch ein Eimer... und noch einer...');
              await say('schaf', 'Mäh! Mäh!');
              await say('joel', 'Ein paar Eimer später: Die Tränke ist voll, und ich bin der Held der Herde. Den Eimer stelle ich zurück.');
              await checkAbendrot();
            }
          } else await say('joel', 'Das gehört nicht in die Tränke.');
        },
      },
      {
        id: 'bach', name: 'Bach', rect: [0, 460, 135, 80], walk: [150, 510],
        look: async () => { await say('joel', 'Ein schmaler Bach, kühl von den Hügeln. Das Beste an dieser Weide – sagen die Schafe. Vermutlich.'); },
        use: async () => { await say('joel', 'Ich trinke einen Schluck. Ahh. Besser als jeder Wein. Sage ich, der noch nie Wein hatte.'); },
        useItem: async it => {
          if (it === 'eimer') {
            if (F.eimerVoll) await say('joel', 'Der Eimer ist schon voll.');
            else { F.eimerVoll = true; await say('joel', 'Ich halte den Eimer in den Bach... blubb, blubb... voll!'); }
          } else await say('joel', 'Das will ich nicht nass machen.');
        },
      },
      {
        id: 'eimer_hs', name: 'Eimer', rect: [312, 454, 36, 32], walk: [352, 508],
        visible: () => !F.tookEimer,
        look: async () => { await say('joel', 'Unser Holzeimer steht bei der Feuerstelle. Treuer Geselle für alles, was schwappt.'); },
        take: async () => {
          F.tookEimer = true;
          addItem('eimer');
          await say('joel', 'Den Eimer nehme ich. Leer wiegt er ja fast nichts.');
        },
      },
      {
        id: 'feuerstelle_tag', name: 'Feuerstelle', rect: [352, 460, 62, 32], walk: [400, 510],
        look: async () => { await say('joel', 'Die Feuerstelle für die Nacht. Noch kalt. Heute Abend sitzt Schimon wieder davor und „überwacht“.'); },
        use: async () => { await say('joel', 'Noch ist es hell genug. Feuer kommt später – die Nacht ist lang genug dafür.'); },
      },
      {
        id: 'floete_felsen', name: 'Etwas zwischen den Felsen', rect: [816, 458, 36, 22], walk: [768, 505],
        visible: () => !F.tookFloete,
        look: async () => { await say('joel', 'Zwischen den Felsen klemmt etwas Dünnes, Helles... Moment. Das ist ja Levis Flöte!'); },
        take: async () => {
          F.tookFloete = true;
          addItem('floete');
          await say('joel', 'Ich zwänge den Arm in den Spalt... etwas tiefer... HAB sie!');
          await say('joel', '(Der Spalt ist tückisch tief. Wehe, da gerät mal ein Lamm hinein – das kriegt man mit bloßen Händen NIE wieder raus.)');
        },
      },
      {
        id: 'felsen_tag', name: 'Felsen', rect: [778, 438, 116, 74], walk: [768, 505],
        look: async () => {
          if (F.tookFloete) await say('joel', 'Große Felsbrocken mit einem tiefen Spalt dazwischen. Da fällt gern mal etwas hinein.');
          else await say('joel', 'Große Felsbrocken. Levi hat hier nach seinem Adler gestarrt... vielleicht liegt die Flöte noch da.');
        },
        take: async () => { await say('joel', 'Zu schwer. Und mein Felsensammelalbum ist immer noch voll.'); },
      },
      {
        id: 'schimon_tag', name: 'Schimon', rect: [272, 384, 46, 106], walk: [338, 505],
        look: async () => { await say('joel', 'Schimon mustert die Herde wie ein Feldherr seine Truppen. Die Truppen kauen Gras.'); },
        talk: talkSchimonTag,
      },
      {
        id: 'levi_tag', name: 'Levi', rect: [444, 396, 48, 88], walk: [428, 502],
        look: async () => { await say('joel', 'Levi sucht zum zwölften Mal in denselben drei Grasbüscheln nach seiner Flöte.'); },
        talk: talkLeviTag,
        giveItem: async it => {
          if (it === 'floete') {
            removeItem('floete');
            F.floeteGiven = true;
            await say('joel', 'Sieh mal, was zwischen den Felsen geklemmt hat.');
            await say('levi', 'MEINE FLÖTE! Joel! Du bist der beste Hirte ALLER Zeiten!');
            await say('levi', 'Ich spiele dir was! ♪ Fidel-di-düü... QUIIIETSCH ♪');
            await say('schaf', 'Määh...');
            await say('joel', '(Sogar die Schafe haben eine Meinung dazu.)');
            await checkAbendrot();
          } else await say('levi', 'Danke, aber... behalte das mal lieber.');
        },
      },
      {
        id: 'schafe_tag', name: 'Schafe', rect: [556, 436, 180, 90], walk: [600, 520],
        look: async () => {
          if (F.traenkeVoll) await say('joel', 'Zwanzig Schafe, frisch getränkt und bestens gelaunt. So gut sieht die Herde selten aus.');
          else await say('joel', 'Zwanzig Schafe. Sie starren abwechselnd mich und die leere Tränke an. Sehr subtil.');
        },
        talk: async () => {
          await say('schaf', F.traenkeVoll ? 'Mäh!' : 'Määäh...');
          await say('joel', F.traenkeVoll ? 'Gern geschehen.' : 'Ja, ja. Das Wasser kommt ja schon.');
        },
        take: async () => { await say('joel', 'Ein ganzes Schaf passt nicht in meine Tasche. Glaub mir, ich habe es als Kind versucht.'); },
      },
      {
        id: 'baum_tag', name: 'Olivenbaum', rect: [56, 296, 130, 150], walk: [152, 498],
        look: async () => { await say('joel', 'Unser alter Olivenbaum. Der einzige Schatten weit und breit – und damit der beliebteste Ort der ganzen Weide.'); },
        take: async () => { await say('joel', 'Er hat Wurzeln. Tiefe. Das ist quasi sein ganzes Konzept.'); },
      },
      {
        id: 'schild_tag', name: 'Schild', rect: [840, 408, 64, 52], walk: [870, 495],
        look: async () => { await say('joel', '„Bethlehem – Stadt Davids. Brotsorten: 12. Einwohner: zu viele wegen der Volkszählung.“'); },
      },
      {
        id: 'weg_tag', name: 'Weg nach Bethlehem', rect: [896, 416, 64, 116], walk: [900, 472],
        goto: async () => { await say('joel', 'In die Stadt? Jetzt? Die Herde lässt man nicht allein – und Schimon mich erst recht nicht.'); },
        look: async () => { await say('joel', 'Der Weg führt hinüber nach Bethlehem. Heute war den ganzen Tag Gedränge darauf – die Volkszählung treibt alle in die Stadt.'); },
      },
      {
        id: 'sonne_tag', name: 'Sonne', rect: [115, 60, 95, 95], noWalk: true,
        look: async () => { await say('joel', 'Die Sonne steht schon tief über den Hügeln. Nicht mehr lange, dann beginnt die Nachtwache.'); },
        take: async () => { await say('joel', 'Träum weiter, Joel.'); },
      },
      {
        id: 'stadt_tag', name: 'Bethlehem', rect: [724, 318, 200, 80], noWalk: true,
        look: async () => { await say('joel', 'Bethlehem im Abendlicht. Von hier sieht man, wie voll die Gassen sind. Ameisenhaufen sind besser organisiert.'); },
      },
    ],
  },

  field: {
    hotspots: [
      {
        id: 'lamm', name: 'Lamm', rect: [820, 446, 36, 32], walk: [772, 502],
        visible: () => !F.lambSaved,
        look: async () => {
          await say('joel', 'Das fehlende Lamm! Es ist zwischen die Felsen gerutscht und steckt fest.');
          await say('lamm', 'Määäh!');
        },
        take: async () => {
          await say('joel', 'Ich ziehe... und ziehe... nichts. Es steckt zu tief zwischen den Felsen.');
          await say('joel', 'Ich bräuchte etwas Langes mit einem Haken dran. Hmm.');
        },
        talk: async () => {
          await say('joel', 'Ganz ruhig, Kleines. Ich hole dich da raus.');
          await say('lamm', 'Mäh?');
        },
        useItem: async it => {
          if (it === 'stab') await rescueLamb();
          else await say('joel', 'Damit mache ich es nur noch nervöser.');
        },
      },
      {
        id: 'schild', name: 'Schild', rect: [840, 408, 64, 52], walk: [870, 495],
        look: async () => { await say('joel', '„Bethlehem – Stadt Davids. Brotsorten: 12. Einwohner: zu viele wegen der Volkszählung.“'); },
      },
      {
        id: 'stab', name: 'Hirtenstab', rect: [142, 382, 30, 66], walk: [172, 498],
        visible: () => !F.tookStaff,
        look: async () => { await say('joel', 'Mein Hirtenstab lehnt am Olivenbaum. Mit dem Haken dran kriegt man fast alles zu fassen.'); },
        take: async () => {
          F.tookStaff = true;
          addItem('stab');
          await say('joel', 'Den nehme ich. Ein Hirte ohne Stab ist wie ein Pirat ohne Schiff.');
        },
      },
      {
        id: 'reisig', name: 'Reisig', rect: [178, 488, 56, 30], walk: [212, 518],
        visible: () => !F.tookWood,
        look: async () => { await say('joel', 'Ein Haufen trockener Zweige. Brennt bestimmt wie Zunder.'); },
        take: async () => {
          F.tookWood = true;
          addItem('holz');
          await say('joel', 'Schön trocken. Das Feuer wird sich freuen.');
        },
      },
      {
        id: 'feuer', name: 'Lagerfeuer', rect: [338, 436, 84, 54], walk: [398, 510],
        look: async () => {
          if (F.fireLit) await say('joel', 'Jetzt brennt es wieder ordentlich. Gemütlich.');
          else await say('joel', 'Nur noch ein Häufchen Glut. Wenn ich nichts nachlege, geht es ganz aus.');
        },
        use: async () => {
          if (F.fireLit) await say('joel', 'Es brennt schon. Ich bin gut, aber Feuer kann ich nicht doppelt anzünden.');
          else await say('joel', 'Mit bloßen Händen in der Glut stochern? Lieber nicht. Ich bräuchte Brennholz.');
        },
        useItem: async it => {
          if (it === 'holz') { if (!F.fireLit) await lightFire(); else await say('joel', 'Es brennt doch schon.'); }
          else if (it === 'lamm') await say('joel', 'WAS?! Nein! Ganz sicher nicht!');
          else if (it === 'stab') await say('joel', 'Und womit angle ich dann Lämmer? Nein.');
        },
        take: async () => { await say('joel', 'Autsch. Nein.'); },
      },
      {
        id: 'schimon', name: 'Schimon', rect: [270, 414, 52, 76], walk: [338, 505],
        look: async () => {
          if (F.fireLit) await say('joel', 'Schimon. Der älteste Hirte weit und breit. Brummig wie ein Bär, aber mit goldenem Herzen. Tief drin. SEHR tief.');
          else await say('joel', 'Schimon schläft im Sitzen. Das kann er. Vierzig Jahre Berufserfahrung.');
        },
        talk: talkSchimon,
        take: async () => { await say('joel', 'Der ist schwerer, als er aussieht. Und griesgrämiger.'); },
      },
      {
        id: 'levi', name: 'Levi', rect: [444, 396, 48, 88], walk: [428, 502],
        look: async () => { await say('joel', 'Levi. Mein bester Freund. Hat vor allem Angst – außer vor Schafen. Meistens.'); },
        talk: talkLevi,
      },
      {
        id: 'schafe', name: 'Schafe', rect: [556, 436, 180, 90], walk: [600, 520],
        look: async () => {
          if (F.lambSaved) await say('joel', 'Eins, zwei, drei... zwanzig. Alle da. Na ja – eines trage ich gerade auf dem Arm.');
          else await say('joel', 'Eins, zwei, drei... neunzehn. Schimon hat recht: Eines fehlt!');
        },
        talk: async () => {
          await say('schaf', 'Mäh.');
          await say('joel', 'Wie immer ein anregendes Gespräch.');
        },
        take: async () => { await say('joel', 'Ein ganzes Schaf passt nicht in meine Tasche. Glaub mir, ich habe es als Kind versucht.'); },
      },
      {
        id: 'felsen', name: 'Felsen', rect: [778, 438, 116, 74], walk: [768, 505],
        look: async () => {
          if (F.lambSaved) await say('joel', 'Nur noch Felsen. Lammfrei.');
          else { await say('joel', 'Ein paar große Felsbrocken... Moment. Da unten blökt doch was!'); }
        },
        useItem: async it => {
          if (it === 'stab' && !F.lambSaved) await rescueLamb();
          else await say('joel', 'Die Felsen bleiben davon unbeeindruckt.');
        },
        take: async () => { await say('joel', 'Zu schwer. Und wofür? Mein Felsensammelalbum ist voll.'); },
      },
      {
        id: 'weg', name: 'Weg nach Bethlehem', rect: [896, 416, 64, 116], walk: [900, 472],
        goto: async () => {
          if (F.angelDone) { await leaveField(); return; }
          await say('joel', 'Nach Bethlehem? Mitten in der Schicht? Schimon würde mich zum Schafescheren ans Tote Meer schicken.');
          if (!F.fireLit && !F.lambSaved) await say('joel', 'Erst muss das Feuer wieder brennen – und irgendwo blökt immer noch ein verlorenes Lamm.');
          else if (!F.fireLit) await say('joel', 'Erst muss das Feuer wieder brennen, sonst friert die ganze Truppe ein.');
          else if (!F.lambSaved) await say('joel', 'Erst muss ich das verlorene Lamm finden. Es blökt irgendwo drüben bei den Felsen.');
        },
        look: async () => { await say('joel', 'Der Weg führt hinüber nach Bethlehem. Man sieht die Lichter der Stadt auf dem Hügel.'); },
      },
      {
        id: 'baum', name: 'Olivenbaum', rect: [56, 296, 130, 150], walk: [152, 498],
        look: async () => { await say('joel', 'Ein uralter Olivenbaum. Schimon behauptet, er sei jünger als der Baum. Ich glaube es sofort.'); },
        take: async () => { await say('joel', 'Er hat Wurzeln. Tiefe. Das ist quasi sein ganzes Konzept.'); },
      },
      {
        id: 'stern', name: 'Stern', rect: [690, 40, 110, 110], noWalk: true,
        visible: () => F.starDone,
        look: async () => { await say('joel', 'Er steht genau über Bethlehem. Als würde der Himmel mit dem Finger zeigen.'); },
        take: async () => { await say('joel', 'Sehr witzig. Den kann nicht mal Schimon erreichen, und der ist eins achtzig.'); },
      },
      {
        id: 'mond', name: 'Mond', rect: [70, 48, 84, 84], noWalk: true,
        look: async () => { await say('joel', 'Der Mond. Zuverlässigster Kollege der Nachtschicht. Beschwert sich nie.'); },
        take: async () => { await say('joel', 'Ich kann ihn von hier aus nicht erreichen. Vermutlich besser so.'); },
      },
      {
        id: 'stadt', name: 'Bethlehem', rect: [724, 318, 200, 80], noWalk: true,
        look: async () => { await say('joel', 'Bethlehem. Wegen der Volkszählung platzt die Stadt aus allen Nähten.'); },
      },
    ],
  },

  weg: {
    // reine Zwischenszene – keine Interaktion
    hotspots: [],
  },

  city: {
    hotspots: [
      {
        id: 'katze', name: 'Katze', rect: [278, 430, 60, 32], walk: [360, 512],
        look: async () => { await say('joel', 'Eine Stadtkatze auf dem Brunnenrand. Sie hat das Selbstbewusstsein einer Königin und den Blick eines Steuereintreibers.'); },
        talk: async () => {
          await say('joel', 'Du weißt nicht zufällig, wo hier ein Kind in einer Krippe liegt?');
          await say('katze', 'Miau.');
          await say('joel', 'War einen Versuch wert.');
        },
        take: async () => { await say('joel', 'Sie hat Krallen. Und vermutlich einen Anwalt.'); },
      },
      {
        id: 'wirt', name: 'Wirt', rect: [488, 208, 84, 102], walk: [530, 508],
        visible: () => F.wirtOut,
        look: async () => { await say('joel', 'Der Wirt. Schlafmütze auf dem Kopf, Falten auf der Stirn. Beides redlich verdient.'); },
        talk: talkWirt,
      },
      {
        id: 'fensterladen', name: 'Fenster', rect: [488, 208, 84, 102], walk: [530, 508],
        visible: () => !F.wirtOut,
        look: async () => { await say('joel', 'Ein Fenster mit geschlossenen Läden, direkt über der Tür. Da drin schläft jemand. Noch.'); },
        use: async () => { await say('joel', 'Zu hoch. Aber die Tür ist ja direkt darunter...'); },
      },
      {
        id: 'wirtsschild', name: 'Wirtshausschild', rect: [436, 290, 132, 40], walk: [505, 508],
        look: async () => { await say('joel', '„Herberge zur Stadt Davids – Betten, Brot, kein Mitleid.“ Und darunter, frisch gepinselt: „BELEGT!“'); },
      },
      {
        id: 'tuer', name: 'Tür der Herberge', rect: [490, 344, 80, 126], walk: [530, 508],
        look: async () => { await say('joel', 'Eine massive Holztür. Auf dem Schild steht „BELEGT!“ – mit Ausrufezeichen. Der Wirt meint es ernst.'); },
        use: knockDoor,
        talk: async () => {
          await say('joel', 'Hallo? HALLO?');
          await knockDoor();
        },
        useItem: async it => {
          if (it === 'stab') { await say('joel', 'Mit dem Hirtenstab klopft es sich gleich viel amtlicher.'); await knockDoor(); }
          else if (it === 'lamm') await say('joel', 'Ich klopfe sicher nicht mit dem Lamm an. Es hat heute schon genug durchgemacht.');
          else await say('joel', 'Das hilft mir an dieser Tür nicht weiter.');
        },
      },
      {
        id: 'brunnen', name: 'Brunnen', rect: [256, 396, 88, 90], walk: [350, 514],
        look: async () => { await say('joel', 'Der Stadtbrunnen. Tagsüber Umschlagplatz für Wasser und Gerüchte. Nachts nur für Katzen.'); },
        use: async () => { await say('joel', 'Ich habe keinen Durst. Und die Katze schaut, als wäre der Brunnen ihrer.'); },
        take: async () => { await say('joel', 'Klar. Ich stecke mir einfach einen Brunnen ein.'); },
      },
      {
        id: 'waechter', name: 'Nachtwächter', rect: [694, 400, 60, 110], walk: [660, 510],
        look: async () => { await say('joel', 'Der Nachtwächter von Bethlehem. Speer, Laterne und der Blick eines Mannes, der diese Nacht nicht ausgesucht hat.'); },
        talk: talkWaechter,
      },
      {
        id: 'levi_city', name: 'Levi', rect: [166, 392, 48, 112], walk: [245, 508],
        look: async () => { await say('joel', 'Levi versucht, gleichzeitig überall und nirgends hinzuschauen. Stadtluft macht ihn nervös.'); },
        talk: async () => {
          await say('levi', 'Der Wächter da drüben beobachtet uns die ganze Zeit...');
          await say('levi', 'Frag DU ihn. Du bist der mit dem Charme.');
          await say('joel', 'Das ist das Netteste, was du je zu mir gesagt hast.');
        },
      },
      {
        id: 'schimon_city', name: 'Schimon', rect: [112, 394, 48, 110], walk: [210, 506],
        look: async () => { await say('joel', 'Schimon mustert die Stadt wie eine widerspenstige Herde.'); },
        talk: async () => {
          await say('schimon', 'Wirte wissen alles, Junge. Wer ankommt, wer abreist, wer nicht bezahlt.');
          await say('schimon', 'Wenn einer weiß, wo heute Nacht ein Kind zur Welt kam, dann der Wirt da drin. Klopf einfach.');
        },
      },
      {
        id: 'gasse', name: 'Gasse hinter der Herberge', rect: [862, 240, 98, 232], walk: [902, 492],
        goto: async () => {
          if (F.foundStable) { await leaveCity(); return; }
          await say('joel', 'Da hinten liegen Hänge, Gärten und ein Dutzend dunkle Gassen.');
          await say('joel', 'Ohne genaue Wegbeschreibung finde ich da nachts NIE den richtigen Stall. Ich sollte jemanden fragen.');
        },
        look: async () => {
          if (F.foundStable) await say('joel', 'Die Gasse führt hinter die Herberge, den Hang hinunter. Genau dorthin zeigt der Stern.');
          else await say('joel', 'Eine stockdunkle Gasse. Sie führt irgendwo hinter die Herberge.');
        },
      },
      {
        id: 'tor', name: 'Stadttor', rect: [0, 108, 132, 364], walk: [95, 505],
        goto: async () => { await say('joel', 'Zurück aufs Feld? Erst will ich sehen, was der Engel gemeint hat.'); },
        look: async () => { await say('joel', 'Das Stadttor von Bethlehem. Über dem Bogen steht: „Stadt Davids“. Schimon wäre so stolz.'); },
      },
      {
        id: 'herberge', name: 'Herberge', rect: [380, 150, 300, 320], walk: [530, 508],
        look: async () => { await say('joel', 'Die große Herberge von Bethlehem. Jedes Fenster dunkel, jedes Bett belegt. Die Volkszählung füllt die Stadt bis zum Dachfirst.'); },
      },
      {
        id: 'stern_city', name: 'Stern', rect: [770, 38, 100, 98], noWalk: true,
        look: async () => { await say('joel', 'Der Stern steht jetzt fast still – genau über dem Hang hinter der Herberge. Als wollte er etwas zeigen.'); },
      },
    ],
  },

  stable: {
    hotspots: [
      {
        id: 'krippe', name: 'Krippe', rect: [442, 416, 76, 60], walk: [480, 515],
        look: async () => {
          await say('joel', 'Ein Kind, in Windeln gewickelt, in einer Krippe liegend...');
          await say('joel', 'Genau wie der Engel gesagt hat. Wort für Wort.');
        },
        talk: async () => {
          await say('joel', '(Das Kind schläft ganz friedlich. Als wüsste es etwas, das wir alle nicht wissen.)');
        },
        take: async () => { await say('joel', 'Die Krippe gehört zum Stall. Und das Kind zu Maria.'); },
        giveItem: async it => {
          if (it === 'lamm') { await say('joel', 'Ich gebe es besser Maria. Das Kind schläft gerade.'); }
          else await say('joel', 'Das braucht das Kind nicht.');
        },
      },
      {
        id: 'maria', name: 'Maria', rect: [380, 412, 50, 80], walk: [350, 512],
        look: async () => { await say('joel', 'Maria. Sie sieht müde aus – und gleichzeitig, als könnte sie die ganze Welt umarmen.'); },
        talk: talkMaria,
        giveItem: async it => {
          if (it === 'lamm') await finale();
          else await say('maria', 'Danke, aber behalte es nur.');
        },
      },
      {
        id: 'josef', name: 'Josef', rect: [536, 402, 50, 92], walk: [602, 512],
        look: async () => { await say('joel', 'Josef, der Zimmermann aus Nazaret. Er bewacht die Krippe wie ein Festungstor.'); },
        talk: talkJosef,
        giveItem: async it => {
          if (it === 'lamm') await say('josef', 'Gib es lieber Maria. Sie hat das bessere Händchen für kleine Wesen.');
          else await say('josef', 'Behalte es, Junge.');
        },
      },
      {
        id: 'ochse', name: 'Ochse', rect: [646, 422, 130, 80], walk: [650, 516],
        look: async () => { await say('joel', 'Ein Ochse. Er kaut. Er schaut. Er kaut wieder. Ein erfülltes Leben.'); },
        talk: async () => {
          await say('joel', 'Und? Aufregende Nacht?');
          await say('ochse', 'Muh.');
          await say('joel', 'Verstehe. Bei uns war auch einiges los.');
        },
        take: async () => { await say('joel', 'Wohin denn? Mein Inventar hat Grenzen. Sehr klare Grenzen.'); },
      },
      {
        id: 'levi2', name: 'Levi', rect: [200, 420, 50, 92], walk: [268, 512],
        look: async () => { await say('joel', 'Levi starrt die Krippe an, als hätte er noch nie ein Wunder gesehen. Hat er ja auch nicht. Bis heute.'); },
        talk: async () => {
          await say('levi', 'Joel... der Engel hatte recht. Mit ALLEM.');
          await say('levi', 'Wir sollten dem Kind etwas dalassen. Hirten kommen nicht mit leeren Händen.');
        },
      },
      {
        id: 'schimon2', name: 'Schimon', rect: [126, 426, 50, 86], walk: [196, 510],
        look: async () => { await say('joel', 'Schimon hat seine Mütze abgenommen. Das habe ich in zehn Jahren nicht ein einziges Mal gesehen.'); },
        talk: async () => {
          await say('schimon', 'Still, Junge. Das hier... das ist größer als wir.');
          await say('joel', 'Du weinst ja, Schimon.');
          await say('schimon', 'Unsinn. Stallstaub. Überall Stallstaub.');
        },
      },
      {
        id: 'laterne', name: 'Laterne', rect: [228, 86, 48, 76], noWalk: true,
        look: async () => { await say('joel', 'Eine Öllampe. Josef hat sie wohl aufgehängt. Praktisch, so ein Zimmermann.'); },
      },
      {
        id: 'fenster', name: 'Stern am Fenster', rect: [636, 50, 130, 100], noWalk: true,
        look: async () => { await say('joel', 'Durch die Luke sieht man IHN: den Stern. Er steht jetzt genau über diesem Stall.'); },
      },
      {
        id: 'ausgang', name: 'Ausgang', rect: [0, 80, 64, 400], walk: [62, 505],
        goto: async () => {
          await say('joel', 'Noch nicht. Hirten kommen nicht mit leeren Händen – und gehen nicht, ohne etwas dazulassen.');
        },
        look: async () => { await say('joel', 'Draußen liegt die Nacht über Bethlehem. Drinnen ist es heller, als jede Lampe es erklären könnte.'); },
      },
    ],
  },

  flucht: {
    hotspots: [
      {
        id: 'krug', name: 'Weinkrug', rect: [644, 386, 36, 48], walk: [660, 514],
        visible: () => !F.tookKrug,
        look: async () => { await say('joel', 'Ein bauchiger Weinkrug auf dem verlassenen Marktstand. Der Händler ist weit und breit nicht zu sehen.'); },
        take: async () => {
          F.tookKrug = true;
          addItem('krug');
          await say('joel', 'Ich nehme den Krug und lege dem Händler eine Münze hin. Hirten stehlen nicht. Hirten... tauschen großzügig.');
        },
        use: async () => { await say('joel', 'Selbst trinken? Jetzt? Ich brauche einen klaren Kopf.'); },
      },
      {
        id: 'soldat_wache', name: 'Soldat', rect: [340, 388, 60, 124], walk: [432, 510],
        visible: () => !F.soldierBusy,
        look: async () => { await say('joel', 'Ein Soldat des Herodes. Roter Helmbusch, müder Blick – und er steht GENAU vor ihrer Tür.'); },
        talk: talkSoldat,
        giveItem: async it => {
          if (it === 'krug') await bribeSoldier();
          else if (it === 'stab') await say('joel', 'Meinen Hirtenstab? Sicher nicht. Den braucht er nur zum Konfiszieren.');
          else await say('soldat', 'Was soll ICH damit?');
        },
        useItem: async it => {
          if (it === 'krug') await bribeSoldier();
          else if (it === 'stab') await say('joel', 'Einen Soldaten des Herodes verhauen? Ich bin Hirte, kein Held aus den Richtererzählungen.');
          else await say('joel', 'Lieber nicht.');
        },
      },
      {
        id: 'soldat_stand', name: 'Soldat', rect: [656, 388, 64, 124], walk: [610, 512],
        visible: () => F.soldierBusy,
        look: async () => { await say('joel', 'Er prostet abwechselnd seinem Helm und der Markise zu. Taktisch sehr wertvoll.'); },
        talk: async () => {
          await say('soldat', 'Bessster... *hicks*... Wachdienst... ALLER Zeiten.');
          await say('joel', '(Ich beeile mich besser, bevor der Krug leer ist.)');
        },
      },
      {
        id: 'tuer_haus', name: 'Tür des Hauses', rect: [204, 354, 72, 120], walk: [252, 508],
        goto: async () => { await tryWarn(); },
        use: async () => { await tryWarn(); },
        talk: async () => { await tryWarn(); },
        look: async () => { await say('joel', 'Hinter dieser Tür wohnt die Familie. Drinnen brennt eine Lampe – sie sind wach.'); },
      },
      {
        id: 'fenster_haus', name: 'Fenster', rect: [284, 292, 56, 60], walk: [300, 506],
        look: async () => { await say('joel', 'Warmes Licht hinter dem Fenster. Maria ist bestimmt schon auf den Beinen.'); },
      },
      {
        id: 'esel', name: 'Esel', rect: [376, 432, 80, 82], walk: [466, 512],
        visible: () => !F.fleeing,
        look: async () => { await say('joel', 'Josefs Esel. Er hat die Familie aus Nazaret hierher getragen – und sieht aus, als ahnte er: Es geht bald weiter.'); },
        talk: async () => {
          await say('joel', 'Und? Alles bereit?');
          await say('esel', 'Iaah.');
          await say('joel', 'Ganz meine Meinung.');
        },
        use: async () => { await say('joel', 'Er gehört Josef. Und er schaut, als würde er notfalls beißen.'); },
        take: async () => { await say('joel', 'Mein Inventar. Hat. Grenzen.'); },
      },
      {
        id: 'marktstand', name: 'Marktstand', rect: [590, 348, 180, 120], walk: [660, 514],
        look: async () => {
          if (F.tookKrug) await say('joel', 'Ein verlassener Marktstand. Der Händler ist wohl vor den Soldaten geflohen.');
          else await say('joel', 'Ein verlassener Marktstand. Datteln, Körbe... und ein voller Weinkrug.');
        },
      },
      {
        id: 'haus', name: 'Haus der Familie', rect: [120, 188, 220, 282], walk: [252, 508],
        look: async () => { await say('joel', 'Ein kleines Haus in Bethlehem. Die Weisen aus dem Morgenland haben die Familie HIER gefunden – nicht mehr im Stall. (Matthäus 2,11)'); },
      },
      {
        id: 'strasse_sued', name: 'Straße nach Süden', rect: [896, 396, 64, 136], walk: [902, 492],
        goto: async () => {
          if (F.fleeing) { await say('joel', 'Sie sind unterwegs. Gott mit ihnen.'); return; }
          if (!F.soldierBusy) await say('joel', 'Ich gehe nirgendwohin, solange DER da vor ihrer Tür steht.');
          else await say('joel', 'Der Soldat ist abgelenkt – aber zuerst muss ich die Familie warnen!');
        },
        look: async () => { await say('joel', 'Die Straße nach Süden: über Hebron auf den alten Karawanenweg. Händler sagen, in sechs Tagesmärschen ist man am Rand Ägyptens.'); },
      },
      {
        id: 'morgenhimmel', name: 'Morgenhimmel', rect: [400, 0, 560, 150], noWalk: true,
        look: async () => { await say('joel', 'Der Morgen dämmert. Der Stern ist fort – er hat seine Arbeit getan.'); },
      },
    ],
  },

  aegypten: {
    hotspots: [
      {
        id: 'pyramiden', name: 'Pyramiden', rect: [50, 235, 340, 175], noWalk: true,
        look: async () => {
          await say('joel', 'Drei riesige Steinberge, spitz wie Speerspitzen. Josef sagt, da liegen Könige drin.');
          await say('joel', 'Bei uns bekommen Könige eine Höhle. Oder eine Krippe.');
        },
        take: async () => { await say('joel', 'Mein Inventar. Hat. GRENZEN.'); },
      },
      {
        id: 'sonne', name: 'Abendsonne', rect: [455, 345, 55, 50], noWalk: true,
        visible: () => fx.abend < 0.5,
        look: async () => { await say('joel', 'Die Sonne sinkt genau hinter die Pyramiden. Als hätte Ägypten das für uns einstudiert.'); },
      },
      {
        id: 'datteln_palme', name: 'Datteln', rect: [336, 334, 36, 30], walk: [420, 510],
        visible: () => !F.dattelnTaken,
        look: async () => { await say('joel', 'Ganz oben in der Palme hängt eine schwere Rispe voller Datteln. Natürlich GANZ oben.'); },
        take: async () => {
          await say('joel', 'Ich springe... und springe... Nein. Dafür müsste ich drei Joels übereinander sein.');
          await say('joel', 'Aber wozu hat ein Hirte einen Stab mit Haken dran?');
        },
        useItem: async it => {
          if (it === 'stab') {
            F.dattelnTaken = true;
            addItem('datteln');
            await say('joel', 'Ich hake die Rispe mit dem Hirtenstab herunter... HA! Erst Lämmer, jetzt Datteln. Der Stab kann alles.');
          } else await say('joel', 'Damit komme ich da oben nicht heran.');
        },
      },
      {
        id: 'palme', name: 'Palme', rect: [330, 320, 75, 152], walk: [420, 510],
        look: async () => {
          if (F.dattelnTaken) await say('joel', 'Eine Dattelpalme. Jetzt ohne Datteln. Tut mir leid, Palme.');
          else await say('joel', 'Eine hohe Dattelpalme. Die ersten Bäume Ägyptens sehen schon mal vielversprechend aus.');
        },
        take: async () => { await say('joel', 'Sie hat Wurzeln. Tiefe. Das kenne ich schon vom Olivenbaum.'); },
        useItem: async it => {
          if (it === 'stab' && !F.dattelnTaken) {
            F.dattelnTaken = true;
            addItem('datteln');
            await say('joel', 'Ich hake die Rispe mit dem Hirtenstab herunter... HA! Erst Lämmer, jetzt Datteln. Der Stab kann alles.');
          } else await say('joel', 'Die Palme bleibt davon unbeeindruckt.');
        },
      },
      {
        id: 'quelle', name: 'Quelle', rect: [205, 468, 130, 36], walk: [350, 512],
        look: async () => { await say('joel', 'Eine kleine Quelle zwischen den Steinen – kaum mehr als ein Rinnsal, aber das Wasser ist klar und kühl.'); },
        use: async () => {
          await say('joel', 'Ich trinke einen Schluck. Ahh. Sechs Tage Wüste machen aus Wasser ein Festmahl.');
        },
        useItem: async it => {
          if (it === 'schlauch') {
            if (F.schlauchVoll) await say('joel', 'Voller geht er nicht.');
            else { F.schlauchVoll = true; await say('joel', 'Ich halte den Schlauch ins Rinnsal... gluck, gluck... voll!'); }
          } else await say('joel', 'Das will ich nicht nass machen.');
        },
      },
      {
        id: 'esel_reise', name: 'Esel', rect: [405, 440, 95, 75], walk: [520, 512],
        look: async () => {
          if (F.eselWasser) await say('joel', 'Der Esel sieht schon viel besser aus. Er hat mir sogar fast dankbar zugeblinzelt. Fast.');
          else await say('joel', 'Der treue Esel. Sechs Tagesmärsche stecken ihm in den Knochen – und die Quelle ist zu flach für sein Maul.');
        },
        talk: async () => {
          await say('joel', 'Na, alter Freund? Fast geschafft.');
          await say('esel', F.eselWasser ? 'Iaah!' : 'Iaah...');
          await say('joel', F.eselWasser ? 'Ganz meine Meinung.' : 'Ich weiß. Ich arbeite dran.');
        },
        useItem: async it => {
          if (it === 'schlauch') await traenkeEsel();
          else if (it === 'datteln') await say('joel', 'Die sind für die Familie. Du bekommst Disteln, das ist quasi dasselbe.');
          else await say('joel', 'Lieber nicht.');
        },
        giveItem: async it => {
          if (it === 'schlauch') await traenkeEsel();
          else await say('joel', 'Das braucht ein Esel nicht.');
        },
        take: async () => { await say('joel', 'Wir hatten das Thema schon. Inventar. Grenzen.'); },
      },
      {
        id: 'gepaeck', name: 'Gepäck', rect: [515, 462, 65, 50], walk: [555, 514],
        look: async () => {
          if (F.tookSchlauch) await say('joel', 'Decken, ein Werkzeugbündel – und die Gaben der Weisen, gut versteckt unter Josefs Säge.');
          else await say('joel', 'Decken, ein Werkzeugbündel... und ein leerer Wasserschlauch hängt am Packsattel.');
        },
        take: async () => {
          if (F.tookSchlauch) { await say('joel', 'Der Rest gehört der Familie.'); return; }
          F.tookSchlauch = true;
          addItem('schlauch');
          await say('joel', 'Den Wasserschlauch nehme ich. Leer wiegt er ja nichts.');
        },
        use: async () => { await say('joel', 'Ich wühle nicht im Gepäck anderer Leute. Außer im Notfall. Oder bei Proviant.'); },
      },
      {
        id: 'feuerstelle', name: 'Lagerfeuer', rect: [605, 450, 75, 48], walk: [600, 512],
        look: async () => {
          if (F.abendDone) await say('joel', 'Das Feuer knistert leise. Der beste Platz der ganzen Wüste.');
          else await say('joel', 'Josef hat schon Feuerholz aufgeschichtet. Angezündet wird, wenn das Lager versorgt ist.');
        },
        use: async () => {
          if (F.abendDone) await say('joel', 'Es brennt doch schon.');
          else await say('joel', 'Erst die Arbeit: Wasser für den Esel, Datteln für die Familie. DANN der gemütliche Teil.');
        },
      },
      {
        id: 'kind_reise', name: 'Das Kind', rect: [664, 442, 34, 26], walk: [640, 510],
        look: async () => { await say('joel', 'Er schläft in Marias Armen, fest eingewickelt. Sechs Tage Flucht – und kein bisschen beeindruckt.'); },
        talk: async () => {
          await say('joel', '(Schlaf gut, kleiner König. Bis nach Ägypten bist du schon gekommen – weiter als ich je in meinem Leben.)');
        },
      },
      {
        id: 'maria_reise', name: 'Maria', rect: [678, 410, 50, 82], walk: [645, 510],
        look: async () => { await say('joel', 'Maria. Müde von der Reise – aber ihre Augen sind so ruhig, als wüsste sie etwas, das die Wüste nicht weiß.'); },
        talk: talkMariaReise,
        giveItem: async it => {
          if (it === 'datteln') {
            removeItem('datteln');
            F.dattelnGiven = true;
            await say('joel', 'Hier – frisch von der Palme. Proviant für die nächsten Tage.');
            await say('maria', 'Datteln! Danke, Joel. Du bist ein besserer Reisegefährte als jede Karawane.');
            await checkAbend();
          } else if (it === 'schlauch') await say('maria', 'Gib das Wasser dem Esel, Joel. Er hat es nötiger als wir.');
          else await say('maria', 'Danke, aber behalte es nur.');
        },
      },
      {
        id: 'josef_reise', name: 'Josef', rect: [745, 398, 50, 105], walk: [705, 512],
        look: async () => { await say('joel', 'Josef richtet das Lager. Ein Mann, der in der Wüste genauso anpackt wie in der Werkstatt.'); },
        talk: talkJosefReise,
        giveItem: async it => {
          if (it === 'datteln') {
            removeItem('datteln');
            F.dattelnGiven = true;
            await say('joel', 'Die Datteln, wie bestellt. Mit dem Hirtenstab gepflückt.');
            await say('josef', 'Sieh an – das Werkzeug macht den Meister. Danke, Joel.');
            await checkAbend();
          } else if (it === 'schlauch') await say('josef', 'Tränk damit zuerst den Esel. Ohne ihn kommen wir keinen Schritt weiter.');
          else await say('josef', 'Behalte es, Junge.');
        },
      },
      {
        id: 'weg_zurueck', name: 'Weg zurück nach Norden', rect: [0, 300, 36, 230], walk: [60, 508],
        goto: async () => {
          if (F.abendDone) await say('joel', 'Morgen früh. Heute Abend gehöre ich ans Feuer.');
          else await say('joel', 'Umkehren? Jetzt? Erst wird das Lager versorgt.');
        },
        look: async () => { await say('joel', 'Da hinten liegen sechs Tagesmärsche Wüste – und dahinter Bethlehem, Schimon, Levi und zwanzig Schafe.'); },
      },
    ],
  },

  nazaret: {
    hotspots: [
      {
        id: 'rahel', name: 'Rahel', rect: [516, 400, 48, 102], walk: [585, 510],
        look: async () => { await say('joel', 'Eine Frau mit Wasserkrug und wachem Blick. Sie hat mich schon dreimal gemustert – jetzt MUSS sie einfach fragen.'); },
        talk: talkRahel,
      },
      {
        id: 'eli', name: 'Eli', rect: [696, 406, 48, 100], walk: [658, 510],
        look: async () => { await say('joel', 'Ein Bauer mit Hacke und Stirnfalten. Die Sorte Mensch, die erst das Feld prüft und dann das Gerede.'); },
        talk: talkEli,
      },
      {
        id: 'mirjam', name: 'Mirjam', rect: [260, 440, 40, 70], walk: [320, 510],
        look: async () => { await say('joel', 'Ein Mädchen aus Nazaret. Sie umkreist meine Herde, als hätte sie noch nie zwanzig Schafe auf einem Haufen gesehen.'); },
        talk: talkMirjam,
      },
      {
        id: 'josef_nz', name: 'Josef', rect: [816, 402, 48, 102], walk: [778, 510],
        visible: () => F.josefDa,
        look: async () => { await say('joel', 'Josef. Grauer geworden, aber unverkennbar. Der Mann, der eine Krippe reparierte und einen König großzieht.'); },
        talk: async () => { await say('josef', 'Bis heute Abend, Joel. Maria backt schon. Komm hungrig!'); },
      },
      {
        id: 'brunnen_nz', name: 'Brunnen', rect: [440, 398, 88, 88], walk: [420, 510],
        look: async () => { await say('joel', 'Der Brunnen vor Nazaret. Hier holt die halbe Stadt ihr Wasser – und die ganze Stadt ihre Neuigkeiten.'); },
        use: async () => { await say('joel', 'Die Herde ist getränkt, und ich auch. Mehr braucht ein Hirte nicht.'); },
      },
      {
        id: 'herde_nz', name: 'Meine Herde', rect: [110, 448, 180, 82], walk: [260, 515],
        look: async () => { await say('joel', 'Meine eigene Herde. Dreißig Tiere inzwischen. Schimon wäre stolz – und würde trotzdem nachzählen.'); },
        talk: async () => {
          await say('schaf', 'Mäh.');
          await say('joel', 'Nach all den Jahren immer noch dieselben Gespräche.');
        },
      },
      {
        id: 'baum_nz', name: 'Feigenbaum', rect: [40, 280, 140, 165], walk: [150, 500],
        look: async () => { await say('joel', 'Ein knorriger Feigenbaum. In Galiläa wächst alles besser – sogar der Schatten ist hier grüner.'); },
        take: async () => { await say('joel', 'Die Feigen sind noch nicht reif. Und Bäume mitnehmen... wir hatten das Thema.'); },
      },
      {
        id: 'stadt_nz', name: 'Nazaret', rect: [600, 200, 340, 150], noWalk: true,
        look: async () => { await say('joel', 'Nazaret. Klein, am Hang gebaut, voller Werkstätten. „Kann aus Nazaret etwas Gutes kommen?“, spotten manche. Wir werden sehen.'); },
      },
      {
        id: 'weg_nz', name: 'Weg in die Stadt', rect: [896, 400, 64, 130], walk: [900, 480],
        goto: async () => {
          if (F.heimkehrDone) await say('joel', 'Heute Abend. Bei Josef und Maria. Ich bin EINGELADEN.');
          else await say('joel', 'Erst die Herde, dann die Stadt. Außerdem kommen die Leute ohnehin alle zum Brunnen – samt ihrer Fragen.');
        },
        look: async () => { await say('joel', 'Der Weg führt den Hang hinauf nach Nazaret. Gleich am Ortsrand soll die Werkstatt eines Zimmermanns liegen.'); },
      },
    ],
  },

  synagoge: {
    hotspots: [
      {
        id: 'levi_syn', name: 'Levi', rect: [192, 420, 48, 86], walk: [262, 508],
        look: async () => { await say('joel', 'Levi. Grau, faltig, und das Grinsen ist keinen Tag gealtert.'); },
        talk: talkLeviSyn,
      },
      {
        id: 'platz', name: 'Freier Platz', rect: [318, 462, 64, 52], walk: [345, 508],
        goto: async () => { await predigtCutscene(); },
        use: async () => { await predigtCutscene(); },
        look: async () => { await say('joel', 'Levi hat mir tatsächlich einen Platz freigehalten. In der ersten Reihe. Natürlich.'); },
      },
      {
        id: 'jesus_syn', name: 'Jesus', rect: [450, 320, 60, 96], walk: [480, 470],
        look: async () => {
          await say('joel', 'Da steht er, mit der Schriftrolle in der Hand. Ruhig, als hätte er auf diesen Tag gewartet.');
          await say('joel', '(Dreißig Jahre. Aus dem Kind in der Krippe ist ein Mann geworden.)');
        },
        talk: async () => { await say('joel', '(Gleich beginnt die Lesung. Ich setze mich besser – da vorne ist noch ein Platz frei.)'); },
      },
      {
        id: 'bima', name: 'Lesepult', rect: [400, 380, 160, 36], noWalk: true,
        look: async () => { await say('joel', 'Das Lesepult der Synagoge. Darauf liegt die Schriftrolle des Propheten Jesaja, bereit zur Lesung.'); },
      },
      {
        id: 'menge_syn', name: 'Versammlung', rect: [580, 430, 280, 90], walk: [560, 510],
        look: async () => { await say('joel', 'Die halbe Stadt drängt sich auf den Bänken. Handwerker, Bauern, Kinder. Alle wollen Josefs Sohn hören.'); },
        talk: async () => {
          await say('menge', 'Psst! Es geht gleich los!');
          await say('joel', '(Schon gut, schon gut.)');
        },
      },
      {
        id: 'fenster_syn', name: 'Fenster', rect: [700, 80, 120, 110], noWalk: true,
        look: async () => { await say('joel', 'Durch das hohe Fenster fällt das Morgenlicht quer durch den Raum. Es landet genau auf dem Lesepult. Zufall, bestimmt.'); },
      },
      {
        id: 'lampe_syn', name: 'Öllampe', rect: [120, 110, 60, 90], noWalk: true,
        look: async () => { await say('joel', 'Ein siebenarmiger Leuchter aus Bronze. Er brennt auch am Tag – manche Lichter löscht man nicht.'); },
      },
      {
        id: 'ausgang_syn', name: 'Ausgang', rect: [0, 200, 50, 330], walk: [70, 505],
        goto: async () => { await say('joel', 'Jetzt gehen? Levi würde mir das NIE verzeihen. Und ich mir auch nicht.'); },
        look: async () => { await say('joel', 'Draußen liegt der Sabbatmorgen über Nazaret. Drinnen liegt etwas in der Luft, das größer ist als diese Stadt.'); },
      },
    ],
  },

  see: {
    hotspots: [
      {
        id: 'simon', name: 'Simon', rect: [496, 398, 48, 107], walk: [565, 510],
        visible: () => !F.bootDraussen,
        look: async () => { await say('joel', 'Ein Fischer mit Salzrändern auf dem Gewand und Ringen unter den Augen. Die Nacht war lang – und der Fang offenbar kurz.'); },
        talk: talkSimon,
      },
      {
        id: 'netze', name: 'Netze', rect: [438, 452, 105, 45], walk: [470, 514],
        look: async () => {
          if (F.netzeSauber) await say('joel', 'Die Netze sind sauber und hängen zum Trocknen. Bereit für die nächste Nacht – oder für etwas ganz anderes.');
          else await say('joel', 'Leere Fischernetze, voller Algen und Schlamm. Die Fischer sind ausgestiegen und waschen sie. (Lukas 5,2)');
        },
        use: async () => {
          if (F.netzeSauber) { await say('joel', 'Sauberer werden sie nicht.'); return; }
          if (!F.simonMet) { await say('joel', 'Fremde Netze fasst man nicht ungefragt an. Erst reden – das gilt bei Herden wie bei Booten.'); return; }
          await netzeWaschen();
        },
        take: async () => { await say('joel', 'Ein Hirte mit Fischernetz. Levi würde sich totlachen.'); },
      },
      {
        id: 'boot', name: 'Simons Boot', rect: [566, 396, 150, 62], walk: [640, 512],
        visible: () => !F.bootDraussen,
        look: async () => { await say('joel', 'Ein gutes, breites Fischerboot. Schwer, geduldig und gründlich nach Fisch riechend. Es liegt fest im Sand.'); },
        goto: async () => {
          if (F.bootAngefragt) { await bootUndFang(); }
          else await say('joel', 'Ich schiebe keine fremden Boote ins Wasser. Jedenfalls nicht ungefragt.');
        },
        use: async () => {
          if (F.bootAngefragt) { await bootUndFang(); }
          else await say('joel', 'Es liegt fest im Sand – und es gehört dem müden Fischer da drüben. Erst fragen.');
        },
      },
      {
        id: 'boot2', name: 'Zweites Boot', rect: [100, 346, 124, 44], walk: [185, 500],
        visible: () => !F.fangDone,
        look: async () => { await say('joel', 'Das zweite Boot gehört Simons Gefährten – Jakobus und Johannes, den Söhnen des Zebedäus. (Lukas 5,10)'); },
      },
      {
        id: 'jesus_see', name: 'Jesus', rect: [232, 398, 46, 102], walk: [305, 508],
        visible: () => !F.bootDraussen,
        look: async () => {
          await say('joel', 'Er steht am Wasser, und die Menge drängt sich um ihn, um das Wort Gottes zu hören. (Lukas 5,1)');
          await say('joel', '(Gleich schieben sie ihn noch in den See. So kann doch keiner zuhören.)');
        },
        talk: async () => { await say('joel', '(Da komme ich nie durch. Die Menge steht dichter als meine Herde beim Gewitter.)'); },
      },
      {
        id: 'menge_see', name: 'Menschenmenge', rect: [108, 418, 175, 96], walk: [330, 512],
        look: async () => { await say('joel', 'Bauern, Handwerker, Kinder, zwei Zöllner und mindestens ein Hirte. Alle wollen ihn hören.'); },
        talk: async () => {
          await say('menge', 'Nicht drängeln! Wir stehen hier seit dem Morgengrauen!');
          await say('joel', 'Ich dränge nicht. Ich staune nur mit etwas Anlauf.');
        },
      },
      {
        id: 'levi_see', name: 'Levi', rect: [816, 398, 48, 107], walk: [778, 508],
        look: async () => { await say('joel', 'Levi sammelt Muscheln. Mit siebzig. Manche Dinge ändern sich nie, und das ist auch gut so.'); },
        talk: async () => {
          await say('levi', 'Joel! Möwen sind wie Schafe, nur frecher. Eine hat mir eben das Brot aus der Hand geholt. IM FLUG.');
          if (!F.netzeSauber) await say('levi', 'Der Fischer da drüben könnte übrigens Hilfe gebrauchen. Du bist doch so gut im Anpacken.');
          else if (!F.bootDraussen) await say('levi', 'Wenn das Boot raus soll, sag Bescheid. Ich übernehme die Gesamtaufsicht – ich habe von Schimon gelernt.');
          else await say('levi', 'Schau aufs Wasser, Joel. Einfach nur schauen.');
        },
      },
      {
        id: 'wasser', name: 'See Gennesaret', rect: [0, 210, 960, 170], noWalk: true,
        look: async () => { await say('joel', 'Der See Gennesaret, glatt wie poliertes Kupfer im Morgenlicht. Am anderen Ufer steigen die Berge auf.'); },
      },
      {
        id: 'kapernaum', name: 'Kapernaum', rect: [712, 308, 248, 95], noWalk: true,
        look: async () => { await say('joel', 'Kapernaum. Fischerstadt, Zollstation, Garnison – und seit Kurzem der Ort, über den ganz Galiläa redet.'); },
      },
      {
        id: 'moewen', name: 'Möwen', rect: [380, 40, 220, 90], noWalk: true,
        look: async () => { await say('joel', 'Möwen kreisen über dem Wasser. Sie schreien wie Levi beim Engel. Also: durchdringend.'); },
      },
      {
        id: 'weg_see', name: 'Weg nach Nazaret', rect: [918, 400, 42, 130], walk: [905, 490],
        goto: async () => { await say('joel', 'Zurück? JETZT? Levi, halt mich fest – wir bleiben.'); },
        look: async () => { await say('joel', 'Der Weg zurück in die Berge, nach Nazaret. Ein langer Marsch für alte Hirtenbeine – aber er hat sich gelohnt.'); },
      },
    ],
  },

  haus: {
    hotspots: [
      {
        id: 'freunde', name: 'Vier Freunde', rect: [78, 382, 178, 116], walk: [270, 510],
        visible: () => !F.mannGeheilt,
        look: async () => { await say('joel', 'Vier Männer mit einer Liege. Ihre Arme zittern, aber ihre Gesichter sagen: Wir geben nicht auf.'); },
        talk: talkDachTraeger,
        giveItem: async it => {
          if (it === 'seil') await befestigeSeile();
          else await say('freund', 'Danke, aber was wir jetzt brauchen, ist ein Weg zu Jesus.');
        },
        useItem: async it => {
          if (it === 'seil') await befestigeSeile();
          else await say('joel', 'Damit helfe ich ihnen nicht aufs Dach.');
        },
      },
      {
        id: 'gelähmter', name: 'Gelähmter Mann', rect: [102, 420, 132, 48], walk: [270, 510],
        visible: () => !F.mannGeheilt,
        look: async () => { await say('joel', 'Er liegt auf einer einfachen Matte. Wach, erschöpft – und vielleicht hoffnungsvoller, als er zugeben will.'); },
        talk: async () => {
          await say('gelaehmter', 'Ich will ihn nur hören. Vielleicht reicht schon das.');
          await say('joel', 'Nach allem, was ich gesehen habe: Bei ihm reicht manchmal ein Wort.');
        },
        useItem: async it => {
          if (it === 'seil') await befestigeSeile();
          else await say('joel', 'Vorsichtig. Er hat heute genug getragen, auch wenn er nicht gehen kann.');
        },
        giveItem: async it => {
          if (it === 'seil') await befestigeSeile();
          else await say('gelaehmter', 'Danke, aber behalte es. Ich habe im Moment genug auf meiner Matte.');
        },
      },
      {
        id: 'seile', name: 'Seile', rect: [790, 438, 72, 42], walk: [810, 512],
        visible: () => !F.tookSeil && !F.seileBefestigt,
        look: async () => { await say('joel', 'Feste Seile neben einem Wasserkrug. Wenn ich jemanden durchs Dach lasse, will ich genau solche Seile.'); },
        take: takeSeil,
        use: takeSeil,
      },
      {
        id: 'leiter', name: 'Leiter', rect: [732, 318, 54, 166], walk: [750, 512],
        visible: () => !F.leiterBereit,
        look: async () => { await say('joel', 'Eine Holzleiter lehnt am Nachbarhaus. Genau lang genug für ein flaches Dach.'); },
        take: leiterAnlehnen,
        use: leiterAnlehnen,
      },
      {
        id: 'leiter_bereit', name: 'Angelehnte Leiter', rect: [648, 210, 130, 280], walk: [720, 512],
        visible: () => F.leiterBereit,
        look: async () => { await say('joel', 'Die Leiter steht am Dachrand. Levi hält sie fest und schaut dabei, als würde sie ihn halten.'); },
        use: async () => {
          if (!F.dachOffen) await say('joel', 'Damit kommen wir aufs Dach. Jetzt müssen die Ziegel über Jesus gelöst werden.');
          else await say('joel', 'Der Weg aufs Dach ist frei. Jetzt zählt nur, dass die Liege sicher hängt.');
        },
      },
      {
        id: 'dach', name: 'Dachziegel', rect: [256, 130, 470, 82], walk: [720, 512],
        look: async () => {
          if (F.dachOffen) await say('joel', 'Ein Loch im Dach, groß genug für eine Liege. Ich hoffe, der Hausbesitzer hat ebenfalls Glauben.');
          else await say('joel', 'Ein flaches Dach aus Balken, Lehm und Ziegeln. In Kapernaum baut man Türen offenbar auch nach oben.');
        },
        use: async () => { await oeffneDach(null); },
        useItem: async it => { await oeffneDach(it); },
      },
      {
        id: 'tuer_kapernaum', name: 'Tür des Hauses', rect: [296, 330, 118, 146], walk: [430, 512],
        goto: async () => {
          await say('joel', 'Kein Durchkommen. Die Menge steht Schulter an Schulter, und drinnen sitzen die Ehrengäste auch nicht gerade platzsparend.');
        },
        look: async () => { await say('joel', 'Die Tür ist offen, aber der Eingang ist dicht. Noch ein Mensch mehr, und das Haus atmet aus Protest aus.'); },
        talk: async () => {
          await say('joel', 'Könnte jemand Platz machen? Hier liegt ein Mann auf einer Matte!');
          await say('menge', 'Wir kommen selbst kaum rein!');
          await say('joel', '(Dann eben nicht durch die Tür.)');
        },
        use: async () => { await say('joel', 'Ich drücke mich nicht dazwischen. Mit einer Liege kommt hier niemand hinein.'); },
      },
      {
        id: 'jesus_haus', name: 'Jesus', rect: [482, 286, 54, 112], walk: [455, 510],
        look: async () => {
          await say('joel', 'Durch die Tür sehe ich ihn nur zwischen Köpfen und Schultern. Er lehrt ruhig, als wäre das Gedränge nur Wind.');
        },
        talk: async () => { await say('joel', 'Ich komme nicht zu ihm durch. Aber vielleicht kommt jemand anderes von oben zu ihm.'); },
      },
      {
        id: 'menge_haus', name: 'Menschenmenge', rect: [338, 302, 278, 178], walk: [456, 512],
        look: async () => { await say('joel', 'Menschen aus Kapernaum, Kranke, Neugierige, Fromme, Skeptiker – alle wollen hinein, keiner will weichen.'); },
        talk: async () => {
          await say('menge', 'Psst! Er spricht gerade!');
          await say('joel', 'Und draußen wartet jemand, der ihn hören MUSS.');
        },
      },
      {
        id: 'pharisaeer', name: 'Pharisäer und Gesetzeslehrer', rect: [600, 284, 170, 122], walk: [545, 512],
        look: async () => { await say('joel', 'Sie sitzen drinnen, Gewänder glatt, Stirnen gefaltet. Man kann auch im Sitzen eine Mauer sein.'); },
        talk: async () => {
          await say('joel', 'Entschuldigt, draußen braucht jemand Hilfe!');
          await say('pharisaeer', 'Ordnung hat ihren Ort.');
          await say('joel', 'Barmherzigkeit hoffentlich auch.');
        },
      },
      {
        id: 'levi_haus', name: 'Levi', rect: [802, 398, 52, 108], walk: [760, 512],
        look: async () => { await say('joel', 'Levi hat seit dem Fischzug dieselben großen Augen. Für einen alten Mann staunt er erstaunlich frisch.'); },
        talk: async () => {
          if (!F.tragerMet) await say('levi', 'Die vier da mit der Liege suchen verzweifelt einen Weg hinein. Vielleicht weißt du Rat, Joel.');
          else if (!F.leiterBereit) await say('levi', 'Die Leiter am Nachbarhaus sieht brauchbar aus. Ich sage das mit angemessener Angst.');
          else if (!F.seileBefestigt) await say('levi', 'Wenn wir eine Liege durchs Dach lassen, will ich mehr als gute Wünsche daran festknoten.');
          else if (!F.dachOffen) await say('levi', 'Du hast doch deinen Hirtenstab. Der hat schon Lämmer und Datteln gerettet. Heute vielleicht Dachziegel.');
          else await say('levi', 'Alles bereit. Ich halte die Leiter. Und den Atem.');
        },
      },
      {
        id: 'brunnen_haus', name: 'Wasserkrug', rect: [840, 444, 32, 42], walk: [810, 512],
        look: async () => { await say('joel', 'Ein Wasserkrug neben den Seilen. Kapernaum ist praktisch: alles, was man braucht, steht herum. Fast alles.'); },
        take: async () => { await say('joel', 'Heute geht es nicht um Wasser. Heute geht es um einen Mann, der nicht laufen kann.'); },
      },
      {
        id: 'gasse_haus', name: 'Gasse', rect: [0, 392, 58, 140], walk: [60, 508],
        goto: async () => { await say('joel', 'Weggehen? Jetzt, wo ein Dach zur Tür werden soll? Keinen Schritt.'); },
        look: async () => { await say('joel', 'Die Gasse führt zurück zum See. Von dort kamen wir – dem Wunder hinterher.'); },
      },
    ],
  },

  zollhaus: {
    hotspots: [
      {
        id: 'levi_zoll', name: 'Levi der Zöllner', rect: [512, 372, 70, 106], walk: [470, 510],
        visible: () => !F.zoellnerCalled,
        look: async () => { await say('joel', 'Ein Zöllner namens Levi. Seine Tafel ist voller Zahlen; sein Gesicht nicht gerade voller Frieden.'); },
        talk: talkLeviZoellner,
      },
      {
        id: 'jesus_zoll', name: 'Jesus', rect: [396, 362, 52, 112], walk: [360, 510],
        visible: () => !F.zoellnerCalled,
        look: async () => { await say('joel', 'Jesus bleibt stehen und schaut zum Zolltisch. Nicht kurz. Nicht zufällig.'); },
        talk: rufLeviCutscene,
        use: rufLeviCutscene,
      },
      {
        id: 'zolltisch', name: 'Zolltisch', rect: [482, 424, 146, 62], walk: [470, 510],
        look: async () => {
          if (F.zoellnerCalled) await say('joel', 'Der Zolltisch steht da, Münzen und Tafeln noch darauf. Levi hat ihn einfach verlassen.');
          else await say('joel', 'Ein niedriger Tisch mit Münzen, Schreibtafel und Wachssiegel. Rom wäre stolz. Ich nicht.');
        },
        use: async () => {
          if (!F.zoellnerCalled) await say('joel', 'Ich setze mich sicher nicht an einen Zolltisch. Meine Hände riechen schon genug nach Schaf.');
          else await say('joel', 'Alles liegt noch da. Er hat wirklich alles zurückgelassen.');
        },
        take: async () => { await say('joel', 'Münzen vom Zolltisch nehmen? Nein. Ich habe genug Ärger in meinem Leben ausgesucht.'); },
      },
      {
        id: 'muenzen_zoll', name: 'Münzen', rect: [548, 404, 70, 32], walk: [500, 510],
        look: async () => {
          if (F.zoellnerCalled) await say('joel', 'Die Münzen glänzen noch. Aber plötzlich wirken sie eher verlassen als wertvoll.');
          else await say('joel', 'Kleine Silber- und Kupfermünzen. Manche Leute hören darin Musik. Ich höre Beschwerden.');
        },
        take: async () => { await say('joel', 'Nein. Wer einem Zöllner Geld wegnimmt, braucht entweder Mut oder keine Pläne für morgen.'); },
      },
      {
        id: 'schranke_zoll', name: 'Zollschranke', rect: [620, 388, 110, 76], walk: [650, 510],
        look: async () => {
          if (F.zoellnerCalled) await say('joel', 'Die Schranke steht offen. Das passiert offenbar, wenn ein Zöllner anfängt zu folgen.');
          else await say('joel', 'Eine Zollschranke am Weg nach Kapernaum. Holz, Strick und das unangenehme Gefühl, jemand wolle deine Tasche wiegen.');
        },
        use: async () => {
          if (F.zoellnerCalled) await say('joel', 'Offen bleibt offen. Ich fasse sie lieber nicht an.');
          else await say('joel', 'Wenn ich die Schranke anhebe, legt Levi vermutlich eine Gebühr auf Schrankenberührung fest.');
        },
      },
      {
        id: 'levi_zoll_called', name: 'Levi der Zöllner', rect: [736, 374, 58, 108], walk: [700, 510],
        visible: () => F.zoellnerCalled && !F.gaesteEingeladen,
        look: async () => { await say('joel', 'Levi steht nicht mehr hinter dem Tisch. Er sieht aus, als hätte jemand ein Fenster in sein Leben geöffnet.'); },
        talk: talkLeviCalled,
      },
      {
        id: 'zoellnerkollegen', name: 'Zöllnerkollegen', rect: [272, 374, 120, 112], walk: [390, 510],
        visible: () => F.zoellnerCalled && !F.gaesteEingeladen,
        look: async () => { await say('joel', 'Levis Kollegen vom Nebentisch. Sie schauen herüber, als hätten sie gehört, dass ein Wunder auch für sie gefährlich werden könnte.'); },
        talk: talkZoellnerKollegen,
        giveItem: async it => {
          if (it === 'einladung') await talkZoellnerKollegen();
          else await say('zoellner', 'Wenn das keine Einladung ist, interessiert es uns vermutlich nicht.');
        },
      },
      {
        id: 'levi_alt_zoll', name: 'Levi', rect: [196, 398, 52, 108], walk: [260, 510],
        look: async () => { await say('joel', 'Mein Levi. Nicht der Zöllner. Wobei das heute offenbar erklärt werden muss.'); },
        talk: async () => {
          if (!F.zoellnerCalled) {
            await say('levi', 'Ich sage es nur vorsorglich: Wenn Jesus jetzt „Levi“ ruft, kläre bitte, welcher gemeint ist.');
          } else if (!F.gaesteEingeladen) {
            await say('levi', 'Der andere Levi hat alles liegen lassen. Joel, ich habe schon Schafe vor Gewitter davonlaufen sehen – aber nie einen Zöllner vor Münzen.');
            if (state.inventory.includes('einladung')) await say('levi', 'Und du sollst jetzt seine Kollegen einladen. Das ist entweder sehr mutig oder sehr Jesus.');
          } else {
            await say('levi', 'Zwei Levis in einem Haus voller Zöllner. Gott hat Humor. Das behaupte ich seit Nazaret.');
          }
        },
      },
      {
        id: 'haus_levi', name: 'Haus des Levi', rect: [704, 230, 210, 248], walk: [760, 512],
        look: async () => {
          if (F.gaesteEingeladen) await say('joel', 'Levis Haus ist voller Stimmen, Brot, Gelächter – und Leute, die sonst draußen bleiben.');
          else if (F.zoellnerCalled) await say('joel', 'Levis Haus. Gleich soll dort ein Mahl stattfinden, bei dem die falschen Leute genau richtig sitzen.');
          else await say('joel', 'Ein ordentliches Haus. Zollgeld baut offenbar gerade Wände.');
        },
        goto: async () => {
          if (!F.zoellnerCalled) await say('joel', 'Ich breche nicht einfach in das Haus eines Zöllners ein. Ich bin Hirte, kein schlechter Gleichnisanfang.');
          else if (!F.gaesteEingeladen) await say('joel', 'Noch nicht. Levi wollte zuerst seine Kollegen einladen.');
          else await say('joel', 'Drinnen ist das Fest im Gange. Und mein Platz ist offenbar mittendrin.');
        },
      },
      {
        id: 'festtafel', name: 'Festtafel', rect: [454, 306, 266, 116], walk: [530, 510],
        visible: () => F.gaesteEingeladen && !(F.mahlDone && !F.weinVerstanden),
        look: async () => { await say('joel', 'Brot, Fisch, Oliven, Becher – und ein Tisch, an dem Menschen sitzen, die sonst keiner einlädt.'); },
        talk: async () => { await say('menge', 'Gib das Brot weiter! Und die Oliven! Nein, die anderen Oliven!'); },
      },
      {
        id: 'alter_schlauch', name: 'Alter Weinschlauch', rect: [486, 444, 48, 40], walk: [520, 512],
        visible: () => F.mahlDone && !F.weinVerstanden,
        look: lookAlterSchlauch,
        use: lookAlterSchlauch,
      },
      {
        id: 'neuer_schlauch', name: 'Neuer Weinschlauch', rect: [542, 438, 54, 46], walk: [560, 512],
        visible: () => F.mahlDone && !F.weinVerstanden,
        look: lookNeuerSchlauch,
        use: lookNeuerSchlauch,
      },
      {
        id: 'jesus_fasten', name: 'Jesus', rect: [520, 316, 56, 100], walk: [500, 510],
        visible: () => F.mahlDone && !F.weinVerstanden,
        look: async () => { await say('joel', 'Jesus sitzt mitten am Tisch, ruhig wie am See. Die Frage nach dem Fasten liegt im Raum wie ein gespannter Strick.'); },
        talk: weinschlauchAntwort,
      },
      {
        id: 'pharisaeer_zoll', name: 'Pharisäer und Schriftgelehrte', rect: [716, 360, 126, 116], walk: [690, 510],
        visible: () => F.gaesteEingeladen,
        look: async () => { await say('joel', 'Sie stehen am Rand des Mahls, als könnte schon der Geruch von Brot mit Zöllnern gefährlich sein.'); },
        talk: async () => {
          if (F.mahlDone && !F.weinVerstanden) {
            await say('pharisaeer', 'Johannes lehrt seine Jünger fasten. Eure aber essen und trinken.');
            await say('joel', 'Ihr stellt sogar Fragen mit trockenem Mund.');
          } else {
            await say('pharisaeer', 'Warum esst ihr mit solchen Leuten?');
            await say('joel', 'Vielleicht, weil Hunger keine saubere Liste führt.');
          }
        },
      },
      {
        id: 'weg_see_zoll', name: 'Weg zum See', rect: [0, 382, 60, 150], walk: [60, 508],
        goto: async () => { await say('joel', 'Zurück zum See? Ich glaube, heute führt der Weg geradewegs an diesen Zolltisch.'); },
        look: async () => { await say('joel', 'Der Weg zurück zum See. Eben roch er noch nach Fisch und Wunder. Jetzt riecht er nach Münzen.'); },
      },
      {
        id: 'stadttor_zoll', name: 'Straße nach Kapernaum', rect: [900, 330, 60, 190], walk: [900, 500],
        goto: async () => {
          if (F.mahlDone) await say('joel', 'Weitergehen? Ja. Aber erst muss ich diesen Satz behalten: Nicht die Gesunden brauchen den Arzt.');
          else await say('joel', 'Noch nicht. Jesus ist am Zolltisch stehen geblieben, also bleibe ich auch.');
        },
        look: async () => { await say('joel', 'Die Straße führt weiter nach Kapernaum hinein. Händler, Fischer, Soldaten – alle müssen am Zoll vorbei.'); },
      },
    ],
  },

  sabbatfeld: {
    hotspots: [
      {
        id: 'aehren', name: 'Reife Ähren', rect: [520, 346, 170, 144], walk: [535, 512],
        visible: () => !F.tookAehren,
        look: async () => { await say('joel', 'Reife Ähren am Feldrand. Goldgelb, trocken, genau richtig zum Ausreiben zwischen den Händen.'); },
        take: nehmeAehren,
        use: nehmeAehren,
      },
      {
        id: 'haende', name: 'Meine Hände', rect: [292, 430, 58, 58], walk: [315, 512],
        look: async () => { await say('joel', 'Alte Hirtenhände. Haben Lämmer getragen, Dächer geöffnet, Einladungen überbracht. Ähren ausreiben schaffen sie auch.'); },
        useItem: async it => {
          if (it === 'aehren') await reibeKoerner();
          else await say('joel', 'Meine Hände sind viel gewohnt, aber damit wissen sie gerade nichts anzufangen.');
        },
      },
      {
        id: 'juenger_feld', name: 'Hungrige Jünger', rect: [390, 386, 132, 108], walk: [370, 512],
        look: async () => { await say('joel', 'Die Jünger versuchen würdevoll hungrig auszusehen. Es gelingt mittelmäßig.'); },
        talk: async () => {
          if (!F.tookAehren) await say('juenger', 'Nur ein paar Ähren, Joel. Mehr brauchen wir nicht.');
          else if (!F.koernerGerieben) await say('juenger', 'Reib sie zwischen den Händen, dann lösen sich die Körner.');
          else await say('juenger', 'Danke. Wenig Brot, viel Streit. So ist wohl Nachfolge.');
        },
        giveItem: async it => {
          if (it === 'aehren') await say('juenger', 'Erst ausreiben, sonst essen wir mehr Spelzen als Körner.');
          else await say('juenger', 'Danke, aber heute hilft nur etwas Essbares.');
        },
      },
      {
        id: 'jesus_sabbat', name: 'Jesus', rect: [616, 350, 54, 112], walk: [585, 512],
        look: async () => { await say('joel', 'Jesus geht langsam durch das Feld, als gehöre auch dieser Sabbat nicht den Streitenden, sondern Gott.'); },
        talk: async () => {
          if (!F.koernerGerieben) await say('jesus', 'Gebt ihnen zu essen, was am Weg wächst. Der Vater sieht den Hunger.');
          else await say('jesus', 'Der Menschensohn ist Herr über den Sabbat.');
        },
      },
      {
        id: 'pharisaeer_sabbat', name: 'Pharisäer', rect: [742, 378, 122, 112], walk: [700, 512],
        look: async () => { await say('joel', 'Sie stehen am Feldrand. Sehr gerade. Sehr wach. Sehr bereit, aus einer Handvoll Körner eine Anklage zu machen.'); },
        talk: async () => {
          if (!F.koernerGerieben) await say('pharisaeer', 'Wir beobachten nur.');
          else await say('pharisaeer', 'Warum tut ihr, was am Sabbat nicht erlaubt ist?');
        },
      },
      {
        id: 'levi_sabbat', name: 'Levi', rect: [210, 398, 52, 108], walk: [260, 512],
        look: async () => { await say('joel', 'Levi wirkt alt, hungrig und philosophisch beleidigt darüber, dass Getreide so nah und Brot so fern ist.'); },
        talk: async () => {
          if (!F.tookAehren) await say('levi', 'Joel, falls du zufällig Ähren pflücken willst: Ich werde theologisch kauen.');
          else if (!F.koernerGerieben) await say('levi', 'Jetzt reib sie aus. Mein Magen hält eine kleine Predigt gegen Verzögerung.');
          else await say('levi', 'David und Schaubrote. Schimon hätte mindestens dreimal genickt.');
        },
      },
      {
        id: 'kornfeld', name: 'Kornfeld', rect: [380, 300, 360, 190], walk: [520, 512],
        look: async () => {
          if (F.koernerGerieben) await say('joel', 'Das Korn wiegt im Wind. Eine Handvoll davon hat gerade eine ganze Sabbatfrage ausgelöst.');
          else await say('joel', 'Ein Kornfeld am Weg. Am Sabbat ist die Welt stiller – nur der Hunger hält sich nicht immer daran.');
        },
      },
      {
        id: 'weg_sabbat', name: 'Weg durch Galiläa', rect: [0, 420, 108, 112], walk: [80, 508],
        goto: async () => {
          if (F.sabbatDone) await say('joel', 'Weiter geht es bald. Aber diesen Sabbat nehme ich mit.');
          else await say('joel', 'Noch nicht. Die Jünger sind hungrig, und das Feld steht direkt vor uns.');
        },
        look: async () => { await say('joel', 'Der Weg führt weiter durch Galiläa. Staub, Korn, Sabbatruhe – und Jesus mittendrin.'); },
      },
    ],
  },

  synagoge2: {
    hotspots: [
      {
        id: 'mann_hand', name: 'Mann am Rand', rect: [842, 414, 56, 94], walk: [800, 510],
        visible: () => fx.mitte === 0,
        look: async () => {
          await say('joel', 'Er sitzt ganz allein in der letzten Ecke und hält die rechte Hand unter dem Gewand verborgen.');
          if (!F.mannMet) await say('joel', '(Neben ihm ist viel Platz. Zu viel Platz.)');
        },
        talk: talkMannHand,
      },
      {
        id: 'pharisaeer_syn2', name: 'Erste Reihe', rect: [598, 408, 170, 96], walk: [560, 510],
        look: async () => {
          await say('joel', 'Die Schriftgelehrten und Pharisäer sitzen in der ersten Reihe – aber sie schauen nicht auf Jesus. Sie schauen auf den Mann am Rand.');
          await say('erzaehler', 'Sie lauerten darauf, ob Jesus am Sabbat heile, um einen Grund zur Anklage gegen ihn zu finden. (Lukas 6,7)');
          if (!F.lauerErkannt) await say('joel', '(Sie hoffen auf ein Wunder – als Beweisstück. Verkehrte Welt.)');
          F.lauerErkannt = true;
        },
        talk: async () => {
          await say('pharisaeer', 'Wir beobachten nur.');
          await say('joel', 'Das sagtet ihr am Kornfeld auch. Ihr beobachtet sehr... gründlich.');
          F.lauerErkannt = true;
        },
      },
      {
        id: 'levi_syn2', name: 'Levi', rect: [192, 420, 48, 86], walk: [262, 508],
        look: async () => { await say('joel', 'Levi sitzt auf unserem Stammplatz. Wir haben inzwischen einen Stammplatz in einer Synagoge. Schimon würde es nicht glauben.'); },
        talk: async () => {
          if (F.handGeheilt) {
            await say('levi', 'Hast du sein Gesicht gesehen, als die Hand wieder hielt? GENAU so hast du damals geschaut, als das Lamm frei war.');
            await say('joel', 'Das Lamm hat dabei lauter geblökt.');
          } else if (!F.mannMet) {
            await say('levi', 'Der Mann da hinten in der Ecke... Keiner setzt sich zu ihm. Geh du, Joel. Du kannst so was.');
          } else if (!F.lauerErkannt) {
            await say('levi', 'Die erste Reihe starrt nicht auf Jesus, sondern nach hinten. Schau sie dir genauer an – irgendetwas stimmt da nicht.');
          } else {
            await say('levi', 'Setz dich, Joel. Da vorne ist noch Platz. Gleich passiert etwas – ich spüre es in den Knien. Und meine Knie irren NIE.');
          }
        },
      },
      {
        id: 'jesus_syn2', name: 'Jesus', rect: [450, 320, 60, 96], walk: [480, 470],
        look: async () => {
          await say('joel', 'Er lehrt, als wäre dieser Sabbat ein Geschenk und kein Gerichtssaal. Dabei weiß er genau, wer ihm zusieht.');
        },
        talk: async () => { await say('joel', '(Er lehrt gerade. Ich setze mich besser – da vorne ist noch ein Platz frei.)'); },
      },
      {
        id: 'bima_syn2', name: 'Lesepult', rect: [400, 380, 160, 36], noWalk: true,
        look: async () => { await say('joel', 'Das Lesepult der Synagoge von Kapernaum. Kleiner als das in Nazaret – aber heute liegt mehr Spannung darauf.'); },
      },
      {
        id: 'platz_syn2', name: 'Freier Platz', rect: [318, 462, 64, 52], walk: [345, 508],
        goto: async () => {
          if (!F.mannMet) await say('joel', 'Gleich. Erst will ich zu dem Mann am Rand – wer allein sitzt, sitzt schwer.');
          else if (!F.lauerErkannt) await say('joel', 'Moment noch. Erst will ich wissen, warum die erste Reihe so starrt.');
          else await heilungHandCutscene();
        },
        use: async () => {
          if (!F.mannMet) await say('joel', 'Gleich. Erst will ich zu dem Mann am Rand – wer allein sitzt, sitzt schwer.');
          else if (!F.lauerErkannt) await say('joel', 'Moment noch. Erst will ich wissen, warum die erste Reihe so starrt.');
          else await heilungHandCutscene();
        },
        look: async () => { await say('joel', 'Ein freier Platz neben Levi. Erste Reihe der zweiten Reihe, sozusagen.'); },
      },
      {
        id: 'fenster_syn2', name: 'Fenster', rect: [140, 80, 120, 110], noWalk: true,
        look: async () => { await say('joel', 'Sabbatmorgenlicht fällt durch das Fenster – mitten auf die leere Mitte des Raumes. Als hielte sie jemand frei.'); },
      },
      {
        id: 'lampe_syn2', name: 'Öllampe', rect: [770, 108, 72, 94], noWalk: true,
        look: async () => { await say('joel', 'Der Leuchter brennt ruhig. Das einzige hier drin, das heute nicht angespannt ist.'); },
      },
      {
        id: 'ausgang_syn2', name: 'Ausgang', rect: [0, 200, 50, 330], walk: [70, 505],
        goto: async () => { await say('joel', 'Jetzt gehen? Nein. Heute bleibe ich bis zum letzten Wort.'); },
        look: async () => { await say('joel', 'Draußen liegt der Sabbat über Kapernaum. Drinnen hält ein ganzer Raum den Atem an.'); },
      },
    ],
  },

  berg: {
    hotspots: [
      {
        id: 'jesus_berg', name: 'Jesus auf dem Berg', rect: [740, 120, 110, 90], noWalk: true,
        visible: () => !F.jesusUnten,
        look: async () => {
          await say('joel', 'Klein und still kniet er oben am Hang, das Gesicht zum Himmel. Seit Stunden.');
          await say('joel', '(Die ganze Nacht im Gebet. Was für ein Tag muss das sein, der so eine Nacht braucht.)');
        },
        talk: async () => { await say('joel', '(Den störe ich nicht. Diese Nacht gehört ihm und Gott.)'); },
      },
      {
        id: 'reisig_berg', name: 'Reisig', rect: [92, 452, 80, 40], walk: [160, 510],
        visible: () => !F.bergReisig,
        look: async () => { await say('joel', 'Trockenes Gestrüpp am Hang. Ein alter Hirte erkennt gutes Brennholz im Dunkeln. Am Geruch.'); },
        take: async () => {
          F.bergReisig = true;
          addItem('holz');
          await say('joel', 'Ich sammle einen Arm voll Reisig. Die Hände wissen noch genau, wie das geht.');
        },
      },
      {
        id: 'feuer_berg', name: 'Lagerfeuer', rect: [338, 442, 84, 54], walk: [400, 512],
        look: async () => {
          if (F.bergFeuer) await say('joel', 'Das Feuer brennt wieder ordentlich. Die Schläfer rücken im Schlaf näher heran. Kluge Schläfer.');
          else await say('joel', 'Nur noch Glut. Wie damals, auf dem Feld bei Bethlehem. Manche Nächte fangen immer gleich an.');
        },
        use: async () => {
          if (F.bergFeuer) await say('joel', 'Es brennt. Ich bin und bleibe ein Feuermacher-Meister.');
          else await say('joel', 'Mit bloßen Händen in der Glut stochern? Das wusste ich schon vor vierzig Jahren besser. Ich brauche Reisig.');
        },
        useItem: async it => {
          if (it === 'holz') {
            if (F.bergFeuer) { await say('joel', 'Es brennt doch schon.'); return; }
            removeItem('holz');
            F.bergFeuer = true;
            await say('joel', 'Reisig auf die Glut... pusten... HA! Es brennt!');
            await say('joel', 'Vierzig Jahre, und der Trick funktioniert immer noch. Schimon, das war für dich.');
            await say('levi', 'Endlich! Meine Zehen wollten schon kündigen.');
            await checkMorgen();
          } else await say('joel', 'Das gehört nicht ins Feuer.');
        },
      },
      {
        id: 'simon_berg', name: 'Simon', rect: [496, 420, 48, 86], walk: [565, 510],
        look: async () => { await say('joel', 'Simon sitzt am Feuer und starrt hinein, als stünde dort die Antwort auf eine Frage, die er noch nicht zu stellen wagt.'); },
        talk: talkSimonNacht,
      },
      {
        id: 'levi_berg', name: 'Levi', rect: [156, 420, 48, 86], walk: [230, 510],
        look: async () => { await say('joel', 'Levi „wacht“ mit geschlossenen Augen. Die Schule Schimons trägt Früchte.'); },
        talk: async () => {
          if (F.zwoelfDone) {
            await say('levi', 'Zwölf Namen, Joel. Und wir waren dabei, als sie fielen. Erzähl DAS mal einer Herde.');
          } else if (!F.bergFeuer) {
            await say('levi', 'Joel, das Feuer stirbt. Und du bist hier nun mal der mit dem Diplom im Feuermachen.');
          } else if (!F.simonNacht) {
            await say('levi', 'Der Fischer da drüben zermartert sich den Kopf. Red mit ihm – du kannst so was. Ich überwache derweil das Feuer.');
          } else {
            await say('levi', 'Jetzt heißt es warten, bis der Morgen kommt. Das können wir zwei am besten von allen hier.');
          }
        },
      },
      {
        id: 'schlaefer', name: 'Schlafende Jünger', rect: [240, 430, 130, 80], walk: [330, 514],
        look: async () => { await say('joel', 'Andreas, Johannes und die anderen. Sie schlafen den Schlaf derer, die nicht ahnen, dass morgen ihr Name fällt.'); },
        talk: async () => {
          await say('juenger', 'Zzz... nein... die Netze zuerst... zzz...');
          await say('joel', '(Sogar im Schlaf wird gefischt. Berufskrankheit. Ich träume ja auch von Schafen.)');
        },
      },
      {
        id: 'berg_hang', name: 'Der Berg', rect: [560, 90, 400, 280], noWalk: true,
        look: async () => {
          if (F.jesusUnten) await say('joel', 'Der Hang liegt im Morgenlicht. Oben ist jetzt niemand mehr – die Nacht hat ihren Dienst getan.');
          else await say('joel', 'Der Berg steht schwarz gegen die Sterne. Ein schmaler Pfad führt hinauf – und oben kniet einer, der nicht müde wird.');
        },
      },
      {
        id: 'mond_berg', name: 'Mond', rect: [70, 48, 84, 84], noWalk: true,
        visible: () => fx.morgen < 0.5,
        look: async () => { await say('joel', 'Der Mond. Zuverlässigster Kollege der Nachtschicht. Wir kennen uns seit fünfzig Jahren.'); },
      },
      {
        id: 'ebene', name: 'Weg zur Ebene', rect: [0, 420, 70, 112], walk: [80, 508],
        goto: async () => {
          if (F.zwoelfDone) await say('joel', 'Gleich. Wir gehen zusammen hinunter – alle.');
          else await say('joel', 'Jetzt? Mitten in der Nacht? Hier oben wird gewacht, bis er wiederkommt.');
        },
        look: async () => { await say('joel', 'Unten in der Ebene flackern Lagerfeuer. Dort sammeln sich schon die Menschen – sie warten auf den Morgen. (Lukas 6,17)'); },
      },
    ],
  },

  ebene: {
    hotspots: [
      {
        id: 'witwe', name: 'Alte Frau', rect: [70, 426, 52, 90], walk: [140, 510],
        look: async () => {
          if (F.witweGeheilt) await say('joel', 'Sie steht kerzengerade in der ersten Reihe. Wer sie heute zum ersten Mal sieht, würde „krumm“ nie erraten.');
          else await say('joel', 'Eine alte Frau, tief gebeugt über ihren Stock. Sie schaut zur Menge wie auf eine Mauer ohne Tor.');
        },
        talk: talkWitwe,
        goto: async () => { if (!F.witweGeheilt) await talkWitwe(); },
      },
      {
        id: 'steinmetz', name: 'Steinmetz', rect: [766, 400, 48, 105], walk: [730, 510],
        look: async () => { await say('joel', 'Den Mann kenne ich doch... Die rechte Hand öffnet und schließt sich, wieder und wieder. DER STEINMETZ!'); },
        talk: talkSteinmetz,
      },
      {
        id: 'jesus_ebene', name: 'Jesus', rect: [452, 358, 56, 112], walk: [480, 520],
        look: async () => {
          await say('joel', 'Er steht auf einem flachen Stein, damit alle ihn sehen. Kein Thron, kein Podest – ein Feldstein.');
          await say('joel', '(In Bethlehem war es eine Krippe. Er bleibt sich treu.)');
        },
        talk: async () => { await say('joel', '(Die Menge drängt sich um ihn. Gleich beginnt er zu reden – ich sollte vorher fertig sein mit allem.)'); },
      },
      {
        id: 'zwoelf', name: 'Die Zwölf', rect: [560, 380, 200, 110], walk: [560, 515],
        look: async () => { await say('joel', 'Die Zwölf, keinen Tag im Amt. Sie stehen um ihn herum wie neue Hirtenhunde um die Herde: eifrig, stolz und leicht überfordert.'); },
        talk: async () => {
          await say('simon', 'Joel! Er wird gleich zur Menge sprechen. Zu ALLEN. Bleib in der Nähe.');
          await say('joel', 'Ich war bei der ersten Predigt deines Lebens dabei, Fels. Ich verpasse auch diese nicht.');
        },
      },
      {
        id: 'menge_ebene', name: 'Menschenmenge', rect: [140, 420, 280, 100], walk: [350, 515],
        look: async () => { await say('joel', 'Bauern, Fischer, Kranke auf Tragen, Kinder auf Schultern. Aus ganz Judäa, aus Jerusalem, von der Küste – alle wegen ihm. (Lukas 6,17)'); },
        talk: async () => {
          await say('menge', 'Er hat in Kapernaum einen Gelähmten geheilt! Durch das DACH haben sie ihn gebracht!');
          await say('joel', 'Durch das Dach, ja. Ich... habe davon gehört.');
        },
      },
      {
        id: 'levi_ebene', name: 'Levi', rect: [226, 420, 48, 90], walk: [300, 512],
        look: async () => { await say('joel', 'Levi hat sich einen Platz mit Rückenlehne gesucht: einen Feldstein. Erfahrung schlägt Eifer.'); },
        talk: async () => {
          if (F.feldredeDone) await say('levi', 'Auf Fels bauen, Joel. Ich sage nur: auf Fels.');
          else if (!F.witweGeheilt && !F.steinmetzMet) await say('levi', 'Die alte Frau da hinten kommt nicht durch die Menge. Und da drüben winkt dir die ganze Zeit jemand zu. Du bist gefragt, Joel.');
          else if (!F.witweGeheilt) await say('levi', 'Die alte Frau am Rand, Joel. Vierzig Jahre Herden sortieren – wenn EINER sie durchbringt, dann du.');
          else if (!F.steinmetzMet) await say('levi', 'Der Mann da drüben winkt immer noch. Entweder kennt er dich, oder du schuldest ihm Geld.');
          else await say('levi', 'Alles erledigt. Jetzt setz dich – gleich redet er.');
        },
      },
      {
        id: 'feldstein', name: 'Feldstein', rect: [440, 458, 80, 36], noWalk: true,
        look: async () => { await say('joel', 'Ein flacher Feldstein als Kanzel. Der Steinmetz würde sagen: solide gegründet.'); },
      },
      {
        id: 'berg_fern', name: 'Der Berg', rect: [620, 150, 340, 160], noWalk: true,
        look: async () => { await say('joel', 'Der Berg von heute Nacht. Von hier unten sieht er friedlich aus – dabei ist dort oben gerade Weltgeschichte gewählt worden.'); },
      },
      {
        id: 'weg_ebene', name: 'Weg', rect: [896, 410, 64, 122], walk: [900, 490],
        goto: async () => {
          if (F.feldredeDone) await say('joel', 'Gleich. Erst trage ich diese Worte noch ein Stück mit mir herum.');
          else await say('joel', 'Jetzt gehen? Wo gleich die Predigt beginnt? Levi würde mich enterben. Und er besitzt nichts.');
        },
        look: async () => { await say('joel', 'Der Weg zurück nach Kapernaum. Dort wird man heute Abend nur ein Gesprächsthema haben.'); },
      },
    ],
  },

  kapernaum: {
    hotspots: [
      {
        id: 'hauptmann', name: 'Römischer Hauptmann', rect: [716, 392, 90, 114], walk: [690, 510],
        look: async () => {
          if (F.knechtGesund) await say('joel', 'Der Hauptmann steht still vor seiner Tür. Zum ersten Mal heute läuft er nicht auf und ab.');
          else await say('joel', 'Ein römischer Hauptmann. Rüstung tadellos, Haltung tadellos – aber er läuft vor seinem eigenen Haus Wache wie ein Vater vor der Krankenstube.');
        },
        talk: talkHauptmann,
      },
      {
        id: 'aelteste', name: 'Älteste der Stadt', rect: [388, 398, 96, 108], walk: [340, 510],
        look: async () => { await say('joel', 'Zwei Älteste von Kapernaum, die Köpfe zusammengesteckt. Sie schauen abwechselnd zum Haus des Hauptmanns und zu Boden.'); },
        talk: talkAelteste,
      },
      {
        id: 'haus_hauptmann', name: 'Haus des Hauptmanns', rect: [690, 230, 270, 160], noWalk: true,
        look: async () => { await say('joel', 'Ein stattliches Haus mit römischem Anstrich. Hinter einem der Fenster liegt ein Mann im Fieber – und ein ganzes Haus hält den Atem an.'); },
      },
      {
        id: 'tuer_hauptmann', name: 'Tür des Hauses', rect: [786, 390, 64, 102], walk: [830, 512],
        look: async () => {
          if (F.knechtGesund) await say('joel', 'In der Tür steht der Knecht – blass, dünn und QUICKLEBENDIG.');
          else await say('joel', 'Eine schwere Tür mit Bronzebeschlag. Dahinter kämpft jemand mit dem Fieber.');
        },
        use: async () => { await say('joel', 'Ich klopfe nicht an die Tür eines römischen Offiziers. So weit kommt es noch... Außerdem steht er ja direkt davor.'); },
      },
      {
        id: 'synagoge_kap', name: 'Synagoge', rect: [80, 240, 230, 160], noWalk: true,
        look: async () => {
          await say('joel', 'Die Synagoge von Kapernaum – helle Säulen, sauber gefugter Stein. Hier hat Jesus die verdorrte Hand geheilt.');
          await say('joel', '(Und gebaut hat sie... der Römer da drüben. Stein für Stein bezahlt. Die Welt ist verwickelter, als sie aussieht.)');
        },
      },
      {
        id: 'levi_kap', name: 'Levi', rect: [126, 420, 48, 90], walk: [200, 510],
        look: async () => { await say('joel', 'Levi hält betont unauffälligen Abstand zum Hauptmann. Sehr betont. Sehr unauffällig.'); },
        talk: async () => {
          if (F.knechtGesund) {
            await say('levi', '„Sprich nur ein Wort.“ Joel, ich habe Gänsehaut an Stellen, von denen ich nicht wusste, dass man dort Gänsehaut haben kann.');
          } else if (!F.hauptmannMet) {
            await say('levi', 'Da drüben steht ein RÖMER, Joel. Und du schaust ihn an, als wolltest du HINGEHEN.');
            await say('levi', '...Du willst hingehen, oder? Natürlich willst du. „Liebt eure Feinde.“ Ich warte hier. Aus taktischen Gründen.');
          } else if (!F.aeltesteLos) {
            await say('levi', 'Die Ältesten da drüben respektieren den Hauptmann. Wenn EINER sie zum Gehen bewegt, dann du. Du hast heute schon mit einem Römer geredet, dich hält nichts mehr auf.');
          } else {
            await say('levi', 'Jetzt heißt es warten. Das kann ich. Vierzig Jahre Übung.');
          }
        },
      },
      {
        id: 'jesus_kap', name: 'Jesus', rect: [276, 396, 48, 110], walk: [340, 510],
        visible: () => F.jesusKommt,
        look: async () => { await say('joel', 'Er ist mitgekommen, ohne zu zögern. In das Viertel eines Römers. Türschwellen scheinen ihn wirklich nicht zu kümmern.'); },
        talk: async () => { await say('joel', '(Still jetzt. Gleich entscheidet sich alles.)'); },
      },
      {
        id: 'brunnen_kap', name: 'Brunnen', rect: [540, 430, 80, 70], walk: [600, 514],
        look: async () => { await say('joel', 'Der Stadtbrunnen von Kapernaum. Normalerweise das Neuigkeiten-Zentrum – heute ist es verdächtig leer. Alle Neuigkeiten stehen vor dem Haus des Hauptmanns.'); },
        use: async () => { await say('joel', 'Kein Durst. Nur Herzklopfen.'); },
      },
      {
        id: 'weg_kap', name: 'Weg zum See', rect: [0, 420, 50, 112], walk: [70, 508],
        goto: async () => {
          if (F.knechtGesund) await say('joel', 'Gleich, Levi wartet ja schon. Aber so einen Tag verlässt man langsam.');
          else await say('joel', 'Hinunter zum See? Nicht jetzt. Hier steht ein Mann vor seiner Tür und braucht... irgendetwas. Vielleicht einen Hirten.');
        },
        look: async () => { await say('joel', 'Die Gasse führt hinunter zum See. Möwengeschrei bis hier herauf – Kapernaum eben.'); },
      },
    ],
  },

  nain: {
    hotspots: [
      {
        id: 'bahre', name: 'Bahre', rect: [596, 446, 120, 50], walk: [560, 514],
        look: async () => {
          if (F.juenglingLebt) await say('joel', 'Die Bahre steht leer am Wegrand. Der schönste Anblick, den eine Bahre bieten kann.');
          else await say('joel', 'Eine schlichte Holzbahre, darauf eine Gestalt in Leinen. Ich nehme die Mütze ab. Mehr gibt es hier nicht zu tun.');
        },
        take: async () => { await say('joel', 'Nein. Manche Dinge fasst man nicht an.'); },
      },
      {
        id: 'traeger_nain', name: 'Träger', rect: [580, 398, 50, 100], walk: [530, 512],
        look: async () => { await say('joel', 'Vier Männer tragen die Bahre. Sie gehen langsam, im Schritt der Klage. Einer von ihnen sieht aus, als trüge er nicht zum ersten Mal.'); },
        talk: talkNainTraeger,
      },
      {
        id: 'mutter_nain', name: 'Die Witwe', rect: [722, 400, 48, 106], walk: [680, 512],
        look: async () => {
          if (F.juenglingLebt) await say('joel', 'Sie hält ihren Sohn am Arm und lässt ihn nicht mehr los. Vermutlich die nächsten zehn Jahre nicht.');
          else {
            await say('joel', 'Die Mutter geht hinter der Bahre. Der Schleier verdeckt das Gesicht, aber nicht die Haltung – sie trägt mehr zu Grab als einen Sohn.');
            await say('joel', '(Ich werde sie nicht ansprechen. Es gibt Augenblicke, da ist Schweigen der einzige Anstand.)');
          }
        },
        talk: async () => {
          if (F.juenglingLebt) { await say('mutter', 'Gesegnet seid ihr alle! Gesegnet dieser Tag! Gesegnet ER!'); }
          else await say('joel', '(Nein. Ich werde einer Mutter auf diesem Weg keine Fragen stellen. Wenn jemand für sie sprechen kann, dann die Träger.)');
        },
      },
      {
        id: 'juengling_nain', name: 'Der junge Mann', rect: [636, 400, 48, 102], walk: [600, 512],
        visible: () => F.juenglingLebt,
        look: async () => { await say('joel', 'Asa, in Grabtücher gewickelt – und quicklebendig. Er blinzelt in die Sonne, als sähe er sie zum ersten Mal. Vielleicht stimmt das sogar.'); },
        talk: async () => {
          await say('juengling', 'Ich habe Hunger. Ist das... darf man das sagen, an seiner eigenen Beerdigung?');
          await say('joel', 'Junge, heute darfst du ALLES sagen.');
        },
      },
      {
        id: 'menge_nain', name: 'Unsere Menge', rect: [60, 420, 130, 100], walk: [200, 512],
        look: async () => {
          if (F.mengeStill) await say('joel', 'Sie stehen still am Wegrand, die Mützen in der Hand. So gehört es sich.');
          else await say('joel', 'Unsere Begleiter aus Kapernaum – noch ganz laut vom gestrigen Tag. Sie haben den Trauerzug nicht bemerkt. Noch nicht.');
        },
        talk: beruhigeMenge,
      },
      {
        id: 'jesus_nain', name: 'Jesus', rect: [226, 396, 48, 110], walk: [290, 510],
        look: async () => {
          if (F.juenglingLebt) await say('joel', 'Er steht etwas abseits, während die Mutter ihren Sohn hält. Er drängt sich nie in seine eigenen Wunder.');
          else await say('joel', 'Er hat die Witwe gesehen. Sein Blick... ich kenne diesen Blick. So schaut ein Hirte, wenn ein Lamm im Dornbusch hängt.');
        },
        talk: async () => { await say('joel', '(Er hat nur Augen für die Frau hinter der Bahre. Ich störe ihn jetzt nicht.)'); },
      },
      {
        id: 'klagefrauen', name: 'Klagefrauen', rect: [800, 410, 110, 100], walk: [760, 514],
        look: async () => {
          if (F.juenglingLebt) await say('joel', 'Die Klagefrauen wissen nicht wohin mit ihren Liedern. Eine versucht es vorsichtig mit einem Loblied. Es passt besser.');
          else await say('joel', 'Klagefrauen mit Flöten. Ihre Lieder sind so alt wie der Tod selbst – und genauso müde.');
        },
        talk: async () => {
          if (F.juenglingLebt) await say('menge', '♪ Gelobt sei, der sein Volk besucht... ♪');
          else await say('joel', '(Die Klage unterbricht man nicht. Sie ist ihr Dienst – und ihr Brot.)');
        },
      },
      {
        id: 'tor_nain', name: 'Stadttor von Nain', rect: [760, 200, 200, 180], noWalk: true,
        look: async () => { await say('joel', 'Das Stadttor von Nain. Klein, staubig, unbedeutend – bis heute. Ab morgen kennt jeder in Judäa diesen Torbogen. (Lukas 7,17)'); },
      },
      {
        id: 'zypressen_nain', name: 'Zypressen', rect: [380, 250, 120, 170], noWalk: true,
        look: async () => { await say('joel', 'Zypressen am Weg – die Bäume der Gräber. Sie stehen hier, weil dahinter die Grabhöhlen liegen.'); },
      },
      {
        id: 'weg_nain', name: 'Weg zurück', rect: [0, 420, 46, 112], walk: [66, 508],
        goto: async () => {
          if (F.juenglingLebt) await say('joel', 'Gleich. Solche Augenblicke verlässt man rückwärts, mit dem Gesicht zum Wunder.');
          else await say('joel', 'Jetzt umkehren? Nein. Was auch immer hier gleich geschieht – ich bleibe.');
        },
        look: async () => { await say('joel', 'Der Weg zurück nach Norden, nach Kapernaum. Ein Tagesmarsch, der sich heute gelohnt hat.'); },
      },
    ],
  },

  johannesfrage: {
    hotspots: [
      {
        id: 'boten_johannes', name: 'Boten des Johannes', rect: [392, 402, 92, 106], walk: [360, 512],
        look: async () => {
          if (F.antwortGesandt) await say('joel', 'Die Boten stehen schon am Weg. Sie tragen mehr zurück als eine Antwort: ein ganzes Bündel Zeichen.');
          else await say('joel', 'Zwei Jünger des Johannes. Staub vom Jordan an den Sandalen, Sorge in den Gesichtern.');
        },
        talk: talkJohannesBote,
      },
      {
        id: 'blinder_johannes', name: 'Blinder Mann', rect: [678, 408, 58, 100], walk: [650, 512],
        look: async () => {
          if (F.blinderGeheilt) await say('joel', 'Er dreht den Kopf von Gesicht zu Gesicht, als wolle er jedes Licht behalten.');
          else await say('joel', 'Ein blinder Mann am Rand der Menge. Er hört alles, aber niemand schafft ihm Platz.');
        },
        talk: hilfBlindem,
        goto: async () => { if (!F.blinderGeheilt) await hilfBlindem(); },
      },
      {
        id: 'arme_johannes', name: 'Arme Leute', rect: [122, 420, 120, 92], walk: [245, 512],
        look: async () => {
          if (F.armeHoeren) await say('joel', 'Sie stehen jetzt näher bei Jesus. Keine erste Reihe aus Rang – nur aus Hunger nach einem guten Wort.');
          else await say('joel', 'Ein paar Arme am Rand: abgetragene Mäntel, leere Beutel, offene Ohren.');
        },
        talk: lassArmeHoeren,
      },
      {
        id: 'jesus_johannes', name: 'Jesus', rect: [560, 362, 60, 112], walk: [555, 514],
        look: async () => {
          await say('joel', 'Er steht mitten unter Kranken, Armen und Fragenden. Eine Antwort mit Händen und Füßen.');
        },
        talk: async () => {
          if (F.blinderGeheilt && F.armeHoeren && !F.antwortGesandt) await johannesAntwortCutscene();
          else if (F.antwortGesandt) await say('joel', '(Er hat geantwortet. Jetzt muss Johannes hören, was hier geschehen ist.)');
          else await say('joel', '(Noch nicht. Die Boten sollen sehen und hören, bevor er ihnen antwortet.)');
        },
      },
      {
        id: 'levi_johannes', name: 'Levi', rect: [292, 418, 48, 90], walk: [318, 512],
        look: async () => { await say('joel', 'Levi beobachtet die Boten, als wären sie ein schwieriges Rätsel mit Sandalen.'); },
        talk: async () => {
          if (F.antwortGesandt) await say('levi', 'Blinde sehen, Tote leben, Arme hören gute Nachricht. Joel, wenn das keine Antwort ist, weiß ich auch nicht.');
          else if (!F.blinderGeheilt && !F.armeHoeren) await say('levi', 'Der blinde Mann rechts und die armen Leute links, Joel. Ich glaube, die Antwort liegt heute nicht in einem Satz, sondern in dem, was geschieht.');
          else if (!F.blinderGeheilt) await say('levi', 'Der blinde Mann findet nicht durch die Menge. Ein Hirtenarm wäre nützlich.');
          else if (!F.armeHoeren) await say('levi', 'Die Armen links hören kaum ein Wort. Bring sie näher, bevor die Boten wieder gehen.');
          else await say('levi', 'Jetzt rede mit Jesus. Ich glaube, die Boten haben genug gesehen.');
        },
      },
      {
        id: 'menge_johannes', name: 'Menschenmenge', rect: [470, 408, 260, 104], walk: [470, 514],
        look: async () => { await say('joel', 'Kranke, Neugierige, Jünger, Zweifler. Eine Menge voller Fragen – und mittendrin Antworten, die atmen.'); },
        talk: async () => {
          await say('menge', 'Ist das nicht der aus Nazaret? Hat er nicht in Nain den jungen Mann auferweckt?');
          await say('joel', 'Ja. Und offenbar war Nain nicht das Ende der Frage, sondern ihr Anfang.');
        },
      },
      {
        id: 'weg_jordan', name: 'Weg zum Jordan', rect: [0, 416, 58, 116], walk: [70, 508],
        look: async () => { await say('joel', 'Der Weg hinunter Richtung Jordan. Irgendwo hinter Herodes Mauern wartet Johannes auf Antwort.'); },
        goto: async () => {
          if (F.antwortGesandt) await say('joel', 'Die Boten gehen diesen Weg. Ich bleibe hier und lasse ihre Frage in mir nachhallen.');
          else await say('joel', 'Nicht jetzt. Die Boten sind gekommen, und die Antwort steht noch offen.');
        },
      },
      {
        id: 'haus_johannes', name: 'Haus am Weg', rect: [720, 246, 210, 156], noWalk: true,
        look: async () => { await say('joel', 'Ein schlichtes Haus am Weg, davor Schatten für die Kranken. Heute ist es fast eine offene Tür zum Reich Gottes.'); },
      },
      {
        id: 'huegel_johannes', name: 'Hügel Galiläas', rect: [0, 150, 300, 190], noWalk: true,
        look: async () => { await say('joel', 'Die Hügel Galiläas. Von Ort zu Ort verbreitet sich, was Jesus tut – sogar bis in ein Gefängnis.'); },
      },
    ],
  },

  pharisaeerhaus: {
    hotspots: [
      {
        id: 'simon_pharisaeer', name: 'Simon der Pharisäer', rect: [322, 368, 62, 112], walk: [300, 510],
        look: async () => { await say('joel', 'Simon beobachtet Jesus genauer als sein eigenes Gastmahl. Er hat eingeladen, aber noch nicht entschieden, ob er willkommen heißt.'); },
        talk: redeSimonPharisaeer,
      },
      {
        id: 'jesus_pharisaeerhaus', name: 'Jesus', rect: [568, 366, 68, 110], walk: [550, 510],
        look: async () => {
          if (F.frauVergeben) await say('joel', 'Er sieht die Frau an, nicht ihren Ruf. In diesem Blick liegt der Frieden, mit dem sie gehen darf.');
          else await say('joel', 'Jesus liegt wie die anderen Gäste am niedrigen Tisch. Er scheint Simons prüfende Blicke längst bemerkt zu haben.');
        },
        talk: async () => {
          if (F.frauVergeben) await say('joel', '(Seine letzten Worte gehören ihr: Geh in Frieden. Ich will diesen Frieden nicht mit einer neuen Frage unterbrechen.)');
          else await say('joel', '(Noch ist er Simons Gast. Ich sollte zuerst verstehen, was bei diesem Empfang fehlt.)');
        },
      },
      {
        id: 'waschbecken_pharisaeerhaus', name: 'Leeres Waschbecken', rect: [72, 432, 86, 66], walk: [176, 510],
        look: bemerkeWasser,
        use: bemerkeWasser,
      },
      {
        id: 'salboel_pharisaeerhaus', name: 'Salböl im Regal', rect: [188, 244, 58, 72], walk: [224, 500],
        look: bemerkeOel,
      },
      {
        id: 'frau_pharisaeerhaus', name: 'Frau mit dem Alabastergefäß', rect: [650, 398, 92, 112], walk: [750, 510],
        visible: () => F.frauEingetreten,
        look: async () => {
          if (F.frauVergeben) await say('joel', 'Ihre Tränen sind noch da, aber die Scham bestimmt ihren Blick nicht mehr. Sie hat Frieden gehört.');
          else await say('joel', 'Sie kniet bei Jesu Füßen. In ihren Händen ein zerbrochenes Gefäß, in ihrem Gesicht Tränen und Entschlossenheit.');
        },
        talk: async () => { await say('joel', '(Sie braucht gerade keine Frage von mir. Sie ist mit allem, was sie sagen will, zu Jesus gekommen.)'); },
      },
      {
        id: 'levi_pharisaeerhaus', name: 'Levi', rect: [246, 404, 48, 102], walk: [260, 512],
        look: async () => { await say('joel', 'Levi versucht, zugleich die Speisen und die Stimmung zu beurteilen. Die Stimmung verliert.'); },
        talk: async () => {
          if (F.frauVergeben) await say('levi', 'Zwei Schuldner, beide zahlungsunfähig, beiden erlassen. Simon dachte, hier werde nur die Frau beurteilt.');
          else if (!F.wasserVermisst) await say('levi', 'Fang an der Tür an. Dort steht sonst Wasser für die Füße eines Gastes.');
          else if (!F.kussVermisst) await say('levi', 'Sprich mit Simon. Ein Gastgeber begrüßt nicht nur mit einer geöffneten Tür.');
          else if (!F.oelVermisst) await say('levi', 'Im Regal steht Öl. Merkwürdig unberührt für ein Haus, das einen Lehrer ehren will.');
          else await say('levi', 'Jetzt haben wir alles gesehen, was fehlt. Und da kommt jemand durch die Tür, die mehr mitbringt, als Simon zurückhielt.');
        },
      },
      {
        id: 'gaeste_pharisaeerhaus', name: 'Gäste am Tisch', rect: [408, 354, 310, 126], walk: [470, 510],
        look: async () => { await say('joel', 'Gelehrte Männer an einem reichen Tisch. Manche hören Jesus zu, andere warten offenbar darauf, dass er einen Fehler macht.'); },
        talk: async () => {
          if (F.frauVergeben) await say('menge', 'Wer ist dieser, dass er sogar Sünden vergibt?');
          else await say('menge', 'Simon hat den Lehrer aus Nazaret eingeladen. Heute werden wir sehen, was an all den Berichten wahr ist.');
        },
      },
      {
        id: 'tisch_pharisaeerhaus', name: 'Gastmahl', rect: [390, 432, 330, 74], walk: [460, 520],
        look: async () => { await say('joel', 'Brot, Kräuter, Früchte und Wein. Simon hat an alles für den Tisch gedacht. Nur beim Willkommen scheint er gespart zu haben.'); },
      },
      {
        id: 'tuer_pharisaeerhaus', name: 'Offene Tür', rect: [820, 286, 118, 220], walk: [790, 510],
        look: async () => { await say('joel', 'Bei einem Gastmahl bleibt die Tür offen. Neugierige dürfen am Rand stehen und zuhören. Heute wird jemand durch diese Tür kommen, den Simon nicht eingeladen hat.'); },
        goto: async () => { await say('joel', 'Ich gehe noch nicht. Dieses Mahl hat gerade erst begonnen.'); },
      },
    ],
  },

  saemannfeld: {
    hotspots: [
      {
        id: 'saatbeutel_saemann', name: 'Saatbeutel', rect: [420, 390, 54, 48], walk: [410, 510],
        visible: () => !F.samenErhalten,
        look: async () => { await say('joel', 'Ein grober Leinenbeutel, fast bis zum Rand mit Saatkörnern gefüllt.'); },
        take: nimmSaatkoerner,
      },
      {
        id: 'saemann_saemannfeld', name: 'Sämann', rect: [444, 318, 62, 116], walk: [420, 506],
        look: async () => { await say('joel', 'Seine Bewegung ist ruhig und geübt: greifen, ausholen, säen. Das Korn fällt weiter, als seine Hand reicht.'); },
        talk: async () => {
          if (!F.samenErhalten) await say('saemann', 'Nimm dir Saat aus dem Beutel zu meinen Füßen. Dann probiere jeden der vier Böden.');
          else if (!F.wegBesaet || !F.felsBesaet || !F.dornenBesaet || !F.guterBodenBesaet) await say('saemann', 'Derselbe Same, Joel. Achte darauf, was der jeweilige Boden daraus werden lässt.');
          else await say('saemann', 'Jetzt hör auf den Lehrer. Er spricht nicht mehr nur von meinem Feld.');
        },
      },
      {
        id: 'jesus_saemannfeld', name: 'Jesus', rect: [526, 252, 72, 122], walk: [540, 500],
        look: async () => { await say('joel', 'Jesus sieht den Sämann, die Böden und die Menschenmenge zugleich. In seinem Blick gehört alles zu einer Geschichte.'); },
        talk: async () => {
          if (F.gleichnisErklaert) await say('joel', '(Das Wort ist der Same. Die Frage liegt jetzt nicht mehr auf dem Feld, sondern in meinem Herzen.)');
          else await say('joel', '(Er lässt uns erst säen und sehen. Die Erklärung wird kommen, wenn das Bild vollständig ist.)');
        },
      },
      {
        id: 'frauen_saemannfeld', name: 'Maria Magdalena, Johanna und Susanna', rect: [176, 320, 160, 112], walk: [180, 505],
        look: async () => { await say('joel', 'Drei der Frauen, die mit Jesus reisen. Ohne ihre Treue, ihre Arbeit und ihre Unterstützung wäre der tägliche Weg viel schwerer.'); },
        talk: async () => {
          await say('magdalena', 'Jesus hat uns nicht nur gesund gemacht und dann zurückgelassen. Er hat uns in seine Gemeinschaft gerufen.');
          await say('johanna', 'Viele sehen die Predigt. Weniger sehen das Brot, die Wege und die Unterkunft. Aber auch das trägt die gute Nachricht weiter.');
          await say('susanna', 'Und heute trägt ein einfacher Sämann sie weiter. Schau dir seine Böden an, Joel.');
        },
      },
      {
        id: 'juenger_saemannfeld', name: 'Die Zwölf', rect: [600, 292, 160, 134], walk: [620, 500],
        look: async () => { await say('joel', 'Die Zwölf stehen dicht bei Jesus. Auch sie hören das Gleichnis zuerst wie alle anderen – und müssen nach seiner Bedeutung fragen.'); },
        talk: async () => {
          if (F.gleichnisErklaert) await say('juenger', 'Dasselbe Wort, verschiedene Herzen. Wir werden noch lernen müssen, wirklich zu hören.');
          else await say('juenger', 'Der Weg, die Felsen, die Dornen und der gute Boden. Vollende die Aussaat, Joel; dann fragen wir den Meister nach der Bedeutung.');
        },
      },
      {
        id: 'wegboden_saemannfeld', name: 'Harter Weg', rect: [0, 430, 205, 110], walk: [110, 514],
        look: async () => {
          if (F.wegBesaet) await say('joel', 'Nur leere Spelzen und Vogelspuren. Der harte Weg hat kein Korn aufgenommen.');
          else await say('joel', 'Festgetretener Boden. Hier laufen jeden Tag Menschen und Tiere; ein Korn kann kaum eindringen.');
        },
        use: async () => { await say('joel', 'Ich sollte die Saatkörner im Inventar auswählen und sie auf den Weg streuen.'); },
        useItem: async it => { if (it === 'samen') await saeeAufBoden('weg'); else await say('joel', 'Auf diesen Weg gehört jetzt nur Saat.'); },
      },
      {
        id: 'felsboden_saemannfeld', name: 'Felsiger Boden', rect: [210, 430, 205, 110], walk: [315, 514],
        look: async () => {
          if (F.felsBesaet) await say('joel', 'Dünne, verdorrte Halme über flachem Fels. Sie hatten einen schnellen Anfang, aber keine Tiefe.');
          else await say('joel', 'Eine dünne Schicht Erde verdeckt den Fels. Oberflächlich sieht der Boden besser aus, als er ist.');
        },
        use: async () => { await say('joel', 'Mit den Saatkörnern könnte ich sehen, wie wenig Erde über diesem Fels liegt.'); },
        useItem: async it => { if (it === 'samen') await saeeAufBoden('fels'); else await say('joel', 'Das hilft dem felsigen Boden nicht.'); },
      },
      {
        id: 'dornenboden_saemannfeld', name: 'Boden unter Dornen', rect: [425, 430, 210, 110], walk: [530, 514],
        look: async () => {
          if (F.dornenBesaet) await say('joel', 'Zwischen den Dornen stehen schwache Halme ohne Frucht. Alles wächst, aber nur eines behält Raum und Licht.');
          else await say('joel', 'Zwischen dem Boden warten alte Dornenwurzeln. Was hier wächst, muss um Licht und Wasser kämpfen.');
        },
        use: async () => { await say('joel', 'Ich soll auch hier Saat ausstreuen, obwohl die Dornen schon auf ihren Vorteil warten.'); },
        useItem: async it => { if (it === 'samen') await saeeAufBoden('dornen'); else await say('joel', 'Das lege ich nicht zwischen die Dornen.'); },
      },
      {
        id: 'guterboden_saemannfeld', name: 'Guter Boden', rect: [645, 430, 315, 110], walk: [760, 514],
        look: async () => {
          if (F.guterBodenBesaet) await say('joel', 'Kräftige Halme voller Ähren. Der Boden hat aufgenommen, bewahrt und Frucht hervorgebracht.');
          else await say('joel', 'Dunkle, lockere Erde, tief genug für Wurzeln und frei von Dornen. Ein Boden, der Saat aufnehmen kann.');
        },
        use: async () => { await say('joel', 'Der gute Boden wartet auf die Saatkörner aus dem Beutel.'); },
        useItem: async it => { if (it === 'samen') await saeeAufBoden('gut'); else await say('joel', 'Guter Boden macht nicht jeden Gegenstand zu Saat.'); },
      },
      {
        id: 'doerfer_saemannfeld', name: 'Dörfer Galiläas', rect: [0, 120, 260, 176], noWalk: true,
        look: async () => { await say('joel', 'Dörfer zwischen den Hügeln. Von dort sind die Menschen gekommen, und dorthin wird das Wort nach diesem Tag zurückgetragen.'); },
      },
    ],
  },

  sturmsee: {
    hotspots: [
      {
        id: 'segel_sturmsee', name: 'Schlagendes Segel', rect: [408, 118, 174, 258], walk: [430, 438],
        look: async () => {
          if (F.sturmGestillt) await say('joel', 'Das Segel tropft im stillen Wind. Eben wollte es noch den Mast aus dem Boot reißen.');
          else if (F.sturmSegelGesichert) await say('joel', 'Nass und eng zusammengeschnürt. Die Leinen halten trotz des Sturms.');
          else await say('joel', 'Der Wind fährt unter das Segel und schlägt es wie ein riesiges Tuch gegen Mast und Leinen.');
        },
        use: sichereSturmsegel,
      },
      {
        id: 'wasser_sturmsee', name: 'Wasser im Boot', rect: [250, 400, 360, 116], walk: [390, 448],
        look: async () => {
          if (F.sturmGestillt) await say('joel', 'Das restliche Wasser schwappt nur noch mit unseren Bewegungen, nicht mehr mit dem Zorn des Sees.');
          else if (F.sturmWasserGeschoepft) await say('joel', 'Weniger als zuvor, aber die Wellen schenken uns immer wieder neues Wasser nach.');
          else await say('joel', 'Das Boot läuft voll. Zwischen den Planken liegt ein Schöpfgefäß – klein, aber besser als bloße Hände.');
        },
        use: schoepfeSturmwasser,
      },
      {
        id: 'simon_sturmsee', name: 'Simon', rect: [520, 298, 74, 126], walk: [520, 440],
        look: async () => { await say('joel', 'Simon kennt Boote und Stürme. Dass selbst er Angst hat, sagt mehr als der schwarze Himmel.'); },
        talk: redeSturmSimon,
      },
      {
        id: 'jesus_sturmsee', name: 'Jesus', rect: [665, 312, 120, 120], walk: [630, 438],
        look: async () => {
          if (F.sturmGestillt) await say('joel', 'Jesus steht im Boot, und um ihn ist dieselbe Stille wie auf dem Wasser.');
          else await say('joel', 'Mitten im Sturm schläft Jesus. Die Jünger kämpfen sich bereits zu ihm durch.');
        },
        talk: async () => {
          if (F.sturmGestillt) await say('joel', '(Seine Frage steht noch im Raum: Wo ist euer Glaube?)');
          else if (!F.sturmSegelGesichert || !F.sturmWasserGeschoepft) await say('joel', '(Allein komme ich nicht sicher zu ihm. Erst müssen wir das Segel bändigen und einen Weg durch das Wasser schaffen.)');
          else await redeSturmSimon();
        },
      },
      {
        id: 'levi_sturmsee', name: 'Levi', rect: [316, 304, 70, 124], walk: [350, 442],
        look: async () => { await say('joel', 'Levi klammert sich mit einer Hand an die Bordwand und versucht mit der anderen, nicht den ganzen See zu schlucken.'); },
        talk: async () => {
          if (!F.sturmSegelGesichert) await say('levi', 'Das Segel zuerst! Wenn der Mast bricht, hilft uns auch der beste Eimer nicht.');
          else if (!F.sturmWasserGeschoepft) await say('levi', 'Die Leinen halten. Jetzt benutze das Schöpfgefäß bei deinen Füßen!');
          else await say('levi', 'Zu Simon, Joel! Wir müssen Jesus wecken, bevor der See das Boot endgültig nimmt.');
        },
      },
      {
        id: 'juenger_sturmsee', name: 'Verängstigte Jünger', rect: [430, 304, 88, 126], walk: [470, 442],
        look: async () => { await say('joel', 'Fischer, die seit ihrer Kindheit auf diesem See arbeiten. Jetzt steht ihnen die Furcht ins Gesicht geschrieben.'); },
        talk: async () => {
          if (F.sturmGestillt) await say('juenger', 'Wind und Wasser haben auf ein einziges Wort gehört. Wer ist dieser?');
          else await say('juenger', 'Das Boot läuft voll! Hilf uns mit Segel und Wasser, dann wecken wir den Meister!');
        },
      },
      {
        id: 'see_sturmsee', name: 'Aufgewühlter See', rect: [0, 180, 960, 360], noWalk: true,
        look: async () => {
          if (F.sturmGestillt) await say('joel', 'Glatt bis zum Horizont. Als hätte der See selbst erschrocken aufgehört zu atmen.');
          else await say('joel', 'Wellen wie dunkle Hügel. Jede einzelne scheint hoch genug, um unser Boot zu begraben.');
        },
      },
    ],
  },
};

async function tryWarn() {
  if (F.fleeing) { await say('joel', 'Sie sind schon unterwegs.'); return; }
  if (!F.soldierBusy) {
    await say('joel', 'Nicht, solange der Soldat jede Bewegung an dieser Tür beobachtet.');
    await say('joel', '(Ich würde ihn ja geradewegs zum Kind führen. Erst muss er WEG von hier.)');
  } else {
    await warnFamily();
  }
}

function hotspotAt(x, y) {
  for (const hs of rooms[state.room].hotspots) {
    if (hs.visible && !hs.visible()) continue;
    const [rx, ry, rw, rh] = hs.rect;
    if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return hs;
  }
  return null;
}

/* ============================================================
   GRAFIK
   ============================================================ */

function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function glow(x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A)', alpha + ')'));
  g.addColorStop(1, color.replace('A)', '0)'));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawPerson(x, y, o) {
  const f = o.facing || 1, sk = o.skin || '#d8a87a';
  if (o.mode === 'sit') {
    px(x - 17, y - 12, 36, 12, shade(o.tunic, -20));      // gefaltete Beine
    px(x - 15, y - 54, 30, 44, o.tunic);                  // Körper
    px(x - 15, y - 32, 30, 4, shade(o.tunic, -30));       // Gürtel
    px(x - 7, y - 74, 16, 20, sk);                        // Kopf
    px(x - 10, y - 79, 22, 8, o.cloth);                   // Kopftuch
    px(x - 12, y - 74, 4, 18, o.cloth);
    px(x + 8, y - 74, 4, 18, o.cloth);
    ctx.fillStyle = '#1a1a1a';
    if (o.asleep) { ctx.fillRect(x - 4, y - 66, 4, 1); ctx.fillRect(x + 2, y - 66, 4, 1); }
    else { ctx.fillRect(x - 3 + f * 2, y - 68, 2, 3); ctx.fillRect(x + 3 + f * 2, y - 68, 2, 3); }
  } else {
    const ph = o.walk ? Math.sin(o.walk) * 5 : 0;
    px(x - 10 + ph, y - 24, 8, 24, '#3a2c1e');            // Beine
    px(x + 2 - ph, y - 24, 8, 24, '#33271b');
    px(x - 9, y - 3, 9, 3, '#241a10');                    // Füße
    px(x + 1, y - 3, 9, 3, '#241a10');
    px(x - 16, y - 78, 32, 56, o.tunic);                  // Gewand
    px(x - 16, y - 46, 32, 4, shade(o.tunic, -30));       // Gürtel
    px(x - 21, y - 74, 6, 30, shade(o.tunic, -12));       // Arme
    px(x + 15, y - 74, 6, 30, shade(o.tunic, -12));
    px(x - 8, y - 98, 16, 20, sk);                        // Kopf
    px(x - 11, y - 103, 22, 8, o.cloth);                  // Kopftuch
    px(x - 13, y - 98, 4, 22, o.cloth);
    px(x + 9, y - 98, 4, 22, o.cloth);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 4 + f * 2, y - 91, 2, 3);
    ctx.fillRect(x + 2 + f * 2, y - 91, 2, 3);
  }
}

function drawSheep(x, y, t, i) {
  const bob = Math.sin(t * 1.4 + i * 2) * 1.5;
  px(x - 10, y - 6, 6, 6, '#3a3a3a');                     // Beine
  px(x + 5, y - 6, 6, 6, '#3a3a3a');
  ctx.fillStyle = '#ddd6c4';
  for (const [ox, oy, r] of [[-9, -14, 9], [0, -17, 11], [9, -14, 9], [0, -12, 11]]) {
    ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, 7); ctx.fill();
  }
  px(x + 12, y - 22 + bob, 11, 10, '#4a4038');            // Kopf
  px(x + 11, y - 24 + bob, 5, 4, '#4a4038');              // Ohr
  ctx.fillStyle = '#111';
  ctx.fillRect(x + 19, y - 19 + bob, 2, 2);
}

function drawFire(x, y, lit, t) {
  px(x - 20, y - 5, 40, 6, '#4a3320');
  px(x - 15, y - 10, 30, 6, '#3a2818');
  if (lit) {
    glow(x, y - 18, 130, 'rgba(255,150,50,A)', 0.16);
    for (let i = 0; i < 3; i++) {
      const fl = Math.sin(t * 11 + i * 2.4) * 5;
      const hgt = 26 + i * 7 + fl;
      ctx.fillStyle = ['#ff5a1f', '#ff9a2a', '#ffd84a'][i];
      ctx.beginPath();
      ctx.moveTo(x - 12 + i * 5, y - 8);
      ctx.lineTo(x - 2 + i * 2 + fl * 0.4, y - 8 - hgt);
      ctx.lineTo(x + 12 - i * 4, y - 8);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    const p = (Math.sin(t * 2.2) + 1) / 2;
    ctx.fillStyle = `rgba(255,${70 + p * 60},30,${0.5 + p * 0.4})`;
    ctx.fillRect(x - 6, y - 11, 4, 3);
    ctx.fillRect(x + 3, y - 12, 4, 3);
    ctx.fillStyle = 'rgba(120,120,120,0.25)';
    ctx.fillRect(x - 1 + Math.sin(t * 1.5) * 3, y - 40, 3, 26);
  }
}

function drawStar(x, y, g, t) {
  if (g <= 0) return;
  const tw = 1 + Math.sin(t * 5) * 0.07;
  glow(x, y, 90 * g * tw, 'rgba(255,250,210,A)', 0.5 * g);
  ctx.strokeStyle = `rgba(255,252,230,${0.85 * g})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 100 * g * tw); ctx.lineTo(x, y + 150 * g * tw);
  ctx.moveTo(x - 60 * g * tw, y);  ctx.lineTo(x + 60 * g * tw, y);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 32 * g, y - 32 * g); ctx.lineTo(x + 32 * g, y + 32 * g);
  ctx.moveTo(x + 32 * g, y - 32 * g); ctx.lineTo(x - 32 * g, y + 32 * g);
  ctx.stroke();
  ctx.fillStyle = '#fffdf0';
  ctx.beginPath(); ctx.arc(x, y, 7 * g * tw, 0, 7); ctx.fill();
}

function drawAngel(x, y, t) {
  const bob = Math.sin(t * 2) * 5;
  const yy = y + bob;
  glow(x, yy - 50, 130, 'rgba(180,230,255,A)', 0.45 * fx.angelGlow);
  ctx.fillStyle = 'rgba(240,248,255,0.8)';
  ctx.beginPath(); ctx.ellipse(x - 38, yy - 62, 26, 13, -0.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 38, yy - 62, 26, 13, 0.6, 0, 7); ctx.fill();
  px(x - 18, yy - 72, 36, 72, '#f4f6ff');                 // Gewand
  px(x - 24, yy - 66, 7, 26, '#e8ecfa');                  // Arme
  px(x + 17, yy - 66, 7, 26, '#e8ecfa');
  px(x - 8, yy - 92, 16, 20, '#e8c9a0');                  // Kopf
  px(x - 10, yy - 96, 20, 7, '#e8d9a0');                  // Haar
  ctx.strokeStyle = 'rgba(255,235,140,0.9)';              // Heiligenschein
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, yy - 84, 17, 0, 7); ctx.stroke();
}

/* --------------- Raum: Feld --------------- */

const STARS = [];
for (let i = 0; i < 90; i++) {
  STARS.push({ x: (i * 173.3) % 960, y: (i * 97.7) % 380, r: 0.6 + (i % 3) * 0.5, ph: i * 1.7 });
}

/* --------------- Raum: Feld am Tag --------------- */

function drawFeldTag(t) {
  const s = fx.sonne;                                     // 0 = Nachmittag, 1 = Sonnenuntergang

  // Himmel: Spätnachmittag, mit der Cutscene ins Abendrot kippend
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, '#6fa9dd');
  sky.addColorStop(1, '#cfe6ef');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 420);
  if (s > 0) {
    const rot = ctx.createLinearGradient(0, 0, 0, 420);
    rot.addColorStop(0, `rgba(50,40,90,${0.55 * s})`);
    rot.addColorStop(0.6, `rgba(200,90,60,${0.4 * s})`);
    rot.addColorStop(1, `rgba(255,150,70,${0.5 * s})`);
    ctx.fillStyle = rot;
    ctx.fillRect(0, 0, W, 420);
  }

  // sinkende Sonne im Westen
  const sy = 110 + s * 240;
  glow(160, sy, 130, 'rgba(255,220,130,A)', 0.3 + 0.15 * s);
  ctx.fillStyle = s < 0.5 ? '#fff2c0' : '#ffba60';
  ctx.beginPath(); ctx.arc(160, sy, 26, 0, 7); ctx.fill();

  // Schwalben
  ctx.strokeStyle = 'rgba(40,50,70,0.75)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const bx = ((t * 26 + i * 320) % 1100) - 70;
    const by = 80 + i * 38 + Math.sin(t * 2.2 + i * 2) * 7;
    ctx.beginPath();
    ctx.moveTo(bx - 7, by);
    ctx.quadraticCurveTo(bx - 3, by - 5, bx, by);
    ctx.quadraticCurveTo(bx + 3, by - 5, bx + 7, by);
    ctx.stroke();
  }

  // Hügel mit Bethlehem (Tagfarben)
  ctx.fillStyle = '#4a7038';
  ctx.beginPath(); ctx.ellipse(840, 415, 200, 68, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(80, 418, 220, 45, 0, Math.PI, 0); ctx.fill();
  for (const [hx, hy, hw, hh] of [[760, 364, 26, 22], [792, 352, 32, 34], [830, 358, 26, 28], [862, 348, 34, 38], [902, 362, 24, 24]]) {
    px(hx, hy, hw, hh, '#cfc2a0');
    px(hx, hy, hw, 5, '#8a7a5e');
    px(hx + 5, hy + 9, 5, 6, '#3a3026');
  }

  // Wiese
  px(0, 405, W, 135, '#4a7c36');
  ctx.fillStyle = '#558a3e';
  for (let i = 0; i < 26; i++) px((i * 167) % 940, 420 + (i * 53) % 110, 14, 3, '#558a3e');

  // Bach unten links
  ctx.fillStyle = '#3f7ea6';
  ctx.beginPath();
  ctx.moveTo(0, 468);
  ctx.quadraticCurveTo(85, 492, 138, 540);
  ctx.lineTo(0, 540);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `rgba(220,240,250,${0.4 + 0.2 * Math.abs(Math.sin(t * 2.4))})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(14, 486); ctx.quadraticCurveTo(50, 496, 80, 514); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, 478); ctx.quadraticCurveTo(72, 490, 104, 512); ctx.stroke();

  // Weg nach Bethlehem
  ctx.fillStyle = '#9a8a5e';
  ctx.beginPath();
  ctx.moveTo(700, 540); ctx.lineTo(960, 540); ctx.lineTo(960, 425); ctx.lineTo(880, 425);
  ctx.closePath(); ctx.fill();

  px(866, 428, 6, 34, '#5a4630');                         // Schild
  px(842, 412, 56, 20, '#6a4a2a');
  ctx.fillStyle = '#e8d8a8';
  ctx.font = 'bold 9px Verdana';
  ctx.textAlign = 'center';
  ctx.fillText('BETLEHEM →', 870, 425);

  // Olivenbaum
  px(108, 330, 22, 112, '#5a4630');
  px(118, 360, 30, 10, '#4e3a26');
  ctx.fillStyle = '#2e5a32';
  for (const [cx2, cy2, r2] of [[100, 310, 38], [140, 295, 42], [120, 330, 36], [160, 320, 30]]) {
    ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#3a6a3e';
  ctx.beginPath(); ctx.arc(112, 300, 26, 0, 7); ctx.fill();

  // Felsen (tagsüber heller) + Levis Flöte im Spalt
  ctx.fillStyle = '#73737e';
  ctx.beginPath(); ctx.arc(820, 488, 28, 0, 7); ctx.fill();
  ctx.fillStyle = '#62626c';
  ctx.beginPath(); ctx.arc(858, 494, 21, 0, 7); ctx.fill();
  ctx.fillStyle = '#7e7e8a';
  ctx.beginPath(); ctx.arc(792, 496, 17, 0, 7); ctx.fill();
  if (!F.tookFloete) {
    ctx.save();
    ctx.translate(832, 468);
    ctx.rotate(-0.5);
    px(-2, -12, 4, 24, '#d8c08a');                        // Flöte ragt aus dem Spalt
    ctx.restore();
    ctx.fillStyle = `rgba(255,255,220,${0.4 + 0.5 * Math.abs(Math.sin(t * 3))})`;
    ctx.fillRect(836, 456, 3, 3);                         // Glitzern als Hinweis
  }

  // Tränke
  px(484, 484, 88, 22, '#6a4a2a');
  px(488, 488, 80, 14, F.traenkeVoll ? '#4a8ab0' : '#54381e');
  px(490, 506, 8, 14, '#553a20');
  px(558, 506, 8, 14, '#553a20');
  if (F.traenkeVoll) {
    ctx.fillStyle = `rgba(220,240,250,${0.3 + 0.2 * Math.abs(Math.sin(t * 2))})`;
    ctx.fillRect(500, 490, 24, 3);
  }

  // Feuerstelle (kalt) + Eimer
  ctx.fillStyle = '#6a6a5e';
  for (const [fxs, fys] of [[362, 482], [400, 482], [370, 490], [394, 490], [381, 478]]) {
    ctx.beginPath(); ctx.arc(fxs, fys, 5, 0, 7); ctx.fill();
  }
  px(370, 478, 22, 6, '#3a342c');                         // alte Asche
  if (!F.tookEimer) {
    px(318, 466, 22, 18, '#7a5a34');                      // Eimer
    px(320, 468, 18, 3, '#5a3f22');
    ctx.strokeStyle = '#4a3826';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(329, 466, 10, Math.PI, 0); ctx.stroke();
  }

  // Schafe (gleiche Herde wie nachts)
  drawSheep(600, 488, t, 0);
  drawSheep(660, 512, t, 1);
  drawSheep(576, 522, t, 2);
  drawSheep(700, 478, t, 3);

  // Schimon (wach und aufrecht – noch) und Levi
  drawPerson(295, 490, { tunic: '#6b4a3a', cloth: '#a89070', facing: 1 });
  drawPerson(468, 484, { tunic: '#5d7a4a', cloth: '#dcd8c8', facing: -1 });
}

function drawField(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, '#04051a');
  sky.addColorStop(1, '#0d1535');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 420);

  for (const s of STARS) {
    ctx.fillStyle = `rgba(255,255,240,${0.35 + 0.45 * Math.abs(Math.sin(t + s.ph))})`;
    ctx.fillRect(s.x, s.y, s.r * 2, s.r * 2);
  }

  ctx.fillStyle = '#e8e4cf';                              // Mond
  ctx.beginPath(); ctx.arc(112, 90, 30, 0, 7); ctx.fill();
  ctx.fillStyle = '#cfcab2';
  ctx.beginPath(); ctx.arc(103, 82, 7, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(122, 98, 5, 0, 7); ctx.fill();

  // Hügel mit Bethlehem
  ctx.fillStyle = '#0e1a10';
  ctx.beginPath(); ctx.ellipse(840, 415, 200, 68, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(80, 418, 220, 45, 0, Math.PI, 0); ctx.fill();
  for (const [hx, hy, hw, hh] of [[760, 364, 26, 22], [792, 352, 32, 34], [830, 358, 26, 28], [862, 348, 34, 38], [902, 362, 24, 24]]) {
    px(hx, hy, hw, hh, '#241f33');
    px(hx + 5, hy + 7, 4, 5, '#ffda70');
    if (hw > 28) px(hx + hw - 9, hy + 12, 4, 5, '#ffc850');
  }

  px(0, 405, W, 135, '#15301c');                          // Wiese
  ctx.fillStyle = '#1c3a23';
  for (let i = 0; i < 26; i++) px((i * 167) % 940, 420 + (i * 53) % 110, 14, 3, '#1c3a23');

  // Weg nach Bethlehem
  ctx.fillStyle = '#3c3526';
  ctx.beginPath();
  ctx.moveTo(700, 540); ctx.lineTo(960, 540); ctx.lineTo(960, 425); ctx.lineTo(880, 425);
  ctx.closePath(); ctx.fill();

  px(866, 428, 6, 34, '#5a4630');                         // Schild
  px(842, 412, 56, 20, '#6a4a2a');
  ctx.fillStyle = '#e8d8a8';
  ctx.font = 'bold 9px Verdana';
  ctx.textAlign = 'center';
  ctx.fillText('BETLEHEM →', 870, 425);

  // Olivenbaum
  px(108, 330, 22, 112, '#4a3826');
  px(118, 360, 30, 10, '#42301f');
  ctx.fillStyle = '#16321a';
  for (const [cx2, cy2, r2] of [[100, 310, 38], [140, 295, 42], [120, 330, 36], [160, 320, 30]]) {
    ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, 7); ctx.fill();
  }

  if (!F.tookStaff) {                                     // Hirtenstab am Baum
    ctx.strokeStyle = '#a8854a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(152, 446); ctx.lineTo(160, 392);
    ctx.arc(165, 390, 6, Math.PI, -0.4, false);
    ctx.stroke();
  }

  if (!F.tookWood) {                                      // Reisighaufen
    ctx.strokeStyle = '#7a5c34';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(184 + i * 8, 514);
      ctx.lineTo(200 + i * 7, 496 + (i % 3) * 4);
      ctx.stroke();
    }
  }

  // Felsen (+ feststeckendes Lamm)
  ctx.fillStyle = '#494952';
  ctx.beginPath(); ctx.arc(820, 488, 28, 0, 7); ctx.fill();
  ctx.fillStyle = '#3e3e46';
  ctx.beginPath(); ctx.arc(858, 494, 21, 0, 7); ctx.fill();
  ctx.fillStyle = '#52525c';
  ctx.beginPath(); ctx.arc(792, 496, 17, 0, 7); ctx.fill();
  if (!F.lambSaved) {
    const wob = Math.sin(t * 6) * 1.5;
    px(830 + wob, 452, 16, 13, '#e8e2d0');                // Lammkopf
    px(828 + wob, 449, 5, 6, '#d8d2c0');
    px(843 + wob, 449, 5, 6, '#d8d2c0');
    ctx.fillStyle = '#222';
    ctx.fillRect(834 + wob, 456, 2, 2);
    ctx.fillRect(840 + wob, 456, 2, 2);
    if (performance.now() < bleatUntil) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Verdana';
      ctx.textAlign = 'center';
      ctx.fillText('Määäh!', 838, 436);
    }
  }

  drawSheep(600, 488, t, 0);
  drawSheep(660, 512, t, 1);
  drawSheep(576, 522, t, 2);
  drawSheep(700, 478, t, 3);

  drawFire(380, 488, F.fireLit, t);

  drawPerson(295, 490, { tunic: '#6b4a3a', cloth: '#a89070', mode: 'sit', asleep: !F.fireLit, facing: 1 });
  if (!F.fireLit) {
    ctx.fillStyle = 'rgba(220,220,255,0.7)';
    ctx.font = 'bold 13px Verdana';
    ctx.textAlign = 'center';
    ctx.fillText('Z z z', 318 + Math.sin(t * 1.5) * 4, 396 - Math.sin(t * 0.8) * 5);
  }
  drawPerson(468, 484, { tunic: '#5d7a4a', cloth: '#dcd8c8', facing: -1 });

  drawStar(740, 95, fx.starGrow, t);
  if (fx.angelVisible) drawAngel(480, fx.angelY, t);
}

/* --------------- Raum: Weg nach Bethlehem --------------- */

function drawWeg(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, '#04051a');
  sky.addColorStop(1, '#0d1535');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 420);

  for (const s of STARS) {
    ctx.fillStyle = `rgba(255,255,240,${0.35 + 0.45 * Math.abs(Math.sin(t + s.ph))})`;
    ctx.fillRect(s.x, s.y, s.r * 2, s.r * 2);
  }

  ctx.fillStyle = '#e8e4cf';                              // Mond, schon hinter uns
  ctx.beginPath(); ctx.arc(76, 70, 22, 0, 7); ctx.fill();
  ctx.fillStyle = '#cfcab2';
  ctx.beginPath(); ctx.arc(70, 64, 5, 0, 7); ctx.fill();

  // Hügel – Bethlehem ist schon deutlich näher
  ctx.fillStyle = '#101e13';
  ctx.beginPath(); ctx.ellipse(660, 424, 360, 140, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#0c180e';
  ctx.beginPath(); ctx.ellipse(90, 426, 240, 60, 0, Math.PI, 0); ctx.fill();

  // Stadtmauer mit Zinnen und Tor
  px(480, 338, 360, 46, '#2a2438');
  for (let i = 0; i < 9; i++) px(484 + i * 41, 326, 24, 14, '#2a2438');
  px(636, 344, 48, 40, '#14101f');                        // Stadttor

  // Häuser über der Mauer
  for (const [hx, hy, hw, hh] of [[506, 296, 42, 44], [560, 276, 50, 64], [622, 252, 64, 88], [700, 272, 48, 68], [758, 296, 44, 44]]) {
    px(hx, hy, hw, hh, '#241f33');
    px(hx + 7, hy + 12, 7, 9, '#ffda70');
    if (hw > 45) px(hx + hw - 14, hy + 26, 7, 9, '#ffc850');
  }

  drawStar(660, 92, 0.85, t);                             // genau über der Stadt

  px(0, 408, W, 132, '#15301c');                          // Wiese
  for (let i = 0; i < 26; i++) px((i * 167) % 940, 422 + (i * 53) % 108, 14, 3, '#1c3a23');

  // Weg quer durchs Bild...
  ctx.fillStyle = '#3c3526';
  ctx.beginPath();
  ctx.moveTo(0, 540); ctx.lineTo(960, 540); ctx.lineTo(960, 456); ctx.lineTo(0, 484);
  ctx.closePath(); ctx.fill();
  // ...und hinauf zum Stadttor
  ctx.beginPath();
  ctx.moveTo(720, 468); ctx.lineTo(816, 462); ctx.lineTo(688, 384); ctx.lineTo(648, 384);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#332d20';
  for (let i = 0; i < 30; i++) px((i * 113) % 930, 466 + (i * 43) % 64, 16, 4, '#332d20');

  // Felsbrocken am Wegrand
  ctx.fillStyle = '#494952';
  ctx.beginPath(); ctx.arc(120, 448, 16, 0, 7); ctx.fill();
  ctx.fillStyle = '#3e3e46';
  ctx.beginPath(); ctx.arc(148, 454, 11, 0, 7); ctx.fill();

  // Zypressen am Wegrand
  ctx.fillStyle = '#0e2412';
  for (const [zx, zh] of [[212, 92], [884, 72]]) {
    ctx.beginPath();
    ctx.moveTo(zx, 424);
    ctx.quadraticCurveTo(zx - 14, 424 - zh * 0.5, zx, 424 - zh);
    ctx.quadraticCurveTo(zx + 14, 424 - zh * 0.5, zx, 424);
    ctx.fill();
  }

  // Schimon & Levi, ein Stück voraus, zu Joel umgedreht
  drawPerson(462, 500, { tunic: '#6b4a3a', cloth: '#a89070', facing: -1 });
  drawPerson(560, 496, { tunic: '#5d7a4a', cloth: '#dcd8c8', facing: -1 });
}

/* --------------- Raum: Bethlehem bei Nacht --------------- */

function drawCity(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, 320);
  sky.addColorStop(0, '#04051a');
  sky.addColorStop(1, '#0c1330');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 320);

  for (const s of STARS) {
    if (s.y > 250) continue;
    ctx.fillStyle = `rgba(255,255,240,${0.3 + 0.4 * Math.abs(Math.sin(t + s.ph))})`;
    ctx.fillRect(s.x, s.y, s.r * 2, s.r * 2);
  }
  drawStar(820, 85, 0.7, t);

  // Hintergrund-Häuserzeile
  px(0, 240, W, 185, '#141020');
  for (const [hx, hw, hy] of [[150, 95, 200], [255, 110, 175], [370, 60, 215]]) {
    px(hx, hy, hw, 425 - hy, '#1c1828');
    px(hx + 14, hy + 30, 12, 16, '#ffda70');
    px(hx + hw - 28, hy + 56, 12, 16, '#caa84f');
  }

  // Straße
  px(0, 420, W, 120, '#474034');
  ctx.fillStyle = '#3c362c';
  for (let i = 0; i < 40; i++) px((i * 97) % 940, 432 + (i * 41) % 100, 22, 5, '#3c362c');

  // Gasse rechts (führt zum Stall)
  px(862, 240, 98, 230, '#0a0c1c');
  px(862, 240, 6, 230, '#241f33');

  // Rechtes Haus
  px(690, 188, 172, 282, '#241f33');
  px(682, 178, 188, 14, '#1a1626');
  px(712, 230, 16, 20, '#ffda70');
  px(810, 262, 16, 20, '#caa84f');

  // Stadttor links
  px(0, 120, 132, 352, '#3b3b46');
  for (let i = 0; i < 4; i++) px(i * 34, 106, 24, 16, '#3b3b46');
  ctx.fillStyle = '#0a0c20';
  ctx.beginPath();
  ctx.moveTo(20, 470); ctx.lineTo(20, 300);
  ctx.arc(60, 300, 40, Math.PI, 0);
  ctx.lineTo(100, 470);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d8c8a0';
  ctx.font = 'bold 10px Verdana';
  ctx.textAlign = 'center';
  ctx.fillText('STADT DAVIDS', 66, 148);

  // Herberge
  px(380, 150, 300, 320, '#5a4632');
  px(372, 138, 316, 16, '#3a2c1c');
  for (const wy of [200, 372]) {
    for (const wx of [402, 600]) {
      px(wx, wy, 50, 60, '#33271b');
      px(wx + 23, wy, 4, 60, '#2a2014');
    }
  }

  // Tür
  px(490, 344, 80, 126, '#2a2014');
  px(498, 352, 64, 118, '#4a3826');
  px(498, 352, 30, 118, '#42301f');
  ctx.fillStyle = '#caa84f';
  ctx.beginPath(); ctx.arc(554, 414, 3.5, 0, 7); ctx.fill();
  px(506, 378, 50, 22, '#d8c8a0');
  ctx.fillStyle = '#7a2a1a';
  ctx.font = 'bold 11px Verdana';
  ctx.fillText('BELEGT!', 531, 393);

  // Hängeschild
  ctx.strokeStyle = '#1a1208';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(470, 284); ctx.lineTo(470, 296);
  ctx.moveTo(534, 284); ctx.lineTo(534, 296);
  ctx.stroke();
  px(440, 296, 124, 30, '#6a4a2a');
  ctx.fillStyle = '#e8d8a8';
  ctx.font = 'bold 12px Verdana';
  ctx.fillText('HERBERGE', 502, 316);

  // Fenster über der Tür (hier wohnt der Wirt)
  px(486, 206, 88, 106, '#2a2014');
  if (F.wirtOut) {
    px(494, 214, 72, 90, '#15100a');
    px(508, 262, 44, 42, '#7a4a52');                       // Nachthemd
    px(518, 236, 24, 26, '#d8a87a');                       // Kopf
    px(512, 228, 36, 12, '#c8c8d8');                       // Schlafmütze
    px(544, 226, 10, 14, '#c8c8d8');
    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath(); ctx.arc(552, 242, 5, 0, 7); ctx.fill();
    px(520, 256, 20, 4, '#5a4632');                        // Schnauzbart
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(523, 246, 3, 3); ctx.fillRect(534, 246, 3, 3);
    px(476, 214, 12, 90, '#4a3826');                       // offene Läden
    px(572, 214, 12, 90, '#4a3826');
  } else {
    px(494, 214, 35, 90, '#4a3826');
    px(531, 214, 35, 90, '#42301f');
    px(527, 214, 6, 90, '#2a2014');
  }

  // Wandlaterne
  px(640, 330, 4, 14, '#1a1208');
  px(632, 344, 20, 26, '#3a2c14');
  px(636, 350, 12, 14, '#ffd54a');
  glow(642, 357, 130, 'rgba(255,190,80,A)', 0.15);

  // Brunnen
  ctx.fillStyle = '#5a5a64';
  ctx.beginPath(); ctx.ellipse(300, 472, 40, 16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#34343c';
  ctx.beginPath(); ctx.ellipse(300, 468, 30, 11, 0, 0, 7); ctx.fill();
  px(266, 406, 5, 62, '#4a3826');
  px(329, 406, 5, 62, '#4a3826');
  px(262, 400, 76, 8, '#4a3826');
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(300, 408); ctx.lineTo(300, 438); ctx.stroke();
  px(293, 438, 14, 10, '#5a4630');

  // Katze auf dem Brunnenrand
  const tail = Math.sin(t * 2.5) * 6;
  ctx.fillStyle = '#16161c';
  ctx.beginPath(); ctx.ellipse(312, 452, 14, 7, 0, 0, 7); ctx.fill();
  px(320, 437, 11, 11, '#16161c');
  px(320, 433, 4, 5, '#16161c');
  px(327, 433, 4, 5, '#16161c');
  ctx.strokeStyle = '#16161c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(298, 452);
  ctx.quadraticCurveTo(288, 444 + tail, 284, 436 + tail);
  ctx.stroke();
  ctx.fillStyle = '#ffd54a';
  ctx.fillRect(322, 440, 2, 2);
  ctx.fillRect(327, 440, 2, 2);

  // Nachtwächter mit Speer und Laterne
  drawPerson(722, 508, { tunic: '#6a3a3a', cloth: '#8a8a96', facing: -1 });
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(748, 508); ctx.lineTo(748, 398); ctx.stroke();
  ctx.fillStyle = '#b8b8c4';
  ctx.beginPath();
  ctx.moveTo(743, 398); ctx.lineTo(753, 398); ctx.lineTo(748, 382);
  ctx.closePath(); ctx.fill();
  px(698, 466, 14, 18, '#3a2c14');
  px(701, 470, 8, 10, '#ffd54a');
  glow(705, 475, 90, 'rgba(255,190,80,A)', 0.13);

  // Levi & Schimon warten am Tor
  drawPerson(190, 502, { tunic: '#5d7a4a', cloth: '#dcd8c8', facing: 1 });
  drawPerson(135, 500, { tunic: '#6b4a3a', cloth: '#a89070', facing: 1 });
}

/* --------------- Raum: Stall --------------- */

function drawStable(t) {
  px(0, 0, W, H, '#3a2c1c');                              // Rückwand
  ctx.fillStyle = '#2e2316';
  for (let i = 0; i < 16; i++) px(i * 62, 0, 3, 400, '#2e2316');
  px(0, 396, W, 144, '#5a4a30');                          // Boden
  ctx.fillStyle = '#b89a4e';
  for (let i = 0; i < 30; i++) px((i * 131) % 920 + 10, 410 + (i * 47) % 115, 18, 3, '#b89a4e');

  ctx.strokeStyle = '#241a0e';                            // Dachbalken
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, 130); ctx.lineTo(300, 0);
  ctx.moveTo(960, 130); ctx.lineTo(660, 0);
  ctx.moveTo(0, 40); ctx.lineTo(960, 40);
  ctx.stroke();

  // Luke mit Stern
  px(640, 52, 124, 96, '#04051a');
  ctx.save();
  ctx.beginPath();
  ctx.rect(640, 52, 124, 96);
  ctx.clip();
  drawStar(702, 100, 0.45, t);
  ctx.restore();
  ctx.strokeStyle = '#241a0e';
  ctx.lineWidth = 8;
  ctx.strokeRect(640, 52, 124, 96);

  // Eingang links (Nacht)
  px(0, 80, 62, 460, '#06081a');
  ctx.fillStyle = 'rgba(255,255,240,0.5)';
  ctx.fillRect(20, 130, 2, 2); ctx.fillRect(40, 180, 2, 2); ctx.fillRect(12, 240, 2, 2);
  px(62, 80, 8, 460, '#241a0e');

  // Laterne
  ctx.strokeStyle = '#1a1208';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(252, 40); ctx.lineTo(252, 92); ctx.stroke();
  px(238, 92, 28, 38, '#3a2c14');
  px(244, 100, 16, 22, '#ffd54a');
  glow(252, 112, 170, 'rgba(255,190,80,A)', 0.18);

  // Futterbalken + Ochse
  px(630, 452, 160, 10, '#42301f');
  px(660, 432, 90, 48, '#5a3f2a');                        // Körper
  px(644, 424, 34, 34, '#6a4a32');                        // Kopf
  px(640, 418, 10, 12, '#d8c9a0');                        // Hörner
  px(672, 418, 10, 12, '#d8c9a0');
  ctx.fillStyle = '#1a1208';
  ctx.fillRect(652, 436, 4, 4);
  px(648, 448, 22, 10, '#caa67c');                        // Schnauze

  // Krippe mit Kind
  glow(480, 440, 90, 'rgba(255,230,160,A)', 0.22);
  ctx.strokeStyle = '#503a22';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(450, 478); ctx.lineTo(478, 432);
  ctx.moveTo(478, 478); ctx.lineTo(450, 432);
  ctx.moveTo(482, 478); ctx.lineTo(510, 432);
  ctx.moveTo(510, 478); ctx.lineTo(482, 432);
  ctx.stroke();
  px(444, 428, 72, 20, '#6a4a2a');
  px(448, 422, 64, 8, '#c8a85a');                         // Stroh
  ctx.fillStyle = '#f4f0e4';                              // Kind
  ctx.beginPath(); ctx.ellipse(478, 420, 22, 9, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8c9a0';
  ctx.beginPath(); ctx.arc(497, 418, 6, 0, 7); ctx.fill();

  drawPerson(405, 492, { tunic: '#4a5f9e', cloth: '#e8e8f0', mode: 'sit', facing: 1 });   // Maria
  drawPerson(560, 494, { tunic: '#5a4632', cloth: '#8a7a5a', facing: -1 });               // Josef
  drawPerson(225, 512, { tunic: '#5d7a4a', cloth: '#dcd8c8', facing: 1 });                // Levi
  drawPerson(150, 506, { tunic: '#6b4a3a', cloth: '#a89070', mode: 'sit', facing: 1 });   // Schimon
}

/* --------------- Raum: Flucht nach Ägypten --------------- */

function drawEsel(x, y, t) {
  px(x - 28, y - 36, 54, 24, '#9a8d7a');                  // Körper
  px(x - 26, y - 12, 8, 12, '#8a7d6a');                   // Beine
  px(x - 4, y - 12, 8, 12, '#8a7d6a');
  px(x + 14, y - 12, 8, 12, '#8a7d6a');
  px(x + 20, y - 48, 14, 22, '#9a8d7a');                  // Hals
  px(x + 26, y - 50, 18, 14, '#8a7d6a');                  // Kopf
  px(x + 20, y - 60, 5, 13, '#9a8d7a');                   // Ohren
  px(x + 29, y - 60, 5, 13, '#9a8d7a');
  ctx.fillStyle = '#222';
  ctx.fillRect(x + 32, y - 46, 3, 3);
  ctx.strokeStyle = '#7a6d5a';                            // Schwanz
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 28, y - 32);
  ctx.quadraticCurveTo(x - 37, y - 24 + Math.sin(t * 2) * 3, x - 34, y - 13);
  ctx.stroke();
}

function drawSoldat(x, y, sitting) {
  if (sitting) {
    drawPerson(x, y, { tunic: '#8a2a2a', cloth: '#b8b8c4', mode: 'sit', facing: -1 });
    px(x - 10, y - 86, 20, 6, '#c83232');                 // Helmbusch
    px(x + 13, y - 44, 13, 17, '#b06a3a');                // Weinkrug
  } else {
    drawPerson(x, y, { tunic: '#8a2a2a', cloth: '#b8b8c4', facing: -1 });
    px(x - 10, y - 110, 20, 6, '#c83232');                // Helmbusch
    ctx.strokeStyle = '#8a7a5a';                          // Speer
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.lineTo(x + 26, y - 112); ctx.stroke();
    ctx.fillStyle = '#b8b8c4';
    ctx.beginPath();
    ctx.moveTo(x + 21, y - 112); ctx.lineTo(x + 31, y - 112); ctx.lineTo(x + 26, y - 128);
    ctx.closePath(); ctx.fill();
  }
}

function drawFlucht(t) {
  // Morgenhimmel
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, '#16203e');
  sky.addColorStop(0.6, '#3a3050');
  sky.addColorStop(1, '#8a5a42');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 420);

  for (const s of STARS) {                                // verblassende Sterne
    if (s.y > 150) continue;
    ctx.fillStyle = `rgba(255,255,240,${0.12 + 0.18 * Math.abs(Math.sin(t + s.ph))})`;
    ctx.fillRect(s.x, s.y, s.r * 2, s.r * 2);
  }
  glow(950, 410, 280, 'rgba(255,170,90,A)', 0.22);        // Morgenglühen

  // Häuserzeile
  px(0, 250, W, 172, '#2a2236');
  for (const [hx, hw, hy] of [[420, 100, 210], [545, 80, 235], [800, 130, 200]]) {
    px(hx, hy, hw, 425 - hy, '#352a44');
    px(hx + 16, hy + 34, 12, 16, '#3a3050');
  }

  // Straße
  px(0, 420, W, 120, '#4f4638');
  ctx.fillStyle = '#443c30';
  for (let i = 0; i < 40; i++) px((i * 89) % 940, 432 + (i * 37) % 100, 22, 5, '#443c30');

  // Haus der Familie
  px(120, 190, 220, 280, '#6a543c');
  px(110, 176, 240, 18, '#473826');
  px(204, 354, 72, 116, '#2a2014');
  px(210, 360, 60, 110, '#4a3826');
  ctx.fillStyle = '#caa84f';
  ctx.beginPath(); ctx.arc(262, 418, 3.5, 0, 7); ctx.fill();
  px(284, 294, 52, 56, '#33271b');                        // Fenster
  px(290, 300, 40, 44, '#ffda70');
  glow(310, 322, 110, 'rgba(255,200,100,A)', 0.15);

  // Marktstand (verlassen)
  px(596, 366, 8, 78, '#4a3826');
  px(756, 366, 8, 78, '#4a3826');
  for (let i = 0; i < 6; i++) px(590 + i * 30, 350, 30, 16, i % 2 ? '#8a3a32' : '#d8c8a0');
  px(596, 430, 168, 12, '#5a4630');
  px(610, 442, 8, 70, '#4a3826');
  px(744, 442, 8, 70, '#4a3826');
  px(700, 408, 36, 22, '#6a5438');                        // Kiste
  px(706, 402, 24, 6, '#8a6a3a');                         // Datteln
  if (!F.tookKrug) {
    px(652, 396, 24, 34, '#b06a3a');                      // Weinkrug
    px(657, 390, 14, 8, '#8a4f28');
    px(648, 404, 6, 14, '#8a4f28');
  }

  // Esel (angebunden)
  if (!F.fleeing) {
    px(466, 440, 6, 72, '#4a3826');                       // Pfosten
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(468, 454); ctx.lineTo(442, 470); ctx.stroke();
    drawEsel(410, 512, t);
  }

  // Soldat des Herodes
  if (!F.soldierBusy) drawSoldat(370, 508, false);
  else drawSoldat(690, 508, true);

  // Fliehende Familie
  if (F.fleeing && fx.famX < 1040) {
    drawEsel(fx.famX, 512, t);
    drawPerson(fx.famX - 2, 484, { tunic: '#4a5f9e', cloth: '#e8e8f0', mode: 'sit', facing: 1 }); // Maria
    px(fx.famX - 16, 446, 18, 12, '#f4f0e4');             // das Kind im Arm
    drawPerson(fx.famX + 56, 512, { tunic: '#5a4632', cloth: '#8a7a5a', facing: 1, walk: t * 9 }); // Josef
  }
}

/* --------------- Raum: Am Rand Ägyptens --------------- */

function drawPalme(x, y, h, t) {
  const topX = x - h * 0.12, topY = y - h;
  ctx.strokeStyle = '#6a4a2e';                            // Stamm
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 6, y - h * 0.55, topX, topY);
  ctx.stroke();
  ctx.strokeStyle = '#5a3e24';                            // Stammringe
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    const ry = y - h * i * 0.18;
    ctx.beginPath(); ctx.moveTo(x - 1 + i, ry); ctx.lineTo(x + 7, ry); ctx.stroke();
  }
  const sway = Math.sin(t * 1.2 + x) * 3;                 // Wedel
  ctx.strokeStyle = '#2e5a2a';
  ctx.lineWidth = 4;
  for (const [dx, dy] of [[-40, -4], [-30, -20], [-10, -28], [10, -26], [30, -16], [40, 0]]) {
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + dx * 0.6, topY + dy - 10, topX + dx + sway, topY + dy + 12);
    ctx.stroke();
  }
}

function drawPyramide(ax, ay, half, baseY, dark, lit) {
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(ax - half, baseY); ctx.lineTo(ax + half, baseY);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = lit;                                    // sonnenbeschienene Ostflanke
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(ax + half, baseY); ctx.lineTo(ax + half * 0.35, baseY);
  ctx.closePath(); ctx.fill();
}

function drawAegypten(t) {
  // Abendhimmel über der Wüste
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, '#241c4a');
  sky.addColorStop(0.55, '#7a3a50');
  sky.addColorStop(1, '#e8884a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 420);

  // sinkende Sonne (verschwindet, wenn der Abend kommt)
  const sunA = Math.max(0, 1 - fx.abend * 2);
  if (sunA > 0) {
    glow(482, 372, 160, 'rgba(255,170,80,A)', 0.35 * sunA);
    ctx.fillStyle = `rgba(255,210,120,${sunA})`;
    ctx.beginPath(); ctx.arc(482, 372, 20, 0, 7); ctx.fill();
  }

  // die Pyramiden am Horizont
  drawPyramide(170, 245, 118, 410, '#3a2a44', '#7a4450');
  drawPyramide(310, 298, 86, 410, '#352640', '#70404c');
  drawPyramide(420, 348, 56, 410, '#302338', '#684048');

  // Wüste
  px(0, 400, W, 140, '#c89a5e');
  ctx.fillStyle = '#b8905a';                              // Dünenkämme
  ctx.beginPath(); ctx.ellipse(700, 412, 260, 16, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(120, 415, 200, 12, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#b88950';
  for (let i = 0; i < 30; i++) px((i * 127) % 930, 425 + (i * 59) % 100, 18, 3, '#b88950');

  // Quelle mit Wasserbecken
  ctx.fillStyle = '#8a6a40';
  ctx.beginPath(); ctx.ellipse(270, 487, 70, 19, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2e5d7a';
  ctx.beginPath(); ctx.ellipse(270, 486, 62, 15, 0, 0, 7); ctx.fill();
  ctx.fillStyle = `rgba(180,220,240,${0.25 + 0.15 * Math.abs(Math.sin(t * 1.6))})`;
  ctx.beginPath(); ctx.ellipse(255, 483, 26, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#6a6a5a';                              // Steine am Rand
  ctx.beginPath(); ctx.arc(205, 478, 9, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(335, 482, 7, 0, 7); ctx.fill();
  ctx.strokeStyle = '#3e6a32';                            // Gräser
  ctx.lineWidth = 2;
  for (const gx of [200, 212, 330, 342]) {
    ctx.beginPath(); ctx.moveTo(gx, 472); ctx.lineTo(gx - 3, 458); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + 3, 472); ctx.lineTo(gx + 7, 460); ctx.stroke();
  }

  // Palmen der Oase
  drawPalme(118, 468, 85, t);
  drawPalme(372, 472, 130, t);
  if (!F.dattelnTaken) {                                  // Dattelrispe
    ctx.fillStyle = '#b06a2a';
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(348 + (i % 3) * 7, 348 + Math.floor(i / 3) * 7, 4, 0, 7);
      ctx.fill();
    }
  }

  // Gepäck der Familie
  px(518, 478, 44, 26, '#6a5438');                        // Kiste
  px(524, 466, 32, 14, '#8a4f3a');                        // Deckenrolle
  px(548, 488, 28, 18, '#a89070');                        // Bündel
  ctx.strokeStyle = '#4a3826';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(548, 497); ctx.lineTo(576, 497); ctx.stroke();

  // Feuerstelle (brennt erst am Abend)
  ctx.fillStyle = '#7a7a6a';
  for (const [sx, sy] of [[614, 494], [666, 494], [624, 502], [656, 502], [640, 490]]) {
    ctx.beginPath(); ctx.arc(sx, sy, 6, 0, 7); ctx.fill();
  }
  const feuerAn = F.abendDone || fx.abend > 0.3;
  drawFire(640, 496, feuerAn, t);

  // Abenddämmerung legt sich über alles
  if (fx.abend > 0) {
    ctx.fillStyle = `rgba(8,8,30,${0.5 * fx.abend})`;
    ctx.fillRect(0, 0, W, H);
    for (const s of STARS) {
      if (s.y > 300) continue;
      ctx.fillStyle = `rgba(255,255,240,${(0.3 + 0.4 * Math.abs(Math.sin(t + s.ph))) * fx.abend})`;
      ctx.fillRect(s.x, s.y, s.r * 2, s.r * 2);
    }
    if (feuerAn) glow(640, 470, 180, 'rgba(255,180,80,A)', 0.2 * fx.abend);
  }

  // Esel an der Oase
  drawEsel(450, 512, t);

  // Maria (mit dem Kind im Arm) und Josef am Lagerplatz
  drawPerson(700, 492, { tunic: '#4a5f9e', cloth: '#e8e8f0', mode: 'sit', facing: -1 });
  ctx.fillStyle = '#f4f0e4';                              // das Kind
  ctx.beginPath(); ctx.ellipse(684, 450, 12, 7, -0.3, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8c9a0';
  ctx.beginPath(); ctx.arc(675, 448, 5, 0, 7); ctx.fill();
  drawPerson(768, 502, { tunic: '#5a4632', cloth: '#8a7a5a', facing: -1 });
}

/* --------------- Raum: Weide vor Nazaret --------------- */

function drawKid(x, y, o) {
  const f = o.facing || 1;
  px(x - 6, y - 16, 5, 16, '#3a2c1e');                    // Beine
  px(x + 1, y - 16, 5, 16, '#33271b');
  px(x - 10, y - 52, 20, 38, o.tunic);                    // Gewand
  px(x - 13, y - 48, 4, 20, shade(o.tunic, -12));         // Arme
  px(x + 9, y - 48, 4, 20, shade(o.tunic, -12));
  px(x - 6, y - 66, 12, 15, '#d8a87a');                   // Kopf
  px(x - 8, y - 71, 16, 7, o.cloth);                      // Haar
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x - 3 + f * 2, y - 61, 2, 2);
  ctx.fillRect(x + 2 + f * 2, y - 61, 2, 2);
}

function drawNazaret(t) {
  // heller Vormittag in Galiläa
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, '#79b4e2');
  sky.addColorStop(1, '#d8ecf2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 420);
  glow(820, 70, 130, 'rgba(255,250,200,A)', 0.3);
  ctx.fillStyle = '#fff6d0';
  ctx.beginPath(); ctx.arc(820, 70, 24, 0, 7); ctx.fill();

  // Schwalben
  ctx.strokeStyle = 'rgba(40,50,70,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const bx = ((t * 22 + i * 420) % 1100) - 70;
    const by = 95 + i * 50 + Math.sin(t * 2 + i * 3) * 8;
    ctx.beginPath();
    ctx.moveTo(bx - 7, by);
    ctx.quadraticCurveTo(bx - 3, by - 5, bx, by);
    ctx.quadraticCurveTo(bx + 3, by - 5, bx + 7, by);
    ctx.stroke();
  }

  // Hügel Galiläas
  ctx.fillStyle = '#5a8a48';
  ctx.beginPath(); ctx.ellipse(180, 420, 320, 90, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#4e7c3e';
  ctx.beginPath(); ctx.ellipse(780, 426, 380, 150, 0, Math.PI, 0); ctx.fill();

  // Nazaret am Hang
  for (const [hx, hy, hw, hh] of [[640, 318, 40, 36], [690, 296, 50, 58], [748, 270, 60, 84], [816, 288, 48, 66], [872, 308, 42, 46], [716, 338, 36, 26]]) {
    px(hx, hy, hw, hh, '#d8cba8');
    px(hx, hy, hw, 6, '#9a8a6a');
    px(hx + 6, hy + 12, 6, 8, '#4a3c2c');
    if (hw > 45) px(hx + hw - 13, hy + 18, 6, 8, '#4a3c2c');
  }

  // Wiese
  px(0, 405, W, 135, '#4d8038');
  ctx.fillStyle = '#578e40';
  for (let i = 0; i < 26; i++) px((i * 167) % 940, 420 + (i * 53) % 110, 14, 3, '#578e40');

  // Weg in die Stadt
  ctx.fillStyle = '#9a8a5e';
  ctx.beginPath();
  ctx.moveTo(740, 540); ctx.lineTo(960, 540); ctx.lineTo(960, 420); ctx.lineTo(880, 400);
  ctx.lineTo(820, 360); ctx.lineTo(845, 358); ctx.lineTo(905, 405);
  ctx.closePath(); ctx.fill();

  px(890, 430, 6, 34, '#5a4630');                         // Schild
  px(864, 414, 60, 20, '#6a4a2a');
  ctx.fillStyle = '#e8d8a8';
  ctx.font = 'bold 9px Verdana';
  ctx.textAlign = 'center';
  ctx.fillText('NAZARET →', 894, 427);

  // Feigenbaum
  px(100, 320, 24, 122, '#5a4630');
  px(112, 350, 32, 10, '#4e3a26');
  ctx.fillStyle = '#356e30';
  for (const [cx2, cy2, r2] of [[95, 300, 42], [140, 286, 46], [115, 322, 38], [162, 312, 32]]) {
    ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#418040';
  ctx.beginPath(); ctx.arc(108, 292, 28, 0, 7); ctx.fill();

  // Brunnen
  ctx.fillStyle = '#8a8a90';
  ctx.beginPath(); ctx.ellipse(484, 472, 42, 17, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a5a64';
  ctx.beginPath(); ctx.ellipse(484, 468, 32, 12, 0, 0, 7); ctx.fill();
  px(450, 404, 5, 64, '#5a4630');
  px(513, 404, 5, 64, '#5a4630');
  px(446, 398, 76, 8, '#5a4630');
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(484, 406); ctx.lineTo(484, 436); ctx.stroke();
  px(477, 436, 14, 10, '#6a4a2a');

  // Joels Herde
  drawSheep(150, 490, t, 0);
  drawSheep(205, 514, t, 1);
  drawSheep(255, 486, t, 2);
  drawSheep(170, 524, t, 3);
  drawSheep(235, 500, t, 4);

  // Leute von Nazaret
  drawPerson(540, 502, { tunic: '#a04a6a', cloth: '#e8d8c0', facing: -1 });   // Rahel
  px(550, 458, 12, 16, '#b06a3a');                                           // ihr Wasserkrug
  drawPerson(720, 506, { tunic: '#7a6a3a', cloth: '#c8b890', facing: -1 });   // Eli
  ctx.strokeStyle = '#8a7a5a';                                               // seine Hacke
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(746, 506); ctx.lineTo(746, 416); ctx.stroke();
  px(738, 410, 18, 8, '#6a6a72');
  drawKid(280, 508, { tunic: '#3a8a7a', cloth: '#6a4630', facing: -1 });      // Mirjam
  if (F.josefDa) drawPerson(840, 504, { tunic: '#5a4632', cloth: '#8a7a5a', facing: -1 });
}

/* --------------- Raum: Synagoge von Nazaret --------------- */

function drawSynagoge(t) {
  // Wände und Boden
  px(0, 0, W, 400, '#a8967a');
  ctx.strokeStyle = '#94835f';
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, i * 80); ctx.lineTo(W, i * 80); ctx.stroke(); }
  for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 90 + (i % 2) * 45, 0); ctx.lineTo(i * 90 + (i % 2) * 45, 400); ctx.stroke(); }
  px(0, 396, W, 144, '#8a7a62');
  ctx.fillStyle = '#7c6e58';
  for (let i = 0; i < 24; i++) px((i * 149) % 920, 410 + (i * 61) % 115, 26, 4, '#7c6e58');

  // Säulen
  for (const cx2 of [110, 850]) {
    px(cx2 - 16, 70, 32, 330, '#c4b294');
    px(cx2 - 22, 56, 44, 16, '#b4a284');
    px(cx2 - 22, 396, 44, 10, '#b4a284');
  }

  // Fenster mit Morgenlicht
  px(700, 80, 120, 110, '#5a4a36');
  px(708, 88, 104, 94, '#ffeebf');
  px(754, 88, 8, 94, '#5a4a36');
  ctx.fillStyle = 'rgba(255,240,190,0.16)';
  ctx.beginPath();
  ctx.moveTo(708, 182); ctx.lineTo(812, 182); ctx.lineTo(580, 400); ctx.lineTo(420, 400);
  ctx.closePath(); ctx.fill();

  // siebenarmiger Leuchter
  px(146, 178, 8, 36, '#8a6a30');
  px(130, 210, 40, 8, '#8a6a30');
  ctx.strokeStyle = '#8a6a30';
  ctx.lineWidth = 5;
  for (const r of [14, 26]) {
    ctx.beginPath(); ctx.arc(150, 178, r, Math.PI, 0); ctx.stroke();
  }
  for (const lx of [124, 136, 150, 164, 176]) {
    const fl = Math.sin(t * 9 + lx) * 1.5;
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.moveTo(lx - 3, 156); ctx.lineTo(lx + fl * 0.4, 144); ctx.lineTo(lx + 3, 156);
    ctx.closePath(); ctx.fill();
  }
  glow(150, 160, 90, 'rgba(255,200,90,A)', 0.12);

  // Bima mit Lesepult und Jesus
  px(390, 396, 180, 16, '#6a5a44');
  px(398, 388, 164, 10, '#75644c');
  drawPerson(480, 408, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: 1 });
  px(455, 352, 50, 10, '#5a4630');                        // Pult
  px(476, 362, 8, 40, '#5a4630');
  px(450, 344, 60, 9, '#d8c08a');                         // Schriftrolle
  px(446, 342, 8, 13, '#b89a5e');
  px(506, 342, 8, 13, '#b89a5e');

  // Bänke mit Versammlung
  for (const [bx, bw] of [[130, 260], [596, 240]]) {
    px(bx, 486, bw, 10, '#6a5438');
    px(bx + 8, 496, 8, 22, '#5a4630');
    px(bx + bw - 16, 496, 8, 22, '#5a4630');
  }
  drawPerson(160, 500, { tunic: '#7a5a6a', cloth: '#c8c0b0', mode: 'sit', facing: 1 });
  drawPerson(215, 502, { tunic: '#5d7a4a', cloth: '#d8d8d8', mode: 'sit', facing: 1 });  // Levi, ergraut
  drawPerson(278, 500, { tunic: '#4a6a8a', cloth: '#b8a890', mode: 'sit', facing: 1 });
  drawPerson(620, 500, { tunic: '#8a6a4a', cloth: '#c0b8a8', mode: 'sit', facing: -1 });
  drawPerson(682, 503, { tunic: '#6a7a5a', cloth: '#d0c8b8', mode: 'sit', facing: -1 });
  drawPerson(744, 499, { tunic: '#9a6a5a', cloth: '#c8c0b0', mode: 'sit', facing: -1 });
  drawPerson(806, 503, { tunic: '#5a5a7a', cloth: '#b8b0a0', mode: 'sit', facing: -1 });
  drawKid(852, 506, { tunic: '#7a8a4a', cloth: '#5a4630', facing: -1 });
}

/* --------------- Raum: See Gennesaret --------------- */

function drawBoot(x, y, w) {
  ctx.fillStyle = '#6a4a2e';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 22);
  ctx.quadraticCurveTo(x, y + 20, x + w / 2, y - 22);
  ctx.quadraticCurveTo(x, y - 6, x - w / 2, y - 22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a6a42';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 22);
  ctx.quadraticCurveTo(x, y - 6, x + w / 2, y - 22);
  ctx.stroke();
}

function drawSee(t) {
  // Morgenhimmel über dem See
  const sky = ctx.createLinearGradient(0, 0, 0, 210);
  sky.addColorStop(0, '#a4cce6');
  sky.addColorStop(1, '#e6eedd');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 210);
  glow(120, 80, 140, 'rgba(255,250,210,A)', 0.35);
  ctx.fillStyle = '#fff6d0';
  ctx.beginPath(); ctx.arc(120, 80, 26, 0, 7); ctx.fill();

  // Möwen
  ctx.strokeStyle = 'rgba(60,70,90,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const bx = ((t * 24 + i * 300) % 1100) - 70;
    const by = 60 + i * 32 + Math.sin(t * 2.4 + i * 2) * 9;
    ctx.beginPath();
    ctx.moveTo(bx - 8, by);
    ctx.quadraticCurveTo(bx - 4, by - 6, bx, by);
    ctx.quadraticCurveTo(bx + 4, by - 6, bx + 8, by);
    ctx.stroke();
  }

  // Berge am Ostufer
  ctx.fillStyle = '#8aa0b2';
  ctx.beginPath(); ctx.ellipse(260, 214, 340, 52, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#7a94a8';
  ctx.beginPath(); ctx.ellipse(700, 216, 380, 64, 0, Math.PI, 0); ctx.fill();

  // Wasser
  const wasser = ctx.createLinearGradient(0, 210, 0, 420);
  wasser.addColorStop(0, '#5a96be');
  wasser.addColorStop(1, '#7ab4cc');
  ctx.fillStyle = wasser;
  ctx.fillRect(0, 210, W, 210);
  for (let i = 0; i < 34; i++) {
    const wy = 224 + (i * 37) % 188;
    const wx = (i * 173 + Math.sin(t * 1.3 + i) * 22) % 920;
    ctx.fillStyle = `rgba(230,245,250,${0.18 + 0.14 * Math.abs(Math.sin(t * 1.8 + i))})`;
    ctx.fillRect(wx, wy, 30, 2);
  }
  glow(120, 250, 120, 'rgba(255,250,210,A)', 0.12);       // Sonnenspiegelung

  // Landzunge, auf der Kapernaum liegt
  ctx.fillStyle = '#c9b289';
  ctx.beginPath();
  ctx.moveTo(960, 336);
  ctx.quadraticCurveTo(800, 356, 700, 428);
  ctx.lineTo(960, 428);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(230,245,250,0.5)';              // Uferlinie
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(960, 338);
  ctx.quadraticCurveTo(802, 358, 704, 426);
  ctx.stroke();

  // Kapernaum am Ufer
  for (const [hx, hy, hw, hh] of [[762, 344, 44, 56], [814, 326, 56, 74], [878, 340, 46, 60], [766, 310, 36, 34]]) {
    px(hx, hy, hw, hh, '#d2c4a2');
    px(hx, hy, hw, 6, '#9a8a6a');
    px(hx + 8, hy + 16, 7, 9, '#4a3c2c');
  }
  // kleiner Anleger
  px(742, 396, 6, 26, '#5a4630');
  px(716, 392, 60, 7, '#6a4a2e');

  // Strand
  ctx.fillStyle = '#d8c49a';
  ctx.beginPath();
  ctx.moveTo(0, 432); ctx.quadraticCurveTo(300, 398, 560, 408);
  ctx.quadraticCurveTo(800, 416, 960, 396);
  ctx.lineTo(960, 540); ctx.lineTo(0, 540);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c4b086';
  for (let i = 0; i < 26; i++) px((i * 157) % 930, 440 + (i * 53) % 92, 12, 3, '#c4b086');

  // zweites Boot (Söhne des Zebedäus) – kommt beim Fang zu Hilfe
  const b1x = 640 - fx.boot * 140, b1y = 440 - fx.boot * 78;
  const b2x = 160 + fx.boot2 * (b1x + 140 - 160);
  const b2y = 372 + fx.boot2 * (b1y + 6 - 372);
  drawBoot(b2x, b2y, 100);
  drawKid(b2x - 16, b2y - 6, { tunic: '#5a6a4a', cloth: '#4a3826', facing: 1 });
  drawKid(b2x + 16, b2y - 6, { tunic: '#6a5a7a', cloth: '#3a2c1e', facing: -1 });

  // Netze am Strand
  const netzFarbe = F.netzeSauber ? '#c8b890' : '#6a5a40';
  px(444, 452, 5, 46, '#5a4630');
  px(534, 452, 5, 46, '#5a4630');
  ctx.strokeStyle = netzFarbe;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(448, 458 + i * 7); ctx.quadraticCurveTo(490, 466 + i * 7, 536, 458 + i * 7); ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    ctx.beginPath(); ctx.moveTo(450 + i * 14, 456); ctx.lineTo(452 + i * 14, 498); ctx.stroke();
  }

  // Simons Boot – am Strand oder draußen mit Jesus und Simon
  if (fx.boot === 0) {
    drawBoot(640, 440, 140);
    drawPerson(520, 505, { tunic: '#4a6a7a', cloth: '#b8a890', facing: -1 });   // Simon
  } else {
    drawBoot(b1x, b1y, 140);
    drawPerson(b1x - 22, b1y - 8, { tunic: '#e8e4d4', cloth: '#c8b89a', mode: 'sit', facing: -1 });  // Jesus lehrt im Sitzen
    drawPerson(b1x + 30, b1y - 2, { tunic: '#4a6a7a', cloth: '#b8a890', facing: -1 });               // Simon
  }

  // der große Fang: schäumendes Wasser und blitzende Fische
  if (F.fangDone) {
    for (let i = 0; i < 8; i++) {
      const sx = b1x - 50 + (i * 31) % 110;
      const sy = b1y + 16 + (i * 13) % 22;
      ctx.fillStyle = `rgba(240,250,255,${0.3 + 0.3 * Math.abs(Math.sin(t * 4 + i * 2))})`;
      ctx.beginPath(); ctx.ellipse(sx, sy, 10, 3, 0, 0, 7); ctx.fill();
      if (i % 2 === 0) {
        ctx.fillStyle = `rgba(220,230,240,${0.5 + 0.4 * Math.abs(Math.sin(t * 6 + i * 3))})`;
        ctx.fillRect(sx + Math.sin(t * 5 + i) * 6, sy - 6, 6, 2);
      }
    }
  }

  // Menge am Ufer um Jesus
  drawPerson(150, 502, { tunic: '#7a5a6a', cloth: '#c8c0b0', facing: 1 });
  drawPerson(192, 510, { tunic: '#5a6a8a', cloth: '#b8a890', facing: 1 });
  drawPerson(232, 504, { tunic: '#8a6a4a', cloth: '#d0c8b8', facing: 1 });
  drawKid(282, 512, { tunic: '#7a8a4a', cloth: '#5a4630', facing: 1 });
  drawPerson(310, 508, { tunic: '#6a7a5a', cloth: '#c0b8a8', facing: -1 });
  if (fx.boot === 0) drawPerson(255, 498, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: 1 });  // Jesus am Ufer

  // Levi
  drawPerson(840, 505, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: -1 });
}

/* --------------- Raum: Haus in Kapernaum --------------- */

function drawLiege(x, y, w, body) {
  px(x - w / 2, y - 12, w, 18, '#9a6a3a');
  px(x - w / 2 + 4, y - 9, w - 8, 4, '#c8a86a');
  px(x - w / 2 - 10, y - 9, 10, 4, '#6a4a2e');
  px(x + w / 2, y - 9, 10, 4, '#6a4a2e');
  if (!body) return;
  ctx.fillStyle = '#d8c8b0';
  ctx.beginPath(); ctx.ellipse(x + 16, y - 18, 34, 8, 0.08, 0, 7); ctx.fill();
  px(x - 38, y - 20, 55, 12, '#6a7a8a');
  ctx.fillStyle = '#d8a87a';
  ctx.beginPath(); ctx.arc(x + 48, y - 21, 9, 0, 7); ctx.fill();
  px(x + 42, y - 30, 15, 5, '#5a4630');
}

function drawHaus(t) {
  // Kapernaum am See, später Vormittag
  const sky = ctx.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, '#8fc7e2');
  sky.addColorStop(1, '#eadab5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 300);
  glow(110, 72, 130, 'rgba(255,248,205,A)', 0.3);
  ctx.fillStyle = '#fff2bd';
  ctx.beginPath(); ctx.arc(110, 72, 24, 0, 7); ctx.fill();

  // Blick zum See zwischen den Häusern
  px(0, 300, W, 120, '#d0b990');
  ctx.fillStyle = '#6fa8c8';
  ctx.beginPath();
  ctx.moveTo(0, 286); ctx.quadraticCurveTo(160, 272, 310, 294);
  ctx.lineTo(310, 330); ctx.lineTo(0, 330);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(240,250,255,0.3)';
  for (let i = 0; i < 7; i++) px(18 + i * 38, 296 + (i % 2) * 8, 24, 2, 'rgba(240,250,255,0.35)');

  // Nachbarhäuser
  for (const [hx, hy, hw, hh] of [[35, 250, 170, 160], [760, 260, 160, 150]]) {
    px(hx, hy, hw, hh, '#c7ad84');
    px(hx - 8, hy - 18, hw + 16, 20, '#8a6a44');
    px(hx + 34, hy + 54, 36, 44, '#6a5438');
    px(hx + hw - 62, hy + 36, 34, 32, '#4a3a2a');
  }

  // Straße
  px(0, 420, W, 120, '#b79a6d');
  ctx.fillStyle = '#a88d62';
  for (let i = 0; i < 36; i++) px((i * 113) % 930, 430 + (i * 47) % 100, 18, 4, '#a88d62');

  // Haupthaus als offene Schnittansicht
  px(246, 190, 500, 280, '#d0b58c');
  px(262, 232, 452, 238, '#b89468');
  px(320, 250, 350, 220, '#7d6348');                      // Innenraum sichtbar
  px(320, 424, 350, 46, '#6a5038');

  // Flachdach mit Ziegeln
  px(238, 160, 516, 28, '#8a6a44');
  px(250, 138, 492, 24, '#a88458');
  ctx.strokeStyle = '#6f5234';
  ctx.lineWidth = 2;
  for (let x = 266; x < 724; x += 34) {
    ctx.beginPath(); ctx.moveTo(x, 140); ctx.lineTo(x + 16, 160); ctx.stroke();
  }
  for (let x = 260; x < 720; x += 54) px(x, 172, 34, 4, '#765836');

  if (F.dachOffen) {
    px(450, 146, 120, 44, '#2a2018');
    ctx.fillStyle = '#c8a86a';
    for (const [sx, sy] of [[438, 158], [574, 160], [458, 190], [548, 194]]) {
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#5a3f28';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(450, 168); ctx.lineTo(570, 168); ctx.stroke();
  }

  // Eingang, blockiert von Menschen
  px(292, 326, 126, 144, '#3a2c1e');
  px(302, 336, 106, 134, '#5a4028');
  drawPerson(338, 510, { tunic: '#7a5a6a', cloth: '#c8c0b0', facing: 1 });
  drawPerson(380, 508, { tunic: '#5a6a8a', cloth: '#b8a890', facing: 1 });
  drawKid(410, 512, { tunic: '#7a8a4a', cloth: '#5a4630', facing: -1 });
  drawPerson(442, 506, { tunic: '#8a6a4a', cloth: '#d0c8b8', facing: -1 });

  // Jesus, Zuhörer und Gesetzeslehrer im Inneren
  drawPerson(505, 410, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: -1 });
  glow(505, 320, 120, 'rgba(255,230,170,A)', 0.08);
  drawPerson(570, 436, { tunic: '#6a7a5a', cloth: '#c0b8a8', mode: 'sit', facing: -1 });
  drawPerson(600, 438, { tunic: '#5a5a7a', cloth: '#b8b0a0', mode: 'sit', facing: -1 });
  drawPerson(638, 430, { tunic: '#7a6a3a', cloth: '#d8c890', mode: 'sit', facing: -1 });
  drawPerson(684, 432, { tunic: '#6a5a42', cloth: '#e0d0a0', mode: 'sit', facing: -1 });
  drawKid(468, 438, { tunic: '#3a8a7a', cloth: '#6a4630', facing: 1 });
  drawPerson(382, 438, { tunic: '#8a6a4a', cloth: '#c0b8a8', mode: 'sit', facing: 1 });

  // Leiter: abgelegt oder angelehnt
  ctx.strokeStyle = '#6a4a2e';
  ctx.lineWidth = 5;
  if (F.leiterBereit) {
    ctx.beginPath(); ctx.moveTo(720, 504); ctx.lineTo(650, 170); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(750, 504); ctx.lineTo(680, 170); ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const x1 = 715 - i * 9, y1 = 480 - i * 39;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + 32, y1); ctx.stroke();
    }
  } else {
    ctx.beginPath(); ctx.moveTo(748, 484); ctx.lineTo(778, 320); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(778, 484); ctx.lineTo(808, 320); ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const y = 456 - i * 30;
      ctx.beginPath(); ctx.moveTo(754 + i * 5, y); ctx.lineTo(784 + i * 5, y); ctx.stroke();
    }
  }

  // Seile am Boden
  if (!F.tookSeil && !F.seileBefestigt) {
    ctx.strokeStyle = '#c4ad78';
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(826 + i * 8, 466, 18, 9, 0.2, 0, 7); ctx.stroke();
    }
    px(850, 444, 22, 36, '#b06a3a');                      // Wasserkrug
  } else {
    px(850, 444, 22, 36, '#b06a3a');
  }

  const lowering = fx.trage > 0 && !F.mannGeheilt;

  // Die vier Freunde und die Liege: Straße, Dach oder mitten im Raum
  if (!F.mannGeheilt && !F.leiterBereit) {
    drawPerson(112, 508, { tunic: '#5a7a54', cloth: '#c8d0b0', facing: 1 });
    drawPerson(210, 508, { tunic: '#6a5a7a', cloth: '#c8c0b0', facing: -1 });
    drawPerson(138, 472, { tunic: '#7a6a3a', cloth: '#d0c8a8', facing: 1 });
    drawPerson(232, 474, { tunic: '#5a6a8a', cloth: '#c0c8d0', facing: -1 });
    drawLiege(168, 460, 112, true);
  } else if (!F.mannGeheilt && !lowering) {
    drawPerson(385, 198, { tunic: '#5a7a54', cloth: '#c8d0b0', facing: 1 });
    drawPerson(620, 198, { tunic: '#6a5a7a', cloth: '#c8c0b0', facing: -1 });
    drawPerson(430, 186, { tunic: '#7a6a3a', cloth: '#d0c8a8', mode: 'sit', facing: 1 });
    drawPerson(575, 186, { tunic: '#5a6a8a', cloth: '#c0c8d0', mode: 'sit', facing: -1 });
    drawLiege(510, 172, 112, true);
    if (F.seileBefestigt) {
      ctx.strokeStyle = '#d8c08a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(458, 164); ctx.lineTo(458, 136); ctx.moveTo(562, 164); ctx.lineTo(562, 136); ctx.stroke();
    }
  } else if (lowering) {
    const y = 172 + fx.trage * 222;
    ctx.strokeStyle = '#d8c08a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(462, 164); ctx.lineTo(462, y - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(558, 164); ctx.lineTo(558, y - 10); ctx.stroke();
    drawLiege(510, y, 118, true);
  }

  if (F.mannGeheilt) {
    drawPerson(468, 430, { tunic: '#6a7a8a', cloth: '#d8c8b0', facing: 1 });
    px(486, 382, 42, 10, '#9a6a3a');                      // gerollte Liege unter dem Arm
    px(490, 374, 10, 24, '#6a4a2e');
  }

  // Levi als alter Begleiter am Rand des Geschehens
  if (F.leiterBereit && !F.mannGeheilt) {
    drawPerson(760, 506, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: -1 });
  } else {
    drawPerson(825, 505, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: -1 });
  }
}

/* --------------- Raum: Zollhaus in Kapernaum --------------- */

function drawZollhaus(t) {
  // Später Vormittag in Kapernaum, nahe der Straße vom See
  const sky = ctx.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, '#8fc8e4');
  sky.addColorStop(1, '#efd5a8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 300);
  glow(130, 78, 135, 'rgba(255,245,195,A)', 0.32);
  ctx.fillStyle = '#fff1bd';
  ctx.beginPath(); ctx.arc(130, 78, 25, 0, 7); ctx.fill();

  // See links im Hintergrund
  ctx.fillStyle = '#6aa3c6';
  ctx.beginPath();
  ctx.moveTo(0, 286);
  ctx.quadraticCurveTo(140, 268, 290, 292);
  ctx.lineTo(290, 338);
  ctx.lineTo(0, 338);
  ctx.closePath(); ctx.fill();
  for (let i = 0; i < 7; i++) {
    px(20 + i * 36, 298 + (i % 2) * 8, 24, 2, 'rgba(240,250,255,0.35)');
  }

  // Häuser und Stadtrand
  px(0, 300, W, 120, '#d2bd92');
  for (const [hx, hy, hw, hh] of [[72, 260, 150, 150], [250, 242, 132, 168], [388, 270, 110, 140]]) {
    px(hx, hy, hw, hh, '#c7ad84');
    px(hx - 8, hy - 18, hw + 16, 20, '#8a6a44');
    px(hx + 28, hy + 52, 34, 40, '#6a5438');
    px(hx + hw - 50, hy + 36, 28, 28, '#4a3a2a');
  }

  // Straße mit Zollschranke
  px(0, 420, W, 120, '#b99a6d');
  ctx.fillStyle = '#a98c62';
  for (let i = 0; i < 36; i++) px((i * 137) % 930, 430 + (i * 53) % 100, 19, 4, '#a98c62');
  px(624, 420, 116, 10, F.zoellnerCalled ? '#8a6a44' : '#5a3828');
  px(626, 404, 8, 58, '#5a3a26');
  px(724, 392, 8, 70, '#5a3a26');
  if (!F.zoellnerCalled) {
    ctx.strokeStyle = '#7a2f25';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(634, 412); ctx.lineTo(724, 394); ctx.stroke();
  }

  // Zollstand und Tisch
  px(470, 346, 178, 76, '#9a7248');
  px(458, 330, 202, 22, '#7a5432');
  for (let i = 0; i < 6; i++) px(462 + i * 34, 316, 34, 16, i % 2 ? '#b89462' : '#d6bd88');
  px(498, 430, 126, 34, '#6a4a2e');
  px(510, 464, 8, 36, '#4a3826');
  px(608, 464, 8, 36, '#4a3826');
  px(536, 412, 42, 14, '#8a5c36');                        // Schreibtafel
  ctx.fillStyle = '#d8b85a';                               // Münzen
  for (let i = 0; i < 9; i++) {
    ctx.beginPath(); ctx.arc(592 + (i % 3) * 10, 404 + Math.floor(i / 3) * 8, 4, 0, 7); ctx.fill();
  }
  px(514, 400, 20, 28, '#b06a3a');                         // Tinten-/Wachsgefäß

  // Levis Haus rechts: außen oder als Festmahl-Schnittansicht
  if (!F.gaesteEingeladen) {
    px(704, 228, 210, 242, '#c4aa80');
    px(694, 210, 230, 22, '#8a6a44');
    px(744, 350, 74, 120, '#4a3826');
    px(752, 358, 58, 112, '#6a4a2e');
    px(836, 288, 38, 42, '#4a3a2a');
    if (F.zoellnerCalled) glow(780, 392, 120, 'rgba(255,210,120,A)', 0.12);
  } else {
    px(410, 220, 430, 250, '#c4aa80');
    px(398, 202, 454, 24, '#8a6a44');
    px(438, 248, 362, 222, '#795f42');                    // Innenraum
    px(438, 424, 362, 46, '#634a32');

    // Festtafel
    px(478, 374, 286, 32, '#8a5c36');
    px(492, 364, 258, 12, '#c8a86a');
    px(506, 406, 10, 44, '#5a3824');
    px(728, 406, 10, 44, '#5a3824');
    ctx.fillStyle = '#d8c08a';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.arc(520 + i * 34, 374 + (i % 2) * 8, 8, 0, 7); ctx.fill();
    }
    px(628, 356, 34, 16, '#b06a3a');
    px(668, 360, 26, 12, '#6a8a4a');
    if (F.mahlDone && !F.weinVerstanden) {
      px(490, 456, 34, 18, '#6a3f2a');                    // alter Schlauch, hart und klein
      px(486, 450, 12, 10, '#5a3424');
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(492, 456); ctx.lineTo(518, 470); ctx.stroke();
      px(548, 450, 42, 24, '#b07a46');                    // neuer Schlauch, voller und weich
      px(542, 444, 14, 12, '#9a6338');
      ctx.strokeStyle = '#d8b07a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(554, 452); ctx.lineTo(584, 468); ctx.stroke();
    }

    drawPerson(540, 412, { tunic: '#e8e4d4', cloth: '#c8b89a', mode: 'sit', facing: 1 });      // Jesus
    drawPerson(610, 414, { tunic: '#7a5a42', cloth: '#d8c8b0', mode: 'sit', facing: -1 });     // Levi der Zöllner
    drawPerson(478, 430, { tunic: '#5a6a8a', cloth: '#c0c8d0', mode: 'sit', facing: 1 });
    drawPerson(700, 430, { tunic: '#6a5a7a', cloth: '#c8c0b0', mode: 'sit', facing: -1 });
    drawKid(646, 438, { tunic: '#7a8a4a', cloth: '#5a4630', facing: -1 });

    // Kritiker am Rand
    drawPerson(744, 500, { tunic: '#7a6a3a', cloth: '#e0d0a0', facing: -1 });
    drawPerson(800, 502, { tunic: '#6a5a42', cloth: '#d8c890', facing: -1 });
  }

  // Personen im Straßenzustand
  if (!F.gaesteEingeladen) {
    drawPerson(220, 505, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: 1 });                    // Levis alter Freund
    drawPerson(420, 505, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: 1 });                    // Jesus
    drawPerson(348, 508, { tunic: '#7a5a6a', cloth: '#c8c0b0', facing: 1 });
    drawKid(384, 510, { tunic: '#7a8a4a', cloth: '#5a4630', facing: 1 });

    if (!F.zoellnerCalled) {
      drawPerson(548, 506, { tunic: '#7a5a42', cloth: '#d8c8b0', mode: 'sit', facing: -1 });    // Levi am Zoll
    } else {
      drawPerson(760, 505, { tunic: '#7a5a42', cloth: '#d8c8b0', facing: -1 });                 // Levi beim Haus
      drawPerson(302, 505, { tunic: '#6a5a7a', cloth: '#c8c0b0', facing: 1 });                  // Kollegen
      drawPerson(342, 506, { tunic: '#5a6a8a', cloth: '#c0c8d0', facing: -1 });
      drawKid(374, 512, { tunic: '#8a6a4a', cloth: '#5a4630', facing: -1 });
    }
  } else {
    // Joel steht am Rand des Festes, Levi neben ihm
    drawPerson(220, 505, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: 1 });
    drawPerson(304, 506, { tunic: '#6a5a7a', cloth: '#c8c0b0', facing: 1 });
    drawPerson(348, 508, { tunic: '#5a6a8a', cloth: '#c0c8d0', facing: 1 });
  }
}

/* --------------- Raum: Kornfeld am Sabbat --------------- */

function drawSabbatFeld(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, 390);
  sky.addColorStop(0, '#86bfe2');
  sky.addColorStop(1, '#e9dfb8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 390);
  glow(780, 82, 140, 'rgba(255,245,195,A)', 0.3);
  ctx.fillStyle = '#fff0bc';
  ctx.beginPath(); ctx.arc(780, 82, 25, 0, 7); ctx.fill();

  // Hügel Galiläas
  ctx.fillStyle = '#7fa35a';
  ctx.beginPath(); ctx.ellipse(180, 396, 320, 78, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#6d934f';
  ctx.beginPath(); ctx.ellipse(740, 400, 360, 94, 0, Math.PI, 0); ctx.fill();

  // Kornfeld
  px(0, 360, W, 180, '#caa95c');
  ctx.strokeStyle = '#d8bd70';
  ctx.lineWidth = 2;
  for (let i = 0; i < 95; i++) {
    const x = (i * 47) % 960;
    const y = 372 + (i * 31) % 132;
    const sway = Math.sin(t * 1.4 + i) * 3;
    ctx.beginPath(); ctx.moveTo(x, y + 34); ctx.lineTo(x + sway, y); ctx.stroke();
    ctx.fillStyle = '#e2ca76';
    ctx.fillRect(x + sway - 3, y - 3, 6, 10);
  }

  // Weg durch das Feld
  ctx.fillStyle = '#9b8052';
  ctx.beginPath();
  ctx.moveTo(0, 480);
  ctx.quadraticCurveTo(240, 438, 420, 462);
  ctx.quadraticCurveTo(620, 488, 960, 430);
  ctx.lineTo(960, 540); ctx.lineTo(0, 540);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8e744a';
  for (let i = 0; i < 24; i++) px((i * 139) % 940, 466 + (i * 43) % 62, 18, 4, '#8e744a');

  // reife Ähren als Hotspot-Hinweis
  if (!F.tookAehren) {
    for (let i = 0; i < 12; i++) {
      const x = 542 + (i % 4) * 28;
      const y = 384 + Math.floor(i / 4) * 24;
      ctx.strokeStyle = '#f0d884';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y + 42); ctx.lineTo(x + Math.sin(t + i) * 2, y); ctx.stroke();
      ctx.fillStyle = '#f5de8a';
      ctx.fillRect(x - 4, y - 4, 8, 14);
    }
  }

  // Hände-Hotspot als kleine Geste bei Joel/Levi
  if (F.tookAehren && !F.koernerGerieben) {
    px(312, 462, 26, 12, '#d8a87a');
    px(318, 456, 20, 6, '#d8a87a');
    ctx.fillStyle = '#f0d884';
    ctx.fillRect(326, 452, 5, 14);
  }

  // Begleiter
  drawPerson(232, 505, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: 1 });    // Levi
  drawPerson(390, 505, { tunic: '#5a6a8a', cloth: '#c0c8d0', facing: 1 });    // Jünger
  drawPerson(440, 502, { tunic: '#6a5a7a', cloth: '#c8c0b0', facing: 1 });
  drawKid(482, 510, { tunic: '#7a8a4a', cloth: '#5a4630', facing: 1 });
  drawPerson(640, 500, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: -1 });   // Jesus

  // Beobachter
  drawPerson(768, 505, { tunic: '#7a6a3a', cloth: '#e0d0a0', facing: -1 });
  drawPerson(824, 507, { tunic: '#6a5a42', cloth: '#d8c890', facing: -1 });
}

/* --------------- Raum: Synagoge von Kapernaum --------------- */

function drawSynKapernaum(t) {
  // hellerer Kalkputz als in Nazaret
  px(0, 0, W, 400, '#b2a288');
  ctx.strokeStyle = '#9e8e70';
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, i * 80); ctx.lineTo(W, i * 80); ctx.stroke(); }
  for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 90 + (i % 2) * 45, 0); ctx.lineTo(i * 90 + (i % 2) * 45, 400); ctx.stroke(); }
  px(0, 396, W, 144, '#94846c');
  ctx.fillStyle = '#867660';
  for (let i = 0; i < 24; i++) px((i * 149) % 920, 410 + (i * 61) % 115, 26, 4, '#867660');

  // Säulen
  for (const cx2 of [110, 850]) {
    px(cx2 - 16, 70, 32, 330, '#cabb9e');
    px(cx2 - 22, 56, 44, 16, '#baab8e');
    px(cx2 - 22, 396, 44, 10, '#baab8e');
  }

  // Fenster links – das Licht fällt auf die leere Mitte
  px(140, 80, 120, 110, '#5a4a36');
  px(148, 88, 104, 94, '#ffeebf');
  px(194, 88, 8, 94, '#5a4a36');
  ctx.fillStyle = 'rgba(255,240,190,0.15)';
  ctx.beginPath();
  ctx.moveTo(148, 182); ctx.lineTo(252, 182); ctx.lineTo(560, 410); ctx.lineTo(400, 410);
  ctx.closePath(); ctx.fill();

  // Leuchter rechts
  px(802, 178, 8, 36, '#8a6a30');
  px(786, 210, 40, 8, '#8a6a30');
  ctx.strokeStyle = '#8a6a30';
  ctx.lineWidth = 5;
  for (const r of [14, 26]) {
    ctx.beginPath(); ctx.arc(806, 178, r, Math.PI, 0); ctx.stroke();
  }
  for (const lx of [780, 792, 806, 820, 832]) {
    const fl = Math.sin(t * 9 + lx) * 1.5;
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.moveTo(lx - 3, 156); ctx.lineTo(lx + fl * 0.4, 144); ctx.lineTo(lx + 3, 156);
    ctx.closePath(); ctx.fill();
  }
  glow(806, 160, 90, 'rgba(255,200,90,A)', 0.12);

  // Bima mit Lesepult und Jesus
  px(390, 396, 180, 16, '#7a6a50');
  px(398, 388, 164, 10, '#857458');
  drawPerson(480, 408, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: 1 });
  px(455, 352, 50, 10, '#5a4630');
  px(476, 362, 8, 40, '#5a4630');
  px(450, 344, 60, 9, '#d8c08a');
  px(446, 342, 8, 13, '#b89a5e');
  px(506, 342, 8, 13, '#b89a5e');

  // Bänke
  for (const [bx, bw] of [[130, 260], [596, 240]]) {
    px(bx, 486, bw, 10, '#6a5438');
    px(bx + 8, 496, 8, 22, '#5a4630');
    px(bx + bw - 16, 496, 8, 22, '#5a4630');
  }
  // links: Levi und Nachbarn
  drawPerson(160, 500, { tunic: '#7a5a6a', cloth: '#c8c0b0', mode: 'sit', facing: 1 });
  drawPerson(215, 502, { tunic: '#5d7a4a', cloth: '#d8d8d8', mode: 'sit', facing: 1 });  // Levi
  drawPerson(278, 500, { tunic: '#4a6a8a', cloth: '#b8a890', mode: 'sit', facing: 1 });
  // rechts: die erste Reihe – Schriftgelehrte und Pharisäer, sehr gerade
  drawPerson(622, 498, { tunic: '#7a6a3a', cloth: '#e0d0a0', mode: 'sit', facing: -1 });
  drawPerson(684, 498, { tunic: '#6a5a42', cloth: '#d8c890', mode: 'sit', facing: -1 });
  drawPerson(746, 498, { tunic: '#5a4a32', cloth: '#e8d8a8', mode: 'sit', facing: -1 });

  // der Mann mit der verdorrten Hand
  if (fx.mitte === 0) {
    px(852, 492, 36, 8, '#6a5438');                       // sein einsamer Schemel
    px(858, 500, 6, 18, '#5a4630');
    px(876, 500, 6, 18, '#5a4630');
    drawPerson(870, 498, { tunic: '#8a7a5a', cloth: '#a89478', mode: 'sit', facing: -1 });
    px(884, 460, 4, 24, '#7a6a4e');                       // die verdorrte rechte Hand hängt
  } else {
    const mx = 870 - fx.mitte * 395;
    const my = 498 - fx.mitte * 18;
    drawPerson(mx, my, { tunic: '#8a7a5a', cloth: '#a89478', facing: F.handGeheilt ? 1 : -1 });
    if (F.handGeheilt) {
      px(mx + 16, my - 100, 6, 30, '#d8a87a');            // die ausgestreckte, heile Hand
      glow(mx + 19, my - 104, 50, 'rgba(255,240,190,A)', 0.3);
    } else {
      px(mx + 15, my - 64, 4, 22, '#7a6a4e');             // noch hängt sie
    }
  }
}

/* --------------- Raum: Der Berg (Nacht der Zwölf) --------------- */

function drawBerg(t) {
  const m = fx.morgen;   // 0 = Nacht, 1 = Morgen

  // Nachthimmel mit verblassenden Sternen
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, '#04051a');
  sky.addColorStop(1, '#0d1535');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 420);
  for (const s of STARS) {
    ctx.fillStyle = `rgba(255,255,240,${(0.35 + 0.45 * Math.abs(Math.sin(t + s.ph))) * (1 - m)})`;
    ctx.fillRect(s.x, s.y, s.r * 2, s.r * 2);
  }
  if (m < 1) {                                            // Mond
    ctx.globalAlpha = 1 - m;
    ctx.fillStyle = '#e8e4cf';
    ctx.beginPath(); ctx.arc(112, 90, 30, 0, 7); ctx.fill();
    ctx.fillStyle = '#cfcab2';
    ctx.beginPath(); ctx.arc(103, 82, 7, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Lagerfeuer der wartenden Menge, unten in der Ebene (Lukas 6,17)
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `rgba(255,200,90,${0.4 + 0.3 * Math.abs(Math.sin(t * 2 + i * 2))})`;
    ctx.fillRect(14 + i * 22, 406 + (i % 2) * 6, 3, 3);
  }

  // der Berg
  ctx.fillStyle = '#141026';
  ctx.beginPath();
  ctx.moveTo(480, 540); ctx.lineTo(640, 240); ctx.lineTo(700, 160); ctx.lineTo(790, 112);
  ctx.lineTo(860, 160); ctx.lineTo(960, 300); ctx.lineTo(960, 540);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(180,160,130,0.25)';             // Pfad hinauf
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(600, 424);
  ctx.quadraticCurveTo(700, 400, 660, 330);
  ctx.quadraticCurveTo(760, 290, 740, 210);
  ctx.quadraticCurveTo(800, 190, 786, 150);
  ctx.stroke();

  // Jesus, betend auf dem Berg
  if (!F.jesusUnten) {
    glow(790, 158, 46, 'rgba(200,220,255,A)', 0.18 + 0.06 * Math.sin(t * 1.5));
    px(782, 150, 14, 16, '#e8e4d4');                      // kniende Gestalt
    px(786, 142, 8, 9, '#e8c9a0');
    px(780, 164, 20, 4, '#d8d4c4');
  }

  // Morgendämmerung legt sich über alles
  if (m > 0) {
    const dawn = ctx.createLinearGradient(0, 0, 0, 540);
    dawn.addColorStop(0, `rgba(60,50,110,${0.45 * m})`);
    dawn.addColorStop(0.7, `rgba(220,120,70,${0.4 * m})`);
    dawn.addColorStop(1, `rgba(255,180,100,${0.3 * m})`);
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, W, 420);
    glow(80, 410, 240, 'rgba(255,170,90,A)', 0.3 * m);
  }

  // Bergwiese
  px(0, 420, W, 120, '#16301e');
  ctx.fillStyle = '#1d3a26';
  for (let i = 0; i < 26; i++) px((i * 167) % 940, 432 + (i * 53) % 100, 14, 3, '#1d3a26');
  if (m > 0) { ctx.fillStyle = `rgba(255,170,90,${0.12 * m})`; ctx.fillRect(0, 420, W, 120); }

  // Reisig am Hang
  if (!F.bergReisig) {
    ctx.strokeStyle = '#7a5c34';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(98 + i * 9, 490);
      ctx.lineTo(116 + i * 8, 468 + (i % 3) * 5);
      ctx.stroke();
    }
  }

  drawFire(380, 488, F.bergFeuer, t);

  // das Nachtlager
  drawPerson(180, 504, { tunic: '#5d7a4a', cloth: '#d8d8d8', mode: 'sit', facing: 1 });               // Levi „überwacht“
  drawPerson(260, 506, { tunic: '#5a6a8a', cloth: '#c0c8d0', mode: 'sit', asleep: true, facing: 1 }); // Schläfer
  drawPerson(320, 510, { tunic: '#6a5a7a', cloth: '#c8c0b0', mode: 'sit', asleep: true, facing: -1 });
  drawPerson(520, 502, { tunic: '#4a6a7a', cloth: '#b8a890', mode: 'sit', facing: -1 });              // Simon, wach
  if (F.jesusUnten) drawPerson(620, 502, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: -1 });
}

/* --------------- Raum: Die Ebene (Feldrede) --------------- */

function drawEbene(t) {
  // Vormittagshimmel
  const sky = ctx.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, '#7cb2dd');
  sky.addColorStop(1, '#d9e9e2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 400);
  glow(150, 80, 130, 'rgba(255,250,210,A)', 0.3);
  ctx.fillStyle = '#fff6d0';
  ctx.beginPath(); ctx.arc(150, 80, 24, 0, 7); ctx.fill();

  // Schwalben
  ctx.strokeStyle = 'rgba(40,50,70,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const bx = ((t * 24 + i * 380) % 1100) - 70;
    const by = 90 + i * 44 + Math.sin(t * 2.2 + i * 2) * 7;
    ctx.beginPath();
    ctx.moveTo(bx - 7, by);
    ctx.quadraticCurveTo(bx - 3, by - 5, bx, by);
    ctx.quadraticCurveTo(bx + 3, by - 5, bx + 7, by);
    ctx.stroke();
  }

  // der Berg von gestern Nacht, fern im Dunst
  ctx.fillStyle = '#8aa0b2';
  ctx.beginPath();
  ctx.moveTo(620, 400); ctx.lineTo(760, 190); ctx.lineTo(830, 160); ctx.lineTo(890, 200);
  ctx.lineTo(960, 320); ctx.lineTo(960, 400);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a94a8';
  ctx.beginPath(); ctx.ellipse(200, 402, 320, 70, 0, Math.PI, 0); ctx.fill();

  // die Ebene
  px(0, 392, W, 148, '#4d8038');
  ctx.fillStyle = '#578e40';
  for (let i = 0; i < 30; i++) px((i * 167) % 940, 404 + (i * 53) % 126, 14, 3, '#578e40');

  // Feldstein-Kanzel mit Jesus
  ctx.fillStyle = '#8a8a90';
  ctx.beginPath(); ctx.ellipse(480, 484, 52, 16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#9a9aa2';
  ctx.beginPath(); ctx.ellipse(480, 478, 44, 12, 0, 0, 7); ctx.fill();
  drawPerson(480, 470, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: -1 });

  // die Zwölf, frisch im Amt
  drawPerson(570, 492, { tunic: '#4a6a7a', cloth: '#b8a890', facing: -1 });   // Petrus
  drawPerson(615, 500, { tunic: '#5a6a8a', cloth: '#c0c8d0', facing: -1 });
  drawPerson(660, 494, { tunic: '#6a5a7a', cloth: '#c8c0b0', facing: -1 });
  drawPerson(705, 502, { tunic: '#5a7a5a', cloth: '#d0c8b8', facing: -1 });
  drawPerson(745, 496, { tunic: '#7a5a4a', cloth: '#c8b890', facing: -1 });

  // die Menge
  drawPerson(160, 498, { tunic: '#7a5a6a', cloth: '#c8c0b0', facing: 1 });
  drawPerson(205, 508, { tunic: '#8a6a4a', cloth: '#d0c8b8', facing: 1 });
  drawPerson(295, 500, { tunic: '#5a6a8a', cloth: '#b8a890', facing: 1 });
  drawPerson(340, 510, { tunic: '#6a7a5a', cloth: '#c0b8a8', facing: 1 });
  drawKid(380, 514, { tunic: '#7a8a4a', cloth: '#5a4630', facing: 1 });
  drawKid(135, 512, { tunic: '#3a8a7a', cloth: '#6a4630', facing: 1 });

  // Levi auf seinem Stein mit Rückenlehne
  ctx.fillStyle = '#8a8a90';
  ctx.beginPath(); ctx.ellipse(250, 512, 26, 10, 0, 0, 7); ctx.fill();
  drawPerson(250, 508, { tunic: '#5d7a4a', cloth: '#d8d8d8', mode: 'sit', facing: 1 });

  // die alte Frau – gebeugt am Rand oder aufrecht in der ersten Reihe
  if (F.witweGeheilt) {
    drawPerson(370, 512, { tunic: '#9a6a8a', cloth: '#e8d8e0', facing: 1 });
  } else {
    drawPerson(95, 506, { tunic: '#9a6a8a', cloth: '#e8d8e0', mode: 'sit', facing: 1 });
    ctx.strokeStyle = '#8a7a5a';                          // ihr Stock
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(118, 506); ctx.lineTo(124, 446); ctx.stroke();
  }

  // der Steinmetz
  drawPerson(790, 504, { tunic: '#8a7a5a', cloth: '#a89478', facing: -1 });
}

/* --------------- Raum: Straße in Kapernaum (Hauptmann) --------------- */

function drawKapernaum(t) {
  // Tageshimmel
  const sky = ctx.createLinearGradient(0, 0, 0, 380);
  sky.addColorStop(0, '#7cb2dd');
  sky.addColorStop(1, '#dcebe8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 380);
  glow(480, 70, 120, 'rgba(255,250,210,A)', 0.28);
  ctx.fillStyle = '#fff6d0';
  ctx.beginPath(); ctx.arc(480, 70, 22, 0, 7); ctx.fill();

  // Möwen – der See ist nicht weit
  ctx.strokeStyle = 'rgba(60,70,90,0.65)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const bx = ((t * 26 + i * 420) % 1100) - 70;
    const by = 70 + i * 40 + Math.sin(t * 2.3 + i * 2) * 8;
    ctx.beginPath();
    ctx.moveTo(bx - 7, by);
    ctx.quadraticCurveTo(bx - 3, by - 5, bx, by);
    ctx.quadraticCurveTo(bx + 3, by - 5, bx + 7, by);
    ctx.stroke();
  }

  // Häuserzeile im Hintergrund
  px(0, 300, W, 130, '#c2b294');
  for (const [hx, hw, hy] of [[330, 110, 262], [460, 90, 280], [580, 100, 256]]) {
    px(hx, hy, hw, 430 - hy, '#d2c2a2');
    px(hx, hy, hw, 7, '#9a8a6a');
    px(hx + 14, hy + 26, 9, 12, '#4a3c2c');
  }

  // Synagoge links (vom Hauptmann gebaut)
  px(80, 260, 230, 140, '#e2d6b8');
  px(70, 244, 250, 20, '#cabb9e');
  ctx.fillStyle = '#cabb9e';                              // Giebel
  ctx.beginPath();
  ctx.moveTo(70, 244); ctx.lineTo(195, 200); ctx.lineTo(320, 244);
  ctx.closePath(); ctx.fill();
  for (const cx2 of [110, 160, 230, 280]) {              // Säulen
    px(cx2 - 9, 268, 18, 132, '#f0e6cc');
    px(cx2 - 13, 262, 26, 8, '#d8ccae');
  }
  px(178, 320, 36, 80, '#5a4a36');                       // Portal

  // Haus des Hauptmanns rechts
  px(690, 250, 270, 220, '#d8b89a');
  px(680, 236, 290, 18, '#a8542a');                      // römisches Ziegeldach
  px(700, 290, 50, 56, '#33271b');                       // Fenster
  px(880, 290, 50, 56, '#33271b');
  px(786, 390, 64, 102, '#5a4630');                      // Tür
  px(792, 396, 52, 96, '#6a5438');
  ctx.fillStyle = '#caa84f';
  ctx.beginPath(); ctx.arc(836, 446, 4, 0, 7); ctx.fill();
  px(760, 262, 116, 16, '#a8542a');                      // rotes Tuch über dem Eingang
  ctx.fillStyle = '#8a2a2a';
  ctx.beginPath();                                        // Rundschild an der Wand
  ctx.arc(740, 320, 16, 0, 7); ctx.fill();
  ctx.strokeStyle = '#caa84f';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(740, 320, 16, 0, 7); ctx.stroke();

  // Straße
  px(0, 420, W, 120, '#b0a080');
  ctx.fillStyle = '#a09070';
  for (let i = 0; i < 36; i++) px((i * 107) % 940, 432 + (i * 41) % 100, 24, 5, '#a09070');

  // Brunnen
  ctx.fillStyle = '#8a8a90';
  ctx.beginPath(); ctx.ellipse(580, 472, 40, 16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a5a64';
  ctx.beginPath(); ctx.ellipse(580, 468, 30, 11, 0, 0, 7); ctx.fill();

  // die Ältesten
  drawPerson(412, 502, { tunic: '#6a5a42', cloth: '#d8c890', facing: 1 });
  drawPerson(456, 508, { tunic: '#5a4a32', cloth: '#e8d8a8', facing: -1 });

  // Levi, in betont unauffälligem Abstand
  drawPerson(150, 505, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: 1 });

  // der Hauptmann vor seiner Tür (er läuft auf und ab, bis der Knecht gesund ist)
  const pace = F.knechtGesund ? 0 : Math.sin(t * 0.9) * 26;
  drawPerson(760 + pace, 505, { tunic: '#a03a3a', cloth: '#c8c8d4', facing: pace > 0 ? 1 : -1, walk: F.knechtGesund ? 0 : t * 6 });
  px(750 + pace, 397, 20, 6, '#c83232');                  // Helmbusch

  // Jesus kommt mit Begleitung (Lukas 7,6)
  if (F.jesusKommt) {
    drawPerson(300, 502, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: 1 });
    drawPerson(360, 506, { tunic: '#7a8a5a', cloth: '#c8d0a8', facing: 1 });   // der Freund des Hauptmanns
    drawPerson(245, 510, { tunic: '#5a6a8a', cloth: '#c0c8d0', facing: 1 });
    drawKid(215, 514, { tunic: '#7a8a4a', cloth: '#5a4630', facing: 1 });
  }

  // der gesunde Knecht in der Tür (Lukas 7,10)
  if (F.knechtGesund) {
    drawPerson(818, 500, { tunic: '#7aa88a', cloth: '#d8e8d8', facing: -1 });
    px(834, 404, 5, 26, '#d8a87a');                       // winkender Arm
  }
}

/* --------------- Raum: Vor dem Stadttor von Nain --------------- */

function drawNain(t) {
  // später Nachmittag, warmes Licht
  const sky = ctx.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, '#8aaed0');
  sky.addColorStop(0.7, '#d8c8a8');
  sky.addColorStop(1, '#e8d0a0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 400);
  glow(120, 120, 150, 'rgba(255,230,160,A)', 0.32);
  ctx.fillStyle = '#ffeec0';
  ctx.beginPath(); ctx.arc(120, 120, 26, 0, 7); ctx.fill();

  // Hügel im Dunst
  ctx.fillStyle = '#9aa888';
  ctx.beginPath(); ctx.ellipse(300, 404, 360, 70, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#8a9878';
  ctx.beginPath(); ctx.ellipse(700, 408, 320, 56, 0, Math.PI, 0); ctx.fill();

  // Stadtmauer und Tor von Nain
  px(760, 230, 200, 240, '#c2b294');
  for (let i = 0; i < 5; i++) px(764 + i * 41, 216, 26, 16, '#c2b294');
  ctx.fillStyle = '#5a4a36';
  ctx.beginPath();
  ctx.moveTo(800, 470); ctx.lineTo(800, 330);
  ctx.arc(848, 330, 48, Math.PI, 0);
  ctx.lineTo(896, 470);
  ctx.closePath(); ctx.fill();
  // Stadt hinter der Mauer
  for (const [hx, hy, hw, hh] of [[778, 176, 36, 42], [822, 158, 44, 60], [874, 170, 38, 48]]) {
    px(hx, hy, hw, hh, '#d2c2a2');
    px(hx, hy, hw, 5, '#9a8a6a');
  }

  // Zypressen – die Bäume der Gräber
  ctx.fillStyle = '#2e4a2e';
  for (const [zx, zh] of [[410, 150], [462, 120]]) {
    ctx.beginPath();
    ctx.moveTo(zx, 420);
    ctx.quadraticCurveTo(zx - 16, 420 - zh * 0.5, zx, 420 - zh);
    ctx.quadraticCurveTo(zx + 16, 420 - zh * 0.5, zx, 420);
    ctx.fill();
  }

  // staubiger Weg
  px(0, 420, W, 120, '#bca878');
  ctx.fillStyle = '#ac9868';
  for (let i = 0; i < 30; i++) px((i * 127) % 940, 434 + (i * 47) % 96, 20, 4, '#ac9868');

  // Jesus und sein Zug (links)
  drawPerson(250, 502, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: 1 });
  drawPerson(110, 505, { tunic: '#5a6a8a', cloth: '#c0c8d0', facing: 1 });
  drawPerson(150, 512, { tunic: '#7a5a6a', cloth: '#c8c0b0', facing: 1 });
  drawKid(188, 514, { tunic: '#7a8a4a', cloth: '#5a4630', facing: 1 });
  drawPerson(320, 505, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: 1 });   // Levi

  // der Trauerzug
  if (F.juenglingLebt) {
    px(596, 484, 120, 8, '#8a7a5e');                      // leere Bahre am Boden
    px(600, 480, 30, 5, '#e8e4d8');                       // zurückgelassene Tücher
    drawPerson(560, 505, { tunic: '#6a6a7a', cloth: '#b8c8d8', facing: 1 });  // Träger, staunend
    drawPerson(660, 500, { tunic: '#d8e8c8', cloth: '#e8e4d8', facing: 1 });  // Asa, lebendig
    drawPerson(705, 505, { tunic: '#4a4a6a', cloth: '#3a3a52', facing: -1 }); // seine Mutter, ganz nah
  } else {
    drawPerson(590, 502, { tunic: '#6a6a7a', cloth: '#b8c8d8', facing: -1 }); // Träger vorn
    drawPerson(724, 502, { tunic: '#62626f', cloth: '#a8b8c8', facing: -1 }); // Träger hinten
    px(596, 448, 120, 10, '#8a7a5e');                     // Bahre auf den Schultern
    ctx.fillStyle = '#e8e4d8';                            // der Tote, in Leinen
    ctx.beginPath(); ctx.ellipse(656, 442, 46, 10, 0, 0, 7); ctx.fill();
    drawPerson(745, 506, { tunic: '#4a4a6a', cloth: '#3a3a52', facing: -1 }); // die Witwe
  }

  // Klagefrauen mit Flöten
  drawPerson(826, 508, { tunic: '#3a3a52', cloth: '#52526a', facing: -1 });
  drawPerson(874, 502, { tunic: '#42425a', cloth: '#5a5a72', facing: -1 });
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(862, 412); ctx.lineTo(880, 418); ctx.stroke();  // Flöte
}

/* --------------- Raum: Die Boten des Johannes --------------- */

function drawJohannesfrage(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, '#7fa8cf');
  sky.addColorStop(0.65, '#c9d4bd');
  sky.addColorStop(1, '#e1c694');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 400);
  glow(820, 118, 135, 'rgba(255,230,160,A)', 0.26);
  ctx.fillStyle = '#ffe8a8';
  ctx.beginPath(); ctx.arc(820, 118, 24, 0, 7); ctx.fill();

  // Galiläische Hügel
  ctx.fillStyle = '#8aa07d';
  ctx.beginPath(); ctx.ellipse(190, 404, 340, 76, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#788e70';
  ctx.beginPath(); ctx.ellipse(590, 410, 390, 64, 0, Math.PI, 0); ctx.fill();

  // Haus am Weg
  px(720, 282, 210, 148, '#c8b08a');
  px(704, 268, 242, 22, '#7a5a3a');
  px(752, 334, 46, 96, '#5a422e');
  px(828, 322, 54, 42, '#8a765c');
  px(838, 330, 34, 26, '#d8c6a8');
  px(706, 430, 252, 14, '#9a8060');

  // Weg und Platz
  px(0, 420, W, 120, '#b99c68');
  ctx.fillStyle = '#c8ad78';
  ctx.beginPath();
  ctx.moveTo(0, 500);
  ctx.quadraticCurveTo(330, 410, 650, 470);
  ctx.quadraticCurveTo(820, 502, 960, 462);
  ctx.lineTo(960, 540);
  ctx.lineTo(0, 540);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 28; i++) px((i * 139) % 940, 436 + (i * 43) % 92, 18, 4, '#a98d5d');

  // Jesus im Zentrum
  drawPerson(585, 502, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: -1 });

  // Die Boten Johannes'
  drawPerson(412, 506, { tunic: '#756a4a', cloth: '#d7c4a0', facing: 1 });
  drawPerson(452, 508, { tunic: '#6a5a46', cloth: '#c8b490', facing: 1 });

  // Levi und die Armen
  drawPerson(318, 506, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: 1 });
  drawPerson(150, 512, { tunic: '#7a5a4a', cloth: '#d8c49a', mode: 'sit', facing: 1 });
  drawPerson(205, 510, { tunic: '#6a6a5a', cloth: '#c8b890', facing: 1 });
  drawKid(238, 518, { tunic: '#7a8a4a', cloth: '#5a4630', facing: 1 });

  // Menge um Jesus
  drawPerson(500, 510, { tunic: '#5a6a8a', cloth: '#c0c8d0', facing: 1 });
  drawPerson(538, 506, { tunic: '#7a5a6a', cloth: '#c8c0b0', facing: 1 });
  drawPerson(642, 508, { tunic: '#8a6a4a', cloth: '#d0c8b8', facing: -1 });
  drawKid(675, 516, { tunic: '#3a8a7a', cloth: '#6a4630', facing: -1 });

  // Blinder Mann, vor oder nach der Heilung
  if (F.blinderGeheilt) {
    drawPerson(610, 506, { tunic: '#8a7a5a', cloth: '#e0d0b0', facing: -1 });
    px(625, 411, 5, 24, '#d8a87a');                       // gehobener Arm
  } else {
    drawPerson(705, 506, { tunic: '#8a7a5a', cloth: '#e0d0b0', facing: -1 });
    ctx.strokeStyle = '#6a5136';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(722, 438); ctx.lineTo(742, 512); ctx.stroke();
  }
}

/* --------------- Raum: Haus des Pharisäers --------------- */

function drawPharisaeerhaus(t) {
  // Lehmwände und kühler Innenraum
  ctx.fillStyle = '#bfa57d';
  ctx.fillRect(0, 0, W, 390);
  ctx.fillStyle = '#a58b68';
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = '#8a7052';
  for (let y = 74; y < 360; y += 72) {
    for (let x = (y / 72) % 2 ? -40 : 0; x < W; x += 118) px(x, y, 92, 5, 'rgba(112,86,58,0.2)');
  }

  // Licht aus dem offenen Eingang
  ctx.fillStyle = '#4d3929';
  ctx.fillRect(820, 128, 118, 296);
  const doorLight = ctx.createLinearGradient(820, 150, 938, 360);
  doorLight.addColorStop(0, '#b9d6da');
  doorLight.addColorStop(1, '#e4c98f');
  ctx.fillStyle = doorLight;
  ctx.fillRect(836, 148, 86, 256);
  ctx.fillStyle = 'rgba(244,220,164,0.18)';
  ctx.beginPath();
  ctx.moveTo(836, 404); ctx.lineTo(922, 404); ctx.lineTo(785, 540); ctx.lineTo(650, 540); ctx.closePath(); ctx.fill();

  // Regal mit dem unberührten Salböl
  px(156, 202, 130, 18, '#6d4d31');
  px(170, 220, 10, 106, '#755538');
  px(264, 220, 10, 106, '#755538');
  px(186, 254, 52, 50, '#d0b879');
  px(198, 240, 28, 18, '#c4a461');
  px(203, 235, 18, 6, F.oelVermisst ? '#7a5838' : '#d8cc9a');
  px(244, 270, 16, 34, '#8e633e');

  // Boden, Teppiche und Waschbecken an der Tür
  px(0, 390, W, 150, '#927657');
  px(182, 480, 570, 48, '#7f3f36');
  px(194, 488, 546, 32, '#b06a45');
  for (let x = 206; x < 730; x += 42) px(x, 500, 20, 4, '#e1bc72');
  px(82, 470, 74, 14, '#7a583b');
  ctx.fillStyle = F.wasserVermisst ? '#b99e78' : '#7296a0';
  ctx.beginPath(); ctx.ellipse(119, 466, 38, 12, 0, 0, 7); ctx.fill();
  px(92, 478, 54, 18, '#65503d');

  // Niedriger U-förmiger Tisch mit Speisen
  px(390, 432, 338, 36, '#6c472c');
  px(405, 422, 308, 22, '#d8c395');
  px(405, 462, 34, 48, '#5b3d28');
  px(679, 462, 34, 48, '#5b3d28');
  ctx.fillStyle = '#d7ad55';
  ctx.beginPath(); ctx.ellipse(520, 426, 38, 9, 0, 0, 7); ctx.fill();
  px(494, 418, 52, 8, '#c88d42');
  ctx.fillStyle = '#75934d';
  ctx.beginPath(); ctx.arc(610, 424, 14, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(630, 427, 12, 0, 7); ctx.fill();
  px(665, 406, 18, 30, '#8f4f3f');

  // Simon, Jesus, Levi und weitere Gäste
  drawPerson(350, 494, { tunic: '#8b713e', cloth: '#f0d080', mode: 'sit', facing: 1 });
  drawPerson(610, 494, { tunic: '#e8e4d4', cloth: '#c8b89a', mode: 'sit', facing: -1 });
  drawPerson(270, 510, { tunic: '#5d7a4a', cloth: '#d8d8d8', mode: 'sit', facing: 1 });
  drawPerson(440, 488, { tunic: '#586b82', cloth: '#b8c6d2', mode: 'sit', facing: 1 });
  drawPerson(710, 494, { tunic: '#73566a', cloth: '#cdb7bd', mode: 'sit', facing: -1 });

  // Die Frau bleibt hinter Jesus bei seinen Füßen.
  if (F.frauEingetreten) {
    drawPerson(690, 518, { tunic: '#7d4f65', cloth: '#f0c8dc', mode: 'sit', facing: -1 });
    ctx.fillStyle = '#dfc991';
    ctx.beginPath(); ctx.ellipse(660, 500, 12, 18, -0.3, 0, 7); ctx.fill();
    px(655, 479, 10, 8, '#b69562');
    ctx.strokeStyle = 'rgba(160,210,225,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(681, 452); ctx.lineTo(674, 475 + Math.sin(t * 2) * 2); ctx.stroke();
  }
}

/* --------------- Raum: Das Gleichnis vom Sämann --------------- */

function drawSaemannfeld(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, 360);
  sky.addColorStop(0, '#73a9d1');
  sky.addColorStop(1, '#d8d5a7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 360);
  glow(820, 92, 110, 'rgba(255,235,160,A)', 0.23);
  ctx.fillStyle = '#ffe7a0';
  ctx.beginPath(); ctx.arc(820, 92, 22, 0, 7); ctx.fill();

  // Hügel und Dörfer der Reise durch Galiläa
  ctx.fillStyle = '#66895c';
  ctx.beginPath(); ctx.ellipse(170, 362, 340, 78, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#7f9662';
  ctx.beginPath(); ctx.ellipse(650, 370, 470, 94, 0, Math.PI, 0); ctx.fill();
  for (const [x, y, w, h] of [[42, 246, 54, 48], [104, 260, 44, 34], [156, 236, 64, 58]]) {
    px(x, y, w, h, '#cdb886');
    px(x - 5, y - 10, w + 10, 12, '#7f5d3d');
    px(x + 12, y + 20, 12, h - 20, '#58432f');
  }

  // Feldgrund und vier deutlich verschiedene Böden
  px(0, 360, W, 180, '#9d8156');
  px(0, 430, 205, 110, '#c1a87c');                       // harter Weg
  for (let i = 0; i < 12; i++) px((i * 79) % 195, 448 + (i * 37) % 80, 30, 4, '#a98d65');

  px(210, 430, 205, 110, '#a9845e');                     // felsiger Boden
  for (const [x, y, w, h] of [[222, 460, 42, 20], [286, 438, 54, 26], [354, 476, 48, 22], [248, 516, 58, 18]]) {
    ctx.fillStyle = '#756d68';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, -0.15, 0, 7); ctx.fill();
  }

  px(425, 430, 210, 110, '#806b49');                     // Dornenboden
  ctx.strokeStyle = '#3f5532';
  ctx.lineWidth = 5;
  for (let i = 0; i < 9; i++) {
    const x = 438 + i * 23;
    ctx.beginPath(); ctx.moveTo(x, 535); ctx.quadraticCurveTo(x - 14, 488, x + 8, 448); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 4, 493); ctx.lineTo(x - 18, 479); ctx.moveTo(x + 2, 477); ctx.lineTo(x + 16, 463); ctx.stroke();
  }

  px(645, 430, 315, 110, '#735c3c');                     // guter Boden
  for (let y = 446; y < 535; y += 22) {
    ctx.strokeStyle = '#5d482f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(652, y); ctx.lineTo(952, y); ctx.stroke();
  }

  // Sichtbare Folgen der Aussaat
  if (F.wegBesaet) {
    for (let i = 0; i < 10; i++) px(18 + i * 18, 456 + (i % 3) * 18, 4, 3, '#dcc584');
    for (let i = 0; i < 3; i++) {
      const bx = 42 + i * 56 + Math.sin(t * 2 + i) * 4;
      const by = 474 + (i % 2) * 22;
      ctx.fillStyle = '#383a40';
      ctx.beginPath(); ctx.ellipse(bx, by, 10, 6, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 8, by); ctx.lineTo(bx + 17, by + 3); ctx.lineTo(bx + 8, by + 5); ctx.fill();
      px(bx - 4, by + 5, 2, 11, '#5a4632');
    }
  }

  if (F.felsBesaet) {
    for (let i = 0; i < 7; i++) {
      const x = 230 + i * 27;
      ctx.strokeStyle = '#8b8a4b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 510); ctx.quadraticCurveTo(x + 5, 486, x + 13, 496); ctx.stroke();
      px(x + 8, 493, 10, 4, '#a59b55');
    }
  }

  if (F.dornenBesaet) {
    for (let i = 0; i < 6; i++) {
      const x = 450 + i * 31;
      ctx.strokeStyle = '#9ca75d'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 526); ctx.lineTo(x + 4, 482); ctx.stroke();
      px(x - 3, 480, 14, 4, '#aeb866');
    }
  }

  if (F.guterBodenBesaet) {
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 12; i++) {
        const x = 662 + i * 24 + row * 5;
        const y = 520 - row * 20;
        const h = 48 + ((i + row) % 3) * 7;
        ctx.strokeStyle = '#d5b552'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
        ctx.fillStyle = '#e4c765';
        ctx.beginPath(); ctx.ellipse(x, y - h - 7, 4, 10, -0.2, 0, 7); ctx.fill();
      }
    }
  }

  // Reisegemeinschaft, Sämann und Zuhörer
  drawPerson(210, 424, { tunic: '#7e4c68', cloth: '#e8b8d0', facing: 1 });
  drawPerson(260, 424, { tunic: '#4d7180', cloth: '#b8d8e8', facing: 1 });
  drawPerson(310, 424, { tunic: '#806f49', cloth: '#d8c8a0', facing: 1 });
  drawPerson(120, 428, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: 1 });
  drawPerson(470, 420, { tunic: '#806335', cloth: '#e8cf8a', facing: 1 });

  if (!F.samenErhalten) {
    ctx.fillStyle = '#8a6742';
    ctx.beginPath(); ctx.ellipse(447, 423, 24, 15, 0, 0, 7); ctx.fill();
    px(429, 408, 36, 9, '#aa8654');
  }

  drawPerson(560, 380, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: 1 });
  drawPerson(630, 416, { tunic: '#55708a', cloth: '#bed0df', facing: -1 });
  drawPerson(680, 420, { tunic: '#76566c', cloth: '#ccb9c5', facing: -1 });
  drawPerson(730, 416, { tunic: '#79664b', cloth: '#d0c3a8', facing: -1 });
  drawKid(780, 426, { tunic: '#3f806f', cloth: '#664832', facing: -1 });
}

/* --------------- Raum: Die Stillung des Sturms --------------- */

function drawSturmsee(t) {
  const s = fx.sturm;
  const sky = ctx.createLinearGradient(0, 0, 0, 380);
  sky.addColorStop(0, F.sturmGestillt ? '#789fb5' : '#75a9c8');
  sky.addColorStop(1, F.sturmGestillt ? '#e1c88f' : '#c3d3c5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 380);

  // Ferne Ufer des Sees
  ctx.fillStyle = '#60785f';
  ctx.beginPath();
  ctx.moveTo(0, 318); ctx.quadraticCurveTo(180, 260, 360, 318);
  ctx.quadraticCurveTo(600, 278, 960, 320); ctx.lineTo(960, 380); ctx.lineTo(0, 380); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(15,24,38,${0.78 * s})`;
  ctx.fillRect(0, 0, W, 390);

  // Sturmwolken und gelegentliche Blitze
  if (s > 0.05) {
    ctx.fillStyle = `rgba(28,35,49,${0.72 * s})`;
    for (let i = 0; i < 8; i++) {
      const cx = ((i * 151 + t * 18) % 1120) - 80;
      const cy = 72 + (i % 3) * 55;
      ctx.beginPath(); ctx.ellipse(cx, cy, 115, 43, 0, 0, 7); ctx.fill();
    }
    const flash = Math.max(0, Math.sin(t * 3.1) - 0.96) * 12 * s;
    if (flash > 0) {
      ctx.fillStyle = `rgba(225,235,255,${Math.min(0.72, flash)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(245,248,255,${Math.min(1, flash + 0.2)})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(760, 0); ctx.lineTo(728, 82); ctx.lineTo(752, 76); ctx.lineTo(712, 174); ctx.stroke();
    }
  }

  // Bewegter See
  const sea = ctx.createLinearGradient(0, 300, 0, 540);
  sea.addColorStop(0, '#326f88');
  sea.addColorStop(1, '#173f5a');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 320, W, 220);
  for (let row = 0; row < 7; row++) {
    const y = 342 + row * 30;
    const amp = 3 + s * (8 + row * 1.5);
    ctx.strokeStyle = row % 2 ? '#75a7b4' : '#a7c4c2';
    ctx.globalAlpha = 0.35 + s * 0.28;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 20) {
      const yy = y + Math.sin(x * 0.035 + t * (1.2 + s * 2.8) + row) * amp;
      if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const bob = s * Math.sin(t * 3.4) * 10;
  const deckY = 420 + bob;

  // Bootskörper
  ctx.fillStyle = '#4b3021';
  ctx.beginPath();
  ctx.moveTo(190, deckY); ctx.lineTo(806, deckY); ctx.lineTo(752, deckY + 92);
  ctx.quadraticCurveTo(500, deckY + 128, 245, deckY + 88); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#805536';
  ctx.beginPath();
  ctx.moveTo(208, deckY + 8); ctx.lineTo(790, deckY + 8); ctx.lineTo(774, deckY + 30);
  ctx.lineTo(224, deckY + 30); ctx.closePath(); ctx.fill();
  px(218, deckY - 2, 572, 10, '#aa7849');
  for (let x = 250; x < 760; x += 70) px(x, deckY + 37, 8, 54, '#34251c');

  // Wasser im Boot und Schöpfgefäß
  if (s > 0.1 && !F.sturmWasserGeschoepft) {
    ctx.fillStyle = `rgba(80,155,180,${0.42 + s * 0.32})`;
    ctx.beginPath(); ctx.ellipse(475, deckY + 38, 220, 28, 0, 0, 7); ctx.fill();
  } else if (s > 0.1) {
    ctx.fillStyle = 'rgba(90,155,175,0.3)';
    ctx.beginPath(); ctx.ellipse(470, deckY + 48, 125, 14, 0, 0, 7); ctx.fill();
  }
  px(380, deckY + 18, 30, 26, '#987047');
  px(386, deckY + 10, 18, 10, '#b98d57');

  // Mast und Segel
  px(468, 145, 13, deckY - 138, '#5c422d');
  px(392, 180, 168, 10, '#684a31');
  if (F.sturmSegelGesichert) {
    px(405, 194, 142, 26, '#b8ad96');
    for (let x = 416; x < 540; x += 28) px(x, 192, 5, 32, '#705238');
  } else if (s > 0.12) {
    ctx.fillStyle = '#c9c2ad';
    ctx.beginPath();
    ctx.moveTo(475, 192);
    ctx.quadraticCurveTo(575 + Math.sin(t * 7) * 24, 244, 548, 356);
    ctx.quadraticCurveTo(500 + Math.sin(t * 6) * 18, 330, 478, 300);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = '#ddd4bc';
    ctx.beginPath(); ctx.moveTo(475, 192); ctx.lineTo(555, 208); ctx.lineTo(480, 358); ctx.closePath(); ctx.fill();
  }

  // Menschen im Boot
  drawPerson(350, deckY + 18, { tunic: '#5d7a4a', cloth: '#d8d8d8', facing: 1 });
  drawPerson(470, deckY + 18, { tunic: '#526f88', cloth: '#c0d8ff', facing: 1 });
  drawPerson(560, deckY + 18, { tunic: '#47748a', cloth: '#8ad8f0', facing: 1 });

  if (F.sturmGestillt) {
    drawPerson(710, deckY + 18, { tunic: '#e8e4d4', cloth: '#c8b89a', facing: -1 });
  } else {
    // Jesus schläft während der Überfahrt.
    px(654, deckY - 4, 118, 18, '#6d4d34');
    ctx.fillStyle = '#e8e4d4';
    ctx.beginPath(); ctx.ellipse(708, deckY - 14, 48, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d3a97f';
    ctx.beginPath(); ctx.arc(756, deckY - 17, 11, 0, 7); ctx.fill();
  }

  // Gischt vor dem Boot
  if (s > 0.1) {
    ctx.strokeStyle = `rgba(220,240,245,${0.35 + 0.45 * s})`;
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const x = 150 + i * 150 + Math.sin(t * 4 + i) * 18;
      const y = 448 + i % 2 * 45;
      ctx.beginPath(); ctx.arc(x, y, 35 + s * 18, Math.PI * 1.05, Math.PI * 1.82); ctx.stroke();
    }
  }

  // Regen liegt über der gesamten Szene.
  if (s > 0.05) {
    ctx.strokeStyle = `rgba(190,220,235,${0.28 + 0.48 * s})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 75; i++) {
      const x = ((i * 137 + t * 420) % 1080) - 60;
      const y = (i * 83 + t * 310) % 590 - 30;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y + 30); ctx.stroke();
    }
  }
}

/* --------------- Sprechtext --------------- */

function wrapText(text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawSpeech() {
  if (!speech) return;
  const a = ACTORS[speech.actor];
  const [ax, ay] = a.pos();
  ctx.font = 'bold 17px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  const lines = wrapText(speech.text, 420);
  const lh = 21;
  let maxw = 0;
  for (const l of lines) maxw = Math.max(maxw, ctx.measureText(l).width);
  const cx2 = clamp(ax, maxw / 2 + 12, W - maxw / 2 - 12);
  let yy = Math.max(24, ay - (lines.length - 1) * lh);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.fillStyle = a.color;
  for (const l of lines) {
    ctx.strokeText(l, cx2, yy);
    ctx.fillText(l, cx2, yy);
    yy += lh;
  }
}

/* ============================================================
   HAUPTSCHLEIFE & EINGABE
   ============================================================ */

let lastT = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const t = now / 1000;

  // Animationen
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    const p = clamp((now - a.t0) / a.ms, 0, 1);
    a.fn(p);
    if (p >= 1) { anims.splice(i, 1); a.res(); }
  }

  updatePlayer(dt);

  if (speech && now >= speech.until) finishSpeech();

  // Lamm-Blöken als Hinweis
  if (state.started && !F.lambSaved && state.room === 'field') {
    bleatTimer -= dt;
    if (bleatTimer <= 0) { bleatUntil = now + 1500; bleatTimer = 8; }
  }

  // Zeichnen
  if (state.room === 'feldtag') drawFeldTag(t);
  else if (state.room === 'field') drawField(t);
  else if (state.room === 'weg') drawWeg(t);
  else if (state.room === 'city') drawCity(t);
  else if (state.room === 'flucht') drawFlucht(t);
  else if (state.room === 'aegypten') drawAegypten(t);
  else if (state.room === 'nazaret') drawNazaret(t);
  else if (state.room === 'synagoge') drawSynagoge(t);
  else if (state.room === 'see') drawSee(t);
  else if (state.room === 'haus') drawHaus(t);
  else if (state.room === 'zollhaus') drawZollhaus(t);
  else if (state.room === 'sabbatfeld') drawSabbatFeld(t);
  else if (state.room === 'synagoge2') drawSynKapernaum(t);
  else if (state.room === 'berg') drawBerg(t);
  else if (state.room === 'ebene') drawEbene(t);
  else if (state.room === 'kapernaum') drawKapernaum(t);
  else if (state.room === 'nain') drawNain(t);
  else if (state.room === 'johannesfrage') drawJohannesfrage(t);
  else if (state.room === 'pharisaeerhaus') drawPharisaeerhaus(t);
  else if (state.room === 'saemannfeld') drawSaemannfeld(t);
  else if (state.room === 'sturmsee') drawSturmsee(t);
  else drawStable(t);

  if (player.visible) {
    const alt = state.room === 'nazaret' || state.room === 'synagoge' || state.room === 'see' || state.room === 'haus' || state.room === 'zollhaus' || state.room === 'sabbatfeld' || state.room === 'synagoge2' || state.room === 'berg' || state.room === 'ebene' || state.room === 'kapernaum' || state.room === 'nain' || state.room === 'johannesfrage' || state.room === 'pharisaeerhaus' || state.room === 'saemannfeld' || state.room === 'sturmsee';   // Joel ist ergraut
    drawPerson(player.x, player.y, {
      tunic: '#8a6b3f', cloth: alt ? '#c8c8c8' : '#c9b48a',
      facing: player.facing,
      walk: player.walking ? player.walkT : 0,
    });
  }

  drawSpeech();

  if (fx.fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fx.fade})`;
    ctx.fillRect(0, 0, W, H);
  }

  requestAnimationFrame(loop);
}

function toGame(e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
}

cv.addEventListener('mousemove', e => {
  if (!state.started) return;
  const [mx, my] = toGame(e);
  const hs = isBlocked() ? null : hotspotAt(mx, my);
  hoverName = hs ? hs.name : '';
  cv.classList.toggle('hot', !!hs);
  updateSentence();
});

cv.addEventListener('click', e => {
  if (!state.started) return;
  const [mx, my] = toGame(e);
  if (speech) { finishSpeech(); return; }
  if (isBlocked()) return;
  const hs = hotspotAt(mx, my);
  if (hs) {
    const v = state.verb, it = state.item;
    resetVerb();
    doAction(hs, v, it);
  } else {
    resetVerb();
    walkPlayerTo(mx, my);
  }
});

document.getElementById('startBtn').onclick = async () => {
  document.getElementById('title').classList.add('hidden');
  state.started = true;
  await intro();
};

document.getElementById('restartBtn').onclick = () => location.reload();

renderVerbs();
renderInv();
updateSentence();
requestAnimationFrame(loop);

/* ============================================================
   DEBUG-MODUS
   Aktiv, wenn config.json {"debug": true} enthält
   (oder ?debug=1 an der URL hängt – nötig bei file://,
   weil der Browser dort kein JSON nachladen darf).
   ============================================================ */

const DEBUG_PRESETS = {
  'Prolog: Tag auf dem Feld': {
    room: 'feldtag', pos: [560, 500], flags: {}, inv: [],
  },
  'Feld: Anfang (Nacht)': {
    room: 'field', pos: [560, 500],
    flags: { tookEimer: false, traenkeVoll: true, tookFloete: true, floeteGiven: true, tagDone: true },
    inv: [],
  },
  'Feld: Stern- & Engel-Cutscene': {
    room: 'field', pos: [560, 500],
    flags: { tookWood: true, tookStaff: true, fireLit: true, lambSaved: true },
    inv: ['stab', 'lamm'],
    action: async () => { F.starDone = true; await cutscene(() => starCutscene()); },
  },
  'Feld: nach dem Engel': {
    room: 'field', pos: [560, 500],
    flags: { tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true, angelDone: true },
    inv: ['stab', 'lamm'],
  },
  'Weg nach Bethlehem: Zwischenszene': {
    room: 'weg', pos: [40, 508],
    flags: { tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true, angelDone: true },
    inv: ['stab', 'lamm'],
    action: async () => { await cutscene(async () => { await wegSzene(); await arriveCity(); }); },
  },
  'Stadt: Ankunft': {
    room: 'city', pos: [250, 508],
    flags: { tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true, angelDone: true },
    inv: ['stab', 'lamm'],
  },
  'Stadt: Weg zum Stall bekannt': {
    room: 'city', pos: [600, 508],
    flags: { tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true, angelDone: true,
             wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true },
    inv: ['stab', 'lamm'],
  },
  'Stall: Finale': {
    room: 'stable', pos: [190, 505],
    flags: { tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true, angelDone: true,
             wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true },
    inv: ['stab', 'lamm'],
  },
  'Kapitel 2: Flucht – Start': {
    room: 'flucht', pos: [700, 508], facing: -1,
    flags: { tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true, angelDone: true,
             wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true },
    inv: ['stab'],
  },
  'Kapitel 2: Soldat abgelenkt': {
    room: 'flucht', pos: [560, 508], facing: -1,
    flags: { tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true, angelDone: true,
             wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true },
    inv: ['stab'],
  },
  'Kapitel 3: Ägypten – Ankunft': {
    room: 'aegypten', pos: [300, 508], facing: 1,
    flags: { tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true, angelDone: true,
             wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true },
    inv: ['stab'],
  },
  'Kapitel 3: Abend (Marias Erzählung)': {
    room: 'aegypten', pos: [600, 508], facing: 1,
    flags: { tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true, angelDone: true,
             wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true },
    inv: ['stab', 'schlauch'],
    action: async () => { F.abendDone = true; await cutscene(() => abendCutscene()); },
  },
  'Kapitel 4: Nazaret – Heimkehr': {
    room: 'nazaret', pos: [300, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true },
    inv: ['stab'],
  },
  'Kapitel 5: Synagoge (Predigt)': {
    room: 'synagoge', pos: [280, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true },
    inv: ['stab'],
  },
  'Kapitel 6: See Gennesaret': {
    room: 'see', pos: [740, 508], facing: -1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true },
    inv: ['stab'],
  },
  'Kapitel 6: Fang-Cutscene': {
    room: 'see', pos: [640, 512], facing: -1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => bootUndFang()); },
  },
  'Kapitel 7: Kapernaum – Haus': {
    room: 'haus', pos: [760, 508], facing: -1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true },
    inv: ['stab'],
  },
  'Kapitel 7: Heilung durchs Dach': {
    room: 'haus', pos: [720, 512], facing: -1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, tookSeil: true, seileBefestigt: true, leiterBereit: true, dachOffen: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => heilungCutscene()); },
  },
  'Kapitel 8: Zollhaus': {
    room: 'zollhaus', pos: [260, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true },
    inv: ['stab'],
  },
  'Kapitel 8: Levi gerufen': {
    room: 'zollhaus', pos: [700, 508], facing: -1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, tookEinladung: true },
    inv: ['stab', 'einladung'],
  },
  'Kapitel 8: Festmahl': {
    room: 'zollhaus', pos: [250, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, tookEinladung: true, gaesteEingeladen: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => mahlCutscene()); },
  },
  'Kapitel 9: Weinschläuche': {
    room: 'zollhaus', pos: [250, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true },
    inv: ['stab'],
  },
  'Kapitel 9: Antwort-Cutscene': {
    room: 'zollhaus', pos: [500, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true,
             alterSchlauchGesehen: true, neuerSchlauchGesehen: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => weinschlauchAntwort()); },
  },
  'Kapitel 10: Ähren am Sabbat': {
    room: 'sabbatfeld', pos: [240, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true },
    inv: ['stab'],
  },
  'Kapitel 10: Sabbat-Streit': {
    room: 'sabbatfeld', pos: [540, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => sabbatStreit()); },
  },
  'Kapitel 11: Die verdorrte Hand': {
    room: 'synagoge2', pos: [280, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true, sabbatDone: true },
    inv: ['stab'],
  },
  'Kapitel 11: Heilungs-Cutscene': {
    room: 'synagoge2', pos: [345, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true, sabbatDone: true,
             mannMet: true, lauerErkannt: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => heilungHandCutscene()); },
  },
  'Kapitel 12: Die Zwölf (Nachtlager)': {
    room: 'berg', pos: [480, 508], facing: -1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true, sabbatDone: true,
             mannMet: true, lauerErkannt: true, handGeheilt: true },
    inv: ['stab'],
  },
  'Kapitel 12: Berufungs-Cutscene': {
    room: 'berg', pos: [480, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true, sabbatDone: true,
             mannMet: true, lauerErkannt: true, handGeheilt: true,
             bergReisig: true, bergFeuer: true, simonNacht: true },
    inv: ['stab'],
    action: async () => { F.zwoelfDone = true; fx.morgen = 0; await cutscene(() => morgenCutscene()); },
  },
  'Kapitel 13: Die Feldrede (Ebene)': {
    room: 'ebene', pos: [700, 508], facing: -1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true, sabbatDone: true,
             mannMet: true, lauerErkannt: true, handGeheilt: true,
             bergReisig: true, bergFeuer: true, simonNacht: true, jesusUnten: true, zwoelfDone: true },
    inv: ['stab'],
  },
  'Kapitel 13: Feldrede-Cutscene': {
    room: 'ebene', pos: [420, 515], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true, sabbatDone: true,
             mannMet: true, lauerErkannt: true, handGeheilt: true,
             bergReisig: true, bergFeuer: true, simonNacht: true, jesusUnten: true, zwoelfDone: true,
             witweGeheilt: true, steinmetzMet: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => feldredeCutscene()); },
  },
  'Kapitel 14: Der Hauptmann (Kapernaum)': {
    room: 'kapernaum', pos: [280, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true, sabbatDone: true,
             mannMet: true, lauerErkannt: true, handGeheilt: true,
             bergReisig: true, bergFeuer: true, simonNacht: true, jesusUnten: true, zwoelfDone: true,
             witweGeheilt: true, steinmetzMet: true, feldredeDone: true },
    inv: ['stab'],
  },
  'Kapitel 14: Hauptmann-Cutscene': {
    room: 'kapernaum', pos: [340, 510], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true, sabbatDone: true,
             mannMet: true, lauerErkannt: true, handGeheilt: true,
             bergReisig: true, bergFeuer: true, simonNacht: true, jesusUnten: true, zwoelfDone: true,
             witweGeheilt: true, steinmetzMet: true, feldredeDone: true,
             hauptmannMet: true, aeltesteLos: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => hauptmannCutscene()); },
  },
  'Kapitel 15: Der Jüngling zu Nain': {
    room: 'nain', pos: [380, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true, sabbatDone: true,
             mannMet: true, lauerErkannt: true, handGeheilt: true,
             bergReisig: true, bergFeuer: true, simonNacht: true, jesusUnten: true, zwoelfDone: true,
             witweGeheilt: true, steinmetzMet: true, feldredeDone: true,
             hauptmannMet: true, aeltesteLos: true, jesusKommt: true, knechtGesund: true },
    inv: ['stab'],
  },
  'Kapitel 15: Auferweckungs-Cutscene': {
    room: 'nain', pos: [380, 508], facing: 1,
    flags: { tagDone: true, tookWood: true, tookStaff: true, fireLit: true, lambSaved: true, starDone: true,
             angelDone: true, wirtOut: true, metWaechter: true, knowsCouple: true, foundStable: true,
             tookKrug: true, soldierBusy: true, fleeing: true,
             tookSchlauch: true, eselWasser: true, dattelnTaken: true, dattelnGiven: true, abendDone: true,
             toldRahel: true, toldEli: true, toldMirjam: true, josefDa: true, heimkehrDone: true,
             simonMet: true, netzeSauber: true, bootAngefragt: true, bootDraussen: true, fangDone: true,
             tragerMet: true, seileBefestigt: true, leiterBereit: true, dachOffen: true, mannGeheilt: true,
             zoellnerCalled: true, gaesteEingeladen: true, mahlDone: true, weinVerstanden: true, sabbatStart: true,
             tookAehren: true, koernerGerieben: true, sabbatDone: true,
             mannMet: true, lauerErkannt: true, handGeheilt: true,
             bergReisig: true, bergFeuer: true, simonNacht: true, jesusUnten: true, zwoelfDone: true,
             witweGeheilt: true, steinmetzMet: true, feldredeDone: true,
             hauptmannMet: true, aeltesteLos: true, jesusKommt: true, knechtGesund: true,
             traegerMet: true, mengeStill: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => nainCutscene()); },
  },
  'Kapitel 16: Die Boten des Johannes': {
    room: 'johannesfrage', pos: [300, 508], facing: 1,
    flags: { tookStaff: true, juenglingLebt: true, johannesBotenMet: true },
    inv: ['stab'],
  },
  'Kapitel 16: Antwort-Cutscene': {
    room: 'johannesfrage', pos: [560, 508], facing: 1,
    flags: { tookStaff: true, juenglingLebt: true, johannesBotenMet: true,
             blinderGefuehrt: true, blinderGeheilt: true, armeHoeren: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => johannesAntwortCutscene()); },
  },
  'Kapitel 17: Haus des Pharisäers': {
    room: 'pharisaeerhaus', pos: [250, 508], facing: 1,
    flags: { tookStaff: true, antwortGesandt: true, pharisaeerMahlBegonnen: true },
    inv: ['stab'],
  },
  'Kapitel 17: Vergebungs-Cutscene': {
    room: 'pharisaeerhaus', pos: [500, 508], facing: 1,
    flags: { tookStaff: true, antwortGesandt: true, pharisaeerMahlBegonnen: true,
             wasserVermisst: true, kussVermisst: true, oelVermisst: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => suenderinCutscene()); },
  },
  'Kapitel 18: Das Gleichnis vom Sämann': {
    room: 'saemannfeld', pos: [180, 510], facing: 1,
    flags: { tookStaff: true, frauVergeben: true, reiseFrauenVorgestellt: true },
    inv: ['stab'],
  },
  'Kapitel 18: Erklärung des Gleichnisses': {
    room: 'saemannfeld', pos: [560, 510], facing: 1,
    flags: { tookStaff: true, frauVergeben: true, reiseFrauenVorgestellt: true,
             samenErhalten: true, wegBesaet: true, felsBesaet: true,
             dornenBesaet: true, guterBodenBesaet: true },
    inv: ['stab', 'samen'],
    action: async () => { await cutscene(() => saemannGleichnisCutscene()); },
  },
  'Kapitel 19: Die Stillung des Sturms': {
    room: 'sturmsee', pos: [300, 438], facing: 1,
    flags: { tookStaff: true, gleichnisErklaert: true,
             sturmFahrtBegonnen: true, sturmBegonnen: true },
    inv: ['stab'],
  },
  'Kapitel 19: Stillungs-Cutscene': {
    room: 'sturmsee', pos: [520, 438], facing: 1,
    flags: { tookStaff: true, gleichnisErklaert: true,
             sturmFahrtBegonnen: true, sturmBegonnen: true,
             sturmSegelGesichert: true, sturmWasserGeschoepft: true,
             sturmJuengerBereit: true },
    inv: ['stab'],
    action: async () => { await cutscene(() => sturmStillungCutscene()); },
  },
};

function applyPreset(p) {
  for (const k of Object.keys(F)) F[k] = false;
  Object.assign(F, p.flags || {});
  state.inventory = [...(p.inv || [])];
  state.item = null;
  state.room = p.room;
  player.x = p.pos[0]; player.y = p.pos[1];
  player.tx = player.x; player.ty = player.y;
  player.walking = false;
  player.facing = p.facing || 1;
  fx.starGrow = F.starDone ? 1 : 0;
  fx.angelVisible = false;
  fx.angelGlow = 0;
  fx.abend = F.abendDone ? 1 : 0;
  fx.sonne = F.tagDone ? 1 : 0;
  fx.boot = F.bootDraussen ? 1.5 : 0;
  fx.boot2 = F.fangDone ? 1 : 0;
  fx.trage = F.mannGeheilt ? 1 : 0;
  fx.mitte = F.handGeheilt ? 1 : 0;
  fx.morgen = F.zwoelfDone ? 1 : 0;
  fx.sturm = F.sturmBegonnen && !F.sturmGestillt ? 1 : 0;
  fx.fade = 0;
  speech = null;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('ending').classList.add('hidden');
  state.started = true;
  resetVerb();
}

function buildDebugMenu() {
  const d = document.createElement('div');
  d.id = 'debug';
  const h = document.createElement('div');
  h.id = 'debugTitle';
  h.textContent = 'DEBUG – SZENE WÄHLEN';
  d.appendChild(h);
  for (const name of Object.keys(DEBUG_PRESETS)) {
    const b = document.createElement('button');
    b.textContent = name;
    // Reload + sessionStorage: so startet jeder Sprung aus sauberem Zustand,
    // auch wenn gerade eine Cutscene läuft.
    b.onclick = () => { sessionStorage.setItem('debugJump', name); location.reload(); };
    d.appendChild(b);
  }
  document.getElementById('wrap').appendChild(d);
}

async function initDebug() {
  let dbg = false;
  try {
    const r = await fetch('config.json', { cache: 'no-store' });
    if (r.ok) dbg = (await r.json()).debug === true;
  } catch (e) { /* file:// – JSON-Laden nicht erlaubt, dann zählt nur ?debug */ }
  if (new URLSearchParams(location.search).has('debug')) dbg = true;
  if (!dbg) return;
  buildDebugMenu();
  const jump = sessionStorage.getItem('debugJump');
  if (jump && DEBUG_PRESETS[jump]) {
    sessionStorage.removeItem('debugJump');
    const p = DEBUG_PRESETS[jump];
    applyPreset(p);
    if (p.action) await p.action();
  }
}

initDebug();
