(function () {
  "use strict";
  /* Consulta San Patricio — interacciones (IIFE, sin módulos) */
  var doc = document.documentElement;
  doc.classList.remove("no-js");

  function safe(fn, name) {
    try { fn(); } catch (e) { if (window.console) console.warn("[init] " + name + " falló:", e); }
  }
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var els = $$(".reveal:not([data-split])");
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-visible"); }); return; }
    // stagger for sibling groups
    $$(".cards4, .surg, .docs, .reviews, .faq__list, .gallery, .results").forEach(function (g) {
      $$(".reveal", g).forEach(function (el, i) { el.style.setProperty("--d", (i * 90) + "ms"); });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      els.forEach(function (el) {
        if (!el.classList.contains("is-visible") && el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
      });
    }, 6000);
  }

  /* ---------- Nav: estado scroll + subrayado deslizante + sección activa ---------- */
  function initNav() {
    var nav = $("[data-nav]"), dock = $(".dock"), hero = $(".hero");
    var onScroll = function () {
      var y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 24);
      if (dock && hero) dock.classList.toggle("is-on", y > hero.offsetHeight * 0.6);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var wrap = $("[data-underline-nav]"), bar = $(".nav__bar", wrap);
    if (!wrap || !bar) return;
    var links = $$("a", wrap);
    function moveTo(a) {
      if (!a) { bar.style.opacity = "0"; return; }
      bar.style.width = (a.offsetWidth - 28) + "px";
      bar.style.setProperty("--x", (a.offsetLeft + 14) + "px");
      bar.style.opacity = "1";
    }
    var active = null;
    links.forEach(function (a) {
      a.addEventListener("mouseover", function () { moveTo(a); });
      a.addEventListener("focus", function () { moveTo(a); });
    });
    wrap.addEventListener("mouseout", function (e) { if (!wrap.contains(e.relatedTarget)) moveTo(active); });

    if (!("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (l) { l.classList.remove("is-active"); });
          active = map[e.target.id]; active.classList.add("is-active"); moveTo(active);
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* ---------- Menú móvil ---------- */
  function initBurger() {
    var b = $("[data-burger]"), m = $("#mnav");
    if (!b || !m) return;
    function set(open) { b.setAttribute("aria-expanded", String(open)); m.hidden = !open; b.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú"); }
    b.addEventListener("click", function () { set(m.hidden); });
    $$("a", m).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  }

  /* ---------- Tabs de patologías + buscador ---------- */
  var selectTab;
  function initTabs() {
    var list = $("[data-tabs]"); if (!list) return;
    var tabs = $$("[role=tab]", list), pill = $(".tabs__pill", list);
    function place(t) { pill.style.width = t.offsetWidth + "px"; pill.style.setProperty("--x", t.offsetLeft + "px"); }
    selectTab = function (key, focus) {
      tabs.forEach(function (t) {
        var on = t.dataset.tab === key;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
        if (on) { place(t); if (focus) t.focus(); list.scrollTo({ left: t.offsetLeft - 20, behavior: "smooth" }); }
      });
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { clearSearch(); selectTab(t.dataset.tab); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        selectTab(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true);
      });
    });
    place(tabs[0]);
    window.addEventListener("resize", function () { var s = $("[aria-selected=true]", list); if (s) place(s); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var s = $("[aria-selected=true]", list); if (s) place(s); });
  }

  var clearSearch = function () {};
  function initSearch() {
    var input = $("[data-search]"), box = $(".cond"), empty = $("[data-empty]");
    if (!input || !box) return;
    var norm = function (s) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); };
    var items = $$(".chips li", box).map(function (li) { return { li: li, t: norm(li.textContent) }; });
    var panels = $$("[data-panel]", box);
    function run() {
      var q = norm(input.value.trim());
      if (!q) {
        box.classList.remove("is-searching");
        items.forEach(function (o) { o.li.classList.remove("is-hit", "is-miss"); });
        panels.forEach(function (p) { p.classList.remove("is-empty"); });
        empty.hidden = true; return;
      }
      box.classList.add("is-searching");
      var total = 0;
      items.forEach(function (o) { var hit = o.t.indexOf(q) > -1; o.li.classList.toggle("is-hit", hit); o.li.classList.toggle("is-miss", !hit); if (hit) total++; });
      panels.forEach(function (p) { p.classList.toggle("is-empty", !$(".chips li.is-hit", p)); });
      empty.hidden = total > 0;
    }
    input.addEventListener("input", run);
    clearSearch = function () { if (input.value) { input.value = ""; run(); } };
  }

  /* ---------- Chips del hero → abre el área clínica ---------- */
  function initFinder() {
    $$("[data-goto]").forEach(function (a) {
      a.addEventListener("click", function () { clearSearch(); if (selectTab) selectTab(a.dataset.goto); });
    });
  }

  /* ---------- Botones magnéticos (sutil, 0.2) ---------- */
  function initMagnetic() {
    if (!finePointer) return;
    $$("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left - r.width / 2) * 0.2) + "px");
        el.style.setProperty("--my", ((e.clientY - r.top - r.height / 2) * 0.3) + "px");
      });
      el.addEventListener("mouseout", function (e) {
        if (el.contains(e.relatedTarget)) return;
        el.style.setProperty("--mx", "0px"); el.style.setProperty("--my", "0px");
      });
    });
  }

  /* ---------- Tilt suave en tarjetas de servicio ---------- */
  function initTilt() {
    if (!finePointer) return;
    $$("[data-tilt]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * 7) + "deg");
        el.style.setProperty("--rx", (-((e.clientY - r.top) / r.height - 0.5) * 7) + "deg");
      });
      el.addEventListener("mouseout", function (e) {
        if (el.contains(e.relatedTarget)) return;
        el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- FAQ: solo una abierta a la vez ---------- */
  function initFaq() {
    var qs = $$(".qa");
    qs.forEach(function (d) {
      d.addEventListener("toggle", function () { if (d.open) qs.forEach(function (o) { if (o !== d) o.open = false; }); });
    });
  }

  /* ---------- Lightbox de galería ---------- */
  function initLightbox() {
    var lb = $("[data-lightbox]"); if (!lb || typeof lb.showModal !== "function") return;
    var img = $("img", lb);
    $$("[data-gallery] [data-full]").forEach(function (b) {
      b.addEventListener("click", function () {
        var src = b.querySelector("img");
        img.src = b.getAttribute("data-full"); img.alt = src ? src.alt : "";
        lb.showModal();
      });
    });
    $("[data-close]", lb).addEventListener("click", function () { lb.close(); });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
  }

  function initYear() { var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear(); }

  function boot() {
    safe(initReveal, "reveal");
    safe(initNav, "nav");
    safe(initBurger, "burger");
    safe(initTabs, "tabs");
    safe(initSearch, "search");
    safe(initFinder, "finder");
    safe(initMagnetic, "magnetic");
    safe(initTilt, "tilt");
    safe(initFaq, "faq");
    safe(initLightbox, "lightbox");
    safe(initYear, "year");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
