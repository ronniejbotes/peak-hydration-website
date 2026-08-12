/* ==========================================================================
   PEAK HYDRATION — site interactions
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Sticky header state ---------- */
  var header = document.querySelector(".header");
  function onScrollHeader() {
    if (!header) return;
    var scrolled = window.scrollY > 30;
    header.classList.toggle("scrolled", scrolled);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.querySelector(".mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      document.body.style.overflow = open ? "hidden" : "";
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        menu.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Accordion ---------- */
  var accHeads = document.querySelectorAll(".acc-head");
  accHeads.forEach(function (head) {
    head.addEventListener("click", function () {
      var item = head.parentElement;
      var panel = item.querySelector(".acc-panel");
      var isOpen = item.classList.contains("open");
      // close all
      document.querySelectorAll(".acc-item").forEach(function (it) {
        it.classList.remove("open");
        var p = it.querySelector(".acc-panel");
        if (p) p.style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("open");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });

  /* ---------- Contact form ---------- */
  var form = document.querySelector("[data-form]");
  var status = document.querySelector("[data-form-status]");
  if (form && status) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      status.textContent = "Sending…";
      var data = new FormData(form);
      fetch(form.getAttribute("action") || "send-message.php", {
        method: "POST",
        body: data
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (json && json.ok) {
            status.className = "form-status success";
            status.textContent = "Thank you — your message has been sent. We'll get back to you shortly.";
            form.reset();
          } else {
            status.className = "form-status error";
            status.textContent = (json && json.error) || "Something went wrong. Please try again.";
          }
        })
        .catch(function () {
          status.className = "form-status error";
          status.textContent = "Network error. Please try again or email us directly.";
        });
    });
  }

  /* ---------- Current year ---------- */
  var year = document.querySelectorAll("[data-year]");
  var y = String(new Date().getFullYear());
  year.forEach(function (el) { el.textContent = y; });
})();