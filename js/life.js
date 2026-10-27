(function () {
  "use strict";
  var NK = window.NK, el = NK.el, L = window.LIFE, G = window.NKG || { once: function () {} };
  var slider = document.getElementById("ts"), yearBox = document.getElementById("tsYear"), grid = document.getElementById("lifegrid"), dimsBox = document.getElementById("dims");
  var ICON = { plus: "＋", limit: "⚠", info: "●" };
  var cards = {}, panels = {};

  dimsBox.textContent = "";   // статическая копия сфер нужна поисковикам, в браузере сферы рисует скрипт
  document.getElementById("lifenote").appendChild(document.createTextNode(L.note));

  // ---------- карточки сфер под ползунком ----------
  L.dims.forEach(function (d) {
    var c = el("article", "lcard");
    c.appendChild(el("div", "ico", d.ico));
    c.appendChild(el("h3", null, d.title));
    var cnt = el("div", "cnt"); c.appendChild(cnt);
    var bar = el("div", "lbar"); var fill = el("i"); bar.appendChild(fill); c.appendChild(bar);
    var last = el("ul", "last"); c.appendChild(last);
    var more = el("button", "lmore", "Подробнее →"); more.type = "button";
    more.addEventListener("click", function () { openPanel(d.key, true); });
    c.appendChild(more);
    grid.appendChild(c);
    cards[d.key] = { cnt: cnt, fill: fill, last: last, dim: d };
  });

  function update() {
    var y = parseInt(slider.value, 10);
    yearBox.textContent = y;
    Object.keys(cards).forEach(function (k) {
      var c = cards[k], done = c.dim.steps.filter(function (s) { return s.year <= y; });
      c.cnt.textContent = done.length + " из " + c.dim.steps.length + " вех";
      c.fill.style.width = Math.round(done.length / c.dim.steps.length * 100) + "%";
      c.last.textContent = "";
      done.slice(-2).reverse().forEach(function (s) {
        var li = el("li", s.kind); li.appendChild(el("b", null, s.year + " "));
        li.appendChild(document.createTextNode(s.text)); c.last.appendChild(li);
      });
      if (!done.length) c.last.appendChild(el("li", "empty", "Пока ничего не отмечено"));
      var p = panels[k];
      if (p) p.items.forEach(function (it) { it.node.classList.toggle("future", it.year > y); });
    });
  }
  slider.addEventListener("input", function () { update(); G.once("life:slider", 3, "Ползунок времени"); });
  function step(d) {   // шаг на год вперёд или назад, без автоплея
    if (timer) { clearInterval(timer); timer = null; setPlay(false); }
    var v = Math.min(1991, Math.max(1918, parseInt(slider.value, 10) + d));
    slider.value = v; update(); G.once("life:slider", 3, "Ползунок времени");
  }
  document.getElementById("tsPrev").addEventListener("click", function () { step(-1); });
  document.getElementById("tsNext").addEventListener("click", function () { step(1); });
  var timer = null, playBtn = document.getElementById("tsPlay");
  function setPlay(on) {   // подпись кнопки: на телефоне короче, чтобы год, шаги и кнопка уместились в одну строку
    playBtn.textContent = "";
    playBtn.appendChild(document.createTextNode(on ? "❚❚ " : "▶ "));
    if (on) playBtn.appendChild(document.createTextNode("Пауза"));
    else { playBtn.appendChild(el("span", "lbl-long", "Показать ход времени")); playBtn.appendChild(el("span", "lbl-short", "Ход времени")); }
  }
  setPlay(false);
  playBtn.addEventListener("click", function () {
    if (timer) { clearInterval(timer); timer = null; setPlay(false); return; }
    if (parseInt(slider.value, 10) >= 1991) slider.value = 1918;
    setPlay(true); G.once("life:slider", 3, "Ползунок времени");
    timer = setInterval(function () {
      var v = parseInt(slider.value, 10) + 1; slider.value = v; update();
      if (v >= 1991) { clearInterval(timer); timer = null; setPlay(false); }
    }, 140);
  });

  // ---------- подробные панели ----------
  function chart(sr) {
    var box = el("div", "lchart");
    box.appendChild(el("h4", null, sr.title));
    box.appendChild(el("p", "note", sr.note));
    var max = Math.max.apply(null, sr.items.map(function (i) { return i.value; }));
    // одинаковую для всех столбцов территорию, уже названную в заголовке или примечании, под каждым годом не повторяем
    var scopes = {}; sr.items.forEach(function (it) { if (it.scope) scopes[it.scope] = 1; });
    var sc = Object.keys(scopes), hint = (sr.title + " " + sr.note).toLowerCase();
    var skipScope = sc.length === 1 && hint.indexOf(sc[0].toLowerCase()) >= 0;
    sr.items.forEach(function (it) {
      var row = el("div", "crow");
      var lab = el("span", "cl"); lab.appendChild(document.createTextNode(it.label));
      if (it.scope && !skipScope) lab.appendChild(el("small", null, it.scope));
      row.appendChild(lab);
      var w = it.value / max * 100;
      var bar = el("div", "cbar"); var i = el("i"); i.style.width = "0"; i.dataset.w = w.toFixed(1); bar.appendChild(i);
      var FORMS = { "часов": ["час", "часа", "часов"], "чел.": ["чел.", "чел.", "чел."], "коек": ["койка", "койки", "коек"] };   // «72 часа», а не «72 часов»
      var unit = sr.unit && FORMS[sr.unit] && it.value === Math.floor(it.value) ? NK.plural(it.value, FORMS[sr.unit][0], FORMS[sr.unit][1], FORMS[sr.unit][2]) : sr.unit;
      var val = el("span", w < 30 ? "out" : null, it.value.toLocaleString("ru-RU") + (unit ? " " + unit : ""));
      if (w < 30) val.style.left = "calc(" + w.toFixed(1) + "% + 8px)";   // подпись узкого столбика выносим за его край
      bar.appendChild(val);
      row.appendChild(bar); box.appendChild(row);
    });
    if (sr.src) box.appendChild(el("p", "note", "Источник: " + sr.src + "."));
    return box;
  }
  function openPanel(key, scroll) {
    var p = panels[key]; if (!p) return;
    if (!p.open) {
      p.open = true; p.body.hidden = false; p.head.setAttribute("aria-expanded", "true"); p.head.classList.add("open");
      G.once("life:" + key, 5, "Сфера «" + p.dim.title + "»", "life:open");
      p.body.querySelectorAll(".cbar i").forEach(function (i) { setTimeout(function () { i.style.width = i.dataset.w + "%"; }, 60); });
    }
    if (scroll) p.wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  L.dims.forEach(function (d) {
    var wrap = el("section", "ldim"); wrap.id = "dim-" + d.key;
    var head = el("button", "ldim-head"); head.type = "button"; head.setAttribute("aria-expanded", "false");
    head.appendChild(el("span", "ico", d.ico)); head.appendChild(el("strong", null, d.title));
    head.appendChild(el("span", "n", d.steps.length + " вех")); head.appendChild(el("span", "chev", "▾"));
    var body = el("div", "ldim-body"); body.hidden = true;
    body.appendChild(el("p", "intro", d.intro));
    var list = el("ol", "steps"), items = [];
    d.steps.forEach(function (s) {
      var li = el("li", s.kind);
      li.appendChild(el("b", "yr", String(s.year)));
      var t = el("span", "tx"); t.appendChild(el("span", "ic", ICON[s.kind])); t.appendChild(document.createTextNode(" " + s.text));
      if (s.scope) t.appendChild(el("small", "scope", s.scope));
      li.appendChild(t);
      if (s.id) { var a = el("a", "go", "запись →"); a.href = "index.html#e" + s.id; li.appendChild(a); }
      list.appendChild(li); items.push({ node: li, year: s.year });
    });
    body.appendChild(list);
    d.series.forEach(function (sr) { body.appendChild(chart(sr)); });
    function closePanel() { panels[d.key].open = false; body.hidden = true; head.setAttribute("aria-expanded", "false"); head.classList.remove("open"); }
    var fold = el("button", "lfold", "Свернуть сферу ▲"); fold.type = "button";
    fold.addEventListener("click", function () { closePanel(); wrap.scrollIntoView({ behavior: "smooth", block: "nearest" }); head.focus({ preventScroll: true }); });
    body.appendChild(fold);
    head.addEventListener("click", function () {
      if (panels[d.key].open) closePanel(); else openPanel(d.key, false);
    });
    wrap.appendChild(head); wrap.appendChild(body); dimsBox.appendChild(wrap);
    panels[d.key] = { dim: d, wrap: wrap, head: head, body: body, items: items, open: false };
  });

  // высота блока вех у каждой карточки = самая высокая из всех годов, чтобы при автоплее интерфейс не прыгал
  function fixHeights() {
    var keep = slider.value, mx = {};
    Object.keys(cards).forEach(function (k) { cards[k].last.style.minHeight = "0"; mx[k] = 0; });
    for (var y = 1918; y <= 1991; y++) {
      slider.value = y; update();
      Object.keys(cards).forEach(function (k) { mx[k] = Math.max(mx[k], cards[k].last.offsetHeight); });
    }
    slider.value = keep; update();
    Object.keys(cards).forEach(function (k) { cards[k].last.style.minHeight = mx[k] + "px"; });
  }
  var rz = null;
  window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(fixHeights, 250); });
  update();
  fixHeights();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fixHeights);
  if (location.hash.indexOf("#dim-") === 0) openPanel(location.hash.slice(5), true);
})();
