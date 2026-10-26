"""Encrypted A1 credentials, DPS sequences and national NFS-e requests."""
from alembic import op
from app.models.nfse import NfseCertificate, NfseSequence, NfseEmission

revision = "20261025_0007"
down_revision = "20260809_0006"
branch_labels = None
depends_on = None


def upgrade():
    for model in (NfseCertificate, NfseSequence, NfseEmission):
        model.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    for model in (NfseEmission, NfseSequence, NfseCertificate):
        model.__table__.drop(op.get_bind(), checkfirst=True)
