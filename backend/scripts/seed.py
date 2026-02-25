"""
DEV ONLY — seed-скрипт для локальной разработки.
НЕ для продакшена. Создаёт тестовые данные: пользователей, технику, зоны, SKU, правила.

Запуск:
    cd backend
    python -m scripts.seed
"""

import json
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.rule import Rule
from app.models.sku import SKU
from app.models.technique import Technique
from app.models.user import User
from app.models.zone import Zone
from app.services.auth import hash_password

DEFAULT_PASSWORD = "dev123"


def seed() -> None:
    db = SessionLocal()
    try:
        if db.execute(select(User).limit(1)).scalar_one_or_none() is not None:
            print("DB already has data — skipping seed.")
            return

        admin = User(login="admin", password_hash=hash_password(DEFAULT_PASSWORD), role="admin")
        manager = User(login="manager", password_hash=hash_password(DEFAULT_PASSWORD), role="manager")
        warehouse = User(login="warehouse", password_hash=hash_password(DEFAULT_PASSWORD), role="warehouse")
        db.add_all([admin, manager, warehouse])
        db.flush()

        t1 = Technique(manufacturer="КАМАЗ", model="6520", series="Самосвал")
        t2 = Technique(manufacturer="Caterpillar", model="D9T", series=None)
        db.add_all([t1, t2])
        db.flush()

        z_engine = Zone(code="engine", title_ru="Моторный отсек")
        z_hydraulic = Zone(code="hydraulic", title_ru="Гидравлика")
        db.add_all([z_engine, z_hydraulic])
        db.flush()

        sku1 = SKU(code="FE-TUBE-10", name="Трубка 10мм", unit="м")
        sku2 = SKU(code="FE-NOZZLE-A", name="Распылитель тип А", unit="шт")
        sku3 = SKU(code="FE-TANK-5L", name="Баллон 5л", unit="шт")
        db.add_all([sku1, sku2, sku3])
        db.flush()

        rule1 = Rule(
            technique_id=t1.id,
            conditions_json=json.dumps({"zones_included": ["engine"]}),
            actions_json=json.dumps([
                {"sku_id": sku1.id, "multiplier": 3},
                {"sku_id": sku2.id, "multiplier": 2},
                {"sku_id": sku3.id, "multiplier": 1},
            ]),
        )
        rule2 = Rule(
            technique_id=t2.id,
            conditions_json=json.dumps({"zones_included": ["hydraulic"]}),
            actions_json=json.dumps([
                {"sku_id": sku1.id, "multiplier": 5},
                {"sku_id": sku3.id, "multiplier": 2},
            ]),
        )
        db.add_all([rule1, rule2])

        db.commit()
        print("Seed complete.")
        print(f"  Users:  admin / manager / warehouse  (password: {DEFAULT_PASSWORD})")
        print(f"  Techniques: {t1.manufacturer} {t1.model}, {t2.manufacturer} {t2.model}")
        print(f"  Zones: {z_engine.code}, {z_hydraulic.code}")
        print(f"  SKUs: {sku1.code}, {sku2.code}, {sku3.code}")
        print(f"  Rules: {rule1.id}, {rule2.id}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    sys.exit(0)
