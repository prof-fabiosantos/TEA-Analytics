import { GoogleGenAI, Type } from "@google/genai";
import { Report, ChatMessage, EvolutionMetric } from "../types";
import { indexReports, retrieveRelevantChunks } from "./ragService";

// Initialize the API client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: API_KEY is missing.");
    throw new Error("API Key configuration missing");
  }
  return new GoogleGenAI({ apiKey });
};

const SYSTEM_INSTRUCTION = `
Você é um especialista clínico sênior em desenvolvimento infantil e autismo (TEA).

MISSÃO PRINCIPAL:
Responder dúvidas do usuário com base EXCLUSIVAMENTE nos trechos de relatórios fornecidos (Contexto Recuperado).

DIRETRIZES:
1. **Evidência**: Use os trechos fornecidos. Se a informação não estiver nos trechos, diga "Não encontrei informações específicas sobre isso nos relatórios consultados".
2. **Citação**: Sempre mencione a DATA do relatório de onde você tirou a informação (ex: "Segundo o relatório de 12/05/2024...").
3. **Tom**: Clínico, encorajador, porém realista.

Estruture a resposta de forma clara e direta.
`;

export const analyzeEvolution = async (reports: Report[]): Promise<EvolutionMetric[]> => {
  if (reports.length === 0) return [];

  // For Evolution Chart, we still need a summary of all reports. 
  // Since this is done once and usually involves fewer tokens than a long chat history, 
  // we keep the logic but limit content size if needed.
  const sortedReports = [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const prompt = `
  Analise os seguintes relatórios terapêuticos cronológicos de uma criança.
  Para cada relatório, extraia uma pontuação qualitativa de 0 a 10 para as áreas: Comunicação, Interação Social, Comportamento (menos comportamentos disruptivos = nota maior) e Autonomia.
  
  Relatórios:
  ${sortedReports.map(r => `[Data: ${r.date}] [Tipo: ${r.type}] Conteúdo (Resumo): ${r.content.slice(0, 1000)}...`).join('\n\n')}
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Extraia métricas de evolução temporal.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              comunicacao: { type: Type.NUMBER },
              interacaoSocial: { type: Type.NUMBER },
              comportamento: { type: Type.NUMBER },
              autonomia: { type: Type.NUMBER },
              summary: { type: Type.STRING, description: "Resumo curto (max 10 palavras)." }
            }
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    const cleanedText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanedText) as EvolutionMetric[];
  } catch (error) {
    console.error("Error analyzing evolution:", error);
    throw error;
  }
};

// Initialization check helper
let isRAGInitialized = false;

export const sendChatMessage = async (
  currentMessage: string,
  history: ChatMessage[],
  reports: Report[]
): Promise<string> => {
  
  // 1. Initialize RAG Index if not done yet
  if (!isRAGInitialized && reports.length > 0) {
    await indexReports(reports);
    isRAGInitialized = true;
  }

  // 2. Retrieve Relevant Context
  const relevantChunks = await retrieveRelevantChunks(currentMessage);
  
  const contextText = relevantChunks.map(chunk => `
  === TRECHO DE RELATÓRIO ===
  Data: ${chunk.reportDate}
  Tipo: ${chunk.reportType}
  Conteúdo: "...${chunk.content}..."
  ===========================
  `).join('\n');

  // 3. Construct Prompt with RAG Context
  // Note: We reduce history to last 5 messages to save tokens, relying on RAG for factual context
  const recentHistory = history.slice(-5); 

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...recentHistory.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        })),
        { 
          role: 'user', 
          parts: [{ text: `
            CONTEXTO RECUPERADO DOS DOCUMENTOS (Use isso para responder):
            ${contextText.length > 0 ? contextText : "Nenhum trecho relevante encontrado."}

            PERGUNTA DO USUÁRIO:
            ${currentMessage}
          `}] 
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "Não consegui formular uma resposta.";
  } catch (error) {
    console.error("Error in chat:", error);
    return "Ocorreu um erro ao processar. Verifique a API Key.";
  }
};