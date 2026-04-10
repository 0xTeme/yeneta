import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { query } = await req.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Use Unsplash Source API (free, no API key needed)
    // Returns random image matching the search term
    const encodedQuery = encodeURIComponent(query.replace(/[^a-zA-Z0-9\s]/g, "").trim());
    
    // Generate multiple image URLs from different sources
    const images = [];
    
    // Unsplash Source (deprecated but still works)
    images.push(`https://source.unsplash.com/800x600/?${encodedQuery}`);
    
    // Picsum with seed for consistency
    const seed = encodedQuery.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    images.push(`https://picsum.photos/seed/${seed}/800/600`);
    
    // Lorem Flickr (Flickr-based placeholder)
    images.push(`https://loremflickr.com/800/600/${encodedQuery}?lock=${seed}`);
    
    // Additional Unsplash URL variations
    images.push(`https://images.unsplash.com/photo-search?w=800&h=600&q=80&query=${encodedQuery}`);

    return NextResponse.json({
      query,
      images,
      message: `Found images for: ${query}`,
    });

  } catch (error: any) {
    console.error("Image search error:", error);
    return NextResponse.json({ error: "Image search failed" }, { status: 500 });
  }
}
