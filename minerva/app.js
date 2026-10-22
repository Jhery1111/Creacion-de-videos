/* Tutorial MINERVA: como ingresar y rendir el examen (horizontal y vertical).
 * Motor compartido: ../tutorial/core.js. Estilo dinamico: rotulos con resorte (back.out),
 * transiciones variadas, lupa sobre el control, spotlight, contadores y fondo animado.
 * Las posiciones de los controles salen de build/targets.js (OCR sobre las capturas reales).
 */
(function () {
  'use strict';
  const { bez, ease, easeIn, clamp, P, lerp, el, px, place, reveal, ICON, TL, cursor, drawCursor, drawTyping, camAt, applyCam,
    VIEW, highlight, drawHighlight, scene, ev, typingEvents, clickEvents, SCENES, EVENTS } = window.CORE;

  const backOut = bez(0.34, 1.56, 0.64, 1);
  const inOut = bez(0.65, 0, 0.35, 1);
  const V = window.FORMAT === 'v';
  const DEV = V ? 'mobile' : 'desktop';
  const TG = window.TARGETS[DEV];
  const W = TL.width, H = TL.height;
  const CAPW = V ? 780 : 3200;
  const SCR = V ? { x: 280, y: 330, w: 520, h: 1125 } : { x: 240, y: 152, w: 1440, h: 810 };
  const K = SCR.w / CAPW;
  VIEW.cx = SCR.x + SCR.w / 2; VIEW.cy = SCR.y + SCR.h / 2;
  const CAM0 = { x: VIEW.cx, y: VIEW.cy, s: 1 };
  const stage = document.getElementById('stage');
  const src = (cap) => `caps/${DEV}/${cap}.png`;

  // ---------- geometria ----------
  function R(cap, key, pad) {
    const b = TG[cap] && TG[cap][key];
    if (!b) throw new Error(`falta objetivo ${cap}.${key}`);
    pad = pad || 0;
    return { x: b[0] * K - pad, y: b[1] * K - pad, w: (b[2] - b[0]) * K + 2 * pad, h: (b[3] - b[1]) * K + 2 * pad };
  }
  const box = (b) => ({ x: b[0] * K, y: b[1] * K, w: (b[2] - b[0]) * K, h: (b[3] - b[1]) * K });
  const mid = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const focus = (r, s) => { const m = mid(r); return { x: SCR.x + m.x, y: SCR.y + m.y, s }; };
  const toStage = (p) => ({ x: SCR.x + p.x, y: SCR.y + p.y });
  // la camara no puede encuadrar fuera de la pantalla (sin huecos al acercar)
  function camApply(node, c) {
    if (c.s > 1) {
      const mx = (SCR.w / 2) * (1 - 1 / c.s), my = (SCR.h / 2) * (1 - 1 / c.s);
      c = { x: clamp(c.x, VIEW.cx - mx, VIEW.cx + mx), y: clamp(c.y, VIEW.cy - my, VIEW.cy + my), s: c.s };
    }
    applyCam(node, c);
  }

  // ---------- componentes ----------
  function device(root) {
    const cam = el('cam', '', root);
    if (V) {
      const f = el('frame-phone', '', cam); place(f, SCR.x - 14, SCR.y - 14, SCR.w + 28, SCR.h + 28);
    } else {
      const f = el('frame-browser', `<div class="chrome"><i></i><i></i><i></i><div class="url">${ICON.lock.replace('<svg', '<svg width="14" height="14"')}MINERVA · Sistema de Evaluación Psicológica</div></div>`, cam);
      place(f, SCR.x, SCR.y - 40, SCR.w, SCR.h + 40);
    }
    const vp = el('viewport' + (V ? ' phone' : ''), '', cam);
    place(vp, SCR.x, SCR.y, SCR.w, SCR.h);
    return { cam, vp };
  }
  function shot(vp, cap) {
    const im = document.createElement('img');
    im.className = 'shot'; im.src = src(cap);
    vp.appendChild(im);
    return im;
  }
  function lens(vp, cap, r, o) {
    o = o || {};
    const L = o.size || (V ? 200 : 230), Z = o.zoom || (V ? 1.9 : 2.4);
    const n = el('lens', '', vp);
    n.style.width = n.style.height = px(L);
    const c = mid(r);
    n.style.backgroundImage = `url(${src(cap)})`;
    n.style.backgroundSize = `${SCR.w * Z}px auto`;
    n.style.backgroundPosition = `${-(c.x * Z - L / 2)}px ${-(c.y * Z - L / 2)}px`;
    const lx = clamp(c.x + (o.dx == null ? 160 : o.dx), L / 2 + 8, SCR.w - L / 2 - 8);
    const ly = clamp(c.y + (o.dy == null ? -160 : o.dy), L / 2 + 8, SCR.h - L / 2 - 8);
    place(n, lx - L / 2, ly - L / 2);
    return n;
  }
  function drawLens(n, t, a, out) {
    const p = backOut(P(t, a, 0.45));
    const q = out != null ? P(t, out, 0.25) : 0;
    n.style.opacity = P(t, a, 0.12) * (1 - q);
    n.style.transform = `scale(${Math.max(0, p) * (1 - 0.3 * q)})`;
  }
  function spot(vp, r, pad) {
    pad = pad == null ? 10 : pad;
    const n = el('spot', '', vp); place(n, r.x - pad, r.y - pad, r.w + 2 * pad, r.h + 2 * pad);
    return n;
  }
  function drawSpot(n, t, a, out) {
    const p = ease(P(t, a, 0.35));
    n.style.opacity = p * (out != null ? 1 - P(t, out, 0.3) : 1);
    n.style.transform = `scale(${lerp(1.08, 1, p)})`;
  }
  function chip(parent, html, cls) { return el('chip' + (cls ? ' ' + cls : ''), html, parent); }
  function pop(n, t, a, out, from) {
    const p = backOut(P(t, a, 0.5));
    n.style.opacity = P(t, a, 0.12) * (out != null ? 1 - P(t, out, 0.3) : 1);
    n.style.transform = `translateY(${(1 - Math.min(1, p)) * 26}px) scale(${lerp(from == null ? 0.6 : from, 1, p)})`;
  }
  function toast(parent, text) {
    return el('toast', `<div class="ic">${ICON.check}</div>${text}`, parent);
  }
  const countUp = (t, a, d, from, to) => Math.round(lerp(from, to, ease(P(t, a, d))));
  function camKen(keys) { return keys; }

  // fondo animado global (formas suaves, puntos y lineas que se dibujan)
  const bgfx = el('bgfx', '', stage);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const blobs = Array.from({ length: 5 }, (_, i) => ({ x: rnd() * W, y: rnd() * H, r: 260 + rnd() * 260, ph: rnd() * 6.28, sp: 0.05 + rnd() * 0.06 }));
  const dots = Array.from({ length: 42 }, () => ({ x: rnd() * W, y: rnd() * H, r: 2 + rnd() * 3, vy: -6 - rnd() * 10, ph: rnd() * 6.28 }));
  let lines = '';
  for (let i = 0; i < 6; i++) {
    const y0 = rnd() * H, x0 = -20, x1 = 200 + rnd() * 400;
    lines += `<path class="ln" pathLength="1" d="M${x0} ${y0} H${x1} L${x1 + 60} ${y0 + (rnd() < .5 ? -60 : 60)} H${x1 + 260}"/>`;
    const y2 = rnd() * H, x2 = W + 20, x3 = W - 200 - rnd() * 400;
    lines += `<path class="ln" pathLength="1" d="M${x2} ${y2} H${x3} L${x3 - 60} ${y2 + (rnd() < .5 ? -60 : 60)} H${x3 - 260}"/>`;
  }
  bgfx.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0">
    <defs><radialGradient id="bl"><stop offset="0" stop-color="#66bb6a" stop-opacity=".22"/><stop offset="1" stop-color="#66bb6a" stop-opacity="0"/></radialGradient></defs>
    <g class="blobs">${blobs.map(() => '<circle fill="url(#bl)"/>').join('')}</g>
    <g fill="none" stroke="#43a047" stroke-opacity=".18" stroke-width="2">${lines}</g>
    <g fill="#43a047" class="dots">${dots.map(() => '<circle/>').join('')}</g></svg>`;
  const blobEls = [...bgfx.querySelectorAll('.blobs circle')], dotEls = [...bgfx.querySelectorAll('.dots circle')], lnEls = [...bgfx.querySelectorAll('.ln')];
  function drawBg(t) {
    blobs.forEach((b, i) => {
      blobEls[i].setAttribute('cx', b.x + Math.sin(t * b.sp + b.ph) * 120);
      blobEls[i].setAttribute('cy', b.y + Math.cos(t * b.sp * 1.3 + b.ph) * 90);
      blobEls[i].setAttribute('r', b.r);
    });
    dots.forEach((d, i) => {
      dotEls[i].setAttribute('cx', d.x + Math.sin(t * 0.4 + d.ph) * 14);
      dotEls[i].setAttribute('cy', ((d.y + d.vy * t) % H + H) % H);
      dotEls[i].setAttribute('r', d.r);
      dotEls[i].style.opacity = 0.18 + 0.12 * Math.sin(t * 1.5 + d.ph);
    });
    lnEls.forEach((l, i) => {
      const ph = ((t * 0.12 + i * 0.17) % 1);
      l.style.strokeDasharray = '1'; l.style.strokeDashoffset = 1 - inOut(clamp(ph * 2, 0, 1)) + (ph > 0.75 ? (ph - 0.75) * 4 : 0);
    });
  }

  // ---------- escenas ----------
  const STEPS = {
    1: ['ACCESO', 'Elegí tu portal'], 2: ['CREDENCIALES', 'Carnet y escalafón'], 3: ['SALA', 'En Inscripción'],
    4: ['TUS DATOS', 'Verificación'], 5: ['CONSENTIMIENTO', 'Documento oficial'], 6: ['HABILITACIÓN', 'Ya Disponibles'],
    7: ['LOBBY', 'Términos y condiciones'], 8: ['EXAMEN', 'Una pregunta a la vez'], 9: ['ENVÍO', 'Confirmación'],
    10: ['ENVIADO', '¡Listo!'], 11: ['CIERRE', 'Resultado'],
  };

  function intro(root, t0, isOutro) {
    root.classList.add('green-bg');
    const g = el('grid-olive', '', root);
    const rings = el('abs', `<svg width="${W}" height="${H}"><g fill="none" stroke="#a5d6a7" stroke-opacity=".25">
      <circle class="r1" cx="${W / 2}" cy="${V ? 600 : 340}" r="${V ? 330 : 250}" stroke-width="2" pathLength="1"/>
      <circle class="r2" cx="${W / 2}" cy="${V ? 600 : 340}" r="${V ? 390 : 300}" stroke-width="1.5" pathLength="1" stroke-dasharray=".02 .03"/></g></svg>`, root, { left: 0, top: 0 });
    const emH = V ? 560 : 380;
    const emb = el('abs', `<img src="assets/minerva_emblem.png" style="height:${emH}px;display:block">`, root);
    place(emb, W / 2 - emH * 754 / 864 / 2, (V ? 600 : 340) - emH / 2);
    const wdW = V ? 760 : 560;
    const word = el('abs', `<img src="assets/minerva_word.png" style="width:${wdW}px;display:block">`, root);
    place(word, W / 2 - wdW / 2, V ? 900 : 560);
    return { g, rings, emb, word };
  }

  // ===== 0: INTRO =====
  scene(0, function (root, T, ctx) {
    const I = intro(root);
    const tag = el('abs', 'POLICÍA BOLIVIANA · DIRECCIÓN NACIONAL DE SALUD Y BIENESTAR SOCIAL', root, {
      left: 0, width: W + 'px', textAlign: 'center', color: '#c8e6c9', font: `700 ${V ? 22 : 20}px 'Inter'`, letterSpacing: '.14em' });
    place(tag, 0, V ? 230 : 90);
    const title = el('abs', V ? 'Cómo ingresar y<br>rendir tu examen' : 'Cómo ingresar y rendir tu examen', root, {
      left: 0, width: W + 'px', textAlign: 'center', color: '#fff', font: `900 ${V ? 74 : 64}px/1.1 'Inter'` });
    place(title, 0, V ? 1050 : 690);
    const sub = el('abs', 'GUÍA PASO A PASO', root, { padding: '12px 30px', borderRadius: '999px', background: '#fff', color: '#1b5e20',
      font: `900 ${V ? 32 : 28}px 'Inter'`, letterSpacing: '.18em' });
    place(sub, W / 2 - (V ? 210 : 190), V ? 1240 : 790);
    const trio = [['1', 'Ingresá', ICON.lock], ['2', 'Rendí', ICON.check], ['3', 'Enviá', ICON.mail]].map(([n, txt, ic], i) => {
      const c = el('abs', `<div style="width:64px;height:64px;border-radius:50%;background:#fff;color:#1b5e20;display:flex;align-items:center;justify-content:center;font:900 32px 'Inter'">${n}</div>
        <div style="font:900 34px 'Inter';color:#fff">${txt}</div>`, root, { display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 28px 12px 12px',
        borderRadius: '999px', background: 'rgba(255,255,255,.12)', border: '2px solid rgba(255,255,255,.35)' });
      if (V) { place(c, 60 + i * 330, 1340, 300); c.style.padding = '10px 18px 10px 10px'; c.style.justifyContent = 'center'; } else place(c, 560 + i * 280, 900, 250);
      return c;
    });
    const u1 = T.S(1, 0);
    ev(ctx, 0.5, 'chime');
    trio.forEach((_, i) => ev(ctx, u1 + 0.4 + i * 0.3, 'pop'));
    return function (t) {
      I.g.style.transform = `translate(${(t * 8) % 60}px, ${(t * 5) % 60}px)`;
      const r1 = I.rings.querySelector('.r1'); r1.style.strokeDasharray = '1'; r1.style.strokeDashoffset = 1 - inOut(P(t, 0.2, 1.4));
      I.rings.querySelector('.r2').style.transform = `rotate(${t * 12}deg)`; I.rings.querySelector('.r2').style.transformOrigin = `${W / 2}px ${V ? 600 : 340}px`;
      const pe = P(t, 0.2, 0.9);
      I.emb.style.clipPath = `circle(${inOut(pe) * 75}% at 50% 50%)`;
      I.emb.style.transform = `scale(${lerp(0.7, 1, backOut(pe))})`;
      I.word.style.clipPath = `inset(0 ${100 - inOut(P(t, 0.9, 0.7)) * 100}% 0 0)`;
      reveal(tag, t, 1.2, { d: 0.5, dy: -14 });
      pop(title, t, 1.6, null, 0.85);
      pop(sub, t, 2.2);
      trio.forEach((c, i) => pop(c, t, u1 + 0.4 + i * 0.3));
    };
  });

  // ===== 1: ACCESO =====
  scene(1, function (root, T, ctx) {
    const { cam, vp } = device(root);
    shot(vp, '01-portal');
    const card = R('01-portal', 'card'), link = R('01-portal', 'card_link');
    const sp = spot(vp, card, 8);
    const ln = lens(vp, '01-portal', link, { dx: V ? -150 : 220, dy: V ? -170 : -120 });
    const cur = cursor(vp, V);
    const a = T.S(0, 0), tClick = Math.max(a + 2.2, T.E(0) - 0.2);
    const keys = [{ t: a + 0.3, x: SCR.w * 0.75, y: SCR.h * 0.35 }, { t: tClick, ...mid(link), d: 1.2, click: true }];
    const camKeys = [{ t: 0, ...CAM0 }, { t: tClick - 0.2, ...focus(card, V ? 1.12 : 1.22), d: tClick - 0.6 }];
    clickEvents(ctx, keys, V ? 'tap' : 'click');
    return function (t) {
      const c = camAt(camKeys, t); camApply(cam, c);
      drawSpot(sp, t, a + 1.0, tClick + 0.6);
      drawLens(ln, t, tClick - 0.7, tClick + 0.6);
      drawCursor(cur, keys, t, c.s, null, V);
    };
  });

  // ===== 2: CREDENCIALES =====
  scene(2, function (root, T, ctx) {
    const { cam, vp } = device(root);
    shot(vp, '02-form-vacio');
    const s3 = shot(vp, '03-form-lleno');
    const fb = TG['02-form-vacio'];
    const fields = fb.fields.map(box);
    const valX = (V ? 167 : 1672) * K, fz = (V ? 31.6 : 31.6) * K;
    const typed = fields.map((r, i) => {
      const n = el('typed', '<span class="v"></span>', vp, { background: fb.fieldbg[i], color: '#e6efe8', font: `500 ${fz}px 'Inter'`, paddingLeft: px(valX - r.x) });
      place(n, r.x, r.y, r.w * 0.8, r.h);
      return n;
    });
    const ing = R('03-form-lleno', 'ingresar');
    const ln = lens(vp, '03-form-lleno', ing, { dx: V ? 0 : 260, dy: V ? -200 : -150 });
    const hls = fields.map((r) => highlight(vp, r, 4));
    const okToast = toast(root, '¡Acceso Autorizado!');
    place(okToast, W / 2 - (V ? 260 : 250), SCR.y + SCR.h * (V ? 0.42 : 0.4));
    const cur = cursor(vp, V);
    const a = T.S(0, 0), b = T.S(0, 1), c2 = T.S(1, 0);
    const s1 = { node: typed[0].querySelector('.v'), text: '0000000', t0: a + 0.8, cps: 12, caretH: fz * 0.9 };
    const s2 = { node: typed[1].querySelector('.v'), text: '0000-XX', t0: b + 0.3, cps: 12, caretH: fz * 0.9 };
    const tSwap = s2.t0 + 7 / 12 + 0.35;
    s1.blur = b; s2.blur = tSwap;
    const tClick = Math.max(c2 + 0.9, tSwap + 0.6);
    const keys = [
      { t: a + 0.1, x: SCR.w * 0.8, y: SCR.h * 0.8 },
      { t: a + 0.6, ...mid(fields[0]), d: 0.5, click: true },
      { t: b + 0.1, ...mid(fields[1]), d: 0.5, click: true },
      { t: tClick, ...mid(ing), d: 0.7, click: true },
    ];
    const formC = { x: mid(fields[0]).x, y: (fields[0].y + ing.y + ing.h) / 2, w: 0, h: 0 };
    const camKeys = [{ t: 0, ...CAM0 }, { t: 0.9, ...focus(formC, V ? 1.18 : 1.4), d: 0.9 }, { t: tClick + 0.5, ...focus(formC, V ? 1.05 : 1.15), d: 0.6 }];
    typingEvents(ctx, s1); typingEvents(ctx, s2); clickEvents(ctx, keys, V ? 'tap' : 'click'); ev(ctx, tClick + 0.35, 'chime');
    return function (t) {
      const c = camAt(camKeys, t); camApply(cam, c);
      const sw = P(t, tSwap, 0.25);
      s3.style.opacity = sw;
      typed.forEach((n, i) => { n.style.opacity = (t >= [s1, s2][i].t0 - 0.35 ? 1 : 0) * (1 - sw); });
      drawTyping(s1, t); drawTyping(s2, t);
      drawHighlight(hls[0], t, a + 0.5, b - 0.1); drawHighlight(hls[1], t, b, tSwap);
      drawLens(ln, t, tClick - 0.6, tClick + 0.5);
      pop(okToast, t, tClick + 0.35, T.dur - 0.25);
      drawCursor(cur, keys, t, c.s, null, V);
    };
  });

  // ===== 3: SALA EN INSCRIPCION =====
  scene(3, function (root, T, ctx) {
    const { cam, vp } = device(root);
    const cap = V ? '04-sala-default' : '05-tab-0-Inscripcion';
    shot(vp, cap);
    const btn = R(cap, 'descargar');
    const card = V ? box([20, 850, 760, 1462]) : box([530, 140, 1250, 700]);
    const sp = spot(vp, card, 6);
    const ln = lens(vp, cap, btn, { dx: V ? 0 : 330, dy: V ? -190 : -40 });
    const tag = chip(root, '<small>Estado de tu sesión</small>EN INSCRIPCIÓN', 'orange');
    const tp = V ? toStage({ x: 40, y: card.y - 90 }) : toStage({ x: card.x + card.w + 40, y: card.y + 20 });
    place(tag, tp.x, tp.y);
    const cur = cursor(vp, V);
    const a = T.S(0, 0), b = T.S(1, 0);
    const tClick = Math.max(b + 1.0, T.E(1) - 0.3);
    const keys = [{ t: a + 0.6, x: SCR.w * 0.7, y: SCR.h * 0.3 }, { t: tClick, ...mid(btn), d: 1.0, click: true }];
    const camKeys = [{ t: 0, ...CAM0 }, { t: b + 0.4, ...focus(card, V ? 1.12 : 1.35), d: b + 0.2 }];
    clickEvents(ctx, keys, V ? 'tap' : 'click'); ev(ctx, a + 1.6, 'pop');
    return function (t) {
      const c = camAt(camKeys, t); camApply(cam, c);
      drawSpot(sp, t, a + 1.3, tClick + 0.5);
      pop(tag, t, a + 1.6, T.dur - 0.3);
      drawLens(ln, t, tClick - 0.6, tClick + 0.5);
      drawCursor(cur, keys, t, c.s, null, V);
    };
  });

  // ===== 4: VERIFICACION DE DATOS =====
  scene(4, function (root, T, ctx) {
    const { cam, vp } = device(root);
    const cap = '09-confirmar-datos';
    shot(vp, cap);
    const area = V ? box([24, 955, 756, 1540]) : box([915, 868, 2295, 1345]);
    const sp = spot(vp, area, 6);
    const cur = cursor(vp, V);
    const a = T.S(0, 0), b = T.S(0, 1), c2 = T.S(1, 0);
    let btn, ln, pill, keys;
    if (!V) {
      btn = R(cap, 'correctos');
      ln = lens(vp, cap, btn, { dx: 380, dy: -120 });
      const tClick = Math.max(c2 + 1.6, T.E(1) - 0.2);
      keys = [{ t: b + 0.2, x: mid(area).x + 300, y: mid(area).y }, { t: tClick, ...mid(btn), d: 0.9, click: true }];
      keys.tClick = tClick;
    } else {
      // en el celular el boton queda bajo el pliegue: se muestra como rotulo animado
      pill = el('abs', `<span style="width:30px;height:30px;display:inline-flex">${ICON.check}</span>Mis datos son correctos — Descargar`, vp, {
        left: '20px', right: '20px', bottom: '24px', height: '64px', borderRadius: '14px', background: '#2e7d32', color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: '10px', font: "800 20px 'Inter'", boxShadow: '0 10px 30px rgba(27,94,32,.45)', zIndex: 34, opacity: 0 });
      const tClick = Math.max(c2 + 1.4, T.E(1) - 0.2);
      keys = [{ t: tClick, x: SCR.w / 2, y: SCR.h - 56, d: 0.6, click: true }];
      keys.tClick = tClick;
    }
    const camKeys = [{ t: 0, ...CAM0 }, { t: b + 0.3, ...focus(area, V ? 1.12 : 1.3), d: 1.0 },
      { t: c2 + 0.8, ...(V ? CAM0 : focus(box([900, 860, 2300, 1790]), 1.05)), d: 0.8 }];
    clickEvents(ctx, keys, V ? 'tap' : 'click');
    return function (t) {
      const c = camAt(camKeys, t); camApply(cam, c);
      drawSpot(sp, t, b + 0.2, c2 + 0.4);
      if (ln) drawLens(ln, t, keys.tClick - 0.6, keys.tClick + 0.5);
      if (pill) pop(pill, t, c2 + 0.3, null, 0.8);
      drawCursor(cur, keys, t, c.s, null, V);
    };
  });

  // ===== 5: CONSENTIMIENTO (PDF) =====
  scene(5, function (root, T, ctx) {
    const { cam, vp } = device(root);
    vp.style.background = '#525659';
    const DW = V ? SCR.w * 0.94 : 820, DS = DW / 1347, DH = 1743 * DS;
    const doc = el('abs', `<img src="caps/${DEV}/10-consentimiento.png" style="width:${DW}px;display:block">`, vp, { boxShadow: '0 20px 50px rgba(0,0,0,.45)', background: '#fff' });
    place(doc, (SCR.w - DW) / 2, 30);
    const fr = TG['10-consentimiento'].firma;
    const sig = el('spot', '', doc); place(sig, fr[0] * DS - 8, fr[1] * DS - 8, (fr[2] - fr[0]) * DS + 16, (fr[3] - fr[1]) * DS + 16);
    const tag = chip(root, '<small>PDF oficial</small>Consentimiento Informado');
    const tp = V ? { x: 440, y: SCR.y + 40 } : { x: SCR.x + SCR.w - 360, y: SCR.y + 30 };
    place(tag, tp.x, tp.y);
    const a = T.S(0, 0), b = T.S(0, 1);
    const scrollTo = V ? 0 : -(DH - SCR.h + 60);
    ev(ctx, a + 0.3, 'pop');
    return function (t) {
      camApply(cam, CAM0);
      const p = backOut(P(t, 0.15, 0.6));
      const sc = inOut(P(t, a + 0.6, Math.max(0.8, b - a - 0.4)));
      const zoom = V ? lerp(1, 1.35, inOut(P(t, b - 0.2, 1.0))) : 1;
      const zy = V ? -((fr[1] + fr[3]) / 2 * DS - DH / 2) * (zoom - 1) : 0;
      doc.style.transformOrigin = '50% 50%';
      doc.style.transform = `translateY(${(1 - Math.min(1, p)) * 120 + scrollTo * sc + (V ? (SCR.h - DH) / 2 - 30 : 0) + zy}px) scale(${lerp(0.9, 1, Math.min(1, p)) * zoom})`;
      doc.style.opacity = P(t, 0.1, 0.2);
      sig.style.opacity = ease(P(t, b + 0.1, 0.35));
      pop(tag, t, a + 0.3, T.dur - 0.3);
    };
  });

  // ===== 6: HABILITACION (En Inscripcion -> Ya Disponibles) =====
  scene(6, function (root, T, ctx) {
    const { cam, vp } = device(root);
    const a = T.S(0, 0), b = T.S(0, 1), c2 = T.S(1, 0);
    const tag = chip(root, '', 'orange');
    let s2 = null, tab = null, btn, card, capBtn;
    if (!V) {
      shot(vp, '05-tab-0-Inscripcion');
      s2 = shot(vp, '05-tab-2-Disponibles');
      tab = R('05-tab-0-Inscripcion', 'tab_disp', 6);
      capBtn = '05-tab-2-Disponibles';
      btn = R(capBtn, 'entrar');
      card = box([520, 140, 1170, 660]);
      place(tag, SCR.x + SCR.w - 420, SCR.y + 40);
    } else {
      shot(vp, '04-sala-default');
      capBtn = '04-sala-default';
      btn = R(capBtn, 'entrar');
      card = box([20, 190, 760, 795]);
      place(tag, 470, SCR.y + 130);
    }
    const sp = spot(vp, card, 6);
    const ln = lens(vp, capBtn, btn, { dx: V ? 0 : 420, dy: V ? 200 : 40 });
    const cur = cursor(vp, V);
    const tTab = b + 0.6, tClick = Math.max(c2 + 0.9, T.E(1) - 0.25);
    const keys = !V ? [{ t: a + 0.4, x: SCR.w * 0.5, y: SCR.h * 0.6 }, { t: tTab, ...mid(tab), d: 0.9, click: true }, { t: tClick, ...mid(btn), d: 0.9, click: true }]
      : [{ t: tClick, ...mid(btn), d: 0.6, click: true }];
    const camKeys = [{ t: 0, ...CAM0 }, { t: tTab + 0.8, ...focus(card, V ? 1.1 : 1.3), d: 0.9 }];
    clickEvents(ctx, keys, V ? 'tap' : 'click'); ev(ctx, b, 'pop');
    return function (t) {
      const c = camAt(camKeys, t); camApply(cam, c);
      if (s2) s2.style.opacity = P(t, tTab + 0.1, 0.2);
      const m = P(t, b, 0.01) > 0;
      tag.className = 'chip ' + (m ? '' : 'orange');
      tag.innerHTML = `<small>Estado de tu sesión</small>${m ? 'YA DISPONIBLES' : 'EN INSCRIPCIÓN'}`;
      const sw = Math.sin(Math.PI * P(t, b - 0.12, 0.24));
      tag.style.opacity = P(t, a + 0.2, 0.2) * (1 - P(t, T.dur - 0.3, 0.3));
      tag.style.transform = `scale(${(1 + 0.18 * sw) * lerp(0.6, 1, backOut(P(t, a + 0.2, 0.5)))}) rotateX(${sw * 70}deg)`;
      drawSpot(sp, t, tTab + 0.5, tClick + 0.5);
      drawLens(ln, t, tClick - 0.6, tClick + 0.5);
      drawCursor(cur, keys, t, c.s, null, V);
    };
  });

  // ===== 7: LOBBY =====
  scene(7, function (root, T, ctx) {
    const { cam, vp } = device(root);
    const a = T.S(0, 0), b = T.S(0, 1), c2 = T.S(1, 0), d2 = T.S(1, 1);
    const s6 = shot(vp, '06-lobby');
    const s7 = shot(vp, '07-lobby-terminos-ok');
    const capC = '07-lobby-terminos-ok';
    const chk = R(capC, 'check'), ini = R(capC, 'iniciar');
    const unchecked = el('abs', '', vp, { background: '#fff', border: `${V ? 2 : 2}px solid #9aa79f`, borderRadius: '4px', zIndex: 25 });
    place(unchecked, chk.x + 1, chk.y + 1, chk.w - 2, chk.h - 2);
    const dur = R('06-lobby', 'duracion'), intt = R('06-lobby', 'intentos');
    const cDur = chip(root, ''), cInt = chip(root, '');
    const pD = toStage(V ? { x: 30, y: dur.y - 70 } : { x: dur.x - 10, y: dur.y - 120 });
    const pI = toStage(V ? { x: 300, y: intt.y - 10 } : { x: intt.x - 10, y: intt.y - 120 });
    place(cDur, pD.x, pD.y); place(cInt, pI.x, pI.y);
    const terms = V ? null : spot(vp, R('06-lobby', 'terminos'), 4);
    const lnC = lens(vp, capC, chk, { dx: V ? 170 : 160, dy: V ? -170 : -170 });
    const lnI = lens(vp, capC, ini, { dx: V ? 0 : -330, dy: V ? -210 : -150 });
    const cur = cursor(vp, V);
    const tCheck = c2 + 0.8, tIni = Math.max(d2 + 0.9, T.E(1) - 0.3);
    const tScroll = V ? b - 0.1 : null;
    const keys = [{ t: tCheck - 1.0, x: SCR.w * 0.6, y: SCR.h * 0.6 }, { t: tCheck, ...mid(chk), d: 0.8, click: true }, { t: tIni, ...mid(ini), d: 0.8, click: true }];
    const camKeys = V ? [{ t: 0, ...CAM0 }] : [{ t: 0, ...CAM0 }, { t: b + 0.5, ...focus(R('06-lobby', 'terminos'), 1.15), d: 1.0 },
      { t: tIni - 0.4, ...focus(box([1600, 1380, 3160, 1760]), 1.3), d: 0.9 }];
    clickEvents(ctx, keys, V ? 'tap' : 'click'); ev(ctx, a + 0.9, 'pop'); ev(ctx, a + 1.5, 'pop');
    return function (t) {
      const c = camAt(camKeys, t); camApply(cam, c);
      if (V) {
        const sp = inOut(P(t, tScroll, 0.7));
        s6.style.transform = `translateY(${-sp * SCR.h}px)`;
        s7.style.transform = `translateY(${(1 - sp) * SCR.h}px)`;
        s7.style.opacity = sp > 0 ? 1 : 0;
      } else s7.style.opacity = t >= tCheck + 0.08 ? 1 : 0;
      unchecked.style.opacity = t < tCheck + 0.08 && (!V || t > tScroll) ? 1 : 0;
      unchecked.style.transform = V ? s7.style.transform : '';
      cDur.innerHTML = `<small>Duración</small>${countUp(t, a + 0.9, 0.9, 0, 60)} min`;
      cInt.innerHTML = `<small>Intentos</small>${countUp(t, a + 1.5, 0.6, 0, 1)} intento`;
      pop(cDur, t, a + 0.9, V ? tScroll : b + 0.3); pop(cInt, t, a + 1.5, V ? tScroll : b + 0.3);
      if (terms) drawSpot(terms, t, b + 0.2, tCheck - 0.3);
      drawLens(lnC, t, tCheck - 0.5, tCheck + 0.6);
      drawLens(lnI, t, tIni - 0.6, tIni + 0.5);
      drawCursor(cur, keys, t, c.s, null, V);
    };
  });

  // ===== 8: EXAMEN =====
  scene(8, function (root, T, ctx) {
    const { cam, vp } = device(root);
    const cap = '08-examen';
    shot(vp, cap);
    const a = T.S(0, 0), b = T.S(0, 1), c2 = T.S(1, 0);
    const preg = R(cap, 'pregunta'), sig = R(cap, 'siguiente'), timer = R(cap, 'timer', V ? 6 : 10);
    const cQ = chip(root, '');
    const pq = toStage(V ? { x: 30, y: preg.y - 120 } : { x: preg.x, y: preg.y - 110 });
    place(cQ, pq.x, pq.y);
    const spT = spot(vp, timer, 4);
    const spP = V ? null : spot(vp, R(cap, 'progreso'), 4);
    const opt = V ? null : R(cap, 'opcion', 6);
    const optHl = opt ? highlight(vp, opt, 0, 12) : null;
    const ln = lens(vp, cap, sig, { dx: V ? -150 : -300, dy: V ? -190 : 170 });
    const cur = cursor(vp, V);
    const tOpt = c2 + 0.5, tNext = Math.max(c2 + (V ? 1.5 : 2.0), T.E(1) - 0.3);
    const keys = V ? [{ t: tNext, ...mid(sig), d: 0.6, click: true }]
      : [{ t: a + 0.3, x: SCR.w * 0.5, y: SCR.h * 0.8 }, { t: tOpt, ...mid(opt), d: 0.8, click: true }, { t: tNext, ...mid(sig), d: 0.8, click: true }];
    const camKeys = [{ t: 0, ...CAM0 }, { t: b + 0.2, ...focus(timer, V ? 1.1 : 1.15), d: 0.9 }, { t: c2 + 0.3, ...CAM0, d: 0.8 }];
    clickEvents(ctx, keys, V ? 'tap' : 'click'); ev(ctx, a + 0.3, 'pop');
    return function (t) {
      const c = camAt(camKeys, t); camApply(cam, c);
      cQ.innerHTML = `<small>Pregunta</small>1 / ${countUp(t, a + 0.3, 1.0, 1, 132)}`;
      pop(cQ, t, a + 0.3, b + 0.8);
      drawSpot(spT, t, b + 0.1, b + 1.6);
      if (spP) drawSpot(spP, t, b + 1.7, c2);
      if (optHl) drawHighlight(optHl, t, tOpt);
      drawLens(ln, t, tNext - 0.6, tNext + 0.5);
      drawCursor(cur, keys, t, c.s, null, V);
    };
  });

  // ===== 9: CONFIRMACION DE ENVIO =====
  scene(9, function (root, T, ctx) {
    const { cam, vp } = device(root);
    shot(vp, '08-examen');
    const s11 = shot(vp, '11-confirmar-envio');
    const a = T.S(0, 0), b = T.S(1, 0), b2 = T.S(1, 1);
    const env = R('08-examen', 'enviar'), fal = R('11-confirmar-envio', 'faltan', V ? 8 : 12);
    const res = R('11-confirmar-envio', 'responder'), ok = R('11-confirmar-envio', 'enviar_examen');
    const spF = spot(vp, V ? box([150, 200, 640, 330]) : box([1300, 440, 2500, 570]), 4);
    const spR = spot(vp, res, 6);
    const ln = lens(vp, '11-confirmar-envio', ok, { dx: V ? 0 : 300, dy: V ? -210 : -40 });
    const cur = cursor(vp, V);
    const tEnv = a + 0.9, tOk = Math.max(b2 + 1.0, T.E(1) - 0.3);
    const keys = [{ t: a + 0.2, x: SCR.w * 0.6, y: SCR.h * 0.4 }, { t: tEnv, ...mid(env), d: 0.7, click: true }, { t: tOk, ...mid(ok), d: 0.9, click: true }];
    const camKeys = [{ t: 0, ...CAM0 }, { t: tEnv + 1.0, ...focus(V ? box([30, 180, 750, 1500]) : box([1290, 420, 2510, 1380]), V ? 1.0 : 1.25), d: 0.8 }];
    clickEvents(ctx, keys, V ? 'tap' : 'click'); ev(ctx, tEnv + 0.15, 'whoosh');
    return function (t) {
      const c = camAt(camKeys, t); camApply(cam, c);
      const p = P(t, tEnv + 0.15, 0.35);
      s11.style.opacity = p;
      s11.style.transform = `scale(${lerp(1.06, 1, backOut(p))})`;
      drawSpot(spF, t, tEnv + 0.8, b - 0.1);
      drawSpot(spR, t, b, b2 + 0.2);
      drawLens(ln, t, tOk - 0.6, tOk + 0.5);
      drawCursor(cur, keys, t, c.s, null, V);
    };
  });

  // ===== 10: EXAMEN ENVIADO =====
  scene(10, function (root, T, ctx) {
    const { cam, vp } = device(root);
    shot(vp, '12-examenfin');
    const s13 = shot(vp, '13-enviado-final');
    const a = T.S(0, 0), b = T.S(1, 0);
    const tSwap = b - 0.5;
    const sp = spot(vp, R('13-enviado-final', 'resumen'), 6);
    const vol = R('13-enviado-final', 'volver');
    const okToast = toast(root, '¡Examen enviado!');
    place(okToast, W / 2 - (V ? 210 : 200), V ? SCR.y - 110 : SCR.y + 30);
    // confeti verde
    const conf = Array.from({ length: 46 }, (_, i) => {
      const n = el('confetti', '', root, { background: ['#43a047', '#66bb6a', '#2e7d32', '#a5d6a7', '#f39c12'][i % 5] });
      return { n, x: SCR.x + rnd() * SCR.w, vx: (rnd() - 0.5) * 160, vy: 300 + rnd() * 380, rot: rnd() * 720, d: rnd() * 0.25 };
    });
    const cur = cursor(vp, V);
    const keys = [{ t: T.dur - 1.6, x: SCR.w * 0.75, y: SCR.h * 0.85 }, { t: T.dur - 0.6, ...mid(vol), d: 0.9 }];
    const camKeys = [{ t: 0, ...CAM0 }, { t: tSwap - 0.1, ...focus(R('12-examenfin', 'envio'), V ? 1.05 : 1.1), d: tSwap - 0.3 }, { t: tSwap + 0.5, ...CAM0, d: 0.5 }];
    ev(ctx, tSwap + 0.1, 'chime');
    return function (t) {
      const c = camAt(camKeys, t); camApply(cam, c);
      s13.style.opacity = P(t, tSwap, 0.3);
      pop(okToast, t, tSwap + 0.15, b + 1.6);
      drawSpot(sp, t, b + 0.4, T.dur - 0.4);
      conf.forEach((q) => {
        const tt = t - tSwap - q.d;
        if (tt < 0 || tt > 2.2) { q.n.style.opacity = 0; return; }
        q.n.style.opacity = 1 - P(tt, 1.6, 0.6);
        q.n.style.left = px(q.x + q.vx * tt);
        q.n.style.top = px(SCR.y - 20 + q.vy * tt + 160 * tt * tt);
        q.n.style.transform = `rotate(${q.rot + tt * 420}deg)`;
      });
      drawCursor(cur, keys, t, c.s, null, V);
    };
  });

  // ===== 11: CIERRE =====
  scene(11, function (root, T, ctx) {
    const I = intro(root);
    const l1 = el('abs', 'Tu examen quedó registrado', root, { left: 0, width: W + 'px', textAlign: 'center', color: '#fff', font: `900 ${V ? 64 : 58}px 'Inter'` });
    place(l1, 0, V ? 1130 : 690);
    const l2 = el('abs', 'Consultá tu resultado en el sistema', root, { left: 0, width: W + 'px', textAlign: 'center', color: '#c8e6c9', font: `700 ${V ? 40 : 34}px 'Inter'` });
    place(l2, 0, V ? 1230 : 775);
    const cta = el('abs', 'POLICÍA BOLIVIANA · MINERVA', root, { padding: '14px 34px', borderRadius: '999px', background: '#fff', color: '#1b5e20',
      font: `900 ${V ? 30 : 26}px 'Inter'`, letterSpacing: '.16em' });
    place(cta, W / 2 - (V ? 290 : 255), V ? 1340 : 860);
    ev(ctx, 0.4, 'chime');
    return function (t) {
      I.g.style.transform = `translate(${(t * 8) % 60}px, ${(t * 5) % 60}px)`;
      const r1 = I.rings.querySelector('.r1'); r1.style.strokeDasharray = '1'; r1.style.strokeDashoffset = 1 - inOut(P(t, 0.1, 1.2));
      const pe = P(t, 0.1, 0.8);
      I.emb.style.clipPath = `circle(${inOut(pe) * 75}% at 50% 50%)`;
      I.emb.style.transform = `scale(${lerp(0.7, 1, backOut(pe))})`;
      I.word.style.clipPath = `inset(0 ${100 - inOut(P(t, 0.6, 0.6)) * 100}% 0 0)`;
      pop(l1, t, T.S(0, 0) + 0.1, null, 0.85);
      pop(l2, t, T.S(0, 1), null, 0.85);
      pop(cta, t, T.S(0, 1) + 1.2);
    };
  });

  // ---------- capa global ----------
  // franja superior: la camara puede ampliar el contenido por debajo sin tapar la barra de pasos
  const strip = el('', '', stage, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: (V ? 200 : 104) + 'px', zIndex: 39,
    background: 'linear-gradient(rgba(244,247,245,.98) 80%, rgba(244,247,245,0))' });
  const brand = el('brandbar', '<div class="em"></div>POLICÍA BOLIVIANA · MINERVA', stage);
  if (V) { place(brand, 0, 50); brand.style.width = W + 'px'; brand.style.justifyContent = 'center'; } else place(brand, 40, 40);
  const prog = el('progress', '', stage);
  const PX0 = V ? 90 : 700, PX1 = V ? 990 : 1840, PY = V ? 150 : 62;
  place(prog, 0, 0, W, 1);
  const pl = el('line', '', prog); place(pl, PX0, PY - 2, PX1 - PX0);
  const pf = el('fill', '', prog); place(pf, PX0, PY - 2, 0);
  const pdots = Array.from({ length: 11 }, (_, i) => { const d = el('dot', String(i + 1), prog); place(d, PX0 + (PX1 - PX0) * i / 10, PY); return d; });
  const plab = el('lab', '', prog); place(plab, 0, PY + 22);
  const stitle = el('steptitle', '<div class="n"></div><div><div class="k"></div><div class="t"></div></div>', stage);
  place(stitle, V ? 40 : 270, V ? 205 : 140);
  const subs = el('', '<div class="box"></div>', stage); subs.id = 'subs';
  subs.style.bottom = px(V ? 330 : 22);
  if (V) { subs.firstChild.style.maxWidth = '960px'; subs.firstChild.style.fontSize = '38px'; } else subs.firstChild.style.maxWidth = '1500px';
  const fade = el('', '', stage, { position: 'absolute', inset: 0, background: '#000', zIndex: 80 });

  const TRANS = ['mask', 'whip', 'punch', 'wipe', 'push', 'whip', 'punch', 'mask', 'whip', 'wipe', 'punch'];
  const D = 0.32;
  TL.scenes.slice(1).forEach((s) => EVENTS.push({ t: s.start - 0.22, type: 'whoosh' }));
  SCENES.forEach((s) => s.events.forEach((e) => EVENTS.push({ t: s.T.start + e.t, type: e.type })));
  EVENTS.sort((x, y) => x.t - y.t);
  window.EVENTS = EVENTS;

  function styleScene(sc, role, kind, p) {
    const r = sc.root.style;
    r.display = 'block'; r.transform = ''; r.filter = ''; r.clipPath = ''; r.opacity = 1; r.zIndex = role === 'in' ? 2 : 1;
    if (!kind) return;
    const e = inOut(p);
    if (kind === 'whip') {
      const blur = Math.sin(Math.PI * p) * 14;
      r.transform = `translateX(${role === 'out' ? -e * W : (1 - e) * W}px)`;
      r.filter = `blur(${blur}px)`;
    } else if (kind === 'punch') {
      if (role === 'out') { r.transform = `scale(${1 + 0.22 * e})`; r.opacity = 1 - e; } else { r.transform = `scale(${lerp(0.82, 1, backOut(p))})`; r.opacity = Math.min(1, p * 2); }
    } else if (kind === 'wipe') {
      if (role === 'in') { const X = lerp(-0.35 * W, 1.35 * W, e); r.clipPath = `polygon(0 0, ${X}px 0, ${X - 0.35 * W}px ${H}px, 0 ${H}px)`; }
    } else if (kind === 'mask') {
      if (role === 'in') r.clipPath = `circle(${e * Math.hypot(W, H) * 0.6}px at 50% 50%)`;
    } else if (kind === 'push') {
      r.transform = role === 'out' ? `translateY(${-e * H * 0.35}px)` : `translateY(${(1 - e) * H}px)`;
      if (role === 'out') r.opacity = 1 - 0.5 * e;
    }
  }

  window.seek = function (t) {
    drawBg(t);
    const N = TL.scenes.length;
    let idx = TL.scenes.findIndex((s) => t >= s.start && t < s.start + s.dur);
    if (idx < 0) idx = N - 1;
    let pair = null;
    const b0 = TL.scenes[idx].start, b1 = idx < N - 1 ? TL.scenes[idx + 1].start : Infinity;
    if (idx > 0 && t - b0 < D) pair = [idx - 1, idx, (t - (b0 - D)) / (2 * D), TRANS[idx - 1]];
    else if (b1 - t < D) pair = [idx, idx + 1, (t - (b1 - D)) / (2 * D), TRANS[idx]];
    SCENES.forEach((s, i) => {
      if (pair ? (i === pair[0] || i === pair[1]) : i === idx) return;
      s.root.style.display = 'none';
    });
    if (pair) {
      const [o, n, p, kind] = pair;
      styleScene(SCENES[o], 'out', kind, p); SCENES[o].update(t - TL.scenes[o].start);
      styleScene(SCENES[n], 'in', kind, p); SCENES[n].update(t - TL.scenes[n].start);
    } else {
      styleScene(SCENES[idx], 'solo'); SCENES[idx].update(t - TL.scenes[idx].start);
    }

    // barra de pasos y rotulo cinetico
    const sid = TL.scenes[idx].id, lt = t - TL.scenes[idx].start;
    const showProg = sid >= 1 && sid <= 10;
    const po = showProg ? ease(P(lt, 0, 0.4)) : (sid === 11 ? 1 - P(lt, 0, 0.3) : 0);
    prog.style.opacity = po; brand.style.opacity = showProg ? 1 : 0; strip.style.opacity = po;
    const cur = clamp(sid, 1, 11);
    const fillP = (cur - 1 + (showProg ? ease(P(lt, 0.1, 0.6)) * 0 : 0)) / 10;
    pf.style.width = px((PX1 - PX0) * fillP);
    pdots.forEach((d, i) => { d.className = 'dot' + (i + 1 < cur ? ' done' : i + 1 === cur ? ' cur' : ''); d.style.transform = `translate(-50%,-50%) scale(${i + 1 === cur ? 1 + 0.25 * backOut(P(lt, 0.1, 0.5)) * (1 - P(lt, 0.8, 0.5)) + 0.15 : 1})`; });
    const st = STEPS[cur];
    plab.textContent = `PASO ${cur} · ${st[0]}`;
    plab.style.left = px(clamp(PX0 + (PX1 - PX0) * (cur - 1) / 10, PX0 + 90, PX1 - 90));
    if (showProg) {
      stitle.querySelector('.n').textContent = String(sid).padStart(2, '0');
      stitle.querySelector('.k').textContent = `PASO ${sid} DE 11`;
      stitle.querySelector('.t').textContent = `${st[0]} · ${st[1]}`;
      const pin = backOut(P(lt, 0.05, 0.5)), pout = easeIn(P(lt, 1.8, 0.35));
      stitle.style.opacity = P(lt, 0.05, 0.12) * (1 - pout);
      stitle.style.transform = `translate(${(1 - Math.min(1, pin)) * -80}px, ${-pout * 30}px) scale(${lerp(0.7, 1, pin)})`;
    } else stitle.style.opacity = 0;

    const cue = TL.cues.find((c) => t >= c.start && t < c.end);
    if (cue) { subs.firstChild.textContent = cue.text; subs.style.opacity = P(t, cue.start, 0.1) * (1 - P(t, cue.end - 0.1, 0.1)); } else subs.style.opacity = 0;
    fade.style.opacity = Math.max(1 - P(t, 0, 0.5), P(t, TL.duration - 1.0, 0.9));
  };

  window.ready = (async function () {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
    window.seek(0);
    return true;
  })();
})();
