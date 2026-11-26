// The download page: language, lanterns on a string, scenes that change as
// you scroll (a rewind-like ripple), things that appear, and a light and a
// ring that follow the pointer. Still for people who ask for less motion.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---- language ----
  const btn = $('#lang');
  function splitWords(h) {
    const words = h.textContent.trim().split(/\s+/);
    h.replaceChildren(...words.flatMap((w, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.style.setProperty('--i', i);
      s.textContent = w;
      return i < words.length - 1 ? [s, ' '] : [s];
    }));
    h.setAttribute('aria-label', words.join(' '));
  }
  function setLang(l) {
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.title = l === 'ar' ? 'لقطة' : 'Laqta';
    $$('[data-ar]').forEach((e) => { e.textContent = e.dataset[l]; });
    $$('[data-alt-ar]').forEach((e) => { e.alt = l === 'ar' ? e.dataset.altAr : e.dataset.altEn; });
    $$('[data-aria-ar]').forEach((e) => e.setAttribute('aria-label', l === 'ar' ? e.dataset.ariaAr : e.dataset.ariaEn));
    $('.logo').textContent = l === 'ar' ? 'لقطة' : 'Laqta';
    btn.textContent = l === 'ar' ? 'English' : 'العربية';
    if (!still) $$('.split').forEach(splitWords);
    try { localStorage.setItem('laqta-lang', l); } catch (e) { /* private window */ }
  }
  btn.addEventListener('click', () => setLang(document.documentElement.lang === 'ar' ? 'en' : 'ar'));
  let saved = null;
  try { saved = localStorage.getItem('laqta-lang'); } catch (e) { /* private window */ }
  if (saved === 'en') setLang('en');
  else if (!still) $$('.split').forEach(splitWords);

  // ---- lanterns hanging from a sagging string ----
  for (const box of $$('.lights')) {
    const n = Number(box.dataset.count) || 8;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M0 6 Q 50 62 100 6');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(path);
    box.append(svg);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const y = 6 + 2 * (1 - t) * t * 56; // on the curve, in % of the box height
      const l = document.createElement('span');
      l.className = 'lantern';
      l.style.left = `${t * 100}%`;
      l.style.top = `calc(${y}% + 18px)`;
      l.style.setProperty('--tilt', `${((k * 37) % 7) - 3}deg`);
      l.append(document.createElement('i'));
      box.append(l);
    }
  }

  // ---- reveal on scroll ----
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('[data-reveal]').forEach((el) => (still ? el.classList.add('in') : io.observe(el)));

  // ---- scenes: the section in the middle of the screen picks the background ----
  // Still pictures that fade into each other: no video, nothing follows the
  // pointer, so scrolling stays smooth on any PC.
  const scenes = Object.fromEntries($$('.scene').map((s) => [s.dataset.name, s]));
  let current = 'room';
  function show(name) {
    if (name === current || !scenes[name]) return;
    scenes[current].classList.remove('on');
    scenes[name].classList.add('on');
    current = name;
  }
  const sections = $$('[data-scene]');
  let ticking = false;
  function pick() {
    ticking = false;
    const mid = innerHeight * 0.5;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { show(s.dataset.scene); return; }
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(pick); } }, { passive: true });
  // The other pictures load once the page is up, so the first change is ready.
  addEventListener('load', () => ['hill', 'tracks', 'night'].forEach((n) => { new Image().src = `media/${n}.jpg`; }));
})();
