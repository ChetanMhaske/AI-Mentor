"""
RAG Service — Retrieves relevant material chunks for lesson grounding.

STUB IMPLEMENTATION: Returns an empty list until vector DB integration
is completed. The lesson planner handles empty chunks gracefully by
falling back to topic-only generation.
"""

import logging
from typing import List

logger = logging.getLogger(__name__)

async def process_material(file_bytes: bytes, filename: str, material_id: str):
    """
    STUB: Extract text and store in ChromaDB.
    """
    logger.info("STUB: Processing material: %s (id: %s)", filename, material_id)
    return

async def retrieve_chunks(material_id: str, query: str = None, top_k: int = 5) -> List[str]:
    """
    STUB: Retrieve the most relevant text chunks.
    """
    logger.info("STUB: Retrieving chunks for material_id=%s, query=%s", material_id, query)
    return []

