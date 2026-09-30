/* Страница «Улицы говорят»: карточки улиц из data/streets.js, поиск, список «Ищем историю названий». */
(function () {
  "use strict";
  var NK = window.NK, el = NK.el;
  var D = window.STREETS, MEM = window.MEMORIALS || [], EV = NK.eventById();
  var memById = {};
  MEM.forEach(function (m) { memById[m.id] = m; });
  var $ = function (id) { return document.getElementById(id); };
  var HEAD = { "Город": "В городе", "Красное": "Село Красное", "Маго (Овсяное Поле)": "Посёлок Маго, микрорайон Овсяное Поле" };

  function link(text, href) { var a = el("a", null, text); a.href = href; return a; }

  function card(it) {
    var c = el("article", "icard");
    c.id = it.id;
    c.dataset.text = (it.name + " " + it.was + " " + it.when + " " + it.why).toLowerCase();
    c.appendChild(el("h3", null, it.name));
    if (it.when) c.appendChild(el("div", "when", it.when));
    if (it.was) c.appendChild(el("p", "was", "Раньше: " + it.was));
    c.appendChild(el("p", null, it.why));
    c.appendChild(el("p", "src", "Источник: " + it.source + "."));

    var links = el("div", "links");
    if (it.street.length) {
      links.appendChild(link("На карте →", "map.html#s=" + it.street.map(encodeURIComponent).join("|") + "&t=" + encodeURIComponent(it.name)));
    }
    it.memorials.forEach(function (id) {
      var m = memById[id]; if (!m) return;
      links.appendChild(link((m.kind === "доска" ? "Мемориальная доска" : m.kind === "памятник" ? "Памятник" : "Памятный знак") + ": " + m.opened + " →", "memorials.html#" + id));
    });
    it.events.forEach(function (id) {
      var e = EV[id]; if (!e) return;
      links.appendChild(link("Запись " + e.year + " года: «" + NK.shorten(e.text, 44) + "» →", "index.html#e" + id));
    });
    if (links.childNodes.length) c.appendChild(links);

    var rb = NK.report({ label: "Улица: " + it.name, hint: it.when, text: it.why, path: "streets.html#" + it.id });
    if (rb) c.appendChild(rb);
    return c;
  }

  var order = [], byPlace = {};
  D.items.forEach(function (it) {
    if (!byPlace[it.place]) { byPlace[it.place] = []; order.push(it.place); }
    byPlace[it.place].push(it);
  });

  function render(q) {
    q = (q || "").trim().toLowerCase();
    var box = $("groups"), shown = 0;
    box.textContent = "";
    order.forEach(function (pl) {
      var list = byPlace[pl].filter(function (it) { return !q || (it.name + " " + it.was + " " + it.when + " " + it.why).toLowerCase().indexOf(q) >= 0; });
      if (!list.length) return;
      shown += list.length;
      var h = el("h2", null, HEAD[pl] || pl);
      h.style.margin = "26px 0 12px";
      box.appendChild(h);
      var grid = el("div", "itemgrid");
      list.forEach(function (it) { grid.appendChild(card(it)); });
      box.appendChild(grid);
    });
    var wanted = D.wanted.filter(function (n) { return !q || n.toLowerCase().indexOf(q) >= 0; });
    renderWanted(wanted);
    $("cnt").textContent = q
      ? "Найдено: " + shown + " " + NK.plural(shown, "улица с историей названия", "улицы с историей названия", "улиц с историей названия") + ", в списке «ищем»: " + wanted.length
      : "С историей названия: " + D.items.length + " " + NK.plural(D.items.length, "улица", "улицы", "улиц") + ". Ещё " + D.wanted.length + " улиц с карты ждут своей истории.";
    if (q && !shown && !wanted.length) box.appendChild(el("div", "empty", "Ничего не найдено. Попробуйте другое слово."));
  }

  function renderWanted(list) {
    var chips = $("wantChips");
    chips.textContent = "";
    $("wantN").textContent = "· " + list.length;
    list.forEach(function (n) {
      var b = el("button", "chip", n);
      b.type = "button";
      b.title = "Рассказать, что известно об этой улице";
      b.addEventListener("click", function () {
        NK.reportSend({ label: "Улица: " + n, hint: "", text: "", path: "streets.html",
          prompt: "Что я знаю об этой улице (в честь кого названа, как называлась раньше, когда переименована):" }, $("wantMsg"));
      });
      chips.appendChild(b);
    });
  }

  $("q").addEventListener("input", function (e) { render(e.target.value); });
  render("");
  // без контакта автора (data/site.js) кнопка не работает: прячем подсказку
  if (!(window.SITE && window.SITE.contact)) $("want").hidden = true;

  // переход по ссылке streets.html#s05
  var h = location.hash.slice(1), n = h && $(h);
  if (n && n.classList.contains("icard")) {
    var go = function () { n.scrollIntoView({ block: "center" }); n.classList.add("flash"); setTimeout(function () { n.classList.remove("flash"); }, 1700); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(go, 30); }); else window.addEventListener("load", go);
  }
})();
