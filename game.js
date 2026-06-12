'use strict';

/* ============================================================
   EIN STERN ÜBER BETHLEHEM – Kapitel 1–6
   Ein Point-&-Click-Adventure nach Lukas 1–5 und Matthäus 2
   ============================================================ */

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;

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
  levi:     { color: '#b8e070', pos: () => state.room === 'see' ? [840, 382] : state.room === 'synagoge' ? [215, 380] : (state.room === 'field' || state.room === 'feldtag') ? [468, 365] : state.room === 'weg' ? [560, 370] : state.room === 'city' ? [190, 372] : [225, 390] },
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
  jesus:    { color: '#ffe8b0', pos: () => state.room === 'see' ? (fx.boot > 0 ? [640 - fx.boot * 140, 310 - fx.boot * 55] : [255, 375]) : [480, 240] },
  simon:    { color: '#8ad8f0', pos: () => fx.boot > 0 ? [640 - fx.boot * 140 + 30, 320 - fx.boot * 55] : [520, 380] },
  menge:    { color: '#e0c8ff', pos: () => state.room === 'see' ? [210, 395] : [700, 380] },
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
  F.ended = true;
  await animate(1800, p => { fx.fade = p; });
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
  else drawStable(t);

  if (player.visible) {
    const alt = state.room === 'nazaret' || state.room === 'synagoge' || state.room === 'see';   // Joel ist ergraut
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
