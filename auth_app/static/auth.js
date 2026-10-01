/* Mini Excel auth front-end controller.
 * Talks to the Flask backend in auth_app/app.py and keeps the UI in sync.
 */
(function () {
  "use strict";

  var state = {
    mode: "login",
    otpPurpose: "signup",
    otpEmail: "",
    pendingPassword: "",
    config: null,
    user: null
  };

  var $ = function (id) { return document.getElementById(id); };

  /* A fetch that never settles (server wedged, proxy stalling, half-open socket)
     leaves the promise pending forever. Because busy() has already disabled the
     button and replaced its label, the user sees a permanently dead "Signing in…"
     button and no message at all. Aborting after REQUEST_TIMEOUT_MS turns that
     silence into a prompt, actionable error. */
  var REQUEST_TIMEOUT_MS = 15000;

  function api(path, options) {
    var opts = options || {};
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS) : null;

    var init = {
      method: opts.method || "GET",
      headers: Object.assign(
        { "Content-Type": "application/json" },
        opts.headers || {}
      ),
      credentials: "same-origin",
      body: opts.body ? JSON.stringify(opts.body) : undefined
    };
    if (controller) { init.signal = controller.signal; }

    return fetch(path, init)
      .then(function (response) {
        return response.json()
          /* The legacy dev server (app.py, port 5000) has no /api/login route and
             answers an unknown /api/ path with Flask's HTML 404 page. Calling
             .json() on that throws, which used to surface as a bare TypeError. */
          .catch(function () {
            return {
              ok: false,
              httpStatus: response.status,
              error: response.headers.get("Content-Type") &&
                     response.headers.get("Content-Type").indexOf("json") < 0
                ? "The server replied with a non-JSON error page (" + response.status +
                  "). You are probably talking to the wrong server - the auth API lives " +
                  "on port 5001, not 5000."
                : "Unreadable server response."
            };
          })
          .then(function (payload) {
            payload.httpStatus = response.status;
            return payload;
          });
      })
      .catch(function (error) {
        /* Transport-level failure: nothing is listening, or the request timed
           out. Distinguish the two so the message says something useful. */
        var timedOut = error && (error.name === "AbortError");
        return {
          ok: false,
          httpStatus: 0,
          networkError: true,
          error: timedOut
            ? "The server did not respond within " + (REQUEST_TIMEOUT_MS / 1000) +
              " seconds. Is the auth backend running on port 5001?"
            : "Could not reach the server. Check that " +
              "'python auth_app/app.py' is running."
        };
      })
      .finally(function () { if (timer) { clearTimeout(timer); } });
  }

  function alertBox(message, kind) {
    var box = $("alertBox");
    if (!message) {
      box.hidden = true;
      box.textContent = "";
      return;
    }
    box.hidden = false;
    box.textContent = message;
    box.className = "alert" + (kind ? " is-" + kind : "");
  }

  function busy(button, isBusy, label) {
    if (!button) { return; }
    if (isBusy) {
      button.dataset.label = button.textContent;
      button.disabled = true;
      button.textContent = label || "Working…";
    } else {
      button.disabled = false;
      if (button.dataset.label) { button.textContent = button.dataset.label; }
    }
  }

  function showPane(name, meta) {
    state.mode = name;
    ["paneLogin", "paneSignup", "paneOtp", "paneReset"].forEach(function (id) {
      var pane = $(id);
      if (pane) { pane.classList.toggle("is-active", id === "pane" + name.charAt(0).toUpperCase() + name.slice(1)); }
    });

    var isAuthTab = name === "login" || name === "signup";
    $("tabLogin").classList.toggle("is-active", name === "login");
    $("tabSignup").classList.toggle("is-active", name === "signup");
    $("tabLogin").setAttribute("aria-selected", String(name === "login"));
    $("tabSignup").setAttribute("aria-selected", String(name === "signup"));
    document.querySelector(".tabs").hidden = !isAuthTab;

    var titles = {
      login: ["Sign in", "Welcome back. Sign in to reach your workbooks."],
      signup: ["Create account", "Start with email verification, or use a social account."],
      otp: ["Verify your email", "Enter the code we just sent to finish signing in."],
      reset: ["Reset password", "We will email a code, then you pick a new password."]
    };
    var copy = titles[name] || titles.login;
    $("authTitle").textContent = copy[0];
    $("authSubtitle").textContent = copy[1];
    if (meta && meta.email) {
      $("otpEmailLabel").textContent = meta.email;
      state.otpEmail = meta.email;
    }
    if (meta && meta.purpose) { state.otpPurpose = meta.purpose; }
    if (meta && meta.password) { state.pendingPassword = meta.password; }
    alertBox("");
  }

  function renderSession(payload) {
    var account = payload && payload.user ? payload.user : null;
    state.user = account;

    $("authCard").hidden = Boolean(account);
    $("dashboard").hidden = !account;
    if (!account) { return; }

    $("dashEmail").textContent = account.email + (account.email_verified ? " · verified" : " · unverified");
    var radios = document.querySelectorAll("input[name=storage_pref]");
    Array.prototype.forEach.call(radios, function (radio) {
      radio.checked = radio.value === account.storage_pref;
    });

    var badge = $("licenseBadge");
    if (payload.license) {
      badge.hidden = false;
      badge.className = "badge " + (payload.license.valid ? "is-ok" : "is-error");
      badge.textContent = payload.license.valid
        ? "License active · " + payload.license.tier + " · " +
          (payload.license.days_remaining != null ? payload.license.days_remaining + " days left" : "expires " + payload.license.expires_at)
        : "License problem: " + payload.license.message;
    } else {
      badge.hidden = true;
    }
  }

  function loadSession() {
    return api("/api/session").then(function (payload) {
      renderSession(payload);
      return payload;
    });
  }

  function loadConfig() {
    return api("/api/config").then(function (payload) {
      state.config = payload;
      var note = $("providerNote");
      var disabled = (payload.providers || []).filter(function (p) { return !p.enabled; });
      Array.prototype.forEach.call(document.querySelectorAll(".oauth-btn"), function (button) {
        var provider = button.dataset.provider;
        var entry = (payload.providers || []).filter(function (p) { return p.id === provider; })[0];
        if (!entry || !entry.enabled) {
          button.setAttribute("aria-disabled", "true");
          button.setAttribute("href", "#");
        } else {
          button.removeAttribute("aria-disabled");
          button.setAttribute("href", entry.url);
        }
      });
      if (disabled.length) {
        note.hidden = false;
        note.textContent = disabled.map(function (p) { return p.hint; }).join(" ");
      }
      return payload;
    });
  }
  /*__NEXT__*/

  function handleSignup(event) {
    event.preventDefault();
    var button = $("signupSubmit");
    var email = $("signupEmail").value.trim();
    var name = $("signupName").value.trim();
    var password = $("signupPassword").value;

    if (!name) { alertBox("Please enter your name.", "error"); return; }
    if (!email || email.indexOf("@") < 1) { alertBox("Please enter a valid email address.", "error"); return; }

    busy(button, true, "Creating account…");
    api("/api/signup", { method: "POST", body: { email: email, name: name, password: password } })
      .then(function (payload) {
        busy(button, false);
        if (!payload.ok) {
          alertBox(payload.error, "error");
          if (payload.code === "unverified_exists") {
            showPane("otp", { email: email, purpose: "signup" });
            alertBox("We sent a fresh verification code. Enter it below.", "ok");
          }
          return;
        }
        $("signupForm").reset();
        showPane("otp", { email: email, purpose: "signup", password: password });
        alertBox("Account created. Check your inbox for the 6-digit code.", "ok");
      })
      .catch(function (error) { busy(button, false); alertBox(String(error), "error"); });
  }

  function handleLogin(event) {
    event.preventDefault();
    var button = $("loginSubmit");
    var email = $("loginEmail").value.trim();
    var password = $("loginPassword").value;

    busy(button, true, "Signing in…");
    api("/api/login", { method: "POST", body: { email: email, password: password } })
      .then(function (payload) {
        busy(button, false);
        if (!payload.ok) {
          alertBox(payload.error, "error");
          if (payload.code === "oauth_only") {
            $("providerNote").hidden = false;
            $("providerNote").textContent = "Use one of the social buttons below for this account.";
          }
          /* An unverified account cannot sign in yet, but the remedy is a code
             rather than a new password, so route the user straight to the OTP
             pane. Without this they read the message and have nowhere to go. */
          if (payload.code === "email_unverified" && payload.email) {
            $("loginForm").reset();
            showPane("otp", { email: payload.email, purpose: "signup" });
            alertBox(payload.error + " We sent a fresh code - enter it below.", "error");
          }
          return;
        }
        alertBox("");
        $("loginForm").reset();
        return loadSession();
      })
      .catch(function (error) { busy(button, false); alertBox(String(error), "error"); });
  }

  function handleOtpVerify(event) {
    event.preventDefault();
    var button = $("otpSubmit");
    var code = $("otpCode").value.trim();

    if (code.length !== 6) {
      alertBox("Enter the 6-digit code from your email.", "error");
      return;
    }

    busy(button, true, "Verifying…");
    api("/api/otp/verify", {
      method: "POST",
      body: { email: state.otpEmail, code: code, purpose: state.otpPurpose }
    })
      .then(function (payload) {
        busy(button, false);
        if (!payload.ok) { alertBox(payload.error, "error"); return; }

        if (state.otpPurpose === "reset") {
          showPane("reset");
          $("resetEmail").value = state.otpEmail;
          $("resetCode").value = code;
          alertBox("Code accepted. Choose a new password.", "ok");
          return;
        }

        $("otpForm").reset();
        alertBox("");
        return loadSession();
      })
      .catch(function (error) { busy(button, false); alertBox(String(error), "error"); });
  }

  function handleOtpResend() {
    var button = $("otpResend");
    busy(button, true, "Sending…");
    api("/api/otp/send", { method: "POST", body: { email: state.otpEmail, purpose: state.otpPurpose } })
      .then(function (payload) {
        busy(button, false);
        alertBox(payload.ok ? (payload.detail || "A new code is on its way.") : payload.error, payload.ok ? "ok" : "error");
      })
      .catch(function (error) { busy(button, false); alertBox(String(error), "error"); });
  }

  function handleResetSend() {
    var email = $("resetEmail").value.trim();
    if (!email) { alertBox("Enter your account email first.", "error"); return; }
    state.otpEmail = email;
    state.otpPurpose = "reset";
    busy($("resetSend"), true, "Sending…");
    api("/api/otp/send", { method: "POST", body: { email: email, purpose: "reset" } })
      .then(function (payload) {
        busy($("resetSend"), false);
        alertBox(payload.ok ? (payload.detail || "Reset code sent.") : payload.error, payload.ok ? "ok" : "error");
      })
      .catch(function (error) { busy($("resetSend"), false); alertBox(String(error), "error"); });
  }

  function handleResetApply() {
    var email = $("resetEmail").value.trim();
    var code = $("resetCode").value.trim();
    var password = $("resetPassword").value;
    var button = $("resetApply");

    if (!email || !code || !password) {
      alertBox("Email, reset code and new password are all required.", "error");
      return;
    }

    busy(button, true, "Saving…");
    api("/api/otp/verify", { method: "POST", body: { email: email, code: code, purpose: "reset" } })
      .then(function (verified) {
        if (!verified.ok) { throw new Error(verified.error); }
        return api("/api/password/reset", { method: "POST", body: { email: email, password: password } });
      })
      .then(function (payload) {
        busy(button, false);
        if (!payload.ok) { alertBox(payload.error, "error"); return; }
        $("resetForm").reset();
        showPane("login");
        alertBox("Password updated. Sign in with your new password.", "ok");
      })
      .catch(function (error) { busy(button, false); alertBox(String(error), "error"); });
  }
  function handleStorageSave() {
    var selected = document.querySelector("input[name=storage_pref]:checked");
    if (!selected) { alertBox("Pick a storage location first.", "error"); return; }
    busy($("saveStorage"), true, "Saving…");
    api("/api/storage-preference", { method: "POST", body: { storage_pref: selected.value } })
      .then(function (payload) {
        busy($("saveStorage"), false);
        alertBox(payload.ok ? payload.message : payload.error, payload.ok ? "ok" : "error");
      })
      .catch(function (error) { busy($("saveStorage"), false); alertBox(String(error), "error"); });
  }

  function handleLicenseActivate() {
    var key = $("licenseInput").value.trim();
    if (!key) { alertBox("Paste a license key first.", "error"); return; }
    busy($("activateLicense"), true, "Checking…");
    api("/api/license/activate", { method: "POST", body: { license_key: key } })
      .then(function (payload) {
        busy($("activateLicense"), false);
        var badge = $("licenseBadge");
        badge.hidden = false;
        badge.className = "badge " + (payload.ok ? "is-ok" : "is-error");
        badge.textContent = payload.ok ? payload.message : payload.error;
        if (payload.ok) { loadSession(); }
      })
      .catch(function (error) { busy($("activateLicense"), false); alertBox(String(error), "error"); });
  }

  function handleTrial() {
    busy($("trialLicense"), true, "Issuing…");
    api("/api/license/trial", { method: "POST", body: { days: 14 } })
      .then(function (payload) {
        busy($("trialLicense"), false);
        if (!payload.ok) { alertBox(payload.error, "error"); return; }
        $("licenseInput").value = payload.license_key;
        alertBox("Trial license generated and pre-filled. Click Activate to attach it.", "ok");
      })
      .catch(function (error) { busy($("trialLicense"), false); alertBox(String(error), "error"); });
  }

  function handleLogout() {
    busy($("logoutBtn"), true, "Signing out…");
    api("/api/logout", { method: "POST" })
      .then(function () {
        busy($("logoutBtn"), false);
        renderSession(null);
        showPane("login");
      })
      .catch(function (error) { busy($("logoutBtn"), false); alertBox(String(error), "error"); });
  }

  function updatePasswordMeter() {
    var value = $("signupPassword").value;
    var score = 0;
    if (value.length >= 8) { score += 1; }
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) { score += 1; }
    if (/[0-9]/.test(value)) { score += 1; }
    if (/[^A-Za-z0-9]/.test(value)) { score += 1; }

    var meter = $("pwMeter");
    var widths = ["0%", "30%", "60%", "80%", "100%"];
    var colors = ["#d0d7e3", "#e5484d", "#f5a524", "#38a169", "#0f7b52"];
    meter.style.width = widths[score];
    meter.style.background = colors[score];
    $("pwHint").textContent = score >= 3
      ? "Strong password — good to go."
      : "Use 8+ characters with at least one letter and one number.";
  }

  function toggleReveal(event) {
    var button = event.currentTarget;
    var input = $(button.dataset.target);
    var showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.textContent = showing ? "Show" : "Hide";
  }

  function wire() {
    $("tabLogin").addEventListener("click", function () { showPane("login"); });
    $("tabSignup").addEventListener("click", function () { showPane("signup"); });
    $("forgotLink").addEventListener("click", function () { showPane("reset"); });
    $("otpBack").addEventListener("click", function () { showPane("login"); });
    $("resetBack").addEventListener("click", function () { showPane("login"); });

    $("loginForm").addEventListener("submit", handleLogin);
    $("signupForm").addEventListener("submit", handleSignup);
    $("otpForm").addEventListener("submit", handleOtpVerify);
    $("otpResend").addEventListener("click", handleOtpResend);
    $("resetSend").addEventListener("click", handleResetSend);
    $("resetApply").addEventListener("click", handleResetApply);
    $("saveStorage").addEventListener("click", handleStorageSave);
    $("activateLicense").addEventListener("click", handleLicenseActivate);
    $("trialLicense").addEventListener("click", handleTrial);
    $("logoutBtn").addEventListener("click", handleLogout);
    $("refreshSession").addEventListener("click", function () { loadSession(); });

    $("signupPassword").addEventListener("input", updatePasswordMeter);

    Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (button) {
      button.addEventListener("click", toggleReveal);
    });

    Array.prototype.forEach.call(document.querySelectorAll(".oauth-btn"), function (button) {
      button.addEventListener("click", function (event) {
        if (button.getAttribute("aria-disabled") === "true") {
          event.preventDefault();
          alertBox("That provider is not configured on this server yet.", "error");
        }
      });
    });

    var params = new URLSearchParams(window.location.search);
    if (params.get("signed_in")) {
      alertBox(
        (params.get("created") ? "Account created with " : "Signed in with ") +
        (params.get("provider") || "your provider") + ".",
        "ok"
      );
      window.history.replaceState({}, "", "/");
    }

    /* Providers without a dedicated logo get their initial as a tile. Icons
       that already contain a logo (e.g. the inlined Google "G") are left
       alone, since assigning textContent here would wipe out the SVG. */
    Array.prototype.forEach.call(document.querySelectorAll(".oauth-icon"), function (node) {
      if (!node.firstElementChild) {
        node.textContent = node.dataset.icon.charAt(0).toUpperCase();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    wire();
    showPane("login");
    loadConfig().catch(function () { /* config is best-effort */ });
    loadSession().catch(function () { /* stays logged out */ });
  });


})();
