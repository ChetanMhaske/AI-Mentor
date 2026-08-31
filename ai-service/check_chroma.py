import chromadb

c = chromadb.PersistentClient(path="chroma_data")
col = c.get_or_create_collection("materials")

# Delete all chunks with material_id="undefined" — these are from broken old uploads
results = col.get(where={"material_id": "undefined"})
print(f"Found {len(results['ids'])} orphaned chunks with material_id='undefined'")

if results["ids"]:
    col.delete(ids=results["ids"])
    print(f"Deleted {len(results['ids'])} orphaned chunks")
else:
    print("No orphaned chunks to delete")

# Verify
remaining = col.get()
print(f"\nRemaining chunks: {len(remaining['ids'])}")
for mid in set(m["material_id"] for m in remaining["metadatas"]):
    count = sum(1 for m in remaining["metadatas"] if m["material_id"] == mid)
    fname = next(m["filename"] for m in remaining["metadatas"] if m["material_id"] == mid)
    print(f"  {mid} ({fname}): {count} chunks")
