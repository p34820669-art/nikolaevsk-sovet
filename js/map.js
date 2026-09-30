(function () {
  "use strict";
  var NK = window.NK, el = NK.el;
  var D = window.MAP_DATA, EV = NK.eventById();
  var side = document.getElementById("side");
  var STREET = "#8b98a3", HL = "#b3392e", HL_ON = "#e0a020", POI = "#25709b";

  if (!window.L) {
    side.appendChild(el("h1", null, "Карта"));
    side.appendChild(el("p", "muted", "Не удалось загрузить библиотеку карты (нужен интернет)."));
    return;
  }

  var map = L.map("map", { zoomControl: true, minZoom: 9, maxZoom: 18 }).setView(D.center, 14);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "Карта © участники <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
  }).addTo(map);

  var layers = [];   // {kind, item, layer}
  var active = null;

  // ---------- улицы ----------
  D.streets.forEach(function (s) {
    var hl = !!s.hl;
    var poly = L.polyline(s.lines, { color: hl ? HL : STREET, weight: hl ? 4 : 2.5, opacity: hl ? .8 : .5, lineCap: "round" }).addTo(map);
    poly.bindTooltip(s.name, { sticky: true });
    poly.on("click", function () { select("street", s, poly); });
    poly.on("mouseover", function () { if (active !== poly) poly.setStyle({ weight: hl ? 6 : 5, opacity: 1 }); });
    poly.on("mouseout", function () { if (active !== poly) poly.setStyle({ weight: hl ? 4 : 2.5, opacity: hl ? .8 : .5 }); });
    layers.push({ kind: "street", item: s, layer: poly });
  });

  // ---------- объекты ----------
  D.pois.forEach(function (p) {
    var m = L.circleMarker([p.lat, p.lon], { radius: 9, color: "#fff", weight: 2, fillColor: POI, fillOpacity: 1 }).addTo(map);
    m.bindTooltip(p.title, { direction: "top", offset: [0, -6] });
    m.on("click", function () { select("poi", p, m); });
    layers.push({ kind: "poi", item: p, layer: m });
  });

  // ---------- посёлки района ----------
  var SETT = "#c07a2c";
  (D.settlements || []).forEach(function (p) {
    var m = L.circleMarker([p.lat, p.lon], { radius: 8, color: "#fff", weight: 2, fillColor: SETT, fillOpacity: 1 }).addTo(map);
    m.bindTooltip(p.title, { direction: "top", offset: [0, -6] });
    m.on("click", function () { select("poi", p, m); });
    layers.push({ kind: "poi", item: p, layer: m, settlement: true });
  });

  // ---------- места памяти (data/memorials.js): точки только там, где координаты известны из OSM ----------
  var MEM = window.MEMORIALS || [], MEMC = "#7d4f93";
  var KIND = { "памятник": "Памятник", "доска": "Мемориальная доска", "знак": "Знак, стела, мемориал" };
  var memGroup = L.layerGroup().addTo(map), memLayers = {};
  MEM.forEach(function (m) {
    if (m.lat == null) return;
    var mk = L.circleMarker([m.lat, m.lon], { radius: 8, color: "#fff", weight: 2, fillColor: MEMC, fillOpacity: 1 }).addTo(memGroup);
    mk.bindTooltip(m.name.length > 70 ? m.name.slice(0, 70).replace(/\s+\S*$/, "") + "…" : m.name, { direction: "top", offset: [0, -6] });
    mk.on("click", function () { selectMem(m); });
    memLayers[m.id] = mk;
  });

  function resetStyles() {
    layers.forEach(function (l) {
      if (l.kind === "street") l.layer.setStyle({ color: l.item.hl ? HL : STREET, weight: l.item.hl ? 4 : 2.5, opacity: l.item.hl ? .8 : .5 });
      else l.layer.setStyle({ fillColor: l.settlement ? SETT : POI, radius: l.settlement ? 8 : 9 });
    });
    Object.keys(memLayers).forEach(function (id) { memLayers[id].setStyle({ fillColor: MEMC, radius: 8 }); });
  }

  function evBlock(ids) {
    var box = el("div");
    if (!ids.length) {
      box.appendChild(el("p", "muted", "В хронологии пока нет записей, где это место названо прямо. Воспоминания и документы можно добавить."));
      return box;
    }
    box.appendChild(el("p", "muted", "Упоминания в хронологии: " + ids.length));
    ids.slice(0, 12).forEach(function (id) {
      var e = EV[id]; if (!e) return;
      var d = el("div", "ev");
      var a = el("a"); a.href = "index.html#e" + id;
      a.appendChild(el("b", null, e.year + " "));
      a.appendChild(document.createTextNode(e.text.length > 150 ? e.text.slice(0, 150).replace(/\s+\S*$/, "") + "…" : e.text));
      d.appendChild(a);
      box.appendChild(d);
    });
    if (ids.length > 12) box.appendChild(el("p", "muted", "…и ещё " + (ids.length - 12) + " записей — в общей летописи."));
    return box;
  }

  function panel(kind, item) {
    side.textContent = "";
    var back = el("button", "back", "← Все места"); back.type = "button";
    back.addEventListener("click", function () { active = null; resetStyles(); home(); });
    side.appendChild(back);
    side.appendChild(el("h2", null, item.title || item.name));
    if (kind === "poi" && item.text) side.appendChild(el("p", null, item.text));
    if (item.note) side.appendChild(el("p", "muted", item.note));
    side.appendChild(evBlock(item.events || []));
    if (kind === "poi") {
      var here = MEM.filter(function (m) { return m.poi === item.title; });
      if (here.length) {
        side.appendChild(el("h2", null, "Места памяти здесь"));
        var hl = el("div", "place-list");
        here.forEach(function (m) {
          var b = el("button", "pl", m.name); b.type = "button";
          b.appendChild(el("small", null, m.opened));
          b.addEventListener("click", function () { selectMem(m); });
          hl.appendChild(b);
        });
        side.appendChild(hl);
      }
    }
    if (item.archive) {
      side.appendChild(el("div", "photonote", "📷 В архиве проекта для этого места — фото: " + item.archive + ". Они появятся здесь после согласования прав."));
    }
    var w = el("p", "legend-map", "Названия улиц — по современной карте OpenStreetMap; переименования отмечаем по мере проверки.");
    side.appendChild(w);
    side.scrollTop = 0;
  }

  function select(kind, item, layer) {
    resetStyles();
    if (window.NKG) window.NKG.once("map:" + (item.name || item.title), 3, "Место на карте", "map:open");
    active = layer;
    if (kind === "street") layer.setStyle({ color: HL_ON, weight: 8, opacity: 1 });
    else layer.setStyle({ fillColor: HL_ON, radius: 12 });
    if (layer.bringToFront) layer.bringToFront();
    panel(kind, item);
    if (kind === "poi") { if (map.getZoom() < 12) map.setView([item.lat, item.lon], 13); else map.panTo([item.lat, item.lon]); }
    else map.fitBounds(layer.getBounds(), { maxZoom: 16, padding: [60, 60] });
  }

  // ---------- место памяти: панель и выделение ----------
  function memPanel(m) {
    side.textContent = "";
    var back = el("button", "back", "← Все места"); back.type = "button";
    back.addEventListener("click", function () { active = null; resetStyles(); history.replaceState(null, "", "map.html"); home(); });
    side.appendChild(back);
    side.appendChild(el("h2", null, m.name));
    side.appendChild(el("p", "muted", KIND[m.kind] + " · " + m.opened));
    side.appendChild(el("p", null, "Где: " + m.place));
    if (m.about) side.appendChild(el("p", null, m.about));
    if (m.author) side.appendChild(el("p", "muted", "Автор: " + m.author));
    if (m.fate) side.appendChild(el("p", "muted", m.fate));
    if (m.note) side.appendChild(el("p", "muted", "Примечание: " + m.note));
    side.appendChild(el("p", "legend-map", m.pinNote || "Место на карте пока не определено: в источнике нет точного адреса."));
    side.appendChild(el("p", "muted", "Источник: " + m.source + "."));
    var a = el("a", null, "Карточка в разделе «Места памяти» →"); a.href = "memorials.html#" + m.id;
    side.appendChild(a);
    if (m.events.length) side.appendChild(evBlock(m.events));
    var rb = NK.report && NK.report({ label: "Место памяти: " + m.name, hint: m.opened, text: m.about || m.place, path: "memorials.html#" + m.id });
    if (rb) side.appendChild(rb);
    side.scrollTop = 0;
  }

  function selectMem(m) {
    resetStyles(); active = null;
    if (window.NKG) window.NKG.once("map:mem:" + m.id, 3, "Место памяти на карте", "map:open");
    var mk = memLayers[m.id], target = null;
    if (mk) {
      mk.setStyle({ fillColor: HL_ON, radius: 12 }); mk.bringToFront();
      map.setView([m.lat, m.lon], Math.max(map.getZoom(), 16));
    } else if (m.poi) {
      target = layers.filter(function (l) { return l.kind === "poi" && l.item.title === m.poi; })[0];
      if (target) {
        target.layer.setStyle({ fillColor: HL_ON, radius: 12 }); target.layer.bringToFront();
        map.setView([target.item.lat, target.item.lon], target.settlement ? 13 : 16);
      }
    } else if (m.street.length) {
      var sel = layers.filter(function (l) { return l.kind === "street" && m.street.indexOf(l.item.name) >= 0; });
      if (sel.length) {
        sel.forEach(function (l) { l.layer.setStyle({ color: HL_ON, weight: 7, opacity: 1 }); l.layer.bringToFront(); });
        map.fitBounds(L.featureGroup(sel.map(function (l) { return l.layer; })).getBounds(), { padding: [50, 50], maxZoom: 16 });
      }
    }
    memPanel(m);
    history.replaceState(null, "", "#m=" + m.id);
  }

  function home() {
    side.textContent = "";
    side.appendChild(el("h1", null, "Карта города"));
    side.appendChild(el("p", "muted", "Нажмите на улицу или на синюю точку. Красным выделены улицы, для которых в проекте есть записи или фотоархив."));
    var all = el("button", "btn", "🌍 Показать весь район"); all.type = "button"; all.style.marginBottom = "12px";
    all.addEventListener("click", function () {
      var pts = (D.settlements || []).map(function (p) { return [p.lat, p.lon]; }).concat([D.center]);
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
    });
    side.appendChild(all);
    if (MEM.length) {
      var tg = el("label", "muted"); tg.style.cssText = "display:flex;gap:8px;align-items:center;margin:0 0 12px";
      var cb = el("input"); cb.type = "checkbox"; cb.checked = map.hasLayer(memGroup);
      cb.addEventListener("change", function () { if (cb.checked) memGroup.addTo(map); else map.removeLayer(memGroup); });
      tg.appendChild(cb); tg.appendChild(document.createTextNode("Показывать места памяти (фиолетовые точки)"));
      side.appendChild(tg);
    }
    side.appendChild(el("h2", null, "Места"));
    var list = el("div", "place-list");
    D.pois.slice().sort(function (a, b) { return (b.events.length) - (a.events.length); }).forEach(function (p) {
      var b = el("button", "pl", p.title); b.type = "button";
      b.appendChild(el("small", null, p.events.length ? p.events.length + " зап." : ""));
      b.addEventListener("click", function () { var l = layers.filter(function (x) { return x.item === p; })[0]; select("poi", p, l.layer); });
      list.appendChild(b);
    });
    side.appendChild(list);
    if ((D.settlements || []).length) {
      side.appendChild(el("h2", null, "Посёлки района"));
      var stl = el("div", "place-list");
      D.settlements.slice().sort(function (a, b) { return b.events.length - a.events.length; }).forEach(function (p) {
        var b = el("button", "pl", p.title); b.type = "button";
        b.appendChild(el("small", null, p.events.length ? p.events.length + " зап." : ""));
        b.addEventListener("click", function () { var l = layers.filter(function (x) { return x.item === p; })[0]; select("poi", p, l.layer); });
        stl.appendChild(b);
      });
      side.appendChild(stl);
    }
    if (MEM.length) {
      var dt = el("details"); dt.style.margin = "14px 0";
      var sm = el("summary", null, "Места памяти: " + MEM.length); sm.style.cssText = "cursor:pointer;font:700 22px/1.2 var(--serif)";
      dt.appendChild(sm);
      var ml = el("div", "place-list");
      MEM.slice().sort(function (a, b) { return (a.year || 9999) - (b.year || 9999); }).forEach(function (m) {
        var b = el("button", "pl", m.name); b.type = "button";
        b.appendChild(el("small", null, m.year ? String(m.year) : ""));
        b.addEventListener("click", function () { selectMem(m); });
        ml.appendChild(b);
      });
      dt.appendChild(ml); side.appendChild(dt);
    }
    side.appendChild(el("h2", null, "Улицы"));
    var sl = el("div", "place-list");
    D.streets.filter(function (s) { return s.hl; }).sort(function (a, b) { return (b.events.length + b.archive / 10) - (a.events.length + a.archive / 10); }).forEach(function (s) {
      var b = el("button", "pl", s.name); b.type = "button";
      b.appendChild(el("small", null, s.events.length ? s.events.length + " зап." : "фото"));
      b.addEventListener("click", function () { var l = layers.filter(function (x) { return x.item === s; })[0]; select("street", s, l.layer); });
      sl.appendChild(b);
    });
    side.appendChild(sl);
    side.appendChild(el("p", "legend-map", "Оранжевые точки — посёлки района, синие — места в городе, фиолетовые — места памяти. Многовершинный и часть других посёлков ещё не нанесены."));
  }
  home();

  // ---------- ссылка из главы: map.html#s=улица|улица&p=посёлок|объект&t=Заголовок ----------
  function fromHash() {
    var mm = /^#m=([\w-]+)$/.exec(location.hash);   // map.html#m=m15 — место памяти из раздела «Места памяти»
    if (mm) {
      var mem = MEM.filter(function (x) { return x.id === mm[1]; })[0];
      if (mem) { selectMem(mem); return; }
    }
    if (!/^#(s|p)=/.test(location.hash)) return;
    var params = {};
    location.hash.slice(1).split("&").forEach(function (kv) {
      var k = kv.split("=")[0], v = kv.slice(k.length + 1);
      params[k] = v;
    });
    var dec = function (x) { return x ? x.split("|").map(decodeURIComponent) : []; };
    var streetNames = dec(params.s), placeNames = dec(params.p);
    var title = params.t ? decodeURIComponent(params.t) : "Выбранные места";
    var sel = layers.filter(function (l) {
      return (l.kind === "street" && streetNames.indexOf(l.item.name) >= 0) ||
             (l.kind === "poi" && placeNames.indexOf(l.item.title) >= 0);
    });
    if (!sel.length) return;
    resetStyles(); active = null;
    sel.forEach(function (l) {
      if (l.kind === "street") l.layer.setStyle({ color: HL_ON, weight: 7, opacity: 1 });
      else l.layer.setStyle({ fillColor: HL_ON, radius: 12 });
      l.layer.bringToFront();
    });
    var bounds = L.featureGroup(sel.map(function (l) { return l.layer; })).getBounds();
    if (sel.length === 1 && sel[0].kind === "poi") map.setView([sel[0].item.lat, sel[0].item.lon], 13);
    else map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    side.textContent = "";
    var back = el("button", "back", "← Вся карта"); back.type = "button";
    back.addEventListener("click", function () { resetStyles(); history.replaceState(null, "", "map.html"); home(); });
    side.appendChild(back);
    side.appendChild(el("h2", null, title));
    side.appendChild(el("p", "muted", "Выделено: " + sel.length + ". Нажмите на название, чтобы посмотреть записи хронологии."));
    var list = el("div", "place-list");
    sel.forEach(function (l) {
      var b = el("button", "pl", l.item.name || l.item.title); b.type = "button";
      b.addEventListener("click", function () { select(l.kind, l.item, l.layer); });
      list.appendChild(b);
    });
    side.appendChild(list);
  }
  fromHash();

  // выровнять размер после отрисовки
  setTimeout(function () { map.invalidateSize(); }, 200);
})();
