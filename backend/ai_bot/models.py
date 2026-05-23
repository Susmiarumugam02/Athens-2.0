from django.db import models


class DocEmbedding(models.Model):
    """
    Semantic document embedding store.
    Uses JSONField for embeddings (SQLite-compatible).
    Swap embedding field for pgvector VectorField when on PostgreSQL + pgvector.
    """
    module = models.CharField(max_length=64, db_index=True)
    record_id = models.IntegerField(db_index=True)
    title = models.CharField(max_length=256, blank=True)
    chunk = models.TextField()
    embedding = models.JSONField(default=list)  # 384-dim list; swap for VectorField on pgvector
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('module', 'record_id', 'chunk')
        indexes = [
            models.Index(fields=['module', 'record_id']),
        ]

    def __str__(self):
        return f'{self.module}:{self.record_id} — {self.title[:60]}'
