// Shared script for event pages on events.prismaticrecovery.com.
// Each page sets its options on <html>:
//   data-event="<slug>"            the hub's slug for this event
//   data-full="true"               force waitlist mode (manual override)
//   data-status-url="<url>"        the hub's status endpoint; when it reports
//                                  no open spots, the page switches to waitlist
//                                  mode by itself
// Preview waitlist mode on any page by adding ?full to the URL.
(function () {
  var root = document.documentElement;
  root.classList.add("js");

  var forced = root.getAttribute("data-full") === "true" || /[?&]full\b/.test(location.search);
  if (forced) root.classList.add("is-full");
  var statusUrl = root.getAttribute("data-status-url");
  var slug = root.getAttribute("data-event");
  if (!forced && statusUrl && slug && window.fetch) {
    fetch(statusUrl + (statusUrl.indexOf("?") < 0 ? "?" : "&") + "slug=" + encodeURIComponent(slug))
      .then(function (r) { return r.json(); })
      .then(function (st) { if (st && st.full === true) { root.classList.add("is-full"); initWaitlist(); } })
      .catch(function () { /* stay in the open state if the hub is unreachable */ });
  }

  // Long bios: "More" / "Less" toggle
  Array.prototype.forEach.call(document.querySelectorAll(".bio-toggle"), function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.parentNode.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Less" : "More";
    });
  });

  // Mobile menu
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  function closeMenu() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") closeMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { closeMenu(); toggle.focus(); }
  });

  // The five parts arrive in order as they scroll into view.
  var rows = document.querySelectorAll("[data-reveal-group] > li");
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (en) { return en.isIntersecting; });
      batch.forEach(function (en, i) {
        en.target.style.transitionDelay = (i * 90) + "ms";
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.2 });
    rows.forEach(function (r) { io.observe(r); });
  } else {
    rows.forEach(function (r) { r.classList.add("is-in"); });
  }

  // Modals: a plain overlay, not <dialog>, so reCAPTCHA's challenge can sit above it.
  var outside = [document.querySelector(".skip"), document.querySelector(".site-header"), document.getElementById("main"), document.querySelector(".site-footer")];
  var openModalEl = null, lastTrigger = null;
  function openModal(modal, trigger, focusEl) {
    if (openModalEl) closeModal();
    openModalEl = modal; lastTrigger = trigger || null;
    modal.hidden = false;
    modal.classList.add("is-open");
    root.classList.add("has-modal");
    outside.forEach(function (el) { if (el) el.inert = true; });
    (focusEl || modal.querySelector("[data-modal-close]")).focus();
  }
  function closeModal() {
    if (!openModalEl) return;
    openModalEl.hidden = true;
    openModalEl.classList.remove("is-open");
    root.classList.remove("has-modal");
    outside.forEach(function (el) { if (el) el.inert = false; });
    openModalEl = null;
    if (lastTrigger) lastTrigger.focus();
  }
  document.querySelectorAll(".modal").forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target === m || e.target.closest("[data-modal-close]")) closeModal(); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openModalEl) closeModal();
  });

  // Pricing step: "Confirm your spot" links go to Stripe without JS; with JS they
  // open the pricing modal first, and its button continues to the same checkout.
  var checkout = document.getElementById("checkout");
  if (checkout) {
    var go = checkout.querySelector("[data-checkout-go]");
    document.querySelectorAll("[data-checkout]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        go.href = a.href;
        openModal(checkout, a, go);
      });
    });
  }

  if (root.classList.contains("is-full")) initWaitlist();

  // Waitlist modal (waitlist mode only). reCAPTCHA loads the first time it opens.
  var waitlistReady = false;
  function initWaitlist() {
    if (waitlistReady) return;
    waitlistReady = true;
    var modal = document.getElementById("waitlist");
    var form = document.getElementById("signup");
    var status = form.querySelector(".signup-status");
    var email = form.querySelector("input[type=email]");
    var button = form.querySelector("button[type=submit]");
    var captchaEl = document.getElementById("signup-captcha");
    var widgetId = null;
    var captchaRequested = false;

    function renderCaptcha() {
      if (widgetId !== null || !window.grecaptcha || !window.grecaptcha.render) return;
      widgetId = window.grecaptcha.render(captchaEl, { sitekey: captchaEl.getAttribute("data-sitekey"), theme: "dark" });
    }
    window.onSignupCaptchaLoad = renderCaptcha;
    function loadCaptcha() {
      if (captchaRequested) { renderCaptcha(); return; }
      captchaRequested = true;
      var s = document.createElement("script");
      s.src = "https://www.google.com/recaptcha/api.js?onload=onSignupCaptchaLoad&render=explicit";
      s.async = true; s.defer = true;
      document.head.appendChild(s);
    }

    document.querySelectorAll("[data-waitlist]").forEach(function (b) {
      b.addEventListener("click", function () {
        openModal(modal, b, form.classList.contains("is-done") ? null : email);
        loadCaptcha();
      });
    });

    function say(msg, kind) {
      status.textContent = msg;
      status.className = "signup-status" + (kind ? " is-" + kind : "");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!email.value || !email.checkValidity()) {
        say("Enter an email address we can reach you at.", "error");
        email.focus();
        return;
      }
      var token = window.grecaptcha && widgetId !== null ? window.grecaptcha.getResponse(widgetId) : "";
      if (!token) {
        say("Tick the “I'm not a robot” box, then press Join.", "error");
        return;
      }
      var data = new FormData(form);
      data.append("g-recaptcha-response", token);
      button.disabled = true;
      say("Sending…");
      fetch(form.action, { method: "POST", body: data })
        .then(function (r) { return r.json(); })
        .then(function (json) {
          if (json && json.success) {
            form.classList.add("is-done");
            form.querySelector(".signup-row").hidden = true;
            captchaEl.hidden = true;
            say("You're on the list. We'll email you if a spot opens up.", "ok");
          } else {
            throw new Error("not accepted");
          }
        })
        .catch(function () {
          button.disabled = false;
          if (window.grecaptcha && widgetId !== null) window.grecaptcha.reset(widgetId);
          say("That didn't go through. Check the address and try again, or email info@prismaticrecovery.com.", "error");
        });
    });
  }
})();
