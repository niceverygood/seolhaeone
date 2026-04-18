"""
OpenRouter 기반 LLM 호출 래퍼.

- OPENROUTER_API_KEY가 없으면 llm_available() = False, 호출부에서 rule-based로 우회.
- 모델 기본값은 가성비 좋은 gpt-4o-mini. OPENROUTER_MODEL로 오버라이드 가능.
"""
from __future__ import annotations

import os

import httpx

_API_URL = "https://openrouter.ai/api/v1/chat/completions"
_DEFAULT_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
_TIMEOUT = float(os.environ.get("OPENROUTER_TIMEOUT", "20"))


def llm_available() -> bool:
    return bool(os.environ.get("OPENROUTER_API_KEY"))


def chat(
    system: str,
    user: str,
    *,
    model: str | None = None,
    max_tokens: int = 800,
    temperature: float = 0.4,
) -> str:
    """
    OpenRouter chat completion 단발 호출.
    실패 시 예외 발생 (호출부에서 try/except 처리 필요).
    """
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        # OpenRouter 권장: referrer / app name (선택이지만 분석용으로 유용)
        "HTTP-Referer": "https://seolhaeone.vercel.app",
        "X-Title": "Seolhaewon AI CRM",
    }
    payload = {
        "model": model or _DEFAULT_MODEL,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    with httpx.Client(timeout=_TIMEOUT) as client:
        res = client.post(_API_URL, headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()
    return data["choices"][0]["message"]["content"].strip()
