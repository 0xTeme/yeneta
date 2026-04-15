"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Message } from "@/types";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    console.error("getCurrentUser: No session or email");
    return null;
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    console.error(`getCurrentUser: User not found for email ${session.user.email}`);
    return null;
  }

  return user;
}

export async function getDbProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Not authenticated" };
    }
    return {
      gender: user.gender,
      aiVoice: user.aiVoice,
      role: user.role,
      level: user.level
    };
  } catch (error) {
    console.error("DB Error in getDbProfile:", error);
    return { error: error instanceof Error ? error.message : "Failed to load profile" };
  }
}

export async function saveDbProfile(profile: { gender: string; aiVoice: string; role: string; level: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Not authenticated" };
    }
    await db.user.update({
      where: { id: user.id },
      data: {
        gender: profile.gender,
        aiVoice: profile.aiVoice,
        role: profile.role,
        level: profile.level
      }
    });
    return { success: true };
  } catch (error) {
    console.error("DB Error in saveDbProfile:", error);
    return { error: error instanceof Error ? error.message : "Failed to save profile" };
  }
}

export async function getDbFolders() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Not authenticated", folders: [] as string[] };
    }
    const folders = await db.folder.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' }
    });
    console.log(`getDbFolders: Found ${folders.length} folders for user ${user.id}`);
    return { folders: folders.map(f => f.name) };
  } catch (error) {
    console.error("DB Error in getDbFolders:", error);
    return { error: error instanceof Error ? error.message : "Failed to load folders", folders: [] as string[] };
  }
}

export async function createDbFolder(name: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Not authenticated" };
    }
    await db.folder.create({
      data: { name, userId: user.id }
    });
    console.log(`createDbFolder: Created folder "${name}" for user ${user.id}`);
    return { success: true };
  } catch (error) {
    console.error("DB Error in createDbFolder:", error);
    return { error: error instanceof Error ? error.message : "Failed to create folder" };
  }
}

export async function deleteDbFolder(name: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Not authenticated" };
    }
    await db.folder.deleteMany({
      where: { name, userId: user.id }
    });
    console.log(`deleteDbFolder: Deleted folder "${name}" for user ${user.id}`);
    return { success: true };
  } catch (error) {
    console.error("DB Error in deleteDbFolder:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete folder" };
  }
}

export async function getDbSessions() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error("getDbSessions: User not authenticated");
      return { error: "Not authenticated", sessions: [] as any[] };
    }
    
    const sessions = await db.chatSession.findMany({
      where: { userId: user.id },
      include: {
        folder: true,
        messages: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`getDbSessions: Found ${sessions.length} sessions for user ${user.id}`);
    
    return {
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        language: s.language as "amharic" | "english",
        createdAt: s.createdAt.getTime(),
        updatedAt: s.updatedAt.getTime(),
        folder: s.folder?.name,
        messages: s.messages.map(m => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          type: m.type as "text" | "image" | "document" | "quiz",
          content: m.content,
          fileName: m.fileName || undefined,
          timestamp: m.createdAt.getTime()
        }))
      }))
    };
  } catch (error) {
    console.error("DB Error in getDbSessions:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to load sessions",
      sessions: [] as any[]
    };
  }
}

export async function saveDbSession(sessionData: {
  id: string;
  title: string;
  language: string;
  messages: Message[];
  folder?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error("saveDbSession: User not authenticated, session:", sessionData.id);
      return { error: "Not authenticated" };
    }

    let folderId: string | null = null;
    if (sessionData.folder) {
      const folder = await db.folder.findFirst({
        where: { name: sessionData.folder, userId: user.id }
      });
      if (folder) {
        folderId = folder.id;
      }
    }

    const session = await db.chatSession.upsert({
      where: { id: sessionData.id },
      create: {
        id: sessionData.id,
        title: sessionData.title,
        language: sessionData.language,
        userId: user.id,
        folderId: folderId
      },
      update: {
        title: sessionData.title,
        language: sessionData.language,
        folderId: folderId,
        updatedAt: new Date()
      }
    });

    await db.message.deleteMany({ where: { sessionId: session.id } });
    
    if (sessionData.messages && sessionData.messages.length > 0) {
      await db.message.createMany({
        data: sessionData.messages.map(m => ({
          id: m.id,
          sessionId: session.id,
          role: m.role,
          type: m.type,
          content: m.content,
          fileName: m.fileName,
          createdAt: new Date(m.timestamp)
        }))
      });
    }

    console.log(`saveDbSession: Saved session ${sessionData.id} with ${sessionData.messages?.length || 0} messages for user ${user.id}`);
    return { success: true };
  } catch (error) {
    console.error("DB Error in saveDbSession:", error);
    return { error: error instanceof Error ? error.message : "Failed to save session" };
  }
}

export async function deleteDbSession(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Not authenticated" };
    }
    await db.chatSession.deleteMany({
      where: { id, userId: user.id }
    });
    console.log(`deleteDbSession: Deleted session ${id} for user ${user.id}`);
    return { success: true };
  } catch (error) {
    console.error("DB Error in deleteDbSession:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete session" };
  }
}

export async function moveDbSession(id: string, folderName: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Not authenticated" };
    }
    
    const folder = await db.folder.findFirst({
      where: { name: folderName, userId: user.id }
    });
    if (folder) {
      await db.chatSession.update({
        where: { id },
        data: { folderId: folder.id }
      });
      console.log(`moveDbSession: Moved session ${id} to folder "${folderName}"`);
      return { success: true };
    }
    return { error: "Folder not found" };
  } catch (error) {
    console.error("DB Error in moveDbSession:", error);
    return { error: error instanceof Error ? error.message : "Failed to move session" };
  }
}
