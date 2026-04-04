import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    const bytes = await audioFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const prompt = `Transcribe the following audio exactly as spoken. If it is in Amharic, write it in the Amharic script. If it is in English, write it in English. Output ONLY the transcription, without any quotes, explanations, or conversational filler.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: audioFile.type, data: base64 } }
    ]);

    const transcription = result.response.text().trim();

    return NextResponse.json({ text: transcription });
  } catch (error) {
    console.error("STT error:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}