from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Dataset, DatasetCase, User
from app.schemas.datasets import DatasetCaseCreateRequest, DatasetCaseResponse, DatasetDetail, DatasetSummary
from app.services.presenters import build_dataset_detail, build_dataset_summary
from app.utils.ids import generate_case_display_id


router = APIRouter()


def _load_dataset(db: Session, dataset_id: str) -> Dataset | None:
    return db.scalar(
        select(Dataset)
        .where(Dataset.id == dataset_id)
        .options(selectinload(Dataset.cases))
    )


@router.get("", response_model=list[DatasetSummary])
def list_datasets(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DatasetSummary]:
    datasets = db.scalars(
        select(Dataset).options(selectinload(Dataset.cases)).where(Dataset.active.is_(True))
    ).all()
    return [build_dataset_summary(dataset) for dataset in datasets]


@router.get("/{dataset_id}", response_model=DatasetDetail)
def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DatasetDetail:
    dataset = _load_dataset(db, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return build_dataset_detail(dataset)


@router.get("/{dataset_id}/cases", response_model=list[DatasetCaseResponse])
def list_dataset_cases(
    dataset_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DatasetCaseResponse]:
    dataset = _load_dataset(db, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return [DatasetCaseResponse.model_validate(case) for case in sorted(dataset.cases, key=lambda item: item.id)]


@router.post("/{dataset_id}/cases", response_model=DatasetCaseResponse, status_code=201)
def create_dataset_case(
    dataset_id: str,
    payload: DatasetCaseCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DatasetCaseResponse:
    dataset = _load_dataset(db, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    next_sequence = (db.query(DatasetCase).count() or 0) + 1
    case = DatasetCase(
        dataset_id=dataset.id,
        display_id=generate_case_display_id(next_sequence),
        prompt=payload.prompt,
        expected_behavior=payload.expected_behavior,
        criterion_type=payload.criterion_type,
        difficulty=payload.difficulty,
        tags=payload.tags,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return DatasetCaseResponse.model_validate(case)


@router.get("/{dataset_id}/export")
def export_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> JSONResponse:
    dataset = _load_dataset(db, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return JSONResponse(build_dataset_detail(dataset).model_dump(mode="json"))
