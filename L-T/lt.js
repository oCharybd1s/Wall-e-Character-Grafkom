CHARACTERS.LT = function(E) {

  var node = function(parent, geo, color, local) {
    var o = new E.Obj(geo, color);
    if (local) o.matrix = local;
    if (parent) parent.add(o);
    return o;
  };
  var lerp = function(p, q, f) {
    return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f];
  };

  var YEL     = [0.97, 0.83, 0.13];
  var YEL_D   = [0.82, 0.64, 0.06];
  var YEL_L   = [1.00, 0.91, 0.35];
  var ORANGE  = [0.92, 0.30, 0.08];
  var RED     = [0.78, 0.10, 0.12];
  var DARKRED = [0.50, 0.06, 0.08];
  var DARK    = [0.07, 0.07, 0.09];
  var DARK2   = [0.17, 0.17, 0.20];
  var GREY    = [0.45, 0.45, 0.50];
  var RIBC    = [0.72, 0.72, 0.76];
  var SILVER  = [0.76, 0.76, 0.82];
  var SILV_L  = [0.92, 0.92, 0.96];
  var SILV_M  = [0.60, 0.60, 0.67];
  var BULB_C  = [1.00, 0.96, 0.80];
  var YELLOW  = [0.95, 0.88, 0.10];
  var CYAN    = [0.35, 0.85, 1.00];
  var CYAN_W  = [0.85, 0.98, 1.00];

  var CYLINDER = E.buffers(QUADRIC.cylinder(1, 1));
  var SPHERE = E.geo.sphere();
  var CIRCLE = E.buffers(QUADRIC.circle(1));

  var PI = Math.PI;
  var ROOT = node(null, null, null, LIBS.get_I4());

  // Depan karakter = +Z (arah lampu menghadap). Belakang = -Z.

  // ===== Part: Badan (ellipsoid) =====
  node(ROOT, E.buffers(QUADRIC.ellipsoid(1.1, 1.0, 0.25, -PI / 2, 0)), YEL_D, LIBS.translate(0, 0.25, 0));
  node(ROOT, E.buffers(QUADRIC.ellipsoid(1.1, 1.0, 0.55, 0, PI / 2)), YEL, LIBS.translate(0, 0.25, 0));
  node(ROOT, CYLINDER, DARK, LIBS.chain(LIBS.translate(0, 0.25, 0), LIBS.scale(1.105, 0.04, 1.005)));
  node(ROOT, SPHERE, DARK2, LIBS.chain(LIBS.translate(0, 0.04, 0), LIBS.scale(0.55, 0.06, 0.5)));

  // punggung (ridge) memanjang depan-belakang
  node(ROOT, SPHERE, YEL_L, LIBS.chain(LIBS.translate(0, 0.66, 0), LIBS.scale(0.22, 0.22, 0.8)));

  // garis sambungan panel pada kubah (segmen tipis mengikuti permukaan ellipsoid)
  var domePt = function(k, lat, ang) {
    return [1.1 * k * Math.cos(lat) * Math.sin(ang), 0.25 + 0.55 * k * Math.sin(lat), 1.0 * k * Math.cos(lat) * Math.cos(ang)];
  };
  var seams = [0.87, -0.87, 2.27, -2.27];
  for (var m = 0; m < seams.length; m++) {
    for (var j = 0; j < 4; j++) {
      var l0 = 0.95 - j * 0.2, l1 = l0 - 0.2;
      node(ROOT, CYLINDER, DARK2, LIBS.segment(domePt(1.004, l0, seams[m]), domePt(1.004, l1, seams[m]), 0.009));
    }
  }

  // ===== Part: Panel BELAKANG gelap berbingkai (potongan permukaan ellipsoid badan) =====
  var REAR = node(ROOT, null, null, LIBS.rotY(PI));
  var domePatch = function(k, uHalf, vc, vh) {
    return E.buffers(QUADRIC.surface(function(s, w) {
      var lat = vc + w * vh;
      var hu = uHalf * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(w), 3)), 1 / 3);
      var u = PI / 2 + s * hu;
      return [1.1 * k * Math.cos(lat) * Math.cos(u),
              1.0 * k * Math.cos(lat) * Math.sin(u),
              0.55 * k * Math.sin(lat)];
    }, -1, 1, -1, 1, 20, 10));
  };
  node(REAR, domePatch(1.008, 0.66, 0.30, 0.32), YEL_D, LIBS.translate(0, 0.25, 0));
  node(REAR, domePatch(1.016, 0.56, 0.30, 0.26), DARK, LIBS.translate(0, 0.25, 0));
  node(REAR, SPHERE, GREY, LIBS.chain(LIBS.translate(0, 0.36, 1.005), LIBS.scale(0.13, 0.07, 0.015)));
  node(REAR, SPHERE, DARK2, LIBS.chain(LIBS.translate(0, 0.36, 1.012), LIBS.scale(0.1, 0.045, 0.012)));
  for (var q = -1; q <= 1; q += 2) {
    node(REAR, SPHERE, CYAN, LIBS.chain(LIBS.translate(q * 0.3, 0.46, 0.96), LIBS.scale(0.03, 0.03, 0.015)));
  }

  // ===== Part: Sayap-pod kiri & kanan (mengarah ke belakang) dengan LED biru di ujung belakang =====
  var WINGS = [], LEDS = [];
  for (var s = -1; s <= 1; s += 2) {
    var w = node(ROOT, null, null, LIBS.get_I4());
    node(w, SPHERE, YEL, LIBS.chain(LIBS.translate(s * 0.2, 0, 0), LIBS.scale(0.34, 0.22, 0.3)));
    node(w, SPHERE, YEL_L, LIBS.chain(LIBS.translate(s * 0.4, 0.07, 0), LIBS.rotZ(s * 0.5), LIBS.scale(0.2, 0.13, 0.17)));
    node(w, SPHERE, DARK, LIBS.chain(LIBS.translate(s * 0.47, 0.1, -0.11), LIBS.scale(0.09, 0.1, 0.08)));
    LEDS.push(node(w, SPHERE, CYAN.slice(), LIBS.chain(LIBS.translate(s * 0.47, 0.1, -0.16), LIBS.scale(0.065, 0.08, 0.035))));
    LEDS.push(node(w, SPHERE, CYAN_W.slice(), LIBS.chain(LIBS.translate(s * 0.47, 0.1, -0.185), LIBS.scale(0.03, 0.045, 0.018))));
    WINGS.push({ node: w, s: s });
  }

  // ===== Part: Dudukan leher (2 truncated cone) =====
  node(ROOT, E.buffers(QUADRIC.truncatedCone(0.58, 0.24, 0.32)), YEL_D, LIBS.translate(0, 0.65, 0));
  node(ROOT, E.buffers(QUADRIC.truncatedCone(0.24, 0.14, 0.2)), DARK, LIBS.translate(0, 0.97, 0));

  // ===== Part: Leher fleksibel bergerigi (Bezier -> tube + cincin) =====
  var N0 = [0, 1.0, 0], N1 = [0, 1.8, -0.15], N2 = [0, 2.1, 0.2], N3 = [0, 2.45, 0.6];
  var neck = [];
  for (var i = 0; i <= 40; i++) neck.push(LIBS.bezier3(N0, N1, N2, N3, i / 40));
  node(ROOT, E.buffers(QUADRIC.tube(neck, 0.09, 12)), DARK);
  for (var i = 2; i < 39; i += 3) {
    node(ROOT, CYLINDER, DARK2, LIBS.segment(neck[i], lerp(neck[i], neck[i + 1], 0.55), 0.107));
  }

  // ===== Part: Kepala lampu =====
  var PIV = [0, 2.45, 0];
  var PIVOT = node(ROOT, null, null, LIBS.translate(PIV[0], PIV[1], PIV[2]));
  var LAMP_M = LIBS.chain(LIBS.translate(0, 0, 0.3), LIBS.rotX(0.12));
  var LAMP = node(PIVOT, null, null, LAMP_M);

  // cangkang (truncated cone) + atap runcing memanjang ke belakang (ellipsoid)
  node(LAMP, E.buffers(QUADRIC.truncatedCone(0.42, 0.62, 0.8)), YEL, LIBS.rotX(PI / 2));
  node(LAMP, SPHERE, YEL_L, LIBS.chain(LIBS.translate(0, 0.45, 0.28), LIBS.rotX(-0.08), LIBS.scale(0.3, 0.12, 0.75)));
  // tutup belakang kuning + panel gelap bundar
  node(LAMP, E.buffers(QUADRIC.ellipsoid(0.42, 0.42, 0.18, 0, PI / 2)), YEL, LIBS.rotX(-PI / 2));
  node(LAMP, E.buffers(QUADRIC.ellipsoid(0.3, 0.3, 0.25, 0, PI / 2)), DARK, LIBS.rotX(-PI / 2));
  // soket kabel di kanan-atas panel belakang
  var SOCK = [0.15, 0.15, -0.177];
  node(LAMP, CYLINDER, DARK2, LIBS.chain(LIBS.translate(SOCK[0], SOCK[1], SOCK[2] - 0.015), LIBS.rotX(PI / 2), LIBS.scale(0.08, 0.1, 0.08)));

  // bibir hitam tebal: cincin depan + rusuk-rusuk putih seperti ban
  node(LAMP, CYLINDER, DARK, LIBS.chain(LIBS.translate(0, 0, 0.8), LIBS.rotX(PI / 2), LIBS.scale(0.64, 0.16, 0.64)));
  node(LAMP, E.buffers(QUADRIC.truncatedCone(0.64, 0.58, 0.002)), DARK, LIBS.chain(LIBS.translate(0, 0, 0.88), LIBS.rotX(PI / 2)));
  for (var k = 0; k < 40; k++) {
    var a = k * 2 * PI / 40;
    var cx = 0.646 * Math.cos(a), cy = 0.646 * Math.sin(a);
    node(LAMP, CYLINDER, RIBC, LIBS.segment([cx, cy, 0.74], [cx, cy, 0.86], 0.011));
  }

  // reflektor berfaset: 3 pita paraboloid + jari-jari
  var DISH_C = 0.97, DISH_Z = 0.45;
  var dishM = LIBS.chain(LIBS.translate(0, 0, DISH_Z), LIBS.rotX(PI / 2));
  node(LAMP, E.buffers(QUADRIC.paraboloid(1, 1, DISH_C, 0.42, 0.33)), SILV_M, dishM);
  node(LAMP, E.buffers(QUADRIC.paraboloid(1, 1, DISH_C, 0.52, 0.42)), SILV_L, dishM);
  node(LAMP, E.buffers(QUADRIC.paraboloid(1, 1, DISH_C, 0.6, 0.52)), SILVER, dishM);
  var dishPt = function(r, a) {
    return [r * Math.cos(a), r * Math.sin(a), DISH_Z + DISH_C * r * r + 0.004];
  };
  for (var k = 0; k < 12; k++) {
    var ang = 0.15 + k * 2 * PI / 12;
    for (var j = 0; j < 3; j++) {
      var r0 = 0.33 + j * 0.09;
      node(LAMP, CYLINDER, GREY, LIBS.segment(dishPt(r0, ang), dishPt(r0 + 0.09, ang), 0.006));
    }
  }
  // cincin abu + piringan bohlam putih besar (berdenyut) + bohlam
  node(LAMP, CIRCLE, SILV_M, LIBS.chain(LIBS.translate(0, 0, 0.56), LIBS.rotX(PI / 2), LIBS.scale(0.33, 1, 0.33)));
  var BULBS = [];
  BULBS.push(node(LAMP, CIRCLE, BULB_C.slice(), LIBS.chain(LIBS.translate(0, 0, 0.565), LIBS.rotX(PI / 2), LIBS.scale(0.27, 1, 0.27))));
  BULBS.push(node(LAMP, SPHERE, BULB_C.slice(), LIBS.chain(LIBS.translate(0, 0, 0.58), LIBS.scale(0.13, 0.13, 0.06))));

  // ===== Part: Perangkat merah di sisi belakang-kanan badan =====
  var DEVM = LIBS.chain(LIBS.translate(0.88, 0.2, -0.56), LIBS.rotY(2.23), LIBS.scale(0.8, 0.8, 0.8));
  var DEVICE = node(ROOT, null, null, DEVM);
  node(DEVICE, CYLINDER, DARKRED, LIBS.chain(LIBS.translate(0, 0, 0.03), LIBS.rotX(PI / 2), LIBS.scale(0.3, 0.12, 0.3)));
  node(DEVICE, CYLINDER, RED, LIBS.chain(LIBS.translate(0, 0, 0.08), LIBS.rotX(PI / 2), LIBS.scale(0.25, 0.08, 0.25)));
  node(DEVICE, CIRCLE, DARK, LIBS.chain(LIBS.translate(0, 0, 0.122), LIBS.rotX(PI / 2), LIBS.scale(0.15, 1, 0.15)));
  var DLIGHT = node(DEVICE, CIRCLE, YELLOW.slice(), LIBS.chain(LIBS.translate(0, 0, 0.128), LIBS.rotX(PI / 2), LIBS.scale(0.11, 1, 0.11)));
  node(DEVICE, CIRCLE, BULB_C, LIBS.chain(LIBS.translate(-0.03, 0.03, 0.134), LIBS.rotX(PI / 2), LIBS.scale(0.035, 1, 0.035)));
  for (var d = -1; d <= 1; d += 2) {
    node(DEVICE, SPHERE, DARK, LIBS.chain(LIBS.translate(d * 0.3, 0.1, 0.03), LIBS.rotZ(d * 0.6), LIBS.scale(0.13, 0.05, 0.05)));
    node(DEVICE, SPHERE, GREY, LIBS.chain(LIBS.translate(d * 0.17, -0.17, 0.13), LIBS.scale(0.025, 0.025, 0.02)));
  }

  // ===== Part: Kabel oranye bersegmen (2 Bezier kubik; ruas oranye + inti gelap) =====
  var tip = LIBS.apply(LAMP_M, SOCK);
  var C0 = [PIV[0] + tip[0], PIV[1] + tip[1], PIV[2] + tip[2]];
  var C1 = [0.35, C0[1] + 0.45, -0.8], C2 = [1.1, 3.6, -1.5], C3 = [1.2, 2.3, -1.6];
  var C4 = [2 * C3[0] - C2[0], 2 * C3[1] - C2[1], 2 * C3[2] - C2[2]];
  var C5 = [1.1, 0.75, -1.3];
  var C6 = LIBS.apply(DEVM, [0, 0.22, 0.06]);
  var cable = [];
  for (var i = 0; i <= 30; i++) cable.push(LIBS.bezier3(C0, C1, C2, C3, i / 30));
  for (var i = 1; i <= 30; i++) cable.push(LIBS.bezier3(C3, C4, C5, C6, i / 30));
  node(ROOT, E.buffers(QUADRIC.tube(cable, 0.04, 10)), DARK);
  for (var i = 0; i + 2 < cable.length; i += 2) {
    node(ROOT, CYLINDER, ORANGE, LIBS.segment(cable[i], lerp(cable[i], cable[i + 2], 0.85), 0.07));
  }

  return {
    root: ROOT,
    update: function(t) {
      ROOT.matrix = LIBS.translate(0, 0.03 * (1 + Math.sin(t * 1.5)), 0);
      PIVOT.matrix = LIBS.chain(LIBS.translate(PIV[0], PIV[1], PIV[2]), LIBS.rotY(0.2 * Math.sin(t * 0.8)));
      for (var i = 0; i < WINGS.length; i++) {
        var W = WINGS[i];
        W.node.matrix = LIBS.chain(LIBS.translate(W.s * 0.78, 0.5, -0.1), LIBS.rotY(W.s * 0.5),
                                   LIBS.rotZ(W.s * (0.25 + 0.06 * Math.sin(t * 2.5))));
      }
      var g = Math.sin(t * 3);
      var pulse = [1.0, 0.96, 0.7 + 0.25 * g];
      for (var i = 0; i < BULBS.length; i++) BULBS[i].color = pulse;
      var b = 0.5 + 0.5 * Math.sin(t * 2);
      var led = [0.25 + 0.15 * b, 0.7 + 0.2 * b, 1.0];
      LEDS[0].color = led; LEDS[2].color = led;
      DLIGHT.color = Math.sin(t * 4) > 0 ? YELLOW : DARKRED;
    }
  };
};