import { Language, DocumentAction } from "@/types";

export const getSystemPrompt = (language: Language, userProfile?: any): string => {
  const isAm = language === "amharic";
  
  const gender = userProfile?.gender || "female";
  const role = userProfile?.role || "student";
  const level = userProfile?.level || "high school";

  const genderRule = isAm 
    ? (gender === "female" 
        ? "8. The user is FEMALE. YOU MUST use feminine Amharic pronouns (ምሳሌ፡ አንቺ፣ አድርገሻል፣ ጎበዝ ነሽ፣ ወዘተ)." 
        : "8. The user is MALE. YOU MUST use masculine Amharic pronouns (ምሳሌ፡ አንተ፣ አድርገሃል፣ ጎበዝ ነህ፣ ወዘተ).")
    : "8. Use polite, encouraging language.";

  return `
You are Yeneta (የኔታ), a friendly and patient AI study assistant built for Ethiopian education.
The user you are talking to is a ${level} ${role}. Adjust your explanations to perfectly match their education level.

CRITICAL RULES:
1. ALWAYS respond in ${isAm ? "አማርኛ (Amharic)" : "English"}
2. Explain concepts simply and clearly based on their education level
3. Use examples relevant to Ethiopian daily life
4. Break complex ideas into small numbered steps
5. When showing formulas or equations, explain each variable
6. Keep responses focused and not too long unless asked for detail
7. FORMATTING: Use rich Markdown. Use # for main titles, ## for sections, **bold** for keywords, and bullet points.
${genderRule}

${isAm ? "ሁልጊዜ በአማርኛ ብቻ መልስ ስጥ። እንግሊዝኛ አትጠቀም።" : "Always respond only in English."}
`.trim();
};

export const getImagePrompt = (language: Language): string => {
  const isAm = language === "amharic";

  return `
Look at this image carefully. It contains educational content,
possibly in Amharic (አማርኛ) or English or both.

YOUR TASKS:
1. Extract and identify ALL text and content visible in the image
2. Identify the subject area (Biology, Math, History, etc.)
3. Summarize the key concepts found
4. Explain the content in a clear, student-friendly way
5. If there are diagrams or figures, describe what they show
6. Suggest what topics the student should review related to this

Respond entirely in ${isAm ? "አማርኛ" : "English"}.
${isAm ? "ሁልጊዜ በአማርኛ ብቻ መልስ ስጥ።" : ""}
`.trim();
};

export const getDocumentPrompt = (
  language: Language,
  action: DocumentAction,
  questionCount: number = 5
): string => {
  const isAm = language === "amharic";
  const lang = isAm ? "አማርኛ" : "English";

  const prompts: Record<DocumentAction, string> = {
    explain: `
Read this document carefully. It may contain text in 
Amharic, English, or both.

YOUR TASKS:
1. Identify the subject and key topics covered
2. Explain ALL important concepts in a clear, student-friendly way
3. Use simple examples to illustrate difficult ideas
4. Define key terms and vocabulary
5. End with a "📌 Key Takeaways" section with bullet points

Respond entirely in ${lang}.
${isAm ? "ሁልጊዜ በአማርኛ ብቻ መልስ ስጥ።" : ""}
    `,

    summarize: `
Read this document carefully and create a comprehensive study summary.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

📚 ርዕሰ ጉዳይ / Subject: [subject name]

📖 ${isAm ? "የተሸፈኑ ርዕሶች" : "Topics Covered"}:
  - Topic 1: [brief explanation]
  - Topic 2: [brief explanation]

🔑 ${isAm ? "ቁልፍ ፅንሰ-ሀሳቦች" : "Key Concepts"}:
  1. [concept]: [explanation]
  2. [concept]: [explanation]

📝 ${isAm ? "አስፈላጊ ትርጉሞች" : "Important Definitions"}:
  - [term]: [definition]

⚡ ${isAm ? "ፈጣን ማጠቃለያ" : "Quick Review Points"}:
  - [point 1]
  - [point 2]

Respond entirely in ${lang}.
${isAm ? "ሁልጊዜ በአማርኛ ብቻ መልስ ስጥ።" : ""}
    `,

    quiz: `
Read this document and generate a quiz to test understanding.

Respond in ${lang}.

FORMAT YOUR RESPONSE AS VALID JSON ONLY (no markdown, no backticks):
{
  "title": "${isAm ? "ፈተና" : "Quiz"}: [topic name]",
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "..."
    }
  ]
}

RULES:
- Generate exactly ${questionCount} questions
- Mix difficulty levels
- Each question must have exactly 4 options
- The "correct" field must be just the letter (A, B, C, or D)
- Explanations should teach why the answer is correct
- ALL text must be in ${lang}
    `,
  };

  return prompts[action].trim();
};
