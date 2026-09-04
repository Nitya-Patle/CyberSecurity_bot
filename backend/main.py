from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage
from agent.graph import app as agent_app
from agent.scanner import scan_url
from agent.rag import get_retriever

app = FastAPI(title="CyberSentinel API")

# Pre-warm vector database on server startup
@app.on_event("startup")
def startup_event():
    try:
        print("Pre-warming CyberSentinel RAG Vectorstore...")
        get_retriever()
        print("RAG Vectorstore ready!")
    except Exception as e:
        print(f"RAG pre-warming notice: {e}")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[MessageItem]] = []

class ScanRequest(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to CyberSentinel API"}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "CyberSentinel Backend"}

@app.post("/api/scan-url")
def scan_endpoint(req: ScanRequest):
    return scan_url(req.url)

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    try:
        # Construct multi-turn message history
        input_messages = []
        if req.history:
            for item in req.history:
                if item.role == "user":
                    input_messages.append(HumanMessage(content=item.content))
                elif item.role in ["bot", "assistant", "ai"]:
                    input_messages.append(AIMessage(content=item.content))

        # Append current user query
        input_messages.append(HumanMessage(content=req.message))
        
        # Invoke the LangGraph agent with full conversational context
        input_state = {"messages": input_messages}
        output_state = agent_app.invoke(input_state)
        
        # Extract the last message (which should be the AI's response)
        final_message = output_state["messages"][-1].content
        
        # Defensive check to ensure we return a string to the React frontend
        if isinstance(final_message, list):
            text_blocks = []
            for block in final_message:
                if isinstance(block, dict) and "text" in block:
                    text_blocks.append(block["text"])
                elif isinstance(block, str):
                    text_blocks.append(block)
            final_message = "\n".join(text_blocks)
        elif not isinstance(final_message, str):
            final_message = str(final_message)
        
        return {"response": final_message}
    except Exception as e:
        return {"response": f"Error processing request: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
