
import { GoogleGenAI } from "@google/genai";

// Ensure process is typed to avoid TS errors if @types/node is missing
declare var process: {
  env: {
    API_KEY: string;
  };
};

export const generateEventDescription = async (title: string, category: string, keyDetails: string): Promise<string> => {
  // Validasi keberadaan API Key sebelum inisialisasi
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key tidak ditemukan. Pastikan konfigurasi environment (API_KEY) sudah benar.");
  }

  const ai = new GoogleGenAI({ apiKey });
    
  try {
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

    // Validasi response text
    const text = response.text;
    if (!text) {
        throw new Error("AI tidak mengembalikan teks deskripsi.");
    }

    return text.trim();
  } catch (error: any) {
    console.error("Error generating description:", error);
    
    // Teruskan pesan error asli agar tampil di UI untuk debugging yang lebih baik
    // Contoh: "API key expired", "Quota exceeded", dll.
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes("API key")) {
        throw new Error("Masalah API Key: Pastikan Key valid dan memiliki akses ke model Gemini.");
    }
    
    throw new Error(errorMessage);
  }
};

export const generateEmailTemplate = async (eventType: string, status: string): Promise<string> => {
   const apiKey = process.env.API_KEY;
   if (!apiKey) return "";

   const ai = new GoogleGenAI({ apiKey });

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
