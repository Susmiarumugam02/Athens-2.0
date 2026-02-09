from django.db import models
from pgvector.django import VectorField

class DocEmbedding(models.Model):
    module = models.CharField(max_length=64, db_index=True)
    record_id = models.IntegerField(db_index=True)
    title = models.CharField(max_length=256, blank=True)
    chunk = models.TextField()
    embedding = VectorField(dimensions=384)  # for all-MiniLM-L6-v2 embeddings
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("module", "record_id", "chunk")
        indexes = [
            models.Index(fields=["module", "record_id"]),
        ]

