
// Daftar karakter: setiap file karakter mendaftarkan dirinya di sini.
// CHARACTERS.NAMA = function(E) { ...; return { root: Obj, update: function(t) {} }; }
var CHARACTERS = {};

var ENGINE = {

  create: function(canvasId, view) {
    var CANVAS = document.getElementById(canvasId);
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    /*========================= CAPTURE MOUSE EVENTS ========================= */

    var AMORTIZATION = 0.95;
    var drag = false;
    var x_prev, y_prev;
    var dX = 0, dY = 0;
    // kamera orbit: sudut theta/phi, jarak, dan titik target yang dilihat
    var CAM = { theta: view.theta || 0, phi: view.phi || 0.15, dist: view.dist || 10, target: [0, view.targetY || 0, 0] };

    CANVAS.addEventListener("mousedown", function(e) {
      drag = true;
      x_prev = e.pageX, y_prev = e.pageY;
      e.preventDefault();
    }, false);
    var mouseUp = function() { drag = false; };
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", function(e) {
      if (!drag) return false;
      dX = (e.pageX - x_prev) * Math.PI / CANVAS.width,
        dY = (e.pageY - y_prev) * Math.PI / CANVAS.height;
      CAM.theta += dX;
      CAM.phi += dY;
      x_prev = e.pageX, y_prev = e.pageY;
      e.preventDefault();
    }, false);
    CANVAS.addEventListener("wheel", function(e) {
      CAM.dist *= e.deltaY > 0 ? 1.08 : 1 / 1.08;
      e.preventDefault();
    }, { passive: false });

    /*========================= GET WEBGL CONTEXT ========================= */
    var GL;
    try {
      GL = CANVAS.getContext("webgl", { antialias: true });
      GL.getExtension("OES_element_index_uint");
    } catch (e) {
      alert("WebGL context cannot be initialized");
      return null;
    }

    /*========================= SHADERS ========================= */

    var shader_vertex_source = `
      attribute vec3 position;
      uniform mat4 Pmatrix, Vmatrix, Mmatrix;

      void main(void) {
        gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
      }`;

    var shader_fragment_source = `
      precision mediump float;
      uniform vec3 color;

      void main(void) {
        gl_FragColor = vec4(color, 1.);
      }`;

    var compile_shader = function(source, type, typeString) {
      var shader = GL.createShader(type);
      GL.shaderSource(shader, source);
      GL.compileShader(shader);
      if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
        alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
        return false;
      }
      return shader;
    };

    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX"));
    GL.attachShader(SHADER_PROGRAM, compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT"));
    GL.linkProgram(SHADER_PROGRAM);

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");
    var _color = GL.getUniformLocation(SHADER_PROGRAM, "color");
    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    GL.enableVertexAttribArray(_position);
    GL.useProgram(SHADER_PROGRAM);

    /*========================= OBJECTS ========================= */

    var buffers = function(geo) {
      var vbo = GL.createBuffer();
      GL.bindBuffer(GL.ARRAY_BUFFER, vbo);
      GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(geo.vertices), GL.STATIC_DRAW);
      var ibo = GL.createBuffer();
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, ibo);
      GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint32Array(geo.indices), GL.STATIC_DRAW);
      return { vbo: vbo, ibo: ibo, count: geo.indices.length };
    };

    // simpul scene graph: posisi, rotasi (urutan XYZ atau YXZ), skala, atau matriks langsung
    function Obj(geo, color) {
      this.geo = geo || null;
      this.color = color || null;
      this.position = [0, 0, 0];
      this.rotation = [0, 0, 0];
      this.order = 'XYZ';
      this.scale = [1, 1, 1];
      this.matrix = null;
      this.children = [];
      this.parent = null;
    }
    Obj.prototype.add = function(child) {
      child.parent = this;
      this.children.push(child);
      return child;
    };
    Obj.prototype.local = function() {
      if (this.matrix) return this.matrix;
      var p = this.position, r = this.rotation, s = this.scale;
      var R = this.order === 'YXZ'
        ? LIBS.chain(LIBS.rotY(r[1]), LIBS.rotX(r[0]), LIBS.rotZ(r[2]))
        : LIBS.chain(LIBS.rotX(r[0]), LIBS.rotY(r[1]), LIBS.rotZ(r[2]));
      return LIBS.chain(LIBS.translate(p[0], p[1], p[2]), R, LIBS.scale(s[0], s[1], s[2]));
    };
    // titik dari koordinat lokal objek ini ke koordinat objek leluhur
    Obj.prototype.toAncestor = function(point, ancestor) {
      var v = point.slice(), o = this;
      while (o && o !== ancestor) {
        v = LIBS.apply(o.local(), v);
        o = o.parent;
      }
      return v;
    };

    var cache = {};
    var AXIS = { x: LIBS.rotZ(-Math.PI / 2), y: LIBS.get_I4(), z: LIBS.rotX(Math.PI / 2) };
    var geo = {
      sphere: function() {
        return cache.sphere || (cache.sphere = buffers(QUADRIC.ellipsoid(1, 1, 1)));
      },
      // cylinder / kerucut terpotong setinggi 1 di sepanjang sumbu x, y, atau z
      cyl: function(axis, open, rTop, rBot) {
        rTop = rTop === undefined ? 1 : rTop;
        rBot = rBot === undefined ? 1 : rBot;
        var key = ['cyl', axis, !!open, rTop, rBot].join();
        if (cache[key]) return cache[key];
        var parts = [QUADRIC.frustum(rTop, rBot)];
        if (!open) {
          parts.push(QUADRIC.transform(QUADRIC.circle(rTop), LIBS.translate(0, 0.5, 0)));
          parts.push(QUADRIC.transform(QUADRIC.circle(rBot), LIBS.translate(0, -0.5, 0)));
        }
        return (cache[key] = buffers(QUADRIC.transform(QUADRIC.merge(parts), AXIS[axis])));
      },
      patch: function(R, arc, len) {
        return buffers(QUADRIC.patch(R, arc, len));
      }
    };

    var root = new Obj();
    var actors = [];

    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.17, 0.17, 0.18, 1.0);
    GL.clearDepth(1.0);

    var PROJMATRIX;
    var resize = function() {
      CANVAS.width = window.innerWidth;
      CANVAS.height = window.innerHeight;
      PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 0.5, 200);
    };
    resize();
    window.addEventListener('resize', resize);

    var draw = function(o, parentM) {
      var M = LIBS.multiply(parentM, o.local());
      if (o.geo) {
        GL.uniformMatrix4fv(_Mmatrix, false, M);
        GL.uniform3fv(_color, o.color);
        GL.bindBuffer(GL.ARRAY_BUFFER, o.geo.vbo);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * 3, 0);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, o.geo.ibo);
        GL.drawElements(GL.TRIANGLES, o.geo.count, GL.UNSIGNED_INT, 0);
      }
      for (var i = 0; i < o.children.length; i++) draw(o.children[i], M);
    };

    var hooks = [], t_prev = 0;
    var animate = function(time) {
      var t = time / 1000;
      var dt = Math.min(0.05, t - t_prev);
      t_prev = t;
      if (!drag) {
        dX *= AMORTIZATION, dY *= AMORTIZATION;
        CAM.theta += dX, CAM.phi += dY;
      }
      for (var i = 0; i < actors.length; i++) actors[i].update(t);
      for (var i = 0; i < hooks.length; i++) hooks[i](t, dt);

      var VIEWMATRIX = LIBS.chain(LIBS.translate(0, 0, -CAM.dist), LIBS.rotX(CAM.phi), LIBS.rotY(CAM.theta),
                                  LIBS.translate(-CAM.target[0], -CAM.target[1], -CAM.target[2]));
      GL.viewport(0, 0, CANVAS.width, CANVAS.height);
      GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
      GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
      GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
      draw(root, LIBS.get_I4());

      GL.flush();
      window.requestAnimationFrame(animate);
    };

    return {
      GL: GL,
      Obj: Obj,
      buffers: buffers,
      geo: geo,
      root: root,
      camera: CAM,
      // pasang karakter ke environment pada posisi & arah tertentu
      spawn: function(make, position, rotationY) {
        var c = make(this);
        var holder = new Obj();
        holder.position = position || [0, 0, 0];
        holder.rotation = [0, rotationY || 0, 0];
        holder.add(c.root);
        root.add(holder);
        actors.push(c);
        c.holder = holder;
        return c;
      },
      // fungsi tambahan yang dijalankan setiap frame: fn(t, dt)
      onFrame: function(fn) {
        hooks.push(fn);
      },
      start: function() {
        window.requestAnimationFrame(animate);
      }
    };
  }
};
