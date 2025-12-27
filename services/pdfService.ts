import * as pdfjsLib from 'pdfjs-dist';

// FIX: Detecta se a biblioteca está no export default (comum em CDNs ESM como esm.sh) ou no root
// Se 'GlobalWorkerOptions' não existir diretamente, tentamos acessar via '.default'
const pdfLib = (pdfjsLib as any).default?.GlobalWorkerOptions ? (pdfjsLib as any).default : pdfjsLib;

// Versão 4.0.379 - Deve coincidir EXATAMENTE com a versão instalada no package.json
const PDFJS_VERSION = '4.0.379';

// Configura o worker apenas se o objeto da biblioteca foi resolvido corretamente
if (pdfLib.GlobalWorkerOptions) {
  // Nota: Versões 4.x geralmente usam .mjs para workers ES module
  pdfLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
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
    
    if (technicalMessage.includes("version") && technicalMessage.includes("match")) {
       throw new Error(`Conflito de versão (Cache). Por favor, limpe o cache do navegador e recarregue.`);
    }

    throw new Error(`Falha técnica: ${technicalMessage}`);
  }
};