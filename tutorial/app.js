/* Escenas de la version horizontal (1920x1080). Motor en core.js. */
(function () {
  'use strict';
  const { bez, ease, easeIn, clamp, P, lerp, el, px, place, reveal, ICON, CURSOR_SVG, TL, sceneTimes, EVENTS, header, browser, ADDR, KM, KK, mailR, kerR, cursor, cursorPos, drawCursor, drawTyping, escapeHtml, camAt, applyCam, CAM0, VIEW, highlight, drawHighlight, badge, callout, drawCallout, field, MAIL, MAIL_CAM, mailField, mailBrowserWithShot, changePwCard, PH, PS, phone, screen, appIcon, KER, KER_CAM, SCENES, stage, scene, ev, typingEvents, clickEvents } = window.CORE;


  // ===== ESCENA 1: PRESENTACION =====
  scene(1, function (root, T, ctx) {
    root.classList.add('bg-olive');
    const grid = el('grid-olive', '', root);
    // lineas de circuito
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let paths = '', nodes = '';
    for (let i = 0; i < 12; i++) {
      const left = i % 2 === 0;
      const y0 = 110 + i * 75 + rnd() * 20;
      const x1 = 120 + rnd() * 260, dy = (rnd() < 0.5 ? -1 : 1) * (40 + rnd() * 50);
      const x2 = x1 + Math.abs(dy), x3 = x2 + 120 + rnd() * 220;
      const X = (v) => (left ? v : 1920 - v);
      const d = `M${X(-10)} ${y0} H${X(x1)} L${X(x2)} ${y0 + dy} H${X(x3)}`;
      paths += `<path class="cp" pathLength="1" d="${d}"/>`;
      nodes += `<circle class="cn" cx="${X(x3)}" cy="${y0 + dy}" r="6"/>`;
    }
    const svg = el('abs', `<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;left:0;top:0">
      <g fill="none" stroke="#9aa886" stroke-width="2" stroke-opacity=".38">${paths}</g>
      <g fill="#30352D" stroke="#b4c09e" stroke-width="2" stroke-opacity=".7">${nodes}</g>
      <g fill="#e6ecd8" class="pulses"></g></svg>`, root, { left: 0, top: 0, width: '1920px', height: '1080px' });
    const cps = [...svg.querySelectorAll('.cp')];
    const cns = [...svg.querySelectorAll('.cn')];
    const pulseG = svg.querySelector('.pulses');
    const pulses = cps.map(() => { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', '3.5'); pulseG.appendChild(c); return c; });
    const lens = cps.map((p) => p.getTotalLength());

    const logo = el('abs', '<img src="assets/logo200_white.png" style="width:100%">', root);
    place(logo, 960 - 230, 120, 460);
    const t1 = el('abs mont', 'GUÍA DE ACCESO A LOS<br>SISTEMAS INSTITUCIONALES', root,
      { width: '1920px', textAlign: 'center', color: '#fff', font: "800 74px/1.12 'Montserrat'", letterSpacing: '.01em' });
    place(t1, 0, 410);
    const line = el('abs', '', root, { height: '4px', background: 'linear-gradient(90deg, rgba(242,240,232,0), #F2F0E8, rgba(242,240,232,0))' });
    place(line, 960 - 360, 600, 720);
    const pillsWrap = el('abs', '', root, { width: '1920px', display: 'flex', justifyContent: 'center', gap: '22px' });
    place(pillsWrap, 0, 640);
    const pillDefs = [['Correo institucional', ICON.mail], ['Carbonio Mail', ICON.phone], ['Kerberos', ICON.shield]];
    const pills = pillDefs.map(([txt, ic]) => el('', `<div class="ico" style="width:44px;height:44px;background:#F2F0E8;color:#465638">${ic}</div><span>${txt}</span>`, pillsWrap, {
      display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 26px 10px 10px', borderRadius: '999px',
      border: '2px solid rgba(242,240,232,.35)', background: 'rgba(48,60,46,.45)', color: '#F2F0E8', font: "700 28px 'Montserrat'" }));
    // momentos en que la voz nombra cada sistema
    const mention = [T.S(1, 0) + 2.6, T.S(1, 1) + 1.9, T.S(1, 1) + 4.0];

    return function (t) {
      grid.style.transform = `translate(${(t * 6) % 60}px, ${(t * 4) % 60}px)`;
      cps.forEach((p, i) => {
        const a = 0.2 + i * 0.12;
        p.style.strokeDasharray = '1';
        p.style.strokeDashoffset = 1 - ease(P(t, a, 1.6));
        cns[i].style.opacity = P(t, a + 1.3, 0.4);
        const ph = ((t * 0.18 + i * 0.37) % 1);
        const pt = p.getPointAtLength(ph * lens[i]);
        pulses[i].setAttribute('cx', pt.x); pulses[i].setAttribute('cy', pt.y);
        pulses[i].style.opacity = P(t, a + 1.6, 0.5) * Math.sin(Math.PI * ph) * 0.9;
      });
      reveal(logo, t, 0.6, { d: 1.1, dy: 0, scale: 0.9 });
      reveal(t1, t, 1.5, { d: 0.9, dy: 30 });
      const lp = ease(P(t, 2.3, 0.9));
      line.style.transform = `scaleX(${lp})`; line.style.opacity = lp;
      pills.forEach((p, i) => {
        reveal(p, t, 2.9 + i * 0.22, { d: 0.6, dy: 18 });
        const m = mention[i];
        const g = P(t, m - 0.2, 0.3) * (1 - P(t, m + 1.6, 0.6));
        p.style.background = `rgba(${lerp(48, 113, g)},${lerp(60, 129, g)},${lerp(46, 94, g)},${lerp(0.45, 0.95, g)})`;
        p.style.borderColor = `rgba(242,240,232,${lerp(0.35, 0.9, g)})`;
      });
    };
  });

  // ===== ESCENA 2: ACCESO AL CORREO =====
  scene(2, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    const cam = el('cam', '', root);
    const B = browser(cam, 'Nueva pestaña');
    const shot = el('', '<img src="assets/mail_login.png">', B.view, { position: 'absolute', inset: 0, opacity: 0 });
    const enter = el('keycap', 'Enter ⏎', cam); place(enter, ADDR.x + 168, ADDR.y - 18);
    const addrHl = highlight(cam, { x: 380, y: 198, w: 1160, h: 36 }, 5, 22);
    const urlTag = callout(cam, 'Dirección del correo institucional', 760, 278, false, 20);
    urlTag.querySelector('.ln').style.width = '0px';
    header(root, '01', 'Correo institucional', 'ACCESO AL CORREO');
    const cur = cursor(cam);
    const typeT0 = T.S(0, 0) + 2.7;
    const spec = { node: B.url, text: 'mail.policia.bo', t0: typeT0, cps: 9, focus: 2.5, blur: typeT0 + 2.6, caretH: 20 };
    const typeEnd = spec.t0 + spec.text.length / spec.cps;
    const tEnter = typeEnd + 0.45;
    const keys = [
      { t: 1.1, x: 1350, y: 720 },
      { t: 2.4, x: ADDR.x + 70, y: ADDR.y + 4, d: 1.1, click: true },
      { t: tEnter + 2.4, x: 760, y: 520, d: 1.2 },
    ];
    const camKeys = [
      { t: 0, ...CAM0 },
      { t: 3.1, x: 640, y: 230, s: 2.3, d: 1.0 },
      { t: tEnter + 1.6, x: 960, y: 540, s: 1, d: 1.2 },
    ];
    typingEvents(ctx, spec); clickEvents(ctx, keys); ev(ctx, tEnter, 'key');

    return function (t) {
      const c = camAt(camKeys, t); applyCam(cam, c);
      reveal(B.el, t, 0.15, { d: 0.8, dy: 30, scale: 0.94 });
      drawTyping(spec, t);
      const ep = P(t, tEnter - 0.1, 0.25) * (1 - P(t, tEnter + 0.9, 0.3));
      enter.style.opacity = ep; enter.style.transform = `translateY(${(1 - ep) * 8}px) scale(${t > tEnter && t < tEnter + 0.15 ? 0.92 : 1})`;
      const lp = P(t, tEnter + 0.1, 1.0);
      B.load.style.width = (ease(lp) * 100) + '%';
      B.load.style.opacity = 1 - P(t, tEnter + 1.1, 0.3);
      shot.style.opacity = ease(P(t, tEnter + 0.7, 0.6));
      B.newtab.style.opacity = 1 - P(t, tEnter + 0.7, 0.4);
      B.tab.textContent = t > tEnter + 0.8 ? 'Policía Boliviana · Correo' : 'Nueva pestaña';
      drawHighlight(addrHl, t, tEnter + 2.0);
      drawCallout(urlTag, t, tEnter + 2.2);
      drawCursor(cur, keys, t, c.s);
    };
  });


  // ===== ESCENA 3: INICIO DE SESION =====
  scene(3, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    const cam = el('cam', '', root);
    mailBrowserWithShot(cam, 'Policía Boliviana · Correo');
    const fU = mailField(cam, MAIL.user, 'Nombre de usuario');
    const fP = mailField(cam, MAIL.pass, 'Contraseña');
    fP.el.style.width = px(MAIL.pass.w - 40); // deja visible el icono del ojo
    const press = el('abs', '', cam, { background: 'rgba(0,0,0,.25)', borderRadius: '5px', opacity: 0 });
    place(press, MAIL.btn.x, MAIL.btn.y, MAIL.btn.w, MAIL.btn.h);
    const items = [[MAIL.user, '1', 'Correo institucional completo'], [MAIL.pass, '2', 'Contraseña inicial'], [MAIL.btn, '3', 'Iniciar sesión']];
    const hls = items.map(([r]) => highlight(cam, r, 5));
    const bds = items.map(([r, n]) => badge(cam, n, r.x - 52, r.y + r.h / 2 - 17, 34));
    const cos = items.map(([r, , txt]) => callout(cam, txt, r.x + r.w + 12, r.y + r.h / 2, false, 15));
    cos.forEach((c) => (c.querySelector('.ln').style.width = '36px'));
    header(root, '02', 'Correo institucional', 'INICIO DE SESIÓN');
    const cur = cursor(cam);

    const a1 = T.S(0, 0), a2 = T.S(1, 0), a3 = T.S(2, 0);
    const sU = { node: fU.val, text: 'nombre.usuario@policia.bo', t0: a1 + 1.9, cps: 11, caretH: 15 };
    const sP = { node: fP.val, text: 'xxxxxxxxxxxxxx', mask: true, t0: a2 + 1.5, cps: 10, caretH: 15 };
    sU.blur = a2 + 1.2;
    const tBtn = a3 + 3.0;
    const keys = [
      { t: 0.8, x: 980, y: 700 },
      { t: a1 + 1.5, x: MAIL.user.x + MAIL.user.w - 40, y: MAIL.user.y + 30, d: 1.1, click: true },
      { t: a2 + 1.1, x: MAIL.pass.x + MAIL.pass.w - 80, y: MAIL.pass.y + 30, d: 1.0, click: true },
      { t: tBtn, x: MAIL.btn.x + MAIL.btn.w / 2 + 20, y: MAIL.btn.y + MAIL.btn.h / 2 + 4, d: 1.1, click: true },
    ];
    const camKeys = [{ t: 0, ...CAM0 }, { t: 1.4, ...MAIL_CAM, d: 1.2 }];
    typingEvents(ctx, sU); typingEvents(ctx, sP); clickEvents(ctx, keys);

    return function (t) {
      const c = camAt(camKeys, t); applyCam(cam, c);
      fU.el.style.opacity = t >= sU.t0 - 0.4 ? 1 : 0;
      fP.el.style.opacity = t >= sP.t0 - 0.4 ? 1 : 0;
      drawTyping(sU, t); drawTyping(sP, t);
      const starts = [a1 + 0.2, a2, a3 + 0.6];
      for (let i = 0; i < 3; i++) {
        drawHighlight(hls[i], t, starts[i]);
        reveal(bds[i], t, starts[i] + 0.1, { d: 0.4, dy: 0, scale: 0.6 });
        drawCallout(cos[i], t, starts[i] + 0.25);
      }
      press.style.opacity = t > tBtn - 0.02 && t < tBtn + 0.25 ? 1 : 0;
      drawCursor(cur, keys, t, c.s);
    };
  });

  scene(4, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    const cam = el('cam', '', root);
    mailBrowserWithShot(cam, 'Policía Boliviana · Correo');
    const C = changePwCard(cam);
    const items = [[MAIL.user, '1', 'Nueva contraseña'], [MAIL.pass, '2', 'Repite la misma contraseña']];
    const hls = items.map(([r]) => highlight(cam, r, 5));
    const bds = items.map(([r, n]) => badge(cam, n, r.x - 52, r.y + r.h / 2 - 17, 34));
    const cos = items.map(([r, , txt]) => callout(cam, txt, r.x + r.w + 12, r.y + r.h / 2, false, 15));
    cos.forEach((c) => (c.querySelector('.ln').style.width = '36px'));
    header(root, '03', 'Correo institucional', 'CAMBIO DE CONTRASEÑA');
    const cur = cursor(cam);
    const a1 = T.S(1, 0);
    const s1 = { node: C.f1.val, text: 'x'.repeat(18), mask: true, t0: a1 + 0.9, cps: 12, caretH: 15 };
    const s2 = { node: C.f2.val, text: 'x'.repeat(18), mask: true, t0: a1 + 3.4, cps: 12, caretH: 15 };
    s1.blur = s2.t0 - 0.35;
    const keys = [
      { t: a1 - 0.6, x: 980, y: 760 },
      { t: a1 + 0.55, x: MAIL.user.x + MAIL.user.w - 40, y: MAIL.user.y + 30, d: 1.0, click: true },
      { t: a1 + 3.05, x: MAIL.pass.x + MAIL.pass.w - 50, y: MAIL.pass.y + 30, d: 0.9, click: true },
    ];
    typingEvents(ctx, s1); typingEvents(ctx, s2); clickEvents(ctx, keys);
    return function (t) {
      applyCam(cam, MAIL_CAM);
      C.group.forEach((g, i) => reveal(g, t, 0.5 + (i > 1 ? 0.15 * (i - 1) : 0), { d: 0.6, dy: i ? 12 : 0 }));
      C.tag.style.transform += ' scale(.72)';
      C.f1.el.style.opacity = t >= s1.t0 - 0.4 ? 1 : 0;
      C.f2.el.style.opacity = t >= s2.t0 - 0.4 ? 1 : 0;
      drawTyping(s1, t); drawTyping(s2, t);
      reveal(C.ok, t, s2.t0 + 18 / 12 + 0.4, { d: 0.4, dy: 6 });
      const starts = [T.S(0, 0) + 3.4, a1 + 2.6];
      for (let i = 0; i < 2; i++) {
        drawHighlight(hls[i], t, starts[i]);
        reveal(bds[i], t, starts[i] + 0.1, { d: 0.4, dy: 0, scale: 0.6 });
        drawCallout(cos[i], t, starts[i] + 0.25);
      }
      drawCursor(cur, keys, t, MAIL_CAM.s);
    };
  });

  // ===== ESCENA 5: REQUISITOS =====
  scene(5, function (root, T, ctx) {
    root.classList.add('bg-white');
    header(root, '04', 'Correo institucional', 'REQUISITOS DE LA CONTRASEÑA');
    const reqs = [
      ['Mínimo 16 caracteres', 'Más de quince caracteres en total'],
      ['Mayúsculas y minúsculas', 'Combina letras: A B C … a b c'],
      ['Números', 'Incluye dígitos del 0 al 9'],
      ['Símbolos especiales', 'Por ejemplo: ! @ # $ % & * ?'],
      ['Sin nombre ni apellidos', 'No uses tus datos personales'],
      ['Nada parecido a tu correo', 'Evita datos de tu correo institucional'],
    ];
    const cards = reqs.map(([h, s], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const c = el('card', `<div class="ico" style="width:62px;height:62px">${ICON.check}</div>
        <div><div class="mont" style="font:800 27px 'Montserrat';color:#30352D">${h}</div>
        <div style="font:500 20px 'Inter';color:#5d6455;margin-top:6px">${s}</div></div>`, root, {
        background: '#F2F0E8', borderLeft: '8px solid #465638', display: 'flex', alignItems: 'center', gap: '22px', padding: '0 26px' });
      place(c, 80 + col * 548, 210 + row * 176, 520, 150);
      return c;
    });
    const a = T.S(0, 0), b = T.S(0, 1), c2 = T.S(1, 0), d = T.S(1, 1);
    const times = [a + 2.0, b + 1.0, b + 2.6, b + 3.4, c2 + 1.4, d + 0.5];

    // mini formulario ilustrativo a la derecha
    const panel = el('card', '', root, { padding: '34px 34px' });
    place(panel, 1230, 200, 600, 500);
    el('mont', 'Nueva contraseña', panel, { font: "800 26px 'Montserrat'", color: '#465638', marginBottom: '22px' });
    const mkIn = (lbl) => {
      el('', lbl, panel, { font: "600 17px 'Inter'", color: '#5d6455', margin: '0 0 8px 2px' });
      const box = el('', '', panel, { height: '58px', borderRadius: '10px', border: '2px solid #cfd2c8', background: '#fff', display: 'flex',
        alignItems: 'center', padding: '0 16px', font: "600 22px 'Inter'", color: '#30352D', letterSpacing: '.06em', marginBottom: '18px', whiteSpace: 'pre' });
      return box;
    };
    const in1 = mkIn('Nueva contraseña');
    const meter = el('', '', panel, { display: 'flex', gap: '8px', margin: '-4px 0 8px' });
    const segs = reqs.map(() => el('', '', meter, { flex: 1, height: '10px', borderRadius: '5px', background: '#e3e5de' }));
    const meterTxt = el('', '', panel, { font: "600 16px 'Inter'", color: '#465638', marginBottom: '18px' });
    const in2 = mkIn('Confirmar nueva contraseña');
    const match = el('', `<span style="display:inline-flex;width:20px;height:20px;color:#465638;vertical-align:-4px">${ICON.check}</span> Las contraseñas coinciden`, panel,
      { font: "600 17px 'Inter'", color: '#465638', margin: '-6px 0 20px', opacity: 0 });
    const btn = el('p-btn', 'CONTINUAR', panel, { background: '#465638', fontFamily: 'Montserrat', letterSpacing: '.04em', position: 'relative' });
    const tag = el('tag', 'Representación ilustrativa', root); place(tag, 1230 + 300 - 130, 716);
    const cur = cursor(root);
    const tBtn = d + 4.4;
    const keys = [{ t: d + 2.6, x: 1700, y: 800 }, { t: tBtn, x: 1560, y: 612, d: 1.1, click: true }];
    clickEvents(ctx, keys);
    times.forEach((tt) => ev(ctx, tt, 'pop'));

    return function (t) {
      let done = 0;
      cards.forEach((c, i) => {
        reveal(c, t, times[i], { d: 0.6, dy: 22 });
        const ck = c.querySelector('.ck');
        ck.style.strokeDasharray = '1';
        ck.style.strokeDashoffset = 1 - ease(P(t, times[i] + 0.25, 0.45));
        if (t >= times[i]) done++;
      });
      reveal(panel, t, 0.6, { d: 0.7, dy: 20 });
      reveal(tag, t, 1.0, { d: 0.5, dy: 8 });
      const n1 = clamp(Math.round(18 * P(t, a + 0.4, 6.8)), 0, 18);
      in1.textContent = '•'.repeat(n1);
      in2.textContent = '•'.repeat(clamp(Math.round(18 * P(t, d + 0.6, 1.4)), 0, 18));
      segs.forEach((s, i) => (s.style.background = i < done ? '#465638' : '#e3e5de'));
      meterTxt.textContent = `Requisitos cumplidos: ${done} de 6`;
      match.style.opacity = ease(P(t, d + 2.2, 0.4));
      const pressed = t > tBtn - 0.02 && t < tBtn + 0.22;
      btn.style.background = pressed ? '#303C2E' : '#465638';
      const saved = P(t, tBtn + 0.5, 0.3);
      btn.innerHTML = saved > 0 ? `<span style="display:inline-flex;width:24px;height:24px;margin-right:10px">${ICON.check}</span>GUARDADO` : 'CONTINUAR';
      const ck = btn.querySelector('.ck'); if (ck) { ck.style.strokeDasharray = '1'; ck.style.strokeDashoffset = 1 - saved; }
      drawCursor(cur, keys, t, 1);
    };
  });

  // ===== ESCENA 6: CORREO CONFIGURADO =====
  scene(6, function (root, T, ctx) {
    root.classList.add('bg-olive');
    el('grid-olive', '', root);
    header(root, '05', 'Correo institucional', 'CORREO CONFIGURADO', true);
    const grp = el('abs', '', root, { width: '1920px', textAlign: 'center' }); place(grp, 0, 250);
    const ring = el('', `<svg viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="88" fill="rgba(242,240,232,.10)" stroke="#F2F0E8" stroke-width="8" pathLength="1" class="rc" transform="rotate(-90 100 100)"/>
      <path d="M58 104 L88 133 L145 72" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" pathLength="1" class="rk"/></svg>`, grp,
      { display: 'inline-block' });
    const txt = el('mont', 'CORREO INSTITUCIONAL CONFIGURADO', grp, { font: "800 62px 'Montserrat'", color: '#fff', marginTop: '26px', letterSpacing: '.01em' });
    const rc = ring.querySelector('.rc'), rk = ring.querySelector('.rk');
    rc.style.strokeDasharray = rk.style.strokeDasharray = '1';
    const s1 = T.S(0, 1);
    const mkOpt = (x, title, sub, inner) => {
      const c = el('card', `<div style="position:absolute;left:24px;right:24px;top:24px;height:250px;border-radius:12px;overflow:hidden;background:#F2F0E8">${inner}</div>
        <div style="position:absolute;left:28px;bottom:26px;display:flex;align-items:center;gap:16px"><div class="ico" style="width:52px;height:52px">${title[1]}</div>
        <div><div style="font:800 25px 'Montserrat';color:#30352D">${title[0]}</div><div style="font:600 19px 'Inter';color:#5d6455;margin-top:4px">${sub}</div></div></div>`, root);
      place(c, x, 430, 620, 410);
      return c;
    };
    const left = mkOpt(320, ['En el navegador', ICON.globe], 'mail.policia.bo',
      `<div style="height:26px;background:#DADCD3;display:flex;align-items:center;gap:6px;padding-left:12px"><i style="width:9px;height:9px;border-radius:50%;background:#b9bcb1"></i><i style="width:9px;height:9px;border-radius:50%;background:#b9bcb1"></i><i style="width:9px;height:9px;border-radius:50%;background:#b9bcb1"></i></div>
       <img src="assets/mail_inbox.png" style="width:100%;display:block">`);
    const right = mkOpt(980, ['Aplicación Carbonio Mail', ICON.phone], 'Alternativa opcional en tu celular',
      `<div style="position:absolute;left:50%;top:22px;margin-left:-58px;width:116px;height:220px;border-radius:20px;background:#1b1e19;padding:6px">
        <div style="width:100%;height:100%;border-radius:15px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">
          <div class="ico" style="width:46px;height:46px;background:#30352D">${ICON.mail}</div><div style="font:700 12px 'Inter';color:#30352D">Carbonio Mail</div></div></div>`);
    ev(ctx, 1.2, 'chime');
    return function (t) {
      rc.style.strokeDashoffset = 1 - ease(P(t, 0.3, 0.9));
      rk.style.strokeDashoffset = 1 - ease(P(t, 1.0, 0.5));
      reveal(txt, t, 1.4, { d: 0.8, dy: 26 });
      const m = ease(P(t, s1 - 0.9, 0.9));
      grp.style.transform = `translateY(${-110 * m}px) scale(${lerp(1, 0.78, m)})`;
      reveal(left, t, s1 + 0.2, { d: 0.7, dy: 30 });
      reveal(right, t, s1 + 2.4, { d: 0.7, dy: 30 });
    };
  });

  // ===== ESCENA 7: APLICACION CARBONIO MAIL =====
  scene(7, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    const cam = el('cam', '', root);
    // computadora que se va (transicion computadora -> celular)
    const pc = el('abs', `<div style="height:22px;background:#DADCD3;border-radius:10px 10px 0 0"></div><img src="assets/mail_inbox.png" style="width:100%;display:block">`, cam,
      { borderRadius: '10px', overflow: 'hidden', boxShadow: '0 30px 70px rgba(48,60,46,.25)', background: '#fff' });
    place(pc, 460, 260, 1000);
    const ph = phone(cam);
    const store = screen(ph, `
      <div style="font:800 24px 'Inter';color:#30352D;margin:6px 0 16px 4px">Tienda de aplicaciones</div>
      <div style="height:50px;border-radius:25px;background:#EEF0EA;display:flex;align-items:center;gap:10px;padding:0 16px;color:#5d6455">
        <span style="width:22px;height:22px;display:inline-flex">${ICON.search}</span><span class="q" style="font:500 18px 'Inter';color:#30352D;white-space:pre"></span></div>
      <div class="res" style="margin-top:26px;opacity:0">
        <div style="display:flex;gap:16px;align-items:center">${appIcon(76)}
          <div><div style="font:800 21px 'Inter';color:#30352D">Carbonio Mail</div><div style="font:500 15px 'Inter';color:#5d6455;margin-top:4px">Zextras</div></div></div>
        <div class="ib p-btn" style="margin-top:22px;background:#465638;position:relative;overflow:hidden">Instalar</div>
        <div class="pg" style="margin-top:12px;height:6px;border-radius:3px;background:#e3e5de;overflow:hidden;opacity:0"><div class="pf" style="height:100%;width:0;background:#465638"></div></div>
        <div style="margin-top:26px;display:grid;gap:12px"><div class="sk" style="width:90%"></div><div class="sk" style="width:76%"></div><div class="sk" style="width:84%"></div></div>
      </div>`);
    const splash = screen(ph, `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px">
      ${appIcon(96)}<div style="font:800 26px 'Inter';color:#30352D">Carbonio Mail</div></div>`);
    const q = store.querySelector('.q'), res = store.querySelector('.res'), ib = store.querySelector('.ib'), pg = store.querySelector('.pg'), pf = store.querySelector('.pf');
    const tag = el('tag', 'Representación ilustrativa', root); place(tag, 1190, 180);

    const info = el('card', `<div style="display:flex;gap:18px;align-items:center"><div class="ico" style="width:58px;height:58px">${ICON.phone}</div>
      <div><div style="font:700 15px 'Montserrat';color:#71815E;letter-spacing:.14em">ALTERNATIVA OPCIONAL</div><div style="font:800 26px 'Montserrat';color:#465638">Usa la app en tu celular</div></div></div>
      <div style="font:500 22px/1.45 'Inter';color:#30352D;margin-top:18px">Para mayor comodidad, busca <b>Carbonio Mail</b> en la tienda oficial de tu celular e instálala.</div>
      <div style="display:flex;gap:12px;margin-top:20px"><span style="padding:8px 16px;border-radius:999px;background:#F2F0E8;border:2px solid #71815E;font:700 17px 'Inter';color:#465638">Play Store</span>
      <span style="padding:8px 16px;border-radius:999px;background:#F2F0E8;border:2px solid #71815E;font:700 17px 'Inter';color:#465638">App Store</span></div>`, root, { padding: '30px' });
    place(info, 110, 330, 560);
    const warn = el('card', `<div style="display:flex;gap:16px;align-items:center"><div class="ico" style="width:58px;height:58px;background:#F2F0E8;color:#303C2E">${ICON.alert}</div>
      <div style="font:800 26px 'Montserrat';color:#F2F0E8;letter-spacing:.08em">IMPORTANTE</div></div>
      <div style="font:800 28px/1.3 'Montserrat';color:#fff;margin-top:18px">PRIMERO DEBES VALIDAR TU CUENTA Y ACTUALIZAR TU CONTRASEÑA DESDE EL NAVEGADOR.</div>`, root,
      { background: '#303C2E', borderLeft: '10px solid #71815E', padding: '32px 34px' });
    place(warn, 1250, 330, 580);
    header(root, '06', 'Alternativa opcional', 'APP CARBONIO MAIL');
    const tch = cursor(cam, true);
    const sQ = { node: q, text: 'Carbonio Mail', t0: 3.0, cps: 10, caretH: 18 };
    const tInst = 6.2, tOpen = 10.4;
    const btnY = 60 + 6 + 30 + 16 + 50 + 26 + 76 + 22 + 27; // centro del boton dentro de la pantalla
    const keys = [
      { t: 2.3, ...PS(178, 95) }, { t: 2.6, ...PS(178, 95), d: 0.2, click: true },
      { t: tInst, ...PS(178, btnY), d: 0.9, click: true },
      { t: tOpen, ...PS(178, btnY), d: 0.3, click: true },
    ];
    typingEvents(ctx, sQ); clickEvents(ctx, keys, 'tap');
    return function (t) {
      const out = ease(P(t, 0.2, 1.1));
      pc.style.opacity = 1 - out; pc.style.transform = `translateX(${-420 * out}px) scale(${lerp(1, 0.7, out)})`;
      reveal(ph.el, t, 0.5, { d: 1.0, dx: 360, dy: 0 });
      store.style.opacity = 1 - P(t, tOpen + 0.3, 0.4);
      drawTyping(sQ, t);
      reveal(res, t, sQ.t0 + 1.5, { d: 0.5, dy: 12 });
      const prog = ease(P(t, tInst + 0.2, 2.9));
      pg.style.opacity = t > tInst && t < tInst + 3.3 ? 1 : 0;
      pf.style.width = (prog * 100) + '%';
      ib.textContent = t < tInst ? 'Instalar' : t < tInst + 3.2 ? `Instalando… ${Math.round(prog * 100)}%` : 'Abrir';
      ib.style.background = t > tOpen - 0.03 && t < tOpen + 0.22 ? '#303C2E' : '#465638';
      reveal(splash, t, tOpen + 0.35, { d: 0.6, dy: 0, scale: 0.9 });
      reveal(tag, t, 1.2, { d: 0.5, dy: 8 });
      reveal(info, t, 1.6, { d: 0.6, dy: 22 });
      reveal(warn, t, T.S(1, 0) - 0.1, { d: 0.7, dx: 30, dy: 0 });
      const pulse = P(t, T.S(1, 0) + 0.6, 0.3);
      warn.style.boxShadow = `0 18px 50px rgba(48,60,46,.25), 0 0 0 ${pulse * (6 + 4 * Math.sin(t * 3))}px rgba(113,129,94,.35)`;
      drawCursor(tch, keys, t, 1, tOpen + 0.8, true);
    };
  });

  // ===== ESCENA 8: CONFIGURACION DE CARBONIO MAIL (ilustrativa) =====
  scene(8, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    const cam = el('cam', '', root);
    const ph = phone(cam);
    const head = `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:22px">${appIcon(70)}
      <div style="font:800 24px 'Inter';color:#30352D">Carbonio Mail</div></div>`;
    const sA = screen(ph, `${head}
      <div style="margin-top:46px" class="p-label">Servidor</div><div class="p-input"><span class="v"></span></div>
      <div class="p-btn bA" style="margin-top:26px">Continuar</div>`);
    const sB = screen(ph, `${head}
      <div style="margin:14px auto 0;width:max-content;padding:5px 14px;border-radius:999px;background:#F2F0E8;font:600 14px 'Inter';color:#465638">mail.policia.bo</div>
      <div style="margin-top:22px" class="p-label">Correo electrónico</div><div class="p-input"><span class="v1"></span></div>
      <div style="margin-top:16px" class="p-label">Contraseña</div><div class="p-input"><span class="v2"></span></div>
      <div class="p-btn bB" style="margin-top:24px">Iniciar sesión</div>`);
    const rows = Array.from({ length: 7 }, (_, i) => `<div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #eceee8">
      <div style="width:40px;height:40px;border-radius:50%;background:#dfe2d8;flex:none"></div><div style="flex:1;display:grid;gap:8px">
      <div class="sk" style="width:${55 + (i * 17) % 35}%"></div><div class="sk" style="width:${70 + (i * 11) % 25}%;height:10px;background:#eceee8"></div></div></div>`).join('');
    const sC = screen(ph, `<div style="font:800 24px 'Inter';color:#30352D;margin:8px 0 10px 2px">Bandeja de entrada</div>${rows}
      <div class="toast" style="position:absolute;left:22px;right:22px;bottom:26px;height:54px;border-radius:12px;background:#465638;color:#fff;display:flex;align-items:center;gap:10px;padding:0 16px;font:700 17px 'Inter'">
      <span style="width:24px;height:24px;display:inline-flex">${ICON.check}</span>Sesión iniciada</div>`);
    const tag = el('tag', 'Representación ilustrativa', root); place(tag, 1190, 180);
    // lista de pasos
    const stepsTxt = ['Escribe el dominio <b>mail.policia.bo</b>', 'Tu correo institucional completo', 'La contraseña actualizada', 'Presiona <b>Iniciar sesión</b>'];
    const list = el('card', '', root, { padding: '26px' }); place(list, 100, 300, 560);
    el('', 'Configuración', list, { font: "800 26px 'Montserrat'", color: '#465638', margin: '0 0 14px 6px' });
    const stepEls = stepsTxt.map((s, i) => el('', `<div class="n" style="width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 22px 'Montserrat';flex:none">${i + 1}</div><div style="font:500 22px/1.3 'Inter'">${s}</div>`, list,
      { display: 'flex', alignItems: 'center', gap: '16px', padding: '14px', borderRadius: '12px', marginTop: '6px' }));
    header(root, '07', 'Alternativa opcional', 'CONFIGURACIÓN DE LA APP');
    const tch = cursor(cam, true);

    const u0 = T.S(0, 0), u1 = T.S(1, 0), u1b = T.S(1, 1), u2 = T.S(2, 0);
    const vA = sA.querySelector('.v'), v1 = sB.querySelector('.v1'), v2 = sB.querySelector('.v2');
    const spA = { node: vA, text: 'mail.policia.bo', t0: u0 + 3.0, cps: 9, caretH: 20 };
    const tCont = u0 + 6.3, tB = tCont + 0.6;
    const sp1 = { node: v1, text: 'nombre.usuario@policia.bo', t0: u1 + 1.0, cps: 11, caretH: 20 };
    const sp2 = { node: v2, text: 'x'.repeat(16), mask: true, t0: u1b + 0.9, cps: 10, caretH: 20 };
    sp1.blur = sp2.t0 - 0.4; spA.blur = tCont;
    const tLogin = u2 + 1.0, tC = tLogin + 1.3;
    // posiciones de toque (pantalla del telefono)
    const yA = 60 + 22 + 70 + 12 + 30 + 46 + 22 + 27, yAb = yA + 27 + 26 + 27;
    const yB1 = 60 + 22 + 70 + 12 + 30 + 14 + 26 + 22 + 22 + 27, yB2 = yB1 + 27 + 16 + 22 + 27, yBb = yB2 + 27 + 24 + 27;
    const keys = [
      { t: u0 + 2.0, ...PS(180, yA) }, { t: u0 + 2.6, ...PS(180, yA), d: 0.3, click: true },
      { t: tCont, ...PS(178, yAb), d: 0.8, click: true },
      { t: u1 + 0.7, ...PS(180, yB1), d: 0.9, click: true },
      { t: u1b + 0.55, ...PS(180, yB2), d: 0.8, click: true },
      { t: tLogin, ...PS(178, yBb), d: 0.9, click: true },
    ];
    const camKeys = [{ t: 0, ...CAM0 }, { t: u0 + 2.4, x: 960, y: PS(0, yA).y - 30, s: 1.3, d: 1.0 }, { t: tCont + 0.4, ...CAM0, d: 0.9 },
      { t: u1 + 0.6, x: 960, y: PS(0, yB1 + 50).y, s: 1.3, d: 1.0 }, { t: tLogin + 1.0, ...CAM0, d: 1.0 }];
    typingEvents(ctx, spA); typingEvents(ctx, sp1); typingEvents(ctx, sp2); clickEvents(ctx, keys, 'tap');

    return function (t) {
      const c = camAt(camKeys, t); applyCam(cam, c);
      ph.el.style.opacity = 1;
      const ab = ease(P(t, tB - 0.3, 0.5)), bc = ease(P(t, tC - 0.2, 0.5));
      sA.style.opacity = 1 - ab; sA.style.transform = `translateX(${-60 * ab}px)`;
      sB.style.opacity = ab * (1 - bc); sB.style.transform = `translateX(${60 * (1 - ab) - 60 * bc}px)`;
      sC.style.opacity = bc; sC.style.transform = `translateX(${60 * (1 - bc)}px)`;
      drawTyping(spA, t); drawTyping(sp1, t); drawTyping(sp2, t);
      sA.querySelector('.bA').style.background = t > tCont - 0.03 && t < tCont + 0.22 ? '#1d201b' : '#30352D';
      const bB = sB.querySelector('.bB');
      bB.style.background = t > tLogin - 0.03 && t < tLogin + 0.22 ? '#1d201b' : '#30352D';
      bB.textContent = t > tLogin + 0.2 && t < tC ? 'Ingresando…' : 'Iniciar sesión';
      reveal(sC.querySelector('.toast'), t, tC + 0.5, { d: 0.5, dy: 20 });
      reveal(tag, t, 0.4, { d: 0.5, dy: 8 });
      reveal(list, t, 0.5, { d: 0.6, dy: 22 });
      const act = t < tB ? 0 : t < u1b + 0.3 ? 1 : t < u2 ? 2 : 3;
      stepEls.forEach((s, i) => {
        const on = i === act, done = i < act || t > tC;
        s.style.background = on && !done ? '#465638' : 'transparent';
        s.style.color = on && !done ? '#fff' : '#30352D';
        const n = s.querySelector('.n');
        n.style.background = on && !done ? '#F2F0E8' : done ? '#465638' : '#e3e5de';
        n.style.color = on && !done ? '#465638' : done ? '#fff' : '#5d6455';
        n.innerHTML = done ? `<span style="width:24px;height:24px;display:inline-flex">${ICON.check}</span>` : String(i + 1);
      });
      drawCursor(tch, keys, t, c.s, tLogin + 0.7, true);
    };
  });

  scene(9, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    const cam = el('cam', '', root);
    // telefono que se va (transicion celular -> computadora)
    const ph = phone(root);
    screen(ph, `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px">${appIcon(96)}
      <div style="font:800 26px 'Inter';color:#30352D">Carbonio Mail</div></div>`).style.opacity = 1;
    const B = browser(cam, 'Nueva pestaña');
    const shot = el('', '<img src="assets/kerberos_login.png">', B.view, { position: 'absolute', inset: 0, opacity: 0 });
    shot.querySelector('img').style.width = '1400px';
    const enter = el('keycap', 'Enter ⏎', cam); place(enter, ADDR.x + 318, ADDR.y - 18);
    const cardHl = highlight(cam, KER.card, 6, 16);
    header(root, '08', 'Sistema Kerberos', 'ACCESO A KERBEROS');
    const cur = cursor(cam);
    const spec = { node: B.url, text: 'kerberos-produccion.policia.bo', t0: T.S(0, 1) + 0.35, cps: 12, focus: 2.9, caretH: 20 };
    const typeEnd = spec.t0 + spec.text.length / spec.cps;
    const tEnter = typeEnd + 0.4;
    spec.blur = tEnter + 0.1;
    const keys = [
      { t: 1.6, x: 1300, y: 760 },
      { t: 2.8, x: ADDR.x + 90, y: ADDR.y + 4, d: 1.1, click: true },
      { t: tEnter + 2.4, x: 860, y: 560, d: 1.2 },
    ];
    const camKeys = [{ t: 0, ...CAM0 }, { t: 3.4, x: 720, y: 230, s: 2.0, d: 1.0 }, { t: tEnter + 1.5, ...CAM0, d: 1.1 },
      { t: T.S(1, 0) + 2.4, ...KER_CAM, d: 1.4 }];
    typingEvents(ctx, spec); clickEvents(ctx, keys); ev(ctx, tEnter, 'key');
    return function (t) {
      const c = camAt(camKeys, t); applyCam(cam, c);
      const out = ease(P(t, 0.1, 0.9));
      ph.el.style.opacity = 1 - out; ph.el.style.transform = `translateX(${-500 * out}px) scale(${lerp(1, 0.8, out)})`;
      reveal(B.el, t, 0.5, { d: 0.9, dy: 30, scale: 0.94 });
      drawTyping(spec, t);
      const ep = P(t, tEnter - 0.1, 0.25) * (1 - P(t, tEnter + 0.9, 0.3));
      enter.style.opacity = ep; enter.style.transform = `translateY(${(1 - ep) * 8}px)`;
      B.load.style.width = (ease(P(t, tEnter + 0.1, 1.0)) * 100) + '%';
      B.load.style.opacity = 1 - P(t, tEnter + 1.1, 0.3);
      shot.style.opacity = ease(P(t, tEnter + 0.7, 0.6));
      B.newtab.style.opacity = 1 - P(t, tEnter + 0.7, 0.4);
      B.tab.textContent = t > tEnter + 0.8 ? 'Kerberos · Iniciar sesión' : 'Nueva pestaña';
      drawHighlight(cardHl, t, T.S(1, 0) + 0.4);
      drawCursor(cur, keys, t, c.s);
    };
  });

  // ===== ESCENA 10: CONTRASENA INDEPENDIENTE DE KERBEROS =====
  scene(10, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    const cam = el('cam', '', root);
    const B = browser(cam, 'Kerberos · Iniciar sesión');
    el('', '<img src="assets/kerberos_login.png" style="width:1400px">', B.view, { position: 'absolute', inset: 0 });
    B.newtab.style.display = 'none';
    B.url.textContent = 'kerberos-produccion.policia.bo';
    const kf = (r) => field(cam, { x: r.x + 28 * KK, y: r.y + 3, w: r.w - 64 * KK, h: r.h - 6 }, {
      bg: '#2f2f2f', radius: 3, padX: 4, valTop: 5, valFont: "500 12.5px 'Inter'", valColor: '#ececec' });
    const fE = kf(KER.email), fP = kf(KER.pass);
    const press = el('abs', '', cam, { background: 'rgba(0,0,0,.3)', borderRadius: '4px', opacity: 0 });
    place(press, KER.btn.x, KER.btn.y, KER.btn.w, KER.btn.h);
    const items = [[KER.email, '1', 'Correo institucional'], [KER.pass, '2', 'Contraseña de Kerberos'], [KER.btn, '3', 'Iniciar sesión']];
    const hls = items.map(([r]) => highlight(cam, r, 4, 6));
    const bds = items.map(([r, n]) => badge(cam, n, r.x + r.w + 12, r.y + r.h / 2 - 15, 30));
    header(root, '09', 'Sistema Kerberos', 'CONTRASEÑA INDEPENDIENTE');
    const attn = el('card', `<div style="display:flex;gap:16px;align-items:center"><div class="ico" style="width:58px;height:58px;background:#F2F0E8;color:#465638">${ICON.alert}</div>
      <div style="font:800 26px 'Montserrat';color:#F2F0E8;letter-spacing:.1em">ATENCIÓN</div></div>
      <div style="font:800 30px/1.3 'Montserrat';color:#fff;margin-top:18px">LA CONTRASEÑA DE KERBEROS ES DIFERENTE A LA DEL CORREO INSTITUCIONAL.</div>`, root,
      { background: '#465638', borderLeft: '10px solid #F2F0E8', padding: '32px 34px' });
    place(attn, 70, 300, 560);
    // comparacion
    const cmp = el('abs bg-ivory', '', root, { left: 0, top: 0, width: '1920px', height: '1080px', zIndex: 15 });
    el('mont', 'NO ES LA MISMA CONTRASEÑA', cmp, { position: 'absolute', left: 0, right: 0, top: '215px', textAlign: 'center', font: "800 44px 'Montserrat'", color: '#465638', letterSpacing: '.03em' });
    const mkC = (x, ic, title, url, body) => {
      const c = el('card', `<div style="display:flex;gap:20px;align-items:center"><div class="ico" style="width:76px;height:76px">${ic}</div>
        <div style="font:800 32px 'Montserrat';color:#30352D">${title}</div></div>
        <div style="margin-top:20px;display:inline-block;padding:8px 16px;border-radius:10px;background:#F2F0E8;font:700 21px 'Inter';color:#465638">${url}</div>
        <div class="bd" style="font:500 26px/1.45 'Inter';color:#30352D;margin-top:22px">${body}</div>`, cmp,
        { padding: '40px', borderTop: '10px solid #465638' });
      place(c, x, 320, 700, 390);
      return c;
    };
    const cMail = mkC(150, ICON.mail, 'CORREO INSTITUCIONAL', 'mail.policia.bo', 'Utiliza la <b>nueva contraseña</b> configurada en mail.policia.bo.');
    const cKer = mkC(1070, ICON.shield, 'KERBEROS', 'kerberos-produccion.policia.bo',
      'Utiliza una <b>contraseña independiente</b> <span class="h1">proporcionada por el <b>personal encargado del sistema</b></span> <span class="h2">o enviada directamente al correo institucional.</span>');
    const neq = el('abs mont', '≠', cmp, { width: '110px', height: '110px', borderRadius: '50%', background: '#465638', color: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center', font: "800 66px 'Montserrat'", boxShadow: '0 0 0 10px #F2F0E8' });
    place(neq, 960 - 55, 460);
    const h1 = cKer.querySelector('.h1'), h2 = cKer.querySelector('.h2');
    const cur = cursor(cam);

    const u0 = T.S(0, 0), u0b = T.S(0, 1), u1 = T.S(1, 0), u2 = T.S(2, 0), u2b = T.S(2, 1);
    const sE = { node: fE.val, text: 'nombre.usuario@policia.bo', t0: u0 + 1.6, cps: 11, caretH: 13 };
    const sP = { node: fP.val, text: 'x'.repeat(16), mask: true, t0: u0b + 1.0, cps: 10, caretH: 13 };
    sE.blur = sP.t0 - 0.35;
    const cmpIn = u2 - 1.3, cmpOut = Math.max(u2b + 3.6, T.dur - 5.6);
    const tBtn = cmpOut + 2.1;
    const keys = [
      { t: 0.6, x: KER.card.x + 120, y: KER.card.y + 120 },
      { t: u0 + 1.2, x: KER.email.x + KER.email.w - 70, y: KER.email.y + 18, d: 1.0, click: true },
      { t: u0b + 0.6, x: KER.pass.x + KER.pass.w - 90, y: KER.pass.y + 18, d: 0.9, click: true },
      { t: tBtn, x: KER.btn.x + KER.btn.w / 2 + 30, y: KER.btn.y + KER.btn.h / 2 + 3, d: 1.2, click: true },
    ];
    typingEvents(ctx, sE); typingEvents(ctx, sP); clickEvents(ctx, keys);
    ev(ctx, cmpIn, 'whoosh'); ev(ctx, cmpOut, 'whoosh');

    return function (t) {
      applyCam(cam, KER_CAM);
      fE.el.style.opacity = t >= sE.t0 - 0.4 ? 1 : 0;
      fP.el.style.opacity = t >= sP.t0 - 0.4 ? 1 : 0;
      drawTyping(sE, t); drawTyping(sP, t);
      const starts = [u0 + 0.3, u0b, cmpOut + 0.9];
      for (let i = 0; i < 3; i++) {
        drawHighlight(hls[i], t, starts[i]);
        reveal(bds[i], t, starts[i] + 0.1, { d: 0.4, dy: 0, scale: 0.6 });
      }
      reveal(attn, t, u1 - 0.2, { d: 0.7, dx: -30, dy: 0, out: cmpIn });
      const pin = ease(P(t, cmpIn, 0.8)), pout = easeIn(P(t, cmpOut, 0.6));
      cmp.style.transform = `translateY(${(1 - pin) * 1080 + pout * 1080}px)`;
      cmp.style.visibility = pin > 0 && pout < 1 ? 'visible' : 'hidden';
      reveal(cMail, t, cmpIn + 0.5, { d: 0.6, dy: 26 });
      reveal(cKer, t, cmpIn + 0.8, { d: 0.6, dy: 26 });
      reveal(neq, t, cmpIn + 1.2, { d: 0.5, dy: 0, scale: 0.5 });
      const hlc = (node, a) => { const g = P(t, a, 0.4); node.style.background = `rgba(113,129,94,${0.28 * g})`; node.style.borderRadius = '6px'; };
      hlc(h1, u2 + 1.9); hlc(h2, u2b + 0.2);
      press.style.opacity = t > tBtn - 0.02 && t < tBtn + 0.25 ? 1 : 0;
      drawCursor(cur, keys, t, KER_CAM.s);
    };
  });

  // ===== ESCENA 11: RESUMEN Y CIERRE =====
  const CLOSING_AT = 17.2;
  scene(11, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    header(root, '✓', 'Resumen', 'TRES PASOS PARA INGRESAR');
    const defs = [
      ['PASO 1', 'CORREO INSTITUCIONAL', ICON.mail, 'mail.policia.bo', 'Ingresar y actualizar contraseña.'],
      ['PASO 2 · OPCIONAL', 'CARBONIO MAIL', ICON.phone, null, 'Alternativa para mayor comodidad: configurar el dominio institucional y usar la contraseña del correo actualizada.'],
      ['PASO 3', 'SISTEMA KERBEROS', ICON.shield, 'kerberos-produccion.policia.bo', 'Ingresar con una contraseña independiente.'],
    ];
    const cards = defs.map(([n, ttl, ic, url, body], i) => {
      const c = el('card', `<div style="height:110px;background:#465638;border-radius:18px 18px 0 0;display:flex;align-items:center;gap:18px;padding:0 28px">
        <div class="ico" style="width:62px;height:62px;background:#F2F0E8;color:#465638">${ic}</div>
        <div><div style="font:700 18px 'Montserrat';color:#c9d1b8;letter-spacing:.14em">${n}</div><div style="font:800 25px 'Montserrat';color:#fff">${ttl}</div></div></div>
        <div style="padding:26px 28px">${url ? `<div style="display:inline-block;padding:7px 14px;border-radius:10px;background:#F2F0E8;font:700 19px 'Inter';color:#465638;margin-bottom:16px">${url}</div>` : ''}
        <div style="font:500 23px/1.45 'Inter';color:#30352D">${body}</div></div>`, root);
      place(c, 90 + i * 600, 290, 540, 340);
      return c;
    });
    const svg = el('abs', `<svg width="1920" height="1080"><g fill="none" stroke="#465638" stroke-width="5" stroke-linecap="round">
      <path class="l1" pathLength="1" d="M630 460 H690"/><path class="l2" pathLength="1" d="M1230 460 H1290"/></g>
      <g fill="#71815E"><circle class="d1" r="7"/><circle class="d2" r="7"/></g></svg>`, root, { left: 0, top: 0, width: '1920px', height: '1080px', zIndex: 2 });
    const l1 = svg.querySelector('.l1'), l2 = svg.querySelector('.l2'), d1 = svg.querySelector('.d1'), d2 = svg.querySelector('.d2');
    l1.style.strokeDasharray = l2.style.strokeDasharray = '1';
    const safe = el('', `<span style="width:34px;height:34px;display:inline-flex">${ICON.lock}</span>Mantén siempre tus credenciales protegidas`, root,
      { position: 'absolute', left: 0, right: 0, margin: '0 auto', width: 'max-content', top: '690px', display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px 32px', borderRadius: '999px', background: '#30352D', color: '#F2F0E8', font: "700 27px 'Montserrat'" });
    // cierre
    const fin = el('abs bg-olive', '', root, { left: 0, top: 0, width: '1920px', height: '1080px', zIndex: 30 });
    el('grid-olive', '', fin);
    const layers = ['emblem', 'title', 'ribbon'].map((n) => {
      const L = el('abs', `<img src="assets/${n}.png" style="width:100%">`, fin); place(L, 960 - 550, 90, 1100); return L;
    });
    const tagline = el('abs mont', 'Tecnología al servicio de la institución', fin, { left: 0, right: 0, top: '820px', textAlign: 'center',
      font: "600 40px 'Montserrat'", color: '#F2F0E8', letterSpacing: '.06em' });
    const rule = el('abs', '', fin, { left: '760px', width: '400px', top: '895px', height: '3px', background: '#71815E' });
    const a = [T.S(0, 0) + 0.2, T.S(0, 1) - 0.1, T.S(0, 2) - 0.1];
    a.forEach((x) => ev(ctx, x, 'pop'));
    ev(ctx, CLOSING_AT + 0.6, 'chime');
    return function (t) {
      cards.forEach((c, i) => reveal(c, t, a[i], { d: 0.7, dy: 30 }));
      l1.style.strokeDashoffset = 1 - ease(P(t, a[1] - 0.5, 0.5));
      l2.style.strokeDashoffset = 1 - ease(P(t, a[2] - 0.5, 0.5));
      const dot = (d, x0, on) => { const ph = (t * 0.6) % 1; d.setAttribute('cx', x0 + 60 * ph); d.setAttribute('cy', 460); d.style.opacity = on ? Math.sin(Math.PI * ph) : 0; };
      dot(d1, 630, t > a[1]); dot(d2, 1230, t > a[2]);
      reveal(safe, t, T.S(1, 0) - 0.1, { d: 0.6, dy: 16 });
      fin.style.visibility = t >= CLOSING_AT ? 'visible' : 'hidden';
      layers.forEach((L, i) => reveal(L, t, CLOSING_AT + 0.5 + i * 0.45, { d: i ? 0.8 : 1.1, dy: i ? 30 : 0, scale: i ? null : 1.1 }));
      reveal(tagline, t, CLOSING_AT + 2.2, { d: 0.8, dy: 16 });
      const rp = ease(P(t, CLOSING_AT + 2.6, 0.8));
      rule.style.transform = `scaleX(${rp})`;
    };
  });


  window.CORE.finalize({ extraWipes: [TL.scenes[10].start + CLOSING_AT] });
})();
