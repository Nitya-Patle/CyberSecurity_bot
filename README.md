# CyberSentinel

CyberSentinel is an AI-powered chatbot designed to help users understand, detect, and respond to cybersecurity threats in real time.

## Project Structure

This is a monorepo containing:
- `/frontend`: React frontend (Vite)
- `/backend`: FastAPI backend and LangGraph agent orchestrator

## Setup Instructions

### Backend
1. Navigate to `backend/`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `python main.py` or `uvicorn main:app --reload`
6. The API will be available at `http://localhost:8000` (Swagger UI at `/docs`)

### Frontend
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. The frontend will be available at `http://localhost:5173`
