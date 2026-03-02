from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.rbac import require_role
from app.models.technique import Technique
from app.models.technique_alias import TechniqueAlias

router = APIRouter(
    prefix="/technique-aliases",
    tags=["technique-aliases"],
    dependencies=[Depends(require_role(["admin"]))],
)


class AliasOut(BaseModel):
    id: int
    alias_text: str
    technique_id: int
    note: str | None


class AliasCreate(BaseModel):
    alias_text: str = Field(min_length=1, max_length=255)
    technique_id: int
    note: str | None = None


class AliasPatch(BaseModel):
    alias_text: str | None = None
    technique_id: int | None = None
    note: str | None = ...  # type: ignore[assignment]


def _to_out(a: TechniqueAlias) -> AliasOut:
    return AliasOut(
        id=a.id, alias_text=a.alias_text,
        technique_id=a.technique_id, note=a.note,
    )


def _get_or_404(db: Session, alias_id: int) -> TechniqueAlias:
    alias = db.get(TechniqueAlias, alias_id)
    if alias is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alias not found")
    return alias


@router.get("", response_model=list[AliasOut])
def list_aliases(db: Session = Depends(get_db)) -> list[AliasOut]:
    rows = db.execute(
        select(TechniqueAlias).order_by(TechniqueAlias.id)
    ).scalars().all()
    return [_to_out(a) for a in rows]


@router.post("", response_model=AliasOut, status_code=status.HTTP_201_CREATED)
def create_alias(body: AliasCreate, db: Session = Depends(get_db)) -> AliasOut:
    technique = db.get(Technique, body.technique_id)
    if technique is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Technique not found")

    alias = TechniqueAlias(
        alias_text=body.alias_text,
        technique_id=body.technique_id,
        note=body.note,
    )
    db.add(alias)
    db.commit()
    db.refresh(alias)
    return _to_out(alias)


@router.patch("/{alias_id}", response_model=AliasOut)
def patch_alias(
    alias_id: int, body: AliasPatch, db: Session = Depends(get_db),
) -> AliasOut:
    alias = _get_or_404(db, alias_id)

    if body.alias_text is not None:
        alias.alias_text = body.alias_text
    if body.technique_id is not None:
        if db.get(Technique, body.technique_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Technique not found")
        alias.technique_id = body.technique_id
    if body.note is not ...:
        alias.note = body.note

    db.commit()
    db.refresh(alias)
    return _to_out(alias)


@router.delete("/{alias_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alias(alias_id: int, db: Session = Depends(get_db)) -> None:
    alias = _get_or_404(db, alias_id)
    db.delete(alias)
    db.commit()
