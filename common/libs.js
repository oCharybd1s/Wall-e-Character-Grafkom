
var LIBS = {

  degToRad: function(angle) {
    return (angle * Math.PI / 180);
  },

  get_projection: function(angle, a, zMin, zMax) {
    var tan = Math.tan(LIBS.degToRad(0.5 * angle)),
        A = -(zMax + zMin) / (zMax - zMin),
        B = (-2 * zMax * zMin) / (zMax - zMin);

    return [
      0.5 / tan, 0,             0,  0,
      0,         0.5 * a / tan, 0,  0,
      0,         0,             A, -1,
      0,         0,             B,  0
    ];
  },

  get_I4: function() {
    return [1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1];
  },

  multiply: function(a, b) {
    var r = new Array(16);
    for (var c = 0; c < 4; c++) {
      for (var i = 0; i < 4; i++) {
        var s = 0;
        for (var k = 0; k < 4; k++) s += a[k * 4 + i] * b[c * 4 + k];
        r[c * 4 + i] = s;
      }
    }
    return r;
  },

  chain: function() {
    var m = LIBS.get_I4();
    for (var i = 0; i < arguments.length; i++) m = LIBS.multiply(m, arguments[i]);
    return m;
  },

  apply: function(m, v) {
    return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
            m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
            m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
  },

  translate: function(x, y, z) {
    var m = LIBS.get_I4();
    m[12] = x; m[13] = y; m[14] = z;
    return m;
  },

  scale: function(x, y, z) {
    return [x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1];
  },

  rotX: function(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1];
  },

  rotY: function(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1];
  },

  rotZ: function(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1];
  },

  // silinder satuan (sumbu Y, tinggi 1, pusat di 0) -> ruas dari titik p ke q dengan jari-jari r
  segment: function(p, q, r) {
    var d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    var len = Math.hypot(d[0], d[1], d[2]);
    var y = [d[0] / len, d[1] / len, d[2] / len];
    var a = Math.abs(y[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
    var x = LIBS.normalize(LIBS.cross(a, y));
    var z = LIBS.cross(x, y);
    return [x[0] * r, x[1] * r, x[2] * r, 0,
            y[0] * len, y[1] * len, y[2] * len, 0,
            z[0] * r, z[1] * r, z[2] * r, 0,
            (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2, 1];
  },

  cross: function(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  },

  normalize: function(v) {
    var l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  },

  // kurva Bezier kuadratik: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  bezier2: function(p0, p1, p2, t) {
    var u = 1 - t, r = [];
    for (var i = 0; i < p0.length; i++) r.push(u * u * p0[i] + 2 * u * t * p1[i] + t * t * p2[i]);
    return r;
  },

  // kurva Bezier kubik: B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
  bezier3: function(p0, p1, p2, p3, t) {
    var u = 1 - t, r = [];
    for (var i = 0; i < p0.length; i++) {
      r.push(u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
    }
    return r;
  }
};


// Jalur gabungan dari garis & kurva Bezier (2D atau 3D)
var CURVE = {

  line: function(a, b) {
    return { straight: true, at: function(t) { return a.map(function(v, i) { return v + (b[i] - v) * t; }); } };
  },

  quad: function(p0, p1, p2) {
    return { at: function(t) { return LIBS.bezier2(p0, p1, p2, t); } };
  },

  cubic: function(p0, p1, p2, p3) {
    return { at: function(t) { return LIBS.bezier3(p0, p1, p2, p3, t); } };
  },

  path: function(segs) {
    return {
      getPoints: function(n) {
        var pts = [segs[0].at(0)];
        segs.forEach(function(s) {
          var k = s.straight ? 1 : n;
          for (var i = 1; i <= k; i++) pts.push(s.at(i / k));
        });
        return pts;
      },
      getSpacedPoints: function(n) {
        var dense = [], len = [0];
        segs.forEach(function(s, si) {
          for (var i = si === 0 ? 0 : 1; i <= 100; i++) dense.push(s.at(i / 100));
        });
        for (var i = 1; i < dense.length; i++) {
          var d = 0;
          for (var j = 0; j < dense[i].length; j++) d += Math.pow(dense[i][j] - dense[i - 1][j], 2);
          len.push(len[i - 1] + Math.sqrt(d));
        }
        var out = [], total = len[len.length - 1], k = 1;
        for (var i = 0; i <= n; i++) {
          var target = total * i / n;
          while (k < len.length - 1 && len[k] < target) k++;
          var f = (target - len[k - 1]) / ((len[k] - len[k - 1]) || 1);
          out.push(dense[k - 1].map(function(v, j) { return v + (dense[k][j] - v) * f; }));
        }
        return out;
      }
    };
  }
};


// Permukaan kuadrik parametrik X(u,v), Y(u,v), Z(u,v).
// Sumbu Z pada rumus dipetakan ke sumbu Y dunia (atas).
var QUADRIC = {

  surface: function(f, u0, u1, v0, v1, nu, nv) {
    var vertices = [], indices = [];
    for (var i = 0; i <= nv; i++) {
      var v = v0 + (v1 - v0) * i / nv;
      for (var j = 0; j <= nu; j++) {
        var u = u0 + (u1 - u0) * j / nu;
        var p = f(u, v);
        vertices.push(p[0], p[2], p[1]);
      }
    }
    for (var i = 0; i < nv; i++) {
      for (var j = 0; j < nu; j++) {
        var a = i * (nu + 1) + j, b = a + nu + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return { vertices: vertices, indices: indices };
  },

  // Ellipsoid: X = a cos(v) cos(u), Y = b cos(v) sin(u), Z = c sin(v)
  ellipsoid: function(a, b, c, v0, v1) {
    return QUADRIC.surface(function(u, v) {
      return [a * Math.cos(v) * Math.cos(u), b * Math.cos(v) * Math.sin(u), c * Math.sin(v)];
    }, -Math.PI, Math.PI, v0 === undefined ? -Math.PI / 2 : v0, v1 === undefined ? Math.PI / 2 : v1, 40, 24);
  },

  // Elliptic cone: X = a v cos(u), Y = b v sin(u), Z = c v  (v dibatasi -> kerucut terpotong)
  // u0..u1 dan t0..t1 (fraksi tinggi) untuk mengambil sebagian permukaan saja
  truncatedCone: function(r0, r1, h, u0, u1, t0, t1) {
    var c = h / (r1 - r0);
    t0 = t0 === undefined ? 0 : t0;
    t1 = t1 === undefined ? 1 : t1;
    return QUADRIC.surface(function(u, v) {
      return [v * Math.cos(u), v * Math.sin(u), c * (v - r0)];
    }, u0 === undefined ? -Math.PI : u0, u1 === undefined ? Math.PI : u1,
       r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, 48, 4);
  },

  // Elliptic paraboloid: X = a v cos(u), Y = b v sin(u), Z = c v^2
  paraboloid: function(a, b, c, vMax, vMin) {
    return QUADRIC.surface(function(u, v) {
      return [a * v * Math.cos(u), b * v * Math.sin(u), c * v * v];
    }, -Math.PI, Math.PI, vMin || 0, vMax, 48, 16);
  },

  // Cylinder: X = a cos(u), Y = b sin(u), Z = v
  cylinder: function(a, b) {
    return QUADRIC.surface(function(u, v) {
      return [a * Math.cos(u), b * Math.sin(u), v];
    }, -Math.PI, Math.PI, -0.5, 0.5, 32, 1);
  },

  // Cylinder / kerucut terpotong setinggi 1 berpusat di 0 (jari-jari atas rTop, bawah rBot)
  frustum: function(rTop, rBot, nu) {
    return QUADRIC.surface(function(u, v) {
      var r = rBot + (rTop - rBot) * (v + 0.5);
      return [r * Math.cos(u), r * Math.sin(u), v];
    }, -Math.PI, Math.PI, -0.5, 0.5, nu || 24, 1);
  },

  // potongan cylinder berjari-jari besar R, menghadap +Z (sisi "datar")
  patch: function(R, arc, len) {
    var th = 2 * Math.asin(arc / 2 / R), off = R * Math.cos(th / 2);
    return QUADRIC.surface(function(u, v) {
      return [R * Math.cos(u), R * Math.sin(u) - off, v * len];
    }, Math.PI / 2 - th / 2, Math.PI / 2 + th / 2, -0.5, 0.5, 4, 1);
  },

  // Circle (bidang lingkaran): X = r v cos(u), Y = r v sin(u), Z = 0
  circle: function(r) {
    return QUADRIC.surface(function(u, v) {
      return [r * v * Math.cos(u), r * v * Math.sin(u), 0];
    }, -Math.PI, Math.PI, 0, 1, 48, 1);
  },

  // tabung mengikuti deretan titik (untuk kabel kurva Bezier)
  tube: function(points, r, nu) {
    var vertices = [], indices = [];
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      var t = LIBS.normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      var ref = Math.abs(t[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
      var n = LIBS.normalize(LIBS.cross(t, ref));
      var bn = LIBS.cross(t, n);
      for (var j = 0; j <= nu; j++) {
        var ang = 2 * Math.PI * j / nu, c = Math.cos(ang), s = Math.sin(ang);
        vertices.push(p[0] + r * (c * n[0] + s * bn[0]),
                      p[1] + r * (c * n[1] + s * bn[1]),
                      p[2] + r * (c * n[2] + s * bn[2]));
      }
    }
    for (var i = 0; i < points.length - 1; i++) {
      for (var j = 0; j < nu; j++) {
        var a = i * (nu + 1) + j, b = a + nu + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return { vertices: vertices, indices: indices };
  },

  transform: function(geo, m) {
    var v = geo.vertices, out = [];
    for (var i = 0; i < v.length; i += 3) {
      var p = LIBS.apply(m, [v[i], v[i + 1], v[i + 2]]);
      out.push(p[0], p[1], p[2]);
    }
    return { vertices: out, indices: geo.indices };
  },

  merge: function(list) {
    var vertices = [], indices = [];
    list.forEach(function(g) {
      var base = vertices.length / 3;
      vertices.push.apply(vertices, g.vertices);
      g.indices.forEach(function(i) { indices.push(i + base); });
    });
    return { vertices: vertices, indices: indices };
  }
};
