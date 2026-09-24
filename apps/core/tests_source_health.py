"""Сторож против двух ловушек, которые уже прятали баг в продакшене.

1. Кракозябры. Русский текст, сохранённый не в той кодировке, попадает
   в ответы API и в интерфейс. Глазами это не ловится: в редакторе
   строка выглядит нормально, пока не посмотришь на байты.

2. Дубли классов в одном модуле. Второе объявление молча перекрывает
   первое. Именно так битый UserUpdateSerializer перекрывал исправный,
   и поиск по исходнику показывал правильный текст, а отвечал другой.
"""

import ast
import io
import os
import re
from collections import Counter

from django.test import SimpleTestCase

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", "venv", ".venv",
    "media", "static", "dist", "build", "staticfiles", ".pytest_cache",
}

# Каждая кириллическая буква после двойной перекодировки превращается
# в «Р» или «С» плюс второй символ. Три пары в одной строке — это уже
# не совпадение, а испорченный текст.
MANGLED = re.compile(r"[РС][^\x00-\x7f]")


def _walk(extensions):
    for base, dirs, files in os.walk(BASE_DIR):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            if name.endswith(extensions):
                yield os.path.join(base, name)


def _looks_mangled(line: str) -> bool:
    if len(MANGLED.findall(line)) < 3:
        return False
    # Настоящий русский текст в cp1251 обратно в UTF-8 не разворачивается,
    # поэтому успешная развёртка и есть доказательство порчи.
    try:
        return line.encode("cp1251", errors="replace").decode("utf-8") != line
    except (UnicodeEncodeError, UnicodeDecodeError):
        return False


class SourceEncodingTests(SimpleTestCase):
    def test_no_double_encoded_text(self):
        """В исходниках нет текста с двойной перекодировкой."""
        broken = []
        for path in _walk((".py", ".ts", ".tsx", ".css", ".html")):
            try:
                rows = io.open(path, encoding="utf-8").read().split("\n")
            except (UnicodeDecodeError, OSError):
                continue
            for number, line in enumerate(rows, 1):
                if _looks_mangled(line):
                    rel = os.path.relpath(path, BASE_DIR)
                    broken.append(f"{rel}:{number}: {line.strip()[:70]}")
        self.assertEqual(
            broken, [],
            "Текст сохранён не в той кодировке — в ответах API будут "
            "кракозябры:\n" + "\n".join(broken[:20]),
        )


class DuplicateDefinitionTests(SimpleTestCase):
    def test_no_duplicate_top_level_definitions(self):
        """Один модуль не объявляет дважды класс или функцию.

        Второе объявление перекрывает первое молча, и правка первого
        никак не отражается на работе — так баг и живёт незамеченным.
        """
        duplicates = []
        for path in _walk((".py",)):
            try:
                tree = ast.parse(io.open(path, encoding="utf-8").read())
            except (SyntaxError, UnicodeDecodeError, OSError):
                continue
            names = Counter(
                node.name for node in tree.body
                if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef))
            )
            rel = os.path.relpath(path, BASE_DIR)
            for name, count in names.items():
                if count > 1:
                    duplicates.append(f"{rel}: {name} объявлен {count} раза")
        self.assertEqual(
            duplicates, [],
            "Повторное объявление перекрывает предыдущее:\n"
            + "\n".join(duplicates[:20]),
        )
