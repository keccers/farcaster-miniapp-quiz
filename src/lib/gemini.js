import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

// Define the schema for the Hogwarts House analysis
const hogwartsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    primaryHouse: {
      type: SchemaType.STRING,
      description: "The Hogwarts house that best represents the user based on their traits.",
      enum: ["Gryffindor", "Slytherin", "Hufflepuff", "Ravenclaw"],
    },
    housePercentages: {
      type: SchemaType.OBJECT,
      description: "An estimated percentage affinity for each Hogwarts house (0-100). These represent affinity and do not need to sum to 100.",
      properties: {
        Gryffindor: { type: SchemaType.NUMBER, description: "Percentage affinity for Gryffindor (bravery, daring)." },
        Slytherin: { type: SchemaType.NUMBER, description: "Percentage affinity for Slytherin (ambition, cunning)." },
        Hufflepuff: { type: SchemaType.NUMBER, description: "Percentage affinity for Hufflepuff (loyalty, hard work)." },
        Ravenclaw: { type: SchemaType.NUMBER, description: "Percentage affinity for Ravenclaw (wit, learning)." },
      },
      required: ["Gryffindor", "Slytherin", "Hufflepuff", "Ravenclaw"],
    },
    summary: {
        type: SchemaType.STRING,
        description: "A brief (2-3 sentence) summary explaining the primary house choice and key traits observed, written directly to the user ('You seem most like a... because...').",
        maxLength: 300,
    },
    evidence: {
      type: SchemaType.ARRAY,
      description: "Exactly 3 pieces of evidence supporting the house analysis. Each piece should link a trait to specific examples.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          trait: {
            type: SchemaType.STRING,
            description: "The primary trait observed (e.g., 'Bravery', 'Ambition', 'Loyalty', 'Wit').",
            maxLength: 50,
          },
          quotes: {
            type: SchemaType.ARRAY,
            description: "1-2 short, direct quotes (max 10 words each) from the user's casts demonstrating this trait.",
            items: {
              type: SchemaType.STRING,
              description: "A short, direct quote (max 10 words).",
              maxLength: 60, // ~10 words
            },
            minItems: 1,
            maxItems: 2,
          },
          explanation: {
            type: SchemaType.STRING,
            description: "One sentence explaining how these quotes demonstrate the specified trait, written directly to the user ('Your casts like ... show...').",
            maxLength: 150,
          },
        },
        required: ["trait", "quotes", "explanation"],
      },
      minItems: 3,
      maxItems: 3,
    },
    counterArguments: {
        type: SchemaType.OBJECT,
        description: "Brief explanations (1-2 sentences each) for why the user doesn\'t primarily belong to the *other* three houses, written directly to the user. Keys should be the house names.",
        properties: {
            Gryffindor: { type: SchemaType.STRING, description: "Why not primarily Gryffindor? Focus on contrasting traits.", maxLength: 150 },
            Slytherin: { type: SchemaType.STRING, description: "Why not primarily Slytherin? Focus on contrasting traits.", maxLength: 150 },
            Hufflepuff: { type: SchemaType.STRING, description: "Why not primarily Hufflepuff? Focus on contrasting traits.", maxLength: 150 },
            Ravenclaw: { type: SchemaType.STRING, description: "Why not primarily Ravenclaw? Focus on contrasting traits.", maxLength: 150 },
        },
    },
  },
  required: ["primaryHouse", "housePercentages", "summary", "evidence", "counterArguments"],
};

/**
 * Analyzes a user's bio and casts to determine their Hogwarts House affinity.
 * @param {string | null} bio - The user's Farcaster bio.
 * @param {string[]} casts - An array of the user's recent cast texts.
 * @returns {Promise<object | null>} The analysis result matching hogwartsSchema or null if an error occurs.
 */
export async function analyzeHogwartsHouse(bio, casts) {
  if (!GEMINI_API_KEY) {
    console.error("Cannot analyze: GEMINI_API_KEY is not set.");
    return null;
  }
  if (!casts || casts.length === 0) {
    console.warn("No casts provided for analysis.");
    // Proceeding with bio only if available
    if (!bio) return null;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: hogwartsSchema,
    },
  });

  const prompt = `Analyze this Farcaster user's bio and recent casts to determine their Hogwarts House alignment, acting as the Sorting Hat. Assign a primary house and percentage affinities (0-100) for all four houses based on these traits:

*   **Gryffindor:** Bravery, daring, nerve, chivalry, boldness, speaking out, adventurousness.
*   **Hufflepuff:** Hard work, dedication, patience, loyalty, fair play, kindness, modesty, community focus.
*   **Ravenclaw:** Intelligence, learning, wisdom, wit, creativity, curiosity, logic, individuality.
*   **Slytherin:** Ambition, cunning, leadership, resourcefulness, determination, self-preservation, strategic thinking.

**Input Data:**
Bio: ${bio || 'No bio provided.'}
Recent Casts (max ${casts.length > 50 ? 50 : casts.length}):
${casts.slice(0, 50).join('\n---\n')} ${casts.length > 50 ? '\n[... additional casts truncated]' : ''}

**Analysis Instructions:**
1.  **Percentages:** Estimate affinity for EACH house (0-100%). Do NOT need to sum to 100.
2.  **Primary House:** Determine the single BEST fit.
3.  **Summary (Sorting Hat Voice - First Person & Detailed):** Write a 2-4 sentence summary FROM THE PERSPECTIVE OF THE SORTING HAT, addressing the user directly with "You" and "Your". Start with deliberation (e.g., "Hmm, a complex one...", "Ah, yes..."), specifically mention 1-2 key traits *you observed* in *their* casts/bio that strongly point to the chosen house, and *then* declare the house placement (e.g., "With *your* clear ambition and resourcefulness in [... specific example area ...], there's only one place for you... [Primary House]!"). Ensure the explanation is woven into the Hat's declaration.
4.  **Evidence:** Provide EXACTLY 3 pieces of evidence (trait, 1-2 short quotes max 10 words, 1 sentence explanation TO the user).
5.  **Counter Arguments:** For the THREE houses that are *NOT* the primary house, provide a brief (1-2 sentence) explanation TO THE USER about why they don't fit *primarily* into that house, focusing on contrasting traits.

**IMPORTANT FORMATTING & STYLE:**
*   Adhere STRICTLY to the JSON schema.
*   Write summary, explanations, and counter-arguments directly TO the user (use "You"/"Your"), *including within the Sorting Hat summary persona*.
*   Be concise and specific.
*   Base analysis only on provided text.

Please provide the analysis in the specified JSON format.`;

  console.log("Sending request to Gemini...");

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    console.log("Received Gemini response text.");

    // Attempt to parse the JSON response
    try {
        const parsedResponse = JSON.parse(responseText);
        console.log("Successfully parsed Gemini response.");

        // Basic validation including new field
        if (!parsedResponse.primaryHouse || !parsedResponse.housePercentages || !parsedResponse.evidence || parsedResponse.evidence.length !== 3 || !parsedResponse.counterArguments) {
            console.error("Parsed Gemini response is missing required fields or has incorrect evidence/counterArgument count.", parsedResponse);
            throw new Error("Invalid structure in Gemini response.");
        }

        // Filter counterArguments to remove the entry for the primary house
        const primary = parsedResponse.primaryHouse;
        const filteredCounters = {};
        for (const house in parsedResponse.counterArguments) {
            if (house !== primary && parsedResponse.counterArguments[house]) {
                filteredCounters[house] = parsedResponse.counterArguments[house];
            }
        }
        parsedResponse.counterArguments = filteredCounters;

        // Check if we have 3 counter arguments now
        if (Object.keys(parsedResponse.counterArguments).length !== 3) {
             console.warn(`Expected 3 counter arguments after filtering, but got ${Object.keys(parsedResponse.counterArguments).length}. Primary: ${primary}`, parsedResponse.counterArguments);
             // Proceeding anyway, but this might indicate a prompt/model issue
        }

        return parsedResponse;
    } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw Gemini response text:', responseText);
        // Attempt to extract JSON from markdown ```json ... ``` block if present
        const match = responseText.match(/```json\n(.*\n?)```/s);
        if (match && match[1]) {
            console.log("Attempting to parse extracted JSON from markdown.");
            try {
                const parsedFallback = JSON.parse(match[1]);
                 console.log("Successfully parsed extracted Gemini JSON.");
                 // Re-validate
                 if (!parsedFallback.primaryHouse || !parsedFallback.housePercentages || !parsedFallback.evidence || parsedFallback.evidence.length !== 3 || !parsedFallback.counterArguments) {
                    console.error("Parsed fallback Gemini response is missing required fields or has incorrect evidence/counterArgument count.", parsedFallback);
                    throw new Error("Invalid structure in fallback Gemini response.");
                 }
                 // Filter counterArguments here too
                const primaryFallback = parsedFallback.primaryHouse;
                const filteredCountersFallback = {};
                for (const house in parsedFallback.counterArguments) {
                    if (house !== primaryFallback && parsedFallback.counterArguments[house]) {
                        filteredCountersFallback[house] = parsedFallback.counterArguments[house];
                    }
                }
                parsedFallback.counterArguments = filteredCountersFallback;
                if (Object.keys(parsedFallback.counterArguments).length !== 3) {
                    console.warn(`Fallback: Expected 3 counter arguments after filtering, but got ${Object.keys(parsedFallback.counterArguments).length}. Primary: ${primaryFallback}`, parsedFallback.counterArguments);
                }
                return parsedFallback;
            } catch (fallbackParseError) {
                console.error('Fallback JSON parse error:', fallbackParseError);
                throw new Error("Failed to parse Gemini response as JSON, even after extraction.");
            }
        } else {
             throw new Error("Failed to parse Gemini response as JSON.");
        }
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
} 