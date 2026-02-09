import os
import json
from typing import Any, Dict, List, Tuple, Optional
from django.db import transaction, connection
from django.conf import settings
from sentence_transformers import SentenceTransformer
from .models import DocEmbedding

# Safe imports from apps
try:
    from safetyobservation.models import SafetyObservation
except Exception:
    SafetyObservation = None
try:
    from incidentmanagement.models import Incident
except Exception:
    Incident = None
try:
    from ptw.models import Permit
except Exception:
    Permit = None
try:
    from worker.models import Worker
except Exception:
    Worker = None
try:
    from manpower.models import ManpowerEntry
except Exception:
    ManpowerEntry = None
try:
    from mom.models import Mom
except Exception:
    Mom = None
try:
    from authentication.models import Project
except Exception:
    Project = None

try:
    from inductiontraining.models import InductionTraining
except ImportError:
    InductionTraining = None

try:
    from jobtraining.models import JobTraining
except ImportError:
    JobTraining = None

try:
    from tbt.models import ToolboxTalk
except ImportError:
    ToolboxTalk = None

try:
    from ptw.models import PermitType, HazardLibrary
except ImportError:
    PermitType = HazardLibrary = None

try:
    from inductiontraining.models import InductionTraining
except ImportError:
    InductionTraining = None

try:
    from jobtraining.models import JobTraining
except ImportError:
    JobTraining = None

try:
    from tbt.models import ToolboxTalk
except ImportError:
    ToolboxTalk = None

try:
    from ptw.models import PermitType, HazardLibrary
except ImportError:
    PermitType = HazardLibrary = None

EMBED_DIM = 384  # all-MiniLM-L6-v2

class VectorRAGService:
    def __init__(self):
        model_name = os.getenv('EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
        self.model = SentenceTransformer(model_name)

    def _chunk_text(self, text: str, max_tokens: int = 256) -> List[str]:
        words = text.split()
        chunks, cur = [], []
        for w in words:
            cur.append(w)
            if len(cur) >= max_tokens:
                chunks.append(' '.join(cur))
                cur = []
        if cur:
            chunks.append(' '.join(cur))
        return chunks

    def _collect_records(self) -> List[Tuple[str, int, str, str]]:
        records = []
        if SafetyObservation:
            for o in SafetyObservation.objects.all().only('id','observationID','safetyObservationFound','department','workLocation','severity','observationStatus')[:5000]:
                title = getattr(o,'observationID','')
                text = f"SafetyObservation {title} Dept {getattr(o,'department','')} Location {getattr(o,'workLocation','')} Severity {getattr(o,'severity','')} Status {getattr(o,'observationStatus','')} Desc {getattr(o,'safetyObservationFound','')}"
                records.append(('safetyobservation', o.id, title, text))
        if Incident:
            for x in Incident.objects.all().only('id','title','description','status','department','location')[:5000]:
                records.append(('incident', x.id, getattr(x,'title',''), f"Incident {getattr(x,'title','')} Dept {getattr(x,'department','')} Loc {getattr(x,'location','')} Status {getattr(x,'status','')} Desc {getattr(x,'description','')}"))
        if Permit:
            for p in Permit.objects.all().only('id','permit_number','description','status','location','title')[:5000]:
                records.append(('permit', p.id, getattr(p,'permit_number',''), f"Permit {getattr(p,'permit_number','')} Title {getattr(p,'title','')} Status {getattr(p,'status','')} Location {getattr(p,'location','')} Desc {getattr(p,'description','')}"))
        if Worker:
            for w in Worker.objects.all().only('id','name','department','designation','status')[:5000]:
                records.append(('worker', w.id, getattr(w,'name',''), f"Worker {getattr(w,'name','')} Dept {getattr(w,'department','')} Designation {getattr(w,'designation','')} Status {getattr(w,'status','')}"))
        if ManpowerEntry:
            for m in ManpowerEntry.objects.all().only('id','date','category','gender','count','shift','notes')[:5000]:
                records.append(('manpowerentry', m.id, f"{getattr(m,'category','')} {getattr(m,'date','')}", f"Manpower {getattr(m,'date','')} Category {getattr(m,'category','')} Gender {getattr(m,'gender','')} Count {getattr(m,'count','')} Shift {getattr(m,'shift','')} Notes {getattr(m,'notes','')}"))
        if Mom:
            for mm in Mom.objects.all().only('id','title','agenda','status','department','location')[:5000]:
                records.append(('mom', mm.id, getattr(mm,'title',''), f"Meeting {getattr(mm,'title','')} Status {getattr(mm,'status','')} Dept {getattr(mm,'department','')} Location {getattr(mm,'location','')} Agenda {getattr(mm,'agenda','')}"))
        if Project:
            for pr in Project.objects.all().only('id','projectName','projectCategory','location','capacity')[:5000]:
                records.append(('project', pr.id, getattr(pr,'projectName',''), f"Project {getattr(pr,'projectName','')} Category {getattr(pr,'projectCategory','')} Location {getattr(pr,'location','')} Capacity {getattr(pr,'capacity','')}"))
        if InductionTraining:
            for it in InductionTraining.objects.all().only('id','title','description','date','location','conducted_by','status')[:5000]:
                records.append(('inductiontraining', it.id, getattr(it,'title',''), f"InductionTraining {getattr(it,'title','')} Date {getattr(it,'date','')} Location {getattr(it,'location','')} Conductor {getattr(it,'conducted_by','')} Status {getattr(it,'status','')} Desc {getattr(it,'description','')}"))
        if JobTraining:
            for jt in JobTraining.objects.all().only('id','title','description','date','location','conducted_by','status')[:5000]:
                records.append(('jobtraining', jt.id, getattr(jt,'title',''), f"JobTraining {getattr(jt,'title','')} Date {getattr(jt,'date','')} Location {getattr(jt,'location','')} Conductor {getattr(jt,'conducted_by','')} Status {getattr(jt,'status','')} Desc {getattr(jt,'description','')}"))
        if ToolboxTalk:
            for tt in ToolboxTalk.objects.all().only('id','title','description','date','location','conducted_by','status')[:5000]:
                records.append(('toolboxtalk', tt.id, getattr(tt,'title',''), f"ToolboxTalk {getattr(tt,'title','')} Date {getattr(tt,'date','')} Location {getattr(tt,'location','')} Conductor {getattr(tt,'conducted_by','')} Status {getattr(tt,'status','')} Desc {getattr(tt,'description','')}"))
        if PermitType:
            for pt in PermitType.objects.all().only('id','name','description','category','risk_level')[:5000]:
                records.append(('permittype', pt.id, getattr(pt,'name',''), f"PermitType {getattr(pt,'name','')} Category {getattr(pt,'category','')} Risk {getattr(pt,'risk_level','')} Desc {getattr(pt,'description','')}"))
        if HazardLibrary:
            for hl in HazardLibrary.objects.all().only('id','name','description','category','risk_level','control_measures')[:5000]:
                records.append(('hazardlibrary', hl.id, getattr(hl,'name',''), f"Hazard {getattr(hl,'name','')} Category {getattr(hl,'category','')} RiskLevel {getattr(hl,'risk_level','')} Controls {getattr(hl,'control_measures','')} Desc {getattr(hl,'description','')}"))
        return records

    @transaction.atomic
    def rebuild_index(self) -> Dict[str, Any]:
        # Ensure pgvector extension
        with connection.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        DocEmbedding.objects.all().delete()
        records = self._collect_records()
        total_chunks = 0
        batch_texts: List[str] = []
        batch_rows: List[Dict[str, Any]] = []
        BATCH = 256
        for module, rid, title, text in records:
            chunks = self._chunk_text(text)
            for ch in chunks:
                batch_texts.append(ch)
                batch_rows.append({'module': module, 'record_id': rid, 'title': title, 'chunk': ch})
                if len(batch_texts) >= BATCH:
                    vecs = self.model.encode(batch_texts, convert_to_numpy=True).tolist()
                    for row, emb in zip(batch_rows, vecs):
                        DocEmbedding.objects.create(
                            module=row['module'], record_id=row['record_id'], title=row['title'], chunk=row['chunk'], embedding=emb
                        )
                    total_chunks += len(batch_texts)
                    batch_texts, batch_rows = [], []
        if batch_texts:
            vecs = self.model.encode(batch_texts, convert_to_numpy=True).tolist()
            for row, emb in zip(batch_rows, vecs):
                DocEmbedding.objects.create(
                    module=row['module'], record_id=row['record_id'], title=row['title'], chunk=row['chunk'], embedding=emb
                )
            total_chunks += len(batch_texts)
        # Create index
        with connection.cursor() as cur:
            cur.execute("CREATE INDEX IF NOT EXISTS ai_bot_doc_embedding_idx ON ai_bot_docembedding USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);")
        return {'records': len(records), 'chunks': total_chunks}

    def query(self, question: str, top_k: int = 8, modules: Optional[List[str]] = None) -> Dict[str, Any]:
        q_emb = self.model.encode([question], convert_to_numpy=True)[0].tolist()
        # cosine distance: smaller is closer; we will compute via SQL
        with connection.cursor() as cur:
            if modules:
                cur.execute(
                    """
                    SELECT module, record_id, title, chunk, 1 - (embedding <#> %s::vector) AS score
                    FROM ai_bot_docembedding
                    WHERE module = ANY(%s)
                    ORDER BY embedding <#> %s::vector ASC
                    LIMIT %s
                    """,
                    [q_emb, modules, q_emb, top_k]
                )
            else:
                cur.execute(
                    """
                    SELECT module, record_id, title, chunk, 1 - (embedding <#> %s::vector) AS score
                    FROM ai_bot_docembedding
                    ORDER BY embedding <#> %s::vector ASC
                    LIMIT %s
                    """,
                    [q_emb, q_emb, top_k]
                )
            rows = cur.fetchall()
        sources = []
        for module, rid, title, chunk, score in rows:
            sources.append({
                'module': module,
                'id': rid,
                'title': title,
                'snippet': (chunk[:220] + '...') if len(chunk) > 220 else chunk,
                'score': round(float(score), 4)
            })
        answer = "Information not available in current database." if not sources else "Here are the most relevant results from your data."
        return {
            'type': 'rag_results' if sources else 'rag_no_results',
            'answer': answer,
            'sources': sources,
            'missing_fields': []
        }

