# app.py
from fastapi import FastAPI
from pydantic import BaseModel
import chromadb
from chromadb.config import Settings

app = FastAPI()

# Use persistent storage (DuckDB + Parquet) in a folder “./db”
client = chromadb.Client(Settings(
    chroma_db_impl="duckdb+parquet",
    persist_directory="db"
))

class AddRequest(BaseModel):
    id: str
    document: str
    embedding: list[float]

@app.post("/add")
def add_item(req: AddRequest):
    collection = client.get_or_create_collection("default")
    collection.add(
        ids=[req.id],
        documents=[req.document],
        embeddings=[req.embedding]
    )
    return {"status": "ok"}

class QueryRequest(BaseModel):
    embedding: list[float]
    n_results: int = 5

@app.post("/query")
def query(req: QueryRequest):
    collection = client.get_or_create_collection("default")
    results = collection.query(
        query_embeddings=[req.embedding],
        n_results=req.n_results
    )
    return results
