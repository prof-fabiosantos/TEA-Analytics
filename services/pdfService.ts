import * as pdfjsLib from 'pdfjs-dist';

// Set worker source. We use the same version as the main library from esm.sh
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

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
      const pageText = textContent.items
        .map((item: any) => item.str || '') // item.str contains the text
        .join(' ');
        
      fullText += `--- Página ${i} ---\n${pageText}\n\n`;
    }
    
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error("Falha ao ler o arquivo PDF. Verifique se o arquivo não está corrompido ou protegido por senha.");
  }
};