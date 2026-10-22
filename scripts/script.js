/* Wave background + hover-to-play video */
(function () {
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Waves (greys / whites, colours come from CSS variables) ---- */
  var canvas = document.getElementById("wall");
  var ctx = canvas.getContext("2d");
  var W = 0,
    H = 0,
    t = 0;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var nw = document.documentElement.clientWidth || innerWidth;
    var nh = canvas.clientHeight || innerHeight; /* CSS uses the largest viewport, so bar show/hide doesn't change it */
    if (nw === W && nh === H && canvas.width === Math.ceil(W * dpr)) return;
    W = nw;
    H = nh;
    canvas.width = Math.ceil(W * dpr);
    canvas.height = Math.ceil(H * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); /* map CSS px exactly onto the rounded-up buffer */
    draw();
  }

  /* Hovering an app card slowly tints the waves towards that app's (muted) colour */
  var tint = { rgb: [0, 0, 0], goal: [0, 0, 0], k: 0, target: 0 };
  var TINT_MAX = 1.0;

  function tinted(color) {
    if (tint.k < 0.003) return color;
    var m = color.match(/[\d.]+/g);
    if (!m || m.length < 3) return color;
    var k = tint.k;
    function mix(i) {
      return Math.round(m[i] * (1 - k) + tint.rgb[i] * k);
    }
    return "rgba(" + mix(0) + "," + mix(1) + "," + mix(2) + "," + (m[3] || 1) + ")";
  }

  function stepTint(dt) {
    var f = 1 - Math.exp(-dt / 0.7); /* ~2s to settle, independent of frame rate */
    tint.k += (tint.target - tint.k) * f;
    for (var i = 0; i < 3; i++) tint.rgb[i] += (tint.goal[i] - tint.rgb[i]) * f;
  }

  function layer(color, amp, freq, speed, base, phase) {
    amp *= Math.max(1, H / 800);
    freq /= Math.max(1, W / 1400);
    ctx.beginPath();
    ctx.moveTo(0, H);
    /* Always end exactly at x = W, otherwise the last <10px slice drops to the bottom edge */
    for (var x = 0; ; x = Math.min(x + 10, W)) {
      var y =
        H * base +
        Math.sin(x * freq + t * speed + phase) * amp +
        Math.sin(x * freq * 2.1 - t * speed * 0.6 + phase) * amp * 0.35;
      ctx.lineTo(x, y);
      if (x >= W) break;
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = tinted(color);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    layer(cssVar("--w1"), 46, 0.0034, 0.5, 0.55, 0);
    layer(cssVar("--w2"), 40, 0.0042, 0.4, 0.7, 2);
    layer(cssVar("--w3"), 34, 0.005, 0.3, 0.84, 4);
  }

  var last = 0;
  function loop(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
    last = now;
    t += 0.016;
    stepTint(dt);
    draw();
    requestAnimationFrame(loop);
  }

  addEventListener("resize", resize);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  resize();
  if (!reduceMotion) requestAnimationFrame(loop);

  /* ---- Theme toggle: follows the system until the visitor picks one ---- */
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var systemDark = matchMedia("(prefers-color-scheme: dark)");

  function currentTheme() {
    return root.dataset.theme || (systemDark.matches ? "dark" : "light");
  }
  function syncToggle() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-label", "Switch to " + next + " theme");
    toggle.title = "Switch to " + next + " theme";
  }

  function applyTheme(next) {
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
    syncToggle();
    draw();
  }

  toggle.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    /* Cross-fade the whole page where supported, otherwise switch instantly */
    if (document.startViewTransition && !reduceMotion) {
      document.startViewTransition(function () {
        applyTheme(next);
      });
    } else {
      applyTheme(next);
    }
  });
  systemDark.addEventListener("change", syncToggle);
  syncToggle();

  /* ---- Cards with a data-tint colour: tint the waves while hovered / focused ---- */
  if (!reduceMotion && matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".app[data-tint]").forEach(function (card) {
      var rgb = card.dataset.tint.split(",").map(Number);
      function on() {
        if (tint.k < 0.01) tint.rgb = rgb.slice(); /* start from the new colour if nothing is tinted yet */
        tint.goal = rgb;
        tint.target = TINT_MAX;
      }
      function off() {
        tint.target = 0;
      }
      card.addEventListener("mouseenter", on);
      card.addEventListener("mouseleave", off);
      card.addEventListener("focusin", on);
      card.addEventListener("focusout", off);
    });
  }

  /* ---- Cards with a video: play on hover / keyboard focus ---- */
  document.querySelectorAll(".app[data-video]").forEach(function (card) {
    var video = card.querySelector("video");
    if (!video) return;

    function play() {
      if (reduceMotion || matchMedia("(hover: none)").matches) return; /* touch: keep the poster, skip the 1 MB video */
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
    function stop() {
      video.pause();
      video.currentTime = 0;
    }

    card.addEventListener("mouseenter", play);
    card.addEventListener("mouseleave", stop);
    card.addEventListener("focusin", play);
    card.addEventListener("focusout", stop);
  });
})();
