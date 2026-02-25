import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.rbac import require_role
from app.models.rule import Rule
from app.models.technique import Technique

router = APIRouter(
    prefix="/rules",
    tags=["rules"],
    dependencies=[Depends(require_role(["admin"]))],
)


class RuleCreate(BaseModel):
    technique_id: int
    conditions: dict = Field(description="Объект условий")
    actions: list = Field(description="Массив действий")
    version: int = 1
    active_from: str | None = None
    active_to: str | None = None

    @field_validator("actions")
    @classmethod
    def actions_not_empty(cls, v: list) -> list:
        if len(v) == 0:
            raise ValueError("actions must be a non-empty array")
        return v


class RuleOut(BaseModel):
    id: int
    technique_id: int
    conditions: dict
    actions: list
    version: int
    active_from: str | None
    active_to: str | None
    active: bool


def _to_out(r: Rule) -> RuleOut:
    return RuleOut(
        id=r.id,
        technique_id=r.technique_id,
        conditions=json.loads(r.conditions_json),
        actions=json.loads(r.actions_json),
        version=r.version,
        active_from=r.active_from.isoformat() if r.active_from else None,
        active_to=r.active_to.isoformat() if r.active_to else None,
        active=r.active,
    )


@router.get("", response_model=list[RuleOut])
def list_rules(
    technique_id: int = Query(..., description="Filter by technique"),
    db: Session = Depends(get_db),
) -> list[RuleOut]:
    rows = db.execute(
        select(Rule)
        .where(Rule.technique_id == technique_id, Rule.active.is_(True))
        .order_by(Rule.version.desc())
    ).scalars().all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
def create_rule(body: RuleCreate, db: Session = Depends(get_db)) -> RuleOut:
    technique = db.get(Technique, body.technique_id)
    if technique is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Technique not found")

    from datetime import date as _date

    active_from = _date.fromisoformat(body.active_from) if body.active_from else None
    active_to = _date.fromisoformat(body.active_to) if body.active_to else None

    rule = Rule(
        technique_id=body.technique_id,
        conditions_json=json.dumps(body.conditions, ensure_ascii=False),
        actions_json=json.dumps(body.actions, ensure_ascii=False),
        version=body.version,
        active_from=active_from,
        active_to=active_to,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _to_out(rule)
