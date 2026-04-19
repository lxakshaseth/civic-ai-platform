import os
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

try:
    from openai import OpenAI
except Exception:  # pragma: no cover - optional runtime dependency
    OpenAI = None


app = FastAPI(title="SAIP AI Service", version="1.2.0")

API_KEY = os.getenv("AI_SERVICE_API_KEY", "change_me_ai_key").strip()
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "").strip().lower()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini").strip()
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "").strip()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").strip()

# Backward-compatibility for the current local setup where the Groq key was
# placed into AI_SERVICE_API_KEY instead of GROQ_API_KEY.
LEGACY_PROVIDER_KEY = API_KEY if API_KEY.startswith("gsk_") else ""

provider_name = "heuristic"
provider_model = "local-fallback"
openai_client = None

if OpenAI:
    if LLM_PROVIDER == "groq" or (not LLM_PROVIDER and (GROQ_API_KEY or LEGACY_PROVIDER_KEY)):
        provider_api_key = GROQ_API_KEY or LEGACY_PROVIDER_KEY
        if provider_api_key:
            openai_client = OpenAI(api_key=provider_api_key, base_url=GROQ_BASE_URL)
            provider_name = "groq"
            provider_model = GROQ_MODEL
    elif OPENAI_API_KEY:
        client_kwargs = {"api_key": OPENAI_API_KEY}
        if OPENAI_BASE_URL:
            client_kwargs["base_url"] = OPENAI_BASE_URL
        openai_client = OpenAI(**client_kwargs)
        provider_name = "openai"
        provider_model = OPENAI_MODEL


class ComplaintPayload(BaseModel):
    complaintId: str
    title: str
    description: str


class OcrPayload(BaseModel):
    evidenceId: str
    filePath: str


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatPayload(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
    userRole: str | None = None
    history: list[ChatHistoryItem] = Field(default_factory=list, max_length=8)


def validate_api_key(x_api_key: str | None) -> None:
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid AI service API key")


def heuristic_chat_reply(question: str) -> str:
    normalized = question.lower()

    if "status" in normalized or "progress" in normalized:
        return (
            "Complaint status depends on assignment, field evidence, and department review. "
            "If a case is still in progress, the execution team is usually completing work "
            "or waiting for final verification."
        )
    if "department" in normalized or "who handles" in normalized:
        return (
            "The responsible department is chosen from the complaint category, location, and "
            "service type. Water issues usually go to Water Supply, road issues to Public Works, "
            "and streetlight issues to Power and Utilities."
        )
    if "transparency" in normalized or "analytics" in normalized:
        return (
            "Transparency metrics include complaint volume, resolution rate, department "
            "performance, and hotspot trends. You can review these metrics from the public "
            "analytics and transparency dashboards."
        )
    if "complaint" in normalized and ("file" in normalized or "submit" in normalized):
        return (
            "To submit a complaint, provide a clear title, description, category, department, "
            "location, issue photos, and a digital signature so the department can process it faster."
        )

    return (
        "I can help with complaint status, departments, transparency metrics, evidence, and "
        "resolution timelines. Please share a little more detail so I can answer accurately."
    )


def generate_model_reply(payload: ChatPayload) -> str:
    if not openai_client:
        return heuristic_chat_reply(payload.question)

    system_prompt = (
        "You are the SAIP civic assistant for an Indian smart-city complaint platform. "
        "Answer clearly, professionally, and briefly. Focus on complaint tracking, departments, "
        "transparency metrics, evidence handling, and civic workflows. If the user asks for data "
        "that is not explicitly available, say so and give a helpful next step. Do not invent "
        "case-specific backend records."
    )

    input_items = [
        {
            "role": "system",
            "content": [{"type": "input_text", "text": system_prompt}],
        }
    ]

    for item in payload.history:
        input_items.append(
            {
                "role": item.role,
                "content": [{"type": "input_text", "text": item.content}],
            }
        )

    input_items.append(
        {
            "role": "user",
            "content": [{"type": "input_text", "text": payload.question}],
        }
    )

    try:
        response = openai_client.responses.create(
            model=provider_model,
            input=input_items,
            max_output_tokens=220,
        )
        answer = (response.output_text or "").strip()
        return answer or heuristic_chat_reply(payload.question)
    except Exception:
        return heuristic_chat_reply(payload.question)


@app.get("/health")
def health():
    return {
        "success": True,
        "message": "AI service is healthy",
        "provider": provider_name,
        "model": provider_model,
    }


@app.post("/v1/complaints/classify")
def classify_complaint(payload: ComplaintPayload, x_api_key: str | None = Header(default=None)):
    validate_api_key(x_api_key)

    category = "Roads"
    if "water" in payload.description.lower():
        category = "Water Supply"
    elif "light" in payload.description.lower():
        category = "Street Lighting"

    return {"category": category, "priority": "MEDIUM", "confidence": 0.82}


@app.post("/v1/complaints/priority")
def detect_priority(payload: ComplaintPayload, x_api_key: str | None = Header(default=None)):
    validate_api_key(x_api_key)

    description = payload.description.lower()
    priority = "MEDIUM"
    if "danger" in description or "accident" in description:
        priority = "HIGH"
    elif "minor" in description:
        priority = "LOW"

    return {"category": "N/A", "priority": priority, "confidence": 0.79}


@app.post("/v1/evidence/ocr")
def extract_ocr(payload: OcrPayload, x_api_key: str | None = Header(default=None)):
    validate_api_key(x_api_key)

    return {
        "text": f"Mock OCR result for {payload.evidenceId} from {payload.filePath}",
        "confidence": 0.74,
    }


@app.post("/v1/chat/reply")
def generate_chat_reply(payload: ChatPayload, x_api_key: str | None = Header(default=None)):
    validate_api_key(x_api_key)

    return {
        "answer": generate_model_reply(payload),
        "provider": provider_name,
        "model": provider_model,
    }
