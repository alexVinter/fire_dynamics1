from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth import get_current_user
from app.deps.rbac import require_role
from app.models.sku import SKU

router = APIRouter(prefix="/skus", tags=["skus"])


class SKUOut(BaseModel):
    id: int
    code: str
    name: str
    unit: str
    active: bool
    version_tag: str | None


class SKUCreate(BaseModel):
    code: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=255)
    unit: str = Field(min_length=1, max_length=50)
    version_tag: str | None = None


class SKUPatch(BaseModel):
    name: str | None = None
    unit: str | None = None
    active: bool | None = None
    version_tag: str | None = ...  # type: ignore[assignment]

    model_config = {"arbitrary_types_allowed": True}


_SENTINEL = SKUPatch.model_fields["version_tag"].default


def _to_out(s: SKU) -> SKUOut:
    return SKUOut(
        id=s.id, code=s.code, name=s.name,
        unit=s.unit, active=s.active, version_tag=s.version_tag,
    )


@router.get("", response_model=list[SKUOut], dependencies=[Depends(get_current_user)])
def list_skus(db: Session = Depends(get_db)) -> list[SKUOut]:
    rows = db.execute(
        select(SKU).where(SKU.active.is_(True)).order_by(SKU.code)
    ).scalars().all()
    return [_to_out(s) for s in rows]


@router.post(
    "",
    response_model=SKUOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["admin"]))],
)
def create_sku(body: SKUCreate, db: Session = Depends(get_db)) -> SKUOut:
    exists = db.execute(select(SKU).where(SKU.code == body.code)).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "SKU code already exists")

    sku = SKU(code=body.code, name=body.name, unit=body.unit, version_tag=body.version_tag)
    db.add(sku)
    db.commit()
    db.refresh(sku)
    return _to_out(sku)


@router.patch(
    "/{sku_id}",
    response_model=SKUOut,
    dependencies=[Depends(require_role(["admin"]))],
)
def patch_sku(sku_id: int, body: SKUPatch, db: Session = Depends(get_db)) -> SKUOut:
    sku = db.get(SKU, sku_id)
    if sku is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SKU not found")

    if body.name is not None:
        sku.name = body.name
    if body.unit is not None:
        sku.unit = body.unit
    if body.active is not None:
        sku.active = body.active
    if body.version_tag is not _SENTINEL:
        sku.version_tag = body.version_tag

    db.commit()
    db.refresh(sku)
    return _to_out(sku)
