import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `Generate an image of: ${prompt}. Only respond with the image.` }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const response = result.response;
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let imageBase64 = null;
    let mimeType = "image/png";
    let text = "Here's an image based on your request.";

    for (const part of parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/png";
      } else if (part.text) {
        text = part.text;
      }
    }

    if (!imageBase64) {
      return NextResponse.json({ 
        error: "Image generation is not available. Try asking for a description instead." 
      }, { status: 200 });
    }

    return NextResponse.json({
      imageUrl: `data:${mimeType};base64,${imageBase64}`,
      text,
      prompt,
    });

  } catch (error: any) {
    console.error("Image generation error:", error);
    
    if (error.message?.includes("SAFETY") || error.message?.includes("blocked")) {
      return NextResponse.json({ 
        error: "Image could not be generated due to safety settings. Please try a different prompt." 
      }, { status: 200 });
    }

    if (error.message?.includes("not supported") || error.message?.includes("not available")) {
      return NextResponse.json({ 
        error: "Image generation is not available with your current plan. Try asking for a description instead." 
      }, { status: 200 });
    }

    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  }
}
