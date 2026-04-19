# SAIP AI Service

Minimal FastAPI stub for local development of the SAIP backend.

## Endpoints

- `POST /v1/complaints/classify`
- `POST /v1/complaints/priority`
- `POST /v1/evidence/ocr`
- `POST /v1/chat/reply`

## Environment

Copy `.env.example` to `.env` and set:

- `AI_SERVICE_API_KEY` for backend-to-service authentication
- `LLM_PROVIDER=groq` if you want Groq as the live chat provider
- `GROQ_API_KEY` for live Groq chat responses
- `GROQ_MODEL` optionally, defaults to `llama-3.3-70b-versatile`
- `OPENAI_API_KEY` if you prefer OpenAI instead of Groq

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
