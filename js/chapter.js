(function () {
  "use strict";
  var NK = window.NK, el = NK.el;
  var ALL = window.CHAPTERS || {};
  var key = new URLSearchParams(location.search).get("c") || location.hash.slice(1);  // ?c=war (старые ссылки #war тоже работают)
  var C = ALL[key];
  var root = document.getElementById("chapter");
  var ERAS = window.SITE_DATA.meta.eras;
  function eraColor(from) {
    for (var i = 0; i < ERAS.length; i++) if (ERAS[i].from === from) return NK.ERA_COLORS[i];
    return NK.ERA_COLORS[0];
  }
  var ORDER = Object.keys(ALL).sort(function (a, b) { return ALL[a].from - ALL[b].from; });

  // без номера главы (или неверный номер) - показываем оглавление
  if (!C) {
    document.title = "Главы · Николаевск-на-Амуре";
    var lh = el("header", "hero"), lw = el("div", "wrap");
    lw.appendChild(el("p", "kicker", "Главы"));
    lw.appendChild(el("h1", null, "Читать по эпохам"));
    lw.appendChild(el("p", "lead", "Каждая глава — одна эпоха: цифры, графики, люди, словарь, викторина и задания для класса."));
    lh.appendChild(lw); root.appendChild(lh);
    var ls = el("section", "sec wrap");
    var g = window.NKG, got = 0;
    ORDER.forEach(function (k) { if (g && g.hasStamp(k)) got++; });
    ls.appendChild(el("p", "sec-sub", "Проходите главы по порядку: прочитайте, пройдите викторину (6 верных ответов из 8) и получите печать эпохи. Печатей: " + got + " из " + ORDER.length + "."));
    var lg = el("div", "path");
    ORDER.forEach(function (k, n) {
      var ch = ALL[k], on = g && g.hasStamp(k);
      var a = el("a", "node" + (on ? " on" : "")); a.href = "chapter.html?c=" + k;
      a.style.setProperty("--c", eraColor(ch.from));
      a.appendChild(el("span", "no", String(n + 1)));
      a.appendChild(el("span", "yrs", ch.from + "–" + ch.to));
      a.appendChild(el("strong", null, ch.title));
      a.appendChild(el("span", "d", ch.subtitle));
      var st = el("span", "st"); st.appendChild(el("i", null, on ? "✔" : "?"));
      var best = g ? g.quizBest(k) : 0;
      st.appendChild(document.createTextNode(on ? "Печать получена (" + best + " из " + ch.quiz.length + ")" : (best ? "Лучший результат: " + best + " из " + ch.quiz.length : "Печать ещё не получена")));
      a.appendChild(st);
      lg.appendChild(a);
    });
    ls.appendChild(lg);
    root.appendChild(ls);
    return;
  }
  var EV = NK.eventById();
  var ERA = eraColor(C.from);
  document.documentElement.style.setProperty("--era", ERA);
  document.title = "Глава: " + C.title + ", " + C.from + "–" + C.to + " · Николаевск-на-Амуре";

  function section(title, sub, id) {
    var s = el("section", "sec wrap");
    if (id) s.id = id;
    s.appendChild(el("h2", null, title));
    if (sub) s.appendChild(el("p", "sec-sub", sub));
    root.appendChild(s);
    if (window.NKG && "IntersectionObserver" in window) {   // за прочитанный (показанный на экране) раздел — очки
      var seen = new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting) { seen.unobserve(x.target); setTimeout(function () { if (x.target.getBoundingClientRect().top < innerHeight) window.NKG.once("read:" + key + ":" + title, 5, "Раздел «" + title + "»", "chapter:read"); }, 1500); } });
      }, { threshold: 0.5 });
      seen.observe(s);
    }
    return s;
  }
  function chronoLink(id, txt) {
    var a = el("a", null, txt || "Запись в летописи →");
    a.href = "index.html#e" + id;
    return a;
  }

  // ---------- шапка главы ----------
  var hero = el("header", "chapter-hero");
  var hw = el("div", "wrap");
  hw.appendChild(el("p", "kicker", C.kicker));
  hw.appendChild(el("h1", null, C.title));
  hw.appendChild(el("p", "sub", C.subtitle));
  var prose = el("div", "prose");
  C.intro.forEach(function (t) { prose.appendChild(el("p", null, t)); });
  hw.appendChild(prose);
  var jump = el("div", "hero-actions");
  [["#cifry", "В цифрах"], ["#hod", "Как это было"], ["#lyudi", "Люди"], ["#quiz", "Проверь себя"]].forEach(function (l) {
    var a = el("a", "btn", l[1]); a.href = l[0]; jump.appendChild(a);
  });
  hw.appendChild(jump);
  hero.appendChild(hw);
  root.appendChild(hero);

  // ---------- главное ----------
  var s1 = section("Главное за пять минут", "Если у вас всего пара минут — начните отсюда.");
  var ul = el("ol", "keys");
  C.key.forEach(function (t) { ul.appendChild(el("li", null, t)); });
  s1.appendChild(ul);

  // ---------- в цифрах ----------
  var s2 = section("Война в цифрах", "Цифры берутся из хронологии; нажмите на карточку, чтобы увидеть запись.", "cifry");
  var grid = el("div", "figs");
  (window.FIGURES || []).filter(function (f) { return f.year >= C.from && f.year <= C.to; }).forEach(function (f) {
    var d = el("div", "fig");
    d.appendChild(el("span", "big", f.big));
    d.appendChild(el("span", "lab", f.label));
    d.appendChild(el("span", "sc", f.year + (f.scope ? " · " + f.scope : "")));
    if (f.id) { var g = el("a", "go"); g.href = "index.html#e" + f.id; g.setAttribute("aria-label", "Запись в летописи"); d.appendChild(g); }
    grid.appendChild(d);
  });
  s2.appendChild(grid);

  var animate = [];
  C.compare.forEach(function (cp) {
    var box = el("div", "compare");
    box.appendChild(el("h3", null, cp.title));
    box.appendChild(el("p", "note", cp.note));
    // столбцов может быть два (a, b) или больше (items)
    var bars = cp.items || [cp.a, cp.b];
    var max = Math.max.apply(null, bars.map(function (x) { return x.value; }));
    bars.forEach(function (item, idx) {
      var row = el("div", "crow");
      row.appendChild(el("span", "cl", item.label));
      var bar = el("div", "cbar");
      var i = el("i", idx === 0 ? "" : "b"); i.dataset.w = (item.value / max * 100).toFixed(1);
      bar.appendChild(i);
      bar.appendChild(el("span", null, item.value.toLocaleString("ru-RU")));
      row.appendChild(bar);
      box.appendChild(row);
      animate.push(i);
    });
    if (cp.result) {
      box.appendChild(el("p", "note", cp.result));
    } else if (!cp.items) {
      // общий итог для двух столбцов: «Рост: в N раза» / «Уменьшение: в N раза»
      var ratioVal = cp.b.value >= cp.a.value ? cp.b.value / cp.a.value : cp.a.value / cp.b.value;
      box.appendChild(el("p", "note", (cp.b.value >= cp.a.value ? "Рост: в " : "Уменьшение: в ") + ratioVal.toFixed(1).replace(".", ",") + " раза."));
    }
    if (cp.id) { var p = el("p", "note"); p.appendChild(chronoLink(cp.id)); box.appendChild(p); }
    s2.appendChild(box);
  });

  if (C.stack) {
    var st = C.stack, total = st.parts.reduce(function (a, p) { return a + p.value; }, 0);
    var colors = [ERA, "#25709b", "#c07a2c", "#7d4f93", "#b3392e", "#5b6470", "#8a7a2a"];  // 7 разных цветов на случай длинных списков
    var box = el("div", "compare");
    box.appendChild(el("h3", null, st.title));
    var unit = st.unit || " млн";
    box.appendChild(el("p", "note", st.note + " · всего " + total.toString().replace(".", ",") + unit));
    var sb = el("div", "stackbar");
    st.parts.forEach(function (p, i) {
      var d = el("div", null, p.value.toString().replace(".", ","));
      d.style.background = colors[i]; d.dataset.w = (p.value / total * 100).toFixed(1);
      sb.appendChild(d); animate.push(d);
    });
    box.appendChild(sb);
    var lg = el("div", "legend");
    st.parts.forEach(function (p, i) {
      var s = el("span"); var sw = el("i"); sw.style.background = colors[i]; s.appendChild(sw); s.appendChild(document.createTextNode(p.label)); lg.appendChild(s);
    });
    box.appendChild(lg);
    if (st.id) { var pp = el("p", "note"); pp.style.marginTop = "10px"; pp.appendChild(chronoLink(st.id)); box.appendChild(pp); }
    s2.appendChild(box);
  }
  // анимация при появлении на экране
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.style.width = en.target.dataset.w + "%"; io.unobserve(en.target); }
    });
  }, { threshold: .4 }) : null;
  animate.forEach(function (n) { if (io) io.observe(n); else n.style.width = n.dataset.w + "%"; });

  // ---------- как это было ----------
  var s3 = section("Как это было", "Главные записи года. Полный текст открывается кнопкой; вся хронология — в общей летописи.", "hod");
  var lastY = null;
  C.timeline.forEach(function (it) {
    var e = EV[it.id]; if (!e) return;
    if (it.year !== lastY) {
      lastY = it.year;
      var cnt = C.timeline.filter(function (x) { return x.year === it.year; }).length;
      var h = el("div", "tl-year"); h.appendChild(el("b", null, String(it.year)));
      h.appendChild(el("span", null, cnt + " " + NK.plural(cnt, "событие", "события", "событий")));
      s3.appendChild(h);
    }
    var card = el("article", "tl-item");
    card.appendChild(el("h3", null, it.title));
    var p = el("p");
    var long = e.text.length > 420, open = false;
    var full = e.text, short = long ? e.text.slice(0, 420).replace(/\s+\S*$/, "") + "…" : e.text;
    p.textContent = short;
    card.appendChild(p);
    if (long) {
      var b = el("button", "more-text", "Читать полностью"); b.type = "button";
      b.addEventListener("click", function () { open = !open; p.textContent = open ? full : short; b.textContent = open ? "Свернуть" : "Читать полностью"; });
      card.appendChild(b);
    }
    var links = el("div", "links"); links.appendChild(chronoLink(it.id)); card.appendChild(links);
    s3.appendChild(card);
  });
  if (C.mapLinks && C.mapLinks.length) {
    var sm = section("На карте", "Места из этой главы можно найти на карте города.");
    C.mapLinks.forEach(function (ml) {
      var box = el("div", "compare");
      box.appendChild(el("h3", null, ml.title));
      box.appendChild(el("p", "note", ml.text));
      var a = el("a", "btn primary", "Показать на карте →");
      var q = [];
      if (ml.streets) q.push("s=" + ml.streets.map(encodeURIComponent).join("|"));
      if (ml.places) q.push("p=" + ml.places.map(encodeURIComponent).join("|"));
      q.push("t=" + encodeURIComponent(ml.title));
      a.href = "map.html#" + q.join("&");
      box.appendChild(a);
      sm.appendChild(box);
    });
  }

  // ---------- люди ----------
  var s4 = section("Люди в истории", "Имена, которые сохранила хронология.", "lyudi");
  var pg = el("div", "people");
  C.people.forEach(function (p) {
    var c = el("div", "person");
    var initials = p.name.replace(/[^А-ЯЁA-Z\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("");
    c.appendChild(el("div", "av", initials));
    c.appendChild(el("h3", null, p.name));
    c.appendChild(el("div", "role", p.role));
    c.appendChild(el("p", null, p.text));
    if (p.id) { var a = chronoLink(p.id, "Запись в летописи →"); c.appendChild(a); }
    pg.appendChild(c);
  });
  s4.appendChild(pg);

  // ---------- слова эпохи ----------
  var s5 = section("Слова эпохи", "Что означают слова, которые встретятся в записях.");
  C.glossary.forEach(function (g) {
    var d = el("details", "gl"); d.appendChild(el("summary", null, g[0])); d.appendChild(el("p", null, g[1])); s5.appendChild(d);
  });

  // ---------- викторина ----------
  var s6 = section("Проверь себя", C.quiz.length + " " + NK.plural(C.quiz.length, "вопрос", "вопроса", "вопросов") + " по главе. После каждого — пояснение и ссылка на запись.", "quiz");
  var qz = el("div", "quiz");
  s6.appendChild(qz);
  var qi = 0, score = 0;
  function shuffleOpts(q) {
    // порядок вариантов перемешиваем, запоминая верный
    var idx = q.options.map(function (_, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    return idx;
  }
  function renderQ() {
    qz.textContent = "";
    if (qi >= C.quiz.length) {
      if (window.NKG) window.NKG.quizDone(key, score, C.quiz.length);
      qz.appendChild(el("div", "qtop", "Результат"));
      qz.appendChild(el("div", "score", score + " из " + C.quiz.length));
      var msg = score >= C.quiz.length - 1 ? "Отлично! Вы хорошо знаете историю этого периода." : score >= Math.ceil(C.quiz.length / 2) ? "Неплохо! Загляните в записи с пояснениями и попробуйте ещё раз." : "Это только начало — прочитайте главу и попробуйте снова.";
      qz.appendChild(el("p", null, msg));
      var acts = el("div", "actions");
      var again = el("button", "btn primary", "Пройти ещё раз"); again.type = "button"; again.addEventListener("click", function () { qi = 0; score = 0; renderQ(); });
      var game = el("a", "btn", "Сыграть в «Угадай год»"); game.href = "play.html";
      acts.appendChild(again); acts.appendChild(game); qz.appendChild(acts);
      return;
    }
    var q = C.quiz[qi], order = shuffleOpts(q);
    var top = el("div", "qtop"); top.appendChild(el("span", null, "Вопрос " + (qi + 1) + " из " + C.quiz.length)); top.appendChild(el("span", null, "Очки: " + score));
    qz.appendChild(top);
    qz.appendChild(el("p", "q", q.q));
    var box = el("div", "opts"); qz.appendChild(box);
    var btns = [];
    order.forEach(function (oi) {
      var b = el("button", "opt", q.options[oi]); b.type = "button";
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.disabled = true; });
        var ok = oi === q.a;
        if (ok) { score++; b.classList.add("right"); } else { b.classList.add("wrong"); btns.forEach(function (x, k) { if (order[k] === q.a) x.classList.add("right"); }); }
        var why = el("div", "why"); why.appendChild(el("b", null, ok ? "Верно! " : "Не совсем. ")); why.appendChild(document.createTextNode(q.why + " "));
        if (q.id) why.appendChild(chronoLink(q.id));
        qz.appendChild(why);
        var nx = el("button", "btn primary qnext", qi + 1 >= C.quiz.length ? "Показать результат" : "Дальше →"); nx.type = "button";
        nx.addEventListener("click", function () { qi++; renderQ(); qz.scrollIntoView({ block: "nearest" }); });
        qz.appendChild(nx); nx.focus();
      });
      btns.push(b); box.appendChild(b);
    });
  }
  renderQ();

  // ---------- для класса ----------
  var s7 = section("Для класса", "Вопросы для обсуждения и работы с источником — можно использовать на уроке.");
  var tl = el("ol", "tasks");
  C.tasks.forEach(function (t) { tl.appendChild(el("li", null, t)); });
  s7.appendChild(tl);

  // ---------- источники ----------
  var s8 = section("Источники и проверка");
  var sb2 = el("div", "srcbox");
  sb2.appendChild(el("span", null, "Как мы работаем с данными:"));
  var su = el("ul");
  C.sources.forEach(function (t) { su.appendChild(el("li", null, t)); });
  sb2.appendChild(su);
  s8.appendChild(sb2);
  var pos = ORDER.indexOf(key), nav2 = el("div", "actions"); nav2.style.margin = "26px 0 40px";
  if (pos > 0) { var pv = el("a", "btn", "← " + ALL[ORDER[pos - 1]].title + " (" + ALL[ORDER[pos - 1]].from + "–" + ALL[ORDER[pos - 1]].to + ")"); pv.href = "chapter.html?c=" + ORDER[pos - 1]; nav2.appendChild(pv); }
  if (pos < ORDER.length - 1) { var nx2 = el("a", "btn primary", "Дальше: " + ALL[ORDER[pos + 1]].title + " (" + ALL[ORDER[pos + 1]].from + "–" + ALL[ORDER[pos + 1]].to + ") →"); nx2.href = "chapter.html?c=" + ORDER[pos + 1]; nav2.appendChild(nx2); }
  var allc = el("a", "btn", "Все главы"); allc.href = "chapter.html"; nav2.appendChild(allc);
  s8.appendChild(nav2);
})();
