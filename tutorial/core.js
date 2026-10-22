/* Motor de animacion determinista compartido (horizontal y vertical).
 * seek(t) dibuja el cuadro del segundo t; las escenas se registran con scene().
 * Personalidad de movimiento (skill motion-design): Corporate/Premium.
 *   - Curva firma: cubic-bezier(0.4, 0, 0.2, 1); salidas aceleran.
 *   - Duraciones: 0.35 s (rapida), 0.6 s (estandar), 1.0 s (camara / revelados).
 *   - Entradas: desvanecer + subir 24 px. Sin rebotes.
 */
(function () {
  'use strict';


  // ---------------- utilidades ----------------
  function bez(p1x, p1y, p2x, p2y) {
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, s = 0.5;
      for (let i = 0; i < 26; i++) {
        s = (lo + hi) / 2;
        const bx = 3 * (1 - s) * (1 - s) * s * p1x + 3 * (1 - s) * s * s * p2x + s * s * s;
        if (bx < x) lo = s; else hi = s;
      }
      return 3 * (1 - s) * (1 - s) * s * p1y + 3 * (1 - s) * s * s * p2y + s * s * s;
    };
  }
  const ease = bez(0.4, 0, 0.2, 1);
  const easeIn = bez(0.4, 0, 1, 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const P = (t, a, d) => clamp((t - a) / d, 0, 1);
  const lerp = (a, b, p) => a + (b - a) * p;

  function el(cls, html, parent, style) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (html) d.innerHTML = html;
    if (style) Object.assign(d.style, style);
    if (parent) parent.appendChild(d);
    return d;
  }
  const px = (v) => v + 'px';
  function place(node, x, y, w, h) {
    node.style.left = px(x); node.style.top = px(y);
    if (w != null) node.style.width = px(w);
    if (h != null) node.style.height = px(h);
    return node;
  }

  // entrada: desvanecer + subir; salida opcional
  function reveal(node, t, a, opts) {
    opts = opts || {};
    const d = opts.d || 0.6, dy = opts.dy == null ? 24 : opts.dy, dx = opts.dx || 0;
    const p = ease(P(t, a, d));
    let o = p;
    if (opts.out != null) o *= 1 - easeIn(P(t, opts.out, opts.outD || 0.35));
    node.style.opacity = o;
    const sc = opts.scale ? lerp(opts.scale, 1, p) : 1;
    node.style.transform = `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px) scale(${sc})`;
    node.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
    return p;
  }

  const ICON = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18h2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path pathLength="1" class="ck" d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5L2.5 20.5h19z"/><path d="M12 10v5"/><path d="M12 17.8v.2"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  };
  const CURSOR_SVG = '<svg viewBox="0 0 30 40"><path d="M3 2 L3 31 L10 24.5 L15 36 L20.5 33.6 L15.5 22.4 L25 22.4 Z" fill="#fff" stroke="#1d201b" stroke-width="2" stroke-linejoin="round"/></svg>';

  // ---------------- tiempos de la narracion ----------------
  const TL = window.TL;
  function sceneTimes(id) {
    const s = TL.scenes.find((x) => x.id === id);
    return {
      S: (u, k) => s.utts[u].segments[k || 0].start,
      E: (u, k) => { const segs = s.utts[u].segments; return segs[k == null ? segs.length - 1 : k].end; },
      dur: s.dur, start: s.start,
    };
  }

  // ---------------- componentes ----------------
  const EVENTS = [];

  function header(parent, num, kicker, title, dark) {
    const h = el('hdr' + (dark ? ' dark' : ''), `<div class="num">${num}</div><div><div class="kick">${kicker}</div><div class="ttl">${title}</div></div>`, parent);
    el('brand' + (dark ? ' light' : ''), '', parent);
    return h;
  }

  function browser(parent, tabTitle) {
    const b = el('browser', `
      <div class="tabs"><div class="dots"><i></i><i></i><i></i></div>
        <div class="tab"><span class="fav"></span><span class="tt">${tabTitle}</span></div></div>
      <div class="bar"><div class="nav">${ICON.back}${ICON.fwd}${ICON.reload}</div>
        <div class="addr">${ICON.lock}<span class="url"></span></div><div class="load"></div></div>
      <div class="view"><div class="newtab"><div class="sb"></div></div></div>`, parent);
    return { el: b, url: b.querySelector('.url'), load: b.querySelector('.load'), view: b.querySelector('.view'),
             tab: b.querySelector('.tt'), newtab: b.querySelector('.newtab') };
  }
  // direccion: x inicial del texto y centro vertical (coordenadas de escena)
  const ADDR = { x: 424, y: 216 };

  const KM = 1400 / 1919, KK = 1400 / 1918;
  const mailR = (x1, y1, x2, y2) => ({ x: 260 + x1 * KM, y: 242 + y1 * KM, w: (x2 - x1) * KM, h: (y2 - y1) * KM });
  const kerR = (x1, y1, x2, y2) => ({ x: 260 + x1 * KK, y: 242 + y1 * KK, w: (x2 - x1) * KK, h: (y2 - y1) * KK });

  function cursor(parent, touch) {
    return el(touch ? 'touch' : 'cursor', touch ? '<div class="ring"></div><div class="dot"></div>' : '<div class="ring"></div>' + CURSOR_SVG, parent);
  }

  // keys: [{t, x, y, d?, click?}] ; el movimiento hacia cada clave termina en t
  function cursorPos(keys, t) {
    if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i], k0 = keys[i - 1];
      if (t < k.t) {
        const s = Math.max(k0.t, k.t - (k.d || 0.9));
        const p = ease(P(t, s, k.t - s));
        const dx = k.x - k0.x, dy = k.y - k0.y;
        const arc = Math.sin(Math.PI * p) * 0.08;
        return { x: lerp(k0.x, k.x, p) - dy * arc, y: lerp(k0.y, k.y, p) + dx * arc };
      }
    }
    const l = keys[keys.length - 1];
    return { x: l.x, y: l.y };
  }

  function drawCursor(node, keys, t, camScale, hideAt, touch) {
    const pos = cursorPos(keys, t);
    let o = P(t, keys[0].t - 0.4, 0.4);
    if (touch) {
      // el dedo solo se ve mientras se acerca y toca
      o = 0;
      for (const k of keys) {
        if (!k.click) continue;
        const a = k.t - (k.d || 0.9) - 0.25;
        o = Math.max(o, P(t, a, 0.25) * (1 - P(t, k.t + 0.35, 0.3)));
      }
    }
    if (hideAt != null) o *= 1 - P(t, hideAt, 0.4);
    node.style.opacity = o;
    node.style.left = px(pos.x); node.style.top = px(pos.y);
    let dip = 1, ringP = -1;
    for (const k of keys) {
      if (!k.click) continue;
      if (t >= k.t - 0.08 && t < k.t + 0.16) dip = touch ? 0.8 : 0.84;
      if (t >= k.t && t < k.t + 0.55) ringP = (t - k.t) / 0.55;
    }
    const inv = 1 / (camScale || 1);
    const ring = node.querySelector('.ring');
    if (ringP >= 0) {
      ring.style.opacity = (1 - ringP) * 0.9;
      ring.style.transform = `scale(${(0.4 + ringP * 1.1) * inv})`;
    } else ring.style.opacity = 0;
    const body = node.querySelector(touch ? '.dot' : 'svg');
    body.style.transform = `scale(${dip * inv})`;
  }

  // escritura: spec {node(.val), text, t0, cps, mask, focus, blur}
  function drawTyping(spec, t) {
    const n = clamp(Math.floor((t - spec.t0) * spec.cps) + (t >= spec.t0 ? 1 : 0), 0, spec.text.length);
    const shown = spec.mask ? '•'.repeat(n) : spec.text.slice(0, n);
    const typingEnd = spec.t0 + spec.text.length / spec.cps;
    const focus = spec.focus == null ? spec.t0 - 0.3 : spec.focus;
    const blur = spec.blur == null ? typingEnd + 1.5 : spec.blur;
    let caret = '';
    if (t >= focus && t < blur) {
      const on = (t >= spec.t0 && t <= typingEnd + 0.1) || ((t * 1.8) % 1) < 0.55;
      caret = `<span class="caret" style="height:${spec.caretH || 18}px;opacity:${on ? 1 : 0}"></span>`;
    }
    spec.node.innerHTML = escapeHtml(shown) + caret;
    return n;
  }
  function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  // camara: keys [{t, x, y, s, d?}] (x,y = punto enfocado)
  function camAt(keys, t) {
    let cur = keys[0];
    let x = cur.x, y = cur.y, s = cur.s;
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i];
      const d = k.d || 1.0;
      const p = ease(P(t, k.t - d, d));
      if (p <= 0) break;
      x = lerp(x, k.x, p); y = lerp(y, k.y, p); s = lerp(s, k.s, p);
    }
    return { x, y, s };
  }
  function applyCam(node, c) {
    node.style.transform = `translate(${VIEW.cx}px, ${VIEW.cy}px) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)`;
  }
  const CAM0 = { x: 960, y: 540, s: 1 };
  // centro de la camara en pantalla (la version vertical lo cambia)
  const VIEW = { cx: window.TL.width / 2, cy: window.TL.height / 2 };

  function highlight(parent, r, pad, radius) {
    pad = pad == null ? 7 : pad;
    const h = el('hl', '', parent);
    place(h, r.x - pad, r.y - pad, r.w + 2 * pad, r.h + 2 * pad);
    if (radius) h.style.borderRadius = px(radius);
    return h;
  }
  function drawHighlight(node, t, a, out) {
    if (t < a - 0.01 || (out != null && t > out + 0.4)) { node.style.opacity = 0; return; }
    const p = ease(P(t, a, 0.45));
    let o = p * (out != null ? 1 - P(t, out, 0.35) : 1);
    const pulse = 1 + 0.025 * Math.sin((t - a) * 4.2) * P(t, a + 0.5, 0.5);
    node.style.opacity = o;
    node.style.transform = `scale(${lerp(1.12, 1, p) * pulse})`;
  }
  function badge(parent, n, x, y, size) {
    const b = el('badge', String(n), parent);
    place(b, x, y);
    if (size) { b.style.width = b.style.height = px(size); b.style.fontSize = px(size * 0.52); }
    return b;
  }
  function callout(parent, text, x, y, left, font) {
    const c = el('callout' + (left ? ' left' : ''), `<div class="ln"></div><div class="lb">${text}</div>`, parent);
    place(c, x, y);
    c.style.transform = 'translateY(-50%)';
    if (font) c.querySelector('.lb').style.fontSize = px(font);
    return c;
  }
  function drawCallout(node, t, a, out) {
    const p = ease(P(t, a, 0.5));
    let o = p * (out != null ? 1 - P(t, out, 0.35) : 1);
    node.style.opacity = o;
    const left = node.classList.contains('left');
    node.style.transform = `translate(${(1 - p) * (left ? -20 : 20)}px, -50%)`;
  }

  // campo simulado (escritura sobre la captura)
  function field(parent, r, o) {
    const f = el('fld', `<div class="lbl"></div><div class="val"></div>`, parent);
    place(f, r.x, r.y, r.w, r.h);
    Object.assign(f.style, { background: o.bg, borderRadius: px(o.radius || 5) });
    const lbl = f.querySelector('.lbl'), val = f.querySelector('.val');
    if (o.label) {
      lbl.textContent = o.label;
      Object.assign(lbl.style, { left: px(o.padX), top: px(o.labelTop), font: o.labelFont, color: o.labelColor });
    }
    Object.assign(val.style, { left: px(o.padX), top: px(o.valTop), font: o.valFont, color: o.valColor });
    return { el: f, val };
  }


  // tarjeta de login del correo (coordenadas de la captura original)
  const MAIL = {
    card: mailR(125, 76, 670, 851),
    user: mailR(185, 320, 610, 387),
    pass: mailR(185, 409, 610, 476),
    btn: mailR(185, 518, 610, 573),
    logo: mailR(232, 128, 562, 252),
  };
  const MAIL_CAM = { x: 600, y: 560, s: 1.45 };
  function mailField(parent, r, label) {
    const inset = 1.6;
    return field(parent, { x: r.x + inset, y: r.y + inset, w: r.w - 2 * inset, h: r.h - 2 * inset }, {
      bg: '#fff', radius: 5, label, padX: 11, labelTop: 5, labelFont: "500 10.5px 'Inter'", labelColor: '#3a3a3a',
      valTop: 21, valFont: "500 15px 'Inter'", valColor: '#1f1f1f' });
  }
  function mailBrowserWithShot(cam, tab) {
    const B = browser(cam, tab);
    el('', '<img src="assets/mail_login.png">', B.view, { position: 'absolute', inset: 0 });
    B.newtab.style.display = 'none';
    B.url.textContent = 'mail.policia.bo';
    return B;
  }

  // ===== ESCENA 4: CAMBIO DE CONTRASENA (ilustrativa) =====
  function changePwCard(cam) {
    const r = MAIL.card;
    const cover = el('abs', '', cam, { background: '#F8F8F8', borderRadius: px(14), overflow: 'hidden' });
    place(cover, r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    const lg = el('abs', '<img src="assets/mail_card_logo.png" style="width:100%">', cam);
    place(lg, MAIL.logo.x, MAIL.logo.y, MAIL.logo.w);
    const mk = (rr, text) => {
      const box = el('abs', '', cam, { background: '#fff', border: '1px solid #c9c9c9', borderRadius: '5px' });
      place(box, rr.x, rr.y, rr.w, rr.h);
      const ph = el('abs', text, box, { left: '11px', top: '14px', font: "500 14.5px 'Inter'", color: '#3a3a3a' });
      return { box, ph };
    };
    const n1 = mk(MAIL.user, 'Nueva contraseña');
    const n2 = mk(MAIL.pass, 'Confirmar nueva contraseña');
    const btn = el('abs', 'CONTINUAR', cam, { background: '#144321', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', font: "500 15px 'Inter'", letterSpacing: '.02em', boxShadow: '0 3px 6px rgba(0,0,0,.25)' });
    place(btn, MAIL.btn.x, MAIL.btn.y, MAIL.btn.w, MAIL.btn.h);
    const f1 = mailField(cam, MAIL.user, 'Nueva contraseña');
    const f2 = mailField(cam, MAIL.pass, 'Confirmar nueva contraseña');
    const ok = el('abs', `<span style="display:inline-flex;width:15px;height:15px;color:#465638;vertical-align:-3px">${ICON.check}</span> Las contraseñas coinciden`, cam,
      { font: "600 11.5px 'Inter'", color: '#465638', opacity: 0 });
    place(ok, MAIL.pass.x + 2, MAIL.pass.y + MAIL.pass.h + 6);
    const tag = el('tag', 'Representación ilustrativa', cam);
    tag.style.transform = 'scale(.72)'; tag.style.transformOrigin = '0 0';
    place(tag, r.x + 14, r.y + 14);
    return { group: [cover, lg, n1.box, n2.box, btn, tag], f1, f2, ok, btn, tag };
  }

  // ===== telefono =====
  const PH = { x: 770, y: 170 }; // posicion en la camara (modificable)
  const PS = (x, y) => ({ x: PH.x + 12 + x, y: PH.y + 12 + y });
  function phone(parent) {
    const p = el('phone', `<div class="scr"><div class="notch"></div><div class="sbar"><span>10:00</span><span>▮▮▮ ◔</span></div></div>`, parent);
    place(p, PH.x, PH.y);
    return { el: p, scr: p.querySelector('.scr') };
  }
  function screen(ph, html) { return el('screen', html, ph.scr); }
  const appIcon = (size, bg) => `<div class="ico" style="width:${size}px;height:${size}px;border-radius:${size * 0.24}px;background:${bg || '#30352D'}">${ICON.mail}</div>`;

  // ===== ESCENA 9: ACCESO A KERBEROS =====
  const KER = {
    card: kerR(1152, 140, 1662, 825),
    email: kerR(1184, 446, 1630, 486),
    pass: kerR(1184, 534, 1630, 574),
    btn: kerR(1184, 594, 1630, 633),
  };
  const KER_CAM = { x: KER.card.x + KER.card.w / 2 - 90, y: KER.card.y + KER.card.h / 2 + 10, s: 1.42 };

  // ---------------- escenas ----------------
  const SCENES = [];
  const stage = document.getElementById('stage');

  function scene(id, build) {
    const root = el('scene', '', stage);
    const T = sceneTimes(id);
    const ctx = { root, T, id, events: [] };
    ctx.update = build(root, T, ctx);
    SCENES.push(ctx);
    return ctx;
  }
  function ev(ctx, t, type) { ctx.events.push({ t, type }); }
  function typingEvents(ctx, spec) {
    for (let i = 0; i < spec.text.length; i++) ev(ctx, spec.t0 + i / spec.cps, 'key');
  }
  function clickEvents(ctx, keys, type) {
    for (const k of keys) if (k.click) ev(ctx, k.t, type || 'click');
  }

  // ---------------- capa global: subtitulos, transiciones, fundidos ----------------
  function finalize(opts) {
    opts = opts || {};
    const subs = el('', '<div class="box"></div>', stage); subs.id = 'subs';
    const subBox = subs.firstChild;
    const wA = el('wipe a', '', stage), wB = el('wipe b', '<div class="mark"></div>', stage);
    const fade = el('', '', stage); fade.id = 'fade';
    const WIPES = TL.scenes.slice(1).map((s) => s.start);
    (opts.extraWipes || []).forEach((b) => WIPES.push(b));
    WIPES.forEach((b) => EVENTS.push({ t: b - 0.45, type: 'whoosh' }));

    function wipeX(t, b, lag) {
      const p1 = P(t, b - 0.5 + lag, 0.5), p2 = P(t, b + lag, 0.55);
      if (p1 <= 0 || p2 >= 1) return null;
      return p1 < 1 ? -100 + 100 * easeIn(p1) : 100 * ease(p2);
    }

    SCENES.forEach((s) => s.events.forEach((e) => EVENTS.push({ t: s.T.start + e.t, type: e.type })));
    EVENTS.sort((a, b) => a.t - b.t);
    window.EVENTS = EVENTS;

    let current = null;
    window.seek = function (t) {
      let idx = TL.scenes.findIndex((s) => t >= s.start && t < s.start + s.dur);
      if (idx < 0) idx = TL.scenes.length - 1;
      const sc = SCENES[idx];
      if (current !== sc) {
        SCENES.forEach((s) => (s.root.style.display = s === sc ? 'block' : 'none'));
        current = sc;
      }
      sc.update(t - TL.scenes[idx].start);

      // subtitulos
      const cue = TL.cues.find((c) => t >= c.start && t < c.end);
      if (cue) {
        subBox.textContent = cue.text;
        subs.style.opacity = P(t, cue.start, 0.12) * (1 - P(t, cue.end - 0.12, 0.12));
      } else subs.style.opacity = 0;

      // transiciones
      let xa = null, xb = null;
      for (const b of WIPES) {
        const a = wipeX(t, b, 0), bb = wipeX(t, b, 0.08);
        if (a != null) xa = a;
        if (bb != null) xb = bb;
      }
      wA.style.display = xa == null ? 'none' : 'block';
      wB.style.display = xb == null ? 'none' : 'flex';
      if (xa != null) wA.style.transform = `translateX(${xa}%)`;
      if (xb != null) wB.style.transform = `translateX(${xb}%)`;

      // fundido de entrada y salida
      fade.style.opacity = Math.max(1 - P(t, 0, 0.9), P(t, TL.duration - 1.3, 1.2));
    };

    window.ready = (async function () {
      await document.fonts.ready;
      await Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
      window.seek(0);
      return true;
    })();
  }

  window.CORE = { bez, ease, easeIn, clamp, P, lerp, el, px, place, reveal, ICON, CURSOR_SVG, TL, sceneTimes, EVENTS, header, browser, ADDR, KM, KK, mailR, kerR, cursor, cursorPos, drawCursor, drawTyping, escapeHtml, camAt, applyCam, CAM0, VIEW, highlight, drawHighlight, badge, callout, drawCallout, field, MAIL, MAIL_CAM, mailField, mailBrowserWithShot, changePwCard, PH, PS, phone, screen, appIcon, KER, KER_CAM, SCENES, stage, scene, ev, typingEvents, clickEvents, finalize };
})();
