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

    const searchQuery = encodeURIComponent(query.trim());
    const imageUrls: string[] = [];
    
    // Primary: Wikimedia Commons API
    try {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&srnamespace=6&srlimit=15&format=json&origin=*`;
      
      const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
      const searchData = await searchRes.json();
      
      if (searchData.query?.search?.length > 0) {
        const titles = searchData.query.search.map((r: { title: string }) => r.title);
        
        const imageinfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles.join('|'))}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
        
        const infoRes = await fetch(imageinfoUrl, { next: { revalidate: 3600 } });
        const infoData = await infoRes.json();
        
        const pages = infoData.query?.pages || {};
        
        for (const page of Object.values(pages) as { imageinfo?: { thumburl?: string; url?: string }[] }[]) {
          const info = page.imageinfo?.[0];
          if (info?.thumburl) {
            imageUrls.push(info.thumburl);
          } else if (info?.url) {
            const url = info.url;
            if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
              imageUrls.push(url);
            }
          }
        }
        
        console.log(`Wikimedia search for "${query}": found ${imageUrls.length} images`);
      }
    } catch (wikiError) {
      console.error("Wikimedia API error:", wikiError);
    }

    // Fallback: LoremFlickr (reliable alternative to deprecated unsplash)
    if (imageUrls.length === 0) {
      const fallbackUrl = `https://loremflickr.com/800/600/${searchQuery}?lock=0-100`;
      imageUrls.push(fallbackUrl);
      console.log(`Using LoremFlickr fallback for "${query}"`);
    }

    // If still empty, return placeholder
    if (imageUrls.length === 0) {
      return NextResponse.json({
        query,
        images: [],
        error: "No images found"
      });
    }

    return NextResponse.json({
      query,
      images: imageUrls.slice(0, 6),
    });

  } catch (error) {
    console.error("Image search error:", error);
    return NextResponse.json({ error: "Image search failed", images: [] }, { status: 500 });
  }
}
