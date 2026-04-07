export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type: "text" | "image" | "document" | "quiz";
  fileName?: string;
  isStreaming?: boolean;
  isTranslating?: boolean;
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

export interface UserProfileData {
  gender: "male" | "female";
  aiVoice: "male" | "female";
  role: string;
  level: string;
  onboardingCompleted?: boolean;
}

export type Language = "amharic" | "english";
export type VoiceGender = "female" | "male";
export type DocumentAction = "explain" | "summarize" | "quiz" | "custom";

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  language: Language;
  createdAt: number;
  updatedAt: number;
  folder?: string;
}

export interface ChatRequest {
  message: string;
  language: Language;
  history: Message[];
  userProfile?: UserProfileData;
}

export interface ApiResponse {
  response?: string;
  reply?: string;
  explanation?: string;
  quiz?: Quiz;
  error?: string;
}