// Vice Cover Studio — wires the page: photos, layout, grade, words, export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (shots.js).
import { drawCover, defaultState, COVER_SIZES, COVER_THEMES, COVER_LAYOUTS, lastPanels } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const sizeNote = document.getElementById('sizeNote');
const state = defaultState();

const SAMPLES = [
  { key: 'boulevard', label: 'Boulevard', file: 'samples/boulevard.jpg' },
  { key: 'skyline', label: 'Skyline', file: 'samples/skyline.jpg' },
  { key: 'pier', label: 'Pier', file: 'samples/pier.jpg' },
];

const SLOT_NAMES = ['Hero photo', 'Panel A', 'Panel B'];
let activeSlot = 0;
const slotCards = [];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** The bundled fonts, so the canvas never draws before they arrive. */
async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load(`100px Anton`),
      document.fonts.load(`16px 'Archivo Black'`),
      document.fonts.load(`16px 'Bebas Neue'`),
    ]);
    await document.fonts.ready;
  } catch {
    /* fall back to system fonts */
  }
}

function redraw() {
  drawCover(canvas, state);
  const size = COVER_SIZES[state.size];
  sizeNote.textContent = `${size.w} × ${size.h} · LIVE PREVIEW`;
  slotCards.forEach((card, i) => card.classList.toggle('active', i === activeSlot));
  fitPreview();
}

/** Sizes the preview canvas to the stage, keeping the cover's aspect. */
function fitPreview() {
  if (document.body.classList.contains('shot-cover')) return;
  const stage = canvas.parentElement;
  const availW = stage.clientWidth - 48;
  const availH = stage.clientHeight - 48 - 30;
  const scale = Math.min(availW / canvas.width, availH / canvas.height);
  canvas.style.width = `${Math.max(1, Math.floor(canvas.width * scale))}px`;
  canvas.style.height = `${Math.max(1, Math.floor(canvas.height * scale))}px`;
}

window.addEventListener('resize', fitPreview);

function setStatus(text) {
  status.textContent = text;
}

/** One photo slot's controls: file picker, sample buttons, zoom, same-as-hero. */
function buildSlotCard(index) {
  const card = document.createElement('div');
  card.className = 'photo-slot';
  card.innerHTML = `
    <div class="slot-head"><b>${SLOT_NAMES[index]}</b><span class="slot-state">empty</span></div>
    <input type="file" accept="image/*" aria-label="${SLOT_NAMES[index]} file">
    <div class="sample-row"></div>
    <label>ZOOM <input type="range" min="1" max="2.5" step="0.05" value="1" aria-label="${SLOT_NAMES[index]} zoom"></label>
    ${index > 0 ? `<label class="check"><input type="checkbox"> Use hero photo here too</label>` : ''}
    <button type="button" class="reset-crop">RESET CROP</button>`;
  const fileInput = card.querySelector('input[type="file"]');
  const zoom = card.querySelector('input[type="range"]');
  const stateLabel = card.querySelector('.slot-state');
  const sampleRow = card.querySelector('.sample-row');

  for (const sample of SAMPLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = sample.label;
    b.addEventListener('click', async () => {
      state.photos[index].img = await loadImage(sample.file);
      state.photos[index].sameAsHero = false;
      const box = card.querySelector('input[type="checkbox"]');
      if (box) box.checked = false;
      stateLabel.textContent = sample.label;
      activeSlot = index;
      redraw();
    });
    sampleRow.appendChild(b);
  }

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photos[index].img = await loadImage(URL.createObjectURL(file));
    state.photos[index].sameAsHero = false;
    const box = card.querySelector('input[type="checkbox"]');
    if (box) box.checked = false;
    stateLabel.textContent = file.name.slice(0, 18);
    activeSlot = index;
    redraw();
  });
  zoom.addEventListener('input', () => {
    state.photos[index].zoom = Number(zoom.value);
    redraw();
  });
  const box = card.querySelector('input[type="checkbox"]');
  if (box) {
    box.addEventListener('change', () => {
      state.photos[index].sameAsHero = box.checked;
      stateLabel.textContent = box.checked ? 'same as hero' : (state.photos[index].img ? 'loaded' : 'empty');
      redraw();
    });
  }
  card.querySelector('.reset-crop').addEventListener('click', () => {
    state.photos[index].zoom = 1;
    state.photos[index].panX = 0;
    state.photos[index].panY = 0;
    zoom.value = 1;
    redraw();
  });
  card.addEventListener('click', () => {
    activeSlot = index;
    redraw();
  });
  return { card, stateLabel };
}

/** A segmented row of buttons bound to one state field. */
function buildSegment(containerId, entries, get, set) {
  const container = document.getElementById(containerId);
  for (const [value, label] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (value === get()) b.classList.add('on');
    b.addEventListener('click', () => {
      set(value);
      container.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      redraw();
    });
    container.appendChild(b);
  }
}

const slotsBox = document.getElementById('slots');
for (let i = 0; i < 3; i++) {
  const { card, stateLabel } = buildSlotCard(i);
  slotCards.push(card);
  slotsBox.appendChild(card);
  state.photos[i].labelEl = stateLabel;
}

buildSegment('layoutSeg', Object.entries(COVER_LAYOUTS), () => state.layout, (v) => { state.layout = v; });
buildSegment(
  'themeSeg',
  Object.entries(COVER_THEMES).map(([value, t]) => [value, t.name]),
  () => state.theme,
  (v) => { state.theme = v; },
);
buildSegment('sizeSeg', Object.keys(COVER_SIZES).map((k) => [k, k.replace('x', ' × ')]), () => state.size, (v) => { state.size = v; });

document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('place').addEventListener('input', (e) => {
  state.place = e.target.value;
  redraw();
});
document.getElementById('tagline').addEventListener('input', (e) => {
  state.tagline = e.target.value;
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  drawCover(canvas, state);
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — try again.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-cover-${state.size}.png`);
  }, 'image/png');
});

/** Drag the preview to pan the photo under the pointer; click selects a panel. */
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = lastPanels.findIndex((panel) => p.x >= panel.x && p.x <= panel.x + panel.w && p.y >= panel.y && p.y <= panel.y + panel.h);
  if (hit < 0) return;
  const slot = state.photos[lastPanels[hit].slot];
  if (!slot.img) return;
  activeSlot = lastPanels[hit].slot;
  drag = { slot, startX: p.x, startY: p.y, panX: slot.panX, panY: slot.panY, rect: lastPanels[hit] };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const scale = Math.max(drag.rect.w / drag.slot.img.naturalWidth, drag.rect.h / drag.slot.img.naturalHeight) * drag.slot.zoom;
  const ex = Math.max(1, drag.slot.img.naturalWidth * scale - drag.rect.w);
  const ey = Math.max(1, drag.slot.img.naturalHeight * scale - drag.rect.h);
  drag.slot.panX = Math.max(-1, Math.min(1, drag.panX + ((p.x - drag.startX) / ex) * 2));
  drag.slot.panY = Math.max(-1, Math.min(1, drag.panY + ((p.y - drag.startY) / ey) * 2));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  await loadFonts();
  await runShot(shot, new URLSearchParams(location.search), {
    state,
    loadSample: async (key) => {
      const sample = SAMPLES.find((s) => s.key === key) ?? SAMPLES[0];
      return loadImage(sample.file);
    },
    redraw,
  });
} else {
  // Default scene: the three sample photos, so the app opens ready to export.
  await loadFonts();
  state.photos[0].img = await loadImage('samples/boulevard.jpg');
  state.photos[1].img = await loadImage('samples/skyline.jpg');
  state.photos[2].img = await loadImage('samples/pier.jpg');
  state.photos[0].labelEl.textContent = 'Boulevard';
  state.photos[1].labelEl.textContent = 'Skyline';
  state.photos[2].labelEl.textContent = 'Pier';
  redraw();
}
