(function () {
  "use strict";
  var NK = window.NK, el = NK.el;
  var EVENTS = window.SITE_DATA.events, THEMES = window.SITE_DATA.meta.themes;
  var MIN = 1918, MAX = 1991;

  // Годные для игры записи: короткие, без года в тексте, не обрывки
  var POOL = EVENTS.filter(function (e) {
    var t = e.text;
    return t.length >= 50 && t.length <= 260 && !/\b(19|20)\d\d\b/.test(t) && !/Между тем/.test(t) && !/\bг\.\s*[–-]/.test(t);
  });
  var byYear = {};
  POOL.forEach(function (e) { (byYear[e.year] = byYear[e.year] || []).push(e); });
  var poolYears = Object.keys(byYear).map(Number);

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pickEvent(avoid) {
    // сначала выбираем год, потом событие — чтобы редкие годы встречались так же часто, как насыщенные
    for (var k = 0; k < 40; k++) {
      var y = poolYears[rnd(poolYears.length)], list = byYear[y], e = list[rnd(list.length)];
      if (!avoid || avoid.indexOf(e.id) < 0) return e;
    }
    return POOL[rnd(POOL.length)];
  }

  var menu = document.getElementById("menu"), game = document.getElementById("game");
  function show(on) { menu.hidden = !!on; game.hidden = !on; game.textContent = ""; if (on) game.scrollIntoView({ block: "start" }); }
  function toMenu() { show(false); }
  function shareText(t) {
    try { navigator.clipboard.writeText(t); return true; } catch (e) { return false; }
  }
  function link(id) { var a = el("a", null, "Запись в летописи →"); a.href = "index.html#e" + id; return a; }

  // ============ Угадай год ============
  var ROUNDS = 8;
  function playYear() {
    show(true);
    var used = [], round = 0, total = 0, cur, hinted;
    function next() {
      game.textContent = "";
      if (round >= ROUNDS) return finish();
      cur = pickEvent(used); used.push(cur.id); hinted = false; round++;
      var card = el("div", "gcard");
      var top = el("div", "gtop"); top.appendChild(el("span", null, "Событие " + round + " из " + ROUNDS)); top.appendChild(el("span", null, "Очки: " + total));
      card.appendChild(top);
      card.appendChild(el("p", "gtext", cur.text));
      var hint = el("p", "muted"); hint.style.cssText = "margin:10px 0 0;font-size:14px;color:var(--muted)";
      card.appendChild(hint);
      var big = el("div", "yearbig", "1955");
      card.appendChild(big);
      var sl = el("input", "slider"); sl.type = "range"; sl.min = MIN; sl.max = MAX; sl.value = 1955; sl.setAttribute("aria-label", "Год события");
      sl.addEventListener("input", function () { big.textContent = sl.value; });
      card.appendChild(sl);
      var sc = el("div", "sl-scale"); sc.appendChild(el("span", null, String(MIN))); sc.appendChild(el("span", null, "1955")); sc.appendChild(el("span", null, String(MAX)));
      card.appendChild(sc);
      var acts = el("div", "actions");
      var ok = el("button", "btn primary", "Ответить"); ok.type = "button";
      var hb = el("button", "btn", "Подсказка (−20 очков)"); hb.type = "button";
      hb.addEventListener("click", function () {
        if (hinted) return; hinted = true; hb.disabled = true;
        var th = cur.tags.length ? " · Тема: " + cur.tags.map(function (t) { return THEMES[t]; }).join(", ") : "";
        var era = cur.era;
        hint.textContent = "Эпоха: «" + era + "»" + th;
      });
      ok.addEventListener("click", function () {
        var guess = parseInt(sl.value, 10), diff = Math.abs(guess - cur.year);
        var pts = Math.max(0, 100 - diff * 4) - (hinted ? 20 : 0); if (pts < 0) pts = 0;
        total += pts; ok.disabled = true; hb.disabled = true; sl.disabled = true;
        var res = el("div", "result");
        var verdict = diff === 0 ? "Точно в цель! " : diff <= 3 ? "Почти! " : diff <= 10 ? "Неплохо. " : "Далековато. ";
        res.appendChild(el("b", null, verdict));
        res.appendChild(document.createTextNode("Это было в " + cur.year + " году, вы выбрали " + guess + " (разница " + diff + " " + NK.plural(diff, "год", "года", "лет") + "). +" + pts + " очков. "));
        res.appendChild(link(cur.id));
        card.appendChild(res);
        var nx = el("button", "btn primary", round >= ROUNDS ? "Итоги" : "Дальше →"); nx.type = "button"; nx.style.marginTop = "14px";
        nx.addEventListener("click", next); card.appendChild(nx); nx.focus();
      });
      acts.appendChild(ok); acts.appendChild(hb); card.appendChild(acts);
      game.appendChild(card);
    }
    function finish() {
      var best = 0; try { best = parseInt(localStorage.getItem("nk-best-year") || "0", 10) || 0; } catch (e) {}
      if (window.NKG) window.NKG.gameResult("year", total, ROUNDS * 100);
      var rec = total > best; if (rec) { try { localStorage.setItem("nk-best-year", String(total)); } catch (e) {} }
      var card = el("div", "gcard");
      card.appendChild(el("div", "gtop", "Итог"));
      card.appendChild(el("div", "score", total + " из " + ROUNDS * 100));
      var rank = total >= 600 ? "Историк-краевед!" : total >= 400 ? "Хорошее чутьё на эпохи" : total >= 200 ? "Есть куда расти — загляните в летопись" : "Самое время читать летопись";
      card.appendChild(el("p", null, rank + (rec && best ? " Новый личный рекорд!" : (best ? " Рекорд на этом устройстве: " + best + "." : ""))));
      var acts = el("div", "actions");
      var again = el("button", "btn primary", "Сыграть ещё"); again.type = "button"; again.addEventListener("click", playYear);
      var sh = el("button", "btn", "Скопировать результат"); sh.type = "button";
      sh.addEventListener("click", function () { sh.textContent = shareText("Я набрал(а) " + total + " из " + ROUNDS * 100 + " в игре «Угадай год» по истории Николаевска-на-Амуре!") ? "Скопировано ✓" : "Не удалось скопировать"; });
      var m = el("button", "btn", "В меню"); m.type = "button"; m.addEventListener("click", toMenu);
      acts.appendChild(again); acts.appendChild(sh); acts.appendChild(m); card.appendChild(acts);
      game.appendChild(card);
    }
    next();
  }

  // ============ Раньше или позже ============
  function playPair() {
    show(true);
    var streak = 0, best = 0, answered = 0, lives = 3;
    var gameBest = 0;
    try { best = parseInt(localStorage.getItem("nk-best-pair") || "0", 10) || 0; } catch (e) {}
    function next() {
      game.textContent = "";
      if (lives <= 0) return finish();
      var a = pickEvent(), b, tries = 0;
      do { b = pickEvent([a.id]); tries++; } while ((Math.abs(a.year - b.year) < 4) && tries < 60);
      var card = el("div", "gcard");
      var top = el("div", "gtop");
      top.appendChild(el("span", null, "Какое событие случилось РАНЬШЕ?"));
      top.appendChild(el("span", "streak", "Серия: " + streak + " · жизни: " + "♥".repeat(lives)));
      card.appendChild(top);
      var pair = el("div", "pair");
      var btns = [];
      [a, b].forEach(function (e, i) {
        var bt = el("button", null, e.text); bt.type = "button";
        bt.addEventListener("click", function () {
          var earlier = a.year < b.year ? a : b, right = e === earlier;
          btns.forEach(function (x, k) {
            x.disabled = true;
            var ev = [a, b][k];
            var y = el("span", "yr", String(ev.year)); x.appendChild(y);
            if (ev === earlier) x.classList.add("right");
          });
          if (right) { streak++; answered++; } else { bt.classList.add("wrong"); lives--; streak = 0; }
          if (streak > gameBest) gameBest = streak;
          if (streak > best) { best = streak; try { localStorage.setItem("nk-best-pair", String(best)); } catch (er) {} }
          var res = el("div", "result");
          res.appendChild(el("b", null, right ? "Верно! " : "Не угадали. "));
          res.appendChild(document.createTextNode("Раньше было: " + earlier.year + " г. Позже: " + (earlier === a ? b : a).year + " г."));
          card.appendChild(res);
          var nx = el("button", "btn primary", lives > 0 ? "Дальше →" : "Итоги"); nx.type = "button"; nx.style.marginTop = "14px";
          nx.addEventListener("click", next); card.appendChild(nx); nx.focus();
        });
        btns.push(bt); pair.appendChild(bt);
      });
      card.appendChild(pair);
      game.appendChild(card);
    }
    function finish() {
      var card = el("div", "gcard");
      if (window.NKG) window.NKG.gameResult("pair", gameBest, 15);
      card.appendChild(el("div", "gtop", "Игра окончена"));
      card.appendChild(el("div", "score", "Верных ответов: " + answered));
      card.appendChild(el("p", null, "Рекордная серия на этом устройстве: " + best + "."));
      var acts = el("div", "actions");
      var again = el("button", "btn primary", "Сыграть ещё"); again.type = "button"; again.addEventListener("click", playPair);
      var sh = el("button", "btn", "Скопировать результат"); sh.type = "button";
      sh.addEventListener("click", function () { sh.textContent = shareText("В игре «Раньше или позже?» по истории Николаевска-на-Амуре я ответил(а) верно " + answered + " раз!") ? "Скопировано ✓" : "Не удалось скопировать"; });
      var m = el("button", "btn", "В меню"); m.type = "button"; m.addEventListener("click", toMenu);
      acts.appendChild(again); acts.appendChild(sh); acts.appendChild(m); card.appendChild(acts);
      game.appendChild(card);
    }
    next();
  }

  document.getElementById("m-year").addEventListener("click", playYear);
  document.getElementById("m-pair").addEventListener("click", playPair);
})();
