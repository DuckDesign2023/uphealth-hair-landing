// Mobile menu: the burger reveals the links that .main-nav folds away under 720px.
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var panel = document.querySelector('.mobile-nav');
  if (!toggle || !panel) return;

  var open = false;

  function setOpen(next) {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      panel.hidden = false;
      requestAnimationFrame(function () { panel.classList.add('open'); });
    } else {
      panel.classList.remove('open');
      // with reduced motion there is no transition to wait for
      if (parseFloat(getComputedStyle(panel).transitionDuration) === 0) panel.hidden = true;
    }
  }

  // keep the panel out of the tab order once it has collapsed
  panel.addEventListener('transitionend', function (e) {
    if (e.propertyName === 'grid-template-rows' && !open) panel.hidden = true;
  });

  toggle.addEventListener('click', function () { setOpen(!open); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

  // a resize past the breakpoint brings .main-nav back — drop the panel with it.
  // the breakpoint differs per landing, so read it off the burger instead of hard-coding.
  var queued = false;
  window.addEventListener('resize', function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      if (getComputedStyle(toggle).display === 'none') {
        setOpen(false);
        panel.classList.remove('open');
        panel.hidden = true;
      }
    });
  });
})();

// Before/after: dot navigation between slides; each slide has a draggable compare handle.
(function () {
  var root = document.querySelector('.ba');
  if (!root) return;

  var track = root.querySelector('.ba-track');
  var slides = root.querySelectorAll('.ba-slide');
  var dotsWrap = root.querySelector('.ba-dots');
  var index = 0;
  var dots = [];

  function go(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    track.style.transform = 'translateX(' + (-index * 100) + '%)';
    dots.forEach(function (d, k) {
      if (k === index) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }

  slides.forEach(function (_, i) {
    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'ba-dot';
    d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    d.addEventListener('click', function () { go(i); });
    dotsWrap.appendChild(d);
    dots.push(d);
  });
  go(0);

})();

// Compare handle (page-wide): drag anywhere on the image to move the curtain.
(function () {
  document.querySelectorAll('.cmp').forEach(function (cmp) {
    var active = false;
    function setPos(clientX) {
      var r = cmp.getBoundingClientRect();
      var p = ((clientX - r.left) / r.width) * 100;
      p = Math.max(4, Math.min(96, p));
      cmp.style.setProperty('--pos', p + '%');
    }
    cmp.addEventListener('pointerdown', function (e) {
      active = true;
      cmp.setPointerCapture(e.pointerId);
      setPos(e.clientX);
    });
    cmp.addEventListener('pointermove', function (e) { if (active) setPos(e.clientX); });
    cmp.addEventListener('pointerup', function () { active = false; });
    cmp.addEventListener('pointercancel', function () { active = false; });
  });
})();


// Reviews carousel: arrow buttons scroll the snap track by one card.
(function () {
  var track = document.querySelector('.rev-track');
  if (!track) return;
  document.querySelectorAll('.rev-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = track.querySelector('.rev-card');
      var step = card ? card.getBoundingClientRect().width + 18 : 320;
      track.scrollBy({ left: step * (+b.dataset.rev), behavior: 'smooth' });
    });
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

// Shopify-style mini cart: add-to-cart buttons, slide-in drawer, localStorage.
(function () {
  var KEY = 'uphealth-cart';
  var drawer = document.querySelector('.cart-drawer');
  if (!drawer) return;
  var overlay = document.querySelector('.cart-overlay');
  var itemsEl = drawer.querySelector('.cart-items');
  var emptyEl = drawer.querySelector('.cart-empty');
  var subtotalEl = drawer.querySelector('.cart-subtotal strong');
  var countEl = document.querySelector('.cart-count');
  var cartBtn = document.querySelector('.cart-btn');

  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { cart = []; }

  function save() { localStorage.setItem(KEY, JSON.stringify(cart)); }
  function fmt(n) { return '$' + n.toFixed(2); }

  function render() {
    itemsEl.innerHTML = '';
    var total = 0, count = 0;
    cart.forEach(function (item) {
      total += item.price * item.qty;
      count += item.qty;
      var li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML =
        '<img src="' + item.img + '" alt="">' +
        '<div><p class="cart-item-name">' + item.name + '</p>' +
        '<p class="cart-item-price">' + fmt(item.price) + '</p>' +
        '<span class="cart-item-qty">' +
        '<button type="button" data-dec="' + item.id + '" aria-label="Decrease quantity">&minus;</button>' +
        '<span>' + item.qty + '</span>' +
        '<button type="button" data-inc="' + item.id + '" aria-label="Increase quantity">+</button>' +
        '</span></div>' +
        '<button type="button" class="cart-item-remove" data-remove="' + item.id + '" aria-label="Remove ' + item.name + '">&times;</button>';
      itemsEl.appendChild(li);
    });
    emptyEl.hidden = cart.length > 0;
    subtotalEl.textContent = fmt(total);
    countEl.textContent = count;
    countEl.hidden = count === 0;
    save();
  }

  function openCart() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.hidden = false;
  }
  function closeCart() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.hidden = true;
  }

  document.addEventListener('click', function (e) {
    var add = e.target.closest('.add-to-cart');
    if (add) {
      var id = add.dataset.id;
      var found = cart.find(function (i) { return i.id === id; });
      if (found) { found.qty += 1; }
      else {
        cart.push({ id: id, name: add.dataset.name, price: parseFloat(add.dataset.price), img: add.dataset.img, qty: 1 });
      }
      render(); openCart(); return;
    }
    var inc = e.target.closest('[data-inc]');
    if (inc) {
      var it = cart.find(function (i) { return i.id === inc.dataset.inc; });
      if (it) { it.qty += 1; render(); } return;
    }
    var dec = e.target.closest('[data-dec]');
    if (dec) {
      var it2 = cart.find(function (i) { return i.id === dec.dataset.dec; });
      if (it2) {
        it2.qty -= 1;
        if (it2.qty <= 0) cart = cart.filter(function (i) { return i.id !== it2.id; });
        render();
      } return;
    }
    var rem = e.target.closest('[data-remove]');
    if (rem) {
      cart = cart.filter(function (i) { return i.id !== rem.dataset.remove; });
      render(); return;
    }
    if (e.target.closest('.cart-close') || e.target === overlay) { closeCart(); return; }
    if (e.target.closest('.cart-btn')) { openCart(); return; }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeCart();
  });

  render();
})();

// Only one answer open at a time, scoped per accordion list.
(function () {
  document.querySelectorAll('.faq-list').forEach(function (list) {
    var faqs = list.querySelectorAll('details');
    faqs.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        faqs.forEach(function (other) {
          if (other !== d) other.open = false;
        });
      });
    });
  });
})();
