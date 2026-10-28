import uuid

import pytest
from pydantic import ValidationError

from app.models.work_item import WorkItemType
from app.schemas.work_item import WorkItemCreate


def test_crs_requires_parent() -> None:
    with pytest.raises(ValidationError):
        WorkItemCreate(key="CRS-1", item_type=WorkItemType.CRS, title="Child request")


def test_cr_accepts_no_parent() -> None:
    payload = WorkItemCreate(key="CR-1", item_type=WorkItemType.CR, title="Parent request")
    assert payload.parent_id is None


def test_cr_rejects_parent() -> None:
    with pytest.raises(ValidationError):
        WorkItemCreate(
            key="CR-2",
            item_type=WorkItemType.CR,
            parent_id=uuid.uuid4(),
            title="Invalid parent",
        )

