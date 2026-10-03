/* Mini Excel landing page controller.
 *
 * Drives the "Try Free" gate: it decides whether the gated section is locked,
 * and performs registration against the real Flask API in auth_app/app.py
 * (/api/signup -> /api/otp/verify -> /api/session).
 *
 * CSP note: production sends `script-src 'self'` with no 'unsafe-inline', so
 * there are no inline handlers anywhere in landing.html. Everything is wired
 * here with addEventListener, and every visual state is a class toggle.
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var state = { email: "", name: "", gateEl: $("gate") };

  /* A request that never settles leaves the user staring at a dead "Creatingâ€¦"
     button with no explanation. Mirrors the timeout handling in auth.js. */
  var REQUEST_TIMEOUT_MS = 15000;

  function api(path, options) {
    var opts = options || {};
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS) : null;

    var init = {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: opts.body ? JSON.stringify(opts.body) : undefined
    };
    if (controller) { init.signal = controller.signal; }

    return fetch(path, init)
      .then(function (response) {
        return response.json().catch(function () {
          return {
            ok: false,
            httpStatus: response.status,
            error: "Unreadable server response (HTTP " + response.status + ")."
          };
        }).then(function (payload) {
          payload.httpStatus = response.status;
          return payload;
        });
      })
      .catch(function (error) {
        var timedOut = error && error.name === "AbortError";
        return {
          ok: false,
          httpStatus: 0,
          networkError: true,
          error: timedOut
            ? "The server did not respond within " + (REQUEST_TIMEOUT_MS / 1000) +
              " seconds. Is the auth backend running on port 5001?"
            : "Could not reach the server. Check that 'python auth_app/app.py' is running."
        };
      })
      .finally(function () { if (timer) { clearTimeout(timer); } });
  }

  function alertBox(message, kind) {
    var box = $("modalAlert");
    box.textContent = message;
    box.className = "alert" + (kind ? " is-" + kind : "");
    box.hidden = !message;
  }

  function busy(button, label, isBusy) {
    if (isBusy) {
      button.dataset.label = button.textContent;
      button.textContent = label;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = false;
    }
  }

  /* ---------- The gate ---------- */

  function unlock(name) {
    var gate = state.gateEl;
    if (!gate) { return; }
    gate.classList.remove("is-locked");
    gate.classList.add("is-unlocked");
    /* Remove the withheld content from the accessibility tree and the tab
       order only while it is locked; leaving aria-hidden on after unlock would
       hide real content from screen readers. */
    var body = $("gateBody");
    if (body) { body.removeAttribute("aria-hidden"); }
    if (name) {
      var text = $("unlockedText");
      if (text) { text.textContent = "You're in as " + name + " â€” welcome aboard."; }
    }
  }

  function lock() {
    var gate = state.gateEl;
    if (!gate) { return; }
    gate.classList.remove("is-unlocked");
    gate.classList.add("is-locked");
    var body = $("gateBody");
    if (body) { body.setAttribute("aria-hidden", "true"); }
  }

  /* ---------- Modal ---------- */

  function showStep(name) {
    var details = $("stepDetails");
    var otp = $("stepOtp");
    if (name === "otp") {
      details.classList.remove("is-active");
      otp.classList.add("is-active");
    } else {
      otp.classList.remove("is-active");
      details.classList.add("is-active");
    }
  }

  function openModal() {
    var modal = $("signupModal");
    if (!modal) { return; }
    modal.hidden = false;
    alertBox("");
    var first = $("suName");
    if (first) { first.focus(); }
  }

  function closeModal() {
    var modal = $("signupModal");
    if (modal) { modal.hidden = true; }
  }

  function trapTab(event) {
    var modal = $("signupModal");
    if (!modal || modal.hidden) { return; }
    var focusable = modal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled])'
    );
    if (!focusable.length) { return; }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

/* ---------- Password strength (mirrors auth_app/security.py) ---------- */

  function passwordStrength(value) {
    var hasLetter = /[A-Za-z]/.test(value);
    var hasDigit = /[0-9]/.test(value);
    var score = 0;
    if (value.length >= 8) { score += 34; }
    if (hasLetter) { score += 33; }
    if (hasDigit) { score += 33; }
    if (value.length >= 14 && /[^A-Za-z0-9]/.test(value)) { score = 100; }
    return Math.min(score, 100);
  }

  function onPasswordInput(event) {
    var value = event.target.value;
    var fill = $("pwFill");
    var meter = $("pwMeter");
    var hint = $("pwHint");
    var score = passwordStrength(value);
    fill.style.width = score + "%";
    meter.classList.toggle("is-ok", score === 100);
    if (!value) {
      hint.textContent = "Use 8+ characters with at least one letter and one number.";
      return;
    }
    if (score === 100) {
      hint.textContent = "Strong password.";
    } else {
      var missing = [];
      if (value.length < 8) { missing.push("8 or more characters"); }
      if (!/[A-Za-z]/.test(value)) { missing.push("a letter"); }
      if (!/[0-9]/.test(value)) { missing.push("a number"); }
      hint.textContent = "Still needed: " + missing.join(", ") + ".";
    }
  }

  /* ---------- Sign-up ---------- */

  function onSignupSubmit(event) {
    event.preventDefault();
    var button = $("suSubmit");
    var email = $("suEmail").value.trim();
    var name = $("suName").value.trim();
    var password = $("suPassword").value;

    alertBox("");

    /* Mirror the server's validation so an obvious typo is caught without a
       round-trip. auth_app/security.py is still the authority. */
    if (!name) { alertBox("Please enter your name.", "error"); return; }
    if (!email || email.indexOf("@") < 1 || email.split("@").pop().indexOf(".") < 1) {
      alertBox("Please enter a valid email address.", "error");
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      alertBox("Use at least 8 characters with a letter and a number.", "error");
      return;
    }

    busy(button, "Creating your accountâ€¦", true);
    state.email = email;
    state.name = name;

    api("/api/signup", {
      method: "POST",
      body: { name: name, email: email, password: password, send_otp: true }
    })
      .then(function (payload) {
        busy(button, "", false);
        if (!payload.ok) {
          alertBox(payload.error || "Could not create the account.", "error");
          return;
        }
        /* 409 unverified_exists means a code was already re-issued, so the OTP
           step is still the right place to go. */
        var existing = payload.httpStatus === 409 && payload.code === "unverified_exists";
        showStep("otp");
        var hint = $("otpHint");
        if (existing) {
          hint.textContent = "This email already has an account. We sent a fresh code â€” enter it to continue.";
        } else if (payload.otp_sent === false) {
          hint.textContent = "We could not email a code automatically. Request a new one below, or check the server console.";
        }
        var code = $("otpCode");
        if (code) { code.focus(); }
      });
  }

  function onOtpSubmit(event) {
    event.preventDefault();
    var button = $("otpSubmit");
    var code = $("otpCode").value.trim();

    alertBox("");
    if (!code) { alertBox("Please enter the 6-digit code.", "error"); return; }

    busy(button, "Checkingâ€¦", true);
    api("/api/otp/verify", {
      method: "POST",
      body: { email: state.email, code: code, purpose: "signup" }
    })
      .then(function (payload) {
        busy(button, "", false);
        if (!payload.ok) {
          alertBox(payload.error || "That code was not accepted.", "error");
          return;
        }
        /* /api/otp/verify issues the session cookie server-side, so the gate is
           backed by a real session rather than a client-side flag. */
        var user = payload.user || {};
        closeModal();
        unlock(user.name || state.name);
      });
  }

  function onResendOtp() {
    alertBox("");
    api("/api/otp/send", {
      method: "POST",
      body: { email: state.email, purpose: "signup" }
    }).then(function (payload) {
      if (!payload.ok) {
        alertBox(payload.error || "Could not send a new code.", "error");
      } else {
        alertBox("A fresh code is on its way.", "info");
      }
    });
  }

/* ---------- Boot ---------- */

  function init() {
    var triggers = document.querySelectorAll("[data-open-signup]");
    Array.prototype.forEach.call(triggers, function (el) {
      el.addEventListener("click", openModal);
    });

    var login = $("openLogin");
    if (login) {
      login.addEventListener("click", function () {
        window.location.href = "/";
      });
    }

    var modal = $("signupModal");
    if (modal) {
      /* Clicking the backdrop closes the dialog, but only when the click
         started on the backdrop itself â€” otherwise clicking inside the card
         would dismiss it while typing. */
      modal.addEventListener("mousedown", function (event) {
        if (event.target === modal) { closeModal(); }
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { closeModal(); }
      if (event.key === "Tab") { trapTab(event); }
    });

    var signupForm = $("signupForm");
    if (signupForm) { signupForm.addEventListener("submit", onSignupSubmit); }

    var otpForm = $("otpForm");
    if (otpForm) { otpForm.addEventListener("submit", onOtpSubmit); }

    var password = $("suPassword");
    if (password) { password.addEventListener("input", onPasswordInput); }

    var resend = $("resendOtp");
    if (resend) { resend.addEventListener("click", onResendOtp); }

    var back = $("backToDetails");
    if (back) {
      back.addEventListener("click", function () {
        alertBox("");
        showStep("details");
      });
    }

    /* Returning visitors arrive with a valid mx-session cookie. Ask the server
       rather than trusting anything client-side, then open the gate. */
    api("/api/session")
      .then(function (payload) {
        if (payload && payload.ok && payload.authenticated) {
          unlock((payload.user && payload.user.name) || "");
        } else {
          lock();
        }
      })
      .catch(function () { lock(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
