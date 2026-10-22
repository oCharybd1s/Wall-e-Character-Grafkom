
CHARACTERS.VNGO = function(E) {

  var hex = function(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; };
  var M = {
    shell: hex(0xe6e6e1), base: hex(0x2a2c30), slot: hex(0x08090b), metal: hex(0x9aa0a8),
    tank: hex(0xb3b5aa), red: hex(0xd8321e), redDk: hex(0x8e1d12), orange: hex(0xf07a22),
    white: hex(0xffffff), ring: hex(0x2e1410), bristle: hex(0x5f5142), tip: hex(0xf2c230),
    grey: hex(0x8d9198), wheel: hex(0x45484e), cream: hex(0xe8dcae), stripe: hex(0xf0901e),
    can: hex(0xf2f2ef), cyan: hex(0x14b0e6), magenta: hex(0xe0218a), yellow: hex(0xf5d90a)
  };
  var PAINT = [0xd93a2b, 0x2b5fd9, 0xf08a24, 0xf2c84b, 0x2fa37a].map(hex);

  var V = function(x, y, z) { return [x, y, z]; };
  var add = function(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; };
  var group = function(parent) { var g = new E.Obj(); parent.add(g); return g; };

  function part(parent, geo, color, pos, scale) {
    var m = new E.Obj(geo, color);
    m.position = pos.slice();
    if (scale) m.scale = scale.slice();
    parent.add(m);
    return m;
  }
  var sphere = function(p, color, pos, r) {
    return part(p, E.geo.sphere(), color, pos, Array.isArray(r) ? r : [r, r, r]);
  };
  function cylinder(p, color, pos, axis, r, len, opts) {
    opts = opts || {};
    var rr = Array.isArray(r) ? r : [r, r];
    var s = axis === 'x' ? [len, rr[0], rr[1]] : axis === 'y' ? [rr[0], len, rr[1]] : [rr[0], rr[1], len];
    return part(p, E.geo.cyl(axis, opts.open, opts.rTop, opts.rBot), color, pos, s);
  }
  var placeBetween = function(m, a, b, r) { m.matrix = LIBS.segment(a, b, r); };

  var R_FLAT = 40;
  function qBox(p, color, c, w, h, d, r) {
    var cx = c[0], cy = c[1], cz = c[2];
    var hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    var faces = [
      [[cx, cy, cz + d / 2], [0, 0, 0], 2 * hx, 2 * hy],
      [[cx, cy, cz - d / 2], [0, Math.PI, 0], 2 * hx, 2 * hy],
      [[cx + w / 2, cy, cz], [0, Math.PI / 2, 0], 2 * hz, 2 * hy],
      [[cx - w / 2, cy, cz], [0, -Math.PI / 2, 0], 2 * hz, 2 * hy],
      [[cx, cy + h / 2, cz], [-Math.PI / 2, 0, 0], 2 * hx, 2 * hz],
      [[cx, cy - h / 2, cz], [Math.PI / 2, 0, 0], 2 * hx, 2 * hz]
    ];
    faces.forEach(function(f) {
      part(p, E.geo.patch(R_FLAT, f[2], f[3]), color, f[0]).rotation = f[1];
    });
    var open = { open: true };
    [-1, 1].forEach(function(a) {
      [-1, 1].forEach(function(b) {
        cylinder(p, color, [cx, cy + a * hy, cz + b * hz], 'x', r, 2 * hx, open);
        cylinder(p, color, [cx + a * hx, cy, cz + b * hz], 'y', r, 2 * hy, open);
        cylinder(p, color, [cx + a * hx, cy + b * hy, cz], 'z', r, 2 * hz, open);
        [-1, 1].forEach(function(c2) { sphere(p, color, [cx + a * hx, cy + b * hy, cz + c2 * hz], r); });
      });
    });
  }

  function tube(p, color, pts, r) {
    for (var i = 0; i < pts.length - 1; i++) placeBetween(part(p, E.geo.cyl('y', true), color, [0, 0, 0]), pts[i], pts[i + 1], r);
    for (var i = 1; i < pts.length - 1; i++) sphere(p, color, pts[i], r);
  }

  var seed = 7;
  var rand = function() { return (seed = (seed * 16807) % 2147483647) / 2147483647; };
  var paint = function() { return PAINT[Math.floor(rand() * PAINT.length)]; };
  function boxSplat(p, pos, normal) {
    var a = 0.03 + rand() * 0.09, b = 0.02 + rand() * 0.07, t = 0.006;
    var s = normal === 'x' ? [t, a, b] : normal === 'y' ? [a, t, b] : [a, b, t];
    sphere(p, paint(), pos, s);
  }

  var BODY = { y0: 0.4, y1: 2.5, rBot: 0.95, rTop: 0.6 };
  var BODY_H = BODY.y1 - BODY.y0;
  var PARA_P = BODY_H / (1 - Math.pow(BODY.rTop / BODY.rBot, 2));
  var rAt = function(y) { return BODY.rBot * Math.sqrt(Math.max(0, 1 - (y - BODY.y0) / PARA_P)); };
  var slopeAt = function(y) { return Math.atan2(rAt(y - 0.01) - rAt(y + 0.01), 0.02); };
  var domeY = function(x, z) { return BODY.y1 + 0.12 * Math.sqrt(Math.max(0, 1 - (x * x + z * z) / (BODY.rTop * BODY.rTop))); };

  function onBody(p, phi, y, lift) {
    var g = group(p);
    var r = rAt(y) + (lift || 0);
    g.position = [r * Math.sin(phi), y, r * Math.cos(phi)];
    g.order = 'YXZ';
    g.rotation = [-slopeAt(y), phi, 0];
    return g;
  }

  function bodyShell(p) {
    var c = -PARA_P / (BODY.rBot * BODY.rBot);
    part(p, E.buffers(QUADRIC.surface(function(u, v) {
      return [v * Math.cos(u), v * Math.sin(u), BODY.y0 + PARA_P + c * v * v];
    }, -Math.PI, Math.PI, BODY.rTop, BODY.rBot, 64, 24)), M.shell, [0, 0, 0]);
    sphere(p, M.shell, [0, BODY.y1, 0], [BODY.rTop, 0.12, BODY.rTop]);
  }

  function archPoints(x, yFront, zf, zb, yTop, rb, n) {
    return CURVE.path([
      CURVE.line(V(x, yFront, zf), V(x, yTop - rb, zf)),
      CURVE.quad(V(x, yTop - rb, zf), V(x, yTop, zf), V(x, yTop, zf - rb)),
      CURVE.line(V(x, yTop, zf - rb), V(x, yTop, zb + rb)),
      CURVE.quad(V(x, yTop, zb + rb), V(x, yTop, zb), V(x, yTop - rb, zb)),
      CURVE.line(V(x, yTop - rb, zb), V(x, 2.25, zb)),
      CURVE.quad(V(x, 2.25, zb), V(x, 2.18, zb), V(x, 2.18, zb + 0.12))
    ]).getPoints(n || 8);
  }

  function wallStripe(p, color, path, n, w) {
    n = n || 28; w = w || 0.05;
    var pts = path.getSpacedPoints(n);
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[i + 1];
      var y = (a[1] + b[1]) / 2;
      var dt = rAt(y) * (b[0] - a[0]);
      var dw = (b[1] - a[1]) / Math.cos(slopeAt(y));
      var seg = cylinder(onBody(p, (a[0] + b[0]) / 2, y, 0.004), color, [0, 0, 0], 'y', [w, 0.008], Math.hypot(dt, dw) * 1.15);
      seg.rotation[2] = -Math.atan2(dt, dw);
    }
  }

  function wallLine(p, color, xOff, y0, y1, w, t, lift, n) {
    n = n || 14;
    for (var i = 0; i < n; i++) {
      var ya = y0 + (y1 - y0) * i / n, yb = y0 + (y1 - y0) * (i + 1) / n, y = (ya + yb) / 2;
      var len = (yb - ya) / Math.cos(slopeAt(y)) * 1.04;
      cylinder(onBody(p, Math.asin(xOff / rAt(y)), y, lift + t / 2), color, [0, 0, 0], 'y', [w, t], len);
    }
  }

  function tiltGroup(p, pos, rx) {
    var g = group(p);
    g.position = pos;
    g.rotation[0] = rx;
    return g;
  }

  var robot = new E.Obj();

  // Part: Alas tapak rantai + roda
  function partAlas() {
    qBox(robot, M.base, [0, 0.27, -0.05], 2.0, 0.54, 2.2, 0.25);
    [-1, 1].forEach(function(s) {
      [-0.65, -0.05, 0.55].forEach(function(z) {
        cylinder(robot, M.wheel, [s * 1.0, 0.27, z], 'x', 0.19, 0.04);
        cylinder(robot, M.metal, [s * 1.02, 0.27, z], 'x', 0.06, 0.04);
      });
    });
  }

  // Part: Badan (paraboloid terbalik + tutup atas)
  function partBadan() {
    bodyShell(robot);
  }

  // Part: Rel lubang hitam di depan
  var SLOT = { y0: 0.66, y1: 2.42, half: 0.15 };
  function partRel() {
    wallLine(robot, M.slot, 0, SLOT.y0, SLOT.y1, SLOT.half, 0.012, 0);
    [-1, 1].forEach(function(s) {
      wallLine(robot, M.shell, s * (SLOT.half + 0.05), SLOT.y0, SLOT.y1, 0.05, 0.05, 0);
      [SLOT.y0, SLOT.y1].forEach(function(y) {
        sphere(onBody(robot, Math.asin(s * (SLOT.half + 0.05) / rAt(y)), y), M.shell, [0, 0, 0], 0.05);
      });
    });
    [SLOT.y0, SLOT.y1].forEach(function(y) {
      sphere(onBody(robot, 0, y), M.slot, [0, 0, 0], [SLOT.half, 0.05, 0.012]);
    });
  }

  // Part: Pegangan atas
  function partPegangan() {
    [-0.33, 0.33].forEach(function(x) {
      tube(robot, M.grey, archPoints(x, BODY.y1, 0.3, -0.62, 3.2, 0.22), 0.045);
      cylinder(robot, M.grey, [x, domeY(x, 0.3), 0.3], 'y', 0.08, 0.06);
    });
  }

  // Part: Lencana merah (sisi kanan)
  function partLencana() {
    var badge = onBody(robot, Math.PI / 2, 1.5, -0.05);
    cylinder(badge, M.redDk,  [0, 0, 0],    'z', 0.36, 0.14);
    cylinder(badge, M.red,    [0, 0, 0.06], 'z', 0.33, 0.08);
    cylinder(badge, M.orange, [0, 0, 0.11], 'z', 0.14, 0.03);
    cylinder(badge, M.white,  [0, 0, 0.13], 'z', 0.06, 0.02);
    for (var k = 0; k < 6; k++) {
      var a = k * Math.PI / 3;
      sphere(badge, M.metal, [0.26 * Math.cos(a), 0.26 * Math.sin(a), 0.1], 0.03);
    }
  }

  // Part: Panel punggung + 3 kaleng cat C/M/Y
  function partKalengCat() {
    var panel = onBody(robot, Math.PI, 1.97, -0.02);
    qBox(panel, M.shell, [0, 0, 0], 1.0, 0.86, 0.45, 0.06);
    qBox(panel, M.shell, [0, -0.47, 0.05], 1.06, 0.08, 0.55, 0.03);
    var CAN_Z = 0.225 + 0.15;
    [[-0.32, M.yellow], [0, M.cyan], [0.32, M.magenta]].forEach(function(c) {
      var g = group(panel);
      g.position = [c[0], 0.1, CAN_Z];
      var col = c[1];
      cylinder(g, M.can, [0, 0, 0], 'y', 0.13, 0.42, { open: true });
      cylinder(g, col, [0, -0.08, 0], 'y', 0.134, 0.16, { open: true });
      [[-0.05, 0.04, 0.035, 0.07], [0.03, 0.06, 0.025, 0.1], [0.07, 0.01, 0.03, 0.05]].forEach(function(d) {
        sphere(g, col, [d[0], d[1], 0.128], [d[2], d[3], 0.012]);
      });
      cylinder(g, M.grey, [0, 0.24, 0], 'y', 0.132, 0.07);
      sphere(g, M.grey, [0, 0.275, 0], [0.13, 0.07, 0.13]);
      cylinder(g, M.metal, [0, 0.12, 0], 'y', 0.138, 0.03);
      cylinder(g, M.metal, [0, 0.12, -0.14], 'z', 0.04, 0.12);
      cylinder(g, M.can, [0, -0.27, 0], 'y', 1, 0.12, { rTop: 0.13, rBot: 0.05 });
      var hook = CURVE.path([CURVE.cubic(V(0, -0.33, 0), V(0, -0.52, 0.02), V(0, -0.56, -0.16), V(0, -0.42, -0.2))]);
      tube(g, M.base, hook.getPoints(10), 0.035);
    });
  }

  // Part: Kompartemen bawah punggung + roller dengan 2 lengan
  var ROLL = { a1: [2.8, 1.45], a2: [0.1, 0.15], L1: 0.55, L2: 0.6, x: 0.6 };
  var rollerRig;
  function partKompartemenRoller() {
    var bay = onBody(robot, Math.PI, 1.03, -0.02);
    qBox(bay, M.shell, [0, 0.08, -0.02], 1.0, 0.5, 0.42, 0.05);
    qBox(bay, M.shell, [0, 0.36, 0.08], 1.06, 0.07, 0.6, 0.03);
    [-1, 1].forEach(function(s) { qBox(bay, M.shell, [s * 0.5, -0.05, 0.2], 0.1, 0.72, 0.62, 0.04); });
    qBox(bay, M.redDk, [0, 0.1, 0.25], 0.42, 0.42, 0.18, 0.04);
    var scraper = tiltGroup(bay, [0, -0.1, 0.43], -0.55);
    qBox(scraper, M.shell, [0, 0, 0], 1.0, 0.05, 0.3, 0.02);

    var RY = -0.32, RZ = 0.36;
    var stowed = bay.toAncestor(V(0, RY, RZ), robot);
    rollerRig = { S: add(stowed, V(0, 0.08, 0.24)), sides: [] };
    var roller = rollerRig.roller = group(robot);
    cylinder(roller, M.cream, [0, 0, 0], 'x', 0.17, 0.9, { open: true });
    [-1, 1].forEach(function(s) {
      cylinder(roller, M.grey,  [s * 0.46, 0, 0], 'x', 0.17, 0.03);
      cylinder(roller, M.metal, [s * 0.48, 0, 0], 'x', 0.09, 0.02);
    });
    cylinder(roller, M.metal, [0, 0, 0], 'x', 0.04, 1.25);
    sphere(roller, M.redDk, [0.15, 0, 0.168], [0.12, 0.05, 0.01]);

    [-1, 1].forEach(function(s) {
      var shoulder = group(robot);
      shoulder.position = [s * ROLL.x, rollerRig.S[1], rollerRig.S[2]];
      cylinder(shoulder, M.grey,  [0, 0, 0], 'x', 0.12, 0.1);
      cylinder(shoulder, M.shell, [s * 0.06, 0, 0], 'x', 0.09, 0.03);
      for (var k = 0; k < 6; k++) {
        var a = k * Math.PI / 3;
        sphere(shoulder, M.metal, [s * 0.055, 0.1 * Math.sin(a), 0.1 * Math.cos(a)], 0.015);
      }
      var upper = group(shoulder);
      cylinder(upper, M.shell, [0, 0, ROLL.L1 / 2], 'z', 1, ROLL.L1, { rBot: 0.08, rTop: 0.065 });
      cylinder(upper, M.grey,  [0, 0, ROLL.L1], 'x', 0.09, 0.1);
      cylinder(upper, M.shell, [s * 0.055, 0, ROLL.L1], 'x', 0.065, 0.03);
      var fore = group(upper);
      fore.position = [0, 0, ROLL.L1];
      cylinder(fore, M.shell, [0, 0, ROLL.L2 / 2], 'z', 1, ROLL.L2, { rBot: 0.065, rTop: 0.055 });
      cylinder(fore, M.grey,  [0, 0, ROLL.L2], 'x', 0.075, 0.08);
      rollerRig.sides.push({ upper: upper, fore: fore });
    });
    setRoller(0);
  }
  function setRoller(level) {
    var lerp = function(r) { return r[0] + (r[1] - r[0]) * level; };
    var a1 = lerp(ROLL.a1), a2 = lerp(ROLL.a2);
    var dir = function(a) { return [0, -Math.cos(a), -Math.sin(a)]; };
    rollerRig.sides.forEach(function(sd) {
      sd.upper.rotation[0] = a1 + Math.PI / 2;
      sd.fore.rotation[0] = a2 - a1;
    });
    var d1 = dir(a1), d2 = dir(a2), S = rollerRig.S;
    var pos = [S[0] + d1[0] * ROLL.L1 + d2[0] * ROLL.L2,
               S[1] + d1[1] * ROLL.L1 + d2[1] * ROLL.L2,
               S[2] + d1[2] * ROLL.L1 + d2[2] * ROLL.L2];
    rollerRig.roller.position = pos;
    rollerRig.roller.rotation[0] = (S[2] - pos[2]) / 0.17;
  }

  // Part: Garis oranye (sisi kiri)
  function partGarisOranye() {
    [0, 1].forEach(function(k) {
      var pv = -2.05 + k * 0.2, yh = 1.95 - k * 0.15;
      wallStripe(robot, M.stripe, CURVE.path([
        CURVE.line([pv, 0.7], [pv, yh - 0.35]),
        CURVE.quad([pv, yh - 0.35], [pv, yh], [pv + 0.45, yh]),
        CURVE.line([pv + 0.45, yh], [-0.95, yh])
      ]));
    });
  }

  // Part: Tabung gas
  function partTabungGas() {
    var tank = onBody(robot, 2.0, 0.75, 0.2);
    tank.rotation[0] = 0;
    cylinder(tank, M.tank, [0, 0, 0], 'x', 0.22, 0.7, { open: true });
    [-0.35, 0.35].forEach(function(x) { sphere(tank, M.tank, [x, 0, 0], [0.12, 0.22, 0.22]); });
    [-0.2, 0.2].forEach(function(x) { cylinder(tank, M.base, [x, 0, 0], 'x', 0.235, 0.05); });
  }

  // Part: Lengan kuas (lengan bawah di rel, lengan atas, pergelangan, kepala kuas)
  var ARM_Y = { min: 0.95, max: 1.8 };
  var BEND = { min: -1.25, max: -0.2 };
  var ELBOW_Z = 0.62, WRIST_Z = 1.05;
  var slider, carriage, elbow, arm;
  function partLenganKuas() {
    slider = group(robot);
    carriage = group(slider);
    cylinder(carriage, M.metal, [0, 0, 0.01], 'y', [SLOT.half - 0.02, 0.03], 0.55);
    [-0.25, 0.25].forEach(function(y) {
      cylinder(carriage, M.wheel, [0, y, 0.0], 'x', 0.06, 0.26);
      sphere(carriage, M.metal, [0, y, 0.02], [SLOT.half - 0.02, 0.05, 0.03]);
    });
    cylinder(slider, M.metal, [0, 0, 0.06], 'x', 0.12, 0.42);
    qBox(slider, M.shell, [0, 0, 0.32], 0.46, 0.36, 0.56, 0.1);
    cylinder(slider, M.grey, [0, 0, ELBOW_Z], 'x', 0.27, 0.5);
    [-1, 1].forEach(function(s) {
      cylinder(slider, M.shell, [s * 0.27, 0, ELBOW_Z], 'x', 0.21, 0.06);
      cylinder(slider, M.metal, [s * 0.31, 0, ELBOW_Z], 'x', 0.08, 0.04);
      for (var k = 0; k < 8; k++) {
        var a = k * Math.PI / 4;
        sphere(slider, M.metal, [s * 0.255, 0.235 * Math.sin(a), ELBOW_Z + 0.235 * Math.cos(a)], 0.022);
      }
    });

    elbow = group(slider);
    elbow.position = [0, 0, ELBOW_Z];
    cylinder(elbow, M.shell, [0, 0, 0.55], 'z', 1, 0.9, { rBot: 0.2, rTop: 0.14 });
    sphere(elbow, M.shell, [0, 0, 0.1], [0.2, 0.2, 0.12]);
    cylinder(elbow, M.base, [0.17, 0, 0.55], 'z', 0.02, 0.7);
    cylinder(elbow, M.grey, [0, 0, WRIST_Z], 'x', 0.16, 0.36);
    [-1, 1].forEach(function(s) { cylinder(elbow, M.shell, [s * 0.19, 0, WRIST_Z], 'x', 0.12, 0.04); });

    arm = group(elbow);
    arm.position = [0, 0, WRIST_Z];
    cylinder(arm, M.metal, [0, 0, 0.12], 'z', 0.09, 0.16);
    qBox(arm, M.shell, [0, 0, 0.3], 1.0, 0.42, 0.36, 0.08);
    var brush = group(arm);
    brush.position = [0, -0.03, 0.48];
    brush.rotation[0] = 0.3;
    for (var i = 0; i < 9; i++) {
      [-0.1, 0, 0.1].forEach(function(y) {
        var x = -0.42 + i * 0.105;
        cylinder(brush, M.bristle, [x, y, 0.13], 'z', 0.048, 0.26);
        cylinder(brush, M.tip,     [x, y, 0.32], 'z', 0.048, 0.12);
      });
    }
  }
  function setElbow(level) {
    var a = BEND.min + (BEND.max - BEND.min) * level;
    elbow.rotation[0] = a;
    arm.rotation[0] = -a * 0.95;
    updateHose();
  }
  function setArmHeight(level) {
    var y = ARM_Y.min + (ARM_Y.max - ARM_Y.min) * level;
    slider.position = [0, y, rAt(y)];
    carriage.rotation[0] = -slopeAt(y);
    updateHose();
  }

  // Part: Cipratan cat
  function partCipratanCat() {
    var splat = function(phi, y) {
      sphere(onBody(robot, phi, y, 0.002), paint(), [0, 0, 0], [0.03 + rand() * 0.09, 0.02 + rand() * 0.07, 0.006]);
    };
    for (var i = 0; i < 18; i++) {
      var phi = -0.9 + rand() * 1.8, y = 0.6 + rand() * 1.75;
      if (Math.abs(phi) < 0.45) continue;
      splat(phi, y);
    }
    for (var i = 0; i < 16; i++) {
      var phi = 1.0 + rand() * 1.6, y = 0.6 + rand() * 1.7;
      if (Math.abs(phi - Math.PI / 2) < 0.5 && Math.abs(y - 1.5) < 0.45) continue;
      splat(phi, y);
    }
    for (var i = 0; i < 8; i++) splat(-1.0 - rand() * 1.4, 0.6 + rand() * 1.7);
    for (var i = 0; i < 8; i++) boxSplat(arm, [0.503, -0.12 + rand() * 0.25, 0.18 + rand() * 0.24], 'x');
    for (var i = 0; i < 6; i++) boxSplat(arm, [-0.4 + rand() * 0.8, 0.213, 0.16 + rand() * 0.28], 'y');
  }

  // Part: Selang merah (kepala kuas -> lencana)
  var HOSE_N = 34;
  var HOSE_MID = V(0.85, 0.95, 0.95);
  var HOSE_C2 = V(0.74, 1.35, 1.5);
  var HOSE_C3 = [2 * HOSE_MID[0] - HOSE_C2[0], 2 * HOSE_MID[1] - HOSE_C2[1], 2 * HOSE_MID[2] - HOSE_C2[2]];
  var HOSE_C4 = V(1.15, 0.98, 0.38);
  var hoseStartLocal = V(0.48, 0, 0.3);
  var hoseSegs, hoseRings, hoseEnd;
  function partSelang() {
    hoseEnd = V(rAt(1.15) + 0.05, 1.15, 0.05);
    hoseSegs = [];
    hoseRings = [];
    for (var i = 0; i < HOSE_N; i++) hoseSegs.push(part(robot, E.geo.cyl('y', true), M.red, [0, 0, 0]));
    for (var i = 0; i < HOSE_N - 1; i++) hoseRings.push(part(robot, E.geo.cyl('y'), M.ring, [0, 0, 0]));
  }
  function updateHose() {
    if (!hoseSegs) return;
    var start = arm.toAncestor(hoseStartLocal, robot);
    var c1 = add(start, V(0.12, -0.05, 0.12));
    var pts = CURVE.path([
      CURVE.cubic(start, c1, HOSE_C2, HOSE_MID),
      CURVE.cubic(HOSE_MID, HOSE_C3, HOSE_C4, hoseEnd)
    ]).getSpacedPoints(HOSE_N);
    hoseSegs.forEach(function(m, i) { placeBetween(m, pts[i], pts[i + 1], 0.05); });
    hoseRings.forEach(function(m, i) {
      var a = pts[i], b = pts[i + 2], c = pts[i + 1];
      var d = LIBS.normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), h = 0.0175;
      placeBetween(m, [c[0] - d[0] * h, c[1] - d[1] * h, c[2] - d[2] * h], [c[0] + d[0] * h, c[1] + d[1] * h, c[2] + d[2] * h], 0.06);
    });
  }

  partAlas();
  partBadan();
  partRel();
  partPegangan();
  partLencana();
  partKalengCat();
  partKompartemenRoller();
  partGarisOranye();
  partTabungGas();
  partLenganKuas();
  partCipratanCat();
  partSelang();
  setElbow(0.5);
  setArmHeight(0.5);

  return {
    root: robot,
    update: function(t) {
      setElbow(0.5 + 0.5 * Math.sin(t * 1.3));
      setArmHeight(0.5 + 0.5 * Math.sin(t * 0.8));
      setRoller(0.5 - 0.5 * Math.cos(t * 0.5));
    }
  };
};
