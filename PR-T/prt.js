
CHARACTERS.PRT = function(E) {

  var node = function(parent, geo, color, local) {
    var o = new E.Obj(geo, color);
    if (local) o.matrix = local;
    if (parent) parent.add(o);
    return o;
  };

  var PINK   = [0.88, 0.56, 0.88];
  var WHITE  = [0.94, 0.94, 0.96];
  var SILVER = [0.78, 0.78, 0.82];
  var DARK   = [0.10, 0.10, 0.12];
  var GREY   = [0.32, 0.32, 0.36];
  var BLUE   = [0.47, 0.62, 1.00];
  var RED    = [0.78, 0.10, 0.12];
  var DARKRED = [0.50, 0.06, 0.08];
  var YELLOW = [0.95, 0.88, 0.10];

  var CYLINDER = E.geo.cyl('y');
  var SPHERE = E.geo.sphere();
  var CIRCLE = E.buffers(QUADRIC.circle(1));
  var CONE = E.buffers(QUADRIC.truncatedCone(1, 0.001, 1));

  var ROOT = node(null);
  var HOVER = node(ROOT, null, null, LIBS.get_I4());

  var BODY_BOT = -0.7, BODY_TOP = 0.55, BODY_RB = 1.0, BODY_RT = 0.92;
  var bodyR = function(y) { return BODY_RB + (BODY_RT - BODY_RB) * (y - BODY_BOT) / (BODY_TOP - BODY_BOT); };

  // Part: Badan bawah (paraboloid)
  var PARA_H = 0.6;
  node(HOVER, E.buffers(QUADRIC.paraboloid(1, 1, PARA_H / (BODY_RB * BODY_RB), BODY_RB)), WHITE,
       LIBS.translate(0, BODY_BOT - PARA_H, 0));
  node(HOVER, CYLINDER, SILVER, LIBS.chain(LIBS.translate(0, BODY_BOT, 0), LIBS.scale(1.015, 0.05, 1.015)));

  // Part: Badan atas (truncated cone) + jendela + strip putih
  node(HOVER, E.buffers(QUADRIC.truncatedCone(BODY_RB, BODY_RT, BODY_TOP - BODY_BOT)), PINK,
       LIBS.translate(0, BODY_BOT, 0));
  var N_WIN = 12, STEP = 2 * Math.PI / N_WIN;
  for (var k = 0; k < N_WIN; k++) {
    var uc = Math.PI / 2 + (k + 0.5) * STEP;
    node(HOVER, E.buffers(QUADRIC.truncatedCone(BODY_RB, BODY_RT, BODY_TOP - BODY_BOT,
         uc - 0.17, uc + 0.17, 0.12, 0.88)), DARK,
         LIBS.chain(LIBS.translate(0, BODY_BOT, 0), LIBS.scale(1.01, 1, 1.01)));
    if (k % 3 === 2) {
      var us = uc + STEP / 2;
      node(HOVER, E.buffers(QUADRIC.truncatedCone(BODY_RB, BODY_RT, BODY_TOP - BODY_BOT,
           us - 0.05, us + 0.05, 0.1, 0.9)), WHITE,
           LIBS.chain(LIBS.translate(0, BODY_BOT, 0), LIBS.scale(1.015, 1, 1.015)));
    }
  }

  // Part: Kepala (sphere dipotong bagian bawah -> kubah)
  var HEAD_Y = 0.9, HEAD_R = 0.95;
  var HEAD = node(HOVER, null, null, LIBS.translate(0, HEAD_Y, 0));
  node(HEAD, E.buffers(QUADRIC.ellipsoid(HEAD_R, HEAD_R, HEAD_R, 0, Math.PI / 2)), PINK);

  // Part: Detail putih dekat kepala (cylinder)
  node(HEAD, CYLINDER, WHITE, LIBS.chain(LIBS.translate(0, -0.17, 0), LIBS.scale(0.97, 0.36, 0.97)));

  // Part: Wajah (circle)
  var FACE = node(HEAD, null, null, LIBS.translate(0, -0.12, 0.975));
  node(FACE, CIRCLE, SILVER, LIBS.chain(LIBS.rotX(Math.PI / 2), LIBS.scale(0.42, 1, 0.42)));
  node(FACE, CIRCLE, WHITE, LIBS.chain(LIBS.translate(0, 0, 0.01), LIBS.rotX(Math.PI / 2), LIBS.scale(0.37, 1, 0.37)));
  node(FACE, CIRCLE, BLUE, LIBS.chain(LIBS.translate(0, 0, 0.02), LIBS.rotX(Math.PI / 2), LIBS.scale(0.3, 1, 0.3)));

  // Part: Colokan atas (kiri atas kepala) + perangkat merah (belakang kiri)
  var PLUG_N = LIBS.normalize([0.42, 0.88, -0.2]);
  var plugAt = function(d) { return [PLUG_N[0] * d, PLUG_N[1] * d, PLUG_N[2] * d]; };
  var cone_between = function(p, q, r) {
    var h = [(q[0] - p[0]) / 2, (q[1] - p[1]) / 2, (q[2] - p[2]) / 2];
    return LIBS.segment([p[0] - h[0], p[1] - h[1], p[2] - h[2]], [q[0] - h[0], q[1] - h[1], q[2] - h[2]], r);
  };
  node(HEAD, CYLINDER, DARKRED, LIBS.segment(plugAt(0.9), plugAt(1.0), 0.14));
  node(HEAD, CONE, RED, cone_between(plugAt(0.95), plugAt(1.3), 0.12));
  node(HEAD, SPHERE, YELLOW, LIBS.chain(LIBS.translate(0.42 * 1.12 + 0.02, 0.88 * 1.12, -0.2 * 1.12 + 0.1),
       LIBS.scale(0.03, 0.03, 0.03)));

  var DEV_A = -0.55;
  var DEVM = LIBS.chain(LIBS.translate(-0.99 * Math.sin(DEV_A), -0.12, -0.99 * Math.cos(DEV_A)), LIBS.rotY(DEV_A));
  var DEVICE = node(HEAD, null, null, DEVM);
  // pelat segilima bersudut bulat: cakram tengah + silinder rebah di tiap sisi + bola pipih di tiap sudut
  var pentagon = function(color, R, rc, z, depth) {
    var c = [];
    for (var k = 0; k < 5; k++) {
      var a = -Math.PI / 2 + k * 2 * Math.PI / 5;
      c.push([R * Math.cos(a), R * Math.sin(a), 0]);
    }
    var flat = LIBS.chain(LIBS.translate(0, 0, z), LIBS.scale(1, 1, depth));
    node(DEVICE, CYLINDER, color, LIBS.chain(flat, LIBS.rotX(Math.PI / 2),
         LIBS.scale(R * Math.cos(Math.PI / 5), 2 * rc, R * Math.cos(Math.PI / 5))));
    for (var k = 0; k < 5; k++) {
      node(DEVICE, CYLINDER, color, LIBS.chain(flat, LIBS.segment(c[k], c[(k + 1) % 5], rc)));
      node(DEVICE, SPHERE, color, LIBS.chain(flat, LIBS.translate(c[k][0], c[k][1], 0), LIBS.scale(rc, rc, rc)));
    }
  };
  pentagon(DARKRED, 0.27, 0.06, -0.06, 1);
  pentagon(RED, 0.255, 0.055, -0.085, 0.75);
  for (var s = -1; s <= 1; s += 2) {
    node(DEVICE, CYLINDER, DARK, LIBS.chain(LIBS.translate(s * 0.31, 0.12, 0), LIBS.rotZ(-s * 0.35), LIBS.scale(0.05, 0.3, 0.03)));
  }
  node(DEVICE, CYLINDER, DARK, LIBS.chain(LIBS.translate(0.04, -0.3, -0.02), LIBS.rotZ(Math.PI / 2 + 0.15), LIBS.scale(0.04, 0.3, 0.03)));
  node(DEVICE, CYLINDER, DARK, LIBS.chain(LIBS.translate(0, 0.17, -0.13), LIBS.scale(0.075, 0.24, 0.035)));
  node(DEVICE, SPHERE, DARK, LIBS.chain(LIBS.translate(0, 0.29, -0.13), LIBS.scale(0.075, 0.03, 0.035)));
  node(DEVICE, CYLINDER, DARK, LIBS.chain(LIBS.translate(0, 0.02, -0.135), LIBS.rotX(Math.PI / 2), LIBS.scale(0.1, 0.05, 0.1)));
  node(DEVICE, CIRCLE, YELLOW, LIBS.chain(LIBS.translate(0, 0.02, -0.162), LIBS.rotX(-Math.PI / 2), LIBS.scale(0.065, 1, 0.065)));

  // Part: Kabel (kurva Bezier)
  var P0 = plugAt(1.28), P1 = [0.75, 2.3, -0.3], P2 = [1.55, 2.0, -0.8], P3 = [1.2, 1.25, -1.0];
  var P4 = [2 * P3[0] - P2[0], 2 * P3[1] - P2[1], 2 * P3[2] - P2[2]], P5 = [0.75, 0.45, -1.25];
  var P6 = LIBS.apply(DEVM, [0, 0.3, -0.13]);
  var cable = [];
  for (var i = 0; i <= 30; i++) cable.push(LIBS.bezier3(P0, P1, P2, P3, i / 30));
  for (var i = 1; i <= 30; i++) cable.push(LIBS.bezier3(P3, P4, P5, P6, i / 30));
  node(HEAD, E.buffers(QUADRIC.tube(cable, 0.035, 12)), RED);

  // Part: Lengan (cylinder) - satu lengan untuk setiap jendela badan, ujungnya capit atas-bawah
  var LEG_L = [0.55, 0.95, 0.6];
  var LEG_A = [-1.0, 1.95, -1.5];
  var LEGS = [];
  var bar = function(parent, len) {
    node(parent, CYLINDER, PINK, LIBS.chain(
      LIBS.translate(len / 2, 0, 0), LIBS.rotZ(-Math.PI / 2), LIBS.scale(0.08, len, 0.035)));
    node(parent, CYLINDER, WHITE, LIBS.chain(
      LIBS.translate(len / 2, 0.035, 0), LIBS.rotZ(-Math.PI / 2), LIBS.scale(0.025, len * 0.8, 0.045)));
  };
  var joint = function(parent) {
    node(parent, CYLINDER, GREY, LIBS.chain(LIBS.rotX(Math.PI / 2), LIBS.scale(0.07, 0.1, 0.07)));
  };
  var LEG_Y = 0.0;
  for (var k = 0; k < N_WIN; k++) {
    var uLeg = Math.PI / 2 + (k + 0.5) * STEP;
    var root = node(HOVER, null, null, LIBS.chain(LIBS.rotY(-uLeg), LIBS.translate(bodyR(LEG_Y) - 0.1, LEG_Y, 0)));
    var j1 = node(root, null, null, LIBS.get_I4());
    joint(j1);
    bar(j1, LEG_L[0]);
    var j2 = node(j1, null, null, LIBS.get_I4());
    joint(j2);
    bar(j2, LEG_L[1]);
    var j3 = node(j2, null, null, LIBS.get_I4());
    joint(j3);
    bar(j3, LEG_L[2]);
    node(j3, CONE, PINK, LIBS.chain(LIBS.translate(LEG_L[2] - 0.05, 0, 0), LIBS.rotZ(-Math.PI / 2),
         LIBS.scale(0.1, 0.2, 0.04)));
    var claw = node(j3, null, null, LIBS.get_I4());
    var upper = node(claw, null, null, LIBS.get_I4());
    node(upper, CYLINDER, PINK, LIBS.segment([0, 0, 0], [0.2, 0.24, 0], 0.025));
    node(upper, CYLINDER, PINK, LIBS.segment([0.2, 0.24, 0], [0.32, 0.15, 0], 0.025));
    var lower = node(claw, null, null, LIBS.get_I4());
    node(lower, CYLINDER, PINK, LIBS.segment([0.02, 0, 0], [0.02, -0.26, 0], 0.025));
    node(lower, CYLINDER, PINK, LIBS.segment([0.02, -0.26, 0], [0.2, -0.26, 0], 0.025));
    LEGS.push({ j1: j1, j2: j2, j3: j3, claw: claw, fingers: [upper, lower], phase: (k % 2) * Math.PI + k * 0.25 });
  }

  return {
    root: ROOT,
    update: function(t) {
      HOVER.matrix = LIBS.translate(0, 0.08 * Math.sin(t * 1.5), 0);
      HEAD.matrix = LIBS.chain(LIBS.translate(0, HEAD_Y, 0), LIBS.rotY(0.12 * Math.sin(t * 0.7)));
      for (var i = 0; i < LEGS.length; i++) {
        var L = LEGS[i], w = t * 2.5 + L.phase;
        var a1 = LEG_A[0] + 0.2 * Math.sin(w);
        var a2 = LEG_A[1] + 0.3 * Math.sin(w + 0.8);
        var a3 = LEG_A[2] - 0.25 * Math.sin(w + 1.6);
        L.j1.matrix = LIBS.rotZ(a1);
        L.j2.matrix = LIBS.chain(LIBS.translate(LEG_L[0], 0, 0), LIBS.rotZ(a2));
        L.j3.matrix = LIBS.chain(LIBS.translate(LEG_L[1], 0, 0), LIBS.rotZ(a3));
        L.claw.matrix = LIBS.chain(LIBS.translate(LEG_L[2] + 0.12, 0, 0), LIBS.rotZ(-(a1 + a2 + a3)));
        var open = 0.25 * (0.5 + 0.5 * Math.sin(t * 2 + L.phase));
        L.fingers[0].matrix = LIBS.rotZ(open);
        L.fingers[1].matrix = LIBS.rotZ(-open);
      }
    }
  };
};
