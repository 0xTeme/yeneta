import { NextRequest } from "next/server";
import { model } from "@/lib/gemini";
import { getSystemPrompt } from "@/lib/prompts";
import { ChatRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { message, language, history, userProfile }: ChatRequest = await req.json();

    if (!message || !message.trim()) {
      return new Response(JSON.stringify({ error: "Message required" }), { status: 400 });
    }

    const systemPrompt = getSystemPrompt(language || "english", userProfile);

    const chatHistory = (history || []).map((msg) => ({
      role: msg.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history: chatHistory });

    const result = await chat.sendMessageStream(`${systemPrompt}\n\nStudent: ${message}`);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(new TextEncoder().encode(chunkText));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
}