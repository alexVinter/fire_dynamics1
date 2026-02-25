from sqlalchemy import select, union
from sqlalchemy.orm import Session

from app.models.technique import Technique
from app.models.technique_alias import TechniqueAlias


def search_techniques(
    db: Session,
    *,
    search: str | None = None,
    manufacturer: str | None = None,
) -> list[Technique]:
    if search:
        pattern = f"%{search}%"

        by_fields = (
            select(Technique.id)
            .where(Technique.active.is_(True))
            .where(
                Technique.manufacturer.ilike(pattern)
                | Technique.model.ilike(pattern)
                | Technique.series.ilike(pattern)
            )
        )

        by_alias = (
            select(TechniqueAlias.technique_id.label("id"))
            .where(TechniqueAlias.alias_text.ilike(pattern))
        )

        matched_ids = union(by_fields, by_alias).subquery()

        stmt = (
            select(Technique)
            .where(Technique.id.in_(select(matched_ids.c.id)))
            .where(Technique.active.is_(True))
        )
    else:
        stmt = select(Technique).where(Technique.active.is_(True))

    if manufacturer:
        stmt = stmt.where(Technique.manufacturer.ilike(manufacturer))

    stmt = stmt.order_by(Technique.manufacturer, Technique.model)
    return list(db.execute(stmt).scalars().all())


def get_technique_by_id(db: Session, technique_id: int) -> Technique | None:
    t = db.get(Technique, technique_id)
    if t and t.active:
        return t
    return None


def create_technique(
    db: Session,
    *,
    manufacturer: str,
    model: str,
    series: str | None = None,
    meta: str | None = None,
) -> Technique:
    t = Technique(manufacturer=manufacturer, model=model, series=series, meta=meta)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def patch_technique(
    db: Session,
    technique_id: int,
    *,
    manufacturer: str | None = None,
    model: str | None = None,
    series: str | None = ...,
    meta: str | None = ...,
    active: bool | None = None,
) -> Technique | None:
    t = db.get(Technique, technique_id)
    if t is None:
        return None
    if manufacturer is not None:
        t.manufacturer = manufacturer
    if model is not None:
        t.model = model
    if series is not ...:
        t.series = series
    if meta is not ...:
        t.meta = meta
    if active is not None:
        t.active = active
    db.commit()
    db.refresh(t)
    return t
