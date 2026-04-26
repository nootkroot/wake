from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas import UiTranslateRequest, UiTranslateResponse
from ..services.gemma import GemmaError, get_gemma_client

router = APIRouter(prefix="/i18n", tags=["i18n"])


@router.post("/translate-ui", response_model=UiTranslateResponse)
async def translate_ui(payload: UiTranslateRequest) -> UiTranslateResponse:
    target_lang = payload.target_lang.strip().lower()
    texts = [t.strip() for t in payload.texts if t and t.strip()]
    if not texts:
        return UiTranslateResponse(target_lang=target_lang, translations=[])
    if target_lang == "en":
        return UiTranslateResponse(target_lang=target_lang, translations=texts)
    if len(texts) > 500:
        raise HTTPException(status_code=422, detail="Too many text items")

    gemma = get_gemma_client()
    try:
        translated = await gemma.translate_chunks(texts, target_lang=target_lang)
    except GemmaError as exc:
        raise HTTPException(status_code=502, detail="Translation failed") from exc
    if len(translated) != len(texts):
        raise HTTPException(status_code=502, detail="Translation size mismatch")
    return UiTranslateResponse(target_lang=target_lang, translations=translated)

