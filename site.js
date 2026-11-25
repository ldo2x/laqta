// The download page's small touches: language, words that rise in, things
// that appear on scroll, a light and a ring that follow the pointer,
// polaroids that tilt towards it, buttons that lean to it. All of it stays
// still for people who ask their system for less motion.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
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

  // ---- the background video: never on reduced motion or data saver ----
  const video = $('#bg');
  const saveData = navigator.connection && navigator.connection.saveData;
  if (still || saveData) { video.removeAttribute('autoplay'); video.pause(); video.preload = 'none'; }
  else video.play().catch(() => {});
  // Pause it while the tab is hidden.
  document.addEventListener('visibilitychange', () => { if (!still && !saveData) document.hidden ? video.pause() : video.play().catch(() => {}); });

  // ---- reveal on scroll ----
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('[data-reveal]').forEach((el) => (still ? el.classList.add('in') : io.observe(el)));

  if (still || !finePointer) return;

  // ---- the pointer: a warm light behind, a ring in front ----
  document.body.classList.add('pointer');
  const glow = $('#glow');
  const ring = $('#ring');
  let mx = innerWidth / 2, my = innerHeight / 3, gx = mx, gy = my, rx = mx, ry = my;
  // Runs only while something still moves; asleep otherwise.
  let running = false;
  function follow() {
    gx += (mx - gx) * 0.08; gy += (my - gy) * 0.08; // the light drifts behind
    rx += (mx - rx) * 0.25; ry += (my - ry) * 0.25; // the ring keeps up
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
  const pressable = 'a, button, .polaroid';
  document.addEventListener('pointerover', (e) => { if (e.target.closest(pressable)) ring.classList.add('on'); });
  document.addEventListener('pointerout', (e) => { if (e.target.closest(pressable) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(pressable))) ring.classList.remove('on'); });

  // ---- polaroids tilt towards the pointer; a glint follows it ----
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

  // ---- feature cards are lit where the pointer is ----
  for (const c of $$('.card')) {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--gx', `${e.clientX - r.left}px`);
      c.style.setProperty('--gy', `${e.clientY - r.top}px`);
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
