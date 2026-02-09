import json
import http.client
from typing import Any, Dict, List, Tuple, Optional
from .vector_rag_service import VectorRAGService
from .rag_service import RAGService

MODULE_KEYWORDS = {
    'safetyobservation': ['safety', 'observation', 'unsafe', 'ppe', 'risk', 'hazard'],
    'incident': ['incident', 'accident', 'mishap', 'emergency'],
    'permit': ['permit', 'ptw', 'work permit'],
    'worker': ['worker', 'employee', 'staff', 'manpower'],
    'manpowerentry': ['manpower', 'attendance', 'headcount', 'workforce'],
    'mom': ['meeting', 'minutes', 'agenda', 'mom'],
    'project': ['project', 'site']
}

class HybridRAGService:
    def __init__(self, vector_weight: float = 0.7, sparse_weight: float = 0.3):
        self.vector = VectorRAGService()
        self.sparse = RAGService()
        self.vector_weight = vector_weight
        self.sparse_weight = sparse_weight

    def _route_modules(self, query: str) -> Optional[List[str]]:
        q = query.lower()
        hits = []
        for module, kws in MODULE_KEYWORDS.items():
            if any(k in q for k in kws):
                hits.append(module)
        return hits or None

    def _merge_sources(self, v_sources: List[Dict[str, Any]], s_sources: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
        scores: Dict[Tuple[str, int], float] = {}
        meta: Dict[Tuple[str, int], Dict[str, Any]] = {}
        for src in v_sources:
            key = (src['module'], src['id'])
            scores[key] = scores.get(key, 0.0) + self.vector_weight * float(src.get('score', 0))
            meta[key] = src
        for src in s_sources:
            key = (src['module'], src['id'])
            scores[key] = scores.get(key, 0.0) + self.sparse_weight * float(src.get('score', 0))
            if key not in meta:
                meta[key] = src
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        out = []
        for (module, rid), sc in ranked:
            m = meta[(module, rid)].copy()
            m['score'] = round(sc, 4)
            out.append(m)
        return out

    def query(self, question: str, top_k: int = 8) -> Dict[str, Any]:
        modules = self._route_modules(question)
        v_res = self.vector.query(question, top_k=top_k, modules=modules)
        v_sources = v_res.get('sources', [])
        s_res = self.sparse.answer(question)
        s_sources = s_res.get('sources', []) if isinstance(s_res, dict) else []
        sources = self._merge_sources(v_sources, s_sources, top_k)
        answer = "Information not available in current database." if not sources else "Here are the most relevant results from your data."
        return {
            'type': 'rag_results' if sources else 'rag_no_results',
            'answer': answer,
            'sources': sources,
            'missing_fields': []
        }

