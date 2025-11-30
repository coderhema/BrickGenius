import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedBuild } from "../types";

// Initialize Gemini client
// Using Vite's environment variable syntax
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

/**
 * Converts a file object to a Base64 string.
 */
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateLegoFromImage = async (imageFile: File): Promise<GeneratedBuild> => {
  try {
    const base64Image = await fileToGenerativePart(imageFile);

    const model = "gemini-2.5-flash";

    const prompt = `
      Analyze this image and create a 3D voxel/LEGO representation of the main subject.
      Return a JSON object containing a list of "bricks".
      
      Rules:
      1. The coordinate system is x, y, z. 
      2. 'y' is the vertical axis. The bottom-most layer must be y=0.
      3. 'x' and 'z' are horizontal axes. Keep values generally between -8 and 8 to fit on a baseplate.
      4. Use standard basic colors (hex codes) that closely match the image.
      5. Do not create floating bricks; every brick must be supported by another brick below it or the ground (y=0).
      6. Simplify the shape to be recognizable but constructed of roughly 50-150 1x1x1 blocks.
      7. The output must conform to the JSON schema provided.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Image,
            },
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bricks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.INTEGER },
                  y: { type: Type.INTEGER },
                  z: { type: Type.INTEGER },
                  color: { type: Type.STRING },
                },
                required: ["x", "y", "z", "color"],
              },
            },
          },
          required: ["bricks"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");

    const data = JSON.parse(text) as GeneratedBuild;
    return data;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
