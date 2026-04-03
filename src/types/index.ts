export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type: "text" | "image" | "document" | "quiz";
  fileName?: string;
  imageUrl?: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export interface UserProfile {
  name: string;
  email: string;
  image: string;
}

export type Language = "amharic" | "english";

export type DocumentAction = "explain" | "summarize" | "quiz";

export interface ChatRequest {
  message: string;
  language: Language;
  history: Message[];
}

export interface DocumentRequest {
  language: Language;
  action: DocumentAction;
}

export interface ApiResponse {
  response?: string;
  reply?: string;
  explanation?: string;
  quiz?: Quiz;
  error?: string;
}

export type VoiceGender = "male" | "female";

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  language: Language;
  createdAt: number;
  updatedAt: number;
}
