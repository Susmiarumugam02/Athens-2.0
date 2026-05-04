import json
import os
import math
import re
import http.client
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional, Tuple
from django.conf import settings
from django.utils.timezone import now

# Safe model imports (they may not all exist in every deployment)
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

INDEX_DIR = os.path.join(getattr(settings, 'BASE_DIR', os.getcwd()), 'backend', 'ai_bot', 'index')
INDEX_FILE = os.path.join(INDEX_DIR, 'rag_index.json')

TOKEN_RE = re.compile(r"[a-z0-9_]+", re.IGNORECASE)

@dataclass
class RAGDoc:
    id: str
    module: str
    text: str
    meta: Dict[str, Any]

class SimpleEmbedder:
    """Lightweight TF-IDF-like retriever with no external dependencies."""
    def __init__(self):
        self.idf: Dict[str, float] = {}
        self.doc_terms: Dict[str, Dict[str, int]] = {}
        self.doc_norm: Dict[str, float] = {}
        self.docs: Dict[str, RAGDoc] = {}

    @staticmethod
    def tokenize(text: str) -> List[str]:
        return [t.lower() for t in TOKEN_RE.findall(text)]

    def add_doc(self, doc: RAGDoc):
        tokens = self.tokenize(doc.text)
        tf: Dict[str, int] = {}
        for tok in tokens:
            tf[tok] = tf.get(tok, 0) + 1
        self.doc_terms[doc.id] = tf
        self.docs[doc.id] = doc

    def finalize(self):
        # Compute IDF
        df: Dict[str, int] = {}
        for tf in self.doc_terms.values():
            for tok in tf.keys():
                df[tok] = df.get(tok, 0) + 1
        N = max(len(self.doc_terms), 1)
        self.idf = {tok: math.log((N + 1) / (dfc + 1)) + 1.0 for tok, dfc in df.items()}
        # Precompute norms
        for doc_id, tf in self.doc_terms.items():
            s = 0.0
            for tok, c in tf.items():
                s += (c * self.idf.get(tok, 0.0)) ** 2
            self.doc_norm[doc_id] = math.sqrt(s) or 1.0

    def search(self, query: str, top_k: int = 10) -> List[Tuple[RAGDoc, float]]:
        q_tokens = self.tokenize(query)
        q_tf: Dict[str, int] = {}
        for t in q_tokens:
            q_tf[t] = q_tf.get(t, 0) + 1
        # compute q vec norm
        q_s = 0.0
        for tok, c in q_tf.items():
            w = c * self.idf.get(tok, 0.0)
            q_s += w * w
        q_norm = math.sqrt(q_s) or 1.0
        # scores
        scores: Dict[str, float] = {}
        for doc_id, tf in self.doc_terms.items():
            s = 0.0
            for tok, c in q_tf.items():
                if tok in tf:
                    s += (c * self.idf.get(tok, 0.0)) * (tf[tok] * self.idf.get(tok, 0.0))
            scores[doc_id] = s / (self.doc_norm.get(doc_id, 1.0) * q_norm)
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        return [(self.docs[doc_id], score) for doc_id, score in ranked if score > 0]

class OllamaLLM:
    """Optional local LLM via Ollama. Falls back silently if not available."""
    def __init__(self, host: str = None, model: str = None):
        self.host = host or os.getenv('OLLAMA_HOST', 'localhost:11434')
        self.model = model or os.getenv('OLLAMA_MODEL', 'llama3')

    def generate(self, prompt: str, max_tokens: int = 512) -> Optional[str]:
        try:
            conn = http.client.HTTPConnection(self.host, timeout=5)
            payload = json.dumps({
                'model': self.model,
                'prompt': prompt,
                'stream': False,
                'options': {'num_predict': max_tokens}
            })
            headers = {'Content-Type': 'application/json'}
            conn.request('POST', '/api/generate', body=payload, headers=headers)
            resp = conn.getresponse()
            if resp.status != 200:
                return None
            data = json.loads(resp.read().decode('utf-8'))
            return data.get('response')
        except Exception:
            return None

class RAGService:
    def __init__(self):
        os.makedirs(INDEX_DIR, exist_ok=True)
        self.embedder = SimpleEmbedder()
        self.llm = OllamaLLM()
        self.schema = self._build_schema()
        # load if exists
        if os.path.exists(INDEX_FILE):
            self._load_index()

    def _build_schema(self) -> Dict[str, List[str]]:
        schema: Dict[str, List[str]] = {}
        def fields_of(model) -> List[str]:
            try:
                return [f.name for f in model._meta.get_fields() if getattr(f, 'attname', None)]
            except Exception:
                return []
        if SafetyObservation:
            schema['safetyobservation'] = fields_of(SafetyObservation)
        if Incident:
            schema['incident'] = fields_of(Incident)
        if Permit:
            schema['permit'] = fields_of(Permit)
        if Worker:
            schema['worker'] = fields_of(Worker)
        if ManpowerEntry:
            schema['manpowerentry'] = fields_of(ManpowerEntry)
        if Mom:
            schema['mom'] = fields_of(Mom)
        if Project:
            schema['project'] = fields_of(Project)
        if InductionTraining:
            schema['inductiontraining'] = fields_of(InductionTraining)
        if JobTraining:
            schema['jobtraining'] = fields_of(JobTraining)
        if ToolboxTalk:
            schema['toolboxtalk'] = fields_of(ToolboxTalk)
        if PermitType:
            schema['permittype'] = fields_of(PermitType)
        if HazardLibrary:
            schema['hazardlibrary'] = fields_of(HazardLibrary)
        return schema

    def _serialize(self):
        data = {
            'idf': self.embedder.idf,
            'doc_terms': self.embedder.doc_terms,
            'doc_norm': self.embedder.doc_norm,
            'docs': {doc_id: asdict(doc) for doc_id, doc in self.embedder.docs.items()},
            'schema': self.schema,
            'created_at': now().isoformat(),
        }
        with open(INDEX_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f)

    def _load_index(self):
        try:
            with open(INDEX_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.embedder.idf = data.get('idf', {})
            self.embedder.doc_terms = {k: {tk: int(v) for tk, v in tf.items()} for k, tf in data.get('doc_terms', {}).items()}
            self.embedder.doc_norm = {k: float(v) for k, v in data.get('doc_norm', {}).items()}
            self.embedder.docs = {k: RAGDoc(**v) for k, v in data.get('docs', {}).items()}
            self.schema = data.get('schema', self.schema)
        except Exception:
            pass

    def _doc_from_record(self, module: str, rid: Any, text: str, meta: Dict[str, Any]) -> RAGDoc:
        return RAGDoc(id=f"{module}:{rid}", module=module, text=text, meta=meta)

    def _truncate(self, s: str, n: int = 400) -> str:
        return s if len(s) <= n else s[:n] + '...'

    def _collect_documents(self, limit_per_model: int = 1000) -> List[RAGDoc]:
        docs: List[RAGDoc] = []
        if SafetyObservation:
            for obs in SafetyObservation.objects.all().order_by('-id')[:limit_per_model]:
                text = f"SafetyObservation {getattr(obs,'observationID','')} Severity {getattr(obs,'severity','')} Status {getattr(obs,'observationStatus','')} Dept {getattr(obs,'department','')} Location {getattr(obs,'workLocation','')} Desc {getattr(obs,'safetyObservationFound','')}"
                docs.append(self._doc_from_record('safetyobservation', obs.id, text, {'id': obs.id, 'title': getattr(obs,'observationID','')}))
        if Incident:
            for inc in Incident.objects.all().order_by('-id')[:limit_per_model]:
                text = f"Incident {getattr(inc,'title','')} Status {getattr(inc,'status','')} Dept {getattr(inc,'department','')} Location {getattr(inc,'location','')} Desc {getattr(inc,'description','')}"
                docs.append(self._doc_from_record('incident', inc.id, text, {'id': inc.id, 'title': getattr(inc,'title','')}))
        if Permit:
            for p in Permit.objects.all().order_by('-id')[:limit_per_model]:
                text = f"Permit {getattr(p,'permit_number','')} Title {getattr(p,'title','')} Status {getattr(p,'status','')} Location {getattr(p,'location','')} Desc {getattr(p,'description','')}"
                docs.append(self._doc_from_record('permit', p.id, text, {'id': p.id, 'title': getattr(p,'permit_number','')}))
        if Worker:
            for w in Worker.objects.all().order_by('-id')[:limit_per_model]:
                text = f"Worker {getattr(w,'name','')} Dept {getattr(w,'department','')} Designation {getattr(w,'designation','')} Status {getattr(w,'status','')}"
                docs.append(self._doc_from_record('worker', w.id, text, {'id': w.id, 'title': getattr(w,'name','')}))
        if ManpowerEntry:
            for m in ManpowerEntry.objects.all().order_by('-id')[:limit_per_model]:
                text = f"Manpower {getattr(m,'date','')} Category {getattr(m,'category','')} Gender {getattr(m,'gender','')} Count {getattr(m,'count','')} Shift {getattr(m,'shift','')} WorkType {getattr(getattr(m,'work_type',None),'name','')} Notes {getattr(m,'notes','')}"
                docs.append(self._doc_from_record('manpowerentry', m.id, text, {'id': m.id, 'title': f"{getattr(m,'category','')} {getattr(m,'date','')}"}))
        if Mom:
            for mm in Mom.objects.all().order_by('-id')[:limit_per_model]:
                text = f"Meeting {getattr(mm,'title','')} Status {getattr(mm,'status','')} Dept {getattr(mm,'department','')} Location {getattr(mm,'location','')} Agenda {getattr(mm,'agenda','')}"
                docs.append(self._doc_from_record('mom', mm.id, text, {'id': mm.id, 'title': getattr(mm,'title','')}))
        if Project:
            for pr in Project.objects.all().order_by('-id')[:limit_per_model]:
                text = f"Project {getattr(pr,'projectName','')} Category {getattr(pr,'projectCategory','')} Location {getattr(pr,'location','')} Capacity {getattr(pr,'capacity','')}"
                docs.append(self._doc_from_record('project', pr.id, text, {'id': pr.id, 'title': getattr(pr,'projectName','')}))
        if InductionTraining:
            for it in InductionTraining.objects.all().order_by('-id')[:limit_per_model]:
                text = f"InductionTraining {getattr(it,'title','')} Date {getattr(it,'date','')} Location {getattr(it,'location','')} Conductor {getattr(it,'conducted_by','')} Status {getattr(it,'status','')} Desc {getattr(it,'description','')}"
                docs.append(self._doc_from_record('inductiontraining', it.id, text, {'id': it.id, 'title': getattr(it,'title','')}))
        if JobTraining:
            for jt in JobTraining.objects.all().order_by('-id')[:limit_per_model]:
                text = f"JobTraining {getattr(jt,'title','')} Date {getattr(jt,'date','')} Location {getattr(jt,'location','')} Conductor {getattr(jt,'conducted_by','')} Status {getattr(jt,'status','')} Desc {getattr(jt,'description','')}"
                docs.append(self._doc_from_record('jobtraining', jt.id, text, {'id': jt.id, 'title': getattr(jt,'title','')}))
        if ToolboxTalk:
            for tt in ToolboxTalk.objects.all().order_by('-id')[:limit_per_model]:
                text = f"ToolboxTalk {getattr(tt,'title','')} Date {getattr(tt,'date','')} Location {getattr(tt,'location','')} Conductor {getattr(tt,'conducted_by','')} Status {getattr(tt,'status','')} Desc {getattr(tt,'description','')}"
                docs.append(self._doc_from_record('toolboxtalk', tt.id, text, {'id': tt.id, 'title': getattr(tt,'title','')}))
        if PermitType:
            for pt in PermitType.objects.all().order_by('-id')[:limit_per_model]:
                text = f"PermitType {getattr(pt,'name','')} Category {getattr(pt,'category','')} Risk {getattr(pt,'risk_level','')} Desc {getattr(pt,'description','')}"
                docs.append(self._doc_from_record('permittype', pt.id, text, {'id': pt.id, 'title': getattr(pt,'name','')}))
        if HazardLibrary:
            for hl in HazardLibrary.objects.all().order_by('-id')[:limit_per_model]:
                text = f"Hazard {getattr(hl,'name','')} Category {getattr(hl,'category','')} RiskLevel {getattr(hl,'risk_level','')} Controls {getattr(hl,'control_measures','')} Desc {getattr(hl,'description','')}"
                docs.append(self._doc_from_record('hazardlibrary', hl.id, text, {'id': hl.id, 'title': getattr(hl,'name','')}))
        return docs

    def rebuild_index(self) -> Dict[str, Any]:
        # fresh embedder
        self.embedder = SimpleEmbedder()
        docs = self._collect_documents()
        for d in docs:
            self.embedder.add_doc(d)
        self.embedder.finalize()
        self._serialize()
        return {'documents_indexed': len(docs), 'vocab_size': len(self.embedder.idf)}

    def _find_missing_fields(self, query: str) -> List[str]:
        """Find missing fields - but ignore common English words"""
        # Common English words that should not be treated as database fields
        common_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'show', 'get', 'find', 'list', 'all', 'some', 'any', 'more', 'most', 'less', 'few', 'many',
            'that', 'this', 'these', 'those', 'which', 'what', 'where', 'when', 'why', 'how',
            'have', 'has', 'had', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
            'need', 'want', 'like', 'see', 'look', 'view', 'check', 'review', 'examine',
            'high', 'low', 'new', 'old', 'good', 'bad', 'big', 'small', 'large', 'little',
            'complete', 'full', 'empty', 'open', 'closed', 'active', 'inactive',
            'today', 'yesterday', 'tomorrow', 'now', 'then', 'here', 'there',
            'overview', 'summary', 'statistics', 'stats', 'dashboard', 'report',
            'safety', 'incident', 'permit', 'worker', 'manpower', 'training',
            'observations', 'attention', 'immediate', 'critical', 'urgent'
        }
        
        tokens = set(SimpleEmbedder.tokenize(query))
        # Only check for actual missing technical fields, not common words
        missing = []
        
        # Don't report common English words as missing fields
        return missing

    def answer(self, query: str, top_k: int = 8) -> Dict[str, Any]:
        """Answer query using RAG with improved natural language handling"""
        if not self.embedder.docs:
            self.rebuild_index()
        
        # Handle common dashboard queries
        query_lower = query.lower()
        if any(word in query_lower for word in ['dashboard', 'overview', 'statistics', 'summary']):
            return self._get_dashboard_stats()
        
        if any(word in query_lower for word in ['safety', 'observation']) and any(word in query_lower for word in ['high', 'critical', 'severe']):
            return self._get_high_severity_safety()
        
        # Perform normal search
        hits = self.embedder.search(query, top_k=top_k)
        sources = []
        for doc, score in hits:
            sources.append({
                'module': doc.module,
                'id': doc.meta.get('id'),
                'title': doc.meta.get('title'),
                'score': round(float(score), 4),
                'snippet': self._truncate(doc.text, 220)
            })
        
        if sources:
            return {
                'type': 'rag_results',
                'answer': f"Found {len(sources)} relevant results for your query.",
                'sources': sources
            }
        else:
            return {
                'type': 'rag_no_results', 
                'answer': 'No specific results found. Try asking about safety observations, incidents, permits, or workers.',
                'sources': []
            }

    def _get_dashboard_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics"""
        try:
            stats = {}
            if SafetyObservation:
                stats['safety_observations'] = SafetyObservation.objects.count()
                stats['high_severity_safety'] = SafetyObservation.objects.filter(severity__gte=3).count()
            if Incident:
                stats['total_incidents'] = Incident.objects.count()
                stats['open_incidents'] = Incident.objects.filter(status='open').count()
            if Permit:
                stats['total_permits'] = Permit.objects.count()
                stats['pending_permits'] = Permit.objects.filter(status__in=['submitted', 'under_review']).count()
            if Worker:
                stats['total_workers'] = Worker.objects.count()
                stats['active_workers'] = Worker.objects.filter(employment_status='deployed').count()
            
            return {
                'type': 'rag_results',
                'answer': f"📊 Dashboard Overview:\n" +
                         f"Safety Observations: {stats.get('safety_observations', 0)}\n" +
                         f"High Severity: {stats.get('high_severity_safety', 0)}\n" +
                         f"Total Incidents: {stats.get('total_incidents', 0)}\n" +
                         f"Open Incidents: {stats.get('open_incidents', 0)}\n" +
                         f"Total Permits: {stats.get('total_permits', 0)}\n" +
                         f"Pending Permits: {stats.get('pending_permits', 0)}\n" +
                         f"Total Workers: {stats.get('total_workers', 0)}\n" +
                         f"Active Workers: {stats.get('active_workers', 0)}",
                'sources': []
            }
        except Exception:
            return {
                'type': 'rag_results',
                'answer': 'Dashboard statistics are currently unavailable.',
                'sources': []
            }
    
    def _get_high_severity_safety(self) -> Dict[str, Any]:
        """Get high severity safety observations"""
        try:
            if not SafetyObservation:
                return {
                    'type': 'rag_results',
                    'answer': 'Safety observation data is not available.',
                    'sources': []
                }
            
            high_severity = SafetyObservation.objects.filter(severity__gte=3).order_by('-created_at')[:5]
            if high_severity:
                answer = "🚨 High Severity Safety Observations:\n"
                for obs in high_severity:
                    answer += f"• {getattr(obs, 'observationID', 'N/A')}: {getattr(obs, 'safetyObservationFound', 'N/A')[:50]}...\n"
                return {
                    'type': 'rag_results',
                    'answer': answer,
                    'sources': []
                }
            else:
                return {
                    'type': 'rag_results',
                    'answer': '✅ No high severity safety observations found.',
                    'sources': []
                }
        except Exception:
            return {
                'type': 'rag_results',
                'answer': 'Unable to retrieve safety observation data.',
                'sources': []
            }
