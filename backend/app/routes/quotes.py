import json
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.deps.auth import get_current_user
from app.deps.rbac import require_role
from app.models.quote import Quote, QuoteItem
from app.models.quote_result_line import QuoteResultLine
from app.models.sku import SKU
from app.models.technique import Technique
from app.models.user import User
from app.services.calc_engine import calculate_quote
from app.services.quote_status import CALCULABLE, EDITABLE, QuoteStatus, can_transition
from app.services.xlsx_export import xlsx_export

router = APIRouter(
    prefix="/quotes",
    tags=["quotes"],
    dependencies=[Depends(get_current_user)],
)


class QuoteItemIn(BaseModel):
    technique_id: int
    engine_option_id: int | None = None
    engine_text: str | None = None
    year: int | None = None
    qty: int = Field(ge=1)
    params_json: str | None = None


class QuoteCreate(BaseModel):
    customer_name: str | None = None
    comment: str | None = None
    zones: list[str] = Field(default_factory=list)
    items: list[QuoteItemIn] = Field(min_length=1, max_length=100)

    @field_validator("items")
    @classmethod
    def items_limit(cls, v: list[QuoteItemIn]) -> list[QuoteItemIn]:
        if len(v) > 100:
            raise ValueError("Maximum 100 items per quote")
        return v


class QuoteUpdate(BaseModel):
    customer_name: str | None = ...  # type: ignore[assignment]
    comment: str | None = ...  # type: ignore[assignment]
    zones: list[str] | None = None
    items: list[QuoteItemIn] | None = None

    model_config = {"arbitrary_types_allowed": True}

    @field_validator("items")
    @classmethod
    def items_limit(cls, v: list[QuoteItemIn] | None) -> list[QuoteItemIn] | None:
        if v is not None and len(v) > 100:
            raise ValueError("Maximum 100 items per quote")
        return v


_SENTINEL = QuoteUpdate.model_fields["customer_name"].default


class QuoteItemOut(BaseModel):
    id: int
    technique_id: int
    engine_option_id: int | None
    engine_text: str | None
    year: int | None
    qty: int
    params_json: str | None


class QuoteOut(BaseModel):
    id: int
    created_by: int
    status: str
    customer_name: str | None
    comment: str | None
    zones: list[str]
    items: list[QuoteItemOut]
    created_at: str
    updated_at: str


def _to_out(q: Quote) -> QuoteOut:
    return QuoteOut(
        id=q.id,
        created_by=q.created_by,
        status=q.status,
        customer_name=q.customer_name,
        comment=q.comment,
        zones=json.loads(q.zones_json) if q.zones_json else [],
        items=[
            QuoteItemOut(
                id=i.id, technique_id=i.technique_id,
                engine_option_id=i.engine_option_id, engine_text=i.engine_text,
                year=i.year, qty=i.qty, params_json=i.params_json,
            )
            for i in q.items
        ],
        created_at=q.created_at.isoformat(),
        updated_at=q.updated_at.isoformat(),
    )


class QuoteListItem(BaseModel):
    id: int
    created_by: int
    status: str
    customer_name: str | None
    items_count: int
    created_at: str
    updated_at: str


@router.post("", response_model=QuoteOut, status_code=status.HTTP_201_CREATED)
def create_quote(
    body: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuoteOut:
    quote = Quote(
        created_by=current_user.id,
        status=QuoteStatus.DRAFT,
        customer_name=body.customer_name,
        comment=body.comment,
        zones_json=json.dumps(body.zones, ensure_ascii=False) if body.zones else None,
    )
    for it in body.items:
        quote.items.append(QuoteItem(
            technique_id=it.technique_id,
            engine_option_id=it.engine_option_id,
            engine_text=it.engine_text,
            year=it.year,
            qty=it.qty,
            params_json=it.params_json,
        ))
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return _to_out(quote)


@router.get("", response_model=list[QuoteListItem])
def list_quotes(
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
) -> list[QuoteListItem]:
    stmt = select(Quote).options(selectinload(Quote.items)).order_by(Quote.updated_at.desc())

    if status_filter:
        stmt = stmt.where(Quote.status == status_filter)
    if search:
        pattern = f"%{search}%"
        technique_match = (
            select(QuoteItem.quote_id)
            .join(Technique, QuoteItem.technique_id == Technique.id)
            .where(
                Technique.manufacturer.ilike(pattern)
                | Technique.model.ilike(pattern)
                | Technique.series.ilike(pattern)
            )
        )
        stmt = stmt.where(
            Quote.customer_name.ilike(pattern)
            | Quote.id.in_(technique_match)
        )
    if date_from:
        stmt = stmt.where(Quote.created_at >= datetime(date_from.year, date_from.month, date_from.day))
    if date_to:
        stmt = stmt.where(Quote.created_at < datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59))

    rows = db.execute(stmt).scalars().all()
    return [
        QuoteListItem(
            id=q.id, created_by=q.created_by, status=q.status,
            customer_name=q.customer_name, items_count=len(q.items),
            created_at=q.created_at.isoformat(), updated_at=q.updated_at.isoformat(),
        )
        for q in rows
    ]


@router.get("/{quote_id}", response_model=QuoteOut)
def get_quote(quote_id: int, db: Session = Depends(get_db)) -> QuoteOut:
    q = db.execute(
        select(Quote).where(Quote.id == quote_id).options(selectinload(Quote.items))
    ).scalar_one_or_none()
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")
    return _to_out(q)


@router.put("/{quote_id}", response_model=QuoteOut)
def update_quote(
    quote_id: int,
    body: QuoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuoteOut:
    q = db.execute(
        select(Quote).where(Quote.id == quote_id).options(selectinload(Quote.items))
    ).scalar_one_or_none()
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")

    # НЕОПРЕДЕЛЕНО В ТЗ: ограничение видимости чужих КП.
    # Минимальная защита: редактировать может только автор или admin.
    if q.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the quote owner or admin can edit")

    if q.status not in EDITABLE:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Quote in status '{q.status}' cannot be edited. Allowed: {', '.join(EDITABLE)}",
        )

    if body.customer_name is not _SENTINEL:
        q.customer_name = body.customer_name
    if body.comment is not _SENTINEL:
        q.comment = body.comment
    if body.zones is not None:
        q.zones_json = json.dumps(body.zones, ensure_ascii=False)

    if body.items is not None:
        q.items.clear()
        for it in body.items:
            q.items.append(QuoteItem(
                technique_id=it.technique_id,
                engine_option_id=it.engine_option_id,
                engine_text=it.engine_text,
                year=it.year,
                qty=it.qty,
                params_json=it.params_json,
            ))

    db.commit()
    db.refresh(q)
    return _to_out(q)


class ResultLineOut(BaseModel):
    id: int
    sku_id: int
    sku_code: str | None = None
    sku_name: str | None = None
    sku_unit: str | None = None
    qty: int
    note: str | None


class CalcResultOut(BaseModel):
    quote_id: int
    status: str
    lines: list[ResultLineOut]


@router.post("/{quote_id}/calculate", response_model=CalcResultOut)
def calculate(quote_id: int, db: Session = Depends(get_db)) -> CalcResultOut:
    q = db.execute(select(Quote).where(Quote.id == quote_id)).scalar_one_or_none()
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")

    if q.status not in CALCULABLE:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot calculate quote in status '{q.status}'. Allowed: {', '.join(CALCULABLE)}",
        )

    lines = calculate_quote(db, quote_id)
    db.refresh(q)

    return CalcResultOut(
        quote_id=q.id,
        status=q.status,
        lines=_enrich_lines(lines, db),
    )


def _enrich_lines(lines: list[QuoteResultLine], db: Session) -> list[ResultLineOut]:
    sku_ids = {ln.sku_id for ln in lines}
    skus = {s.id: s for s in db.execute(select(SKU).where(SKU.id.in_(sku_ids))).scalars().all()} if sku_ids else {}
    result = []
    for ln in lines:
        s = skus.get(ln.sku_id)
        result.append(ResultLineOut(
            id=ln.id, sku_id=ln.sku_id,
            sku_code=s.code if s else None,
            sku_name=s.name if s else None,
            sku_unit=s.unit if s else None,
            qty=ln.qty, note=ln.note,
        ))
    return result


@router.get("/{quote_id}/result", response_model=list[ResultLineOut])
def get_result_lines(quote_id: int, db: Session = Depends(get_db)) -> list[ResultLineOut]:
    q = db.execute(select(Quote).where(Quote.id == quote_id)).scalar_one_or_none()
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")
    lines = list(db.execute(
        select(QuoteResultLine).where(QuoteResultLine.quote_id == quote_id).order_by(QuoteResultLine.id)
    ).scalars().all())
    return _enrich_lines(lines, db)


class ResultLinePatch(BaseModel):
    qty: int | None = None
    note: str | None = ...  # type: ignore[assignment]

    model_config = {"arbitrary_types_allowed": True}


_RL_SENTINEL = ResultLinePatch.model_fields["note"].default


RESULT_FROZEN = {QuoteStatus.CONFIRMED}


@router.patch("/{quote_id}/result/{line_id}", response_model=ResultLineOut)
def patch_result_line(
    quote_id: int,
    line_id: int,
    body: ResultLinePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResultLineOut:
    q = db.execute(select(Quote).where(Quote.id == quote_id)).scalar_one_or_none()
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")
    if q.status in RESULT_FROZEN:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot edit result lines on a confirmed quote")

    line = db.execute(
        select(QuoteResultLine).where(QuoteResultLine.id == line_id, QuoteResultLine.quote_id == quote_id)
    ).scalar_one_or_none()
    if line is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Result line not found")

    if body.qty is not None:
        if current_user.role != "admin":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admin can change qty")
        if body.qty < 1:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "qty must be >= 1")
        line.qty = body.qty

    if body.note is not _RL_SENTINEL:
        line.note = body.note

    db.commit()
    db.refresh(line)
    return _enrich_lines([line], db)[0]


class StatusChange(BaseModel):
    status: str
    comment: str | None = None


class StatusOut(BaseModel):
    id: int
    status: str


@router.post("/{quote_id}/status", response_model=StatusOut)
def change_status(
    quote_id: int,
    body: StatusChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["manager", "admin"])),
) -> StatusOut:
    q = db.execute(select(Quote).where(Quote.id == quote_id)).scalar_one_or_none()
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")

    if not can_transition(current_user.role, q.status, body.status):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Transition '{q.status}' → '{body.status}' is not allowed for role '{current_user.role}'",
        )

    q.status = body.status
    if body.comment is not None:
        q.comment = body.comment

    # ТЗ: «На_проверке_склада — автоматически после Согласовано_с_заказчиком»
    if q.status == QuoteStatus.APPROVED:
        q.status = QuoteStatus.WAREHOUSE_CHECK

    db.commit()
    db.refresh(q)
    return StatusOut(id=q.id, status=q.status)


class LineAvailability(BaseModel):
    line_id: int
    availability_status: Literal["in_stock", "to_order", "absent"]
    availability_comment: str | None = None


class WarehouseConfirmBody(BaseModel):
    decision: str = Field(pattern=r"^(confirmed|rework)$")
    comment: str | None = None
    lines: list[LineAvailability] = Field(default_factory=list)


@router.post("/{quote_id}/warehouse/confirm", response_model=StatusOut)
def warehouse_confirm(
    quote_id: int,
    body: WarehouseConfirmBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["warehouse"])),
) -> StatusOut:
    q = db.execute(select(Quote).where(Quote.id == quote_id)).scalar_one_or_none()
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")

    target = QuoteStatus.CONFIRMED if body.decision == "confirmed" else QuoteStatus.REWORK

    if not can_transition(current_user.role, q.status, target):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Transition '{q.status}' → '{target}' is not allowed for role '{current_user.role}'",
        )

    for la in body.lines:
        line = db.execute(
            select(QuoteResultLine).where(
                QuoteResultLine.id == la.line_id,
                QuoteResultLine.quote_id == quote_id,
            )
        ).scalar_one_or_none()
        if line is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Result line {la.line_id} not found")
        line.availability_status = la.availability_status
        line.availability_comment = la.availability_comment

    q.status = target
    if body.comment is not None:
        q.comment = body.comment

    db.commit()
    db.refresh(q)
    return StatusOut(id=q.id, status=q.status)


XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post("/{quote_id}/export/xlsx")
def export_xlsx(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    q = db.execute(select(Quote).where(Quote.id == quote_id)).scalar_one_or_none()
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")

    count = db.execute(
        select(func.count()).select_from(QuoteResultLine).where(QuoteResultLine.quote_id == quote_id)
    ).scalar_one()
    if count == 0:
        raise HTTPException(status.HTTP_409_CONFLICT, "Quote has no result lines — calculate first")

    data = xlsx_export(db, quote_id)

    return Response(
        content=data,
        media_type=XLSX_MIME,
        headers={"Content-Disposition": f'attachment; filename="quote_{quote_id}.xlsx"'},
    )
