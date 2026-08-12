/* ==========================================================================
   PEAK HYDRATION — live Instagram gallery

   Renders the feed served by instagram.php. If no token is configured, or the
   API is unreachable, the section keeps whatever markup is already in the
   grid — the brand photography — and the heading stays generic, so nothing
   ever claims to be an Instagram post when it isn't.
   ========================================================================== */
(function () {
  "use strict";

  var grid = document.querySelector("[data-instagram]");
  if (!grid) return;

  var HANDLE = grid.getAttribute("data-handle") || "peakhydrationza";
  var PROFILE = "https://www.instagram.com/" + HANDLE + "/";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(items) {
    var html = items.map(function (p) {
      var alt = p.caption
        ? esc(p.caption)
        : "Peak Hydration on Instagram";
      var isVideo = p.type === "VIDEO" || p.type === "CAROUSEL_ALBUM";
      return '<a class="ig-tile" href="' + esc(p.permalink || PROFILE) + '"' +
             ' target="_blank" rel="noopener"' +
             ' aria-label="' + alt + '">' +
             '<img src="' + esc(p.image) + '" alt="' + alt + '" loading="lazy">' +
             (isVideo ? '<span class="ig-tile__badge" aria-hidden="true">' +
                        (p.type === "VIDEO" ? "▶" : "▣") + '</span>' : "") +
             '</a>';
    }).join("");

    grid.innerHTML = html;
    grid.classList.add("ig-grid--live");

    // Only now is it honestly an Instagram feed — label it.
    var label = document.querySelector("[data-ig-label]");
    if (label) label.textContent = "@" + HANDLE;
    var follow = document.querySelector("[data-ig-follow]");
    if (follow) follow.hidden = false;
  }

  fetch("instagram.php", { credentials: "same-origin" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data && data.items && data.items.length) render(data.items);
      // else: leave the fallback markup exactly as it is
    })
    .catch(function () { /* offline or no PHP — fallback stays */ });
})();
