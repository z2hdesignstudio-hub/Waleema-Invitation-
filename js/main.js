(function () {
  'use strict';

  var cfg = window.INVITE_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;

  /* ------------------------------------------------------------------
     Background: stars + rising gold dust
     ------------------------------------------------------------------ */
  (function buildSky() {
    var stars = $('#stars'), dust = $('#dust');
    var i, el, s;
    var n = window.innerWidth < 600 ? 48 : 80;
    for (i = 0; i < n; i++) {
      el = document.createElement('i');
      s = Math.random() * 2.2 + 0.8;
      el.style.cssText = 'left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) + '%;' +
        'width:' + s + 'px;height:' + s + 'px;--t:' + (2.5 + Math.random() * 4) + 's;--dl:-' + (Math.random() * 6) + 's';
      stars.appendChild(el);
    }
    var m = window.innerWidth < 600 ? 10 : 16;
    for (i = 0; i < m; i++) {
      el = document.createElement('i');
      s = Math.random() * 8 + 5;
      el.style.cssText = 'left:' + (Math.random() * 100) + '%;width:' + s + 'px;height:' + s + 'px;' +
        '--t:' + (16 + Math.random() * 16) + 's;--dl:-' + (Math.random() * 28) + 's;--dx:' + ((Math.random() - .5) * 90) + 'px';
      dust.appendChild(el);
    }
  })();

  /* ------------------------------------------------------------------
     Arch frame: draw a true semicircle-topped outline for the hero
     ------------------------------------------------------------------ */
  (function archFrame() {
    var arch = $('#arch'), svg = $('#archFrame'), outer = $('#archOuter'), inner = $('#archInner');
    if (!arch || !svg) return;
    function draw() {
      var w = arch.offsetWidth, h = arch.offsetHeight, r = w / 2, g = 12;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      outer.setAttribute('d', 'M0 ' + h + 'V' + r + 'A' + r + ' ' + r + ' 0 0 1 ' + w + ' ' + r + 'V' + h);
      var ir = r - g;
      inner.setAttribute('d', 'M' + g + ' ' + h + 'V' + r + 'A' + ir + ' ' + ir + ' 0 0 1 ' + (w - g) + ' ' + r + 'V' + h);
    }
    draw();
    if (window.ResizeObserver) new ResizeObserver(draw).observe(arch);
    window.addEventListener('resize', draw);
  })();

  /* ------------------------------------------------------------------
     Music
     ------------------------------------------------------------------ */
  var audio = $('#music'), musicBtn = $('#musicBtn');
  var wantPlaying = false, fadeTimer = null;

  function setMusicUI(on) {
    musicBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    musicBtn.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
  }
  function fadeTo(target, ms) {
    clearInterval(fadeTimer);
    var start = audio.volume, t0 = Date.now();
    fadeTimer = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / ms);
      try { audio.volume = start + (target - start) * k; } catch (e) {}
      if (k >= 1) { clearInterval(fadeTimer); if (target === 0) audio.pause(); }
    }, 60);
  }
  function playMusic() {
    wantPlaying = true;
    try { audio.volume = 0; } catch (e) {}
    var p = audio.play();
    setMusicUI(true);
    if (p && p.then) {
      p.then(function () { fadeTo(0.6, 3500); })
       .catch(function () { wantPlaying = false; setMusicUI(false); });
    } else { fadeTo(0.6, 3500); }
  }
  function pauseMusic() {
    wantPlaying = false;
    setMusicUI(false);
    fadeTo(0, 600);
  }
  musicBtn.addEventListener('click', function () { wantPlaying ? pauseMusic() : playMusic(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (wantPlaying) audio.pause(); }
    else if (wantPlaying) { audio.play().catch(function () {}); }
  });

  /* ------------------------------------------------------------------
     Curtain
     ------------------------------------------------------------------ */
  var curtain = $('#curtain'), openBtn = $('#openBtn');
  var opened = false;
  function openCurtain() {
    if (opened) return;
    opened = true;
    playMusic();                       // must run inside the tap for browsers to allow audio
    musicBtn.hidden = false;
    curtain.classList.add('is-opening');
    if (window.WaleemaCurtain) window.WaleemaCurtain.play();   // starts in the same frame as the tap
    var k = reduceMotion ? 0.05 : 1;
    setTimeout(function () {                                   // page wakes up while the cloth is still moving
      body.classList.add('is-revealed');
      body.classList.remove('is-locked');
    }, 600 * k);
    setTimeout(function () { curtain.remove(); }, 1100);
  }
  openBtn.addEventListener('click', openCurtain);

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  (function reveal() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { items.forEach(function (n) { n.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (n) { io.observe(n); });
  })();

  /* ------------------------------------------------------------------
     Countdown
     ------------------------------------------------------------------ */
  (function countdown() {
    var target = new Date(cfg.eventISO || '2026-12-23T12:30:00+05:30').getTime();
    var ids = ['days', 'hours', 'mins', 'secs'].map(function (k) { return $('#cd-' + k); });
    var grid = $('#countGrid'), done = $('#countDone');
    function set(el, v) {
      if (el.textContent !== v) {
        el.textContent = v;
        if (!reduceMotion) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
      }
    }
    function pad(n) { return String(n).padStart(2, '0'); }
    function update() {
      var t = target - Date.now();
      if (t <= 0) { grid.hidden = true; done.hidden = false; return false; }
      set(ids[0], pad(Math.floor(t / 864e5)));
      set(ids[1], pad(Math.floor(t % 864e5 / 36e5)));
      set(ids[2], pad(Math.floor(t % 36e5 / 6e4)));
      set(ids[3], pad(Math.floor(t % 6e4 / 1e3)));
      return true;
    }
    if (update()) {
      var timer = setInterval(function () { if (!update()) clearInterval(timer); }, 1000);
    }
  })();

  /* ------------------------------------------------------------------
     RSVP form -> Google Sheet (via the Apps Script web app)
     ------------------------------------------------------------------ */
  (function rsvp() {
    var form = $('#rsvpForm'), sendBtn = $('#sendBtn'), statusEl = $('#formStatus');
    var guestsField = $('#guestsField'), guestsVal = $('#guestsVal');
    var thanks = $('#thanks'), thanksText = $('#thanksText'), againBtn = $('#againBtn');
    var nameInput = $('#f-name'), errName = $('#err-name'), errAtt = $('#err-attending');
    var guests = 1, MAX = 10, sending = false;

    function setGuests(n) {
      guests = Math.max(1, Math.min(MAX, n));
      guestsVal.textContent = guests;
    }
    $('#guestsMinus').addEventListener('click', function () { setGuests(guests - 1); });
    $('#guestsPlus').addEventListener('click', function () { setGuests(guests + 1); });

    form.addEventListener('change', function (e) {
      if (e.target.name === 'attending') {
        guestsField.hidden = e.target.value !== 'Yes';
        errAtt.hidden = true;
      }
    });
    nameInput.addEventListener('input', function () {
      errName.hidden = true; nameInput.parentNode.classList.remove('has-error');
    });

    function showError(el, msg) { el.textContent = msg; el.hidden = false; }
    function newRef() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

    function post(endpoint, payload, noCors) {
      var ctrl = window.AbortController ? new AbortController() : null;
      var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      var opts = { method: 'POST', body: JSON.stringify(payload), redirect: 'follow',
                   headers: { 'Content-Type': 'text/plain;charset=utf-8' } };
      if (noCors) opts.mode = 'no-cors';
      if (ctrl) opts.signal = ctrl.signal;
      return fetch(endpoint, opts).then(function (r) { clearTimeout(to); return r; },
                                       function (e) { clearTimeout(to); throw e; });
    }

    // Returns a promise that resolves on success and rejects on failure.
    function send(payload) {
      var endpoint = (window.INVITE_CONFIG || {}).rsvpEndpoint;
      if (!endpoint) return Promise.reject(new Error('not-configured'));
      return post(endpoint, payload, false).then(function (res) {
        return res.json().then(function (j) {
          if (!j || !j.ok) throw new Error('rejected');
        });
      }).catch(function (err) {
        if (err && err.message === 'rejected') throw err;
        // The response could not be read (network or browser restriction).
        // Resend once in fire-and-forget mode. The sheet ignores a repeated "ref", so no duplicates.
        return post(endpoint, payload, true).then(function () {});
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      statusEl.textContent = '';
      errName.hidden = true; errAtt.hidden = true;

      var name = nameInput.value.trim();
      var att = form.querySelector('input[name="attending"]:checked');
      var bad = false;
      if (!name) { showError(errName, 'Enter your name so we can find you on the guest list.'); nameInput.parentNode.classList.add('has-error'); bad = true; }
      if (!att) { showError(errAtt, 'Choose whether you will attend.'); bad = true; }
      if (bad) { (!name ? nameInput : form.querySelector('input[name="attending"]')).focus(); return; }

      // Honeypot: bots fill hidden fields. Pretend it worked, send nothing.
      if ($('#f-web').value) { showThanks(name, att.value); return; }

      var payload = {
        ref: newRef(),
        name: name,
        phone: $('#f-phone').value.trim(),
        attending: att.value,
        guests: att.value === 'Yes' ? guests : 0,
        message: $('#f-msg').value.trim()
      };

      sending = true; sendBtn.disabled = true; sendBtn.textContent = 'Sending…';
      send(payload).then(function () {
        showThanks(name, att.value);
      }).catch(function (err) {
        var msg = (err && err.message === 'not-configured')
          ? 'RSVP is not connected yet. Please call ' + (cfg.helpPhone || 'the number below') + ' to confirm.'
          : 'Your RSVP did not send. Check your connection and try again, or call ' + (cfg.helpPhone || 'the number below') + '.';
        statusEl.textContent = msg;
      }).then(function () {
        sending = false; sendBtn.disabled = false; sendBtn.textContent = 'Send RSVP';
      });
    });

    function showThanks(name, att) {
      thanksText.textContent = att === 'Yes'
        ? 'We have your RSVP, ' + name + '. We look forward to celebrating with you, In Shaa Allah.'
        : 'We have your reply, ' + name + '. You will be missed, and your duʿa is appreciated.';
      form.hidden = true; thanks.hidden = false; thanks.focus({ preventScroll: true });
      thanks.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
    againBtn.addEventListener('click', function () {
      form.reset(); setGuests(1); guestsField.hidden = true; statusEl.textContent = '';
      thanks.hidden = true; form.hidden = false; nameInput.focus();
    });
  })();
})();
