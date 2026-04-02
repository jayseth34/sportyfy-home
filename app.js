/* global gsap, Lenis */

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Smooth scroll (Lenis)
if (!prefersReduced && window.Lenis) {
  const lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true,
    smoothTouch: false,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

// Mobile menu
const navToggle = document.querySelector(".navToggle");
const navLinks = document.querySelector(".navLinks");
if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  navLinks.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  });
}

// Canvas particles background
function initFx() {
  const canvas = document.getElementById("fx");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const DPR = Math.min(2, window.devicePixelRatio || 1);

  let w = 0;
  let h = 0;
  let t = 0;
  let particles = [];

  function resize() {
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const count = Math.floor(Math.sqrt(w * h) / 10);
    particles = Array.from({ length: Math.min(170, Math.max(70, count)) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.8 + Math.random() * 2.2,
      vx: (-0.3 + Math.random() * 0.6) * 0.65,
      vy: (-0.3 + Math.random() * 0.6) * 0.65,
      hue: 180 + Math.random() * 120,
      a: 0.08 + Math.random() * 0.18,
    }));
  }

  function step() {
    t += 0.006;
    ctx.clearRect(0, 0, w, h);

    // Subtle trail
    ctx.fillStyle = "rgba(234,247,255,0.22)";
    ctx.fillRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx + Math.sin(t + p.y * 0.004) * 0.12;
      p.y += p.vy + Math.cos(t + p.x * 0.004) * 0.12;

      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;
    }

    // Links
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d > 140) continue;
        const alpha = (1 - d / 140) * 0.07;
        ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 100%, 65%, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Dots
    for (const p of particles) {
      ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${p.a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(step);
}
if (!prefersReduced) initFx();

// No text/scroll reveal animations: keep page fully visible on load.

// Counters
function animateCounters() {
  const kpis = Array.from(document.querySelectorAll("[data-count]"));
  if (!kpis.length) return;

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const fmt = new Intl.NumberFormat(undefined);

  function run(el) {
    const to = Number(el.getAttribute("data-count") || "0");
    const start = performance.now();
    const dur = 1000;

    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const val = Math.round(to * easeOut(p));
      el.textContent = fmt.format(val);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          run(e.target);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.5 },
    );
    kpis.forEach((el) => io.observe(el));
  } else {
    kpis.forEach(run);
  }
}
animateCounters();

// Overlay demo toggles
const toggles = Array.from(document.querySelectorAll(".toggle[data-toggle]"));
const hudScore = document.querySelector(".hudScore");
const hudAuction = document.querySelector(".hudAuction");
const sponsor = document.querySelector(".sponsor");
const stageVideo = document.querySelector(".stageVideo img");

function setToggle(btn, on) {
  btn.setAttribute("aria-pressed", on ? "true" : "false");
}

function animateVisibility(el, on) {
  if (!el) return;
  if (window.gsap && !prefersReduced) {
    gsap.to(el, { autoAlpha: on ? 1 : 0, y: on ? 0 : 10, duration: 0.35, ease: "power2.out" });
  } else {
    el.style.opacity = on ? "1" : "0";
  }
}

toggles.forEach((btn) => {
  const key = btn.getAttribute("data-toggle");
  const defaultOn = key !== "motion";
  setToggle(btn, defaultOn);
});

toggles.forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-toggle");
    const on = btn.getAttribute("aria-pressed") !== "true";
    setToggle(btn, on);

    if (key === "score") animateVisibility(hudScore, on);
    if (key === "auction") animateVisibility(hudAuction, on);
    if (key === "sponsor") animateVisibility(sponsor, on);

    if (key === "motion" && stageVideo) {
      stageVideo.classList.toggle("cinema", on);
      if (window.gsap && !prefersReduced) {
        gsap.to(stageVideo, { scale: on ? 1.08 : 1.03, duration: 0.6, ease: "power3.out" });
      }
    }
  });
});

// Footer year
const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());
