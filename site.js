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
  const scenes = Object.fromEntries($$('.scene').map((s) => [s.dataset.name, s]));
  const ripple = $('#ripple');
  let motion = !still && !saveData;
  let lite = false;
  let current = 'room';
  let scrolling = false;
  function play(name) {
    const v = $('video', scenes[name]);
    if (!motion || lite || scrolling || !v) return;
    if (!v.src) { v.src = v.dataset.src; v.load(); }
    v.play().catch(() => {});
  }
  function show(name) {
    if (name === current || !scenes[name]) return;
    const old = scenes[current];
    old.classList.remove('on');
    old.classList.add('leaving');
    const vOld = $('video', old);
    setTimeout(() => { old.classList.remove('leaving'); if (vOld) vOld.pause(); }, 1300);
    scenes[name].classList.add('on');
    play(name);
    if (!still && !lite) { ripple.classList.remove('go'); void ripple.offsetWidth; ripple.classList.add('go'); }
    current = name;
  }
  // While the page scrolls the video holds still: scrolling stays smooth, and
  // it plays on a moment after the reader stops.
  let resume = 0;
  addEventListener('scroll', () => {
    if (!scrolling) { scrolling = true; const v = $('video', scenes[current]); if (v) v.pause(); }
    clearTimeout(resume);
    resume = setTimeout(() => { scrolling = false; play(current); }, 220);
  }, { passive: true });
  // Light mode: if the first seconds draw slowly (an old or busy PC, no
  // graphics acceleration), keep the still pictures and drop the heavy parts.
  if (motion) {
    let frames = 0, slow = 0, last = performance.now();
    const t0 = last;
    (function probe(now) {
      if (now - last > 34) slow++;
      frames++; last = now;
      if (now - t0 < 2500) return requestAnimationFrame(probe);
      if (slow > frames * 0.25) {
        lite = true; motion = false;
        document.body.classList.add('lite');
        $$('.scene video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
      }
    })(t0);
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
  play('room');
  // Fetch the next scene while the reader is still on the first one.
  // (All four together are about 1.6 MB; loading them early keeps the first change smooth.)
  if (motion) {
    ['hill', 'tracks', 'night'].forEach((n, i) => setTimeout(() => {
      const v = $('video', scenes[n]);
      if (!lite && !v.src) { v.preload = 'auto'; v.src = v.dataset.src; }
    }, 2500 + i * 1500));
  }
  document.addEventListener('visibilitychange', () => {
    const v = $('video', scenes[current]);
    if (!v || !motion) return;
    document.hidden ? v.pause() : v.play().catch(() => {});
  });

  if (still || !finePointer) return;

  // ---- the pointer: a warm light behind, a ring in front (asleep when still) ----
  document.body.classList.add('pointer');
  const glow = $('#glow');
  const ring = $('#ring');
  let mx = innerWidth / 2, my = innerHeight / 3, gx = mx, gy = my, rx = mx, ry = my;
  let running = false;
  function follow() {
    gx += (mx - gx) * 0.08; gy += (my - gy) * 0.08;
    rx += (mx - rx) * 0.25; ry += (my - ry) * 0.25;
    glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    running = Math.abs(mx - gx) + Math.abs(my - gy) > 0.5;
    if (running) requestAnimationFrame(follow);
  }
  addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (!running) { running = true; requestAnimationFrame(follow); }
  }, { passive: true });
  document.addEventListener('pointerleave', () => document.body.classList.remove('pointer'));
  document.addEventListener('pointerenter', () => document.body.classList.add('pointer'));
  const pressable = 'a, button, .polaroid, .page';
  document.addEventListener('pointerover', (e) => { if (e.target.closest(pressable)) ring.classList.add('on'); });
  document.addEventListener('pointerout', (e) => { if (e.target.closest(pressable) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(pressable))) ring.classList.remove('on'); });

  // ---- photos tilt towards the pointer; a glint follows it ----
  for (const p of $$('.tilt')) {
    let r = null;
    p.addEventListener('pointerenter', () => { r = p.getBoundingClientRect(); });
    p.addEventListener('pointermove', (e) => {
      r = r || p.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      p.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
      p.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
      p.style.setProperty('--gx', `${x * 100}%`);
      p.style.setProperty('--gy', `${y * 100}%`);
      p.classList.add('hover');
    });
    p.addEventListener('pointerleave', () => {
      r = null;
      p.style.setProperty('--rx', '0deg');
      p.style.setProperty('--ry', '0deg');
      p.classList.remove('hover');
    });
  }

  // ---- download buttons lean towards the pointer ----
  for (const m of $$('.magnet')) {
    m.addEventListener('pointermove', (e) => {
      const r = m.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      m.style.transform = `translate(${dx * 0.18}px, ${dy * 0.25}px)`;
    });
    m.addEventListener('pointerleave', () => { m.style.transform = ''; });
  }
})();
