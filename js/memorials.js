/* Страница «Места памяти»: карточки из data/memorials.js, поиск и фильтр по виду. */
(function () {
  "use strict";
  var NK = window.NK, el = NK.el;
  var MEM = (window.MEMORIALS || []).slice(), EV = NK.eventById();
  var STR = (window.STREETS && window.STREETS.items) || [];
  var $ = function (id) { return document.getElementById(id); };
  var KIND = { "памятник": "Памятник", "доска": "Мемориальная доска", "знак": "Знак, стела, мемориал" };
  var CHIP = { "": "Все", "памятник": "Памятники", "доска": "Мемориальные доски", "знак": "Стелы, знаки, мемориалы" };
  var state = { q: "", kind: "" };

  MEM.sort(function (a, b) { return (a.year || 9999) - (b.year || 9999) || a.id.localeCompare(b.id); });

  function link(text, href) { var a = el("a", null, text); a.href = href; return a; }
  function hasPlace(m) { return m.lat != null || !!m.poi || m.street.length > 0; }
  function kv(label, value) {
    var p = el("p", "kv"); p.appendChild(el("b", null, label + ": ")); p.appendChild(document.createTextNode(value)); return p;
  }

  function card(m) {
    var c = el("article", "icard");
    c.id = m.id;
    c.appendChild(el("span", "kindtag", KIND[m.kind]));
    c.appendChild(el("h3", null, m.name));
    c.appendChild(el("div", "when", m.opened));
    c.appendChild(kv("Где", m.place));
    if (m.author) c.appendChild(kv("Автор", m.author));
    if (m.about) c.appendChild(el("p", null, m.about));
    if (m.fate) c.appendChild(kv("Дальше", m.fate));
    if (m.note) c.appendChild(el("p", "src note", "Примечание: " + m.note));
    c.appendChild(el("p", "src", "Источник: " + m.source + "."));
    if (m.pinNote) c.appendChild(el("p", "src note", m.pinNote));

    var links = el("div", "links");
    if (hasPlace(m)) links.appendChild(link("Показать на карте →", "map.html#m=" + m.id));
    STR.forEach(function (s) {
      if (s.memorials.indexOf(m.id) >= 0) links.appendChild(link("История названия: " + s.name + " →", "streets.html#" + s.id));
    });
    m.events.slice(0, 3).forEach(function (id) {
      var e = EV[id]; if (!e) return;
      links.appendChild(link("Запись " + e.year + " года: «" + NK.shorten(e.text, 44) + "» →", "index.html#e" + id));
    });
    if (links.childNodes.length) c.appendChild(links);

    var rb = NK.report({ label: "Место памяти: " + m.name, hint: m.opened, text: m.about || m.place, path: "memorials.html#" + m.id });
    if (rb) c.appendChild(rb);
    return c;
  }

  function matches(m) {
    if (state.kind && m.kind !== state.kind) return false;
    if (state.q) {
      var hay = (m.name + " " + m.opened + " " + m.place + " " + m.about + " " + m.author + " " + m.fate + " " + m.note).toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }

  var chipNodes = {};
  function buildChips() {
    var box = $("kindChips");
    Object.keys(CHIP).forEach(function (k) {
      var n = k ? MEM.filter(function (m) { return m.kind === k; }).length : MEM.length;
      var b = el("button", "chip", CHIP[k]);
      b.type = "button";
      b.setAttribute("aria-pressed", k === state.kind ? "true" : "false");
      b.appendChild(el("small", null, String(n)));
      b.addEventListener("click", function () { state.kind = k; syncChips(); render(); });
      box.appendChild(b);
      chipNodes[k] = b;
    });
  }
  function syncChips() { for (var k in chipNodes) chipNodes[k].setAttribute("aria-pressed", k === state.kind ? "true" : "false"); }

  function render() {
    var box = $("list"), list = MEM.filter(matches);
    box.textContent = "";
    list.forEach(function (m) { box.appendChild(card(m)); });
    var cnt = $("cnt");
    if (!list.length) { box.appendChild(el("div", "empty", "Ничего не найдено. Попробуйте другое слово или сбросьте фильтр.")); }
    cnt.textContent = (state.q || state.kind)
      ? "Найдено: " + list.length + " из " + MEM.length
      : "Всего: " + MEM.length + " " + NK.plural(MEM.length, "место памяти", "места памяти", "мест памяти") + ", от старых к новым.";
  }

  $("q").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
  buildChips();
  render();

  // переход по ссылке memorials.html#m15
  var h = location.hash.slice(1), n = h && $(h);
  if (n && n.classList.contains("icard")) {
    var go = function () { n.scrollIntoView({ block: "center" }); n.classList.add("flash"); setTimeout(function () { n.classList.remove("flash"); }, 1700); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(go, 30); }); else window.addEventListener("load", go);
  }
})();
