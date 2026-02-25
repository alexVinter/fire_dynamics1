import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.quote import Quote, QuoteItem
from app.models.quote_calc_run import QuoteCalcRun
from app.models.quote_result_line import QuoteResultLine
from app.models.rule import Rule
from app.models.sku import SKU
from app.models.technique import Technique
from app.models.user import User
from app.services.auth import hash_password
from app.services.calc_engine import calculate_quote


def _seed(db: Session):
    """Create shared reference data: user, technique, 2 SKUs, and return their IDs."""
    user = User(login="calcuser", password_hash=hash_password("x"), role="manager")
    db.add(user)
    db.flush()

    tech = Technique(manufacturer="KAMAZ", model="6520", series=None)
    db.add(tech)
    db.flush()

    sku_a = SKU(code="SKU-A", name="Трубка", unit="шт")
    sku_b = SKU(code="SKU-B", name="Баллон", unit="шт")
    db.add_all([sku_a, sku_b])
    db.flush()

    return user, tech, sku_a, sku_b


def test_dedup_items_sums_qty(db: Session):
    """Two identical items must be summed before rule application."""
    user, tech, sku_a, _ = _seed(db)

    rule = Rule(
        technique_id=tech.id,
        conditions_json=json.dumps({}),
        actions_json=json.dumps([{"sku_id": sku_a.id, "multiplier": 2}]),
    )
    db.add(rule)
    db.flush()

    quote = Quote(created_by=user.id, status="draft", zones_json=json.dumps([]))
    db.add(quote)
    db.flush()

    db.add(QuoteItem(quote_id=quote.id, technique_id=tech.id, qty=3))
    db.add(QuoteItem(quote_id=quote.id, technique_id=tech.id, qty=5))
    db.commit()

    lines = calculate_quote(db, quote.id)

    assert len(lines) == 1
    assert lines[0].sku_id == sku_a.id
    assert lines[0].qty == 2 * (3 + 5)  # multiplier * summed qty = 16


def test_zones_change_result(db: Session):
    """Different zone selections produce different result lines."""
    user, tech, sku_a, sku_b = _seed(db)

    rule_engine = Rule(
        technique_id=tech.id,
        conditions_json=json.dumps({"zones_included": ["engine"]}),
        actions_json=json.dumps([{"sku_id": sku_a.id, "multiplier": 1}]),
    )
    rule_tank = Rule(
        technique_id=tech.id,
        conditions_json=json.dumps({"zones_included": ["tank"]}),
        actions_json=json.dumps([{"sku_id": sku_b.id, "multiplier": 1}]),
    )
    db.add_all([rule_engine, rule_tank])
    db.flush()

    quote = Quote(created_by=user.id, status="draft", zones_json=json.dumps(["engine"]))
    db.add(quote)
    db.flush()
    db.add(QuoteItem(quote_id=quote.id, technique_id=tech.id, qty=1))
    db.commit()

    lines_engine = calculate_quote(db, quote.id)
    sku_ids_engine = {ln.sku_id for ln in lines_engine}
    assert sku_a.id in sku_ids_engine
    assert sku_b.id not in sku_ids_engine

    quote.zones_json = json.dumps(["tank"])
    quote.status = "draft"
    db.commit()

    lines_tank = calculate_quote(db, quote.id)
    sku_ids_tank = {ln.sku_id for ln in lines_tank}
    assert sku_b.id in sku_ids_tank
    assert sku_a.id not in sku_ids_tank


def test_matched_rule_ids_in_log(db: Session):
    """QuoteCalcRun must contain the IDs of all matched rules."""
    user, tech, sku_a, sku_b = _seed(db)

    r1 = Rule(
        technique_id=tech.id,
        conditions_json=json.dumps({}),
        actions_json=json.dumps([{"sku_id": sku_a.id, "multiplier": 1}]),
    )
    r2 = Rule(
        technique_id=tech.id,
        conditions_json=json.dumps({"zones_included": ["engine"]}),
        actions_json=json.dumps([{"sku_id": sku_b.id, "multiplier": 1}]),
    )
    db.add_all([r1, r2])
    db.flush()

    quote = Quote(created_by=user.id, status="draft", zones_json=json.dumps(["engine"]))
    db.add(quote)
    db.flush()
    db.add(QuoteItem(quote_id=quote.id, technique_id=tech.id, qty=1))
    db.commit()

    calculate_quote(db, quote.id)

    run = db.execute(
        select(QuoteCalcRun).where(QuoteCalcRun.quote_id == quote.id).order_by(QuoteCalcRun.id.desc())
    ).scalar_one()

    saved_ids = json.loads(run.matched_rule_ids)
    assert r1.id in saved_ids
    assert r2.id in saved_ids
    assert run.debug_note is not None
