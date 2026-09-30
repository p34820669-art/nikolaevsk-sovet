(function () {
  "use strict";
  var DATA = window.SITE_DATA;
  var EVENTS = DATA.events, ERAS = DATA.meta.eras, THEMES = DATA.meta.themes;
  var FIGS = window.FIGURES || [], CHAPTERS = window.CHAPTERS || {};
  var figsByYear = {};
  FIGS.forEach(function (f) { (figsByYear[f.year] = figsByYear[f.year] || []).push(f); });

  // цвет каждой эпохи (тёплые — мирные годы, тёмный — война)
  var ERA_COLORS = window.NK.ERA_COLORS;
  var LONG = 380;          // длиннее — сворачиваем «читать дальше»
  var SHOW_FIRST = 3;      // сколько обычных записей года показывать сразу

  var state = { q: "", themes: {}, expanded: {}, place: "" };
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };

  // ---------- индексы ----------
  var years = [];
  var byYear = {};
  EVENTS.forEach(function (e) {
    if (!byYear[e.year]) { byYear[e.year] = []; years.push(e.year); }
    byYear[e.year].push(e);
  });
  years.sort(function (a, b) { return a - b; });
  var minY = years[0], maxY = years[years.length - 1];

  function eraIndex(y) {
    for (var i = 0; i < ERAS.length; i++) if (y >= ERAS[i].from && y <= ERAS[i].to) return i;
    return 0;
  }
  function eraColor(y) { return ERA_COLORS[eraIndex(y) % ERA_COLORS.length]; }

  // ---------- фильтрация ----------
  function activeThemes() { return Object.keys(state.themes).filter(function (k) { return state.themes[k]; }); }
  function matches(e) {
    var th = activeThemes();
    if (th.length && !th.some(function (t) { return e.tags.indexOf(t) >= 0; })) return false;
    if (state.place && e.places.indexOf(state.place) < 0) return false;
    if (state.q && e.text.toLowerCase().indexOf(state.q) < 0 && String(e.year).indexOf(state.q) < 0) return false;
    return true;
  }
  function filtering() { return !!(state.q || state.place || activeThemes().length); }

  function highlight(node, text) {
    if (!state.q) { node.textContent = text; return; }
    var low = text.toLowerCase(), i = 0, k;
    while ((k = low.indexOf(state.q, i)) >= 0) {
      node.appendChild(document.createTextNode(text.slice(i, k)));
      var m = el("mark", null, text.slice(k, k + state.q.length));
      node.appendChild(m);
      i = k + state.q.length;
    }
    node.appendChild(document.createTextNode(text.slice(i)));
  }

  // ---------- карточка события ----------
  function card(e, isLead) {
    var c = el("article", "card" + (isLead ? " lead-card" : ""));
    c.id = "e" + e.id;
    if (isLead) c.appendChild(el("span", "badge", "Главное за год"));
    var p = el("p");
    var long = e.text.length > LONG && !state.q;
    var open = state.expanded[e.id];
    if (long && !open) {
      highlight(p, e.text.slice(0, LONG).replace(/\s+\S*$/, "") + "…");
    } else {
      highlight(p, e.text);
    }
    c.appendChild(p);
    if (long) {
      var b = el("button", "more-text", open ? "Свернуть" : "Читать полностью");
      b.type = "button";
      b.addEventListener("click", function () { state.expanded[e.id] = !open; render(); });
      c.appendChild(b);
    }
    if (e.rewrite) c.appendChild(el("p", "src note", "Формулировка уточнена редактором: " + e.rewrite));
    if (e.annotation) {   // уточнение к записи из хронологии автора
      var an = el("p", "src annot");
      an.appendChild(el("b", null, "Уточнение по документам: "));
      an.appendChild(document.createTextNode(e.annotation.note));
      c.appendChild(an);
      c.appendChild(el("p", "src note", "Источник: " + e.annotation.source + "."));
    }
    if (e.source) {   // записи, добавленные из документов: показываем источник и примечание
      var src = el("p", "src");
      src.appendChild(el("b", null, (e.sourceKind === "воспоминание" ? "Воспоминания · " : "По документам · ")));
      src.appendChild(document.createTextNode("Источник: " + e.source + "."));
      c.appendChild(src);
      if (e.note) c.appendChild(el("p", "src note", "Примечание: " + e.note));
    }
    if (e.tags.length || e.places.length) {
      var meta = el("div", "meta");
      e.tags.forEach(function (t) {
        var tg = el("button", "tag", THEMES[t]);
        tg.type = "button";
        tg.title = "Показать только эту тему";
        tg.addEventListener("click", function () { state.themes = {}; state.themes[t] = true; syncChips(); render(); scrollToTimeline(); });
        meta.appendChild(tg);
      });
      e.places.forEach(function (pl) {
        var tg = el("button", "tag place", pl);
        tg.type = "button";
        tg.title = "Показать события этого места";
        tg.addEventListener("click", function () { state.place = pl; render(); scrollToTimeline(); });
        meta.appendChild(tg);
      });
      c.appendChild(meta);
    }
    var foot = el("div", "cardfoot");   // постоянная ссылка на запись (страница года) и кнопка поправки
    var pl = el("a", "permalink", "№ " + e.id);
    pl.href = e.year + ".html#e" + e.id; pl.title = "Постоянная ссылка на запись";
    foot.appendChild(pl);
    var rb = window.NK.report && window.NK.report({ label: "Запись № " + e.id, hint: e.year + " год", text: e.text, path: e.year + ".html#e" + e.id });
    if (rb) foot.appendChild(rb);
    c.appendChild(foot);
    return c;
  }

  // ---------- отрисовка ленты ----------
  function render() {
    var root = $("timeline");
    root.textContent = "";
    var total = 0, shownYears = 0;
    var lastEra = -1;

    years.forEach(function (y) {
      var list = byYear[y].filter(matches);
      if (!list.length) return;
      total += list.length; shownYears++;
      var ei = eraIndex(y);
      var color = ERA_COLORS[ei % ERA_COLORS.length];

      if (ei !== lastEra) {
        lastEra = ei;
        var er = ERAS[ei];
        var h = el("header", "era-head");
        h.id = "era" + ei;
        h.style.setProperty("--era-c", color);
        h.appendChild(el("span", "range", er.from + " — " + er.to));
        h.appendChild(el("h2", null, er.name));
        h.appendChild(el("p", null, er.subtitle));
        Object.keys(CHAPTERS).forEach(function (k) {
          var ch = CHAPTERS[k];
          if (ch.from <= er.to && ch.to >= er.from) {   // глава может охватывать несколько эпох
            var a = el("a", "chapter-link", "Открыть главу: «" + ch.title + "» →");
            a.href = "chapter.html?c=" + k;
            h.appendChild(a);
          }
        });
        root.appendChild(h);
      }

      var sec = el("section", "year");
      sec.id = "y" + y;
      sec.style.setProperty("--era-c", color);
      var num = el("div", "year-num", String(y));
      num.appendChild(el("span", "year-count", list.length + " " + plural(list.length, "запись", "записи", "записей")));
      var yl = el("a", "year-link", "страница года →");
      yl.href = y + ".html"; yl.title = "Отдельная страница года с постоянным адресом";
      num.appendChild(yl);
      sec.appendChild(num);

      var body = el("div", "year-body");
      var figs = figsByYear[y];
      if (figs && !filtering()) {
        body.appendChild(el("p", "figs-title", "В цифрах"));
        var grid = el("div", "figs");
        figs.forEach(function (f) {
          var d = el("div", "fig");
          d.appendChild(el("span", "big", f.big));
          d.appendChild(el("span", "lab", f.label));
          var sc = f.src ? "Источник: " + f.src : (f.scope ? "Территория: " + f.scope : "");
          if (sc) d.appendChild(el("span", "sc", sc));
          if (f.id) { var g = el("a", "go"); g.href = "#e" + f.id; g.setAttribute("aria-label", "Показать запись в летописи"); g.addEventListener("click", function (ev) { ev.preventDefault(); goEvent(f.id); }); d.appendChild(g); }
          grid.appendChild(d);
        });
        body.appendChild(grid);
      }
      var lead = list.filter(function (e) { return e.lead; })[0];
      var rest = list.filter(function (e) { return e !== lead; });
      // в режиме фильтра показываем всё найденное подряд
      if (lead && !filtering()) body.appendChild(card(lead, true));
      else if (lead) rest.unshift(lead);

      var limit = filtering() || state.expanded["y" + y] ? rest.length : SHOW_FIRST;
      rest.slice(0, limit).forEach(function (e) { body.appendChild(card(e, false)); });
      if (rest.length > limit) {
        var more = el("button", "show-more", "Ещё " + (rest.length - limit) + " " + plural(rest.length - limit, "событие", "события", "событий") + " за " + y + " год");
        more.type = "button";
        more.addEventListener("click", function () { state.expanded["y" + y] = true; render(); keepView("y" + y); });
        body.appendChild(more);
      }
      sec.appendChild(body);
      root.appendChild(sec);
    });

    if (!total) root.appendChild(el("div", "empty", "Ничего не найдено. Попробуйте другое слово или сбросьте фильтры."));

    var rl = $("resultLine");
    rl.textContent = "";
    if (filtering()) {
      rl.appendChild(document.createTextNode("Найдено: " + total + " " + plural(total, "запись", "записи", "записей") + " в " + shownYears + " " + plural(shownYears, "году", "годах", "годах") + ". "));
      if (state.place) rl.appendChild(document.createTextNode("Место: " + state.place + ". "));
      var reset = el("button", null, "Сбросить всё");
      reset.type = "button";
      reset.addEventListener("click", resetAll);
      rl.appendChild(reset);
    }
    paintBars();
  }

  function plural(n, a, b, c) {
    var m = n % 100, d = n % 10;
    if (m >= 11 && m <= 14) return c;
    if (d === 1) return a;
    if (d >= 2 && d <= 4) return b;
    return c;
  }
  function keepView(id) { var n = $(id); if (n) n.scrollIntoView({ block: "nearest" }); }
  function scrollToTimeline() { $("timeline").scrollIntoView({ behavior: "smooth", block: "start" }); }
  function resetAll() { state.q = ""; state.themes = {}; state.place = ""; $("q").value = ""; syncChips(); render(); }

  // ---------- панель лет ----------
  var barNodes = {};
  function buildRail() {
    var bars = $("bars"), max = 0;
    years.forEach(function (y) { max = Math.max(max, byYear[y].length); });
    for (var y = minY; y <= maxY; y++) {
      var n = (byYear[y] || []).length;
      var b = el("button", "bar");
      b.type = "button";
      b.style.height = Math.max(6, Math.round(n / max * 100)) + "%";
      b.style.setProperty("--era-c", eraColor(y));
      b.setAttribute("aria-label", y + " год, записей: " + n);
      b.appendChild(el("span", "tip", y + " · " + n));
      (function (year) {
        b.addEventListener("click", function () { goYear(year); });
      })(y);
      if (!n) b.disabled = true;
      bars.appendChild(b);
      barNodes[y] = b;
    }
    var eras = $("eras"), total = maxY - minY + 1;
    ERAS.forEach(function (er, i) {
      var b = el("button", "era-btn", er.name);
      b.type = "button";
      b.style.setProperty("--era-c", ERA_COLORS[i % ERA_COLORS.length]);
      b.style.flex = ((Math.min(er.to, maxY) - Math.max(er.from, minY) + 1) / total) + " 1 0";
      b.title = er.from + "–" + er.to + ": " + er.subtitle;
      b.addEventListener("click", function () {
        var n = $("era" + i) || $("y" + er.from); if (n) n.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      eras.appendChild(b);
    });
  }
  function paintBars() {
    for (var y in barNodes) {
      var has = (byYear[y] || []).some(matches);
      barNodes[y].classList.toggle("dim", filtering() && !has);
      barNodes[y].classList.toggle("on", !filtering() || has);
      if (!byYear[y]) continue;
      barNodes[y].disabled = filtering() && !has;
    }
  }
  function goEvent(id) {
    var e = EVENTS.filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    if (filtering()) { resetAll(); }
    var rest = byYear[e.year].filter(function (x) { return !x.lead; });
    if (rest.indexOf(e) >= SHOW_FIRST) { state.expanded["y" + e.year] = true; render(); }
    var n = $("e" + id);
    if (n) { n.scrollIntoView({ behavior: "smooth", block: "center" }); n.classList.add("flash"); setTimeout(function () { n.classList.remove("flash"); }, 1700); history.replaceState(null, "", "#e" + id); }
  }
  function goYear(y) {
    var n = $("y" + y);
    if (!n && filtering()) { resetAll(); n = $("y" + y); }
    if (n) { n.scrollIntoView({ behavior: "smooth", block: "start" }); history.replaceState(null, "", "#" + y); }
  }

  // ---------- чипы тем ----------
  var chipNodes = {};
  function buildChips() {
    var counts = {};
    EVENTS.forEach(function (e) { e.tags.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    var box = $("themeChips");
    Object.keys(THEMES).sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0); }).forEach(function (k) {
      var c = el("button", "chip", THEMES[k]);
      c.type = "button";
      c.setAttribute("aria-pressed", "false");
      c.appendChild(el("small", null, String(counts[k] || 0)));
      c.addEventListener("click", function () { state.themes[k] = !state.themes[k]; syncChips(); render(); });
      box.appendChild(c);
      chipNodes[k] = c;
    });
  }
  function syncChips() {
    for (var k in chipNodes) chipNodes[k].setAttribute("aria-pressed", state.themes[k] ? "true" : "false");
  }

  // ---------- события интерфейса ----------
  var timer;
  $("q").addEventListener("input", function (ev) {
    clearTimeout(timer);
    var v = ev.target.value.trim().toLowerCase();
    timer = setTimeout(function () { state.q = v; render(); }, 180);
  });
  $("randomBtn").addEventListener("click", function () {
    resetAll();
    var e = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    var rest = byYear[e.year].filter(function (x) { return !x.lead; });
    if (rest.indexOf(e) >= SHOW_FIRST) { state.expanded["y" + e.year] = true; render(); }
    var n = $("e" + e.id);
    if (n) { n.scrollIntoView({ behavior: "smooth", block: "center" }); n.classList.add("flash"); setTimeout(function () { n.classList.remove("flash"); }, 1700); }
  });

  // ---------- старт ----------
  $("stats").textContent = EVENTS.length + " " + plural(EVENTS.length, "событие", "события", "событий") + " · " + years.length + " " + plural(years.length, "год", "года", "лет") + " · " + Object.keys(THEMES).length + " тем";
  var fb = $("feedback");
  if (fb && window.SITE && window.SITE.contact) {   // блок обратной связи показываем, только если автор указал контакт
    fb.hidden = false; fb.appendChild(document.createTextNode("Нашли неточность или можете дополнить запись? "));
    var fa = el("a", null, window.SITE.contactLabel || "Напишите автору"); fa.href = window.SITE.contact; fb.appendChild(fa);
  }
  buildRail(); buildChips(); render();
  function setRailH() { document.documentElement.style.setProperty("--rail-h", $("rail").getBoundingClientRect().height + "px"); }
  setRailH(); window.addEventListener("resize", setRailH);
  // переход по ссылке #1942 / #e123 при открытии страницы: без плавной прокрутки, после загрузки шрифтов
  var h = location.hash.slice(1);
  function jumpOnLoad() {
    var de = document.documentElement;
    de.style.scrollBehavior = "auto";
    if (/^e\d+$/.test(h)) goEvent(parseInt(h.slice(1), 10));
    else if (parseInt(h, 10) >= minY && parseInt(h, 10) <= maxY) goYear(parseInt(h, 10));
    setTimeout(function () { de.style.scrollBehavior = ""; }, 50);
  }
  if (/^e\d+$/.test(h) || (parseInt(h, 10) >= minY && parseInt(h, 10) <= maxY)) {
    var go = function () { setTimeout(jumpOnLoad, 30); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else window.addEventListener("load", go);
  }
})();
