(function () {
  "use strict";

  var LANG_KEY = "rlp-lang";
  var html = document.documentElement;

  function applyLang(lang) {
    document.querySelectorAll("[data-lang]").forEach(function (el) {
      el.hidden = el.getAttribute("data-lang") !== lang;
    });
    html.setAttribute("lang", lang);
    localStorage.setItem(LANG_KEY, lang);
  }

  function initLangToggle() {
    var saved = localStorage.getItem(LANG_KEY) || "es";
    applyLang(saved);
    updateGalleryLabels(saved);

    var toggle = document.getElementById("lang-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var current = html.getAttribute("lang") === "en" ? "en" : "es";
      var next = current === "es" ? "en" : "es";
      applyLang(next);
      updateGalleryLabels(next);
    });
  }

  function updateGalleryLabels(lang) {
    document.querySelectorAll("[data-label-es]").forEach(function (el) {
      var label = lang === "en" ? el.getAttribute("data-label-en") : el.getAttribute("data-label-es");
      el.setAttribute("aria-label", label);
    });
  }

  function initGalleries() {
    document.querySelectorAll(".gallery").forEach(function (gallery) {
      var slides = Array.prototype.slice.call(gallery.querySelectorAll(".gallery-slide"));
      var dotsWrap = gallery.querySelector(".gallery-dots");
      var prevBtn = gallery.querySelector(".gallery-prev");
      var nextBtn = gallery.querySelector(".gallery-next");
      if (slides.length <= 1) {
        if (prevBtn) prevBtn.hidden = true;
        if (nextBtn) nextBtn.hidden = true;
        return;
      }

      var current = slides.findIndex(function (s) { return s.classList.contains("is-active"); });
      if (current < 0) current = 0;

      var dots = slides.map(function (_, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", "Foto " + (i + 1));
        dot.addEventListener("click", function () { goTo(i); });
        dotsWrap.appendChild(dot);
        return dot;
      });

      function render() {
        slides.forEach(function (s, i) { s.classList.toggle("is-active", i === current); });
        dots.forEach(function (d, i) { d.classList.toggle("is-active", i === current); });
      }

      function goTo(index) {
        current = (index + slides.length) % slides.length;
        render();
      }

      if (prevBtn) prevBtn.addEventListener("click", function () { goTo(current - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { goTo(current + 1); });

      gallery.setAttribute("tabindex", "0");
      gallery.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") goTo(current - 1);
        if (e.key === "ArrowRight") goTo(current + 1);
      });

      render();
    });
  }

  function initHeaderScroll() {
    var header = document.getElementById("site-header");
    if (!header) return;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initMobileMenu() {
    var toggle = document.getElementById("menu-toggle");
    var nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;

    function close() {
      nav.classList.remove("is-open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", close);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || items.length === 0) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    items.forEach(function (el) { observer.observe(el); });
  }

  function initHeroVideo() {
    var video = document.querySelector(".hero-video");
    if (!video) return;
    var isSmall = window.matchMedia("(max-width: 720px)").matches;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isSmall || reduced) return;
    video.setAttribute("preload", "auto");
    video.play().catch(function () {
      /* autoplay was blocked; poster/fallback image remains visible */
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLangToggle();
    initHeaderScroll();
    initMobileMenu();
    initReveal();
    initHeroVideo();
    initGalleries();
  });
})();
