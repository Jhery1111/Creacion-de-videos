/* Tutorial SISCOP · rol Secretaria (horizontal 1920x1080).
 * Motor compartido: ../tutorial/core.js (seek determinista, cursor, camara, tiempos de la voz).
 * Las capturas son pantallas reales de SISCOP con datos ficticios; las posiciones de los
 * controles salen del DOM al capturar (build/targets.js, en pixeles de la captura 3200x1800).
 * Movimiento: curva firma (0.4,0,0.2,1), rotulos con resorte suave, cambios de pantalla por fundido.
 */
(function () {
  'use strict';
  const { bez, ease, easeIn, clamp, P, lerp, el, px, place, reveal, ICON, TL, cursor, drawCursor, camAt, applyCam,
    VIEW, highlight, drawHighlight, scene, ev, SCENES, EVENTS } = window.CORE;

  const backOut = bez(0.34, 1.4, 0.64, 1);
  const inOut = bez(0.65, 0, 0.35, 1);
  const TG = window.TARGETS;
  const W = TL.width, H = TL.height;
  const CAPW = 3200;
  const SCR = { x: 240, y: 152, w: 1440, h: 810 };
  const K = SCR.w / CAPW;
  VIEW.cx = SCR.x + SCR.w / 2; VIEW.cy = SCR.y + SCR.h / 2;
  const CAM0 = { x: VIEW.cx, y: VIEW.cy, s: 1 };
  const stage = document.getElementById('stage');
  const src = (cap) => `caps/${cap}.png`;

  const SVG = (d, sw) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 2.2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const IC = {
    send: SVG('<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>'),
    inbox: SVG('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
    route: SVG('<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>'),
    archive: SVG('<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9"/><path d="M10 13h4"/>'),
    reply: SVG('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v6"/>'),
    file: SVG('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h6"/>'),
    clock: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    users: SVG('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
    tree: SVG('<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>'),
    bell: SVG('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    gear: SVG('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
    hand: SVG('<path d="M7 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M10 10V4a1.5 1.5 0 0 1 3 0v6"/><path d="M13 10V5a1.5 1.5 0 0 1 3 0v7"/><path d="M16 9a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-1a6 6 0 0 1-4.8-2.4L3.5 15a1.6 1.6 0 0 1 2.4-2L7 14.2V11"/>'),
    once: SVG('<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5h5"/><path d="M17 3v4h4"/>'),
    check: ICON.check, alert: ICON.alert, mail: ICON.mail, search: ICON.search,
  };

  // ---------- geometria (captura -> pantalla del video) ----------
  function R(cap, key, pad) {
    const b = TG[cap] && TG[cap][key];
    if (!b) throw new Error(`falta objetivo ${cap}.${key}`);
    pad = pad || 0;
    return { x: b[0] * K - pad, y: b[1] * K - pad, w: (b[2] - b[0]) * K + 2 * pad, h: (b[3] - b[1]) * K + 2 * pad };
  }
  const box = (b) => ({ x: b[0] * K, y: b[1] * K, w: (b[2] - b[0]) * K, h: (b[3] - b[1]) * K });
  const pt = (x, y) => ({ x: x * K, y: y * K });
  const mid = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const union = (...rs) => {
    const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
    const x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  const focus = (r, s) => { const m = mid(r); return { x: SCR.x + m.x, y: SCR.y + m.y, s }; };
  function camApply(node, c) {
    if (c.s > 1) {
      const mx = (SCR.w / 2) * (1 - 1 / c.s), my = (SCR.h / 2) * (1 - 1 / c.s);
      c = { x: clamp(c.x, VIEW.cx - mx, VIEW.cx + mx), y: clamp(c.y, VIEW.cy - my, VIEW.cy + my), s: c.s };
    }
    applyCam(node, c);
  }
  const rr = (cap, key, pad) => (typeof key === 'string' ? R(cap, key, pad) : key);

  // ---------- piezas ----------
  function device(root) {
    const cam = el('cam', '', root);
    const f = el('frame-browser', `<div class="chrome"><i></i><i></i><i></i><div class="url">${ICON.lock.replace('<svg', '<svg width="14" height="14"')}SISCOP · Sistema de Correspondencia Policial</div></div>`, cam);
    place(f, SCR.x, SCR.y - 40, SCR.w, SCR.h + 40);
    const vp = el('viewport', '', cam);
    place(vp, SCR.x, SCR.y, SCR.w, SCR.h);
    return { cam, vp };
  }
  function drawSpot(n, t, a, out) {
    const p = ease(P(t, a, 0.35));
    n.style.opacity = p * (out != null ? 1 - P(t, out, 0.3) : 1);
    n.style.transform = `scale(${lerp(1.08, 1, p)})`;
  }
  function pop(n, t, a, out, from) {
    const p = backOut(P(t, a, 0.5));
    n.style.opacity = P(t, a, 0.12) * (out != null ? 1 - P(t, out, 0.3) : 1);
    n.style.transform = `translateY(${(1 - Math.min(1, p)) * 22}px) scale(${lerp(from == null ? 0.7 : from, 1, p)})`;
  }
  function drawLens(n, t, a, out) {
    const p = backOut(P(t, a, 0.45));
    const q = out != null ? P(t, out, 0.25) : 0;
    n.style.opacity = P(t, a, 0.12) * (1 - q);
    n.style.transform = `scale(${Math.max(0, p) * (1 - 0.3 * q)})`;
  }

  /* Kit de escena: una pantalla de navegador con capturas que se suceden, un cursor,
   * una camara y capas de enfasis. Cada metodo agrega una pieza con sus tiempos. */
  function kit(root, ctx) {
    const { cam, vp } = device(root);
    const shots = [], items = [], keys = [], camKeys = [{ t: 0, ...CAM0 }];
    // tiempo en pantalla de una captura: desde su aparicion hasta que la siguiente la tapa
    const ventana = (cap) => {
      const i = shots.findIndex((s) => s.cap === cap);
      if (i < 0) return [0, Infinity];
      return [shots[i].t, i + 1 < shots.length ? shots[i + 1].t + shots[i + 1].d : Infinity];
    };
    // fin de un parche de escritura: la primera pantalla posterior que no es la captura llena
    const finDe = (cap, t0) => {
      const s = shots.find((q) => q.t > t0 && q.cap !== cap);
      return s ? s.t + s.d : Infinity;
    };
    const k = {
      vp,
      shot(cap, t, fadeD) {
        const im = document.createElement('img');
        im.className = 'shot'; im.src = src(cap);
        im.style.zIndex = String(1 + shots.length);
        vp.appendChild(im);
        shots.push({ cap, im, t: t || 0, d: fadeD == null ? 0.25 : fadeD });
        return k;
      },
      spot(cap, key, a, out, pad) {
        const r = rr(cap, key);
        pad = pad == null ? 8 : pad;
        const n = el('spot', '', vp); place(n, r.x - pad, r.y - pad, r.w + 2 * pad, r.h + 2 * pad);
        items.push((t) => drawSpot(n, t, a, out));
        return k;
      },
      hl(cap, key, a, out, pad) {
        const n = highlight(vp, rr(cap, key), pad == null ? 5 : pad);
        items.push((t) => drawHighlight(n, t, a, out));
        return k;
      },
      lens(cap, key, a, out, o) {
        o = o || {};
        const r = rr(cap, key);
        const L = o.size || 220, Z = o.zoom || 2.2;
        const n = el('lens', '', vp);
        n.style.width = n.style.height = px(L);
        const c = mid(r);
        n.style.backgroundImage = `url(${src(cap)})`;
        n.style.backgroundSize = `${SCR.w * Z}px auto`;
        n.style.backgroundPosition = `${-(c.x * Z - L / 2)}px ${-(c.y * Z - L / 2)}px`;
        const lx = clamp(c.x + (o.dx == null ? 170 : o.dx), L / 2 + 8, SCR.w - L / 2 - 8);
        const ly = clamp(c.y + (o.dy == null ? -150 : o.dy), L / 2 + 8, SCR.h - L / 2 - 8);
        place(n, lx - L / 2, ly - L / 2);
        items.push((t) => drawLens(n, t, a, out));
        return k;
      },
      move(cap, key, t, d) { keys.push({ t, ...mid(rr(cap, key)), d: d || 0.8 }); return k; },
      at(p, t, d) { keys.push({ t, x: p.x, y: p.y, d: d || 0.8 }); return k; },
      click(cap, key, t, d) {
        keys.push({ t, ...mid(rr(cap, key)), d: d || 0.8, click: true });
        ev(ctx, t, 'click');
        return k;
      },
      zoom(r, s, t, d) { camKeys.push({ t, ...focus(r, s), d: d || 0.9 }); return k; },
      home(t, d) { camKeys.push({ t, ...CAM0, d: d || 0.8 }); return k; },
      // escritura simulada: revela el campo lleno (de otra captura) de izquierda a derecha
      type(capFilled, key, t0, dur) {
        const r = R(capFilled, key);
        const n = el('patch', `<img src="${src(capFilled)}">`, vp);
        place(n, r.x, r.y, r.w, r.h);
        const im = n.firstChild; im.style.width = px(SCR.w); im.style.left = px(-r.x); im.style.top = px(-r.y);
        const fin = finDe(capFilled, t0);
        items.push((t) => {
          n.style.display = t < fin ? 'block' : 'none';
          n.style.opacity = P(t, t0 - 0.05, 0.1);
          const p = P(t, t0, dur);
          n.style.clipPath = `inset(0 ${100 - lerp(14, 100, p)}% 0 0)`;
        });
        for (let x = t0; x < t0 + dur; x += 0.075) ev(ctx, x, 'key');
        return k;
      },
      // campo ya lleno en la captura: se tapa su valor y se descubre al escribir
      cover(cap, key, t0, dur, o) {
        o = o || {};
        const r = R(cap, key);
        const l = o.l == null ? 34 : o.l, tp = o.t == null ? 8 : o.t, rt = o.r == null ? 6 : o.r, bt = o.b == null ? 5 : o.b;
        const n = el('cover', '', vp, { background: o.bg || '#fff' });
        place(n, r.x + l, r.y + tp, r.w - l - rt, r.h - tp - bt);
        const [ini, fin] = ventana(cap);
        items.push((t) => {
          const p = P(t, t0, dur);
          n.style.clipPath = `inset(0 0 0 ${p * 100}%)`;
          n.style.display = p >= 1 || t < Math.max(ini, o.from || 0) || t >= fin ? 'none' : 'block';
        });
        for (let x = t0; x < t0 + dur; x += 0.075) ev(ctx, x, 'key');
        return k;
      },
      // muestra una region de otra captura (estado anterior) hasta 'out'
      patch(capSrc, r, a, out) {
        const n = el('patch', `<img src="${src(capSrc)}">`, vp);
        place(n, r.x, r.y, r.w, r.h);
        const im = n.firstChild; im.style.width = px(SCR.w); im.style.left = px(-r.x); im.style.top = px(-r.y);
        items.push((t) => { n.style.display = t >= a && t < out ? 'block' : 'none'; });
        return k;
      },
      tip(text, small, a, out, o) {
        o = o || {};
        const n = el('tip' + (o.warn ? ' warn' : ''), `<div class="ic">${o.icon || (o.warn ? IC.alert : IC.check)}</div><div>${small ? `<small>${small}</small>` : ''}${text}</div>`, root);
        const pos = o.pos || 'tr';
        if (pos[1] === 'r') n.style.right = px(W - (SCR.x + SCR.w) + 26); else n.style.left = px(SCR.x + 26);
        n.style.top = px(pos[0] === 't' ? SCR.y + 24 : SCR.y + SCR.h - 112);
        if (o.x != null) { n.style.left = px(o.x); n.style.right = ''; }
        if (o.y != null) n.style.top = px(o.y);
        n.style.transformOrigin = pos[1] === 'r' ? '100% 0' : '0 0';
        items.push((t) => pop(n, t, a, out));
        ev(ctx, a, 'pop');
        return k;
      },
      sfx(t, type) { ev(ctx, t, type); return k; },
      draw(fn) { items.push(fn); return k; },
      done() {
        keys.sort((x, y) => x.t - y.t);
        camKeys.sort((x, y) => x.t - y.t);
        const cur = keys.length ? cursor(vp, false) : null;
        if (cur) cur.style.zIndex = 40;
        return function (t) {
          const c = camAt(camKeys, t); camApply(cam, c);
          let top = 0;
          shots.forEach((s, i) => { if (t >= s.t) top = i; });
          shots.forEach((s, i) => {
            const o = i === 0 ? 1 : P(t, s.t, s.d);
            const covered = shots.some((q, j) => j > i && t >= q.t + q.d);
            s.im.style.opacity = o;
            s.im.style.display = i > top || covered ? 'none' : 'block';
          });
          items.forEach((f) => f(t, c));
          if (cur) drawCursor(cur, keys, t, c.s, null, false);
        };
      },
    };
    return k;
  }

  // ---------- fondo animado global ----------
  const bgfx = el('bgfx', '', stage);
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const blobs = Array.from({ length: 5 }, () => ({ x: rnd() * W, y: rnd() * H, r: 260 + rnd() * 260, ph: rnd() * 6.28, sp: 0.05 + rnd() * 0.06 }));
  const dots = Array.from({ length: 40 }, () => ({ x: rnd() * W, y: rnd() * H, r: 2 + rnd() * 3, vy: -6 - rnd() * 10, ph: rnd() * 6.28 }));
  bgfx.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0">
    <defs><radialGradient id="bl"><stop offset="0" stop-color="#77a845" stop-opacity=".2"/><stop offset="1" stop-color="#77a845" stop-opacity="0"/></radialGradient></defs>
    <g class="blobs">${blobs.map(() => '<circle fill="url(#bl)"/>').join('')}</g>
    <g fill="#45751b" class="dots">${dots.map(() => '<circle/>').join('')}</g></svg>`;
  const blobEls = [...bgfx.querySelectorAll('.blobs circle')], dotEls = [...bgfx.querySelectorAll('.dots circle')];
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
      dotEls[i].style.opacity = 0.16 + 0.1 * Math.sin(t * 1.5 + d.ph);
    });
  }

  // ---------- capitulos ----------
  const STEPS = {
    1: ['INICIO', 'Panel de correspondencia'], 2: ['CONFIGURACIÓN', 'Remitente y hoja de ruta'],
    3: ['NUEVA', 'Tipo y documento'], 4: ['NUEVA', 'Referencia e instrucciones'], 5: ['ENVIAR', 'A unidades de nivel 1'],
    6: ['BANDEJA DE ENTRADA', 'Lo que llega'], 7: ['RECEPCIONAR', 'Recibir o rechazar'], 8: ['DERIVAR', 'A una dependencia'],
    9: ['SEGUIMIENTO', 'Ruta y árbol'], 10: ['RESPONDER', 'Respuesta al remitente'], 11: ['SALIDA Y ARCHIVO', 'Lo que enviaste'],
    12: ['TERCEROS', 'Ventanilla'], 13: ['ADSCRIPCIONES', 'Personal de la unidad'], 14: ['ORGANIGRAMA', 'Dependencias'],
    15: ['AVISOS', 'Notificaciones y perfil'],
  };
  const NCH = 15;

  function greenBg(root) {
    root.classList.add('green-bg');
    const g = el('grid-green', '', root);
    const rings = el('abs', `<svg width="${W}" height="${H}"><g fill="none" stroke="#b5d398" stroke-opacity=".22">
      <circle class="r1" cx="${W / 2}" cy="330" r="230" stroke-width="2" pathLength="1"/>
      <circle class="r2" cx="${W / 2}" cy="330" r="285" stroke-width="1.5" pathLength="1" stroke-dasharray=".02 .03"/></g></svg>`, root, { left: 0, top: 0 });
    return { g, rings };
  }
  function drawGreen(G, t) {
    G.g.style.transform = `translate(${(t * 8) % 60}px, ${(t * 5) % 60}px)`;
    const r1 = G.rings.querySelector('.r1'); r1.style.strokeDasharray = '1'; r1.style.strokeDashoffset = 1 - inOut(P(t, 0.2, 1.4));
    const r2 = G.rings.querySelector('.r2'); r2.style.transformOrigin = `${W / 2}px 330px`; r2.style.transform = `rotate(${t * 12}deg)`;
  }
  // emblema: sobre que recorre una ruta (dibujado, sin logos de terceros)
  function emblem(root, cx, cy, size) {
    const n = el('abs', `<svg width="${size}" height="${size}" viewBox="0 0 120 120">
      <rect x="6" y="6" width="108" height="108" rx="30" fill="#fff"/>
      <path class="rt" pathLength="1" d="M22 92 C 40 92, 40 70, 58 70 S 80 50, 98 50" fill="none" stroke="#77a845" stroke-width="5" stroke-linecap="round" stroke-dasharray="1"/>
      <g class="env"><rect x="34" y="30" width="52" height="38" rx="6" fill="#45751b"/><path d="M36 33 L60 52 L84 33" fill="none" stroke="#fff" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/></g>
      <circle cx="22" cy="92" r="6" fill="#223d16"/><circle class="end" cx="98" cy="50" r="6" fill="#223d16"/></svg>`, root);
    place(n, cx - size / 2, cy - size / 2);
    return n;
  }

  // ===== 0: PRESENTACION =====
  scene(0, function (root, T, ctx) {
    const G = greenBg(root);
    const em = emblem(root, W / 2, 330, 260);
    const word = el('abs', 'SISCOP', root, { left: 0, width: W + 'px', textAlign: 'center', color: '#fff', font: "900 150px/1 'Inter'", letterSpacing: '.04em' });
    place(word, 0, 488);
    const tag = el('abs', 'POLICÍA BOLIVIANA · SISTEMA DE CORRESPONDENCIA POLICIAL', root, {
      left: 0, width: W + 'px', textAlign: 'center', color: '#d3e6c1', font: "700 22px 'Inter'", letterSpacing: '.16em' });
    place(tag, 0, 90);
    const sub = el('abs', 'GUÍA DEL ROL SECRETARIA', root, { padding: '12px 32px', borderRadius: '999px', background: '#fff', color: '#223d16',
      font: "900 30px 'Inter'", letterSpacing: '.16em' });
    place(sub, W / 2 - 250, 672);
    const items = [['Registrar', IC.file], ['Enviar', IC.send], ['Recepcionar', IC.inbox], ['Responder', IC.reply]];
    const pills = items.map(([txt, ic], i) => {
      const c = el('pill', `<div class="ic">${ic}</div>${txt}`, root);
      place(c, 250 + i * 365, 800);
      return c;
    });
    const u1 = T.S(1, 0);
    ev(ctx, 0.5, 'chime');
    pills.forEach((_, i) => ev(ctx, u1 + 0.5 + i * 0.35, 'pop'));
    return function (t) {
      drawGreen(G, t);
      const pe = P(t, 0.2, 0.8);
      em.style.opacity = P(t, 0.2, 0.2);
      em.style.transform = `scale(${lerp(0.6, 1, backOut(pe))})`;
      const rt = em.querySelector('.rt'); rt.style.strokeDashoffset = 1 - inOut(P(t, 0.7, 1.0));
      em.querySelector('.env').style.transform = `translate(${Math.sin(t * 1.6) * 2}px, ${Math.cos(t * 1.3) * 2}px)`;
      word.style.clipPath = `inset(0 ${100 - inOut(P(t, 0.9, 0.7)) * 100}% 0 0)`;
      reveal(tag, t, 1.3, { d: 0.5, dy: -14 });
      pop(sub, t, 1.8, null, 0.85);
      pills.forEach((c, i) => pop(c, t, u1 + 0.5 + i * 0.35));
    };
  });

  // ===== 1: INICIO =====
  scene(1, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S, C = '01-inicio';
    k.shot(C);
    const corr = box([0, 345, 520, 690]), aj = box([0, 800, 520, 1070]);
    k.zoom(R(C, 'kpis'), 1.28, S(0, 1) + 0.4, 1.0).home(S(1, 0) + 0.3, 0.8);
    k.spot(C, 'kpis', S(0, 1) + 0.2, S(1, 0) - 0.1, 6);
    k.spot(C, corr, S(1, 0) + 0.4, S(1, 1) - 0.1, 2);
    k.spot(C, aj, S(1, 1) + 0.1, T.dur - 0.3, 2);
    k.at(pt(2200, 900), S(0, 0) + 0.6, 0.6).at(pt(800, 330), S(0, 1) + 0.6, 1.0).at(pt(1500, 330), S(0, 2) + 0.4, 1.2)
      .at(pt(200, 380), S(1, 0) + 0.8, 0.9).at(pt(200, 645), S(1, 0) + 2.6, 1.2)
      .at(pt(200, 852), S(1, 1) + 0.7, 0.8).at(pt(200, 1028), S(1, 1) + 2.4, 1.0);
    k.tip('2 pendientes', 'Tu unidad hoy', S(0, 1) + 0.9, S(1, 0) - 0.2, { icon: IC.inbox, pos: 'br' });
    return k.done();
  });

  // ===== 2: CONFIGURACION =====
  scene(2, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S, E = T.E;
    const a = S(0, 0), b = S(0, 1), c = S(0, 2), g = S(1, 0), h = S(2, 0), h2 = S(2, 1);
    const tSave = g + 0.9, tTab = h + 0.7;
    k.shot('02-config-vacia').shot('03-config-llena', c + 3.6, 0.01).shot('04-config-guardada', tSave + 0.15).shot('05-config-hr', tTab + 0.15);
    k.click('02-config-vacia', 'menu', a + 1.2, 1.0).click('02-config-vacia', 'tab', b + 0.7, 0.9);
    k.hl('02-config-vacia', 'tab', b + 0.6, c, 3);
    const form = union(R('02-config-vacia', 'nombre'), R('02-config-vacia', 'cargo'), R('02-config-vacia', 'guardar'));
    k.zoom(form, 1.38, c + 0.2, 0.9);
    k.type('03-config-llena', 'nombre', c + 0.5, 1.1).hl('03-config-llena', 'nombre', c + 0.4, c + 1.7, 3)
      .type('03-config-llena', 'cargo', c + 1.8, 1.3).hl('03-config-llena', 'cargo', c + 1.7, c + 3.2, 3)
      .type('03-config-llena', 'telefono', c + 3.2, 0.5).hl('03-config-llena', 'telefono', c + 3.1, c + 3.9, 3);
    k.at(mid(R('02-config-vacia', 'nombre')), c + 0.4, 0.8).at(mid(R('02-config-vacia', 'cargo')), c + 1.7, 0.6)
      .at(mid(R('02-config-vacia', 'telefono')), c + 3.1, 0.6);
    k.click('03-config-llena', 'guardar', tSave, 0.9).lens('03-config-llena', 'guardar', tSave - 0.6, tSave + 0.5, { dx: -260, dy: -110 });
    k.spot('04-config-guardada', 'aviso', tSave + 0.4, h - 0.1, 4).sfx(tSave + 0.3, 'chime');
    k.tip('Se completa solo en cada documento', 'Remitente guardado', S(1, 1) + 0.1, h - 0.2, { icon: IC.check });
    k.home(h + 0.1, 0.7).click('05-config-hr', 'tab', tTab, 0.9);
    const hr = union(R('05-config-hr', 'activar'), R('05-config-hr', 'inicial'), R('05-config-hr', 'guardar'));
    k.zoom(hr, 1.3, tTab + 0.9, 0.9);
    k.spot('05-config-hr', 'activar', tTab + 0.6, h2 - 0.1, 5).spot('05-config-hr', 'inicial', h2 + 0.1, h2 + 1.4, 5)
      .spot('05-config-hr', 'prefijo', h2 + 1.4, T.dur - 0.3, 5);
    k.at(mid(R('05-config-hr', 'inicial')), h2 + 0.3, 0.7).at(mid(R('05-config-hr', 'prefijo')), h2 + 1.6, 0.7);
    return k.done();
  });

  // ===== 3: NUEVA CORRESPONDENCIA (pasos 1 y 2) =====
  scene(3, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S;
    const tNew = S(0, 0) + 1.6, tNext = S(2, 0) - 0.1, tPdf = S(3, 0) + 1.2;
    k.shot('01-inicio').shot('06-nueva-p1', tNew + 0.15).shot('07-nueva-p2-vacia', tNext + 0.15).shot('08-nueva-p2-llena', tPdf + 0.15);
    k.click('01-inicio', 'nueva', tNew, 1.2).lens('01-inicio', 'nueva', tNew - 0.6, tNew + 0.4, { dx: -260, dy: 140 });
    k.spot('06-nueva-p1', 'pasos', S(0, 1) + 0.1, S(1, 0) - 0.1, 4);
    k.tip('5 pasos', 'Registro', S(0, 1) + 0.3, S(1, 0) - 0.2, { icon: IC.file });
    const opts = union(R('06-nueva-p1', 'interno'), R('06-nueva-p1', 'externo'), R('06-nueva-p1', 'clasificaciones'));
    k.zoom(opts, 1.22, S(1, 0) + 0.4, 0.9);
    k.spot('06-nueva-p1', 'interno', S(1, 0) + 0.3, S(1, 1) - 0.05, 4).spot('06-nueva-p1', 'externo', S(1, 1), S(1, 2) - 0.05, 4);
    k.move('06-nueva-p1', 'interno', S(1, 0) + 0.6, 0.9).move('06-nueva-p1', 'externo', S(1, 1) + 0.3, 0.8);
    const tNorm = S(1, 2) + 1.2;
    k.hl('06-nueva-p1', 'clasificaciones', S(1, 2) + 0.1, tNext - 0.2, 4).click('06-nueva-p1', 'normal', tNorm, 0.8)
      .lens('06-nueva-p1', 'normal', tNorm - 0.5, tNorm + 0.6, { dx: 120, dy: -150 });
    k.click('06-nueva-p1', 'siguiente', tNext, 0.9).home(tNext - 0.1, 0.6);
    const s2 = S(2, 0) + 0.2;
    const form = union(R('07-nueva-p2-vacia', 'numero'), R('07-nueva-p2-vacia', 'hojas'), R('07-nueva-p2-vacia', 'hojaRuta'));
    k.zoom(form, 1.35, s2 + 0.6, 0.8);
    k.type('08-nueva-p2-llena', 'numero', s2 + 0.5, 1.2).hl('07-nueva-p2-vacia', 'numero', s2 + 0.4, s2 + 1.8, 3)
      .hl('07-nueva-p2-vacia', 'fecha', s2 + 1.8, s2 + 2.5, 3)
      .type('08-nueva-p2-llena', 'tipo', s2 + 2.6, 0.35).hl('07-nueva-p2-vacia', 'tipo', s2 + 2.5, s2 + 3.3, 3)
      .type('08-nueva-p2-llena', 'hojas', s2 + 3.4, 0.25).hl('07-nueva-p2-vacia', 'hojas', s2 + 3.3, S(2, 1), 3);
    k.at(mid(R('07-nueva-p2-vacia', 'numero')), s2 + 0.4, 0.7).at(mid(R('07-nueva-p2-vacia', 'tipo')), s2 + 2.5, 0.6)
      .at(mid(R('07-nueva-p2-vacia', 'hojas')), s2 + 3.3, 0.5);
    k.spot('07-nueva-p2-vacia', 'hojaRuta', S(2, 1) + 0.05, S(3, 0) - 0.1, 5);
    k.tip('Hoja de ruta sugerida', 'Automático', S(2, 1) + 0.2, S(3, 0) - 0.2, { icon: IC.route });
    k.zoom(R('07-nueva-p2-vacia', 'pdf'), 1.25, S(3, 0) + 0.5, 0.7);
    k.click('07-nueva-p2-vacia', 'pdf', tPdf, 0.8).spot('08-nueva-p2-llena', 'pdf', tPdf + 0.4, T.dur - 0.3, 6);
    return k.done();
  });

  // ===== 4: NUEVA CORRESPONDENCIA (pasos 3 a 5) =====
  scene(4, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S, E = T.E;
    const t1 = S(1, 0) - 0.2, t2 = S(2, 0) - 0.2, tReg = S(3, 0) + 1.0;
    k.shot('09-nueva-p3').shot('10-nueva-p4', t1 + 0.15).shot('11-nueva-p5', t2 + 0.15).shot('12-registrada', tReg + 0.15);
    const rem = union(R('09-nueva-p3', 'nombre'), R('09-nueva-p3', 'cargo'), R('09-nueva-p3', 'telefono'));
    k.zoom(union(rem, R('09-nueva-p3', 'referencia')), 1.3, S(0, 0) + 0.5, 0.9);
    k.spot('09-nueva-p3', rem, S(0, 0) + 0.4, S(0, 1) - 0.1, 6);
    k.tip('Viene de Configuración', 'Remitente', S(0, 0) + 0.8, S(0, 1) - 0.1, { icon: IC.gear });
    k.cover('09-nueva-p3', 'referencia', S(0, 1) + 0.6, 1.6, { t: 8, b: 30 }).hl('09-nueva-p3', 'referencia', S(0, 1) + 0.4, E(0) + 0.2, 3);
    k.at(mid(R('09-nueva-p3', 'referencia')), S(0, 1) + 0.4, 0.8);
    k.click('09-nueva-p3', 'siguiente', t1, 0.8).home(t1 + 0.1, 0.6);
    k.spot('10-nueva-p4', 'archivos', S(1, 0) + 0.4, S(1, 0) + 2.4, 6).spot('10-nueva-p4', 'enlace', S(1, 0) + 2.4, t2 - 0.3, 6);
    k.tip('Paso opcional', 'Anexos', S(1, 0) + 0.6, t2 - 0.3, { icon: IC.file });
    k.click('10-nueva-p4', 'siguiente', t2, 0.9);
    const g = R('11-nueva-p5', 'grilla');
    k.zoom(g, 1.3, S(2, 0) + 0.6, 0.9);
    k.spot('11-nueva-p5', 'grilla', S(2, 0) + 0.3, S(2, 1), 4);
    k.click('11-nueva-p5', 'informar', S(2, 1) + 0.3, 0.7).hl('11-nueva-p5', 'informar', S(2, 1) + 0.3, S(3, 0), 3)
      .click('11-nueva-p5', 'responder', S(2, 1) + 1.1, 0.6).hl('11-nueva-p5', 'responder', S(2, 1) + 1.1, S(3, 0), 3);
    k.home(S(3, 0) - 0.3, 0.6).click('11-nueva-p5', 'registrar', tReg, 1.0)
      .lens('11-nueva-p5', 'registrar', tReg - 0.6, tReg + 0.4, { dx: -260, dy: -120 });
    k.spot('12-registrada', 'aviso', tReg + 0.4, S(3, 1) + 0.2, 4).sfx(tReg + 0.3, 'chime');
    k.zoom(R('12-registrada', 'codigo'), 1.3, S(3, 1) + 0.6, 0.8);
    k.spot('12-registrada', 'codigo', S(3, 1) + 0.3, T.dur - 0.2, 6);
    k.tip('Código único', 'Correspondencia registrada', S(3, 1) + 0.4, T.dur - 0.2, { icon: IC.check, pos: 'br' });
    return k.done();
  });

  // ===== 5: ENVIAR =====
  scene(5, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S, E = T.E;
    const tEnv = S(0, 1) + 0.9, tMore = S(1, 0) + 1.3, tSend = S(2, 0) - 0.3, tOk = E(2) + 0.3;
    k.shot('12-registrada').shot('13-enviar-buscar', tEnv + 0.15).shot('14-enviar-seleccion', tMore + 0.1, 0.15)
      .shot('15-enviar-confirmar', tSend + 0.15).shot('16-enviada', tOk + 0.15);
    k.spot('12-registrada', 'estado', S(0, 0) + 0.2, S(0, 1) + 0.2, 6);
    k.tip('Registrada no es enviada', 'Estado: Pendiente', S(0, 0) + 0.3, tEnv - 0.1, { icon: IC.alert, warn: true });
    k.click('12-registrada', 'enviar', tEnv, 1.0).lens('12-registrada', 'enviar', tEnv - 0.6, tEnv + 0.4, { dx: -250, dy: 140 });
    k.zoom(R('13-enviar-buscar', 'dialogo'), 1.32, tEnv + 0.5, 0.8);
    k.cover('13-enviar-buscar', 'buscar', tEnv + 0.8, 0.7, { l: 40, from: tEnv + 0.1 }).hl('13-enviar-buscar', 'buscar', tEnv + 0.7, tEnv + 1.8, 3);
    k.at(mid(R('13-enviar-buscar', 'buscar')), tEnv + 0.7, 0.6).click('13-enviar-buscar', 'fila', tEnv + 2.0, 0.6);
    k.hl('13-enviar-buscar', 'fila', tEnv + 2.0, tMore, 2);
    k.cover('14-enviar-seleccion', 'buscar', tMore + 0.15, 0.5, { l: 40, from: tMore }).click('14-enviar-seleccion', 'fila', tMore + 1.0, 0.6)
      .hl('14-enviar-seleccion', 'fila', tMore + 1.0, tSend, 2);
    k.tip('Envío inicial: unidades de nivel 1', 'Destinos', S(1, 1) + 0.1, tSend - 0.2, { icon: IC.send, pos: 'br' });
    k.click('14-enviar-seleccion', 'enviar', tSend, 0.8);
    k.zoom(R('15-enviar-confirmar', 'lista'), 1.4, tSend + 0.6, 0.6);
    k.spot('15-enviar-confirmar', 'lista', S(2, 0) + 0.3, S(2, 1), 4).spot('15-enviar-confirmar', 'aviso', S(2, 1) + 0.05, tOk - 0.1, 4);
    k.tip('No se puede deshacer', 'Antes de confirmar', S(2, 1) + 0.2, tOk, { warn: true, pos: 'br' });
    k.click('15-enviar-confirmar', 'confirmar', tOk, 0.9).home(tOk + 0.2, 0.6);
    k.spot('16-enviada', 'aviso', tOk + 0.4, T.dur - 0.2, 4).spot('16-enviada', 'estado', tOk + 0.4, T.dur - 0.2, 6).sfx(tOk + 0.3, 'chime');
    return k.done();
  });

  // ===== 6: BANDEJA DE ENTRADA =====
  scene(6, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S;
    const tRow = S(1, 0) + 0.9;
    k.shot('17-entrada').shot('18-panel', tRow + 0.15);
    k.click('17-entrada', 'menu', S(0, 0) + 1.1, 1.0).hl('17-entrada', 'menu', S(0, 0) + 1.1, S(0, 1), 2);
    k.spot('17-entrada', 'carpetas', S(0, 1) + 0.05, S(1, 0) - 0.05, 2);
    k.at(mid(R('17-entrada', 'pendientes')), S(0, 1) + 0.9, 0.7).hl('17-entrada', 'pendientes', S(0, 1) + 1.0, S(1, 0) - 0.1, 2);
    k.tip('Pendiente → Recepcionado → Atendido', 'Estados', S(0, 1) + 1.6, S(1, 0) - 0.1, { icon: IC.route, pos: 'br' });
    k.hl('17-entrada', 'fila', S(1, 0) + 0.2, tRow + 0.1, 2).click('17-entrada', 'fila', tRow, 0.9);
    k.zoom(R('18-panel', 'panel'), 1.32, tRow + 0.7, 0.8);
    k.spot('18-panel', 'panel', tRow + 0.5, S(1, 1) + 0.2, 4).spot('18-panel', 'pdf', S(1, 1) + 0.2, T.dur - 0.2, 4);
    return k.done();
  });

  // ===== 7: RECEPCIONAR =====
  scene(7, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S;
    const tRec = S(0, 0) + 2.4, tOk = S(1, 0) + 0.7;
    k.shot('18-panel').shot('19-recepcionar', tRec + 0.15).shot('20-recepcionada', tOk + 0.15);
    k.zoom(R('18-panel', 'panel'), 1.32, 0.1, 0.01);
    k.click('18-panel', 'recepcionar', tRec, 1.0).lens('18-panel', 'recepcionar', tRec - 0.6, tRec + 0.4, { dx: -60, dy: -190 });
    k.zoom(R('19-recepcionar', 'dialogo'), 1.45, tRec + 0.5, 0.7);
    k.spot('19-recepcionar', 'opciones', S(0, 1) + 0.05, S(0, 1) + 1.6, 4).click('19-recepcionar', 'rechazar', S(0, 1) + 1.0, 0.7)
      .spot('19-recepcionar', 'observaciones', S(0, 1) + 1.8, tOk - 0.2, 4).at(mid(R('19-recepcionar', 'observaciones')), S(0, 1) + 2.2, 0.6);
    k.tip('Si rechazás, explicá el motivo', 'Rechazar', S(0, 1) + 0.6, S(1, 0) - 0.1, { icon: IC.alert, warn: true, pos: 'br' });
    k.click('19-recepcionar', 'confirmar', tOk, 0.8).home(tOk + 0.2, 0.6);
    k.spot('20-recepcionada', 'aviso', tOk + 0.4, S(1, 1) + 0.9, 4).sfx(tOk + 0.3, 'chime');
    k.spot('20-recepcionada', 'estado', S(1, 1) + 0.9, T.dur - 0.2, 6);
    k.tip('Recepcioná a tiempo', 'Buena práctica', S(2, 0) + 0.1, T.dur - 0.2, { icon: IC.clock });
    return k.done();
  });

  // ===== 8: DERIVAR =====
  scene(8, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S, E = T.E;
    const C = '21-detalle';
    const tDer = S(1, 0) + 1.7, tSin = E(1) + 0.25, tGo = S(2, 1) + 1.0;
    k.shot(C).shot('22-derivar-modo', tDer + 0.15).shot('23-derivar-seleccion', tSin + 0.15).shot('24-derivada', tGo + 0.15);
    const acts = union(R(C, 'pdf'), R(C, 'atendido'));
    k.tip('Abrir completo', 'Desde el panel lateral', S(0, 0) + 0.2, S(0, 1) - 0.1, { icon: IC.file });
    k.zoom(acts, 1.25, S(0, 0) + 0.8, 0.9);
    const seq = ['pdf', 'hojaRuta', 'derivar', 'responder', 'atendido'];
    seq.forEach((key, i) => {
      const a = S(0, 1) + 0.1 + i * 0.85;
      k.hl(C, key, a, a + 0.85, 3).move(C, key, a + 0.3, 0.6);
    });
    k.click(C, 'derivar', tDer, 0.8);
    k.zoom(R('22-derivar-modo', 'dialogo'), 1.38, tDer + 0.5, 0.7);
    k.spot('22-derivar-modo', 'con', S(1, 1) + 0.05, S(1, 1) + 1.6, 4).spot('22-derivar-modo', 'sin', S(1, 1) + 1.6, S(1, 2), 4);
    k.move('22-derivar-modo', 'con', S(1, 1) + 0.4, 0.7).move('22-derivar-modo', 'sin', S(1, 1) + 1.9, 0.7);
    k.hl('22-derivar-modo', 'unaVez', S(1, 2) + 0.05, tSin, 3);
    k.tip('Solo podés derivar una vez', 'Atención', S(1, 2) + 0.15, S(2, 0) + 0.5, { icon: IC.once, warn: true, pos: 'br' });
    k.click('22-derivar-modo', 'sin', tSin, 0.6);
    k.zoom(R('23-derivar-seleccion', 'dialogo'), 1.3, tSin + 0.4, 0.6);
    k.click('23-derivar-seleccion', 'soporte', S(2, 0) + 0.7, 0.8).hl('23-derivar-seleccion', 'soporte', S(2, 0) + 0.7, tGo, 2)
      .hl('23-derivar-seleccion', 'hojaRuta', S(2, 0) + 1.9, tGo, 3);
    k.click('23-derivar-seleccion', 'derivar', tGo, 0.8).home(tGo + 0.2, 0.6);
    k.spot('24-derivada', 'aviso', tGo + 0.4, S(3, 0) + 0.4, 4).spot('24-derivada', 'estado', S(3, 0) + 0.3, T.dur - 0.2, 6).sfx(tGo + 0.3, 'chime');
    return k.done();
  });

  // ===== 9: SEGUIMIENTO =====
  scene(9, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S;
    const t1 = S(0, 0) + 0.6, t2 = S(1, 0) + 0.4;
    k.shot('24-derivada').shot('25-seguimiento', t1 + 0.15).shot('26-arbol', t2 + 0.15);
    k.click('25-seguimiento', 'pestana', t1, 0.8);
    k.spot('25-seguimiento', 'avance', t1 + 0.5, S(0, 1) - 0.05, 4);
    k.zoom(R('25-seguimiento', 'ruta'), 1.15, S(0, 1) - 0.2, 0.8);
    const ruta = union(R('25-seguimiento', 'ruta'), R('25-seguimiento', 'derivado'));
    k.spot('25-seguimiento', ruta, S(0, 1) + 0.05, t2 - 0.1, 4);
    k.home(t2 - 0.3, 0.5).click('26-arbol', 'pestana', t2, 0.7);
    const arb = union(R('26-arbol', 'filtros'), R('26-arbol', 'soporte'), R('26-arbol', 'expandir'));
    k.zoom(arb, 1.25, t2 + 0.8, 0.8);
    k.spot('26-arbol', arb, t2 + 0.6, T.dur - 0.2, 6);
    k.at(mid(R('26-arbol', 'soporte')), t2 + 1.6, 0.8);
    return k.done();
  });

  // ===== 10: RESPONDER =====
  scene(10, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S, E = T.E;
    const btnResp = box([2888, 558, 3120, 632]);
    const tR = S(0, 0) + 1.5, t2 = S(1, 1) - 0.15, t3 = S(2, 0) - 0.2, t4 = S(2, 1) + 0.4, t5 = S(2, 1) + 1.9, tSend = E(2) + 0.35;
    k.shot('26-arbol').shot('27-responder-p1', tR + 0.15).shot('28-responder-p2', t2 + 0.15).shot('29-responder-p3', t3 + 0.15)
      .shot('30-responder-p4', t4 + 0.15).shot('31-responder-enviar', t5, 0.45).shot('32-respondida', tSend + 0.15);
    k.click('26-arbol', btnResp, tR, 1.0).lens('26-arbol', btnResp, tR - 0.6, tR + 0.4, { dx: -240, dy: 150 });
    k.spot('27-responder-p1', 'destino', S(0, 1) + 0.05, S(1, 0) - 0.1, 4);
    k.tip('Llega a quien te lo envió', 'Respuesta', S(0, 1) + 0.3, S(1, 0) - 0.1, { icon: IC.reply, pos: 'br' });
    k.hl('27-responder-p1', 'interno', S(1, 0) + 0.1, S(1, 0) + 1.0, 3).click('27-responder-p1', 'normal', S(1, 0) + 1.2, 0.8);
    k.click('27-responder-p1', 'siguiente', t2, 0.8);
    const f = union(R('28-responder-p2', 'numero'), R('28-responder-p2', 'hojas'), R('28-responder-p2', 'pdf'));
    k.zoom(f, 1.25, t2 + 0.5, 0.7);
    k.cover('28-responder-p2', 'numero', t2 + 0.5, 0.9).cover('28-responder-p2', 'tipo', t2 + 1.6, 0.3, { r: 50 })
      .cover('28-responder-p2', 'hojas', t2 + 2.1, 0.2);
    k.at(mid(R('28-responder-p2', 'numero')), t2 + 0.4, 0.6).at(mid(R('28-responder-p2', 'tipo')), t2 + 1.5, 0.5)
      .move('28-responder-p2', 'pdf', t2 + 2.7, 0.6).spot('28-responder-p2', 'pdf', t2 + 2.8, t3 - 0.2, 4);
    k.click('28-responder-p2', 'siguiente', t3, 0.7).home(t3 + 0.1, 0.5);
    k.spot('29-responder-p3', union(R('29-responder-p3', 'nombre'), R('29-responder-p3', 'cargo')), S(2, 0) + 0.3, S(2, 0) + 1.6, 6);
    k.cover('29-responder-p3', 'referencia', S(2, 0) + 1.8, 1.1, { t: 8, b: 30 }).hl('29-responder-p3', 'referencia', S(2, 0) + 1.7, t4, 3);
    k.click('29-responder-p3', 'siguiente', t4, 0.7);
    k.spot('30-responder-p4', 'archivos', t4 + 0.4, t5 - 0.05, 6);
    k.click('31-responder-enviar', 'enviar', tSend, 0.9).lens('31-responder-enviar', 'enviar', tSend - 0.6, tSend + 0.4, { dx: -260, dy: -150 });
    k.spot('32-respondida', 'estado', S(3, 0) + 0.05, T.dur - 0.2, 6).spot('32-respondida', 'respuesta', S(3, 0) + 0.05, T.dur - 0.2, 4)
      .sfx(tSend + 0.3, 'chime');
    return k.done();
  });

  // ===== 11: BANDEJA DE SALIDA Y ARCHIVO =====
  scene(11, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S;
    const tRow = S(1, 0) + 0.4, tArc = S(2, 0) + 1.5, tOk = S(2, 0) + 3.0;
    k.shot('33-salida').shot('34-salida-seguimiento', tRow + 0.15).shot('35-archivar', tArc + 0.15).shot('36-archivada', tOk + 0.15);
    k.click('33-salida', 'menu', S(0, 0) + 0.9, 1.0).spot('33-salida', 'carpetas', S(0, 0) + 1.5, S(0, 1) - 0.05, 2);
    k.zoom(R('33-salida', 'fila'), 1.3, S(0, 1) + 0.2, 0.8);
    k.hl('33-salida', 'avance', S(0, 1) + 0.3, tRow, 4).at(mid(R('33-salida', 'avance')), S(0, 1) + 0.8, 0.8);
    k.tip('1 de 2 unidades lo procesó', 'Avance', S(0, 1) + 0.9, tRow - 0.1, { icon: IC.route, pos: 'br' });
    k.click('33-salida', 'fila', tRow, 0.7).home(tRow + 0.1, 0.6);
    k.spot('34-salida-seguimiento', union(R('34-salida-seguimiento', 'avance'), R('34-salida-seguimiento', 'unidades')), tRow + 0.6, tArc - 0.4, 4);
    k.click('34-salida-seguimiento', 'archivar', tArc, 1.0).lens('34-salida-seguimiento', 'archivar', tArc - 0.6, tArc + 0.4, { dx: -230, dy: 150 });
    k.zoom(R('35-archivar', 'dialogo'), 1.6, tArc + 0.5, 0.6);
    k.click('35-archivar', 'confirmar', tOk, 0.8).home(tOk + 0.2, 0.6);
    k.spot('36-archivada', 'estado', tOk + 0.4, T.dur - 0.2, 6).spot('36-archivada', 'aviso', tOk + 0.4, T.dur - 0.2, 4).sfx(tOk + 0.3, 'chime');
    k.tip('Archivá solo lo concluido', 'Buena práctica', S(2, 1) + 0.2, T.dur - 0.2, { icon: IC.archive, pos: 'br' });
    return k.done();
  });

  // ===== 12: RECEPCION DE TERCEROS =====
  scene(12, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S;
    const C = '38-terceros-lleno';
    const tFill = S(1, 0) - 0.05, tScroll = S(2, 0) - 0.2, tReg = S(2, 0) + 1.5;
    k.shot('37-terceros').shot(C, tFill, 0.01).shot('39-terceros-registrar', tScroll, 0.4).shot('40-terceros-registrado', tReg + 0.15);
    k.click('37-terceros', 'menu', S(0, 0) + 1.0, 1.0).hl('37-terceros', 'menu', S(0, 0) + 1.0, S(0, 1) + 1.5, 2);
    k.spot('37-terceros', 'persona', S(0, 1) + 0.2, tFill, 4);
    k.tip('Persona civil en ventanilla', 'Terceros', S(0, 0) + 0.4, tFill - 0.1, { icon: IC.hand, pos: 'br' });
    const a = S(1, 0), b = S(1, 1);
    k.zoom(R(C, 'nombre'), 1.3, a + 0.3, 0.7);
    k.cover(C, 'nombre', a + 0.4, 1.0).cover(C, 'ci', a + 1.6, 0.6).cover(C, 'telefono', a + 2.4, 0.5);
    k.at(mid(R(C, 'nombre')), a + 0.3, 0.6).at(mid(R(C, 'ci')), a + 1.5, 0.5).at(mid(R(C, 'telefono')), a + 2.3, 0.5);
    const doc = union(R(C, 'tipo'), R(C, 'hojas'), R(C, 'referencia'));
    k.zoom(doc, 1.2, b + 0.2, 0.7);
    k.cover(C, 'tipo', b + 0.5, 0.3, { r: 50 }).cover(C, 'hojas', b + 1.5, 0.2).cover(C, 'referencia', b + 2.7, 1.3, { t: 8, b: 26 });
    k.patch('37-terceros', box([610, 1070, 2300, 1160]), 0, b + 2.1);
    k.at(mid(R(C, 'tipo')), b + 0.4, 0.5).at(mid(R(C, 'hojas')), b + 1.4, 0.5).click(C, 'clasificacion', b + 2.1, 0.6)
      .at(mid(R(C, 'referencia')), b + 2.7, 0.5);
    k.home(tScroll - 0.2, 0.5);
    k.click('39-terceros-registrar', 'registrar', tReg, 0.9).lens('39-terceros-registrar', 'registrar', tReg - 0.6, tReg + 0.4, { dx: -260, dy: -140 });
    k.zoom(R('40-terceros-registrado', 'codigo'), 1.35, S(3, 0) + 0.2, 0.8).sfx(tReg + 0.3, 'chime');
    k.spot('40-terceros-registrado', 'codigo', tReg + 0.5, S(3, 0) + 2.4, 6).spot('40-terceros-registrado', 'imprimir', S(3, 0) + 2.4, T.dur - 0.2, 6);
    k.tip('Dictá el código e imprimí el comprobante', 'Seguimiento', S(3, 0) + 0.3, T.dur - 0.2, { icon: IC.file, pos: 'br' });
    return k.done();
  });

  // ===== 13: ADSCRIPCIONES =====
  scene(13, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S;
    const tAp = S(1, 0) + 1.0, tOpt = S(1, 1) + 2.6, tSave = S(2, 0) + 0.7;
    k.shot('41-adscripciones').shot('42-adscribir-lista', tAp + 0.15).shot('43-adscribir-elegido', tOpt + 0.15).shot('44-integrantes', tSave + 0.15);
    k.click('41-adscripciones', 'menu', S(0, 0) + 0.9, 1.0);
    k.spot('41-adscripciones', 'solicitud', S(0, 1) + 0.05, tAp - 0.2, 4);
    k.click('41-adscripciones', 'aprobar', tAp, 0.8).lens('41-adscripciones', 'aprobar', tAp - 0.6, tAp + 0.4, { dx: 230, dy: 120 });
    k.zoom(R('42-adscribir-lista', 'dialogo'), 1.32, tAp + 0.5, 0.7);
    k.hl('42-adscribir-lista', 'opcion', S(1, 1) + 0.3, tOpt, 2).click('42-adscribir-lista', 'opcion', tOpt, 0.8);
    k.tip('Cada cargo admite una persona', 'Asignación', S(1, 1) + 0.4, S(2, 0), { icon: IC.users, pos: 'br' });
    k.click('43-adscribir-elegido', 'guardar', tSave, 0.8).home(tSave + 0.2, 0.6).sfx(tSave + 0.3, 'chime');
    const j = '44-integrantes';
    k.spot(j, 'juan', S(2, 1) + 0.05, T.dur - 0.2, 4);
    k.hl(j, 'cambiar', S(2, 1) + 1.6, S(2, 1) + 2.6, 3).hl(j, 'reemplazar', S(2, 1) + 2.6, S(2, 1) + 3.6, 3).hl(j, 'desvincular', S(2, 1) + 3.6, T.dur - 0.2, 3);
    k.move(j, 'cambiar', S(2, 1) + 1.8, 0.7).move(j, 'reemplazar', S(2, 1) + 2.8, 0.6).move(j, 'desvincular', S(2, 1) + 3.8, 0.6);
    k.zoom(union(R(j, 'juan'), R(j, 'reemplazar')), 1.3, S(2, 1) + 0.8, 0.8);
    return k.done();
  });

  // ===== 14: ORGANIGRAMA =====
  scene(14, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S, E = T.E;
    const C = '45-organigrama';
    const tF = S(1, 0) - 0.3, tAdd = S(1, 0) + 1.6, tSave = E(1) + 0.35;
    k.shot(C).shot('45b-organigrama-filtro', tF, 0.25).shot('46-nueva-division', tAdd + 0.15).shot('47-division-creada', tSave + 0.15);
    k.click(C, 'menu', S(0, 0) + 0.9, 1.0).spot(C, 'unidad', S(0, 0) + 1.6, S(0, 1) - 0.05, 6);
    k.zoom(R(C, 'tarjeta'), 1.3, S(0, 1) + 0.3, 0.8);
    k.spot(C, 'tarjeta', S(0, 1) + 0.05, tF - 0.1, 4);
    ['ver', 'anadir', 'modificar', 'inactivar'].forEach((key, i) => {
      const a = S(0, 1) + 1.2 + i * 0.95;
      k.hl(C, key, a, a + 0.95, 3).move(C, key, a + 0.2, 0.55);
    });
    k.home(tF, 0.5);
    k.cover('45b-organigrama-filtro', 'buscar', tF + 0.2, 0.6, { l: 40 });
    k.click('45b-organigrama-filtro', 'anadir', tAdd, 0.8).hl('45b-organigrama-filtro', 'tarjeta', tF + 0.8, tAdd + 0.1, 3);
    k.zoom(R('46-nueva-division', 'dialogo'), 1.4, tAdd + 0.5, 0.7);
    k.cover('46-nueva-division', 'nombre', S(1, 1) + 0.1, 1.2).cover('46-nueva-division', 'descripcion', S(1, 1) + 1.4, 0.6, { t: 8, b: 6 });
    k.click('46-nueva-division', 'guardar', tSave, 0.8).home(tSave + 0.2, 0.6).sfx(tSave + 0.3, 'chime');
    k.spot('47-division-creada', 'nueva', tSave + 0.5, T.dur - 0.2, 4).spot('47-division-creada', 'migas', tSave + 0.5, T.dur - 0.2, 4);
    return k.done();
  });

  // ===== 15: NOTIFICACIONES Y PERFIL =====
  scene(15, function (root, T, ctx) {
    const k = kit(root, ctx);
    const S = T.S;
    const tAv = S(1, 0) + 0.4;
    k.shot('48-notificaciones').shot('49-perfil', tAv + 0.15);
    k.click('48-notificaciones', 'campana', S(0, 0) + 0.7, 1.0);
    k.zoom(R('48-notificaciones', 'panel'), 1.3, S(0, 0) + 0.8, 0.8);
    k.spot('48-notificaciones', 'panel', S(0, 0) + 1.0, S(0, 1) - 0.05, 4);
    k.hl('48-notificaciones', 'noLeidas', S(0, 1) + 0.2, S(0, 1) + 1.6, 3).hl('48-notificaciones', 'marcar', S(0, 1) + 1.6, tAv, 3);
    k.move('48-notificaciones', 'noLeidas', S(0, 1) + 0.5, 0.6).move('48-notificaciones', 'marcar', S(0, 1) + 1.8, 0.6);
    k.tip('En tiempo real', 'Avisos', S(0, 0) + 1.4, S(0, 1), { icon: IC.bell, pos: 'bl' });
    k.click('01-inicio', 'avatar', tAv, 0.7);
    k.zoom(R('49-perfil', 'menu'), 1.3, tAv + 0.5, 0.7);
    k.spot('49-perfil', 'menu', tAv + 0.4, S(1, 1), 4);
    k.hl('49-perfil', 'cerrar', S(1, 1) + 0.6, T.dur - 0.2, 3).move('49-perfil', 'cerrar', S(1, 1) + 1.2, 0.8);
    return k.done();
  });

  // ===== 16: CIERRE Y BUENAS PRACTICAS =====
  scene(16, function (root, T, ctx) {
    const G = greenBg(root);
    G.rings.style.opacity = 0;
    const S = T.S;
    const card = el('check-card', '<h3>BUENAS PRÁCTICAS</h3>', root);
    place(card, W / 2 - 430, 150, 860);
    const rows = ['Configurá tu unidad', 'Recepcioná a tiempo', 'Revisá antes de enviar', 'Derivá una sola vez', 'Archivá solo lo concluido']
      .map((txt) => el('check-row', `<div class="ic">${IC.check}</div>${txt}`, card));
    const at = [S(0, 0) + 0.8, S(0, 0) + 2.1, S(0, 1) + 0.2, S(0, 1) + 1.3, S(0, 2) + 0.2];
    at.forEach((x) => ev(ctx, x, 'pop'));
    const u1 = S(1, 0);
    const em = emblem(root, W / 2, 330, 220);
    const word = el('abs', 'SISCOP', root, { left: 0, width: W + 'px', textAlign: 'center', color: '#fff', font: "900 130px/1 'Inter'", letterSpacing: '.04em' });
    place(word, 0, 470);
    const l2 = el('abs', 'La correspondencia de tu unidad, en orden y a tiempo', root, { left: 0, width: W + 'px', textAlign: 'center', color: '#d3e6c1', font: "700 36px 'Inter'" });
    place(l2, 0, 630);
    const cta = el('abs', 'POLICÍA BOLIVIANA · SISCOP', root, { padding: '14px 34px', borderRadius: '999px', background: '#fff', color: '#223d16',
      font: "900 26px 'Inter'", letterSpacing: '.16em' });
    place(cta, W / 2 - 235, 730);
    ev(ctx, u1 + 0.2, 'chime');
    return function (t) {
      drawGreen(G, t);
      const out = easeIn(P(t, u1 - 0.4, 0.5));
      card.style.opacity = P(t, 0.1, 0.3) * (1 - out);
      card.style.transform = `translateY(${(1 - backOut(P(t, 0.1, 0.6))) * 60 - out * 40}px) scale(${1 - out * 0.06})`;
      rows.forEach((r, i) => {
        const p = backOut(P(t, at[i], 0.45));
        r.style.opacity = P(t, at[i], 0.15);
        r.style.transform = `translateX(${(1 - Math.min(1, p)) * -30}px)`;
        const ic = r.querySelector('.ic'); ic.style.transform = `scale(${Math.max(0, p)})`;
        const ck = r.querySelector('.ck'); if (ck) { ck.style.strokeDasharray = '1'; ck.style.strokeDashoffset = 1 - ease(P(t, at[i] + 0.1, 0.35)); }
      });
      G.rings.style.opacity = P(t, u1, 0.4);
      const pe = P(t, u1, 0.8);
      em.style.opacity = P(t, u1, 0.2);
      em.style.transform = `scale(${lerp(0.6, 1, backOut(pe))})`;
      em.querySelector('.rt').style.strokeDashoffset = 1 - inOut(P(t, u1 + 0.4, 1.0));
      word.style.clipPath = `inset(0 ${100 - inOut(P(t, u1 + 0.5, 0.7)) * 100}% 0 0)`;
      pop(l2, t, u1 + 0.9, null, 0.85);
      pop(cta, t, u1 + 1.6);
    };
  });

  // ---------- capa global ----------
  const strip = el('', '', stage, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: '104px', zIndex: 39,
    background: 'linear-gradient(rgba(243,246,240,.98) 80%, rgba(243,246,240,0))' });
  const brand = el('brandbar', `<div class="em">${IC.mail}</div>POLICÍA BOLIVIANA · SISCOP`, stage);
  place(brand, 40, 34);
  const prog = el('progress', '', stage);
  const PX0 = 720, PX1 = 1850, PY = 56;
  place(prog, 0, 0, W, 1);
  const pl = el('line', '', prog); place(pl, PX0, PY - 2, PX1 - PX0);
  const pf = el('fill', '', prog); place(pf, PX0, PY - 2, 0);
  const pdots = Array.from({ length: NCH }, (_, i) => { const d = el('dot', String(i + 1), prog); place(d, PX0 + (PX1 - PX0) * i / (NCH - 1), PY); return d; });
  const plab = el('lab', '', prog); place(plab, 0, PY + 20);
  const stitle = el('steptitle', '<div class="n"></div><div><div class="k"></div><div class="t"></div></div>', stage);
  place(stitle, 270, 140);
  const subs = el('', '<div class="box"></div>', stage); subs.id = 'subs';
  subs.style.bottom = px(20);
  const fade = el('', '', stage, { position: 'absolute', inset: 0, background: '#000', zIndex: 80 });

  const TRANS = ['mask', 'push', 'whip', 'wipe', 'punch', 'whip', 'push', 'wipe', 'punch', 'whip', 'push', 'wipe', 'whip', 'punch', 'push', 'mask'];
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
      const blur = Math.sin(Math.PI * p) * 12;
      r.transform = `translateX(${role === 'out' ? -e * W : (1 - e) * W}px)`;
      r.filter = `blur(${blur}px)`;
    } else if (kind === 'punch') {
      if (role === 'out') { r.transform = `scale(${1 + 0.18 * e})`; r.opacity = 1 - e; } else { r.transform = `scale(${lerp(0.86, 1, backOut(p))})`; r.opacity = Math.min(1, p * 2); }
    } else if (kind === 'wipe') {
      if (role === 'in') { const X = lerp(-0.35 * W, 1.35 * W, e); r.clipPath = `polygon(0 0, ${X}px 0, ${X - 0.35 * W}px ${H}px, 0 ${H}px)`; }
    } else if (kind === 'mask') {
      if (role === 'in') r.clipPath = `circle(${e * Math.hypot(W, H) * 0.6}px at 50% 50%)`;
    } else if (kind === 'push') {
      r.transform = role === 'out' ? `translateY(${-e * H * 0.3}px)` : `translateY(${(1 - e) * H}px)`;
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

    // barra de capitulos y rotulo
    const sid = TL.scenes[idx].id, lt = t - TL.scenes[idx].start;
    const showProg = sid >= 1 && sid <= NCH;
    const po = showProg ? ease(P(lt, 0, 0.4)) : (sid === NCH + 1 ? 1 - P(lt, 0, 0.3) : 0);
    prog.style.opacity = po; brand.style.opacity = po; strip.style.opacity = po;
    const cur = clamp(sid, 1, NCH);
    pf.style.width = px((PX1 - PX0) * (cur - 1) / (NCH - 1));
    pdots.forEach((d, i) => {
      d.className = 'dot' + (i + 1 < cur ? ' done' : i + 1 === cur ? ' cur' : '');
      d.style.transform = `translate(-50%,-50%) scale(${i + 1 === cur ? 1.15 + 0.25 * backOut(P(lt, 0.1, 0.5)) * (1 - P(lt, 0.8, 0.5)) : 1})`;
    });
    const st = STEPS[cur];
    plab.textContent = `${cur} · ${st[0]}`;
    plab.style.left = px(clamp(PX0 + (PX1 - PX0) * (cur - 1) / (NCH - 1), PX0 + 90, PX1 - 90));
    if (showProg) {
      stitle.querySelector('.n').textContent = String(sid).padStart(2, '0');
      stitle.querySelector('.k').textContent = `CAPÍTULO ${sid} DE ${NCH}`;
      stitle.querySelector('.t').textContent = `${st[0]} · ${st[1]}`;
      const pin = backOut(P(lt, 0.05, 0.5)), pout = easeIn(P(lt, 1.9, 0.35));
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
