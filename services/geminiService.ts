
import { GoogleGenAI } from "@google/genai";

// Ensure process is typed to avoid TS errors if @types/node is missing
declare var process: {
  env: {
    API_KEY: string;
  };
};

export const generateEventDescription = async (title: string, category: string, keyDetails: string): Promise<string> => {
  // Use API key directly from process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
  try {
    // Updated prompt to request Indonesian output with better structure
    const prompt = `
      Bertindaklah sebagai Event Organizer profesional. Buatkan deskripsi acara yang menarik, persuasif, dan profesional dalam Bahasa Indonesia untuk acara berikut:
      
      Judul Acara: ${title}
      Kategori: ${category}
      Detail Tambahan: ${keyDetails}

      Instruksi Penulisan:
      1. Gunakan nada bicara yang antusias, mengundang, namun tetap formal.
      2. Jelaskan mengapa orang harus hadir ke acara ini (Value Proposition).
      3. Panjang tulisan sekitar 100-150 kata.
      4. JANGAN gunakan format Markdown (seperti **bold**, # header, atau *italic*). Tulis dalam paragraf teks biasa yang rapi agar mudah dibaca di aplikasi.
      5. Jangan sertakan placeholder seperti [Masukkan Tanggal], gunakan data yang ada atau buat kalimat umum yang mengundang.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "Deskripsi tidak dapat dibuat saat ini.";
  } catch (error) {
    console.error("Error generating description:", error);
    // Return empty string or specific error message handled by UI
    throw new Error("Gagal terhubung ke AI Service.");
  }
};

export const generateEmailTemplate = async (eventType: string, status: string): Promise<string> => {
   // Use API key directly
   const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

   try {
       const prompt = `Write a short, polite email subject and body in Indonesian for a user whose registration for a ${eventType} is now ${status}.`;

       const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });
        return response.text || "";
   } catch (error) {
       console.error("Error generating email template:", error);
       return "";
   }
}
