/* ------------------------------------------------------------------
   Theatre curtain: navy velvet, drawn on a canvas.
   The two halves open in one continuous 3-second motion and stay
   gathered in folds at the left and right edges of the screen.

   window.WaleemaCurtain.play()   start opening (called from main.js)
   CSS variable --edge            width of each gathered pile, so the
                                  page layout can leave room for it
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var cv = document.getElementById('curtainCv');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeIO = function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); };
  var rnd = function (x) { var s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  var pal = { dark: [4, 9, 30], mid: [16, 32, 86], hi: [84, 114, 210], sheen: [175, 200, 255] };

  // ---- timeline (seconds from the tap) ----
  var T_OPEN = 3.0;       // the draw itself
  var SIDE = 0.05;        // right half starts a hair later than the left
  var LAG = 0.10;         // hem trails the top by this share of the draw
  var DMAX = 0.42;        // how long the far folds wait before they start to move
  var T_VAL = 1.9;        // valance is flown up out of sight
  var T_VALDUR = 1.2;
  var T_END = 5.4;        // after the swing has settled

  var W = 0, H = 0, dpr = 1, n = 0, sw = 3, Wp = 0, rho = 0.2, gW = 40, N = 7, fringe = 26, hem = 9;
  var delay, base, xt, xb, st, sbb, et;
  var valance = null, vTotal = 0;
  var raf = 0, t0 = 0, lastTau = 0, playing = false, timer = 0;

  function col(l) {
    var k;
    if (l < 0.5) { k = l * 2; return [lerp(pal.dark[0], pal.mid[0], k), lerp(pal.dark[1], pal.mid[1], k), lerp(pal.dark[2], pal.mid[2], k)]; }
    k = (l - 0.5) * 2;
    return [lerp(pal.mid[0], pal.hi[0], k), lerp(pal.mid[1], pal.hi[1], k), lerp(pal.mid[2], pal.hi[2], k)];
  }
  function rgb(a) { return 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')'; }
  function mix(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    Wp = W / 2 + 3;
    sw = W < 600 ? 3 : 3.5;
    n = Math.ceil(Wp / sw); sw = Wp / n;
    gW = W < 600 ? 22 : Math.min(180, W * 0.12);       // width of each gathered pile
    rho = gW / Wp;
    N = W < 600 ? 4 : 7;                               // pleats per panel
    fringe = W < 600 ? 22 : 30;
    hem = W < 600 ? 8 : 10;
    root.style.setProperty('--edge', Math.round(gW) + 'px');
    delay = new Float32Array(n); base = new Float32Array(n);
    xt = new Float32Array(n + 1); xb = new Float32Array(n + 1);
    st = new Float32Array(n); sbb = new Float32Array(n); et = new Float32Array(n);
    var amp = [], off = [], k;
    for (k = 0; k <= N + 1; k++) { amp.push(0.80 + 0.40 * rnd(k * 7.1)); off.push((rnd(k * 3.3) - 0.5) * 0.16); }
    for (var i = 0; i < n; i++) {
      var u = (i + 0.5) / n;
      delay[i] = DMAX * (1 - u);
      var ph = u * N; k = Math.floor(ph);
      var p = ph - k + off[k];
      var l = 0.5 + 0.5 * Math.cos(2 * Math.PI * p);
      l = Math.pow(l, 1.4);
      base[i] = clamp(0.5 + (l - 0.5) * amp[k]);
    }
    buildValance();
    render(lastTau);
  }

  /* ---------- valance (pelmet) with swags, braid, fringe and tassels ---------- */
  function buildValance() {
    var vh = Math.round(clamp(H * 0.085, 56, 96)), swag = Math.round(vh * 0.62);
    vTotal = vh + swag + 40;
    valance = document.createElement('canvas');
    valance.width = Math.round(W * dpr); valance.height = Math.round(vTotal * dpr);
    var c = valance.getContext('2d'); c.scale(dpr, dpr);
    var nS = W < 600 ? 3 : Math.max(4, Math.round(W / 300)), sc = W / nS, j, k;
    var arcY = function (x, k0) { var xc = k0 * sc + sc / 2, t = (x - xc) / (sc / 2); return vh + swag * Math.sqrt(Math.max(0, 1 - t * t)); };

    c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, vh);
    for (k = nS - 1; k >= 0; k--) { for (j = 0; j <= 30; j++) { var x = (k + 1) * sc - sc * j / 30; c.lineTo(x, arcY(x, k)); } }
    c.closePath();
    c.save(); c.clip();
    var g = c.createLinearGradient(0, 0, 0, vh + swag);
    g.addColorStop(0, rgb(mix(pal.mid, pal.hi, 0.25))); g.addColorStop(0.55, rgb(pal.mid)); g.addColorStop(1, rgb(mix(pal.dark, pal.mid, 0.35)));
    c.fillStyle = g; c.fillRect(0, 0, W, vTotal);
    for (k = 0; k < nS; k++) {
      var xc = k * sc + sc / 2, M = 14;
      for (j = 0; j < M; j++) {
        var xa = k * sc + sc * j / M, xb2 = k * sc + sc * (j + 1) / M;
        c.beginPath();
        c.moveTo(xc + (xa - xc) * 0.18, 0); c.lineTo(xc + (xb2 - xc) * 0.18, 0);
        c.lineTo(xb2, arcY(xb2, k) + 2); c.lineTo(xa, arcY(xa, k) + 2); c.closePath();
        var m = 0.5 + 0.5 * Math.cos(2 * Math.PI * (j + 0.5 * rnd(k * 9 + j)) / 2.2);
        c.fillStyle = m > 0.5 ? 'rgba(190,210,255,' + (0.05 + 0.10 * (m - 0.5) * 2) + ')' : 'rgba(0,0,10,' + (0.10 + 0.20 * (0.5 - m) * 2) + ')';
        c.fill();
      }
      var sh = c.createLinearGradient(k * sc, 0, k * sc + sc, 0);
      sh.addColorStop(0, 'rgba(0,0,8,.55)'); sh.addColorStop(0.16, 'rgba(0,0,8,0)'); sh.addColorStop(0.84, 'rgba(0,0,8,0)'); sh.addColorStop(1, 'rgba(0,0,8,.55)');
      c.fillStyle = sh; c.fillRect(k * sc, 0, sc, vTotal);
    }
    c.restore();

    var gold = c.createLinearGradient(0, 0, 0, vTotal);
    gold.addColorStop(0, '#f6e3a1'); gold.addColorStop(0.5, '#c9a043'); gold.addColorStop(1, '#8f6a22');
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (k = 0; k < nS; k++) {
      c.beginPath();
      for (j = 0; j <= 40; j++) { var xx = k * sc + sc * j / 40, yy = arcY(xx, k); if (j === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy); }
      c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 6; c.stroke();
      c.strokeStyle = gold; c.lineWidth = 3.6; c.stroke();
      c.strokeStyle = 'rgba(255,240,190,.7)'; c.lineWidth = 1; c.stroke();
      for (j = 2; j < 78; j += 1) {
        var fx = k * sc + sc * j / 78, fy = arcY(fx, k), L = (W < 600 ? 13 : 18) * (0.8 + 0.4 * rnd(k * 131 + j));
        c.beginPath(); c.moveTo(fx, fy + 1); c.lineTo(fx + (rnd(j + k) - 0.5) * 1.5, fy + L);
        c.strokeStyle = (j % 3 === 0) ? '#8f6a22' : '#d9b45a'; c.lineWidth = 1.3; c.stroke();
      }
    }
    for (k = 0; k <= nS; k++) {
      var tx = k * sc, ty = vh, s = W < 600 ? 0.8 : 1;
      c.beginPath(); c.moveTo(tx, ty - 10 * s); c.lineTo(tx, ty + 8 * s); c.strokeStyle = gold; c.lineWidth = 2.4; c.stroke();
      c.beginPath(); c.arc(tx, ty + 12 * s, 6.5 * s, 0, 7); c.fillStyle = gold; c.fill();
      c.strokeStyle = 'rgba(80,50,10,.6)'; c.lineWidth = 0.8; c.stroke();
      for (j = -5; j <= 5; j++) {
        c.beginPath(); c.moveTo(tx + j * 1.1 * s, ty + 18 * s); c.lineTo(tx + j * 1.9 * s, ty + 40 * s);
        c.strokeStyle = (j % 2) ? '#d9b45a' : '#a97f2c'; c.lineWidth = 1.5; c.stroke();
      }
      c.beginPath(); c.moveTo(tx - 7 * s, ty + 18 * s); c.lineTo(tx + 7 * s, ty + 18 * s); c.strokeStyle = gold; c.lineWidth = 3; c.stroke();
    }
    var rod = c.createLinearGradient(0, 0, 0, 10);
    rod.addColorStop(0, '#f6e3a1'); rod.addColorStop(0.5, '#b78a2c'); rod.addColorStop(1, '#6e4f14');
    c.fillStyle = rod; c.fillRect(0, 0, W, 9);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 9, W, 3);
  }

  /* ---------- one frame ---------- */
  function render(tau) {
    lastTau = tau;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var yF = H - fringe;
    drawPanel(0, tau, yF);
    drawPanel(1, tau, yF);
    var lift = easeIO(clamp((tau - T_VAL) / T_VALDUR)) * (vTotal + 6);
    if (lift < vTotal + 5 && valance) ctx.drawImage(valance, 0, -lift, W, vTotal);
  }

  function drawPanel(side, tau, yF) {
    var dir = side === 0 ? 1 : -1, ox = side === 0 ? 0 : W, i;
    var s0 = (tau - side * SIDE) / T_OPEN;
    var tt = clamp(s0), tb = clamp(s0 - LAG);
    var aT = 0, aB = 0;
    for (i = 0; i < n; i++) {
      var eT = easeIO(clamp((tt - delay[i]) / (1 - DMAX)));
      var eB = easeIO(clamp((tb - delay[i]) / (1 - DMAX)));
      var sT = 1 - (1 - rho) * eT, sB = 1 - (1 - rho) * eB;
      xt[i] = aT; xb[i] = aB; st[i] = sT; sbb[i] = sB; et[i] = eT;
      aT += sT * sw; aB += sB * sw;
    }
    xt[n] = aT; xb[n] = aB;

    var moving = (s0 > 0 && s0 < 1) ? Math.sin(Math.PI * s0) : 0;
    var ts = tau - (T_OPEN + side * SIDE);
    var swingT = ts > 0 ? Math.exp(-2.4 * ts) * Math.sin(2 * Math.PI * 1.05 * ts) : 0;
    var swingB = ts > 0.12 ? Math.exp(-2.4 * (ts - 0.12)) * Math.sin(2 * Math.PI * 1.05 * (ts - 0.12)) : 0;
    var swAmp = gW * 0.10;

    for (i = 0; i < n; i++) {
      var comp = et[i], depth = 0.40 + 0.60 * Math.pow(comp, 0.7);
      var l = 0.5 + (base[i] - 0.5) * depth - 0.07 * comp;
      var c = col(clamp(l));
      var sheen = clamp((base[i] - 0.86) / 0.14) * 0.26 * depth;
      if (sheen > 0) c = mix(c, pal.sheen, sheen);
      var w = (i / n); w *= w;
      var rip = Math.sin(i * 0.09 + tau * 5.5 * 1.7);
      var dT = moving * 0.5 * rip + swingT * swAmp * w;
      var dB = moving * 1.5 * Math.sin(i * 0.09 + tau * 5.5 * 1.7 - 1.1) + swingB * swAmp * w;
      var xT = ox + dir * (xt[i] + dT), xB = ox + dir * (xb[i] + dB);
      var wT = dir * (st[i] * sw + 0.9), wB = dir * (sbb[i] * sw + 0.9);
      ctx.fillStyle = rgb(c);
      ctx.beginPath();
      ctx.moveTo(xT, -2); ctx.lineTo(xT + wT, -2); ctx.lineTo(xB + wB, yF); ctx.lineTo(xB, yF);
      ctx.closePath(); ctx.fill();
    }
    var leadT = ox + dir * (aT + swingT * swAmp), leadB = ox + dir * (aB + swingB * swAmp);
    var k = (leadB - leadT) / yF;

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    var vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(0,0,0,.60)'); vg.addColorStop(0.11, 'rgba(0,0,0,.16)'); vg.addColorStop(0.26, 'rgba(0,0,0,0)');
    vg.addColorStop(0.68, 'rgba(0,0,0,.22)'); vg.addColorStop(0.95, 'rgba(0,0,0,.50)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    var fg = ctx.createLinearGradient(0, H - fringe - 100, 0, H);
    fg.addColorStop(0, 'rgba(255,190,110,0)'); fg.addColorStop(1, 'rgba(255,190,110,.10)');
    ctx.fillStyle = fg; ctx.fillRect(0, H - fringe - 100, W, 100 + fringe);
    var gap = Math.abs(W / 2 - (leadT + leadB) / 2);
    var rim = clamp(gap / 70);
    if (rim > 0) {
      ctx.save(); ctx.transform(1, 0, k, 1, 0, 0);
      var rg = ctx.createLinearGradient(leadT, 0, leadT - dir * 28, 0);
      rg.addColorStop(0, 'rgba(255,205,120,' + (0.17 * rim) + ')'); rg.addColorStop(1, 'rgba(255,205,120,0)');
      ctx.fillStyle = rg; ctx.fillRect(Math.min(leadT, leadT - dir * 28), -4, 28, yF + 8);
      ctx.restore();
    }
    ctx.restore();

    // soft shadow the curtain throws onto what is behind it
    if (rim > 0) {
      ctx.save(); ctx.transform(1, 0, k, 1, 0, 0);
      var sg = ctx.createLinearGradient(leadT, 0, leadT + dir * 42, 0);
      sg.addColorStop(0, 'rgba(0,0,0,' + (0.42 * rim) + ')'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.fillRect(Math.min(leadT, leadT + dir * 42), -4, 42, yF + 8);
      ctx.restore();
    }

    // gold tape down the leading edge
    var gl = ctx.createLinearGradient(0, 0, 0, yF);
    gl.addColorStop(0, '#f6e3a1'); gl.addColorStop(0.5, '#c9a043'); gl.addColorStop(1, '#8f6a22');
    ctx.beginPath(); ctx.moveTo(leadT, -2); ctx.lineTo(leadB, yF);
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = gl; ctx.lineWidth = 3.4; ctx.stroke();

    // hem and bullion fringe
    var hg = ctx.createLinearGradient(0, yF - hem, 0, yF);
    hg.addColorStop(0, '#f6e3a1'); hg.addColorStop(0.5, '#c9a043'); hg.addColorStop(1, '#7a5818');
    ctx.fillStyle = hg;
    var bx = ox + dir * (aB + swingB * swAmp);
    ctx.fillRect(Math.min(ox, bx), yF - hem, Math.abs(bx - ox), hem);
    var pa = new Path2D(), pb = new Path2D();
    for (i = 0; i < n; i++) {
      var fx = ox + dir * (xb[i] + 0.5 * sbb[i] * sw + swingB * swAmp * (i / n) * (i / n));
      var len = fringe * (0.78 + 0.22 * rnd(i * 1.7 + side * 31));
      var tipx = fx + Math.sin(tau * 2.2 + i * 0.35) * 1.3 * (0.5 + moving);
      var path = (i % 3 === 0) ? pb : pa;
      path.moveTo(fx, yF); path.lineTo(tipx, yF + len);
    }
    ctx.lineWidth = 1.4; ctx.strokeStyle = '#d9b45a'; ctx.stroke(pa);
    ctx.strokeStyle = '#8f6a22'; ctx.stroke(pb);
  }

  /* ---------- playback ---------- */
  function tick() {
    var tau = (performance.now() - t0) / 1000;
    render(Math.min(tau, T_END));
    if (tau < T_END) raf = requestAnimationFrame(tick); else playing = false;
  }
  function play() {
    cancelAnimationFrame(raf);
    playing = true;
    if (reduce) { render(T_END); playing = false; return; }
    t0 = performance.now(); tick();
  }

  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { resize(); }, 120);
  });

  window.WaleemaCurtain = {
    play: play,
    render: function (t) { cancelAnimationFrame(raf); playing = false; render(t); },   // test hook
    duration: T_OPEN
  };
  resize();
})();
