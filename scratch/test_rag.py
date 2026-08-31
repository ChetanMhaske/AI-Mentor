import asyncio
import os
import sys

# Add the app directory to the path so we can import rag_service
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ai-service"))

from app.services.rag_service import process_material, retrieve_chunks

async def main():
    # 1. Create a dummy text file in memory
    dummy_text = """
The Solar System is the gravitationally bound system of the Sun and the objects that orbit it. 
It was formed 4.6 billion years ago from the gravitational collapse of a giant interstellar molecular cloud. 
The vast majority of the system's mass is in the Sun, with most of the remaining mass contained in Jupiter.

Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System. 
It is a terrestrial planet with a thin atmosphere. Mars is often referred to as the "Red Planet" 
because of the iron oxide prevalent on its surface, which gives it a reddish appearance.
    """
    
    file_bytes = dummy_text.encode('utf-8')
    filename = "solar_system.txt"
    material_id = "test_mat_123"
    
    print("1. Processing material and adding to ChromaDB...")
    await process_material(file_bytes, filename, material_id)
    print("Done.\n")
    
    # 2. Query the chunks
    query = "Why is Mars called the Red Planet?"
    print(f"2. Querying for: '{query}'")
    
    chunks = await retrieve_chunks(material_id, query, top_k=2)
    
    print(f"\nFound {len(chunks)} relevant chunks:")
    for i, chunk in enumerate(chunks):
        print(f"\n--- Chunk {i+1} ---")
        print(chunk)
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(main())
