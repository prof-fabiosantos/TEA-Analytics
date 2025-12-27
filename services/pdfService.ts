import * as pdfjsLib from 'pdfjs-dist';

// ATENÇÃO: A versão do worker DEVE bater exatamente com a versão definida no importmap do index.html
// No index.html está: "pdfjs-dist": "https://esm.sh/pdfjs-dist@^5.4.449"
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate through pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract strings from text items
      // No PDF.js v5+, a estrutura do item pode variar ligeiramente, mas .str é o padrão
      const pageText = textContent.items
        .map((item: any) => item.str || '') 
        .join(' ');
        
      fullText += `--- Página ${i} ---\n${pageText}\n\n`;
    }
    
    if (!fullText.trim()) {
      throw new Error("O PDF parece estar vazio ou é uma imagem escaneada (sem texto selecionável).");
    }
    
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error("Falha ao ler o arquivo PDF. Verifique se o arquivo não está corrompido, protegido por senha ou se as versões da biblioteca estão sincronizadas.");
  }
};