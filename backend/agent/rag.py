import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import MarkdownTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv

load_dotenv()

# Global variable to hold the retriever so we don't rebuild it on every request
_retriever = None

def get_retriever():
    global _retriever
    if _retriever is not None:
        return _retriever

    persist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".chroma_db"))
    embedding_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2")

    # Make sure we have an API key before trying to embed
    if not os.environ.get("GOOGLE_API_KEY"):
        print("WARNING: GOOGLE_API_KEY is not set. RAG embeddings will fail.")

    # If the database already exists and has data, load it directly
    if os.path.exists(persist_dir) and len(os.listdir(persist_dir)) > 0:
        print("Loading existing Vector Database from disk...")
        vectorstore = Chroma(
            persist_directory=persist_dir,
            embedding_function=embedding_model
        )
    else:
        print("Creating Vector Database from data.md...")
        # Path to our sample data
        data_path = os.path.join(os.path.dirname(__file__), "..", "knowledge_base", "data.md")
        loader = TextLoader(data_path)
        docs = loader.load()

        # Split document
        splitter = MarkdownTextSplitter(chunk_size=500, chunk_overlap=50)
        splits = splitter.split_documents(docs)

        # Create embeddings and vector store
        vectorstore = Chroma.from_documents(
            documents=splits,
            embedding=embedding_model,
            persist_directory=persist_dir
        )
    
    # Create retriever
    _retriever = vectorstore.as_retriever(search_kwargs={"k": 2})
    return _retriever
