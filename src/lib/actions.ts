"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Message } from "@/types";

async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    // Safely attempt to upsert the user
    const user = await db.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || null,
        image: session.user.image || null,
      }
    });

    return user;
  } catch (error) {
    console.error("DB Error in getCurrentUser:", error);
    return null;
  }
}

export async function getDbProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    return { gender: user.gender, aiVoice: user.aiVoice, role: user.role, level: user.level };
  } catch (error) {
    console.error("DB Error in getDbProfile:", error);
    return null;
  }
}

export async function saveDbProfile(profile: any) {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    await db.user.update({
      where: { id: user.id },
      data: { gender: profile.gender, aiVoice: profile.aiVoice, role: profile.role, level: profile.level }
    });
  } catch (error) {
    console.error("DB Error in saveDbProfile:", error);
  }
}

export async function getDbFolders() {
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    const folders = await db.folder.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } });
    return folders.map(f => f.name);
  } catch (error) {
    console.error("DB Error in getDbFolders:", error);
    return [];
  }
}

export async function createDbFolder(name: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    await db.folder.create({ data: { name, userId: user.id } });
  } catch (error) {
    console.error("DB Error in createDbFolder:", error);
  }
}

export async function deleteDbFolder(name: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    await db.folder.deleteMany({ where: { name, userId: user.id } });
  } catch (error) {
    console.error("DB Error in deleteDbFolder:", error);
  }
}

export async function getDbSessions() {
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    
    const sessions = await db.chatSession.findMany({
      where: { userId: user.id },
      include: { folder: true, messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' }
    });

    return sessions.map(s => ({
      id: s.id,
      title: s.title,
      language: s.language as any,
      createdAt: s.createdAt.getTime(),
      updatedAt: s.updatedAt.getTime(),
      folder: s.folder?.name,
      messages: s.messages.map(m => ({
        id: m.id,
        role: m.role as any,
        type: m.type as any,
        content: m.content,
        fileName: m.fileName || undefined,
        timestamp: m.createdAt.getTime()
      }))
    }));
  } catch (error) {
    console.error("DB Error in getDbSessions:", error);
    return [];
  }
}

export async function saveDbSession(sessionData: any) {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    let folderId = null;
    if (sessionData.folder) {
      const folder = await db.folder.findFirst({ where: { name: sessionData.folder, userId: user.id } });
      if (folder) folderId = folder.id;
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
        data: sessionData.messages.map((m: Message) => ({
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
  } catch (error) {
    console.error("DB Error in saveDbSession:", error);
  }
}

export async function deleteDbSession(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    await db.chatSession.deleteMany({ where: { id, userId: user.id } });
  } catch (error) {
    console.error("DB Error in deleteDbSession:", error);
  }
}

export async function moveDbSession(id: string, folderName: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    
    const folder = await db.folder.findFirst({ where: { name: folderName, userId: user.id } });
    if (folder) {
      await db.chatSession.update({
        where: { id },
        data: { folderId: folder.id }
      });
    }
  } catch (error) {
    console.error("DB Error in moveDbSession:", error);
  }
}
