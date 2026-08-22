/* ==========================================================================
   A. Woods — contact-form.js
   Validation, spam mitigation, rate limiting, and Web3Forms submission.
   Depends on constants defined in js/config.js (loaded first).
   ========================================================================== */
(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const statusEl = document.getElementById("form-status");
  const submitBtn = form.querySelector('button[type="submit"]');

  // Time-trap: a form submitted faster than a human could plausibly read
  // and fill it is almost certainly a script. Recorded at page load.
  const formRenderedAt = Date.now();
  const MIN_HUMAN_FILL_MS = 3000;

  const fields = {
    name: form.elements.name,
    phone: form.elements.phone,
    email: form.elements.email,
    project_type: form.elements.project_type,
    message: form.elements.message,
  };

  const validators = {
    name: (v) => (v.trim().length >= 2 ? "" : "Please enter your name."),
    phone: (v) => (/^[0-9()+\-.\s]{7,}$/.test(v.trim()) ? "" : "Please enter a valid phone number."),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Please enter a valid email address."),
    project_type: (v) => (v ? "" : "Please select a project type."),
    message: (v) => (v.trim().length >= 10 ? "" : "Please add a few details about your project."),
  };

  function fieldWrapper(name) {
    return fields[name].closest(".field");
  }

  function showFieldError(name, message) {
    const wrapper = fieldWrapper(name);
    const errorEl = wrapper.querySelector(".field__error");
    wrapper.classList.toggle("field--invalid", Boolean(message));
    errorEl.textContent = message;
  }

  function validateField(name) {
    const message = validators[name](fields[name].value);
    showFieldError(name, message);
    return !message;
  }

  Object.keys(validators).forEach((name) => {
    fields[name].addEventListener("blur", () => validateField(name));
  });

  function validateAll() {
    return Object.keys(validators)
      .map(validateField)
      .every(Boolean);
  }

  function setStatus(kind, message) {
    statusEl.textContent = message;
    statusEl.className = "form-status is-visible form-status--" + kind;
  }

  function clearStatus() {
    statusEl.className = "form-status";
    statusEl.textContent = "";
  }

  // ---- hCaptcha, via Web3Forms' native integration ----
  // The widget itself is rendered by https://web3forms.com/client/script.js
  // (loaded in contact.html) against the .h-captcha element also in that
  // page. Once solved, the widget injects a hidden textarea named
  // "h-captcha-response" with the token — this reads it the same way
  // Web3Forms' own docs do. Falls back to the underlying hCaptcha API if
  // present, in case the wrapper script exposes it.
  function getCaptchaResponse() {
    const field = form.querySelector('[name="h-captcha-response"]');
    if (field && field.value) return field.value;
    if (typeof hcaptcha !== "undefined") {
      try {
        return hcaptcha.getResponse() || "";
      } catch (err) {
        return "";
      }
    }
    return "";
  }

  function resetCaptcha() {
    if (typeof hcaptcha !== "undefined") {
      try {
        hcaptcha.reset();
      } catch (err) {
        /* no-op — widget may not have finished rendering yet */
      }
    }
  }

  // ---- Client-side rate limiting (courtesy limiter, see config.js) ----
  function readSubmissionLog() {
    try {
      const raw = localStorage.getItem(RATE_LIMIT.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeSubmissionLog(timestamps) {
    try {
      localStorage.setItem(RATE_LIMIT.storageKey, JSON.stringify(timestamps));
    } catch (err) {
      /* localStorage unavailable (private mode, etc.) — fail open */
    }
  }

  function checkRateLimit() {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recent = readSubmissionLog().filter((t) => t > oneDayAgo);

    if (recent.length && now - recent[recent.length - 1] < RATE_LIMIT.cooldownMs) {
      return "Please wait a moment before submitting again.";
    }
    if (recent.length >= RATE_LIMIT.dailyCap) {
      return "You've reached today's submission limit on this device. Please call or email us directly — see the Contact info above.";
    }
    return "";
  }

  function recordSubmission() {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recent = readSubmissionLog().filter((t) => t > oneDayAgo);
    recent.push(now);
    writeSubmissionLog(recent);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();

    // Honeypot: real visitors never see or fill this field.
    if (form.elements.botcheck && form.elements.botcheck.checked) {
      setStatus("success", "Thanks — your message has been sent. We'll be in touch soon.");
      form.reset();
      return;
    }

    if (Date.now() - formRenderedAt < MIN_HUMAN_FILL_MS) {
      setStatus("error", "Please take a moment to review your message, then submit again.");
      return;
    }

    const rateLimitMessage = checkRateLimit();
    if (rateLimitMessage) {
      setStatus("error", rateLimitMessage);
      return;
    }

    if (!validateAll()) {
      setStatus("error", "Please fix the highlighted fields and try again.");
      return;
    }

    const captchaResponse = getCaptchaResponse();
    if (!captchaResponse) {
      setStatus("error", "Please complete the verification challenge before submitting.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      const payload = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: "New project inquiry — A. Woods website",
        from_name: "A. Woods Website",
        name: fields.name.value.trim(),
        phone: fields.phone.value.trim(),
        email: fields.email.value.trim(),
        project_type: fields.project_type.value,
        message: fields.message.value.trim(),
        "h-captcha-response": captchaResponse,
      };

      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.success) {
        recordSubmission();
        setStatus("success", "Thanks — your message has been sent. We'll be in touch soon.");
        form.reset();
      } else {
        setStatus("error", result.message || "Something went wrong sending your message. Please try again or call us directly.");
      }
    } catch (err) {
      console.error(err);
      setStatus("error", "Something went wrong sending your message. Please check your connection and try again.");
    } finally {
      resetCaptcha();
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
    }
  });
})();
