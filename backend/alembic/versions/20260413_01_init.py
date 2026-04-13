"""Initial schema.

Revision ID: 20260413_01
Revises:
Create Date: 2026-04-13 20:30:00
"""

from alembic import op

from app.db.base import metadata


revision = "20260413_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    metadata.drop_all(bind=op.get_bind())
