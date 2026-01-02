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
    // Updated prompt to request Indonesian output
    const prompt = `
      Buatlah deskripsi acara yang menarik dan profesional dalam Bahasa Indonesia untuk acara berjudul "${title}".
      Kategori: ${category}.
      Detail utama yang harus disertakan: ${keyDetails}.
      Nada bicaranya harus antusias namun profesional. Usahakan di bawah 200 kata.
      Jangan gunakan format markdown seperti **tebal** atau *miring*, hanya teks paragraf biasa.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Tidak dapat membuat deskripsi.";
  } catch (error) {
    console.error("Error generating description:", error);
    return "Kesalahan dalam membuat deskripsi. Silakan coba lagi.";
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