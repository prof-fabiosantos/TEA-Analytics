import { GoogleGenAI, Type } from "@google/genai";
import { Report, ChatMessage, EvolutionMetric } from "../types";

// Initialize the API client
// Note: The API key must be obtained exclusively from the environment variable process.env.API_KEY
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
Você é um especialista clínico sênior em desenvolvimento infantil e autismo (TEA).

MISSÃO PRINCIPAL:
Analisar a EVOLUÇÃO da criança ao longo do tempo comparando os relatórios fornecidos.

DIRETRIZES:
1. **Comparação Cronológica**: Sempre cite datas. Compare o relatório mais antigo com o mais recente para mostrar ganhos ou perdas.
2. **Evidência**: Baseie suas respostas ESTRITAMENTE nos textos fornecidos. Se algo mudou, cite o relatório específico.
3. **Ação**: Sugira intervenções práticas baseadas em ABA ou terapias citadas, focando nas áreas que apresentaram estagnação ou regressão.
4. **Tom**: Clínico, encorajador, porém realista.

Estruture suas respostas destacando: "Contexto Anterior" vs "Situação Atual".
`;

export const analyzeEvolution = async (reports: Report[]): Promise<EvolutionMetric[]> => {
  if (reports.length === 0) return [];

  const sortedReports = [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const prompt = `
  Analise os seguintes relatórios terapêuticos cronológicos de uma criança.
  Para cada relatório, extraia uma pontuação qualitativa de 0 a 10 para as áreas: Comunicação, Interação Social, Comportamento (menos comportamentos disruptivos = nota maior) e Autonomia.
  
  Importante:
  - Considere a evolução. Se um relatório menciona "melhora significativa", a nota deve ser maior que o anterior.
  - Se não houver menção explicita, mantenha a tendência do relatório anterior.
  
  Relatórios:
  ${sortedReports.map(r => `[Data: ${r.date}] [Tipo: ${r.type}] Conteúdo: ${r.content}`).join('\n\n')}
  `;

  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
              summary: { type: Type.STRING, description: "Resumo curto (max 10 palavras) do marco principal desta data." }
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
    return [];
  }
};

export const sendChatMessage = async (
  currentMessage: string,
  history: ChatMessage[],
  reports: Report[]
): Promise<string> => {
  const ai = getAiClient();
  
  const sortedReports = [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const contextPrompt = `
  LINHA DO TEMPO CLÍNICA (Do mais antigo para o mais recente):
  ${sortedReports.map(r => `
  === DATA: ${r.date} | TIPO: ${r.type} ===
  ${r.content}
  =========================================
  `).join('\n')}
  
  Instrução Específica para esta mensagem:
  Responda à pergunta do usuário considerando a trajetória evolutiva mostrada acima. Se a pergunta for sobre "melhora" ou "evolução", compare explicitamente o início e o fim da linha do tempo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: 'user', parts: [{ text: contextPrompt }] }, 
        ...history.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        })),
        { role: 'user', parts: [{ text: currentMessage }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "Desculpe, não consegui gerar uma análise com base nos relatórios.";
  } catch (error) {
    console.error("Error in chat:", error);
    return "Ocorreu um erro ao processar sua solicitação. Por favor, verifique sua conexão ou tente novamente.";
  }
};
