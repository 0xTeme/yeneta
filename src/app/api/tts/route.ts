import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const VOICES = {
  amharic: {
    female: "am-ET-MekdesNeural",
    male: "am-ET-AmehaNeural",
  },
  english: {
    female: "en-US-JennyNeural",
    male: "en-US-GuyNeural",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { text, language, gender } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const lang = language === "amharic" ? "amharic" : "english";
    const voice = VOICES[lang][gender === "male" ? "male" : "female"];

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const readable = tts.toStream(text.slice(0, 3000));

    if (!readable.audioStream) {
      throw new Error("Failed to create audio stream");
    }

    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      readable.audioStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      readable.audioStream.on("end", () => resolve());
      readable.audioStream.on("error", (err: Error) => reject(err));
    });

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error("TTS error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "TTS failed";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}