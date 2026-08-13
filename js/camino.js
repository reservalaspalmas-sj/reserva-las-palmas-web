(function () {
  "use strict";

  function initCaminoToggle() {
    document.querySelectorAll(".camino-summary").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".camino-item");
        var isOpen = item.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", String(isOpen));

        var video = item.querySelector(".camino-media-video");
        if (!video) return;
        if (isOpen) {
          video.play().catch(function () {
            /* autoplay blocked; the visible controls let the visitor start it manually */
          });
        } else {
          video.pause();
        }
      });
    });
  }

  // Fills the vertical rail as the visitor scrolls through the timeline,
  // giving the sense of a path being walked rather than a static list.
  function initCaminoTrack() {
    var track = document.querySelector(".camino-track");
    var fill = document.querySelector(".camino-track-fill");
    if (!track || !fill) return;

    var ticking = false;

    function update() {
      var rect = track.getBoundingClientRect();
      var total = rect.height;
      if (total <= 0) {
        ticking = false;
        return;
      }
      var viewportAnchor = window.innerHeight * 0.8;
      var progressPx = viewportAnchor - rect.top;
      var pct = Math.max(0, Math.min(100, (progressPx / total) * 100));
      fill.style.height = pct + "%";
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initCaminoToggle();
    initCaminoTrack();
  });
})();
