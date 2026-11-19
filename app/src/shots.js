// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded; ?shot=cover shows the exported cover alone, edge to edge.
// Query: photo/photo2/photo3 pick samples, title/place/tagline set the words,
// layout/theme/size pick the look. window.__shotReady is set once painted.
export async function runShot(shot, query, { state, loadSample, redraw }) {
  const photo = query.get('photo') ?? 'boulevard';
  const photo2 = query.get('photo2') ?? 'skyline';
  const photo3 = query.get('photo3') ?? 'pier';
  state.photos[0].img = await loadSample(photo);
  state.photos[1].img = await loadSample(photo2);
  state.photos[2].img = await loadSample(photo3);
  for (let i = 0; i < 3; i++) {
    const key = [photo, photo2, photo3][i];
    if (state.photos[i].labelEl) state.photos[i].labelEl.textContent = key[0].toUpperCase() + key.slice(1);
    const pan = query.get(`pan${i}`);
    if (pan) {
      const [x, y] = pan.split(',').map(Number);
      if (Number.isFinite(x)) state.photos[i].panX = x;
      if (Number.isFinite(y)) state.photos[i].panY = y;
    }
  }
  state.title = query.get('title') ?? 'BOULEVARD QUEEN';
  state.place = query.get('place') ?? 'VICE CITY';
  state.tagline = query.get('tagline') ?? 'SUNSET HEIST';
  state.layout = query.get('layout') ?? 'poster';
  state.theme = query.get('theme') ?? 'sunset';
  state.size = query.get('size') ?? '1080x1080';

  const titleInput = document.getElementById('title');
  const placeInput = document.getElementById('place');
  const taglineInput = document.getElementById('tagline');
  if (titleInput) titleInput.value = state.title;
  if (placeInput) placeInput.value = state.place;
  if (taglineInput) taglineInput.value = state.tagline;

  if (shot === 'cover') document.body.classList.add('shot-cover');
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
