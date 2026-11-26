/* Photobooth Hari Keusahawanan SK Rugading 2026 */
(() => {
'use strict';

// ---------- Data bingkai (koordinat "tingkap" foto dalam setiap bingkai) ----------
const FRAMES = {
  biru_landskap:       { w:1536, h:1024, win:[210,280,1303,876] },
  biru_potret:         { w:1024, h:1536, win:[108,564,916,1330] },
  ungu_landskap:       { w:1536, h:1024, win:[144,276,1390,909] },
  ungu_potret:         { w:1024, h:1536, win:[101,512,919,1398] },
  hijau_landskap:      { w:1536, h:1024, win:[176,286,1364,875] },
  hijau_potret:        { w:1024, h:1536, win:[106,491,913,1336] },
  merahjambu_landskap: { w:1536, h:1024, win:[120,313,1382,905] },
  merahjambu_potret:   { w:1024, h:1536, win:[115,544,906,1350] },
  pantai_potret:       { w:941, h:1672, win:[90,486,819,1342] },
  pantai_landskap:     { w:1448, h:1086, win:[193,295,1223,843] },
  kuning_potret:       { w:941, h:1672, win:[96,349,805,1329] },
  kuning_landskap:     { w:1448, h:1086, win:[168,311,1262,905] },
  karnival_potret:     { w:941, h:1672, win:[75,553,862,1405] },
  karnival_landskap:   { w:1448, h:1086, win:[169,351,1276,941] },
  candyland_potret:    { w:941, h:1672, win:[116,345,824,1299] },
  candyland_landskap:  { w:1448, h:1086, win:[207,324,1240,920] },
};
const THEMES = [
  { id:'biru',       name:'Karnival', colour:'Biru',        meta:'#1f4fbf' },
  { id:'ungu',       name:'Manisan',  colour:'Ungu',        meta:'#7b2cbf' },
  { id:'hijau',      name:'Pasar',    colour:'Hijau',       meta:'#0f7a4f' },
  { id:'merahjambu', name:'Tropika',  colour:'Merah Jambu', meta:'#c2185b' },
  { id:'pantai',     name:'Pantai',     colour:'Biru Laut',  meta:'#0e7fc0' },
  { id:'kuning',     name:'Kuning',     colour:'Kuning',     meta:'#d99a00' },
  { id:'karnival',   name:'Karnival 2', colour:'Merah',      meta:'#d7261e' },
  { id:'candyland',  name:'Candyland',  colour:'Pink',       meta:'#e0458f' },
];
const ZMAX = 3;            // zum maksimum (3x daripada "penuh tingkap")
const STILL_MAX = 3000;    // saiz maksimum gambar galeri (px)
const CFG = window.PHOTOBOOTH_CONFIG || {};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const store = {
  get(k, d){ try { return localStorage.getItem(k) || d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch(e){} },
};

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const state = {
  theme: store.get('pb_theme', 'biru'),
  orient: 'potret',
  facing: 'user',
  stream: null,
  mirror: true,
  still: null,          // canvas gambar dari galeri
  zoomV: 0,
  busy: false,
  running: false,
  last: null,           // { blob, name, url }
};
if (!FRAMES[state.theme + '_potret']) state.theme = 'biru';

// ---------- Muat imej bingkai ----------
const frameImgs = {};
function frameImg(key){
  if (!frameImgs[key]) {
    const im = new Image();
    im.src = 'frames/' + key + '.webp';
    frameImgs[key] = im;
  }
  return frameImgs[key];
}
const frameKey = () => state.theme + '_' + state.orient;

// ---------- Skrin ----------
function show(id){
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}

// ---------- Tema ----------
function applyTheme(){
  document.body.dataset.theme = state.theme;
  const t = THEMES.find(x => x.id === state.theme);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', t.meta);
  $$('.theme').forEach(b => b.classList.toggle('sel', b.dataset.theme === state.theme));
  $('#thumbPotret').src = 'frames/' + state.theme + '_potret.webp';
  $('#thumbLandskap').src = 'frames/' + state.theme + '_landskap.webp';
  store.set('pb_theme', state.theme);
}
function buildThemes(){
  const list = $('#themeList');
  THEMES.forEach(t => {
    const b = document.createElement('button');
    b.className = 'theme'; b.dataset.theme = t.id;
    b.innerHTML = '<img class="sw" alt="" src="frames/' + t.id + '_potret.webp" style="object-fit:cover;object-position:top">' +
                  '<span>' + t.name + '</span><small>' + t.colour + '</small>';
    b.addEventListener('click', () => { state.theme = t.id; applyTheme(); });
    list.appendChild(b);
  });
}

// ---------- Komposisi (SAMA untuk preview dan gambar simpan) ----------
let blurCache = { src:null, canvas:null, w:0 };
const tiny = document.createElement('canvas');
const mid = document.createElement('canvas');
function blurOf(src, sw, sh, live){
  if (!live && blurCache.src === src) return blurCache.canvas;
  // kecilkan sangat-sangat, kemudian besarkan semula = kesan kabur (berfungsi di semua browser)
  const L = 14;
  tiny.width = sw >= sh ? L : Math.max(2, Math.round(L * sw / sh));
  tiny.height = sw >= sh ? Math.max(2, Math.round(L * sh / sw)) : L;
  const tc = tiny.getContext('2d');
  tc.imageSmoothingEnabled = true; tc.imageSmoothingQuality = 'high';
  tc.drawImage(src, 0, 0, tiny.width, tiny.height);
  mid.width = tiny.width * 6; mid.height = tiny.height * 6;
  const mc = mid.getContext('2d');
  mc.imageSmoothingEnabled = true; mc.imageSmoothingQuality = 'high';
  mc.drawImage(tiny, 0, 0, mid.width, mid.height);
  blurCache = { src, canvas: mid };
  return mid;
}
function zoomFactor(v, zMin){
  return v <= 0 ? 1 + (v / 100) * (1 - zMin) : 1 + (v / 100) * (ZMAX - 1);
}
function drawImg(ctx, img, cx, cy, dw, dh, mirror){
  ctx.save();
  ctx.translate(cx, cy);
  if (mirror) ctx.scale(-1, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}
function compose(ctx, k, key, src, sw, sh, mirror, zv, live){
  const fm = FRAMES[key];
  const [x0, y0, x1, y1] = fm.win;
  const ww = x1 - x0, wh = y1 - y0;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, fm.w, fm.h);
  if (src && sw && sh) {
    const cover = Math.max(ww / sw, wh / sh);
    const contain = Math.min(ww / sw, wh / sh);
    const s = cover * zoomFactor(zv, contain / cover);
    const dw = sw * s, dh = sh * s;
    const cx = x0 + ww / 2, cy = y0 + wh / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, ww, wh); ctx.clip();
    if (dw < ww - 0.5 || dh < wh - 0.5) {
      const b = blurOf(src, sw, sh, live);
      const bs = cover * 1.2;
      drawImg(ctx, b, cx, cy, sw * bs, sh * bs, mirror);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x0, y0, ww, wh);
    }
    drawImg(ctx, src, cx, cy, dw, dh, mirror);
    ctx.restore();
  }
  const fi = frameImg(key);
  if (fi.complete && fi.naturalWidth) ctx.drawImage(fi, 0, 0, fm.w, fm.h);
}
function currentSource(){
  if (state.still) return { src: state.still, sw: state.still.width, sh: state.still.height, mirror: false, live: false };
  const v = $('#video');
  if (state.stream && v.readyState >= 2 && v.videoWidth)
    return { src: v, sw: v.videoWidth, sh: v.videoHeight, mirror: state.mirror, live: true };
  return { src: null };
}

// ---------- Preview kamera ----------
const view = $('#view');
const vctx = view.getContext('2d');
let viewK = 1;
function fitView(){
  const fm = FRAMES[frameKey()];
  const st = $('#stage');
  const aw = st.clientWidth - 20, ah = st.clientHeight - 8;
  if (aw <= 0 || ah <= 0) return;
  const a = fm.w / fm.h;
  let cw = Math.min(aw, ah * a), ch = cw / a;
  view.style.width = Math.floor(cw) + 'px';
  view.style.height = Math.floor(ch) + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const px = Math.min(fm.w, Math.round(cw * dpr));
  view.width = px; view.height = Math.round(px / a);
  viewK = view.width / fm.w;
}
function tick(){
  if (!state.running) return;
  const s = currentSource();
  compose(vctx, viewK, frameKey(), s.src, s.sw, s.sh, s.mirror, state.zoomV, s.live);
  requestAnimationFrame(tick);
}
function startLoop(){ if (!state.running) { state.running = true; requestAnimationFrame(tick); } }
function stopLoop(){ state.running = false; }

function camMsg(t){ const m = $('#camMsg'); m.textContent = t || ''; m.hidden = !t; }

async function startCamera(){
  stopCamera();
  camMsg('');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    camMsg(location.protocol !== 'https:' && location.hostname !== 'localhost'
      ? 'Kamera hanya berfungsi melalui link https. Buka app melalui link GitHub Pages.'
      : 'Browser ini tidak menyokong kamera. Guna butang Galeri.');
    return;
  }
  try {
    // Minta gambar asli 4:3 kamera — tidak dipaksa bentuk tinggi (supaya tidak ter-zoom)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: state.facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }
    });
    state.stream = stream;
    const v = $('#video');
    v.srcObject = stream;
    try { await v.play(); } catch (e) {}
    const set = stream.getVideoTracks()[0].getSettings ? stream.getVideoTracks()[0].getSettings() : {};
    state.mirror = set.facingMode ? set.facingMode === 'user' : state.facing === 'user';
    // Sorok butang tukar kamera jika hanya ada satu kamera
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const n = devs.filter(d => d.kind === 'videoinput').length;
      $('#switchBtn').disabled = n < 2;
    } catch (e) {}
  } catch (err) {
    const n = err && err.name;
    if (n === 'NotAllowedError' || n === 'SecurityError')
      camMsg('Kebenaran kamera ditolak. Benarkan kamera dalam tetapan browser, kemudian buka semula. Atau guna butang Galeri.');
    else if (n === 'NotFoundError' || n === 'OverconstrainedError')
      camMsg('Tiada kamera dijumpai. Guna butang Galeri untuk pilih gambar.');
    else if (n === 'NotReadableError')
      camMsg('Kamera sedang digunakan oleh app lain. Tutup app itu dan cuba lagi.');
    else camMsg('Kamera tidak dapat dibuka. Guna butang Galeri.');
  }
}
function stopCamera(){
  if (state.stream) state.stream.getTracks().forEach(t => t.stop());
  state.stream = null;
  const v = $('#video'); v.srcObject = null;
}

let wakeLock = null;
async function keepAwake(on){
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

function setStillMode(on){
  const sh = $('#shutter');
  sh.classList.toggle('use', on);
  sh.querySelector('span').textContent = on ? 'Guna' : '';
  sh.setAttribute('aria-label', on ? 'Guna gambar ini' : 'Ambil gambar');
  $('#galleryBar').hidden = !on;
  $('#switchBtn').style.visibility = on ? 'hidden' : '';
}

async function openCamera(orient){
  state.orient = orient;
  state.still = null; state.zoomV = 0; $('#zoom').value = 0;
  setStillMode(false);
  const t = THEMES.find(x => x.id === state.theme);
  $('#camTitle').textContent = t.name + ' · ' + (orient === 'potret' ? 'Potret' : 'Landskap');
  show('camera');
  frameImg(frameKey());
  fitView();
  startLoop();
  keepAwake(true);
  await startCamera();
}
function leaveCamera(){
  stopLoop(); stopCamera(); keepAwake(false);
  show('home');
}

// ---------- Galeri ----------
async function loadStill(file){
  const url = URL.createObjectURL(file);
  try {
    const im = new Image();
    im.src = url;
    await im.decode();
    const sw = im.naturalWidth, sh = im.naturalHeight;
    const r = Math.min(1, STILL_MAX / Math.max(sw, sh));
    const c = document.createElement('canvas');
    c.width = Math.round(sw * r); c.height = Math.round(sh * r);
    const cx = c.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(im, 0, 0, c.width, c.height);
    stopCamera();
    camMsg('');
    state.still = c; state.zoomV = 0; $('#zoom').value = 0;
    setStillMode(true);
  } catch (e) {
    alert('Gambar ini tidak dapat dibuka. Cuba gambar lain.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- Ambil gambar ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function pad(n, l){ return String(n).padStart(l || 2, '0'); }
function makeName(){
  const d = new Date();
  return 'HKSKRT2026_' + state.theme + '_' + state.orient + '_' +
    d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.jpg';
}
async function countdown(){
  const el = $('#countdown');
  el.hidden = false;
  for (const n of [3, 2, 1]) {
    el.textContent = n;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    await sleep(1000);
  }
  el.hidden = true;
}
function flash(){
  const f = $('#flash');
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}
async function shoot(){
  if (state.busy) return;
  const s0 = currentSource();
  if (!s0.src) { camMsg('Kamera belum sedia. Tunggu sebentar atau guna Galeri.'); return; }
  state.busy = true;
  $$('#camera button').forEach(b => b.dataset.wasDisabled = b.disabled ? '1' : '');
  $$('#camera button').forEach(b => b.disabled = true);
  try {
    if (!state.still) await countdown();
    const s = currentSource();
    if (!s.src) throw new Error('no source');
    const key = frameKey();
    const fm = FRAMES[key];
    const c = document.createElement('canvas');
    c.width = fm.w; c.height = fm.h;
    const ctx = c.getContext('2d');
    compose(ctx, 1, key, s.src, s.sw, s.sh, s.mirror, state.zoomV, s.live);
    if (!state.still) flash();
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
    const name = makeName();
    if (state.last && state.last.url) URL.revokeObjectURL(state.last.url);
    state.last = { blob, name, url: URL.createObjectURL(blob) };
    await Queue.add(name, blob);
    showResult();
    Queue.run();
  } catch (e) {
    camMsg('Gambar gagal diambil. Cuba lagi.');
  } finally {
    $$('#camera button').forEach(b => b.disabled = b.dataset.wasDisabled === '1');
    state.busy = false;
  }
}

// ---------- Skrin keputusan ----------
function showResult(){
  stopLoop();
  $('#resultImg').src = state.last.url;
  const saveBtn = $('#saveBtn');
  const tip = $('#saveTip');
  if (isIOS) {
    saveBtn.textContent = 'Simpan ke Foto';
    tip.innerHTML = 'Selepas tekan <b>Simpan ke Foto</b>, pilih <b>Save Image / Simpan Imej</b> dalam menu yang keluar. Gambar akan masuk ke app Foto.';
    tip.hidden = false;
  } else {
    saveBtn.textContent = 'Muat Turun';
    tip.hidden = true;
  }
  updateResultSync();
  show('result');
}
async function saveCurrent(){
  const L = state.last; if (!L) return;
  if (isIOS) {
    const file = new File([L.blob], L.name, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); }
      catch (e) { /* pengguna batal — tiada apa-apa */ }
      return;
    }
    const tip = $('#saveTip');
    tip.innerHTML = 'Tekan lama pada gambar di atas, kemudian pilih <b>Save to Photos / Tambah ke Foto</b>.';
    tip.hidden = false;
    return;
  }
  const a = document.createElement('a');
  a.href = L.url; a.download = L.name;
  document.body.appendChild(a); a.click(); a.remove();
}
async function retake(){
  show('camera');
  fitView();
  startLoop();
  if (!state.still && !state.stream) await startCamera();
}

// ---------- Simpan ke Google Drive (dengan barisan offline) ----------
const Queue = (() => {
  const DBN = 'hkskrt2026', ST = 'queue';
  let dbp = null;
  const status = {};  // name -> 'busy' | 'ok' | 'wait' | 'err'
  const backoff = {}; // name -> masa boleh cuba semula
  let lastErr = '';
  let running = false;
  let pendingCount = 0;
  let doneCount = 0;

  function db(){
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'name' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn){
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(ST, mode);
      const s = t.objectStore(ST);
      let out;
      Promise.resolve(fn(s)).then(v => { out = v; });
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
    });
  }
  function reqP(r){ return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }

  async function add(name, blob){
    const buf = await blob.arrayBuffer();
    await tx('readwrite', s => { s.put({ name, buf, type: 'image/jpeg', t: Date.now() }); });
    status[name] = navigator.onLine ? 'busy' : 'wait';
    await refresh();
  }
  async function all(){
    const d = await db();
    return reqP(d.transaction(ST).objectStore(ST).getAll());
  }
  async function del(name){
    await tx('readwrite', s => { s.delete(name); });
  }
  async function refresh(){
    try { pendingCount = (await all()).length; } catch (e) {}
    render();
  }
  function configured(){
    const u = (CFG.APPS_SCRIPT_URL || '').trim();
    return /^https:\/\/script\.google\.com\/.+\/exec$/.test(u);
  }
  function b64(buf){
    const bytes = new Uint8Array(buf);
    let s = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  async function send(item){
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 90000);
    try {
      // text/plain = tiada "preflight" CORS, jadi Apps Script boleh terima terus
      const res = await fetch(CFG.APPS_SCRIPT_URL.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ name: item.name, mimeType: 'image/jpeg', data: b64(item.buf) }),
        signal: ctrl.signal,
        redirect: 'follow',
      });
      const txt = await res.text();
      let j = null;
      try { j = JSON.parse(txt); } catch (e) {}
      if (!j) return { ok: false, setup: true };
      return j;
    } finally { clearTimeout(to); }
  }
  async function run(){
    if (running) return;
    running = true;
    try {
      const items = await all();
      pendingCount = items.length;
      if (!items.length) { render(); return; }
      if (!configured()) { lastErr = 'nocfg'; items.forEach(i => status[i.name] = 'wait'); render(); return; }
      if (!navigator.onLine) { lastErr = 'offline'; items.forEach(i => status[i.name] = 'wait'); render(); return; }
      lastErr = '';
      items.sort((a, b) => a.t - b.t);
      for (const it of items) {
        if (backoff[it.name] && backoff[it.name] > Date.now()) continue;
        status[it.name] = 'busy'; render();
        let r;
        try { r = await send(it); }
        catch (e) { r = { ok: false, net: true }; }
        if (r && r.ok) {
          await del(it.name);
          status[it.name] = 'ok'; doneCount++;
          pendingCount = Math.max(0, pendingCount - 1);
        } else if (r && /bad name|not jpeg|bad size/.test(r.error || '')) {
          // Skrip menolak gambar ini (mungkin Code.gs versi lama). Simpan dalam peranti, cuba lagi 3 minit lagi.
          backoff[it.name] = Date.now() + 180000;
          status[it.name] = 'err'; lastErr = 'setup';
        } else {
          status[it.name] = navigator.onLine ? 'err' : 'wait';
          lastErr = r && r.setup ? 'setup' : (navigator.onLine ? 'fail' : 'offline');
          break;
        }
        render();
      }
    } finally {
      running = false;
      await refresh();
    }
  }
  function render(){
    let cls = '', txt = '', short = '';
    const n = pendingCount;
    if (running && n) { cls = 'busy'; txt = 'Sedang menyimpan ke Drive… (' + n + ')'; short = 'Menyimpan… ' + n; }
    else if (n) {
      cls = 'wait'; short = n + ' menunggu';
      if (lastErr === 'nocfg') { cls = 'err'; txt = 'Drive belum disetup · ' + n + ' gambar disimpan di peranti'; }
      else if (lastErr === 'setup') { cls = 'err'; txt = 'Gagal ke Drive: semak tetapan Apps Script · ' + n + ' menunggu'; }
      else if (lastErr === 'offline' || !navigator.onLine) { txt = 'Tiada internet · ' + n + ' gambar menunggu'; short = 'Offline · ' + n; }
      else txt = 'Belum dihantar · ' + n + ' gambar menunggu, cuba lagi sebentar';
    } else if (doneCount) { cls = 'ok'; txt = 'Semua gambar disimpan ke Drive ✓'; short = 'Drive ✓'; }
    $$('[data-sync]').forEach(el => {
      const sm = el.classList.contains('small');
      el.className = 'sync' + (sm ? ' small' : '') + (cls ? ' ' + cls : '');
      el.textContent = sm ? short : txt;
    });
    updateResultSync();
  }
  setInterval(() => { if (pendingCount) run(); }, 20000);
  window.addEventListener('online', () => run());
  window.addEventListener('offline', () => { lastErr = 'offline'; render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });

  return { add, run, refresh, statusOf: (n) => status[n], reason: () => lastErr };
})();

function updateResultSync(){
  const el = $('#resultSync');
  if (!el || !state.last) return;
  const st = Queue.statusOf(state.last.name);
  const why = Queue.reason();
  const map = {
    busy: 'Sedang menyimpan ke Drive…',
    ok: 'Disimpan ke Drive ✓',
    wait: why === 'nocfg' ? 'Disimpan di peranti (Drive belum disetup)' : 'Tiada internet — akan dihantar automatik bila ada line',
    err: why === 'setup' ? 'Gagal ke Drive — semak tetapan Apps Script' : 'Belum dihantar — akan cuba lagi automatik',
  };
  el.textContent = map[st] || '';
}

// ---------- Pasang app (PWA) ----------
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  $('#installBox').hidden = false;
});
window.addEventListener('appinstalled', () => { $('#installBox').hidden = true; installEvt = null; });
$('#installBtn').addEventListener('click', async () => {
  if (!installEvt) return;
  installEvt.prompt();
  try { await installEvt.userChoice; } catch (e) {}
  installEvt = null; $('#installBox').hidden = true;
});
if (isIOS && !isStandalone()) $('#iosTip').hidden = false;

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// ---------- Sambung butang ----------
buildThemes();
applyTheme();
$$('.orient').forEach(b => b.addEventListener('click', () => openCamera(b.dataset.orient)));
$('#backBtn').addEventListener('click', leaveCamera);
$('#homeBtn').addEventListener('click', leaveCamera);
$('#shutter').addEventListener('click', shoot);
$('#switchBtn').addEventListener('click', () => { state.facing = state.facing === 'user' ? 'environment' : 'user'; startCamera(); });
$('#galleryBtn').addEventListener('click', () => { $('#fileInput').value = ''; $('#fileInput').click(); });
$('#fileInput').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) loadStill(f); });
$('#backToCam').addEventListener('click', () => { state.still = null; state.zoomV = 0; $('#zoom').value = 0; setStillMode(false); startCamera(); });
$('#zoom').addEventListener('input', (e) => { state.zoomV = +e.target.value; });
$('#saveBtn').addEventListener('click', saveCurrent);
$('#retakeBtn').addEventListener('click', retake);
window.addEventListener('resize', () => { if ($('#camera').classList.contains('active')) fitView(); });
if (window.ResizeObserver) new ResizeObserver(() => { if ($('#camera').classList.contains('active')) fitView(); }).observe($('#stage'));
Object.keys(FRAMES).forEach(frameImg);   // muat awal semua bingkai
Queue.run();

// untuk ujian
window.__pb = { state, FRAMES, Queue };
})();
