import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for browser environment
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromPdf(dataUrl: string): Promise<string> {
  try {
    // Convert data URL to ArrayBuffer
    const base64 = dataUrl.replace(/^data:application\/pdf;base64,/, '');
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => 'str' in item ? item.str : '')
        .join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    
    return fullText.trim() || '[PDF contains no extractable text]';
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    return '[Failed to extract text from PDF]';
  }
}
