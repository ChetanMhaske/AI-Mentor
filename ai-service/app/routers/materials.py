from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import List, Dict, Any
from app.services.rag_service import process_material, retrieve_chunks
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/materials",
    tags=["materials"],
)

@router.post("/upload")
async def upload_material(
    file: UploadFile = File(...),
    material_id: str = Form(...)
):
    """
    Accepts a file upload (PDF, DOCX, PPTX, TXT), extracts text, chunks it,
    and stores it in ChromaDB tagged with the material_id.
    """
    logger.info("Received upload for material_id=%s, filename=%s", material_id, file.filename)
    
    try:
        file_bytes = await file.read()
        await process_material(file_bytes, file.filename, material_id)
        return {"status": "success", "message": "Material processed and stored in vector DB."}
    except Exception as e:
        logger.error("Error processing material upload: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{material_id}/query")
async def query_material(material_id: str, payload: dict):
    """
    Retrieve top relevant chunks for a given material.
    Payload: {"query": "optional natural language query", "top_k": 5}
    """
    query = payload.get("query")
    top_k = payload.get("top_k", 5)
    
    try:
        chunks = await retrieve_chunks(material_id, query, top_k)
        return {"chunks": chunks}
    except Exception as e:
        logger.error("Error querying material: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))
