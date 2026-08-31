"""
RAG Service — Retrieves relevant material chunks for lesson grounding.
"""

import logging
import io
import os
from typing import List
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google import genai
from app.config import settings

# Import parsers
import pdfplumber
from docx import Document
from pptx import Presentation

logger = logging.getLogger(__name__)

# Initialize local ChromaDB in a data directory
DATA_DIR = os.path.join(os.getcwd(), "chroma_data")
os.makedirs(DATA_DIR, exist_ok=True)
chroma_client = chromadb.PersistentClient(path=DATA_DIR)
collection = chroma_client.get_or_create_collection(name="materials")

_gemini_client: genai.Client | None = None

def _get_gemini_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        if not settings.LLM_API_KEY:
            raise RuntimeError("LLM_API_KEY is not configured — cannot use Gemini Embeddings.")
        _gemini_client = genai.Client(api_key=settings.LLM_API_KEY)
    return _gemini_client

def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().split(".")[-1]
    text = ""
    try:
        if ext == "pdf":
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        elif ext == "docx":
            doc = Document(io.BytesIO(file_bytes))
            for para in doc.paragraphs:
                text += para.text + "\n"
        elif ext == "pptx":
            prs = Presentation(io.BytesIO(file_bytes))
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
        elif ext == "txt":
            text = file_bytes.decode("utf-8", errors="ignore")
        else:
            logger.warning("Unsupported file extension: %s", ext)
    except Exception as e:
        logger.error("Error extracting text from %s: %s", filename, str(e))
    return text

async def process_material(file_bytes: bytes, filename: str, material_id: str):
    """
    Extract text, chunk it, embed, and store in ChromaDB.
    """
    logger.info("Processing material: %s (id: %s)", filename, material_id)
    text = extract_text(file_bytes, filename)
    
    if not text.strip():
        logger.warning("No text extracted from %s", filename)
        return

    # Chunking
    splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=100)
    chunks = splitter.split_text(text)
    
    if not chunks:
        logger.warning("No chunks generated for %s", filename)
        return
        
    logger.info("Generated %d chunks. Embedding...", len(chunks))
    
    # Generate IDs and Metadata
    ids = [f"{material_id}_{i}" for i in range(len(chunks))]
    metadatas = [{"material_id": material_id, "chunk_index": i, "filename": filename} for i in range(len(chunks))]
    
    # Embed using Gemini
    logger.info("Generating embeddings via Gemini API...")
    client = _get_gemini_client()
    resp = client.models.embed_content(
        model="text-embedding-004",
        contents=chunks
    )
    embeddings = [e.values for e in resp.embeddings]
    
    # Store
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )
    logger.info("Successfully stored %d chunks in ChromaDB for material %s.", len(chunks), material_id)

async def retrieve_chunks(material_id: str, query: str = None, top_k: int = 5) -> List[str]:
    """
    Retrieve the most relevant text chunks from Chroma DB.
    """
    logger.info("Retrieving chunks for material_id=%s, query=%s", material_id, query)
    
    if not query:
        # If no query, just return up to top_k chunks for this material (e.g. first chunks)
        results = collection.get(
            where={"material_id": material_id},
            limit=top_k
        )
        return results["documents"] if results and "documents" in results else []
        
    # Embed query using Gemini
    client = _get_gemini_client()
    resp = client.models.embed_content(
        model="text-embedding-004",
        contents=query
    )
    query_embedding = resp.embeddings[0].values
    
    # Query Chroma
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"material_id": material_id}
    )
    
    if results and "documents" in results and len(results["documents"]) > 0:
        return results["documents"][0]
    return []

