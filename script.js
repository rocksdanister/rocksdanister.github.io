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
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function layer(color, amp, freq, speed, base, phase) {
    amp *= Math.max(1, H / 800);
    freq /= Math.max(1, W / 1400);
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 10) {
      var y =
        H * base +
        Math.sin(x * freq + t * speed + phase) * amp +
        Math.sin(x * freq * 2.1 - t * speed * 0.6 + phase) * amp * 0.35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    layer(cssVar("--w1"), 46, 0.0034, 0.5, 0.55, 0);
    layer(cssVar("--w2"), 40, 0.0042, 0.4, 0.7, 2);
    layer(cssVar("--w3"), 34, 0.005, 0.3, 0.84, 4);
  }

  function loop() {
    t += 0.016;
    draw();
    requestAnimationFrame(loop);
  }

  addEventListener("resize", resize);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  resize();
  if (!reduceMotion) loop();

  /* ---- Cards with a video: play on hover / keyboard focus ---- */
  document.querySelectorAll(".app[data-video]").forEach(function (card) {
    var video = card.querySelector("video");
    if (!video) return;

    function play() {
      if (reduceMotion) return;
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
