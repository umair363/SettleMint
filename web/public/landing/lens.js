// @ts-check
// SettleMint landing: a liquid-glass lens drifting over the hero's balance.
// Plain WebGL2, no libraries. Loaded after the page is idle by the landing's
// inline loader, which skips it for reduced motion, reduced transparency,
// Save-Data and low-end devices. The HTML poster underneath is the real
// content (and what loads first); this only adds the glass on top.

const VERT = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uC;
uniform vec2 uB;
uniform float uR;
uniform float uS;
uniform vec3 uTint;
uniform float uDark;
out vec4 o;

float sdb(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec3 tex(vec2 px) { return texture(uTex, clamp(px / uRes, 0.0, 1.0)).rgb; }

void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 q = p - uC;
  float d = sdb(q, uB, uR);
  float s = uS;

  // Soft contact shadow under the glass.
  float ds = sdb(q + vec2(0.0, 16.0 * s), uB * 0.96, uR);
  float shadow = (1.0 - smoothstep(-10.0 * s, 30.0 * s, ds)) * mix(0.14, 0.4, uDark);

  // Surface normal from the shape's distance field.
  vec2 e = vec2(1.0, 0.0);
  vec2 g = normalize(vec2(sdb(q + e.xy, uB, uR) - sdb(q - e.xy, uB, uR),
                          sdb(q + e.yx, uB, uR) - sdb(q - e.yx, uB, uR)) + 1e-5);
  float depth = clamp(-d / min(uB.x, uB.y), 0.0, 1.0);
  float rim = pow(1.0 - smoothstep(0.0, 0.3, depth), 2.0);

  // A dome: gentle magnification in the middle, strong bending at the rim,
  // with each colour channel bent slightly differently.
  vec2 base = uC + q * 0.965 - g * rim * 6.5 * s;
  vec2 split = g * rim * 0.7 * s;
  vec3 col = vec3(tex(base + split).r, tex(base).g, tex(base - split).b);

  col = mix(col, uTint, 0.07 + rim * 0.12);
  float top = clamp(-g.y * 0.5 + 0.5, 0.0, 1.0);
  float edge = 1.0 - smoothstep(0.0, 2.4 * s, -d);
  col += edge * mix(0.85, 0.32, uDark) * (0.35 + 0.65 * top);
  col -= (1.0 - top) * rim * 0.05;

  float inside = 1.0 - smoothstep(-0.75 * s, 0.75 * s, d);
  o = vec4(col * inside, inside) + vec4(0.0, 0.0, 0.0, shadow) * (1.0 - inside);
}`;

const STRETCH = [
  [62.5, "ultra-condensed"],
  [75, "extra-condensed"],
  [87.5, "condensed"],
  [93.75, "semi-condensed"],
  [100, "normal"],
  [112.5, "semi-expanded"],
  [125, "expanded"],
];
/** Canvas only takes keyword widths: pick the nearest. */
function stretchKeyword(value) {
  const pct = value.endsWith("%") ? parseFloat(value) : value === "normal" ? 100 : 100;
  let best = STRETCH[0];
  for (const s of STRETCH) if (Math.abs(+s[0] - pct) < Math.abs(+best[0] - pct)) best = s;
  return /** @type {string} */ (best[1]);
}

/** Draws the poster's text into a 2D canvas, exactly where the page shows it. */
function rasterize(stage, canvas, dpr) {
  const rect = stage.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = getComputedStyle(stage).backgroundColor;
  ctx.fillRect(0, 0, rect.width, rect.height);
  for (const el of stage.querySelectorAll("[data-lens-text]")) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    try {
      ctx.fontStretch = /** @type {CanvasFontStretch} */ (stretchKeyword(cs.fontStretch));
      ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
    } catch {
      // Older canvas implementations: close enough.
    }
    ctx.fillStyle = cs.color;
    ctx.direction = cs.direction === "rtl" ? "rtl" : "ltr";
    ctx.textAlign = cs.direction === "rtl" ? "right" : "left";
    ctx.textBaseline = "alphabetic";
    const text = el.textContent ?? "";
    const m = ctx.measureText(text);
    const lh = parseFloat(cs.lineHeight) || r.height;
    const asc = m.fontBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent;
    const y = r.top - rect.top + (lh - (asc + desc)) / 2 + asc;
    const x = cs.direction === "rtl" ? r.right - rect.left : r.left - rect.left;
    ctx.fillText(text, x, y);
  }
  return rect;
}

function rgb(color) {
  const c = document.createElement("canvas").getContext("2d");
  if (!c) return [1, 1, 1];
  c.fillStyle = color;
  c.fillRect(0, 0, 1, 1);
  const d = c.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

function start(stage) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "lens-canvas";
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return;
  const ext = gl.getExtension("KHR_parallel_shader_compile");

  const sh = (type, src) => {
    const s = /** @type {WebGLShader} */ (gl.createShader(type));
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = /** @type {WebGLProgram} */ (gl.createProgram());
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const texture = gl.createTexture();
  const poster = document.createElement("canvas");

  let dpr = 1;
  let rect = stage.getBoundingClientRect();
  let tint = [1, 1, 1];
  let dark = 0;
  /** Lens geometry in CSS px. */
  const lens = { x: 0, y: 0, tx: 0, ty: 0, w: 0, h: 0, home: { x: 0, y: 0 } };

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    rect = rasterize(stage, poster, dpr);
    canvas.width = poster.width;
    canvas.height = poster.height;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, poster);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    dark = document.documentElement.dataset.theme === "dark" ? 1 : 0;
    tint = rgb(getComputedStyle(stage).backgroundColor);
    // The lens rests on the amount, the size of the app's tab bar.
    const anchor = stage.querySelector("[data-lens-anchor]")?.getBoundingClientRect();
    lens.w = Math.min(rect.width * 0.62, 320);
    lens.h = lens.w * 0.36;
    lens.home.x = anchor ? anchor.left - rect.left + anchor.width * 0.5 : rect.width / 2;
    lens.home.y = anchor ? anchor.top - rect.top + anchor.height * 0.52 : rect.height / 2;
    if (!lens.x) {
      lens.x = lens.tx = lens.home.x;
      lens.y = lens.ty = lens.home.y;
    }
  }

  const u = (name) => gl.getUniformLocation(prog, name);
  let pointer = /** @type {null | {x: number, y: number}} */ (null);
  stage.addEventListener("pointermove", (e) => {
    pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  });
  stage.addEventListener("pointerleave", () => (pointer = null));

  let running = false;
  let visible = true;
  let slow = 0;
  let last = 0;
  let t0 = 0;

  function frame(now) {
    if (!running) return;
    if (!t0) t0 = now;
    if (last && now - last > 34) slow++;
    else slow = Math.max(0, slow - 1);
    last = now;
    // Too slow for this device: leave the static glass in place.
    if (slow > 10) return stop(true);

    const t = (now - t0) / 1000;
    if (pointer) {
      lens.tx = pointer.x;
      lens.ty = pointer.y;
    } else {
      lens.tx = lens.home.x + Math.sin(t * 0.33) * rect.width * 0.17;
      lens.ty = lens.home.y + Math.sin(t * 0.61 + 1.2) * 14;
    }
    lens.x += (lens.tx - lens.x) * 0.06;
    lens.y += (lens.ty - lens.y) * 0.06;

    gl.useProgram(prog);
    const loc = gl.getAttribLocation(prog, "a");
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u("uTex"), 0);
    gl.uniform2f(u("uRes"), canvas.width, canvas.height);
    gl.uniform2f(u("uC"), lens.x * dpr, (rect.height - lens.y) * dpr);
    gl.uniform2f(u("uB"), (lens.w / 2) * dpr, (lens.h / 2) * dpr);
    gl.uniform1f(u("uR"), (lens.h / 2) * dpr);
    gl.uniform1f(u("uS"), dpr);
    gl.uniform3f(u("uTint"), tint[0], tint[1], tint[2]);
    gl.uniform1f(u("uDark"), dark);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }

  function play() {
    if (running || !visible || document.hidden) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }
  function stop(forGood = false) {
    running = false;
    if (forGood) {
      stage.dataset.lens = "off";
      canvas.remove();
    }
  }

  const begin = () => {
    layout();
    stage.appendChild(canvas);
    stage.dataset.lens = "on";
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) play();
      else stop();
    }).observe(stage);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));
    let pending = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(layout);
    }).observe(stage);
    new MutationObserver(layout).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    play();
  };

  // Compile off the main thread where the browser can, then start.
  const ready = () => {
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    begin();
  };
  if (ext) {
    const poll = () => (gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR) ? ready() : requestAnimationFrame(poll));
    poll();
  } else ready();
}

const stage = document.querySelector("[data-lens-stage]");
if (stage) document.fonts.ready.then(() => start(stage));
