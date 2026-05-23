"""
Athens AI — Vector Memory Service
Cosine-similarity semantic search over JSON-stored embeddings.
Works with SQLite today; swap embedding field for pgvector when on PostgreSQL.
Embeddings are generated via Gemini text-embedding or a lightweight fallback.
"""
import hashlib
import json
import logging
import math
import re
from typing import Optional

from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger('athens.ai')

# ─── Embedding generation ──────────────────────────────────────────────────────

def _tfidf_embedding(text: str, dim: int = 128) -> list[float]:
    """
    Lightweight deterministic embedding via character n-gram hashing.
    Used as fallback when Gemini embedding API is unavailable.
    Produces consistent vectors for the same text — good enough for
    keyword-level semantic similarity in industrial safety context.
    """
    text = re.sub(r'\s+', ' ', text.lower().strip())
    vec = [0.0] * dim
    words = text.split()
    for i, word in enumerate(words):
        # unigram
        h = int(hashlib.md5(word.encode()).hexdigest(), 16) % dim
        vec[h] += 1.0
        # bigram
        if i < len(words) - 1:
            bigram = word + '_' + words[i + 1]
            h2 = int(hashlib.md5(bigram.encode()).hexdigest(), 16) % dim
            vec[h2] += 0.5
    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def generate_embedding(text: str) -> list[float]:
    """
    Generate embedding for text.
    Tries Gemini embedding API first; falls back to TF-IDF hashing.
    """
    if not text or not text.strip():
        return [0.0] * 128

    # Try Gemini embedding (text-embedding-004)
    try:
        from .gemini_service import _get_client, GEMINI_API_KEY
        if GEMINI_API_KEY:
            client = _get_client()
            if client:
                result = client.models.embed_content(
                    model='models/text-embedding-004',
                    contents=text[:2000],
                )
                embedding = result.embeddings[0].values
                return list(embedding)
    except Exception as e:
        logger.debug(f'[VectorMemory] Gemini embedding failed, using fallback: {e}')

    return _tfidf_embedding(text)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a)) or 1.0
    norm_b = math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (norm_a * norm_b)


# ─── Index / Store ─────────────────────────────────────────────────────────────

def index_chunk(
    tenant_id: int,
    entity_type: str,
    entity_id: int,
    title: str,
    text: str,
    chunk_index: int = 0,
    tags: list | None = None,
    metadata: dict | None = None,
) -> None:
    """Store a text chunk with its embedding in AIKnowledgeChunk."""
    from .phase5_models import AIKnowledgeChunk
    if not text.strip():
        return
    embedding = generate_embedding(f"{title} {text}")
    AIKnowledgeChunk.objects.update_or_create(
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        chunk_index=chunk_index,
        defaults={
            'title': title[:255],
            'chunk_text': text[:4000],
            'embedding': embedding,
            'tags': tags or [],
            'relevance': 1.0,
        },
    )
    # Also store in AIVectorMemory for cross-entity search
    from .phase4_models import AIVectorMemory
    AIVectorMemory.objects.update_or_create(
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        chunk_index=chunk_index,
        defaults={
            'text_chunk': text[:4000],
            'embedding': embedding,
            'metadata': metadata or {'title': title, 'tags': tags or []},
        },
    )


def semantic_search(
    tenant_id: int,
    query: str,
    entity_types: list[str] | None = None,
    top_k: int = 5,
    min_score: float = 0.15,
) -> list[dict]:
    """
    Semantic search over AIKnowledgeChunk for a tenant.
    Returns top_k chunks sorted by cosine similarity.
    """
    from .phase5_models import AIKnowledgeChunk

    cache_key = f'vsearch:{tenant_id}:{hashlib.md5(query.encode()).hexdigest()[:12]}'
    cached = cache.get(cache_key)
    if cached:
        return cached

    query_vec = generate_embedding(query)

    qs = AIKnowledgeChunk.objects.filter(tenant_id=tenant_id)
    if entity_types:
        qs = qs.filter(entity_type__in=entity_types)

    results = []
    for chunk in qs.only('id', 'entity_type', 'entity_id', 'title', 'chunk_text', 'embedding', 'tags'):
        emb = chunk.embedding
        if not emb:
            continue
        score = cosine_similarity(query_vec, emb)
        if score >= min_score:
            results.append({
                'id': chunk.id,
                'entity_type': chunk.entity_type,
                'entity_id': chunk.entity_id,
                'title': chunk.title,
                'chunk_text': chunk.chunk_text,
                'tags': chunk.tags,
                'score': round(score, 4),
            })

    results.sort(key=lambda x: x['score'], reverse=True)
    top = results[:top_k]
    cache.set(cache_key, top, 120)
    return top


def retrieve_context_for_prompt(
    tenant_id: int,
    query: str,
    entity_types: list[str] | None = None,
    top_k: int = 4,
) -> str:
    """
    RAG retrieval: returns a formatted context string ready for prompt injection.
    """
    chunks = semantic_search(tenant_id, query, entity_types, top_k)
    if not chunks:
        return ''
    lines = []
    for c in chunks:
        lines.append(f"[{c['entity_type'].upper()} — {c['title']}]\n{c['chunk_text'][:400]}")
    return '\n\n'.join(lines)


# ─── Bulk indexing helpers ─────────────────────────────────────────────────────

def index_permit(permit) -> None:
    """Index a PTW permit into vector memory."""
    text = f"{permit.permit_type.name if permit.permit_type else ''} {permit.description} {permit.location} {permit.control_measures}"
    index_chunk(
        tenant_id=getattr(permit, 'project', None) and getattr(permit.project, 'athens_tenant_id', None) or 0,
        entity_type='ptw',
        entity_id=permit.id,
        title=f"PTW {permit.permit_number}",
        text=text,
        tags=[permit.permit_type.category if permit.permit_type else '', permit.status],
        metadata={'permit_number': permit.permit_number, 'status': permit.status},
    )


def index_knowledge_doc(tenant_id: int, doc_id: int, title: str, content: str,
                         doc_type: str, tags: list | None = None) -> None:
    """Index a knowledge document (SOP, manual, policy, etc.)."""
    # Chunk long documents into 500-word pieces
    words = content.split()
    chunk_size = 500
    for i, start in enumerate(range(0, len(words), chunk_size)):
        chunk = ' '.join(words[start:start + chunk_size])
        index_chunk(
            tenant_id=tenant_id,
            entity_type=doc_type,
            entity_id=doc_id,
            title=title,
            text=chunk,
            chunk_index=i,
            tags=tags or [doc_type],
        )
