import os
import re
from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from agent.rag import get_retriever
from agent.scanner import scan_url

class AgentState(TypedDict):
    # The `add_messages` function appends new messages to the existing list
    messages: Annotated[list[BaseMessage], add_messages]

def extract_url(text: str):
    # Basic regex to find a URL in text
    pattern = re.compile(r'(https?://[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)')
    match = pattern.search(text)
    if match:
        url = match.group(0)
        if not url.startswith("http"):
            url = "http://" + url
        return url
    return None

def agent_node(state: AgentState):
    """
    Main agent node that retrieves context and generates a response.
    """
    messages = state["messages"]
    
    # We look for the last HumanMessage
    user_query = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            user_query = msg.content
            break
            
    context_text = ""
    
    # 1. Check if user provided a URL to scan
    found_url = extract_url(user_query)
    if found_url:
        scan_result = scan_url(found_url)
        context_text += f"\n\n[URL SCAN RESULT FOR {found_url}]\n"
        context_text += f"Verdict: {scan_result['verdict']}\n"
        context_text += f"Confidence: {scan_result['confidence']}%\n"
        context_text += f"Reasons: {', '.join(scan_result['reasons'])}\n"
        context_text += f"Source: {scan_result['source']}\n"
        context_text += "Explain these results clearly to the user and warn them if it is malicious or suspicious.\n\n"

    # 2. Retrieve RAG context
    if user_query:
        try:
            retriever = get_retriever()
            docs = retriever.invoke(user_query)
            context_text += "\n\n".join([doc.page_content for doc in docs])
        except Exception as e:
            print(f"Error retrieving context: {e}")

    # 3. Setup LLM (gemini-3.1-flash-lite for snappy ~4s responses)
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite")
    except Exception as e:
        # Fallback if API key is missing or invalid
        return {"messages": [BaseMessage(content=f"Error initializing LLM: {e}", type="ai")]}

    # 3. Construct System Prompt with Context
    system_prompt = f"""You are CyberSentinel, an AI-powered cybersecurity awareness assistant.
Your goal is to educate users, provide clear answers, and guide them through security incidents.
Be concise, accurate, and easy for non-technical users to understand.

Here is some relevant context from your knowledge base to help answer the user's query:
<context>
{context_text}
</context>

If the answer is not in the context, use your general knowledge, but prioritize the provided context.
"""

    
    # We temporarily inject the system message at the start for the LLM call
    # We do not save the system message into the state history to save tokens on future turns
    llm_messages = [SystemMessage(content=system_prompt)] + messages
    
    # 4. Generate response
    response = llm.invoke(llm_messages)
    
    return {"messages": [response]}

# Define the graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("agent", agent_node)

# Set entry point
workflow.add_edge(START, "agent")
workflow.add_edge("agent", END)

# Compile the graph
app = workflow.compile()
