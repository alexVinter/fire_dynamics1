"""
DEV ONLY — seed-скрипт для локальной разработки.
НЕ для продакшена. Создаёт тестовые данные: пользователей, технику, зоны, SKU, правила.

Запуск:
    cd backend
    python -m scripts.seed
    python -m scripts.seed --techniques 20 --zones 6 --skus 30 --seed 42
"""

import argparse
import json
import os
import random
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.quote import Quote, QuoteItem
from app.models.rule import Rule
from app.models.sku import SKU
from app.models.technique import Technique
from app.models.user import User
from app.models.zone import Zone
from app.services.auth import hash_password
from app.services.calc_engine import calculate_quote

_ALLOWED_ENVS = {"dev", "local", ""}
DEFAULT_PASSWORD = "dev123"

_MANUFACTURERS = [
    "КАМАЗ", "Caterpillar", "Komatsu", "Volvo", "Liebherr",
    "Hitachi", "John Deere", "Doosan", "Hyundai", "БЕЛАЗ",
]
_MODELS = [
    "6520", "D9T", "PC200", "EC480", "R9800",
    "ZX350", "850L", "DX225", "HX300", "7555",
]
_SERIES = [
    "Самосвал", "Бульдозер", "Экскаватор", "Погрузчик", "Каток",
    None, None, None,
]

_ZONE_POOL = [
    ("engine", "Моторный отсек"),
    ("hydraulic", "Гидравлика"),
    ("electrical", "Электрооборудование"),
    ("cabin", "Кабина оператора"),
    ("fuel_tank", "Топливный бак"),
    ("transmission", "Трансмиссия"),
    ("battery", "Аккумуляторный отсек"),
    ("turbo", "Турбокомпрессор"),
    ("exhaust", "Выхлопная система"),
    ("chassis", "Шасси"),
    ("tank", "Бак рабочей жидкости"),
    ("electric", "Электропривод"),
    ("cooler", "Система охлаждения"),
    ("air_filter", "Воздушный фильтр"),
    ("fuel_line", "Топливная магистраль"),
    ("oil_system", "Маслосистема"),
    ("brake", "Тормозная система"),
    ("steering", "Рулевое управление"),
    ("axle", "Мост"),
    ("winch", "Лебёдка"),
    ("boom", "Стрела"),
    ("bucket", "Ковш"),
    ("pump", "Насосная станция"),
    ("generator", "Генератор"),
    ("compressor", "Компрессор"),
    ("radiator", "Радиатор"),
    ("inverter", "Инвертор"),
    ("pneumatic", "Пневмосистема"),
    ("lighting", "Освещение"),
    ("cargo_bay", "Грузовой отсек"),
]

_SKU_PREFIXES = ["FE-TUBE", "FE-NOZZLE", "FE-TANK", "FE-VALVE", "FE-SENSOR", "FE-CABLE", "FE-CTRL"]
_SKU_NAMES = ["Трубка", "Распылитель", "Баллон", "Клапан", "Датчик", "Кабель", "Контроллер"]
_SKU_UNITS = ["м", "шт", "шт", "шт", "шт", "м", "шт"]


def _env_guard() -> None:
    env = os.environ.get("APP_ENV", "").lower()
    if env not in _ALLOWED_ENVS:
        print(f"ERROR: APP_ENV={env!r} — seed разрешён только для dev/local.")
        sys.exit(1)


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Seed dev data")
    p.add_argument("--techniques", type=int, default=2)
    p.add_argument("--zones", type=int, default=2)
    p.add_argument("--skus", type=int, default=3)
    p.add_argument("--rules-per-technique", type=int, default=0)
    p.add_argument("--quotes", type=int, default=0)
    p.add_argument("--seed", type=int, default=42)
    return p.parse_args()


def _seed_users(db, rng: random.Random) -> list[User]:
    users = [
        User(login="admin", password_hash=hash_password(DEFAULT_PASSWORD), role="admin", is_active=True),
        User(login="manager", password_hash=hash_password(DEFAULT_PASSWORD), role="manager", is_active=True),
        User(login="warehouse", password_hash=hash_password(DEFAULT_PASSWORD), role="warehouse", is_active=True),
    ]
    db.add_all(users)
    db.flush()
    return users


def _seed_techniques(db, rng: random.Random, count: int) -> list[Technique]:
    items: list[Technique] = []
    for i in range(count):
        t = Technique(
            manufacturer=rng.choice(_MANUFACTURERS),
            model=rng.choice(_MODELS) + f"-{i:03d}",
            series=rng.choice(_SERIES),
            active=True,
        )
        items.append(t)
    db.add_all(items)
    db.flush()
    return items


def _seed_zones(db, rng: random.Random, count: int) -> list[Zone]:
    pool = list(_ZONE_POOL)
    count = min(count, len(pool))
    selected = pool[:count]
    items = [Zone(code=code, title_ru=title, active=True) for code, title in selected]
    db.add_all(items)
    db.flush()
    return items


def _seed_skus(db, rng: random.Random, count: int) -> list[SKU]:
    items: list[SKU] = []
    for i in range(count):
        idx = i % len(_SKU_PREFIXES)
        items.append(SKU(
            code=f"{_SKU_PREFIXES[idx]}-{i:03d}",
            name=f"{_SKU_NAMES[idx]} {rng.randint(5, 50)}мм",
            unit=_SKU_UNITS[idx],
            active=True,
        ))
    db.add_all(items)
    db.flush()
    return items


_KEY_ZONE_SKU_MAP: list[tuple[str, list[int]]] = [
    ("engine", [0, 1]),
    ("fuel_tank", [2, 3]),
    ("electrical", [4, 5]),
]


def _seed_rules(
    db,
    rng: random.Random,
    techniques: list[Technique],
    zones: list[Zone],
    skus: list[SKU],
    per_technique: int,
) -> list[Rule]:
    if per_technique <= 0 or not skus or not zones:
        return []

    zone_codes = {z.code for z in zones}
    all_zone_codes = sorted(zone_codes)
    rules: list[Rule] = []

    for tech in techniques:
        created = 0

        for zone_code, sku_indices in _KEY_ZONE_SKU_MAP:
            if created >= per_technique:
                break
            if zone_code not in zone_codes:
                continue
            action_skus = [skus[i % len(skus)] for i in sku_indices]
            seen: set[int] = set()
            unique = [s for s in action_skus if s.id not in seen and not seen.add(s.id)]  # type: ignore[func-returns-value]
            rules.append(Rule(
                technique_id=tech.id,
                conditions_json=json.dumps({"zones_included": [zone_code]}),
                actions_json=json.dumps([
                    {"sku_id": s.id, "multiplier": rng.randint(1, 5)} for s in unique
                ]),
                version=1,
                active=True,
            ))
            created += 1

        for _ in range(per_technique - created):
            combo_size = rng.randint(1, min(2, len(all_zone_codes)))
            combo = sorted(rng.sample(all_zone_codes, combo_size))
            act_count = rng.randint(1, min(3, len(skus)))
            act_skus = rng.sample(skus, act_count)
            rules.append(Rule(
                technique_id=tech.id,
                conditions_json=json.dumps({"zones_included": combo}),
                actions_json=json.dumps([
                    {"sku_id": s.id, "multiplier": rng.randint(1, 5)} for s in act_skus
                ]),
                version=1,
                active=True,
            ))

    db.add_all(rules)
    db.flush()
    return rules


_CUSTOMERS = [
    "ООО СтройТехМаш", "ИП Иванов А.В.", "АО МегаТех", "ООО ПромСервис",
    "ЗАО Техника+", "ООО Нефтегаз", "ИП Петров С.Л.", "АО Карьер-Инвест",
]
_ENGINE_TEXTS = ["Cummins ISB6.7", "ЯМЗ-536", "CAT C7.1", None, None]

_STATUS_WEIGHTS = [
    ("draft", 0.20),
    ("rework", 0.15),
    ("calculated", 0.25),
    ("warehouse_check", 0.20),
    ("confirmed", 0.20),
]


def _build_status_list(rng: random.Random, count: int) -> list[str]:
    result: list[str] = []
    for status, frac in _STATUS_WEIGHTS:
        result.extend([status] * max(1, round(count * frac)))
    result = result[:count]
    while len(result) < count:
        result.append("draft")
    rng.shuffle(result)
    return result


def _generate_items(
    db, rng: random.Random, quote_id: int, techniques: list[Technique], count: int,
) -> None:
    num_templates = max(1, count * 7 // 10)
    templates: list[dict] = []
    for _ in range(num_templates):
        tech = rng.choice(techniques)
        templates.append({
            "technique_id": tech.id,
            "engine_text": rng.choice(_ENGINE_TEXTS),
            "year": rng.choice([2020, 2021, 2022, 2023, 2024, None]),
            "params_json": None,
        })

    items: list[QuoteItem] = []
    for i in range(count):
        tmpl = templates[i] if i < num_templates else rng.choice(templates)
        items.append(QuoteItem(
            quote_id=quote_id,
            technique_id=tmpl["technique_id"],
            engine_text=tmpl["engine_text"],
            year=tmpl["year"],
            qty=rng.randint(1, 5),
            params_json=tmpl["params_json"],
        ))
    db.add_all(items)
    db.flush()


def _seed_quotes(
    db,
    rng: random.Random,
    users: list[User],
    techniques: list[Technique],
    zones: list[Zone],
    count: int,
) -> tuple[list[Quote], int]:
    if count <= 0 or not techniques or not zones:
        return [], 0

    managers = [u for u in users if u.role in ("manager", "admin")]
    zone_codes = [z.code for z in zones]
    statuses = _build_status_list(rng, count)
    calc_ok = 0
    quotes: list[Quote] = []

    for i in range(count):
        target = statuses[i]
        is_big = (i % 5 == 0)
        zone_n = rng.randint(1, min(4, len(zone_codes)))
        selected_zones = rng.sample(zone_codes, zone_n)

        q = Quote(
            created_by=rng.choice(managers).id,
            status="draft",
            customer_name=rng.choice(_CUSTOMERS),
            comment=f"Тестовый расчёт #{i + 1}" if rng.random() > 0.3 else None,
            zones_json=json.dumps(selected_zones),
        )
        db.add(q)
        db.flush()

        item_count = 100 if is_big else rng.randint(2, 10)
        _generate_items(db, rng, q.id, techniques, item_count)
        db.commit()

        needs_calc = target in ("calculated", "warehouse_check", "confirmed", "rework")
        if needs_calc:
            try:
                calculate_quote(db, q.id)
                calc_ok += 1
                if target != "calculated":
                    q.status = target
                    db.commit()
            except Exception as exc:
                print(f"  WARN: calculate quote {q.id} failed: {exc}")

        quotes.append(q)

    return quotes, calc_ok


def seed(args: argparse.Namespace) -> None:
    _env_guard()
    rng = random.Random(args.seed)

    db = SessionLocal()
    try:
        if db.execute(select(User).limit(1)).scalar_one_or_none() is not None:
            print("DB already has data — skipping seed.")
            return

        users = _seed_users(db, rng)
        techniques = _seed_techniques(db, rng, args.techniques)
        zones = _seed_zones(db, rng, args.zones)
        skus = _seed_skus(db, rng, args.skus)
        rules = _seed_rules(db, rng, techniques, zones, skus, args.rules_per_technique)
        db.commit()

        quotes, calc_ok = _seed_quotes(db, rng, users, techniques, zones, args.quotes)

        print(f"Seed complete (--seed {args.seed}).")
        print(f"  Users:      {', '.join(u.login for u in users)}  (password: {DEFAULT_PASSWORD})")
        print(f"  Techniques: {len(techniques)}")
        print(f"  Zones:      {len(zones)}")
        print(f"  SKUs:       {len(skus)}")
        print(f"  Rules:      {len(rules)}")
        print(f"  Quotes:     {len(quotes)} ({calc_ok} calculated)")
    finally:
        db.close()


if __name__ == "__main__":
    seed(_parse_args())
