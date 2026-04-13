import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/gemini";
import { getDocumentPrompt } from "@/lib/prompts";
import { Language, DocumentAction } from "@/types";
import mammoth from "mammoth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("document") as File | null;
    const language = (formData.get("language") as Language) || "amharic";
    const action = (formData.get("action") as DocumentAction) || "explain";
    const instruction = (formData.get("instruction") as string) || "";
    const questionCount = parseInt(formData.get("questionCount") as string) || 5;

    const dbUser = await db.user.findUnique({ where: { email: session.user.email } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let documentContent: string;
    let mimeType: string;
    let isBase64 = false;

    if (file) {
      mimeType = file.type;
      const fileName = file.name.toLowerCase();
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Server-side file size validation (10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size is 10MB.` },
          { status: 413 }
        );
      }

      if (fileName.match(/\.(pdf|pptx)$/)) {
        documentContent = buffer.toString("base64");
        isBase64 = true;
      } else if (fileName.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer });
        documentContent = result.value;
      } else {
        documentContent = new TextDecoder().decode(buffer);
      }

      await db.document.create({
        data: {
          userId: dbUser.id,
          fileName: file.name,
          mimeType,
          content: documentContent,
          isBase64
        }
      });
    } else {
      const latestDoc = await db.document.findFirst({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" }
      });

      if (!latestDoc) {
        return NextResponse.json({ error: "No previous document found. Please upload a file first." }, { status: 400 });
      }

      documentContent = latestDoc.content;
      mimeType = latestDoc.mimeType;
      isBase64 = latestDoc.isBase64;
    }

    const prompt = getDocumentPrompt(language, action, questionCount, instruction, dbUser);

    type ContentPart = string | { inlineData: { mimeType: string; data: string } };
    const apiPayload: ContentPart[] | string = isBase64 
      ? [prompt, { inlineData: { mimeType, data: documentContent } }] 
      : `${prompt}\n\nDocument Content:\n${documentContent}`;

    const result = await model.generateContent(apiPayload);
    const response = result.response.text();

    return NextResponse.json({ response });

  } catch (error: unknown) {
    console.error("Document API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}