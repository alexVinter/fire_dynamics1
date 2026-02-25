from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import get_current_user
from app.deps.rbac import require_role
from app.models.zone import Zone

router = APIRouter(prefix="/zones", tags=["zones"])


class ZoneOut(BaseModel):
    id: int
    code: str
    title_ru: str
    active: bool


class ZoneCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    title_ru: str = Field(min_length=1, max_length=255)


class ZonePatch(BaseModel):
    title_ru: str | None = None
    active: bool | None = None


def _to_out(z: Zone) -> ZoneOut:
    return ZoneOut(id=z.id, code=z.code, title_ru=z.title_ru, active=z.active)


@router.get("", response_model=list[ZoneOut], dependencies=[Depends(get_current_user)])
def list_zones(db: Session = Depends(get_db)) -> list[ZoneOut]:
    rows = db.execute(
        select(Zone).where(Zone.active.is_(True)).order_by(Zone.code)
    ).scalars().all()
    return [_to_out(z) for z in rows]


@router.post(
    "",
    response_model=ZoneOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["admin"]))],
)
def create_zone(body: ZoneCreate, db: Session = Depends(get_db)) -> ZoneOut:
    exists = db.execute(select(Zone).where(Zone.code == body.code)).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Zone code already exists")

    zone = Zone(code=body.code, title_ru=body.title_ru)
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return _to_out(zone)


@router.patch(
    "/{zone_id}",
    response_model=ZoneOut,
    dependencies=[Depends(require_role(["admin"]))],
)
def patch_zone(zone_id: int, body: ZonePatch, db: Session = Depends(get_db)) -> ZoneOut:
    zone = db.get(Zone, zone_id)
    if zone is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Zone not found")

    if body.title_ru is not None:
        zone.title_ru = body.title_ru
    if body.active is not None:
        zone.active = body.active

    db.commit()
    db.refresh(zone)
    return _to_out(zone)
