"""Разбор Хронология.docx -> data/events.json

Запуск:  python tools/parse_chronology.py
Правила разметки (темы, места, эпохи) лежат в этом файле; автор потом
правит итоговый data/events.json (или .csv) вручную.
"""
import json, re, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

SRC = Path(r"D:\Соц Николаевск-на-Амуре\Хронология.docx")
OUT = Path(__file__).resolve().parent.parent / "data" / "events.json"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

ERAS = [
    (1918, 1922, "Революция и интервенция", "Становление Советской власти на Амуре"),
    (1923, 1940, "Строим заново", "Порт, школы, больница и первые заводы"),
    (1941, 1945, "Война", "Город и район в тылу и на Дальневосточном фронте"),
    (1946, 1953, "Восстановление", "Послевоенный подъём, юбилей города"),
    (1954, 1964, "Расцвет и рост", "Новые предприятия, жильё, культура"),
    (1965, 1975, "Большие стройки", "Водопровод, ТЭЦ, скоростные теплоходы и посёлки геологов"),
    (1976, 1985, "Зрелый город", "Судостроительный расцвет, «Мобиль» и дороги на север"),
    (1986, 1991, "Перемены", "Перестройка и распад СССР"),
]

THEMES = {
    "port":   ("Порт и флот", r"порт|флот|судо|судн|пароход|мореход|навигац|причал|моряк|баз[аы] флота|буксир|теплоход|рейд"),
    "industry": ("Промышленность", r"завод|комбинат|фабрик|цех|производств|промкомбинат|мастерск|лесозаготов|леспромхоз|лесопил|мехзавод|ТЭЦ|электростанц"),
    "fish":   ("Рыба и море", r"рыб|улов|рыбозавод|рыбкооп|рыбак|путин|кета|горбуш|нерест"),
    "farm":   ("Сельское хозяйство", r"колхоз|совхоз|ферм|овощ|птице|звероводч|урожа|животновод|молоч|картофел|посев|зерн"),
    "school": ("Школа и образование", r"школ|училищ|учител|учеб|ПТУ|техникум|детск(ий|ие) сад|ясли|ликбез|грамот|образован|интернат|педагог"),
    "health": ("Здоровье", r"больниц|врач|медицин|поликлин|койк|роддом|родильн|санитар|фельдшер|здравоохран|аптек|эпидеми"),
    "culture": ("Культура и спорт", r"клуб|библиотек|театр|кино|РДК|музей|музык|спорт|стадион|парк|хор|радио|газет|типограф|печат|избы-читальн|концерт|праздник|фестивал"),
    "war":    ("Война и тыл", r"войн|фронт|карточн|эвакуац|Победа|Победы|победу|военн|гарнизон|призыв|госпиталь|мобилизац|фашист|японск|Курил"),
    "living": ("Жильё и быт", r"жил(ой|ые|ья|ая|ых)|квартир|общежит|водопровод|канализац|отоплен|электрифик|электросет|электричеств|дорог|мост|телефон|связь|магазин|столов|баня|хлеб|торговл|автобус|улиц"),
    "power":  ("Власть и общество", r"Совет|исполком|горком|райком|выбор|партия|партийн|комсомол|пионер|милици|суд|профсоюз|ВКП|КПСС|депутат|съезд|конференци"),
    "air":    ("Авиация и транспорт", r"аэро|авиа|самол[её]т|лётн|лётчик|вертол[её]т|аэропорт|железн|автотранспорт"),
}

# (регулярка, красивое название). Перед каждой стоит запрет на букву слева, чтобы не цеплять части других слов.
PLACES = [
    (r"Николаевск", "Николаевск"),
    (r"Маго", "Маго"),
    (r"Красное(?!\s+[Зз]нам)", "Красное"), (r"Красносельск", "Красное"),   # «Красное знамя» - не село
    (r"Лазарев", "Лазарев (мыс)"),
    (r"Многовершинн", "Многовершинный"),
    (r"Чныррах", "Чныррах"),
    (r"Иннокентьевк", "Иннокентьевка"),
    (r"Нижнее Пронге|Нижн\w+ Пронге", "Нижнее Пронге"),
    (r"Керби", "Керби"),
    (r"Мариинск", "Мариинское"),
    (r"Вениаминовк", "Вениаминовка"),
    (r"Богородск", "Богородское"),
    (r"Софийск", "Софийск"),
    (r"Тахт[аеыу]\b", "Тахта"),
    (r"Нигирь", "Нигирь"),
    (r"Виданов", "Виданово"),
    (r"Оремиф", "Оремиф"),
    (r"Мыс Кошка", "Мыс Кошка"),
    (r"Тнейвах", "Тнейвах"),
    (r"Озерпах|Озёрпах", "Озёрпах"),
    (r"Сахаровк", "Сахаровка"),
    (r"Орель[\s–-]*Чля|Орель", "Орель-Чля"),
    (r"\bЧля\b", "Чля"),
    (r"Гырман", "Гырман"),
    (r"Субботин", "Субботино"),
    (r"Подгорн(ое|ом|ого)|Первом Номере", "Подгорное"),
    (r"Сусанин", "Сусанино"),
]

LEAD_WORDS = re.compile(
    r"впервые|образован|учреждён|учрежден|открыт|открылась|открылся|введен[аоы]? в эксплуатац|"
    r"первая|первый|первое|построен|начал[аоси]? |присвоен|награжд|орден|основан|"
    r"переименован|население|численност", re.I)

def read_paragraphs():
    with zipfile.ZipFile(SRC) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    for p in root.iter(W + "p"):
        text = "".join(t.text or "" for t in p.iter(W + "t")).strip()
        if text:
            yield re.sub(r"\s+", " ", text)

def era_of(year):
    for a, b, name, sub in ERAS:
        if a <= year <= b:
            return name
    return ""

def tags_for(text):
    hits = []
    for key, (_, rx) in THEMES.items():
        n = len(re.findall(rx, text, re.I if key != "power" else 0))
        if n:
            hits.append((n, key))
    hits.sort(key=lambda h: -h[0])
    return [k for _, k in hits[:3]]  # не больше трёх самых частых тем

def places_for(text):
    res = []
    for rx, name in PLACES:
        if re.search(r"(?<![А-Яа-яЁё])(?:" + rx + ")", text) and name not in res:
            res.append(name)
    return res

SOURCES = {
    "ОЧЕРК": "Материалы к истории Нижне-Амурской геологоразведочной экспедиции (Красное, 2010): Очерк истории экспедиции, по фондовым документам",
    "МЕМУАРЫ": "Материалы к истории Нижне-Амурской геологоразведочной экспедиции (Красное, 2010): сборник «Мемуары»",
    "САЛИХОВА": "М. Р. Салихова. …Солнца и ветра брат. Очерки. Ижевск, 2006",
}

def load_extra():
    """Дополнительные записи с источниками (data/extra_events.csv): публикуются те, где publish = да."""
    import csv
    path = OUT.parent / "extra_events.csv"
    if not path.exists():
        return []
    res = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f, delimiter=";"):
            if (row.get("publish") or "").strip().lower() != "да":
                continue
            text = row["text"].strip()
            year = int(row["year"])
            keys = [k for k in (row.get("source") or "").replace("+", " ").replace(",", " ").split() if k in SOURCES]   # несколько источников через +
            places = [p.strip() for p in (row.get("places") or "").split(",") if p.strip()] or places_for(text)
            res.append({
                "id": int(row["id"]), "year": year, "era": era_of(year), "text": text,
                "tags": [t.strip() for t in (row.get("tags") or "").split(",") if t.strip()],
                "places": places, "score": 3, "title": "",
                "source": "; ".join(SOURCES[k] for k in keys),
                "sourceKind": (row.get("kind") or "").strip(),
                "note": (row.get("note") or "").strip(),
                "media": [], "lead": False, "verified": False, "extra": True,
            })
    return res

def apply_annotations(events):
    """Примечания к записям docx (data/annotations.csv): уточнения по документам, без правки самого docx."""
    import csv
    path = OUT.parent / "annotations.csv"
    if not path.exists():
        return
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f, delimiter=";"):
            rx = re.compile(row["find"])
            hits = [e for e in events if e["year"] == int(row["year"]) and rx.search(e["text"])]
            if len(hits) != 1:
                print(f"ПРИМЕЧАНИЕ НЕ ПРИВЯЗАНО ({len(hits)}): {row['year']} {row['find']}")
                continue
            keys = [k for k in row["source"].replace("+", " ").split() if k in SOURCES]
            hits[0]["annotation"] = {"note": row["note"], "source": "; ".join(SOURCES[k] for k in keys)}

def main():
    events, year, seq = [], None, 0
    for text in read_paragraphs():
        m = re.fullmatch(r"((?:19|20)\d\d)\s*(?:г\.?|год)?", text)
        if m:
            year = int(m.group(1))
            continue
        if year is None:
            continue
        seq += 1
        if text.strip() == "Между тем":   # обрывок из docx без содержания; номер пропускаем, чтобы ссылки на другие записи не сдвинулись
            continue
        score = len(LEAD_WORDS.findall(text)) + (1 if re.search(r"\d", text) else 0) + min(len(text) // 200, 2)
        events.append({
            "id": seq,
            "year": year,
            "era": era_of(year),
            "text": text,
            "tags": tags_for(text),
            "places": places_for(text),
            "score": score,
            # поля ниже автор заполняет вручную по мере работы
            "title": "",
            "source": "",
            "media": [],
            "lead": False,
            "verified": False,
        })

    # главное событие года: максимальная оценка среди записей года
    by_year = {}
    for e in events:
        by_year.setdefault(e["year"], []).append(e)
    for y, items in by_year.items():
        best = max(items, key=lambda e: (e["score"], len(e["text"])))
        best["lead"] = True

    apply_annotations(events)
    extras = load_extra()
    events.extend(extras)
    events.sort(key=lambda e: (e["year"], 1 if e.get("extra") else 0))   # стабильно: в году сначала docx, потом доп. записи
    by_year = {}
    for e in events:
        by_year.setdefault(e["year"], []).append(e)
    print(f"дополнительных записей с источниками: {len(extras)}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    meta = {
        "eras": [{"from": a, "to": b, "name": n, "subtitle": s} for a, b, n, s in ERAS],
        "themes": {k: v[0] for k, v in THEMES.items()},
    }
    payload = {"meta": meta, "events": events}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    # то же самое для сайта: подключается обычным <script>, работает без сервера (file://)
    OUT.with_suffix(".js").write_text(
        "window.SITE_DATA=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";",
        encoding="utf-8")
    print(f"events={len(events)} years={len(by_year)} -> {OUT}")
    untagged = sum(1 for e in events if not e["tags"])
    print(f"без тем: {untagged} ({untagged*100//len(events)}%)")
    from collections import Counter
    c = Counter(t for e in events for t in e["tags"])
    print({THEMES[k][0]: v for k, v in c.most_common()})
    print("места:", Counter(p for e in events for p in e["places"]).most_common(12))
    print("длина записи: макс", max(len(e["text"]) for e in events), "средняя", sum(len(e["text"]) for e in events)//len(events))

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
