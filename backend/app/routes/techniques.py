from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import get_current_user
from app.deps.rbac import require_role
from app.models.engine_option import EngineOption
from app.models.technique import Technique
from app.repo.technique_repo import (
    create_technique,
    get_technique_by_id,
    patch_technique,
    search_techniques,
)

router = APIRouter(
    prefix="/techniques",
    tags=["techniques"],
    dependencies=[Depends(get_current_user)],
)

_SENTINEL = object()


class TechniqueOut(BaseModel):
    id: int
    manufacturer: str
    model: str
    series: str | None
    meta: str | None
    active: bool


class EngineOptionOut(BaseModel):
    id: int
    technique_id: int
    engine_name: str
    year_from: int | None
    year_to: int | None
    source: str
    active: bool


class EngineOptionCreate(BaseModel):
    engine_name: str = Field(min_length=1, max_length=255)
    year_from: int | None = None
    year_to: int | None = None


class TechniqueCreate(BaseModel):
    manufacturer: str = Field(min_length=1, max_length=255)
    model: str = Field(min_length=1, max_length=255)
    series: str | None = None
    meta: str | None = None


class TechniquePatch(BaseModel):
    manufacturer: str | None = None
    model: str | None = None
    series: str | None = _SENTINEL  # type: ignore[assignment]
    meta: str | None = _SENTINEL  # type: ignore[assignment]
    active: bool | None = None

    model_config = {"arbitrary_types_allowed": True}


def _to_out(t: Technique) -> TechniqueOut:
    return TechniqueOut(
        id=t.id, manufacturer=t.manufacturer, model=t.model,
        series=t.series, meta=t.meta, active=t.active,
    )


def _ensure_technique(db: Session, technique_id: int) -> Technique:
    t = db.get(Technique, technique_id)
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Technique not found")
    return t


def _engine_to_out(e: EngineOption) -> EngineOptionOut:
    return EngineOptionOut(
        id=e.id, technique_id=e.technique_id, engine_name=e.engine_name,
        year_from=e.year_from, year_to=e.year_to, source=e.source, active=e.active,
    )


@router.get("", response_model=list[TechniqueOut])
def list_techniques(
    search: str | None = Query(None, min_length=1, description="Поиск по модели/марке/alias"),
    manufacturer: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[TechniqueOut]:
    rows = search_techniques(db, search=search, manufacturer=manufacturer)
    return [_to_out(t) for t in rows]


@router.get("/{technique_id}", response_model=TechniqueOut)
def get_technique(technique_id: int, db: Session = Depends(get_db)) -> TechniqueOut:
    t = get_technique_by_id(db, technique_id)
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Technique not found")
    return _to_out(t)


@router.post("", response_model=TechniqueOut, status_code=status.HTTP_201_CREATED)
def create_technique_endpoint(
    body: TechniqueCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_role(["admin"])),
) -> TechniqueOut:
    t = create_technique(
        db, manufacturer=body.manufacturer, model=body.model,
        series=body.series, meta=body.meta,
    )
    return _to_out(t)


@router.patch("/{technique_id}", response_model=TechniqueOut)
def patch_technique_endpoint(
    technique_id: int,
    body: TechniquePatch,
    db: Session = Depends(get_db),
    _: None = Depends(require_role(["admin"])),
) -> TechniqueOut:
    t = patch_technique(
        db, technique_id,
        manufacturer=body.manufacturer,
        model=body.model,
        series=body.series if body.series is not _SENTINEL else ...,
        meta=body.meta if body.meta is not _SENTINEL else ...,
        active=body.active,
    )
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Technique not found")
    return _to_out(t)


@router.get("/{technique_id}/engines", response_model=list[EngineOptionOut])
def list_engines(technique_id: int, db: Session = Depends(get_db)) -> list[EngineOptionOut]:
    _ensure_technique(db, technique_id)
    rows = db.execute(
        select(EngineOption)
        .where(EngineOption.technique_id == technique_id, EngineOption.active.is_(True))
        .order_by(EngineOption.engine_name)
    ).scalars().all()
    return [_engine_to_out(e) for e in rows]


@router.post(
    "/{technique_id}/engines",
    response_model=EngineOptionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_engine_option(
    technique_id: int,
    body: EngineOptionCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_role(["admin"])),
) -> EngineOptionOut:
    _ensure_technique(db, technique_id)
    engine = EngineOption(
        technique_id=technique_id,
        engine_name=body.engine_name,
        year_from=body.year_from,
        year_to=body.year_to,
        source="manual",
    )
    db.add(engine)
    db.commit()
    db.refresh(engine)
    return _engine_to_out(engine)
