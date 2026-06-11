'use strict';

/* ============================================================
   EIN STERN ÜBER BETHLEHEM – Kapitel 1
   Ein Point-&-Click-Adventure nach Lukas 1–2
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
  room: 'field',
  verb: 'Gehe zu',
  item: null,          // gewähltes Inventar-Item (für Benutze/Gib)
  inventory: [],
  started: false,
};

const F = {              // Story-Flags
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
  ended: false,
};

const fx = {             // animierte Werte
  starGrow: 0,
  angelY: -220,
  angelGlow: 0,
  angelVisible: false,
  famX: 320,
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
  levi:     { color: '#b8e070', pos: () => state.room === 'field' ? [468, 365] : state.room === 'city' ? [190, 372] : [225, 390] },
  schimon:  { color: '#ffb060', pos: () => state.room === 'field' ? [295, 398] : state.room === 'city' ? [135, 370] : [150, 412] },
  wirt:     { color: '#ff9a8a', pos: () => [530, 200] },
  waechter: { color: '#c8b8ff', pos: () => [722, 378] },
  katze:    { color: '#ffffff', pos: () => [318, 420] },
  engel:    { color: '#aef3ff', pos: () => [480, Math.max(60, fx.angelY - 95)] },
  chor:     { color: '#fff0a0', pos: () => [480, 150] },
  maria:    { color: '#9fb6ff', pos: () => state.room === 'flucht' ? [258, 358] : [405, 392] },
  josef:    { color: '#d8b48a', pos: () => state.room === 'flucht' ? [228, 326] : [560, 380] },
  soldat:   { color: '#ff8a7a', pos: () => F.soldierBusy ? [690, 398] : [370, 374] },
  esel:     { color: '#cabba8', pos: () => [430, 428] },
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
    await say('erzaehler', 'Felder bei Bethlehem. Nachts. Irgendwann zwischen Lukas 1 und Lukas 2.');
    await say('joel', 'Ich bin Joel. Hirte. Nachtschicht. Schon wieder.');
    await say('joel', 'Das Lagerfeuer ist fast aus, Schimon schläft im Sitzen, und irgendwo blökt ein verlorenes Lamm.');
    await say('joel', 'Na großartig. Dann wollen wir mal.');
  });
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
  F.fleeing = true;
  fx.famX = 320;
  await say('joel', 'Die Straße nach Süden ist frei. Über Hebron, dann der Karawanenweg – sechs Tagesmärsche bis Ägypten.');
  const dep = animate(7000, p => { fx.famX = 320 + p * 760; });
  await wait(900);
  await say('soldat', 'Hmm? Habt ihr wasch gesagt? ...*hicks*');
  await say('joel', 'Zieht mit Gott. Und wenn alles vorbei ist... kommt heim.');
  await dep;
  await say('erzaehler', 'Da stand Josef auf und floh noch in der Nacht mit dem Kind und dessen Mutter nach Ägypten. (Matthäus 2,14)');
  await say('erzaehler', 'So erfüllte sich, was der Herr durch den Propheten gesagt hat: „Aus Ägypten habe ich meinen Sohn gerufen.“ (Matthäus 2,15)');
  await say('joel', 'Lauf, kleiner König. Die Welt ist noch lange nicht fertig mit dir.');
  F.ended = true;
  await animate(1800, p => { fx.fade = p; });
  document.getElementById('ending').classList.remove('hidden');
}

/* ============================================================
   DIALOGE
   ============================================================ */

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

/* ============================================================
   RÄUME & HOTSPOTS
   ============================================================ */

const rooms = {
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
  if (state.room === 'field') drawField(t);
  else if (state.room === 'city') drawCity(t);
  else if (state.room === 'flucht') drawFlucht(t);
  else drawStable(t);

  if (player.visible) {
    drawPerson(player.x, player.y, {
      tunic: '#8a6b3f', cloth: '#c9b48a',
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
  'Feld: Anfang': {
    room: 'field', pos: [560, 500], flags: {}, inv: [],
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
