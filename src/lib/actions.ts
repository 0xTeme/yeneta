"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Message } from "@/types";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  let user = await db.user.findUnique({ where: { email: session.user.email } });
  
  if (!user) {
    user = await db.user.create({
      data: {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      }
    });
  }
  return user;
}

export async function getDbProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  return { gender: user.gender, aiVoice: user.aiVoice, role: user.role, level: user.level };
}

export async function saveDbProfile(profile: any) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.user.update({
    where: { id: user.id },
    data: { gender: profile.gender, aiVoice: profile.aiVoice, role: profile.role, level: profile.level }
  });
}

export async function getDbFolders() {
  const user = await getCurrentUser();
  if (!user) return [];
  const folders = await db.folder.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } });
  return folders.map(f => f.name);
}

export async function createDbFolder(name: string) {
  const user = await getCurrentUser();
  if (!user) return;
  try {
    await db.folder.create({ data: { name, userId: user.id } });
  } catch (e) {
    // Ignores error if folder name already exists for this user
  }
}

export async function deleteDbFolder(name: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.folder.deleteMany({ where: { name, userId: user.id } });
}

export async function getDbSessions() {
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
}

export async function saveDbSession(sessionData: any) {
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
}

export async function deleteDbSession(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.chatSession.deleteMany({ where: { id, userId: user.id } });
}

export async function moveDbSession(id: string, folderName: string) {
  const user = await getCurrentUser();
  if (!user) return;

  const folder = await db.folder.findFirst({ where: { name: folderName, userId: user.id } });
  if (folder) {
    await db.chatSession.update({
      where: { id },
      data: { folderId: folder.id }
    });
  }
}