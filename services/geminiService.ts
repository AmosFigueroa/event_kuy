
import { GoogleGenAI } from "@google/genai";

// Helper to get API Key safely in Vite environment
const getApiKey = (): string => {
  // 1. Try standard Vite env var
  try {
    // Safe check for import.meta.env to prevent "Cannot read properties of undefined (reading 'VITE_API_KEY')"
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // Ignore errors if import.meta is not supported or defined
  }
  
  // 2. Try legacy process.env (rare in browser but possible with polyfills)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (e) {}
  
  return "";
};

const API_KEY = getApiKey();

export const generateEventDescription = async (title: string, category: string, keyDetails: string): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key hilang. Tambahkan VITE_API_KEY di file .env Anda.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
    
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

    const text = response.text;
    if (!text) {
        throw new Error("AI tidak mengembalikan teks deskripsi.");
    }

    return text.trim();
  } catch (error: any) {
    console.error("Error generating description:", error);
    const errorMessage = error.message || error.toString();
    if (errorMessage.includes("API key")) {
        throw new Error("Masalah API Key: Pastikan Key valid di .env.");
    }
    throw new Error(errorMessage);
  }
};

export const generateEmailTemplate = async (eventType: string, status: string): Promise<string> => {
   if (!API_KEY) return "";

   const ai = new GoogleGenAI({ apiKey: API_KEY });

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
};

export interface PaymentAnalysisResult {
    isValid: boolean;
    reason: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    detectedAmount?: string;
}

export const analyzePaymentProof = async (imageBase64: string, expectedAmount: number): Promise<PaymentAnalysisResult> => {
    if (!API_KEY) {
        return {
            isValid: false,
            reason: "API Key tidak ditemukan. Konfigurasi VITE_API_KEY diperlukan.",
            confidence: 'LOW'
        };
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    try {
        const prompt = `
            Anda adalah auditor keuangan otomatis. Tugas Anda: Analisis bukti transfer ini.
            Target Pembayaran: Rp ${expectedAmount.toLocaleString('id-ID')}
            
            Lakukan pengecekan ketat:
            1. APAKAH INI BUKTI TRANSFER SAH? (Bukan foto selfie, bukan foto kosong, bukan struk gagal).
            2. CARI NOMINAL: Apakah nominal yang tertera >= ${expectedAmount}? (Abaikan titik/koma pemisah ribuan).
            3. CARI STATUS: Apakah ada kata "BERHASIL", "SUKSES", "SUCCESS", atau "TRANSFER DONE"?
            
            Output JSON Only:
            {
                "isValid": boolean, // TRUE jika (Nominal Cukup) DAN (Status Berhasil/Sukses) DAN (Gambar Valid)
                "reason": string, // Penjelasan singkat (maks 15 kata). Contoh: "Nominal sesuai dan status berhasil." atau "Nominal kurang."
                "confidence": "HIGH" | "MEDIUM" | "LOW",
                "detectedAmount": string // Nominal yang ditemukan, atau "Tidak terbaca"
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageBase64
                        }
                    },
                    { text: prompt }
                ]
            }
        });

        const text = response.text || "";
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(jsonStr) as PaymentAnalysisResult;

    } catch (error: any) {
        console.error("AI Analysis Error:", error);
        return {
            isValid: false,
            reason: "Gagal memproses AI: " + (error.message || "Unknown Error"),
            confidence: 'LOW'
        };
    }
};
