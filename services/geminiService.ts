
import { GoogleGenAI, Type } from "@google/genai";
import { WeddingData, LocalizedString, ScheduleItem } from "../types";

// Helper to safely get env vars without crashing in browser
const getApiKey = () => {
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
            // @ts-ignore
            return process.env.API_KEY || '';
        }
        return '';
    } catch {
        return '';
    }
};

const getAiClient = () => {
    const key = getApiKey();
    if (!key) {
        console.warn("Gemini API Key is missing.");
        return null;
    }
    return new GoogleGenAI({ apiKey: key });
};

export const generateGreeting = async (data: WeddingData): Promise<LocalizedString> => {
  const ai = getAiClient();
  
  if (!ai) {
    return {
      en: "Welcome to our wedding.",
      ja: "私たちの結婚式へようこそ。",
      my: "ကျွန်ုပ်တို့၏မင်္ဂလာပွဲမှ ကြိုဆိုပါသည်။"
    };
  }

  const prompt = `
    Generate a short, elegant, and heartwarming wedding greeting message for a couple named ${data.groomName.en} (Groom) and ${data.brideName.en} (Bride).
    The wedding is on ${new Date(data.date).toDateString()}.
    The tone should be romantic and inviting.
    
    Return the output strictly as a JSON object with keys 'en', 'ja', and 'my' containing the translations.
    'ja' should be formal Japanese (Keigo).
    'my' should be polite Burmese.
    Limit each message to approx 2-3 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            en: { type: Type.STRING },
            ja: { type: Type.STRING },
            my: { type: Type.STRING },
          },
          required: ["en", "ja", "my"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned");
    
    return JSON.parse(jsonText) as LocalizedString;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const fetchVenueDetails = async (venueName: string): Promise<{ address: LocalizedString, mapUrl: string } | null> => {
    const ai = getAiClient();
    if (!ai) return null;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Find the address and google maps embed URL for the venue: "${venueName}". 
            If exact details aren't found, provide a best guess based on popular venues in Tokyo or the world.
            Return the output strictly as a JSON object with the following structure:
            {
              "address": { "en": "...", "ja": "...", "my": "..." },
              "mapUrl": "..."
            }
            Do not include markdown formatting.`,
            config: {
                tools: [{ googleMaps: {} }],
                // Note: responseMimeType and responseSchema are not allowed when using googleMaps tool.
            }
        });

        if (response.text) {
             let text = response.text.trim();
             // Remove markdown code blocks if present
             if (text.startsWith('```')) {
                 text = text.replace(/^```(json)?\n?/, '').replace(/```$/, '');
             }
             return JSON.parse(text);
        }
        
        return null;

    } catch (error) {
        console.error("Venue Fetch Error:", error);
        return null;
    }
}

export const generateSchedule = async (startTime: string): Promise<ScheduleItem[]> => {
    const ai = getAiClient();
    if (!ai) return [];

    const prompt = `
        Create a wedding schedule starting at ${startTime} following this specific structure:
        1. Registration - Starts at ${startTime}
        2. Grand Entrance - Starts 30 mins after registration
        3. Toast - Starts 45 mins after registration
        4. Meal & Conversation - Starts 60 mins after registration
        5. Photo Session - Starts 90 mins after registration
        6. Games & Entertainment - Starts 105 mins after registration
        7. Conclusion & Send-off - Starts 150 mins after registration
        
        Return a JSON array of objects.
        Each object must have:
        - time (HH:MM format, 24h)
        - title (object with en, ja, my translations)
        - icon (one of: 'ceremony', 'reception', 'party', 'toast', 'meal', 'camera')
        
        For 'ja', use standard Japanese wedding terms (e.g., 受付, 入場, 乾杯, 食事, 写真撮影, 余興, 送賓).
        For 'my', use polite Burmese translations.
        For 'en', use standard English terms matching the steps above.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            time: { type: Type.STRING },
                            title: {
                                type: Type.OBJECT,
                                properties: {
                                    en: { type: Type.STRING },
                                    ja: { type: Type.STRING },
                                    my: { type: Type.STRING }
                                },
                                required: ["en", "ja", "my"]
                            },
                            icon: { type: Type.STRING, enum: ['ceremony', 'reception', 'party', 'toast', 'meal', 'camera'] }
                        },
                        required: ["time", "title", "icon"]
                    }
                }
            }
        });

        if (response.text) {
             return JSON.parse(response.text) as ScheduleItem[];
        }
        return [];
    } catch (error) {
        console.error("Schedule Generation Error:", error);
        throw error;
    }
};