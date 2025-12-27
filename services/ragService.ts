import { GoogleGenAI } from "@google/genai";
import { Report, RAGChunk } from "../types";

// In-memory store for embeddings (Client-side RAG)
let vectorStore: RAGChunk[] = [];
// Armazena os IDs dos relatórios atualmente indexados para evitar reprocessamento desnecessário
let indexedReportIds = new Set<string>();

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  return new GoogleGenAI({ apiKey });
};

// 1. CHUNKING: Split text into manageable pieces with overlap
// Aumentado para 1000 caracteres para capturar parágrafos mais completos
const chunkText = (text: string, chunkSize: number = 1000, overlap: number = 200): string[] => {
  const chunks: string[] = [];
  let start = 0;
  
  // Limpeza básica antes de dividir
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    chunks.push(cleanText.slice(start, end));
    start += (chunkSize - overlap);
  }
  
  return chunks;
};

// 2. EMBEDDING: Convert text to vectors using Gemini
const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: { parts: [{ text }] }
    });
    
    return response.embeddings?.[0]?.values || [];
  } catch (error) {
    console.error("Error generating embedding:", error);
    return [];
  }
};

// 3. COSINE SIMILARITY: Math to find closest vectors
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
};

// MAIN FUNCTIONS

// Index all reports (Run this when opening chat or adding reports)
export const indexReports = async (reports: Report[]): Promise<void> => {
  const currentReportIds = new Set(reports.map(r => r.id));

  // Verifica se os relatórios mudaram. Se forem os mesmos, não reindexa.
  const isSameSet = currentReportIds.size === indexedReportIds.size && 
                    [...currentReportIds].every(id => indexedReportIds.has(id));

  if (isSameSet && vectorStore.length > 0) {
    console.log("RAG: Relatórios já indexados e sem alterações. Pulando indexação.");
    return;
  }

  console.log("RAG: Iniciando indexação de documentos...");
  vectorStore = [];
  indexedReportIds = currentReportIds;
  
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
  console.log(`RAG: Gerando embeddings para ${vectorStore.length} chunks...`);
  for (let i = 0; i < vectorStore.length; i++) {
    try {
      vectorStore[i].embedding = await generateEmbedding(vectorStore[i].content);
      // Small delay to be gentle on API
      await new Promise(r => setTimeout(r, 50)); 
    } catch (e) {
      console.error(`Failed to embed chunk ${i}`, e);
    }
  }
  
  console.log(`RAG: Indexação completa.`);
};

// Retrieve most relevant chunks
export const retrieveRelevantChunks = async (query: string, limit: number = 8): Promise<RAGChunk[]> => {
  if (vectorStore.length === 0) return [];

  try {
    const queryEmbedding = await generateEmbedding(query);
    if (queryEmbedding.length === 0) return [];
    
    const scoredChunks = vectorStore.map(chunk => {
      if (!chunk.embedding) return { ...chunk, score: -1 };
      return {
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding)
      };
    });

    // Sort by score descending and filter low relevance
    const relevant = scoredChunks
      .sort((a, b) => b.score - a.score)
      .filter(chunk => chunk.score > 0.35); // Filtro mínimo de relevância
    
    console.log(`RAG: Encontrados ${relevant.length} trechos relevantes para a query "${query}"`);
    return relevant.slice(0, limit);
  } catch (e) {
    console.error("RAG Retrieval failed", e);
    return [];
  }
};