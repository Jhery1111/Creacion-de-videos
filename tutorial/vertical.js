/* Escenas de la version vertical corta (1080x1920, TikTok / Reels). Motor en core.js.
 * La camara usa escala efectiva (sin base); VIEW centra el contenido en la zona media.
 */
(function () {
  'use strict';
  const { ease, clamp, P, lerp, el, px, place, reveal, ICON, TL, header, browser, ADDR, KK, cursor, drawCursor, drawTyping,
    camAt, applyCam, VIEW, highlight, drawHighlight, badge, field, MAIL, mailField, PS, phone, screen, appIcon, KER, scene, ev,
    typingEvents, clickEvents } = window.CORE;

  VIEW.cx = 540; VIEW.cy = 870;
  const WIDE = { x: 960, y: 540, s: 0.72 }; // navegador completo a lo ancho
  const CUR = 1.25;                          // cursor un poco mas grande en vertical

  // ===== V1: PORTADA =====
  scene(1, function (root, T, ctx) {
    root.classList.add('bg-olive');
    const grid = el('grid-olive', '', root);
    let seed = 5;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let paths = '';
    for (let i = 0; i < 16; i++) {
      const left = i % 2 === 0;
      const y0 = 120 + i * 108 + rnd() * 30;
      const x1 = 60 + rnd() * 160, dy = (rnd() < 0.5 ? -1 : 1) * (40 + rnd() * 40);
      const x2 = x1 + Math.abs(dy), x3 = x2 + 80 + rnd() * 150;
      const X = (v) => (left ? v : 1080 - v);
      paths += `<path class="cp" pathLength="1" d="M${X(-10)} ${y0} H${X(x1)} L${X(x2)} ${y0 + dy} H${X(x3)}"/><circle class="cn" cx="${X(x3)}" cy="${y0 + dy}" r="6"/>`;
    }
    const svg = el('abs', `<svg width="1080" height="1920" style="position:absolute;left:0;top:0"><g fill="#30352D" stroke="#9aa886" stroke-width="2" stroke-opacity=".45">${paths}</g></svg>`,
      root, { left: 0, top: 0, width: '1080px', height: '1920px' });
    svg.querySelectorAll('.cp').forEach((p) => (p.style.fill = 'none'));
    const cps = [...svg.querySelectorAll('.cp')], cns = [...svg.querySelectorAll('.cn')];
    const logo = el('abs', '<img src="assets/logo200_white.png" style="width:100%">', root); place(logo, 140, 300, 800);
    const title = el('abs mont', 'ACCEDE A TUS<br>SISTEMAS<br>INSTITUCIONALES', root,
      { left: 0, width: '1080px', textAlign: 'center', color: '#fff', font: "800 76px/1.1 'Montserrat'" });
    place(title, 0, 780);
    const sub = el('abs mont', 'EN 3 PASOS', root, { left: 0, width: '1080px', textAlign: 'center', color: '#c9d1b8', font: "800 34px 'Montserrat'", letterSpacing: '.3em' });
    place(sub, 0, 1060);
    const steps = [['1', 'Correo institucional', ICON.mail], ['2', 'Carbonio Mail · opcional', ICON.phone], ['3', 'Sistema Kerberos', ICON.shield]];
    const pills = steps.map(([n, txt, ic], i) => {
      const p = el('abs', `<div style="width:56px;height:56px;border-radius:50%;background:#F2F0E8;color:#465638;display:flex;align-items:center;justify-content:center;font:800 28px 'Montserrat'">${n}</div>
        <span style="flex:1">${txt}</span><span style="width:36px;height:36px;display:inline-flex;color:#c9d1b8">${ic}</span>`, root, {
        display: 'flex', alignItems: 'center', gap: '22px', padding: '12px 28px 12px 12px', borderRadius: '999px',
        border: '2px solid rgba(242,240,232,.35)', background: 'rgba(48,60,46,.5)', color: '#F2F0E8', font: "700 34px 'Montserrat'" });
      place(p, 150, 1140 + i * 100, 780);
      return p;
    });
    return function (t) {
      grid.style.transform = `translate(${(t * 6) % 60}px, ${(t * 4) % 60}px)`;
      cps.forEach((p, i) => {
        p.style.strokeDasharray = '1';
        p.style.strokeDashoffset = 1 - ease(P(t, 0.1 + i * 0.08, 1.4));
        cns[i].style.opacity = P(t, 1.3 + i * 0.08, 0.4);
      });
      reveal(logo, t, 0.3, { d: 1.0, dy: 0, scale: 0.9 });
      reveal(title, t, 0.9, { d: 0.8, dy: 30 });
      reveal(sub, t, 1.5, { d: 0.6, dy: 16 });
      pills.forEach((p, i) => reveal(p, t, 2.2 + i * 0.35, { d: 0.6, dy: 20 }));
    };
  });

  // ===== V2: PASO 1, CORREO =====
  scene(2, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    const cam = el('cam', '', root);
    const B = browser(cam, 'Nueva pestaña');
    const shot = el('', '<img src="assets/mail_login.png">', B.view, { position: 'absolute', inset: 0, opacity: 0 });
    const enter = el('keycap', 'Enter ⏎', cam); place(enter, ADDR.x + 150, ADDR.y + 24);
    const fU = mailField(cam, MAIL.user, 'Nombre de usuario');
    const fP = mailField(cam, MAIL.pass, 'Contraseña');
    fP.el.style.width = px(MAIL.pass.w - 40);
    const press = el('abs', '', cam, { background: 'rgba(0,0,0,.25)', borderRadius: '5px', opacity: 0 });
    place(press, MAIL.btn.x, MAIL.btn.y, MAIL.btn.w, MAIL.btn.h);
    const items = [MAIL.user, MAIL.pass, MAIL.btn];
    const hls = items.map((r) => highlight(cam, r, 5));
    const bds = items.map((r, i) => badge(cam, i + 1, r.x - 48, r.y + r.h / 2 - 16, 32));
    header(root, '1', 'Paso 1', 'CORREO INSTITUCIONAL');
    const cur = cursor(cam);
    const u0 = T.S(0, 0), u1 = T.S(1, 0), u1b = T.S(1, 1);
    const sUrl = { node: B.url, text: 'mail.policia.bo', t0: u0 + 2.4, cps: 10, focus: 1.9, caretH: 20 };
    const tEnter = sUrl.t0 + sUrl.text.length / sUrl.cps + 0.35;
    sUrl.blur = tEnter + 0.1;
    const sU = { node: fU.val, text: 'nombre.usuario@policia.bo', t0: u1 + 0.7, cps: 14, caretH: 15 };
    const sP = { node: fP.val, text: 'x'.repeat(14), mask: true, t0: u1b + 0.4, cps: 12, caretH: 15 };
    sU.blur = sP.t0 - 0.3;
    const tBtn = sP.t0 + sP.text.length / sP.cps + 0.9;
    const keys = [
      { t: 0.9, x: 1200, y: 640 },
      { t: 1.8, x: ADDR.x + 230, y: ADDR.y + 6, d: 0.9, click: true },
      { t: u1 + 0.4, x: MAIL.user.x + MAIL.user.w - 40, y: MAIL.user.y + 30, d: 0.9, click: true },
      { t: u1b + 0.15, x: MAIL.pass.x + MAIL.pass.w - 80, y: MAIL.pass.y + 30, d: 0.7, click: true },
      { t: tBtn, x: MAIL.btn.x + MAIL.btn.w / 2 + 20, y: MAIL.btn.y + MAIL.btn.h / 2 + 4, d: 0.8, click: true },
    ];
    const camKeys = [{ t: 0, ...WIDE }, { t: 1.9, x: 560, y: 216, s: 2.3, d: 1.0 },
      { t: tEnter + 1.0, ...WIDE, d: 0.9 }, { t: u1 + 0.3, x: 550, y: 585, s: 1.6, d: 1.0 }];
    typingEvents(ctx, sUrl); typingEvents(ctx, sU); typingEvents(ctx, sP); clickEvents(ctx, keys); ev(ctx, tEnter, 'key');
    return function (t) {
      const c = camAt(camKeys, t); applyCam(cam, c);
      reveal(B.el, t, 0.1, { d: 0.7, dy: 30, scale: 0.94 });
      drawTyping(sUrl, t);
      const ep = P(t, tEnter - 0.1, 0.25) * (1 - P(t, tEnter + 0.9, 0.3));
      enter.style.opacity = ep;
      B.load.style.width = (ease(P(t, tEnter + 0.1, 0.9)) * 100) + '%';
      B.load.style.opacity = 1 - P(t, tEnter + 1.0, 0.3);
      shot.style.opacity = ease(P(t, tEnter + 0.6, 0.5));
      B.newtab.style.opacity = 1 - P(t, tEnter + 0.6, 0.4);
      B.tab.textContent = t > tEnter + 0.7 ? 'Policía Boliviana · Correo' : 'Nueva pestaña';
      fU.el.style.opacity = t >= sU.t0 - 0.3 ? 1 : 0;
      fP.el.style.opacity = t >= sP.t0 - 0.3 ? 1 : 0;
      drawTyping(sU, t); drawTyping(sP, t);
      const starts = [u1 + 0.2, u1b, tBtn - 0.8];
      for (let i = 0; i < 3; i++) {
        drawHighlight(hls[i], t, starts[i]);
        reveal(bds[i], t, starts[i] + 0.1, { d: 0.4, dy: 0, scale: 0.6 });
      }
      press.style.opacity = t > tBtn - 0.02 && t < tBtn + 0.25 ? 1 : 0;
      drawCursor(cur, keys, t, c.s / CUR);
    };
  });

  // ===== V3: NUEVA CONTRASENA Y REQUISITOS =====
  scene(3, function (root, T, ctx) {
    root.classList.add('bg-white');
    header(root, '1', 'Paso 1 · Primer ingreso', 'NUEVA CONTRASEÑA');
    const form = el('vcard', '', root); place(form, 70, 300, 940, 540);
    const tag = el('tag', 'Representación ilustrativa', root); place(tag, 700, 282);
    const tx = (html, x, y, style) => { const n = el('abs', html, root, style); place(n, x, y); return n; };
    tx('Nueva contraseña', 110, 336, { font: "800 32px 'Montserrat'", color: '#465638' });
    tx('Nueva contraseña', 110, 396, { font: "600 22px 'Inter'", color: '#5d6455' });
    const box = (y) => { const b = el('abs', '', root, { borderRadius: '12px', border: '2px solid #cfd2c8', background: '#fff', padding: '0 20px',
      display: 'flex', alignItems: 'center', font: "600 30px 'Inter'", color: '#30352D', letterSpacing: '.06em', whiteSpace: 'pre' }); place(b, 110, y, 860, 66); return b; };
    const in1 = box(428);
    const segs = Array.from({ length: 5 }, (_, i) => { const s = el('abs', '', root, { borderRadius: '6px', background: '#e3e5de' }); place(s, 110 + i * 176, 508, 164, 12); return s; });
    const meterTxt = tx('', 110, 530, { font: "600 21px 'Inter'", color: '#465638' });
    tx('Confirmar nueva contraseña', 110, 576, { font: "600 22px 'Inter'", color: '#5d6455' });
    const in2 = box(608);
    const match = tx(`<span style="display:inline-flex;width:26px;height:26px;color:#465638;vertical-align:-5px">${ICON.check}</span> Las contraseñas coinciden`, 110, 688,
      { font: "600 23px 'Inter'", color: '#465638', opacity: 0 });
    const btn = el('abs p-btn', 'CONTINUAR', root, { background: '#465638', fontFamily: 'Montserrat', fontSize: '24px', letterSpacing: '.05em' });
    place(btn, 110, 736, 860, 72);
    const reqs = ['Más de 15 caracteres', 'Mayúsculas y minúsculas', 'Números', 'Símbolos especiales', 'Sin tu nombre ni datos de tu correo'];
    const rows = reqs.map((r, i) => {
      const n = el('vcard', `<div class="ico" style="width:58px;height:58px">${ICON.check}</div><div style="font:800 31px 'Montserrat';color:#30352D">${r}</div>`, root,
        { background: '#F2F0E8', borderLeft: '10px solid #465638', display: 'flex', alignItems: 'center', gap: '24px', padding: '0 28px' });
      place(n, 70, 880 + i * 112, 940, 100);
      return n;
    });
    const s1 = T.S(0, 1), s2 = T.S(0, 2);
    const times = [s1 + 0.6, s1 + 1.8, s1 + 3.2, s1 + 4.1, s2 + 0.3];
    times.forEach((x) => ev(ctx, x, 'pop'));
    const tIn2 = s2 + 0.5, tBtn = Math.min(T.dur - 1.0, tIn2 + 2.9);
    const cur = cursor(root);
    const keys = [{ t: tIn2 + 1.6, x: 900, y: 1300 }, { t: tBtn, x: 600, y: 776, d: 1.0, click: true }];
    clickEvents(ctx, keys);
    for (let i = 0; i < 18; i++) { ev(ctx, 0.9 + i / 10, 'key'); ev(ctx, tIn2 + i / 10, 'key'); }
    return function (t) {
      reveal(form, t, 0.2, { d: 0.6, dy: 20 });
      root.querySelectorAll(':scope > .abs, :scope > .tag').forEach((n) => { if (n !== match && n !== btn) n.style.opacity = ease(P(t, 0.35, 0.5)); });
      btn.style.opacity = ease(P(t, 0.35, 0.5));
      let done = 0;
      rows.forEach((r, i) => {
        reveal(r, t, times[i], { d: 0.5, dx: -30, dy: 0 });
        const ck = r.querySelector('.ck'); ck.style.strokeDasharray = '1'; ck.style.strokeDashoffset = 1 - ease(P(t, times[i] + 0.2, 0.4));
        if (t >= times[i]) done++;
      });
      in1.textContent = '•'.repeat(clamp(Math.floor((t - 0.9) * 10) + 1, 0, 18));
      in2.textContent = '•'.repeat(clamp(Math.floor((t - tIn2) * 10) + 1, 0, 18));
      segs.forEach((s, i) => (s.style.background = i < done ? '#465638' : '#e3e5de'));
      meterTxt.textContent = `Requisitos cumplidos: ${done} de 5`;
      match.style.opacity = ease(P(t, tIn2 + 1.9, 0.4));
      btn.style.background = t > tBtn - 0.02 && t < tBtn + 0.22 ? '#303C2E' : '#465638';
      const saved = P(t, tBtn + 0.4, 0.3);
      btn.innerHTML = saved > 0 ? `<span style="display:inline-flex;width:30px;height:30px;margin-right:12px">${ICON.check}</span>GUARDADO` : 'CONTINUAR';
      const ck = btn.querySelector('.ck'); if (ck) { ck.style.strokeDasharray = '1'; ck.style.strokeDashoffset = 1 - saved; }
      drawCursor(cur, keys, t, 1 / CUR);
    };
  });

  // ===== V4: PASO 2 OPCIONAL, CARBONIO MAIL =====
  scene(4, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    header(root, '2', 'Paso 2 · Opcional', 'APP CARBONIO MAIL');
    const cam = el('cam', '', root);
    const ph = phone(cam);
    const splash = screen(ph, `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px">
      ${appIcon(110)}<div style="font:800 28px 'Inter';color:#30352D">Carbonio Mail</div></div>`);
    const head = `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:22px">${appIcon(70)}
      <div style="font:800 24px 'Inter';color:#30352D">Carbonio Mail</div></div>`;
    const sA = screen(ph, `${head}<div style="margin-top:46px" class="p-label">Servidor</div><div class="p-input"><span class="v"></span></div>
      <div class="p-btn bA" style="margin-top:26px">Continuar</div>`);
    const sB = screen(ph, `${head}
      <div style="margin:14px auto 0;width:max-content;padding:5px 14px;border-radius:999px;background:#F2F0E8;font:600 14px 'Inter';color:#465638">mail.policia.bo</div>
      <div style="margin-top:22px" class="p-label">Correo electrónico</div><div class="p-input"><span class="v1"></span></div>
      <div style="margin-top:16px" class="p-label">Contraseña</div><div class="p-input"><span class="v2"></span></div>
      <div class="p-btn bB" style="margin-top:24px">Iniciar sesión</div>`);
    const rowsH = Array.from({ length: 7 }, (_, i) => `<div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #eceee8">
      <div style="width:40px;height:40px;border-radius:50%;background:#dfe2d8;flex:none"></div><div style="flex:1;display:grid;gap:8px">
      <div class="sk" style="width:${55 + (i * 17) % 35}%"></div><div class="sk" style="width:${70 + (i * 11) % 25}%;height:10px;background:#eceee8"></div></div></div>`).join('');
    const sC = screen(ph, `<div style="font:800 24px 'Inter';color:#30352D;margin:8px 0 10px 2px">Bandeja de entrada</div>${rowsH}
      <div class="toast" style="position:absolute;left:22px;right:22px;bottom:26px;height:54px;border-radius:12px;background:#465638;color:#fff;display:flex;align-items:center;gap:10px;padding:0 16px;font:700 17px 'Inter'">
      <span style="width:24px;height:24px;display:inline-flex">${ICON.check}</span>Sesión iniciada</div>`);
    const chip = el('abs', `<span style="width:34px;height:34px;display:inline-flex">${ICON.phone}</span>ALTERNATIVA OPCIONAL · MAYOR COMODIDAD`, root, {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', borderRadius: '999px', border: '3px solid #71815E',
      background: '#fff', color: '#465638', font: "800 26px 'Montserrat'" });
    place(chip, 70, 318, 940, 84);
    const warn = el('vcard', `<div class="ico" style="width:70px;height:70px;background:#F2F0E8;color:#303C2E">${ICON.alert}</div>
      <div><div style="font:800 22px 'Montserrat';color:#c9d1b8;letter-spacing:.12em">IMPORTANTE</div>
      <div style="font:800 31px/1.2 'Montserrat';color:#fff;margin-top:4px">PRIMERO VALIDA TU CUENTA<br>EN EL NAVEGADOR</div></div>`, root,
      { background: '#303C2E', borderLeft: '10px solid #71815E', display: 'flex', alignItems: 'center', gap: '24px', padding: '0 30px' });
    place(warn, 70, 290, 940, 160);
    const tag = el('tag', 'Representación ilustrativa', root); place(tag, 412, 1420);
    const tch = cursor(cam, true);
    const CAMV = { x: 960, y: 482, s: 1.15 };
    const u1 = T.S(1, 0), u2 = T.S(2, 0);
    const vA = sA.querySelector('.v'), v1 = sB.querySelector('.v1'), v2 = sB.querySelector('.v2');
    const tA = u2 - 0.3;
    const spA = { node: vA, text: 'mail.policia.bo', t0: u2 + 1.4, cps: 11, caretH: 20 };
    const tCont = spA.t0 + spA.text.length / spA.cps + 0.35, tB = tCont + 0.4;
    const sp1 = { node: v1, text: 'nombre.usuario@policia.bo', t0: tB + 0.6, cps: 17, caretH: 20 };
    const tP = sp1.t0 + sp1.text.length / sp1.cps + 0.2;
    const sp2 = { node: v2, text: 'x'.repeat(16), mask: true, t0: tP + 0.25, cps: 15, caretH: 20 };
    sp1.blur = tP; spA.blur = tCont;
    const tLogin = sp2.t0 + 16 / 15 + 0.35, tC = tLogin + 0.5;
    const yA = 60 + 22 + 70 + 12 + 30 + 46 + 22 + 27, yAb = yA + 27 + 26 + 27;
    const yB1 = 60 + 22 + 70 + 12 + 30 + 14 + 26 + 22 + 22 + 27, yB2 = yB1 + 27 + 16 + 22 + 27, yBb = yB2 + 27 + 24 + 27;
    const keys = [
      { t: spA.t0 - 0.6, ...PS(180, yA) }, { t: spA.t0 - 0.3, ...PS(180, yA), d: 0.2, click: true },
      { t: tCont, ...PS(178, yAb), d: 0.5, click: true },
      { t: sp1.t0 - 0.2, ...PS(180, yB1), d: 0.5, click: true },
      { t: tP, ...PS(180, yB2), d: 0.4, click: true },
      { t: tLogin, ...PS(178, yBb), d: 0.4, click: true },
    ];
    typingEvents(ctx, spA); typingEvents(ctx, sp1); typingEvents(ctx, sp2); clickEvents(ctx, keys, 'tap');
    return function (t) {
      applyCam(cam, CAMV);
      reveal(ph.el, t, 0.2, { d: 0.8, dy: 60 });
      const ga = ease(P(t, tA, 0.4)), ab = ease(P(t, tB - 0.2, 0.4)), bc = ease(P(t, tC, 0.4));
      splash.style.opacity = 1 - ga;
      sA.style.opacity = ga * (1 - ab); sA.style.transform = `translateX(${-60 * ab}px)`;
      sB.style.opacity = ab * (1 - bc); sB.style.transform = `translateX(${60 * (1 - ab) - 60 * bc}px)`;
      sC.style.opacity = bc; sC.style.transform = `translateX(${60 * (1 - bc)}px)`;
      drawTyping(spA, t); drawTyping(sp1, t); drawTyping(sp2, t);
      sA.querySelector('.bA').style.background = t > tCont - 0.03 && t < tCont + 0.22 ? '#1d201b' : '#30352D';
      sB.querySelector('.bB').style.background = t > tLogin - 0.03 && t < tLogin + 0.22 ? '#1d201b' : '#30352D';
      reveal(sC.querySelector('.toast'), t, tC + 0.3, { d: 0.4, dy: 20 });
      reveal(chip, t, 0.5, { d: 0.5, dy: 16, out: u1 - 0.4 });
      reveal(warn, t, u1 - 0.2, { d: 0.6, dy: 16 });
      const pulse = P(t, u1 + 0.5, 0.3);
      warn.style.boxShadow = `0 18px 50px rgba(48,60,46,.25), 0 0 0 ${pulse * (6 + 4 * Math.sin(t * 3))}px rgba(113,129,94,.35)`;
      reveal(tag, t, 0.6, { d: 0.5, dy: 8 });
      drawCursor(tch, keys, t, CAMV.s, null, true);
    };
  });

  // ===== V5: PASO 3, KERBEROS =====
  scene(5, function (root, T, ctx) {
    root.classList.add('bg-ivory');
    header(root, '3', 'Paso 3', 'SISTEMA KERBEROS');
    const cam = el('cam', '', root);
    const B = browser(cam, 'Nueva pestaña');
    const shot = el('', '<img src="assets/kerberos_login.png" style="width:1400px">', B.view, { position: 'absolute', inset: 0, opacity: 0 });
    const enter = el('keycap', 'Enter ⏎', cam); place(enter, ADDR.x + 300, ADDR.y + 24);
    const kf = (r) => field(cam, { x: r.x + 28 * KK, y: r.y + 3, w: r.w - 64 * KK, h: r.h - 6 }, {
      bg: '#2f2f2f', radius: 3, padX: 4, valTop: 5, valFont: "500 12.5px 'Inter'", valColor: '#ececec' });
    const fE = kf(KER.email), fP = kf(KER.pass);
    const press = el('abs', '', cam, { background: 'rgba(0,0,0,.3)', borderRadius: '4px', opacity: 0 });
    place(press, KER.btn.x, KER.btn.y, KER.btn.w, KER.btn.h);
    const items = [KER.email, KER.pass, KER.btn];
    const hls = items.map((r) => highlight(cam, r, 4, 6));
    const bds = items.map((r, i) => badge(cam, i + 1, r.x + r.w + 10, r.y + r.h / 2 - 14, 28));
    const banner = el('vcard', `<div class="ico" style="width:62px;height:62px;background:#F2F0E8;color:#465638">${ICON.alert}</div>
      <div style="font:800 29px/1.22 'Montserrat';color:#fff">SU CONTRASEÑA ES DIFERENTE<br>A LA DEL CORREO</div>`, root,
      { background: '#465638', display: 'flex', alignItems: 'center', gap: '22px', padding: '0 30px' });
    place(banner, 70, 290, 940, 150);
    // comparacion
    const cmp = el('abs bg-ivory', '', root, { left: 0, top: '270px', width: '1080px', height: '1200px', zIndex: 15 });
    const mkC = (y, h, ic, title, url, body) => {
      const c = el('vcard', `<div style="display:flex;gap:20px;align-items:center"><div class="ico" style="width:72px;height:72px">${ic}</div>
        <div style="font:800 34px 'Montserrat';color:#30352D">${title}</div></div>
        <div style="margin-top:18px;display:inline-block;padding:8px 16px;border-radius:10px;background:#F2F0E8;font:700 24px 'Inter';color:#465638">${url}</div>
        <div style="font:500 31px/1.4 'Inter';color:#30352D;margin-top:18px">${body}</div>`, cmp, { padding: '34px 38px', borderTop: '10px solid #465638' });
      place(c, 70, y, 940, h);
      return c;
    };
    const cMail = mkC(40, 370, ICON.mail, 'CORREO INSTITUCIONAL', 'mail.policia.bo', 'Usa la <b>nueva contraseña</b> que configuraste en mail.policia.bo.');
    const cKer = mkC(540, 440, ICON.shield, 'KERBEROS', 'kerberos-produccion.policia.bo',
      'Usa una <b>contraseña independiente</b>: <span class="h1">la proporciona el <b>personal encargado del sistema</b></span> <span class="h2">o llega a tu correo institucional.</span>');
    const neq = el('abs mont', '≠', cmp, { width: '110px', height: '110px', borderRadius: '50%', background: '#465638', color: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center', font: "800 66px 'Montserrat'", boxShadow: '0 0 0 10px #F2F0E8' });
    place(neq, 485, 420);
    const h1 = cKer.querySelector('.h1'), h2 = cKer.querySelector('.h2');
    const cur = cursor(cam);
    const u0 = T.S(0, 0), u1 = T.S(1, 0), u1b = T.S(1, 1), u1c = T.S(1, 2);
    const sUrl = { node: B.url, text: 'kerberos-produccion.policia.bo', t0: u0 + 1.6, cps: 16, focus: 1.5, caretH: 20 };
    const tEnter = sUrl.t0 + sUrl.text.length / sUrl.cps + 0.35;
    sUrl.blur = tEnter + 0.1;
    const sE = { node: fE.val, text: 'nombre.usuario@policia.bo', t0: tEnter + 1.2, cps: 18, caretH: 13 };
    const tPc = sE.t0 + sE.text.length / sE.cps + 0.2;
    const sP = { node: fP.val, text: 'x'.repeat(16), mask: true, t0: tPc + 0.25, cps: 16, caretH: 13 };
    sE.blur = tPc;
    const cmpIn = Math.max(sP.t0 + 16 / 16 + 0.3, u1 + 1.2), cmpOut = u1c + 2.2;
    const tBtn = cmpOut + 1.3;
    const keys = [
      { t: 0.8, x: 1200, y: 640 },
      { t: 1.4, x: ADDR.x + 360, y: ADDR.y + 6, d: 0.6, click: true },
      { t: sE.t0 - 0.3, x: KER.email.x + KER.email.w - 70, y: KER.email.y + 18, d: 0.9, click: true },
      { t: tPc, x: KER.pass.x + KER.pass.w - 90, y: KER.pass.y + 18, d: 0.5, click: true },
      { t: tBtn, x: KER.btn.x + KER.btn.w / 2 + 30, y: KER.btn.y + KER.btn.h / 2 + 3, d: 0.9, click: true },
    ];
    const KC = { x: KER.card.x + KER.card.w / 2, y: KER.card.y + KER.card.h / 2 + 5, s: 1.55 };
    const camKeys = [{ t: 0, ...WIDE }, { t: 1.4, x: 610, y: 216, s: 1.75, d: 0.9 }, { t: tEnter + 1.4, ...KC, d: 1.2 }];
    typingEvents(ctx, sUrl); typingEvents(ctx, sE); typingEvents(ctx, sP); clickEvents(ctx, keys); ev(ctx, tEnter, 'key');
    ev(ctx, cmpIn, 'whoosh'); ev(ctx, cmpOut, 'whoosh');
    return function (t) {
      const c = camAt(camKeys, t); applyCam(cam, c);
      reveal(B.el, t, 0.1, { d: 0.7, dy: 30, scale: 0.94 });
      drawTyping(sUrl, t);
      enter.style.opacity = P(t, tEnter - 0.1, 0.25) * (1 - P(t, tEnter + 0.9, 0.3));
      B.load.style.width = (ease(P(t, tEnter + 0.1, 0.9)) * 100) + '%';
      B.load.style.opacity = 1 - P(t, tEnter + 1.0, 0.3);
      shot.style.opacity = ease(P(t, tEnter + 0.6, 0.5));
      B.newtab.style.opacity = 1 - P(t, tEnter + 0.6, 0.4);
      B.tab.textContent = t > tEnter + 0.7 ? 'Kerberos · Iniciar sesión' : 'Nueva pestaña';
      fE.el.style.opacity = t >= sE.t0 - 0.3 ? 1 : 0;
      fP.el.style.opacity = t >= sP.t0 - 0.3 ? 1 : 0;
      drawTyping(sE, t); drawTyping(sP, t);
      const starts = [sE.t0 - 0.4, tPc - 0.1, tBtn - 0.8];
      for (let i = 0; i < 3; i++) {
        drawHighlight(hls[i], t, starts[i]);
        reveal(bds[i], t, starts[i] + 0.1, { d: 0.4, dy: 0, scale: 0.6 });
      }
      reveal(banner, t, u1 - 0.2, { d: 0.6, dy: 16 });
      const pin = ease(P(t, cmpIn, 0.7)), pout = ease(P(t, cmpOut, 0.6));
      cmp.style.transform = `translateY(${(1 - pin) * 1700 + pout * 1700}px)`;
      cmp.style.visibility = pin > 0 && pout < 1 ? 'visible' : 'hidden';
      reveal(cMail, t, cmpIn + 0.4, { d: 0.5, dy: 24 });
      reveal(cKer, t, cmpIn + 0.7, { d: 0.5, dy: 24 });
      reveal(neq, t, cmpIn + 1.0, { d: 0.4, dy: 0, scale: 0.5 });
      const hlc = (node, a) => { const g = P(t, a, 0.4); node.style.background = `rgba(113,129,94,${0.28 * g})`; node.style.borderRadius = '6px'; };
      hlc(h1, u1b + 0.2); hlc(h2, u1c + 0.1);
      press.style.opacity = t > tBtn - 0.02 && t < tBtn + 0.25 ? 1 : 0;
      drawCursor(cur, keys, t, c.s / CUR);
    };
  });

  // ===== V6: CIERRE =====
  scene(6, function (root, T, ctx) {
    root.classList.add('bg-olive');
    el('grid-olive', '', root);
    const layers = ['emblem', 'title', 'ribbon'].map((n) => { const L = el('abs', `<img src="assets/${n}.png" style="width:100%">`, root); place(L, 50, 420, 980); return L; });
    const safe = el('abs', `<span style="width:40px;height:40px;display:inline-flex">${ICON.lock}</span>Protege siempre tus credenciales`, root, {
      left: 0, right: 0, margin: '0 auto', width: 'max-content', top: '1100px', display: 'flex', alignItems: 'center', gap: '16px',
      padding: '18px 34px', borderRadius: '999px', background: '#F2F0E8', color: '#303C2E', font: "800 34px 'Montserrat'" });
    const tagline = el('abs mont', 'Tecnología al servicio<br>de la institución', root, { left: 0, right: 0, top: '1210px', textAlign: 'center',
      font: "600 42px/1.3 'Montserrat'", color: '#F2F0E8', letterSpacing: '.05em' });
    ev(ctx, 0.5, 'chime');
    return function (t) {
      layers.forEach((L, i) => reveal(L, t, 0.2 + i * 0.4, { d: i ? 0.7 : 1.0, dy: i ? 30 : 0, scale: i ? null : 1.1 }));
      reveal(safe, t, 1.0, { d: 0.6, dy: 16 });
      reveal(tagline, t, 2.6, { d: 0.8, dy: 16 });
    };
  });

  window.CORE.finalize({});
})();
