// Before/after slider — native horizontal scroll with snap + drag; dots reflect position.
(function () {
  var root = document.querySelector('.ba');
  if (!root) return;

  var viewport = root.querySelector('.ba-viewport');
  var slides = root.querySelectorAll('.ba-slide');
  var dotsWrap = root.querySelector('.ba-dots');

  var dots = [];
  slides.forEach(function (_, i) {
    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'ba-dot';
    d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    d.addEventListener('click', function () {
      viewport.scrollTo({ left: i * viewport.clientWidth, behavior: 'smooth' });
    });
    dotsWrap.appendChild(d);
    dots.push(d);
  });

  function sync() {
    var i = Math.round(viewport.scrollLeft / Math.max(1, viewport.clientWidth));
    i = Math.max(0, Math.min(slides.length - 1, i));
    dots.forEach(function (d, k) {
      if (k === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }
  viewport.addEventListener('scroll', sync, { passive: true });
  sync();

  // Drag-to-scroll with the mouse (touch scrolls natively).
  var down = null;
  viewport.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    down = { x: e.clientX, left: viewport.scrollLeft };
    viewport.classList.add('dragging');
  });
  window.addEventListener('pointermove', function (e) {
    if (!down) return;
    viewport.scrollLeft = down.left - (e.clientX - down.x);
  });
  window.addEventListener('pointerup', function () {
    if (!down) return;
    down = null;
    viewport.classList.remove('dragging');
    var i = Math.round(viewport.scrollLeft / Math.max(1, viewport.clientWidth));
    viewport.scrollTo({ left: i * viewport.clientWidth, behavior: 'smooth' });
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
