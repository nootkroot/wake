"""GemmaClient — wraps the OpenRouter REST API (OpenAI-compatible).

All methods are async. Raises GemmaError on failure.

Implementation notes:
* Uses httpx.AsyncClient. The client is reusable; pass `httpx_client` to inject
  a fake during tests.
* Defaults to ``google/gemma-4-26b-a4b-it:exacto`` via OpenRouter's chat
  completions endpoint. Override via the ``OPENROUTER_MODEL`` env var.
* OpenRouter does not expose a stable Gemma embedding endpoint, so embeddings
  always use the deterministic offline hash-embedding helper. This is enough
  for end-to-end demo flows; swap in a dedicated embedding provider for prod.
* If ``OPENROUTER_API_KEY`` is not configured the client also falls back to
  the offline scoring + translation heuristics.
"""
from __future__ import annotations

import hashlib
import json
import logging
import math
import re
from typing import Optional
from uuid import UUID, uuid4

import httpx

from ..config import get_settings
from ..schemas import (
    ChunkFilter,
    LegislationChunkCreate,
    RetrievedChunk,
    ScoringResult,
)
from ..models.common import GranularityLevel
from ..models.submission import SeverityRank

logger = logging.getLogger(__name__)


class GemmaError(RuntimeError):
    pass


SCORE_PROMPT = """You are a civic-issue triage assistant.
Read the title and body of a citizen submission and rate its SEVERITY on a
1–4 scale where:
  1 = LOW (cosmetic, minor inconvenience)
  2 = MODERATE (notable but non-urgent)
  3 = HIGH (impacts safety, livelihood, or accessibility)
  4 = CRITICAL (immediate threat, life safety, or systemic civil harm)

Optional context excerpts from local legislation may inform calibration.

Respond ONLY with strict JSON of the form:
{{"severity": <1|2|3|4>, "rationale": "<one short sentence>", "confidence": <0.0-1.0>}}

Title: {title}
Body: {body}
Context excerpts:
{context}
"""

LEGISLATION_QA_PROMPT = """You are a legislative analyst assistant.
Answer the user's question using ONLY the provided context excerpts.
If the context does not contain enough information, say that explicitly.
Keep the answer concise and factual. Include key numbers and years when present.

CRITICAL LANGUAGE RULES:
- Respond ONLY in this language code: {lang}
- Do not switch to English unless {lang} is English.
- If legal or budget terms are proper nouns, you may keep the official term, but all explanation text must remain in {lang}.
- If there is insufficient evidence, state that in {lang}.

User question:
{question}

Context excerpts:
{context}
"""


class GemmaClient:
    def __init__(self, httpx_client: httpx.AsyncClient | None = None) -> None:
        self._settings = get_settings()
        self._client = httpx_client
        self._owns_client = httpx_client is None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and self._owns_client:
            await self._client.aclose()
            self._client = None

    @property
    def offline(self) -> bool:
        return not self._settings.openrouter_api_key

    # ----------- Public API -----------

    async def score_submission(
        self,
        title: str,
        body: str,
        image_url: Optional[str] = None,
        context_chunks: list[str] | None = None,
    ) -> ScoringResult:
        context_chunks = context_chunks or []
        if self.offline:
            return _offline_score(title, body)

        prompt = SCORE_PROMPT.format(
            title=title,
            body=body,
            context="\n---\n".join(context_chunks) if context_chunks else "(none)",
        )
        try:
            data = await self._generate_text(prompt, expect_json=True)
        except Exception as exc:  # pragma: no cover - network failure path
            logger.exception("Gemma score request failed")
            raise GemmaError("Gemma scoring failed") from exc

        try:
            severity = SeverityRank(int(data["severity"]))
            rationale = str(data.get("rationale", "")).strip()[:500]
            confidence = float(data.get("confidence", 0.5))
        except (KeyError, ValueError) as exc:
            raise GemmaError(f"Invalid Gemma score response: {data}") from exc

        return ScoringResult(severity=severity, rationale=rationale, confidence=confidence)

    async def ingest_document(
        self,
        text: str,
        doc_id: UUID,
        doc_title: str,
        doc_source: str,
        granularity: GranularityLevel = GranularityLevel.CITY,
        source_verified: bool = False,
        chunk_size: int = 512,
        overlap: int = 64,
        ingestion_job_id: Optional[UUID] = None,
        lang: str = "en",
    ) -> list[LegislationChunkCreate]:
        chunks_text = _chunk_text(text, chunk_size=chunk_size, overlap=overlap)
        embeddings = await self.embed_texts(chunks_text)

        return [
            LegislationChunkCreate(
                doc_id=doc_id,
                doc_title=doc_title,
                doc_source=doc_source,
                source_verified=source_verified,
                chunk_index=idx,
                content=chunk,
                embedding=emb,
                granularity=granularity,
                lang=lang,
                ingestion_job_id=ingestion_job_id,
            )
            for idx, (chunk, emb) in enumerate(zip(chunks_text, embeddings))
        ]

    async def translate_chunks(
        self,
        chunks: list[str],
        target_lang: str,
    ) -> list[str]:
        if not chunks:
            return []
        if self.offline:
            return [f"[{target_lang}] {c}" for c in chunks]
        prompt = (
            f"Translate each numbered passage to {target_lang}. "
            "Preserve meaning, formal register, and any legal terminology. "
            "Respond with a JSON array of translated strings in the same order.\n\n"
        )
        for i, c in enumerate(chunks, 1):
            prompt += f"{i}. {c}\n\n"
        try:
            data = await self._generate_text(prompt, expect_json=True)
        except Exception as exc:  # pragma: no cover
            raise GemmaError("Gemma translate request failed") from exc

        if isinstance(data, list):
            return [str(x) for x in data]
        if isinstance(data, dict):
            if isinstance(data.get("translations"), list):
                return [str(x) for x in data["translations"]]
            numeric_keys = sorted((k for k in data.keys() if str(k).isdigit()), key=lambda x: int(str(x)))
            if numeric_keys:
                return [str(data[k]) for k in numeric_keys]
        raise GemmaError(f"Invalid translate response: {data!r}")

    async def query_legislation(
        self,
        query: str,
        vector_store,  # type: ignore[no-untyped-def]
        top_k: int = 5,
        lang: str = "en",
        chunk_filter: Optional[ChunkFilter] = None,
    ) -> list[RetrievedChunk]:
        embedding = (await self.embed_texts([query]))[0]
        return await vector_store.similarity_search(
            query_embedding=embedding,
            top_k=top_k,
            filter=chunk_filter,
            prefer_lang=lang,
        )

    async def answer_legislation_question(
        self,
        question: str,
        context_chunks: list[str],
        lang: str = "en",
    ) -> str:
        if not context_chunks:
            return _no_context_message(lang)
        if self.offline:
            return _offline_legislation_answer(question, context_chunks, lang)
        prompt = LEGISLATION_QA_PROMPT.format(
            question=question.strip(),
            lang=lang,
            context="\n\n---\n\n".join(context_chunks),
        )
        try:
            text = await self._generate_text(prompt, expect_json=False)
        except Exception as exc:  # pragma: no cover
            raise GemmaError("Gemma legislation QA request failed") from exc
        answer = str(text).strip()
        # Hard-enforce caller's language choice by post-translation.
        # This prevents mixed-language outputs even when the model drifts.
        target_lang = (lang or "en").strip().lower()
        if answer and target_lang and target_lang != "en":
            try:
                translated = await self.translate_chunks([answer], target_lang=target_lang)
                if translated and translated[0].strip():
                    answer = translated[0].strip()
            except GemmaError:
                # Keep original answer if translation fails.
                pass
        return answer[:4000] if answer else "No answer generated."

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        # OpenRouter doesn't expose a stable embedding endpoint for Gemma, so
        # we always use the deterministic offline hash-embedding helper here.
        # Replace this with a dedicated embedding provider (e.g. OpenAI or
        # a self-hosted text-embedding model) for production retrieval quality.
        if not texts:
            return []
        return [_offline_embed(t, dim=self._settings.embedding_dim) for t in texts]

    # ----------- Internals -----------

    async def _generate_text(self, prompt: str, expect_json: bool):
        client = await self._get_client()
        url = f"{self._settings.openrouter_api_base.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._settings.openrouter_api_key}",
            "HTTP-Referer": self._settings.openrouter_referer,
            "X-Title": self._settings.openrouter_app_title,
            "Content-Type": "application/json",
        }
        body: dict = {
            "model": self._settings.openrouter_model,
            "messages": [{"role": "user", "content": prompt}],
        }
        if expect_json:
            body["response_format"] = {"type": "json_object"}

        resp = await client.post(url, headers=headers, json=body)
        resp.raise_for_status()
        payload = resp.json()
        try:
            text = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise GemmaError(f"Unexpected OpenRouter response shape: {payload}") from exc
        if expect_json:
            return _parse_json_loose(text)
        return text


# ---------------- Helpers ----------------


def _parse_json_loose(text: str):
    """Parse JSON that may be wrapped in markdown fences or explanation prose."""
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    if not text.startswith("{") and not text.startswith("["):
        # Last-ditch attempt: pluck first JSON-looking substring.
        match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        if match:
            text = match.group(1)
    return json.loads(text)


def _chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    """Token-approximate chunker over whitespace-split words."""
    words = text.split()
    if not words:
        return []
    if chunk_size <= 0:
        return [" ".join(words)]
    chunks: list[str] = []
    step = max(1, chunk_size - overlap)
    for start in range(0, len(words), step):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
    return chunks


def _offline_score(title: str, body: str) -> ScoringResult:
    """Deterministic heuristic scoring for offline / demo use."""
    blob = f"{title}\n{body}".lower()
    severity = SeverityRank.LOW
    rationale = "Heuristic offline scoring (no API key configured)."
    critical_signals = ["fire", "shooting", "collapse", "death", "explosion", "flood", "outbreak"]
    high_signals = ["unsafe", "danger", "injur", "abuse", "harass", "lead", "asbestos", "evict"]
    moderate_signals = ["pothole", "noise", "trash", "graffiti", "parking", "lighting", "homeless"]

    if any(k in blob for k in critical_signals):
        severity = SeverityRank.CRITICAL
        rationale = "Mentions a life-safety or systemic civic harm signal."
    elif any(k in blob for k in high_signals):
        severity = SeverityRank.HIGH
        rationale = "Indicates safety or accessibility impact."
    elif any(k in blob for k in moderate_signals):
        severity = SeverityRank.MODERATE
        rationale = "Notable quality-of-life concern, non-urgent."

    confidence = 0.45 + 0.05 * min(8, len(body) // 80)
    return ScoringResult(severity=severity, rationale=rationale, confidence=round(confidence, 2))


def _offline_embed(text: str, dim: int = 768) -> list[float]:
    """
    Hash-based deterministic pseudo-embedding. Useful for demos when no API key
    is configured. NOT semantically meaningful, but supports cosine math.
    """
    digest = hashlib.sha512(text.encode("utf-8")).digest()
    raw: list[float] = []
    seed = int.from_bytes(digest[:8], "little", signed=False)
    for i in range(dim):
        seed = (seed * 6364136223846793005 + 1442695040888963407) & ((1 << 64) - 1)
        # Map to [-1, 1]
        raw.append(((seed >> 11) & 0xFFFFFFFF) / (1 << 32) * 2.0 - 1.0)
    norm = math.sqrt(sum(x * x for x in raw)) or 1.0
    return [x / norm for x in raw]


def _offline_legislation_answer(question: str, context_chunks: list[str], lang: str) -> str:
    joined = " ".join(context_chunks)[:1200]
    return (
        f"[{lang}] Based on available excerpts, this is the best match for your question "
        f"'{question}': {joined}"
    )


def _no_context_message(lang: str) -> str:
    code = (lang or "en").strip().lower()
    known = {
        "en": "I could not find relevant legislation excerpts to answer that question.",
        "es": "No pude encontrar fragmentos legislativos relevantes para responder esa pregunta.",
        "fr": "Je n'ai pas trouvé d'extraits législatifs pertinents pour répondre à cette question.",
        "de": "Ich konnte keine relevanten Gesetzesauszüge finden, um diese Frage zu beantworten.",
        "pt": "Nao encontrei trechos legislativos relevantes para responder a essa pergunta.",
        "it": "Non ho trovato estratti legislativi pertinenti per rispondere a questa domanda.",
        "zh": "我未能找到相关的立法内容来回答这个问题。",
        "ja": "この質問に答えるための関連する法令抜粋が見つかりませんでした。",
        "ko": "이 질문에 답할 관련 입법 문구를 찾지 못했습니다.",
        "ar": "لم أتمكن من العثور على مقاطع تشريعية ذات صلة للإجابة على هذا السؤال.",
        "hi": "मुझे इस प्रश्न का उत्तर देने के लिए प्रासंगिक विधायी अंश नहीं मिले।",
        "ru": "Я не нашел релевантных законодательных фрагментов для ответа на этот вопрос.",
        "tr": "Bu soruyu yanitlamak icin ilgili mevzuat bolumleri bulamadim.",
        "vi": "Toi khong tim thay doan lap phap phu hop de tra loi cau hoi nay.",
        "tl": "Wala akong mahanap na kaugnay na bahagi ng batas para sagutin ang tanong na ito.",
    }
    return known.get(code, known["en"])


def detect_language_code(text_value: str) -> str:
    text_lower = (text_value or "").strip().lower()
    if not text_lower:
        return "en"
    if re.search(r"[\u3040-\u30ff]", text_lower):
        return "ja"
    if re.search(r"[\u4e00-\u9fff]", text_lower):
        return "zh"
    if re.search(r"[\uac00-\ud7af]", text_lower):
        return "ko"
    if re.search(r"[\u0400-\u04ff]", text_lower):
        return "ru"
    if re.search(r"[\u0600-\u06ff]", text_lower):
        return "ar"
    if re.search(r"[\u0900-\u097f]", text_lower):
        return "hi"

    words = re.findall(r"[a-zA-Z0-9]+", text_lower)
    word_set = set(words)
    if not word_set:
        return "en"

    weighted_terms: dict[str, dict[str, int]] = {
        "en": {"what": 2, "was": 1, "the": 1, "budget": 2, "police": 2, "in": 1},
        "es": {"que": 2, "cual": 2, "presupuesto": 3, "policia": 3, "de": 1, "la": 1},
        "fr": {"quel": 3, "quelle": 3, "budget": 2, "police": 2, "pour": 1, "dans": 1},
        "de": {"wie": 2, "was": 1, "haushalt": 3, "polizei": 3, "jahr": 1},
        "pt": {"qual": 2, "orcamento": 3, "policia": 3, "em": 1, "ano": 1},
        "it": {"quale": 2, "bilancio": 3, "polizia": 3, "nel": 1, "anno": 1},
        "tr": {"butce": 3, "polis": 3, "nedir": 2, "icin": 1, "yilinda": 1},
        "vi": {"ngan": 2, "sach": 2, "canh": 2, "sat": 2, "nam": 1},
        "tl": {"ano": 2, "badyet": 3, "pulis": 3, "ang": 1},
    }

    best_lang = "en"
    best_score = 0
    for code, terms in weighted_terms.items():
        score = sum(weight for term, weight in terms.items() if term in word_set)
        if code == "es" and ("¿" in text_lower or "¡" in text_lower):
            score += 2
        if score > best_score:
            best_score = score
            best_lang = code
    return best_lang if best_score > 0 else "en"


# Convenience singleton accessor
_default_client: GemmaClient | None = None


def get_gemma_client() -> GemmaClient:
    global _default_client
    if _default_client is None:
        _default_client = GemmaClient()
    return _default_client
