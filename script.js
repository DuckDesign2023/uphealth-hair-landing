// Before/after slider — quiet navigation: arrows, counter, swipe.
(function () {
  var root = document.querySelector('.ba');
  if (!root) return;

  var track = root.querySelector('.ba-track');
  var slides = root.querySelectorAll('.ba-slide');
  var counter = root.querySelector('.ba-count');
  var index = 0;

  function go(next) {
    index = (next + slides.length) % slides.length;
    track.style.transform = 'translateX(' + (-index * 100) + '%)';
    counter.textContent = (index + 1) + ' / ' + slides.length;
  }

  root.querySelectorAll('.ba-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      go(index + Number(btn.dataset.dir));
    });
  });

  // Light swipe support.
  var startX = null;
  var viewport = root.querySelector('.ba-viewport');
  viewport.addEventListener('pointerdown', function (e) { startX = e.clientX; });
  viewport.addEventListener('pointerup', function (e) {
    if (startX === null) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();

// Stat numbers count up once when the section becomes visible.
(function () {
  var counts = document.querySelectorAll('.count');
  if (!counts.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function settle(el) { el.textContent = el.dataset.target; }

  if (reduced || !('IntersectionObserver' in window)) {
    counts.forEach(settle);
    return;
  }

  function animate(el) {
    var target = Number(el.dataset.target);
    var t0 = null;
    var duration = 900;
    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });

  counts.forEach(function (el) { observer.observe(el); });
})();

// Only one FAQ answer open at a time.
(function () {
  var faqs = document.querySelectorAll('.faq-list details');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      faqs.forEach(function (other) {
        if (other !== d) other.open = false;
      });
    });
  });
})();
