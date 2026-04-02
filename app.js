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

  const introEl = document.getElementById("intro");
  document.body.classList.add("introActive");
  if (introEl) introEl.classList.add("show");

  // Voice during intro: "Welcome to SPORTYFY"
  let welcomeSpoken = false;
  let cachedVoice = null;

  function pickVoice() {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
    const voices = window.speechSynthesis.getVoices?.() || [];
    cachedVoice =
      voices.find((v) => String(v.lang).toLowerCase().startsWith("en") && /female|samantha|zira/i.test(v.name)) ||
      voices.find((v) => String(v.lang).toLowerCase().startsWith("en")) ||
      voices[0] ||
      null;
  }

  function speakWelcome() {
    if (welcomeSpoken) return;
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
    welcomeSpoken = true;

    try {
      pickVoice();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Welcome to Sportyfy");
      u.lang = (cachedVoice && cachedVoice.lang) || "en-US";
      if (cachedVoice) u.voice = cachedVoice;
      u.rate = 0.95;
      u.pitch = 1.02;
      u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch {
      // Ignore
    }
  }

  // Try to play automatically (may be blocked by browser). If blocked, user tap during intro will play it.
  if (!prefersReduced) {
    window.speechSynthesis?.addEventListener?.("voiceschanged", pickVoice);
    setTimeout(speakWelcome, 120);
    introEl?.addEventListener("pointerdown", speakWelcome, { once: true });
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  const DPR = Math.min(2, window.devicePixelRatio || 1);

  let w = 0;
  let h = 0;
  let t = 0;
  let particles = [];
  let mode = "intro"; // intro only; no particles after
  let introStart = 0;
  let targets = [];
  let last = performance.now();
  let phase = "gather"; // "gather" | "hold" | "fade"
  let phaseStart = 0;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildTextTargets(text) {
    const off = document.createElement("canvas");
    const octx = off.getContext("2d", { willReadFrequently: true });

    off.width = Math.max(1, Math.floor(w));
    off.height = Math.max(1, Math.floor(h));

    octx.clearRect(0, 0, off.width, off.height);

    const fontSize = clamp(Math.floor(w * 0.20), 66, Math.min(200, Math.floor(h * 0.30)));
    octx.font = `900 italic ${fontSize}px "Space Grotesk", system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    octx.textAlign = "center";
    octx.textBaseline = "middle";

    const centerY = clamp(h * 0.28, 130, h * 0.42);

    // Solid text mask
    octx.fillStyle = "#ffffff";
    octx.fillText(text, off.width / 2, centerY);

    const data = octx.getImageData(0, 0, off.width, off.height).data;

    // Sample density: higher res on desktop, lower on mobile.
    const step = w < 520 ? 7 : w < 900 ? 6 : 5;
    const pts = [];
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const a = data[(y * off.width + x) * 4 + 3];
        if (a > 140) pts.push({ x, y });
      }
    }

    return pts;
  }

  function resize() {
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const ambientCount = Math.floor(Math.sqrt(w * h) / 10);
    const targetCount = Math.min(170, Math.max(70, ambientCount));

    // Build intro targets and ensure enough particles to form the text.
    targets = buildTextTargets("SPORTYFY");
    const maxIntro = w < 520 ? 650 : w < 900 ? 900 : 1200;
    if (targets.length > maxIntro) {
      const stride = Math.ceil(targets.length / maxIntro);
      targets = targets.filter((_, idx) => idx % stride === 0);
    }
    shuffle(targets);

    const desired = Math.min(maxIntro, targets.length);
    particles = Array.from({ length: desired }, (_, i) => {
      const tgt = targets[i % targets.length];
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.1 + Math.random() * 2.2,
        vx: (-0.3 + Math.random() * 0.6) * 0.65,
        vy: (-0.3 + Math.random() * 0.6) * 0.65,
        a: 0.14 + Math.random() * 0.26,
        tx: tgt.x,
        ty: tgt.y,
      };
    });

    mode = "intro";
    introStart = performance.now();
    phase = "gather";
    phaseStart = introStart;
  }

  function step() {
    const now = performance.now();
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    t += 0.006;
    ctx.clearRect(0, 0, w, h);

    function drawDot(dot, alphaMul) {
      const g = Math.max(0, Math.min(1, alphaMul));
      // Glow pass
      ctx.fillStyle = `rgba(255,255,255,${0.10 * g})`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r * 2.0, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = `rgba(255,255,255,${(dot.a + 0.62) * g})`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Darker background + crisper particles
    const trail = phase === "hold" ? 0.62 : phase === "fade" ? 0.58 : 0.56;
    ctx.fillStyle = `rgba(0,0,0,${trail})`;
    ctx.fillRect(0, 0, w, h);

    if (mode === "intro") {
      const gatherDur = 2100;
      const holdDur = 420;
      const fadeDur = 420;

      if (phase === "gather") {
        const p = clamp((now - phaseStart) / gatherDur, 0, 1);
        const ease = 1 - Math.pow(1 - p, 3);

        for (const dot of particles) {
          const dx = (dot.tx ?? dot.x) - dot.x;
          const dy = (dot.ty ?? dot.y) - dot.y;
          const force = 0.020 + ease * 0.032;

          dot.vx = (dot.vx + dx * force) * (0.84 - ease * 0.05);
          dot.vy = (dot.vy + dy * force) * (0.84 - ease * 0.05);

          dot.vx += Math.sin(t + dot.y * 0.01) * 0.02 * (1 - ease);
          dot.vy += Math.cos(t + dot.x * 0.01) * 0.02 * (1 - ease);

          dot.x += dot.vx * (dt * 60);
          dot.y += dot.vy * (dt * 60);
        }

        for (const dot of particles) drawDot(dot, 1);

        if (p >= 1) {
          phase = "hold";
          phaseStart = now;
        }
      } else if (phase === "hold") {
        for (const dot of particles) drawDot(dot, 1);
        if (now - phaseStart >= holdDur) {
          phase = "fade";
          phaseStart = now;
        }
      } else if (phase === "fade") {
        const fp = clamp((now - phaseStart) / fadeDur, 0, 1);
        const alpha = 1 - (1 - Math.pow(1 - fp, 3));
        const a = 1 - alpha;
        for (const dot of particles) drawDot(dot, a);
        if (fp >= 1) {
          // End: hide particles entirely, reveal content with glass UI.
          canvas.style.opacity = "0";
          canvas.style.transition = "opacity .45s ease";
          setTimeout(() => {
            canvas.style.display = "none";
            ctx.clearRect(0, 0, w, h);
          }, 520);

          if (introEl) introEl.classList.add("hide");
          setTimeout(() => {
            document.body.classList.remove("introActive");
            if (introEl) {
              introEl.classList.remove("show");
              introEl.classList.remove("hide");
            }
          }, 650);
          return;
        }
      }

      requestAnimationFrame(step);
      return;
    }

    for (const p of particles) {
      p.x += p.vx + Math.sin(t + p.y * 0.004) * 0.12;
      p.y += p.vy + Math.cos(t + p.x * 0.004) * 0.12;

      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;
    }

    // Links
    if (particles.length <= 220) {
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > 140) continue;
          const alpha = (1 - d / 140) * 0.07;
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Dots
    for (const p of particles) {
      ctx.fillStyle = `rgba(255,255,255,${p.a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // No ambient particles after intro.
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  // Skip intro if reduced motion
  if (prefersReduced) {
    document.body.classList.remove("introActive");
    if (introEl) introEl.classList.remove("show");
    canvas.style.display = "none";
    return;
  }

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
