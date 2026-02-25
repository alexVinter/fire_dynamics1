"""
Rule-based calculation engine.

No eval / exec — conditions and actions are matched declaratively.
"""

import json
import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models.engine_option import EngineOption
from app.models.quote import Quote, QuoteItem
from app.models.quote_calc_run import QuoteCalcRun
from app.models.quote_result_line import QuoteResultLine
from app.models.rule import Rule
from app.services.quote_status import QuoteStatus

logger = logging.getLogger(__name__)


@dataclass
class DedupedItem:
    technique_id: int
    engine_option_id: int | None
    engine_name: str | None
    engine_text: str | None
    year: int | None
    qty: int
    params: dict


def _dedup_items(items: list[QuoteItem], db: Session) -> list[DedupedItem]:
    """Group identical items by (technique_id, engine_option_id, engine_text, year, params_json), sum qty."""
    buckets: dict[tuple, DedupedItem] = {}
    engine_cache: dict[int, str] = {}

    for it in items:
        engine_name: str | None = None
        if it.engine_option_id:
            if it.engine_option_id not in engine_cache:
                eo = db.get(EngineOption, it.engine_option_id)
                engine_cache[it.engine_option_id] = eo.engine_name if eo else ""
            engine_name = engine_cache[it.engine_option_id]

        key = (it.technique_id, it.engine_option_id, it.engine_text, it.year, it.params_json or "")
        if key in buckets:
            buckets[key].qty += it.qty
        else:
            buckets[key] = DedupedItem(
                technique_id=it.technique_id,
                engine_option_id=it.engine_option_id,
                engine_name=engine_name,
                engine_text=it.engine_text,
                year=it.year,
                qty=it.qty,
                params=json.loads(it.params_json) if it.params_json else {},
            )
    return list(buckets.values())


def _match_conditions(cond: dict, item: DedupedItem, selected_zones: set[str]) -> bool:
    """Return True if all conditions in the rule match the item + zones."""

    if "zones_included" in cond:
        required_zones = set(cond["zones_included"])
        if not required_zones.issubset(selected_zones):
            return False

    if "year_range" in cond:
        yr = cond["year_range"]
        if item.year is None:
            return False
        if "from" in yr and item.year < yr["from"]:
            return False
        if "to" in yr and item.year > yr["to"]:
            return False

    if "engine" in cond:
        expected = cond["engine"]
        actual = item.engine_name or item.engine_text or ""
        if actual.lower() != expected.lower():
            return False

    if "params" in cond:
        for k, v in cond["params"].items():
            if item.params.get(k) != v:
                return False

    return True


def _apply_actions(actions: list[dict], item_qty: int, sku_totals: dict[int, int]) -> None:
    """Accumulate SKU quantities from action list. No eval — multiplier is a plain number."""
    for act in actions:
        sku_id = act.get("sku_id")
        multiplier = act.get("multiplier", 1)
        if sku_id is None or not isinstance(multiplier, (int, float)):
            continue
        sku_totals[sku_id] += int(multiplier * item_qty)


def calculate_quote(db: Session, quote_id: int) -> list[QuoteResultLine]:
    quote = db.execute(
        select(Quote).where(Quote.id == quote_id).options(selectinload(Quote.items))
    ).scalar_one_or_none()
    if quote is None:
        raise ValueError(f"Quote {quote_id} not found")

    selected_zones: set[str] = set(json.loads(quote.zones_json)) if quote.zones_json else set()
    deduped = _dedup_items(quote.items, db)

    today = date.today()
    technique_ids = {d.technique_id for d in deduped}
    rules = list(
        db.execute(
            select(Rule).where(
                Rule.technique_id.in_(technique_ids),
                Rule.active.is_(True),
            )
        ).scalars().all()
    )

    active_rules = [
        r for r in rules
        if (r.active_from is None or r.active_from <= today)
        and (r.active_to is None or r.active_to >= today)
    ]

    sku_totals: dict[int, int] = defaultdict(int)
    matched_rule_ids: list[int] = []
    debug_lines: list[str] = []

    for item in deduped:
        item_rules = [r for r in active_rules if r.technique_id == item.technique_id]
        for rule in item_rules:
            cond = json.loads(rule.conditions_json)
            if _match_conditions(cond, item, selected_zones):
                actions = json.loads(rule.actions_json)
                _apply_actions(actions, item.qty, sku_totals)
                matched_rule_ids.append(rule.id)
                debug_lines.append(
                    f"rule={rule.id} matched technique={item.technique_id} qty={item.qty}"
                )

    matched_rule_ids_unique = sorted(set(matched_rule_ids))
    logger.info("Quote %d calc: matched rules %s", quote_id, matched_rule_ids_unique)

    db.execute(delete(QuoteResultLine).where(QuoteResultLine.quote_id == quote_id))

    result_lines: list[QuoteResultLine] = []
    for sku_id, total_qty in sorted(sku_totals.items()):
        if total_qty <= 0:
            continue
        line = QuoteResultLine(quote_id=quote_id, sku_id=sku_id, qty=total_qty)
        db.add(line)
        result_lines.append(line)

    calc_run = QuoteCalcRun(
        quote_id=quote_id,
        matched_rule_ids=json.dumps(matched_rule_ids_unique),
        debug_note="\n".join(debug_lines) if debug_lines else None,
    )
    db.add(calc_run)

    quote.status = QuoteStatus.CALCULATED
    db.commit()

    for line in result_lines:
        db.refresh(line)

    return result_lines
