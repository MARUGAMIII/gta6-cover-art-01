// Vice Cover Studio — the cover renderer.
//
// Draws a GTA 6-style multi-panel poster onto a canvas: a hero photo panel,
// smaller panels below or beside it, a sunset or neon colour grade, halftone
// dots, film grain, and big condensed title lettering with a hard shadow.
// Everything is drawn from the state object; the same state drawn twice
// produces the same pixels (the grain uses a seeded generator).

/** The export sizes the app offers, in pixels. */
export const COVER_SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

/** The colour grades: sunset, neon night and golden hour. */
export const COVER_THEMES = {
  sunset: {
    name: 'Sunset',
    deep: '#1a0b2e',
    gradeTop: 'rgba(255,122,24,0.00)',
    gradeMid: 'rgba(255,46,136,0.16)',
    gradeBot: 'rgba(123,47,247,0.42)',
    wash: 'rgba(255,110,60,0.30)',
    shadow: '#ff2e88',
    badge: '#ffd23f',
    badgeText: '#1a0b2e',
  },
  neon: {
    name: 'Neon Night',
    deep: '#0b0620',
    gradeTop: 'rgba(0,229,255,0.04)',
    gradeMid: 'rgba(255,0,229,0.20)',
    gradeBot: 'rgba(40,0,90,0.55)',
    wash: 'rgba(0,229,255,0.26)',
    shadow: '#00e5ff',
    badge: '#00e5ff',
    badgeText: '#0b0620',
  },
  gold: {
    name: 'Golden Hour',
    deep: '#241203',
    gradeTop: 'rgba(255,179,71,0.00)',
    gradeMid: 'rgba(255,94,58,0.20)',
    gradeBot: 'rgba(120,40,0,0.45)',
    wash: 'rgba(255,170,60,0.30)',
    shadow: '#ff9a3d',
    badge: '#ff9a3d',
    badgeText: '#241203',
  },
};

/** The layouts: multi-panel poster, one full-bleed photo, hero plus a strip. */
export const COVER_LAYOUTS = {
  poster: 'Poster',
  fullbleed: 'Full Bleed',
  strip: 'Hero + Strip',
};

/** A small deterministic generator, so the grain is identical on every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One panel of the poster: a photo clipped to a rectangle whose one edge may
 * slant, drawn from a photo slot with its own zoom and pan.
 *   slot: index into state.photos
 *   zoomMul / panX / panY: extra crop applied on top of the slot's own crop
 *   slant: null, or { edge: 'bottom' | 'right' | 'top', amount: px }
 */
function panelPath(ctx, p) {
  const { x, y, w, h } = p;
  const s = p.slant;
  ctx.beginPath();
  if (!s) {
    ctx.rect(x, y, w, h);
    return;
  }
  if (s.edge === 'bottom') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - s.amount);
    ctx.lineTo(x, y + h);
  } else if (s.edge === 'right') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - s.amount, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
  } else {
    ctx.moveTo(x, y + s.amount);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
  }
  ctx.closePath();
}

/** Draws a photo into a rectangle, cover-fit, with zoom and pan (-1..1). */
function drawPhotoInto(ctx, img, rect, zoom, panX, panY) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const ex = Math.max(0, pw - rect.w);
  const ey = Math.max(0, ph - rect.h);
  ctx.drawImage(img, rect.x - ex / 2 + panX * ex / 2, rect.y - ey / 2 + panY * ey / 2, pw, ph);
}

/** A flat sunset gradient used when a panel has no photo yet. */
function drawEmptyPanel(ctx, rect, theme) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#ff7a18');
  g.addColorStop(0.5, '#ff2e88');
  g.addColorStop(1, '#7b2ff7');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `bold ${Math.round(rect.h * 0.09)}px 'Archivo Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** The sunset/neon grade over one panel: warm wash, colour gradient, vignette. */
function gradePanel(ctx, rect, theme) {
  const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  g.addColorStop(0, theme.gradeTop);
  g.addColorStop(0.55, theme.gradeMid);
  g.addColorStop(1, theme.gradeBot);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = theme.wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.42,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  v.addColorStop(0, 'rgba(10,0,30,0)');
  v.addColorStop(1, 'rgba(10,0,30,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** A halftone dot field fading down across a rectangle, comic-poster style. */
function halftoneField(ctx, rect, color, maxR, gap) {
  ctx.save();
  ctx.fillStyle = color;
  const rows = Math.floor(rect.h / gap);
  const cols = Math.floor(rect.w / gap);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const f = 1 - r / rows;
      const rad = maxR * f * f;
      if (rad < 0.4) continue;
      ctx.globalAlpha = 0.16 * f + 0.04;
      ctx.beginPath();
      ctx.arc(rect.x + c * gap + (r % 2 ? gap / 2 : 0), rect.y + r * gap, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Film grain over the whole canvas, from a seeded generator. */
function grainOver(ctx, w, h) {
  const rnd = mulberry32(w * 31 + h * 7 + 12345);
  ctx.save();
  const n = Math.round((w * h) / 420);
  for (let i = 0; i < n; i++) {
    const v = rnd();
    ctx.globalAlpha = 0.02 + rnd() * 0.05;
    ctx.fillStyle = v > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  ctx.restore();
}

/**
 * The panel plan for a state and size: each panel's rectangle, photo slot,
 * extra crop and slant, plus where the title, badge and tagline go.
 * Also stored on the module for the editor's click-to-select and drag-to-pan.
 */
export let lastPanels = [];
export let lastTitleZone = null;

export function layoutPanels(state, w, h) {
  const m = Math.round(w * 0.014);
  const g = Math.round(w * 0.012);
  const slant = Math.round(w * 0.028);
  const landscape = w > h;
  const panels = [];
  let titleZone;
  let badge = { x: m + w * 0.02, y: m + h * 0.02 };
  let tagline = { x: w - m - w * 0.02, y: h - m - h * 0.015, align: 'right' };

  if (state.layout === 'fullbleed') {
    panels.push({ x: m, y: m, w: w - 2 * m, h: h - 2 * m, slot: 0, zoomMul: 1, panX: 0, panY: 0, slant: null });
    titleZone = { x: m + w * 0.04, y: h * 0.62, w: w - 2 * m - w * 0.08, maxH: h * 0.30, size: w * 0.125 };
  } else if (state.layout === 'strip') {
    const heroH = Math.round(h * 0.66);
    panels.push({ x: m, y: m, w: w - 2 * m, h: heroH, slot: 0, zoomMul: 1, panX: 0, panY: 0, slant: { edge: 'bottom', amount: slant } });
    panels.push({ x: m, y: m + heroH + g, w: w - 2 * m, h: h - m - (m + heroH + g), slot: 1, zoomMul: 1, panX: 0, panY: 0, slant: { edge: 'top', amount: slant } });
    titleZone = { x: m + w * 0.03, y: m + heroH - h * 0.17, w: w - 2 * m - w * 0.06, maxH: h * 0.22, size: w * 0.115 };
  } else if (landscape) {
    const heroW = Math.round(w * 0.60);
    panels.push({ x: m, y: m, w: heroW, h: h - 2 * m, slot: 0, zoomMul: 1, panX: 0, panY: 0, slant: { edge: 'right', amount: slant } });
    const colX = m + heroW + g;
    const colW = w - m - colX;
    const halfH = Math.round((h - 2 * m - g) / 2);
    panels.push({ x: colX, y: m, w: colW, h: halfH, slot: 1, zoomMul: 1, panX: 0, panY: 0, slant: null });
    panels.push({ x: colX, y: m + halfH + g, w: colW, h: h - 2 * m - halfH - g, slot: 2, zoomMul: 1, panX: 0, panY: 0, slant: null });
    titleZone = { x: m + w * 0.025, y: h * 0.66, w: heroW - w * 0.02, maxH: h * 0.28, size: w * 0.085 };
    badge = { x: m + w * 0.015, y: m + h * 0.015 };
  } else {
    const heroH = Math.round(h * (h > w * 1.15 ? 0.60 : 0.575));
    panels.push({ x: m, y: m, w: w - 2 * m, h: heroH, slot: 0, zoomMul: 1, panX: 0, panY: 0, slant: { edge: 'bottom', amount: slant } });
    const rowY = m + heroH + g;
    const rowH = h - m - rowY;
    const pw = Math.round((w - 2 * m - 2 * g) / 3);
    panels.push({ x: m, y: rowY, w: pw, h: rowH, slot: 1, zoomMul: 1, panX: 0, panY: 0, slant: null });
    panels.push({ x: m + pw + g, y: rowY, w: pw, h: rowH, slot: 2, zoomMul: 1.25, panX: -0.4, panY: 0, slant: { edge: 'top', amount: slant } });
    panels.push({ x: m + 2 * (pw + g), y: rowY, w: w - m - (m + 2 * (pw + g)), h: rowH, slot: 1, zoomMul: 1.35, panX: 0.5, panY: -0.2, slant: null });
    titleZone = { x: m + w * 0.03, y: m + heroH - h * 0.115, w: w - 2 * m - w * 0.06, maxH: h * 0.16, size: w * 0.115 };
  }
  return { panels, titleZone, badge, tagline, frame: m };
}

/** Wraps words into lines that fit `width` at font size `size`. */
function wrapTitle(ctx, text, width, size) {
  ctx.font = `${size}px Anton, 'Archivo Black', sans-serif`;
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= width || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** The big condensed title: fitted, two lines at most, hard shadow + outline. */
function drawTitle(ctx, text, zone, theme) {
  const clean = text.trim().toUpperCase() || 'VICE CITY';
  const cx = zone.x + zone.w / 2;
  const cy = zone.y + zone.maxH / 2;
  let size = zone.size;
  let lines = [];
  while (size > 18) {
    lines = wrapTitle(ctx, clean, zone.w, size);
    if (lines.length <= 2 && lines.length * size * 1.02 <= zone.maxH) break;
    size -= 2;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.03);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const lh = size * 1.02;
  const y0 = -((lines.length - 1) * lh) / 2;
  lines.forEach((line, i) => {
    const y = y0 + i * lh;
    ctx.font = `${size}px Anton, 'Archivo Black', sans-serif`;
    ctx.fillStyle = theme.shadow;
    ctx.fillText(line, size * 0.045, y + size * 0.075);
    ctx.strokeStyle = '#0d0518';
    ctx.lineWidth = Math.max(3, size * 0.10);
    ctx.strokeText(line, 0, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, 0, y);
  });
  ctx.restore();
}

/** The place badge: a slanted parallelogram with letterspaced capitals. */
function drawBadge(ctx, text, at, theme, w) {
  const label = text.trim().toUpperCase() || 'VICE CITY';
  const size = Math.round(w * 0.030);
  ctx.save();
  ctx.font = `${size}px 'Bebas Neue', sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(size * 0.22)}px`;
  } catch {
    /* older canvas: no letter spacing */
  }
  const tw = ctx.measureText(label).width;
  const pad = size * 0.9;
  const bw = tw + pad * 2;
  const bh = size * 1.7;
  const slant = bh * 0.32;
  ctx.beginPath();
  ctx.moveTo(at.x + slant, at.y);
  ctx.lineTo(at.x + bw, at.y);
  ctx.lineTo(at.x + bw - slant, at.y + bh);
  ctx.lineTo(at.x, at.y + bh);
  ctx.closePath();
  ctx.fillStyle = theme.badge;
  ctx.fill();
  ctx.strokeStyle = '#0d0518';
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, at.x + bw / 2, at.y + bh / 2 + size * 0.04);
  ctx.restore();
}

/** The small tagline under the title, in heavy capitals. */
function drawTagline(ctx, text, at, w) {
  const label = text.trim().toUpperCase();
  if (!label) return;
  const size = Math.round(w * 0.020);
  ctx.save();
  ctx.font = `${size}px 'Archivo Black', sans-serif`;
  ctx.textAlign = at.align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(13,5,24,0.85)';
  const tw = ctx.measureText(label).width;
  const rx = at.align === 'right' ? at.x - tw : at.x - tw / 2;
  ctx.fillRect(rx - size * 0.7, at.y - size * 1.25, tw + size * 1.4, size * 1.7);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, at.x, at.y);
  ctx.restore();
}

/**
 * Draws the whole cover for `state` onto `canvas`, sized to the state's
 * export size. Returns the plan, so the editor can hit-test its panels.
 */
export function drawCover(canvas, state) {
  const size = COVER_SIZES[state.size] ?? COVER_SIZES['1080x1080'];
  const w = size.w;
  const h = size.h;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  const theme = COVER_THEMES[state.theme] ?? COVER_THEMES.sunset;
  const plan = layoutPanels(state, w, h);
  lastPanels = plan.panels;
  lastTitleZone = plan.titleZone;

  ctx.fillStyle = theme.deep;
  ctx.fillRect(0, 0, w, h);

  for (const p of plan.panels) {
    const slot = state.photos[p.slot];
    ctx.save();
    panelPath(ctx, p);
    ctx.clip();
    if (slot && slot.img) {
      const src = slot.sameAsHero && p.slot !== 0 ? state.photos[0] : slot;
      drawPhotoInto(ctx, src.img, p, src.zoom * p.zoomMul, src.panX + p.panX, src.panY + p.panY);
    } else {
      drawEmptyPanel(ctx, p, theme);
    }
    gradePanel(ctx, p, theme);
    ctx.restore();
    ctx.save();
    panelPath(ctx, p);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.stroke();
    ctx.restore();
  }

  // Halftone corners on the hero panel, comic-poster style.
  const hero = plan.panels[0];
  ctx.save();
  panelPath(ctx, hero);
  ctx.clip();
  halftoneField(ctx, { x: hero.x + hero.w * 0.62, y: hero.y, w: hero.w * 0.38, h: hero.h * 0.30 }, '#ffffff', Math.max(3, w * 0.006), Math.max(10, w * 0.016));
  ctx.restore();

  // Outer poster frame.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(4, w * 0.006);
  ctx.strokeRect(plan.frame / 2, plan.frame / 2, w - plan.frame, h - plan.frame);

  grainOver(ctx, w, h);
  drawBadge(ctx, state.place, plan.badge, theme, w);
  drawTitle(ctx, state.title, plan.titleZone, theme);
  drawTagline(ctx, state.tagline, plan.tagline, w);
  return plan;
}

/** A fresh default state: the three sample photos, poster layout, sunset. */
export function defaultState() {
  return {
    layout: 'poster',
    theme: 'sunset',
    size: '1080x1080',
    title: 'BOULEVARD QUEEN',
    place: 'VICE CITY',
    tagline: 'SUNSET HEIST',
    photos: [
      { img: null, zoom: 1, panX: 0, panY: 0, sameAsHero: false },
      { img: null, zoom: 1, panX: 0, panY: 0, sameAsHero: false },
      { img: null, zoom: 1, panX: 0, panY: 0, sameAsHero: false },
    ],
  };
}
