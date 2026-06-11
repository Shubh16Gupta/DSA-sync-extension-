import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API client if key exists
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Automatically generates explanation notes for a solved problem.
 * 
 * @param {string} title Problem title
 * @param {string} platform Platform name
 * @param {string} difficulty Difficulty level
 * @param {string[]} tags List of problem tags
 * @param {string} description Problem description
 * @param {string} code User solution code
 * @param {string} language Language used
 * @returns {Promise<Object>} Generated notes with approach, complexity, etc.
 */
export async function generateNotes(title, platform, difficulty, tags, description, code, language) {
  const defaultNotes = {
    approach: "Double pointer, greedy, or hashing-based approach depending on the optimal problem requirements. Elements are processed linearly or sorted first to reduce search time.",
    observations: [
      "Optimal solutions typically avoid nested loops by using auxiliary data structures like sets, maps, or arrays.",
      "Consider boundary cases such as empty inputs, negative numbers, or extremely large array sizes."
    ],
    timeComplexity: "O(N) in the average/worst-case scenario where N is the size of the input.",
    spaceComplexity: "O(1) auxiliary space, or O(N) if utilizing hash tables or lists for storage.",
    concepts: tags.length > 0 ? tags : ["Data Structures", "Problem Solving"]
  };

  if (!genAI) {
    console.log('Gemini API: GEMINI_API_KEY not configured. Using default template notes.');
    return defaultNotes;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `
You are a top-tier competitive programmer and technical interviewer.
Analyze this DSA problem and solution, then write clear explanation notes.

PROBLEM DETAILS:
Title: ${title}
Platform: ${platform}
Difficulty: ${difficulty}
Tags: ${tags.join(', ')}
Description: 
${description}

USER'S CODE:
Language: ${language}
Code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Based on the above, generate a JSON object representing the notes. Respond ONLY with a valid JSON block containing the following structure:
{
  "approach": "A brief summary of how this code solves the problem, explaining the algorithm used (e.g. hashmap, sorting, backtracking). Keep it under 3-4 sentences.",
  "observations": [
    "Key observation 1 about the problem/constraints.",
    "Key observation 2 about why this algorithm is selected or how it optimizes."
  ],
  "timeComplexity": "Big-O notation with short justification (e.g. O(N log N) due to sorting the input array).",
  "spaceComplexity": "Big-O notation with short justification (e.g. O(1) auxiliary space as we modify in-place).",
  "concepts": ["Concept 1", "Concept 2"]
}
Do not include any other text, markdown formatting (other than the JSON structure itself), or trailing explanations. Return ONLY the JSON object.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Parse JSON safely
    // Sometimes LLMs wrap JSON in ```json ... ```, let's strip it
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        approach: parsed.approach || defaultNotes.approach,
        observations: parsed.observations || defaultNotes.observations,
        timeComplexity: parsed.timeComplexity || defaultNotes.timeComplexity,
        spaceComplexity: parsed.spaceComplexity || defaultNotes.spaceComplexity,
        concepts: parsed.concepts || defaultNotes.concepts
      };
    }
    
    return defaultNotes;
  } catch (error) {
    console.error('Error generating notes with Gemini:', error);
    return defaultNotes;
  }
}
