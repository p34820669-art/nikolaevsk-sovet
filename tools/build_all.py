"""Пересобирает все данные сайта из Хронология.docx и авторских списков.

    python tools/build_all.py

Порядок: хронология -> карта -> цифры и главы (они ссылаются на записи хронологии).
"""
import subprocess, sys
sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path

T = Path(__file__).resolve().parent
for script in ("parse_chronology.py", "build_map_data.py", "build_curated.py", "curated_life.py"):
    print("==", script)
    r = subprocess.run([sys.executable, str(T / script)], encoding="utf-8")
    if r.returncode:
        sys.exit(r.returncode)
print("Готово. Откройте index.html.")

# Напоминание: после правок css/js/data поменяйте метку версии ?v=... в HTML (см. README), иначе телефоны покажут старую копию из кеша.
