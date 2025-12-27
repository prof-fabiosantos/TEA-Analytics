import { GoogleGenAI } from "@google/genai";
import { Report, RAGChunk } from "../types";

// In-memory store for embeddings (Client-side RAG)
// In a full production app, this might be stored in IndexedDB or a Vector DB.
let vectorStore: RAGChunk[] = [];
let isIndexed = false;

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  return new GoogleGenAI({ apiKey });
};

// 1. CHUNKING: Split text into manageable pieces with overlap
const chunkText = (text: string, chunkSize: number = 500, overlap: number = 100): string[] => {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += (chunkSize - overlap);
  }
  
  return chunks;
};

// 2. EMBEDDING: Convert text to vectors using Gemini
const generateEmbedding = async (text: string): Promise<number[]> => {
  const ai = getAiClient();
  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    content: { parts: [{ text }] }
  });
  
  return response.embedding?.values || [];
};

// 3. COSINE SIMILARITY: Math to find closest vectors
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// MAIN FUNCTIONS

// Index all reports (Run this when opening chat or adding reports)
export const indexReports = async (reports: Report[]): Promise<void> => {
  console.log("Starting RAG Indexing...");
  vectorStore = [];
  
  // Create chunks
  for (const report of reports) {
    const textChunks = chunkText(report.content);
    
    for (const [index, text] of textChunks.entries()) {
      vectorStore.push({
        id: `${report.id}_${index}`,
        reportId: report.id,
        reportDate: report.date,
        reportType: report.type,
        content: text
      });
    }
  }

  // Generate embeddings in batches to avoid rate limits
  // Note: Client-side sequential generation is slow but safer for rate limits on free tier
  for (let i = 0; i < vectorStore.length; i++) {
    try {
      vectorStore[i].embedding = await generateEmbedding(vectorStore[i].content);
      // Small delay to be gentle on API
      await new Promise(r => setTimeout(r, 100)); 
    } catch (e) {
      console.error(`Failed to embed chunk ${i}`, e);
    }
  }
  
  isIndexed = true;
  console.log(`RAG Indexing complete. ${vectorStore.length} chunks created.`);
};

// Retrieve most relevant chunks
export const retrieveRelevantChunks = async (query: string, limit: number = 5): Promise<RAGChunk[]> => {
  if (!isIndexed || vectorStore.length === 0) return [];

  try {
    const queryEmbedding = await generateEmbedding(query);
    
    const scoredChunks = vectorStore.map(chunk => {
      if (!chunk.embedding) return { ...chunk, score: -1 };
      return {
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding)
      };
    });

    // Sort by score descending
    scoredChunks.sort((a, b) => b.score - a.score);
    
    return scoredChunks.slice(0, limit);
  } catch (e) {
    console.error("RAG Retrieval failed", e);
    return [];
  }
};