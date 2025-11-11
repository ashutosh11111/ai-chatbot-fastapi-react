from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY
)

@app.post("/chat-stream")
async def chat_stream(request: Request):
    """Stream AI response to frontend"""
    data = await request.json()
    user_message = data.get("message")

    def generate():
        stream = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": user_message}
            ],
            stream=True
        )

        for chunk in stream:
            # ✅ Correct way to access content safely
            if chunk.choices and chunk.choices[0].delta:
                delta = getattr(chunk.choices[0].delta, "content", None)
                if delta:
                    yield delta

    return StreamingResponse(generate(), media_type="text/plain")


@app.get("/")
async def root():
    return {"message": "Groq Chat API is running!"}
