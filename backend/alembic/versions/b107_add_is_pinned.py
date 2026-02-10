"""add is_pinned to guestbooks

Revision ID: pinned_msg_rev
Revises: a9894cf517c1
Create Date: 2026-02-05 15:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'pinned_msg_rev'
down_revision: Union[str, Sequence[str], None] = 'a9894cf517c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('guestbooks', sa.Column('is_pinned', sa.Integer(), nullable=True, server_default='0'))
    # Update existing rows to have 0 if necessary (though server_default should handle it)
    op.execute("UPDATE guestbooks SET is_pinned = 0 WHERE is_pinned IS NULL")

def downgrade() -> None:
    op.drop_column('guestbooks', 'is_pinned')
