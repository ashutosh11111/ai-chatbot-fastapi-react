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

# In-memory storage for conversation history (use a database in production)
conversation_history = {}

def get_conversation_history(session_id: str):
    """Get or initialize conversation history for a session"""
    if session_id not in conversation_history:
        conversation_history[session_id] = [
            {"role": "system", "content": "You are a helpful AI assistant."}
        ]
    return conversation_history[session_id]

@app.post("/chat-stream")
async def chat_stream(request: Request):
    """Stream AI response to frontend"""
    data = await request.json()
    user_message = data.get("message")
    session_id = data.get("session_id", "default")  # Add session_id from frontend

    # Get conversation history for this session
    messages = get_conversation_history(session_id)
    
    # Add user's new message to history
    messages.append({"role": "user", "content": user_message})

    def generate():
        stream = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            stream=True
        )

        assistant_response = ""
        
        for chunk in stream:
            # ✅ Correct way to access content safely
            if chunk.choices and chunk.choices[0].delta:
                delta = getattr(chunk.choices[0].delta, "content", None)
                if delta:
                    assistant_response += delta
                    yield delta

        # Add assistant's response to conversation history
        if assistant_response:
            messages.append({"role": "assistant", "content": assistant_response})

    return StreamingResponse(generate(), media_type="text/plain")

@app.get("/")
async def root():
    return {"message": "Groq Chat API is running!"}

# Optional: Add endpoint to clear conversation history
@app.post("/clear-history")
async def clear_history(request: Request):
    """Clear conversation history for a session"""
    data = await request.json()
    session_id = data.get("session_id")
    
    if session_id in conversation_history:
        # Keep system message but clear conversation history
        conversation_history[session_id] = [
            {"role": "system", "content": "You are a helpful AI assistant."}
        ]
        return {"message": "Conversation history cleared"}
    else:
        return {"message": "Session not found"}
