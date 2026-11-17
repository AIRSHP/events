// Rite of Passage (2026-12-05) landing page.
// When the 10 spots are gone: set EVENT_FULL to true. That hides every
// "Confirm your spot" button and shows the MailerLite signup form instead.
// Preview the full state without changing this file by adding ?full to the URL.
var EVENT_FULL = false;

(function () {
  var root = document.documentElement;
  root.classList.add("js");

  var isFull = EVENT_FULL || /[?&]full\b/.test(location.search);
  if (isFull) root.classList.add("is-full");

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

  if (!isFull) return;

  // Signup form (full state only). reCAPTCHA loads only when the form is shown.
  var form = document.getElementById("signup");
  var status = form.querySelector(".signup-status");
  var email = form.querySelector("input[type=email]");
  var button = form.querySelector("button[type=submit]");
  var captchaEl = document.getElementById("signup-captcha");
  var widgetId = null;

  window.onSignupCaptchaLoad = function () {
    widgetId = window.grecaptcha.render(captchaEl, { sitekey: captchaEl.getAttribute("data-sitekey"), theme: "dark" });
  };
  var s = document.createElement("script");
  s.src = "https://www.google.com/recaptcha/api.js?onload=onSignupCaptchaLoad&render=explicit";
  s.async = true; s.defer = true;
  document.head.appendChild(s);

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
      say("Tick the “I'm not a robot” box, then press Tell me.", "error");
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
          form.querySelector(".signup-row").hidden = true;
          captchaEl.hidden = true;
          say("Thanks. We'll email you about the next one.", "ok");
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
})();
