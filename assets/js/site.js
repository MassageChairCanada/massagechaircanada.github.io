/* =========================================================
   assets/site.js — ULTRA COMPLETE (MassageChairCanada) v2
   Fix:
   - iPhone/iOS menu toggle reliability (touchend + click guard)
   - Scrim close works on iOS too
   - Everything else unchanged
   ========================================================= */

(function () {
  "use strict";

  /* -----------------------------
     Helpers
  ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const safeFocus = (el) => {
    try { el && el.focus && el.focus({ preventScroll: true }); } catch (_) {}
  };

  const scrollLock = {
    _y: 0,
    lock() {
      this._y = window.scrollY || document.documentElement.scrollTop || 0;
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.position = "fixed";
      document.body.style.top = `-${this._y}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    },
    unlock() {
      const y = this._y || 0;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, y);
      this._y = 0;
      document.documentElement.style.scrollBehavior = "";
    },
  };

  const headerOffset = () => {
    const topbar = $(".topbar");
    const h = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 0;
    return Math.max(0, h + 10);
  };

  /* =========================================================
     1) Mobile Menu Drawer (accessible)
     HTML expected:
       #navToggle (button.nav-toggle)
       #mobile-nav (nav.mobile-nav)
       #navScrim (div.nav-scrim)
     ========================================================= */
  function initMobileMenu() {
    const btn = $("#navToggle") || $(".nav-toggle");
    const drawer = $("#mobile-nav") || $(".mobile-nav");
    const scrim = $("#navScrim") || $(".nav-scrim");

    if (!btn || !drawer || !scrim) return;

    if (!drawer.hasAttribute("tabindex")) drawer.setAttribute("tabindex", "-1");

    let lastFocus = null;

    const isOpen = () => drawer.getAttribute("data-open") === "true";

    const setOpen = (open) => {
      drawer.setAttribute("data-open", open ? "true" : "false");
      scrim.setAttribute("data-open", open ? "true" : "false");
      btn.setAttribute("aria-expanded", open ? "true" : "false");

      if (open) {
        lastFocus = document.activeElement;
        scrollLock.lock();
        safeFocus(drawer);
      } else {
        scrollLock.unlock();
        safeFocus(lastFocus || btn);
      }
    };

    const toggle = () => setOpen(!isOpen());

    // Close on nav click (any link)
    drawer.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) setOpen(false);
    });

    /* ---------- iOS reliable toggle + prevent double fire ---------- */
    let ignoreClick = false;

    const onToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    };

    const onClose = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };

    // iOS: touchend is often more reliable than click
    btn.addEventListener("touchend", (e) => {
      ignoreClick = true;
      onToggle(e);
      setTimeout(() => { ignoreClick = false; }, 450);
    }, { passive: false });

    btn.addEventListener("click", (e) => {
      if (ignoreClick) return;
      onToggle(e);
    }, { passive: false });

    // Scrim close (touch + click)
    scrim.addEventListener("touchend", (e) => {
      ignoreClick = true;
      onClose(e);
      setTimeout(() => { ignoreClick = false; }, 450);
    }, { passive: false });

    scrim.addEventListener("click", (e) => {
      if (ignoreClick) return;
      onClose(e);
    }, { passive: false });
    /* -------------------------------------------------------------- */

    // Escape closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) setOpen(false);
    });

    // Basic focus trap inside drawer when open
    document.addEventListener("keydown", (e) => {
      if (!isOpen() || e.key !== "Tab") return;

      const focusables = $$(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        drawer
      ).filter((el) => el.offsetParent !== null);

      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        safeFocus(last);
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        safeFocus(first);
      }
    });

    // If resized to desktop while open, close
    window.addEventListener("resize", () => {
      if (window.innerWidth > 760 && isOpen()) setOpen(false);
    });
  }

  /* =========================================================
     2) Smooth anchor scrolling with offset
     ========================================================= */
  function initAnchors() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();

      const y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset();

      window.scrollTo({
        top: Math.max(0, y),
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });

      try { history.pushState(null, "", `#${id}`); } catch (_) {}

      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      safeFocus(target);
    });
  }

  /* =========================================================
     3) Active nav link highlighting
     ========================================================= */
  function initActiveNav() {
    const navLinks = $$('nav a[href^="#"], .nav a[href^="#"], .mobile-nav a[href^="#"]');
    if (!navLinks.length || !("IntersectionObserver" in window)) return;

    const targets = navLinks
      .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
      .filter(Boolean);

    if (!targets.length) return;

    const mapIdToLinks = new Map();
    navLinks.forEach((a) => {
      const id = a.getAttribute("href").slice(1);
      if (!mapIdToLinks.has(id)) mapIdToLinks.set(id, []);
      mapIdToLinks.get(id).push(a);
    });

    const clear = () => navLinks.forEach((a) => a.classList.remove("is-active"));

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((x) => x.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];

        if (!visible) return;

        const id = visible.target.id;
        clear();
        (mapIdToLinks.get(id) || []).forEach((a) => a.classList.add("is-active"));
      },
      {
        root: null,
        rootMargin: `-${headerOffset()}px 0px -65% 0px`,
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    targets.forEach((t) => io.observe(t));
  }

  /* =========================================================
     4) Auto wrap tables inside .table-wrap (if missing)
     ========================================================= */
  function initTableWrap() {
    $$("table").forEach((table) => {
      const parent = table.parentElement;
      if (!parent) return;
      if (parent.classList && parent.classList.contains("table-wrap")) return;

      const skip = table.closest("pre, code");
      if (skip) return;

      const wrap = document.createElement("div");
      wrap.className = "table-wrap";
      parent.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  /* =========================================================
     5) Copy-link buttons for headings (optional)
     ========================================================= */
  function initCopyLinks() {
    if (!navigator.clipboard) return;

    const heads = $$("h2[id], h3[id]");
    if (!heads.length) return;

    heads.forEach((h) => {
      if (h.dataset.copylink === "done") return;
      h.dataset.copylink = "done";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copylink-btn";
      btn.setAttribute("aria-label", "Copy section link");
      btn.textContent = "🔗";
      btn.style.marginLeft = "10px";

      btn.addEventListener("click", async () => {
        const url = `${location.origin}${location.pathname}#${h.id}`;
        try {
          await navigator.clipboard.writeText(url);
          btn.textContent = "✅";
          setTimeout(() => (btn.textContent = "🔗"), 900);
        } catch (_) {
          btn.textContent = "❌";
          setTimeout(() => (btn.textContent = "🔗"), 900);
        }
      });

      h.appendChild(btn);
    });
  }

  /* =========================================================
     6) Lazy-load YouTube iframes (optional)
     ========================================================= */
  function initLazyIframes() {
    const iframes = $$("iframe[data-src]");
    if (!iframes.length) return;

    const load = (el) => {
      if (el.dataset.loaded === "true") return;
      el.src = el.dataset.src;
      el.dataset.loaded = "true";
    };

    if (!("IntersectionObserver" in window)) {
      iframes.forEach(load);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            load(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { root: null, rootMargin: "200px 0px", threshold: 0.01 }
    );

    iframes.forEach((f) => io.observe(f));
  }

  /* =========================================================
     7) External links safety polish
     ========================================================= */
  function initExternalLinks() {
    $$('a[target="_blank"]').forEach((a) => {
      const rel = (a.getAttribute("rel") || "").toLowerCase();
      const need = ["noopener", "noreferrer"];
      const relSet = new Set(rel.split(/\s+/).filter(Boolean));
      need.forEach((x) => relSet.add(x));
      a.setAttribute("rel", Array.from(relSet).join(" "));
    });
  }

  /* =========================================================
     8) Amazon CTA micro-trust (optional)
     ========================================================= */
  function initAmazonMetaChip() {
    $$(".btn.btn--amazon").forEach((btn) => {
      const hasChip = btn.querySelector(".btn-meta");
      if (hasChip) return;

      const chip = document.createElement("span");
      chip.className = "btn-meta";
      chip.textContent = "Amazon.ca";
      btn.appendChild(chip);
    });
  }

  /* =========================================================
     Boot
     ========================================================= */
  function boot() {
    initMobileMenu();
    initAnchors();
    initActiveNav();
    initTableWrap();
    initCopyLinks();
    initLazyIframes();
    initExternalLinks();
    initAmazonMetaChip();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
