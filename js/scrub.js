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
  var veil    = track.querySelector(".movie-veil");
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

  /* WHICH BOTTLE IS ON SCREEN — read off the small print in the footage,
     not assumed from the label colour:

       clip 1  (0     – 8.04s)   "MINERAL INFUSED / STILL"
       clip 2  (8.04  – 16.08s)  "MINERAL INFUSED / SPARKLING", on a black
                                 label that dissolves to white at 13.42–13.92s
       clip 3  (16.08 – 25.13s)  SPARKLING, white label, then the splash

     Two consequences:
       · clip 1 is the ONLY still-bottle footage, so still copy must sit there
       · the black label in clip 2 reads as "the still one" to a viewer, so
         sparkling copy still waits for the white label at 13.92s

     THE HOLD. The film freezes inside clip 1 so the still water gets its own
     moment on the still bottle. Scroll keeps moving through the freeze; the
     picture does not. Everything below is therefore measured on a VIRTUAL
     timeline = film seconds + hold units.

     Freeze on the OPENING frame. Clip 1's camera pushes in continuously, so
     any later hold catches the bottle mid-zoom and cropped; frame 0 is the
     one composition with the whole bottle and clean space either side. */
  var HOLD_AT  = 0.0;    // film seconds — the opening composition
  var HOLD_LEN = 7.0;    // how long the freeze lasts, in scroll units

  // film time <-> virtual position
  function vOf(t) { return t <= HOLD_AT ? t : t + HOLD_LEN; }
  function tOfV(v) {
    if (v <= HOLD_AT) return v;
    if (v <= HOLD_AT + HOLD_LEN) return HOLD_AT;   // frozen
    return v - HOLD_LEN;
  }

  /* Beat windows, in VIRTUAL units, in DOM order (which is chronological).
     Freeze runs from virtual 6.6 to 12.6; film resumes after it, so the cut
     to clip 2 lands at virtual 14.04 and the white label at virtual 19.92. */
  var BEATS = [
    // 1 — the promise. Already on screen at load, not faded in on scroll.
    { in0: -2.0, in1: -0.5, out0:  2.4, out1:  3.4 },
    // 2 — the still water, on the right of the bottle. Sits on the frozen
    //     opening frame (freeze runs 0 – 7.0) and is gone by film 1.8s,
    //     before the camera has pushed in far enough to crowd it.
    { in0:  4.0, in1:  5.2, out0:  7.6, out1:  8.8 },
    // 3 — the gap. Film running again, still on clip 1; clears before the
    //     cut to clip 2 at virtual 15.04.
    { in0: 10.0, in1: 11.0, out0: 12.6, out1: 13.8 },
    // 4 — how it's made. Over clip 2's black label. Process copy, so it
    //     suits either bottle, and it clears before the label turns white.
    { in0: 16.2, in1: 17.4, out0: 19.2, out1: 20.4 },
    // 5 — sparkling. The label finishes turning white at virtual 20.92,
    //     so this cannot start before then.
    { in0: 21.2, in1: 22.3, out0: 24.8, out1: 25.6 },
    // 6 — CTA. Once the frame has gone dark, then holds to the end.
    { in0: 26.4, in1: 27.6, out0: 1e9, out1: 1e9 }
  ];

  var FRAME = 1 / 24;          // footage is 24fps
  var EASE  = 0.215;           // scrub weight — lower is heavier
  var SEEK_EPS = FRAME * 0.5;  // don't issue a seek for less than half a frame

  /* ---------------- geometry ---------------- */
  var trackTop = 0, pin = 1, filmPx = 1, vh = 1;
  var durs = [], starts = [], TOTAL = 1, VTOTAL = 1;

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
    VTOTAL = TOTAL + HOLD_LEN;   // scroll covers the film plus the freeze
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

  // Park #move-1..5 where each beat is fully readable.
  function placeAnchors() {
    for (var i = 0; i < anchors.length && i < BEATS.length; i++) {
      var w = BEATS[i];
      var v = (Math.max(w.in1, 0) + Math.min(w.out0, w.in1 + 4)) / 2;
      anchors[i].style.top = ((clamp(v, 0, VTOTAL) / VTOTAL) * filmPx) + "px";
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
  var veilSide = "";   // which side the veil is currently washing
  var running = false;
  var lastInFilm = null;

  // Scroll maps to VIRTUAL position; film time is derived from it via tOfV,
  // so the freeze costs scroll without advancing the picture.
  function timeFromScroll() {
    var raw = window.pageYOffset - trackTop;
    return clamp(raw / filmPx, 0, 1) * VTOTAL;
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
    var v = shown;          // where the scroll is on the virtual timeline
    var t = tOfV(v);        // which frame of film that corresponds to
    var idx = clipAt(t);
    var local = clamp((t - starts[idx]) / durs[idx], 0, 1);

    setLive(idx);

    // --- scrub the live clip ---
    // NB: named `vid`, not `v` — `v` is the virtual timeline position above,
    // and shadowing it here silently turns every beat's opacity into NaN.
    var vid = clips[idx];
    if (vid && vid.readyState >= 1) {
      var want = Math.min(local * durs[idx], durs[idx] - FRAME);
      if (!vid.seeking && isFinite(want) && Math.abs(vid.currentTime - want) > SEEK_EPS) {
        try { vid.currentTime = want; } catch (e) {}
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

    // veil colour follows the picture too — dark side-wash on dark footage,
    // light on bright footage, so the copy always has something to sit on
    root.style.setProperty("--mv-veil", "rgba(" +
      Math.round(mix(6, 252, L)) + "," + Math.round(mix(7, 251, L)) + "," +
      Math.round(mix(9, 249, L)) + "," + mix(0.82, 0.86, L).toFixed(3) + ")");
    root.style.setProperty("--mv-veil-mid", "rgba(" +
      Math.round(mix(6, 252, L)) + "," + Math.round(mix(7, 251, L)) + "," +
      Math.round(mix(9, 249, L)) + "," + mix(0.42, 0.50, L).toFixed(3) + ")");

    // --- copy beats, driven by film time ---
    var topOp = 0, topSide = veilSide;
    for (var i = 0; i < copies.length; i++) {
      var c = copies[i];
      var w = BEATS[i];
      var op = 0, y = 0;
      if (w) {
        op = ramp(v, w.in0, w.in1) * (1 - ramp(v, w.out0, w.out1));
        var span = Math.min(w.out1, w.in1 + 10) - w.in0;
        y = mix(20, -20, clamp((v - w.in0) / (span || 1), 0, 1));
      }
      if (op > topOp) { topOp = op; topSide = c.dataset.side || "left"; }
      c.style.opacity = String(op);
      c.style.transform = "translateY(" + y.toFixed(2) + "px)";
      var off = op < 0.012;
      c.style.visibility = off ? "hidden" : "visible";
      c.setAttribute("aria-hidden", off ? "true" : "false");
    }

    if (veil) {
      if (topSide !== veilSide) {
        veilSide = topSide;
        veil.className = "movie-veil is-" + veilSide;
      }
      veil.style.opacity = topOp.toFixed(3);
    }

    // --- chrome ---
    var overall = clamp((window.pageYOffset - trackTop) / pin, 0, 1);
    if (fill) fill.style.width = (overall * 100) + "%";
    if (hint) hint.style.opacity = String(1 - ramp(v / VTOTAL, 0.004, 0.03));

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
