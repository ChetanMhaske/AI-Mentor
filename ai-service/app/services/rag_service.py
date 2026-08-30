"""
RAG Service — Retrieves relevant material chunks for lesson grounding.

STUB IMPLEMENTATION: Returns an empty list until vector DB integration
is completed.  The lesson planner handles empty chunks gracefully by
falling back to topic-only generation.
"""

import logging

logger = logging.getLogger(__name__)


async def retrieve_chunks(material_id: str) -> list[str]:
    """
    Retrieve the most relevant text chunks for a given material.

    TODO: Replace this stub with real vector DB queries once the
    embedding pipeline is in place:
      1. Look up material by ID
      2. Query the vector store for top-k similar chunks
      3. Return the chunk texts
    """
    logger.warning(
        "RAG stub called for material_id=%s — returning empty chunks. "
        "Wire up vector DB integration to enable material-grounded lessons.",
        material_id,
    )
    return []
