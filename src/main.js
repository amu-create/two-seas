// 시작점: 시작 화면(방 만들기/들어가기) → 연결 → 게임
import { Game, loadProgress } from './game/game.js';
import { Input } from './game/input.js';
import { Background } from './render/bg.js';
import { AudioBox } from './audio/audio.js';
import { Link } from './net/link.js';
import { pickChannel } from './net/channel.js';
import { makeChapter, CHAPTERS, CHAPTER_NAMES } from './chapters/index.js';

const $ = (s) => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const SESSION_KEY = 'twoseas.session.v1';

const audio = new AudioBox();
const input = new Input(document.body);
const bg = new Background($('#bg'));
// ---------- 음성 대화 ----------
// 마이크 단추를 누른 사람의 목소리만 짝에게 간다. 폰끼리 직접 연결됐을 때만 된다(중계로는 목소리를 못 보낸다).
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('off'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('off'), 3200); }
const voice = {
  link: null, stream: null, peerOn: false,
  attach(l) {
    this.link = l; this.peerOn = false;
    l.on('voice', (stream) => { const a = $('#voice'); a.srcObject = stream; const p = a.play(); if (p && p.catch) p.catch(() => {}); });
    l.on('mic', (d) => { const was = this.peerOn; this.peerOn = !!(d && d.on); if (this.peerOn && !was && !this.stream) toast('짝이 마이크를 켰어요. 나도 켜려면 마이크 단추를 눌러요'); this.refresh(); });
    if (this.stream) l.setMic(this.stream.getAudioTracks()[0]);
    this.refresh();
  },
  refresh() {
    const b = $('#btnMic'), l = this.link;
    b.classList.toggle('hidden', !l || !l.peerId);
    b.classList.toggle('na', !!l && !l.canVoice && !this.stream);
    b.classList.toggle('on', !!this.stream);
    b.classList.toggle('peer', this.peerOn);
    if (l && l.status === 'ok' && this.stream && this._told !== l.mode) { this._told = l.mode; if (l.mode !== 'p2p') toast('지금은 중계 연결이라 게임 안 음성이 안 돼요. 전화를 스피커로 켜 주세요'); }
  },
  async toggle() {
    const l = this.link; if (!l) return;
    const a = $('#voice'); const p = a.play(); if (p && p.catch) p.catch(() => {}); // 누른 김에 받는 소리도 깨운다 (아이폰)
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; await l.setMic(null); this.refresh(); return; }
    if (!l.canVoice) { toast('목소리는 두 폰이 직접 연결됐을 때만 돼요. 지금은 중계 연결이라 전화를 함께 써 주세요'); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('이 브라우저에서는 마이크를 쓸 수 없어요'); return; }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      await l.setMic(this.stream.getAudioTracks()[0]);
      toast(this.peerOn ? '마이크 켜짐' : '마이크 켜짐 · 짝도 마이크 단추를 누르면 서로 들려요');
    } catch (e) { this.stream = null; toast('마이크 권한이 필요해요. 주소창의 권한 설정에서 마이크를 허용해 주세요'); }
    this.refresh();
  },
};
$('#btnMic').addEventListener('click', () => voice.toggle());

// ---------- 게임 도중 나가기 ----------
// 짝에게 "나갔어요"를 알리고, 이 방의 이어하기 기록을 지운 뒤 처음 화면으로. 깬 장 기록(장 고르기)은 남는다.
let left = null;
function leaveRoom() {
  try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); localStorage.removeItem('twoseas.save.v2'); } catch (e) { /* 무시 */ }
  location.href = location.pathname;
}
$('#btnExit').addEventListener('click', () => $('#exitAsk').classList.remove('hidden'));
$('#exitNo').addEventListener('click', () => $('#exitAsk').classList.add('hidden'));
$('#exitYes').addEventListener('click', () => {
  try { if (link) { link.send('bye', {}); } } catch (e) { /* 무시 */ }
  if (voice.stream) voice.stream.getTracks().forEach((t) => t.stop());
  setTimeout(leaveRoom, 350); // 알림이 나갈 틈
});
$('#waitHome').addEventListener("click", leaveRoom);
// 마이크를 미리 받아 둔다 (떨어져 있어요를 고른 순간: 버튼을 누른 순간이어야 권한 창이 뜬다)
voice.prepare = async function () {
  if (this.stream || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); if (this.link) await this.link.setMic(this.stream.getAudioTracks()[0]); } catch (e) { this.stream = null; this.denied = true; }
  this.refresh();
};

// ---------- 나란히 앉았어요 / 떨어져 있어요 ----------
let mode = 'near';
try { mode = localStorage.getItem('twoseas.mode') || 'near'; } catch (e) { /* 무시 */ }
const MODE_TIP = { near: '서로 화면은 보여 주지 말고, 말로만 알려 주세요', far: '게임 안 음성 대화를 켜요 · 안 되면 전화를 스피커로' };
function renderMode() { for (const b of document.querySelectorAll('#modeRow button')) b.classList.toggle('sel', b.dataset.mode === mode); $('#modeTip').textContent = MODE_TIP[mode]; }
for (const b of document.querySelectorAll('#modeRow button')) b.addEventListener('click', () => { mode = b.dataset.mode; try { localStorage.setItem('twoseas.mode', mode); } catch (e) { /* 무시 */ } renderMode(); if (mode === 'far') voice.prepare(); });
renderMode();
let greeted = false;
function greet() { // 처음 이어졌을 때 한 번만
  if (greeted) return; greeted = true;
  let seen = false; try { seen = !!localStorage.getItem('twoseas.sigHint'); localStorage.setItem('twoseas.sigHint', '1'); } catch (e) { /* 무시 */ }
  const msgs = [];
  if (mode === 'near') msgs.push('화면은 서로 보여 주지 말고, 말로만!');
  else if (voice.stream && link && link.mode === 'p2p') msgs.push('음성 대화가 켜졌어요. 짝도 켜면 서로 들려요');
  else msgs.push('게임 안 음성은 직접 연결일 때만 돼요. 전화를 스피커로 켜 주세요');
  if (!seen) msgs.push('화면을 길게 누르면 신호를 보낼 수 있어요 (여기!·지금!·멈춰!·3·2·1)');
  msgs.forEach((m, i) => setTimeout(() => toast(m), 600 + i * 3600));
}

const ui = {
  onLink(status, mode) {
    const net = $('#net');
    net.className = status === 'ok' ? (mode === 'p2p' ? 'p2p' : 'relay') : 'lost';
    net.querySelector('span').textContent = status === 'ok' ? (mode === 'p2p' ? '직접 연결' : '중계 연결') : '연결 찾는 중';
    const playing = game.W.phase !== 'lobby';
    $('#wait').classList.toggle('hidden', !(playing && status !== 'ok'));
    if (status === 'ok') { hideLobby(); setTimeout(greet, 3500); }
    // 짝이 나간 뒤: 연결이 한 번 끊겼다가 다시 이어질 때(짝이 돌아왔을 때)까지 안내를 남겨 둔다
    if (left) { if (status !== 'ok') left.lost = true; else if (left.lost) { left = null; $('#waitText').textContent = '짝을 기다리는 중'; $('#waitHome').classList.add('hidden'); } }
    if (left) $('#wait').classList.remove('hidden');
    $('#btnExit').classList.toggle('hidden', !playing && status !== 'ok');
    if (status === 'full') { $('#joinStatus').textContent = '방이 가득 찼어요'; }
    voice.refresh();
  },
  onEnd(show, ch) {
    $('#endui').classList.toggle('hidden', !show); $('#hud').classList.toggle('ending', !!show);
    if (show) { $('#btnNext').classList.toggle('hidden', !ch || ch.id >= CHAPTERS.length); renderChapters(); }
  },
  onChapter() { /* 도구 단추는 게임이 매 프레임 정한다 (input.setTool) */ },
};
const game = new Game({ canvas: $('#game'), bg, input, audio, chapter: makeChapter(Math.max(1, Math.min(CHAPTERS.length, Number(qs.get('ch')) || loadProgress() + 1))), ui });
ui.onChapter(game.chapter);
window.__twoSeas = game; // 테스트·진단용
if (qs.has('nobg')) bg.ok = false;
if (qs.has('drawEvery')) game.drawEvery = Number(qs.get('drawEvery')); // 시험용: 그리기만 드문드문 // 시험용: 배경 셰이더 끄기
if (qs.has('tier')) { game.lockTier = Number(qs.get('tier')); game.perf.tier = game.lockTier; game._applyTier(); }

let link = null;
let room = null;

// ---------- 화면 전환 ----------
function show(id) { for (const s of ['#scrHome', '#scrHost', '#scrJoin']) $(s).classList.toggle('hidden', s !== id); $('#lobby').classList.remove('hidden', 'out'); }
function hideLobby() {
  const l = $('#lobby');
  if (l.classList.contains('out')) return;
  l.classList.add('out');
  setTimeout(() => l.classList.add('hidden'), 650);
  $('#hud').classList.remove('hidden');
  $('#hud').classList.add('first');
}
function firstTouch() {
  audio.unlock();
  audio.loop('sea', 0.9);
  audio.loop('music', 0.8);
  const el = document.documentElement;
  // 안드로이드: 전체 화면 + 가로 고정 (아이폰 사파리는 지원하지 않아서 "가로로 돌려 주세요" 안내로 대신한다)
  const narrow = Math.min(screen.width, screen.height) < 900;
  if (narrow && el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
  keepAwake();
}
let wake = null;
async function keepAwake() { // 플레이 중 화면이 꺼지지 않게
  try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* 지원 안 하는 브라우저 */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && link) keepAwake(); });
let touched = false;
for (const type of ['pointerup', 'touchend', 'click', 'keydown']) document.addEventListener(type, () => { if (!touched) { touched = true; firstTouch(); } else audio.unlock(); }, { passive: true });

// ---------- 방 ----------
const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const newCode = () => String(Math.floor(1000 + Math.random() * 9000));
function saveSession(s) { try { const j = JSON.stringify(s); sessionStorage.setItem(SESSION_KEY, j); localStorage.setItem(SESSION_KEY, j); } catch (e) { /* 저장 못 해도 진행 */ } }
function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
}
// 같은 브라우저의 다른 탭이 이미 그 자리를 쓰고 있는지 물어본다 (한 PC에서 탭 두 개로 시험할 때 헷갈리지 않게)
function idInUse(id) {
  return new Promise((res) => {
    if (!('BroadcastChannel' in window) || sessionStorage.getItem(SESSION_KEY)) { res(false); return; }
    const bc = new BroadcastChannel('twoseas'); let done = false;
    bc.onmessage = (e) => { if (e.data && e.data.have === id && !done) { done = true; bc.close(); res(true); } };
    bc.postMessage({ ask: id });
    setTimeout(() => { if (!done) { done = true; bc.close(); res(false); } }, 180);
  });
}
function announce(id) {
  if (!('BroadcastChannel' in window)) return;
  const bc = new BroadcastChannel('twoseas');
  bc.onmessage = (e) => { if (e.data && e.data.ask === id) bc.postMessage({ have: id }); };
}

function linkOpts() {
  const o = {};
  if (qs.get('net')) o.net = qs.get('net');
  if (qs.get('broker')) o.brokers = [qs.get('broker')];
  if (qs.get('rtc') === '0') o.rtc = false;
  if (qs.get('nostun')) o.noStun = true;
  return o;
}

async function openRoom(code, isHost, id, resume) {
  if (link) { link.close(); link = null; }
  room = code;
  game.setRole(isHost ? 0 : 1);
  if (resume) game.restore(code);
  else game.W = game._freshWorld();
  saveSession({ room: code, id, host: isHost });
  announce(id);
  link = new Link({ room: code, id, isHost, opts: linkOpts() });
  game.attach(link, code);
  voice.attach(link);
  link.on('bye', () => { // 짝이 나갔다
    left = { lost: false };
    $('#waitText').textContent = '짝이 방에서 나갔어요'; $('#wait').classList.remove('hidden'); $('#waitHome').classList.remove('hidden');
    toast('짝이 나갔어요. 같은 방 주소로 다시 들어오면 이어서 할 수 있어요');
  });
  link.on('clash', () => { if (isHost && !link.peerId && game.W.phase === 'lobby') { // 같은 번호의 방이 이미 있다 → 번호를 바꾼다
    createRoom(); } });
  const u = new URL(location.href); u.searchParams.set('room', code); u.searchParams.delete('host');
  history.replaceState(null, '', u);
  $('#waitCode').textContent = '방 코드 ' + code;
  await link.start();
}

async function createRoom(fixed) {
  const code = fixed || newCode();
  show('#scrHost');
  $('#code').textContent = code;
  $('#hostStatus').textContent = '짝을 기다리는 중';
  if (game.chapter.id !== chosen) game.setChapter(chosen);
  await openRoom(code, true, newId(), false);
  showInvite(code);
}
// 짝이 찍을 QR과 주소. PC에서 localhost로 열었으면, 폰이 접속할 수 있는 와이파이 주소로 바꿔서 보여준다.
async function showInvite(code) {
  if (!pickChannel.info && /^(localhost|127\.)/.test(location.hostname)) { try { pickChannel.info = await (await fetch('relay-info', { cache: 'no-store' })).json(); } catch (e) { /* 중계 서버 없음 */ } }
  const url = new URL(location.href);
  url.search = ''; url.searchParams.set('room', code);
  for (const k of ['net', 'broker', 'rtc', 'nostun']) if (qs.get(k)) url.searchParams.set(k, qs.get(k));
  const info = pickChannel.info;
  let note = '';
  if (/^(localhost|127\.)/.test(url.hostname)) {
    if (info && info.lan && info.lan.length) url.hostname = info.lan[0];
    else note = '  ← 폰에서는 이 PC의 와이파이 주소로 열어야 해요';
  }
  $('#hostUrl').textContent = url.href.replace(/^https?:\/\//, '') + note;
  drawQr(url.href);
}

let joinTimer = null;
function joinRoom(code, id, resume) {
  $('#joinStatus').innerHTML = '<span class="dots"><i></i><i></i><i></i></span>방을 찾는 중';
  clearTimeout(joinTimer);
  joinTimer = setTimeout(() => { if (link && link.status !== 'ok') $('#joinStatus').textContent = '방을 못 찾았어요. 코드를 다시 확인해 주세요'; }, 9000);
  openRoom(code, false, id || newId(), resume);
}

function drawQr(text) {
  const c = $('#qr');
  try {
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), cell = 6;
    c.width = c.height = n * cell;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#081a2c';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(k * cell, r * cell, cell, cell);
  } catch (e) { c.width = c.height = 10; }
}

// 장 고르기: 깬 장의 다음 장까지 고를 수 있다 (이 폰에 저장된 진행 상황). 방을 만드는 사람이 고른다.
let chosen = Math.min(CHAPTERS.length, loadProgress() + 1);
if (qs.get('ch')) chosen = Math.max(1, Math.min(CHAPTERS.length, Number(qs.get('ch')) || 1));
function renderChapters() {
  const box = $('#chapters'), open = CHAPTERS.length; // 장은 언제나 다 고를 수 있다 (깬 기록은 별·시간으로만 남긴다)
  box.innerHTML = '';
  CHAPTER_NAMES.forEach((name, i) => {
    const n = i + 1, b = document.createElement('button');
    b.innerHTML = `<b>${n}</b>${name}`;
    b.className = (n === chosen ? 'sel' : '') + (n > open ? ' locked' : '');
    b.addEventListener('click', () => { if (n > open) return; chosen = n; if (!link) game.setChapter(n); renderChapters(); });
    box.appendChild(b);
  });
}

// 숫자판 (가로 화면에서 폰 키보드가 화면을 다 가리지 않게 직접 만든 것)
let typed = '';
function renderCode() {
  const cells = document.querySelectorAll('#codeIn b');
  cells.forEach((b, i) => { b.textContent = typed[i] || ''; b.classList.toggle('cur', i === typed.length); });
}
function key(k) {
  if (k === '←') typed = typed.slice(0, -1); else if (typed.length < 4) typed += k;
  renderCode();
  if (typed.length === 4) joinRoom(typed);
  else { clearTimeout(joinTimer); $('#joinStatus').innerHTML = '&nbsp;'; }
}
for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←']) {
  const b = document.createElement('button');
  if (!k) { b.style.visibility = 'hidden'; } else { b.textContent = k; b.addEventListener('click', () => key(k)); }
  $('#keys').appendChild(b);
}
window.addEventListener('keydown', (e) => {
  if ($('#scrJoin').classList.contains('hidden') || $('#lobby').classList.contains('hidden')) return;
  if (/^\d$/.test(e.key)) key(e.key); else if (e.key === 'Backspace') key('←');
});

$('#btnCreate').addEventListener('click', () => { touched = true; firstTouch(); createRoom(); });
$('#btnJoin').addEventListener('click', () => { touched = true; firstTouch(); typed = ''; renderCode(); show('#scrJoin'); });
const goHome = () => { if (link) { link.close(); link = null; } clearTimeout(joinTimer); game.link = null; game.room = null; game.setRole(0); game.W = game._freshWorld(); const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(null, '', u); show('#scrHome'); };
$('#backHost').addEventListener('click', goHome);
$('#backJoin').addEventListener('click', goHome);
$('#btnAgain').addEventListener('click', () => game.restartChapter());
$('#btnNext').addEventListener('click', () => game.nextChapter());
$('#btnMute').addEventListener('click', () => { const m = !audio.muted; audio.setMuted(m); $('#btnMute').classList.toggle('off', m); try { localStorage.setItem('twoseas.mute', m ? '1' : ''); } catch (e) { /* 무시 */ } });
try { if (localStorage.getItem('twoseas.mute')) { audio.setMuted(true); $('#btnMute').classList.add('off'); } } catch (e) { /* 무시 */ }
document.addEventListener('pointerdown', () => { if (input.used) $('#hud').classList.remove('first'); });
setInterval(() => { if (input.used) $('#hud').classList.remove('first'); }, 500);

// 진단 표시: 연결 표시(화면 위 가운데)를 세 번 톡톡톡 치면 초당 프레임·화질 단계·지연이 보인다
let dbgTaps = 0, dbgAt = 0, dbgOn = qs.has('fps');
$('#net').addEventListener('pointerdown', () => { const n = performance.now(); dbgTaps = n - dbgAt < 600 ? dbgTaps + 1 : 1; dbgAt = n; if (dbgTaps >= 3) { dbgOn = !dbgOn; dbgTaps = 0; $('#dbg').classList.toggle('hidden', !dbgOn); } });
setInterval(() => {
  if (!dbgOn) return;
  $('#dbg').classList.remove('hidden');
  const p = game.perf, l = game.link;
  $('#dbg').textContent = `${p.fps} fps · 가장 느린 프레임 ${Math.round(p.worstLast || 0)}ms · 화질 ${4 - p.tier}/4` + (l ? ` · ${l.mode === 'p2p' ? '직접' : '중계'} ${Math.round(l.rtt)}ms` : '');
}, 500);

// ---------- 시작 ----------
(async function boot() {
  renderChapters();
  const want = qs.get('room');
  const ses = loadSession();
  if (qs.has('solo')) { // 개발용: 혼자 둘러보기 (?solo=0 빛 / ?solo=1 그림자, &at=체크포인트)
    game.setRole(Number(qs.get('solo')) ? 1 : 0);
    game.W.phase = 'play'; game.W.t0 = performance.timeOrigin + performance.now();
    if (qs.get('at')) game._placeAt(Number(qs.get('at')));
    $('#lobby').classList.add('hidden'); $('#hud').classList.remove('hidden');
  } else if (want && /^\d{4}$/.test(want)) {
    if (qs.get('host') === '1') createRoom(want);
    else if (ses && ses.room === want && !(await idInUse(ses.id))) {
      // 같은 방으로 다시 들어옴: 하던 자리에서 이어서
      if (ses.host) { show('#scrHost'); $('#code').textContent = want; openRoom(want, true, ses.id, true).then(() => showInvite(want)); if (game.W.phase !== 'lobby') { hideLobby(); $('#wait').classList.remove('hidden'); } }
      else { show('#scrJoin'); typed = want; renderCode(); joinRoom(want, ses.id, true); if (game.W.phase !== 'lobby') { hideLobby(); $('#wait').classList.remove('hidden'); } }
    } else { show('#scrJoin'); typed = want; renderCode(); joinRoom(want); }
  } else show('#scrHome');

  let last = performance.now();
  const loop = (now) => {
    const ms = Math.max(0, now - last); last = now;
    game._perf(ms);
    game.frameStep(ms / 1000);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
