import * as pdfjsLib from 'pdfjs-dist';

// FIX: Detecta se a biblioteca está no export default (comum em CDNs ESM como esm.sh) ou no root
// Se 'GlobalWorkerOptions' não existir diretamente, tentamos acessar via '.default'
const pdfLib = (pdfjsLib as any).default?.GlobalWorkerOptions ? (pdfjsLib as any).default : pdfjsLib;

// Versão 3.11.174 - Estável para ambientes ESM/CDN (deve coincidir com index.html)
const PDFJS_VERSION = '3.11.174';

// Configura o worker apenas se o objeto da biblioteca foi resolvido corretamente
if (pdfLib.GlobalWorkerOptions) {
  pdfLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;
} else {
  console.error("CRÍTICO: Não foi possível localizar GlobalWorkerOptions no pdfjs-dist. A extração de PDF falhará.");
}

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    console.log(`Iniciando extração PDF com versão da lib: ${pdfLib.version}`);
    
    const arrayBuffer = await file.arrayBuffer();
    
    // Usa a referência resolvida 'pdfLib' para chamar getDocument
    const loadingTask = pdfLib.getDocument({
      data: arrayBuffer,
      cMapUrl: `https://esm.sh/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
      cMapPacked: true,
    });

    const doc = await loadingTask.promise;
    console.log(`PDF carregado. Páginas: ${doc.numPages}`);
    
    let fullText = '';
    
    // Itera sobre as páginas
    for (let i = 1; i <= doc.numPages; i++) {
      try {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str || '') 
          .join(' ');
          
        fullText += `--- Página ${i} ---\n${pageText}\n\n`;
      } catch (pageError) {
        console.warn(`Erro ao ler página ${i}:`, pageError);
        fullText += `--- Página ${i} (Erro na leitura) ---\n\n`;
      }
    }
    
    if (!fullText.trim()) {
      throw new Error("O texto extraído está vazio. O PDF pode ser uma imagem (scaneado) sem camada de texto (OCR).");
    }
    
    return fullText;
  } catch (error: any) {
    console.error("Erro CRÍTICO na extração do PDF:", error);
    
    const technicalMessage = error.message || error.toString();
    
    // Tratamento de mensagens comuns de erro do PDF.js
    if (technicalMessage.includes("Setting up fake worker") || technicalMessage.includes("workerSrc")) {
       throw new Error(`Erro de configuração do PDF (Worker). Recarregue a página e tente novamente.`);
    }
    
    if (technicalMessage.includes("Password")) {
       throw new Error("O arquivo PDF está protegido por senha.");
    }

    throw new Error(`Falha técnica: ${technicalMessage}`);
  }
};