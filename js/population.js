/* Интерактивная шкала «Сколько жителей»: график по данным window.POPULATION (data/population.js). */
(function () {
  var P = window.POPULATION;
  var svg = document.getElementById("popSvg");
  if (!P || !svg) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 960, H = 470, M = { l: 58, r: 22, t: 38, b: 46 };
  var X0 = P.x0, X1 = P.x1, YMAX = 60000;
  var range = document.getElementById("popRange"), yearOut = document.getElementById("popYear");
  var read = document.getElementById("popRead"), estBox = document.getElementById("popEst");
  var play = document.getElementById("popPlay");
  var year = +range.value, visible = {}, timer = null;
  var gSer = {}, cross, crossLab, estDots, overlay, narrow = false, down = false;
  P.series.forEach(function (s) { visible[s.id] = !s.off; });

  function X(y) { return M.l + (y - X0) / (X1 - X0) * (W - M.l - M.r); }
  function Y(v) { return H - M.b - v / YMAX * (H - M.t - M.b); }
  function el(name, attrs, parent, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(v) { return v.toLocaleString("ru-RU"); }
  function thou(v) { return (v / 1000).toFixed(1).replace(".", ",") + " тыс."; }

  var pts = {};   // точки по рядам, только те, что идут на график
  var nameOf = {};
  P.series.forEach(function (s) {
    pts[s.id] = P.rows.filter(function (r) { return r.s === s.id && r.plot; }).sort(function (a, b) { return a.y - b.y; });
    nameOf[s.id] = s.short;
  });

  // размеры под ширину экрана: подписи остаются читаемыми и на телефоне
  function measure() {
    var w = Math.round(svg.parentNode.clientWidth || 960);
    narrow = w < 620;
    W = Math.max(300, w);
    H = narrow ? 330 : Math.round(W * 0.49);
    M = narrow ? { l: 34, r: 12, t: 34, b: 34 } : { l: 58, r: 22, t: 38, b: 46 };
  }

  function build() {
    measure();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var fs = narrow ? 11 : 12;
    var gBg = el("g", {}, svg);
    el("rect", { x: X(1941), y: M.t, width: X(1945) - X(1941), height: H - M.t - M.b, style: "fill:var(--chip);opacity:.7" }, gBg);
    el("text", { x: (X(1941) + X(1945)) / 2, y: M.t + 14, "text-anchor": "middle", style: "fill:var(--muted);font:600 11px var(--sans)" }, gBg, "война");
    for (var v = 0; v <= YMAX; v += 10000) {
      el("line", { x1: M.l, x2: W - M.r, y1: Y(v), y2: Y(v), style: "stroke:var(--line);stroke-width:1" }, gBg);
      el("text", { x: M.l - 6, y: Y(v) + 4, "text-anchor": "end", style: "fill:var(--muted);font:" + fs + "px var(--sans)" }, gBg, v / 1000);
    }
    el("text", { x: narrow ? 4 : 14, y: M.t - 16, style: "fill:var(--muted);font:" + fs + "px var(--sans)" }, gBg, "тысяч человек");
    for (var t = 1920; t <= 1990; t += narrow ? 20 : 10) {
      el("line", { x1: X(t), x2: X(t), y1: H - M.b, y2: H - M.b + 5, style: "stroke:var(--muted)" }, gBg);
      el("text", { x: X(t), y: H - M.b + 20, "text-anchor": "middle", style: "fill:var(--muted);font:" + fs + "px var(--sans)" }, gBg, t);
    }
    el("line", { x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b, style: "stroke:var(--muted)" }, gBg);
    el("line", { x1: X(1920), x2: X(1920), y1: M.t, y2: H - M.b, style: "stroke:var(--accent);stroke-width:1;stroke-dasharray:2 4;opacity:.7" }, gBg);
    el("text", { x: X(1920) + 5, y: M.t + 12, style: "fill:var(--accent);font:600 11px var(--sans)" }, gBg, narrow ? "1920: разрушен" : "1920: город разрушен");
    el("line", { x1: M.l, x2: W - M.r, y1: Y(P.ref.value), y2: Y(P.ref.value), style: "stroke:var(--muted);stroke-width:1;stroke-dasharray:6 4;opacity:.8" }, gBg);
    el("text", { x: W - M.r - 4, y: Y(P.ref.value) - 5, "text-anchor": "end", style: "fill:var(--muted);font:11px var(--sans)" }, gBg,
      narrow ? "до 1917: 15,4 тыс." : P.ref.label);

    overlay = el("rect", { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b, fill: "transparent", style: "cursor:crosshair;touch-action:pan-y" }, svg);
    cross = el("line", { y1: M.t, y2: H - M.b, style: "stroke:var(--ink);stroke-width:1.5;pointer-events:none" }, svg);
    crossLab = el("text", { y: H - M.b - 8, "text-anchor": "middle", style: "pointer-events:none;fill:var(--ink);font:700 13px var(--sans);paint-order:stroke;stroke:var(--surface);stroke-width:4px" }, svg);
    estDots = el("g", { style: "pointer-events:none" }, svg);
    P.series.forEach(function (s) {
      var g = el("g", {}, svg);
      gSer[s.id] = g;
      var p = pts[s.id];
      var d = p.map(function (r, i) { return (i ? "L" : "M") + X(r.y).toFixed(1) + " " + Y(r.v).toFixed(1); }).join(" ");
      el("path", { d: d, class: "est", fill: "none", style: "pointer-events:none;stroke:" + s.color + ";stroke-width:2;stroke-dasharray:6 5;opacity:.75" }, g);
      p.forEach(function (r) {
        var c = el("circle", { cx: X(r.y), cy: Y(r.v), r: narrow ? 5 : 6, tabindex: 0, role: "button",
          "aria-label": r.y + " год, " + nameOf[s.id] + ": " + num(r.v) + " человек",
          style: "cursor:pointer;stroke:" + s.color + ";stroke-width:2.5;fill:" + (r.approx ? "var(--surface)" : s.color) }, g);
        el("title", {}, c, r.y + ": " + (r.approx ? "около " : "") + num(r.v) + " (" + r.scope + ")");
        c.addEventListener("click", function (e) { e.stopPropagation(); setYear(r.y); });
        c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setYear(r.y); } });
      });
    });
    overlay.addEventListener("pointerdown", function (e) { down = true; setYear(yearFromEvent(e)); });
    overlay.addEventListener("pointermove", function (e) { if (down || e.pointerType === "mouse") setYear(yearFromEvent(e)); });
  }

  function yearFromEvent(e) {
    var r = svg.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width * W;
    var y = Math.round(X0 + (px - M.l) / (W - M.l - M.r) * (X1 - X0));
    return Math.max(1918, Math.min(1991, y));
  }
  window.addEventListener("pointerup", function () { down = false; });

  // ---- оценка по прямой между известными годами ----
  function estimate(sid, y) {
    var p = pts[sid], a = null, b = null;
    for (var i = 0; i < p.length; i++) {
      if (p[i].y <= y) a = p[i];
      if (p[i].y >= y && !b) b = p[i];
    }
    if (!a || !b || a.y === b.y) return null;
    return { v: Math.round(a.v + (b.v - a.v) * (y - a.y) / (b.y - a.y)), a: a, b: b };
  }

  function render() {
    yearOut.textContent = year;
    range.value = year;
    var x = X(year);
    cross.setAttribute("x1", x); cross.setAttribute("x2", x);
    crossLab.setAttribute("x", Math.min(Math.max(x, M.l + 18), W - M.r - 18)); crossLab.textContent = year;
    while (estDots.firstChild) estDots.removeChild(estDots.firstChild);
    var showEst = estBox.checked, html = "<h3>" + year + " год</h3>", any = false;
    P.series.forEach(function (s) {
      gSer[s.id].style.display = visible[s.id] ? "" : "none";
      gSer[s.id].querySelector("path.est").style.display = showEst ? "" : "none";
      if (!visible[s.id]) return;
      var ex = pts[s.id].filter(function (r) { return r.y === year; });
      var line;
      if (ex.length) {
        any = true;
        line = ex.map(function (r) {
          var lk = r.ev ? ' <a href="' + r.evy + '.html#e' + r.ev + '">запись № ' + r.ev + "</a>" : "";
          return "<b>" + (r.approx ? "около " : "") + num(r.v) + " чел.</b> (" + thou(r.v) + "), " + esc(r.scope) + ". <span class=\"muted\">" + esc(r.src) + ".</span>" + lk +
            (r.note ? ' <span class="muted">' + esc(r.note) + "</span>" : "");
        }).join("<br>");
      } else {
        var e = estimate(s.id, year);
        if (e && showEst) {
          line = "≈ <b>" + thou(e.v) + "</b> &mdash; оценка по прямой между " + e.a.y + " (" + thou(e.a.v) + ") и " + e.b.y + " (" + thou(e.b.v) + "); данных за этот год нет.";
          el("circle", { cx: x, cy: Y(e.v), r: 5, style: "fill:var(--surface);stroke:" + s.color + ";stroke-width:2;stroke-dasharray:2 2" }, estDots);
        } else {
          line = "<span class=\"muted\">данных за этот год нет</span>";
        }
      }
      html += '<p class="pr"><i style="background:' + s.color + '"></i><span><em>' + esc(s.short) + ".</em> " + line + "</span></p>";
    });
    if (!any) {
      var near = [];
      P.series.forEach(function (s) { if (visible[s.id]) pts[s.id].forEach(function (r) { near.push(r); }); });
      near.sort(function (a, b) { return Math.abs(a.y - year) - Math.abs(b.y - year); });
      if (near.length) html += '<p class="muted">Ближайшие данные: ' + near.slice(0, 2).map(function (r) { return r.y + " &mdash; " + thou(r.v); }).join("; ") + "</p>";
    }
    var n = P.perYear[year] || 0;
    html += '<p class="muted"><a href="' + year + '.html">Страница года ' + year + "</a>" + (n ? ": " + n + " " + plural(n, "запись", "записи", "записей") + " в хронологии." : ".") + "</p>";
    read.innerHTML = html;
  }
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : (m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c); }
  function setYear(y) { year = Math.max(1918, Math.min(1991, y)); render(); }

  range.addEventListener("input", function () { stop(); setYear(+range.value); });
  estBox.addEventListener("change", render);
  document.querySelectorAll("#popLegend input[data-s]").forEach(function (cb) {
    cb.addEventListener("change", function () { visible[cb.getAttribute("data-s")] = cb.checked; render(); });
  });
  function stop() { if (timer) { clearInterval(timer); timer = null; } play.setAttribute("aria-pressed", "false"); play.innerHTML = "&#9654; Проиграть"; }
  play.addEventListener("click", function () {
    if (timer) { stop(); return; }
    if (year >= 1991) setYear(1918);
    play.setAttribute("aria-pressed", "true"); play.innerHTML = "&#10074;&#10074; Пауза";
    timer = setInterval(function () { if (year >= 1991) { stop(); return; } setYear(year + 1); }, 220);
  });

  var lastW = 0, rz = null;
  window.addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () { var w = svg.parentNode.clientWidth; if (Math.abs(w - lastW) > 8) { lastW = w; build(); render(); } }, 150);
  });
  lastW = svg.parentNode.clientWidth;
  build();
  render();
})();
