from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
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
    return AliasOut(
        id=alias.id, alias_text=alias.alias_text,
        technique_id=alias.technique_id, note=alias.note,
    )
