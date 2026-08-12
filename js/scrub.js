/* ==========================================================================
   PEAK HYDRATION — Scroll-scrub cinematic engine

   ONE continuous film. The three clips are chained on a single timeline
   inside a single pinned stage, so the picture never unsticks and there is
   no gap or seam where one clip hands over to the next.

   Scroll down = the film plays forward. Scroll up = it plays backward.
   ========================================================================== */
(function () {
  "use strict";

  var track = document.getElementById("movie");
  if (!track) return;

  var clips   = [].slice.call(track.querySelectorAll(".movie-clip"));
  var copies  = [].slice.call(track.querySelectorAll(".movie-copy"));
  var anchors = [].slice.call(track.querySelectorAll(".movie-anchor"));
  var scrimD  = track.querySelector(".movie-scrim--dark");
  var scrimL  = track.querySelector(".movie-scrim--light");
  var hint    = track.querySelector(".movie-hint");
  var fill    = document.querySelector(".movie-progress__fill");
  var root    = document.documentElement;
  var body    = document.body;

  if (!clips.length) return;

  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* --------------------------------------------------------------------
     Average luminance of each clip, measured from the actual footage
     (ffmpeg signalstats YAVG, 0-255, sampled every 0.5s).
     Text, buttons, header and scrim colour are interpolated from this, so
     contrast follows the picture instead of flipping per section — clip 2
     starts dark and ends white, clip 3 starts white and goes dark.
     -------------------------------------------------------------------- */
  var LUMA = [
    [44,45,46,47,49,51,54,57,60,62,64,65,65,64,64,63,61],
    [60,60,60,61,60,61,60,59,59,59,66,88,123,172,217,225,225],
    [222,222,222,204,146,65,46,44,44,44,47,52,59,66,72,78,82,83,88]
  ];

  /* When each clip's copy fades in and out, in that clip's own progress.
     Windows are placed over the stable part of each clip — clip 2's copy
     clears out before the footage blows out to white, clip 3's arrives
     after the white has resolved to black. */
  var WINDOW = [
    // beat 1 starts already on screen — the headline should be readable the
    // instant the page loads, not only after the visitor scrolls
    { in0: -0.10, in1: -0.02, out0: 0.70, out1: 0.86 },
    { in0: 0.05, in1: 0.18, out0: 0.56, out1: 0.70 },
    { in0: 0.28, in1: 0.42, out0: 9.00, out1: 9.00 }  // CTA holds to the end
  ];

  var FRAME = 1 / 24;          // footage is 24fps
  var EASE  = 0.215;           // scrub weight — lower is heavier
  var SEEK_EPS = FRAME * 0.5;  // don't issue a seek for less than half a frame

  /* ---------------- geometry ---------------- */
  var trackTop = 0, pin = 1, filmPx = 1, vh = 1;
  var durs = [], starts = [], TOTAL = 1;

  function readDurations() {
    durs = clips.map(function (v) {
      var d = v.duration;
      if (!isFinite(d) || d <= 0) d = parseFloat(v.dataset.dur) || 8;
      return d;
    });
    starts = [];
    var acc = 0;
    for (var i = 0; i < durs.length; i++) { starts.push(acc); acc += durs[i]; }
    TOTAL = Math.max(0.001, acc);
  }

  // Resolve a CSS length custom property (vh or px) to pixels.
  function cssLen(name, fallback) {
    var raw = getComputedStyle(track).getPropertyValue(name).trim();
    var n = parseFloat(raw);
    if (!isFinite(n)) return fallback;
    if (raw.indexOf("vh") > -1) return n * vh / 100;
    if (raw.indexOf("px") > -1) return n;
    return fallback;
  }

  function measure() {
    vh = window.innerHeight || 1;
    var r = track.getBoundingClientRect();
    trackTop = r.top + window.pageYOffset;
    pin = Math.max(1, track.offsetHeight - vh);
    var tail = cssLen("--film-tail", vh * 0.6);
    filmPx = Math.max(1, pin - tail);
    placeAnchors();
  }

  // Park #move-1/2/3 at the point where each clip's copy is fully readable.
  function placeAnchors() {
    for (var i = 0; i < anchors.length && i < durs.length; i++) {
      var w = WINDOW[i] || WINDOW[0];
      var mid = (w.in1 + Math.min(w.out0, 0.92)) / 2;
      var t = starts[i] + mid * durs[i];
      anchors[i].style.top = ((t / TOTAL) * filmPx) + "px";
    }
  }

  /* ---------------- helpers ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function ramp(v, a, b) { return smooth((v - a) / (b - a || 1)); }
  function mix(a, b, t) { return a + (b - a) * t; }

  function lumaAt(idx, local) {
    var arr = LUMA[idx] || LUMA[0];
    var x = clamp(local, 0, 1) * (arr.length - 1);
    var i = Math.floor(x);
    var f = x - i;
    var a = arr[i];
    var b = arr[Math.min(arr.length - 1, i + 1)];
    return mix(a, b, f);
  }

  /* ---------------- state ---------------- */
  var target = 0;      // film time the scroll position asks for
  var shown  = 0;      // film time actually being displayed (eased)
  var live   = -1;     // which clip is on top
  var running = false;
  var lastInFilm = null;

  function timeFromScroll() {
    var raw = window.pageYOffset - trackTop;
    return clamp(raw / filmPx, 0, 1) * TOTAL;
  }

  function clipAt(t) {
    for (var i = durs.length - 1; i >= 0; i--) {
      if (t >= starts[i]) return i;
    }
    return 0;
  }

  // Park the neighbours on the frames they'll be handed, so a boundary swap
  // is instant and can never show a decode gap.
  function park(idx) {
    for (var i = 0; i < clips.length; i++) {
      if (i === idx) continue;
      var v = clips[i];
      if (!v || v.readyState < 1 || v.seeking) continue;
      var want = i < idx ? Math.max(0, durs[i] - FRAME) : 0;
      if (Math.abs(v.currentTime - want) > SEEK_EPS) {
        try { v.currentTime = want; } catch (e) {}
      }
    }
  }

  function setLive(idx) {
    if (idx === live) return;
    live = idx;
    for (var i = 0; i < clips.length; i++) {
      clips[i].classList.toggle("is-live", i === idx);
    }
    park(idx);
  }

  /* ---------------- render ---------------- */
  function render() {
    var t = shown;
    var idx = clipAt(t);
    var local = clamp((t - starts[idx]) / durs[idx], 0, 1);

    setLive(idx);

    // --- scrub the live clip ---
    var v = clips[idx];
    if (v && v.readyState >= 1) {
      var want = Math.min(local * durs[idx], durs[idx] - FRAME);
      if (!v.seeking && isFinite(want) && Math.abs(v.currentTime - want) > SEEK_EPS) {
        try { v.currentTime = want; } catch (e) {}
      }
    }

    // --- colour signal from the footage ---
    var L = ramp(lumaAt(idx, local), 96, 168);   // 0 = dark picture, 1 = bright
    var fgc = Math.round(mix(255, 10, L));
    var fg  = "rgb(" + fgc + "," + fgc + "," + fgc + ")";
    root.style.setProperty("--mv-fg", fg);
    root.style.setProperty("--mv-bg", "rgb(" + Math.round(mix(10, 250, L)) + "," +
                                              Math.round(mix(10, 249, L)) + "," +
                                              Math.round(mix(10, 246, L)) + ")");
    root.style.setProperty("--mv-muted", "rgba(" + fgc + "," + fgc + "," + fgc + ",0.62)");
    root.style.setProperty("--mv-line",  "rgba(" + fgc + "," + fgc + "," + fgc + ",0.28)");
    root.style.setProperty("--mv-inv", String(1 - L));
    root.style.setProperty("--mv-bar",
      L < 0.5 ? "rgba(10,10,10,0.9)" : "rgba(248,246,242,0.92)");

    if (scrimL) scrimL.style.opacity = String(L);
    if (scrimD) scrimD.style.opacity = String(1 - L);

    // --- copy blocks ---
    for (var i = 0; i < copies.length; i++) {
      var c = copies[i];
      var op = 0, y = 0;
      if (i === idx) {
        var w = WINDOW[i] || WINDOW[0];
        op = ramp(local, w.in0, w.in1) * (1 - ramp(local, w.out0, w.out1));
        y = mix(28, -28, local);
      }
      c.style.opacity = String(op);
      c.style.transform = "translateY(" + y.toFixed(2) + "px)";
      var off = op < 0.012;
      c.style.visibility = off ? "hidden" : "visible";
      c.setAttribute("aria-hidden", off ? "true" : "false");
    }

    // --- chrome ---
    var overall = clamp((window.pageYOffset - trackTop) / pin, 0, 1);
    if (fill) fill.style.width = (overall * 100) + "%";
    if (hint) hint.style.opacity = String(1 - ramp(t / TOTAL, 0.004, 0.03));

    var sy = window.pageYOffset;
    var inFilm = sy >= trackTop - 2 && sy <= trackTop + pin + 2;
    if (inFilm !== lastInFilm) {
      lastInFilm = inFilm;
      body.classList.toggle("in-film", inFilm);
    }
  }

  /* ---------------- loop ---------------- */
  function tick() {
    var d = target - shown;
    if (Math.abs(d) < 0.0015) {
      shown = target;
      render();
      running = false;
      return;
    }
    shown += d * EASE;
    render();
    requestAnimationFrame(tick);
  }

  function kick() {
    target = timeFromScroll();
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  /* ---------------- wiring ---------------- */
  function boot() {
    readDurations();
    measure();
    shown = target = timeFromScroll();
    render();
  }

  if (reduceMQ.matches) {
    // static fallback — CSS unpins everything, just show the first frame
    clips.forEach(function (v) { try { v.currentTime = 0; } catch (e) {} });
    copies.forEach(function (c) {
      c.style.opacity = "1"; c.style.visibility = "visible";
      c.setAttribute("aria-hidden", "false");
    });
    return;
  }

  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", function () { measure(); kick(); }, { passive: true });
  window.addEventListener("orientationchange", function () { measure(); kick(); });

  clips.forEach(function (v) {
    v.addEventListener("loadedmetadata", function () {
      readDurations(); measure(); kick();
    });
    // a completed seek may leave us behind the target — nudge the loop
    v.addEventListener("seeked", function () { if (!running) kick(); });
  });

  // Some browsers only allow seeking once the element has been played.
  var primed = false;
  function prime() {
    if (primed) return;
    primed = true;
    clips.forEach(function (v) {
      try {
        v.muted = true; v.defaultMuted = true; v.setAttribute("muted", "");
        var p = v.play();
        if (p && p.then) p.then(function () { v.pause(); }).catch(function () {});
      } catch (e) {}
    });
  }
  ["pointerdown", "touchstart", "wheel", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, prime, { passive: true, once: true });
  });

  boot();
  prime();
  window.addEventListener("load", function () { readDurations(); measure(); kick(); });
})();
