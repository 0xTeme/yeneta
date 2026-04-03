import { ChatSession, Message, Language } from "@/types";

const STORAGE_KEY = "yeneta_sessions";

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const generateTitle = (messages: Message[]): string => {
  const firstUserMsg = messages.find((m) => m.role === "user");
  if (!firstUserMsg) return "New Chat";
  const title = firstUserMsg.content.slice(0, 50);
  return title.length < firstUserMsg.content.length ? title + "..." : title;
};

export const getAllSessions = (): ChatSession[] => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const getSession = (id: string): ChatSession | null => {
  const sessions = getAllSessions();
  return sessions.find((s) => s.id === id) || null;
};

export const saveSession = (session: ChatSession): void => {
  if (typeof window === "undefined") return;
  const sessions = getAllSessions();
  const index = sessions.findIndex((s) => s.id === session.id);

  session.updatedAt = Date.now();
  session.title = generateTitle(session.messages);

  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const deleteSession = (id: string): void => {
  if (typeof window === "undefined") return;
  const sessions = getAllSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const createNewSession = (language: Language): ChatSession => {
  return {
    id: generateId(),
    title: "New Chat",
    messages: [],
    language,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

export const moveSessionToFolder = (id: string, folderName: string): void => {
  if (typeof window === "undefined") return;
  const sessions = getAllSessions();
  const index = sessions.findIndex((s) => s.id === id);
  
  if (index >= 0) {
    sessions[index].folder = folderName.trim() === "" ? undefined : folderName.trim();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }
};