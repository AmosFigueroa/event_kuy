
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
};

export interface PaymentAnalysisResult {
    isValid: boolean;
    reason: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    detectedAmount?: string;
}

export const analyzePaymentProof = async (imageBase64: string, expectedAmount: number): Promise<PaymentAnalysisResult> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `
            Anda adalah asisten verifikasi pembayaran otomatis. 
            Tugas Anda adalah menganalisis gambar bukti transfer ini.
            
            Informasi yang diharapkan:
            - Nominal yang harus dibayar: Rp ${expectedAmount.toLocaleString('id-ID')}
            
            Instruksi:
            1. Periksa apakah gambar ini terlihat seperti bukti transfer bank/e-wallet yang sah (bukan gambar sembarang).
            2. Cari nominal uang di dalam gambar. Apakah cocok dengan nominal yang diharapkan (atau lebih)?
            3. Periksa status transaksi jika ada (harus BERHASIL/SUKSES).
            
            Berikan output HANYA dalam format JSON sebagai berikut, jangan ada teks lain:
            {
                "isValid": boolean, // true jika terlihat sah dan nominal cocok
                "reason": string, // Penjelasan singkat dalam Bahasa Indonesia (maks 20 kata)
                "confidence": "HIGH" | "MEDIUM" | "LOW", // Seberapa yakin Anda
                "detectedAmount": string // Nominal yang terbaca (contoh: "50000" atau "Tidak terbaca")
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Using gemini-3-flash-preview for vision tasks as per guidelines
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
        // Clean markdown code blocks if any
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(jsonStr) as PaymentAnalysisResult;

    } catch (error: any) {
        console.error("AI Analysis Error:", error);
        return {
            isValid: false,
            reason: "Gagal menganalisis gambar (Error Sistem). Cek manual.",
            confidence: 'LOW'
        };
    }
};