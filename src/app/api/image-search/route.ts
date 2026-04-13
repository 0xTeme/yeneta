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
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&srnamespace=6&srlimit=10&format=json&origin=*`;
    
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    const imageUrls: string[] = [];
    
    if (searchData.query?.search) {
      const titles = searchData.query.search.map((r: any) => r.title);
      
      if (titles.length > 0) {
        const imageinfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles.join('|'))}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
        
        const infoRes = await fetch(imageinfoUrl);
        const infoData = await infoRes.json();
        
        const pages = infoData.query?.pages || {};
        
        for (const page of Object.values(pages) as any[]) {
          if (page.imageinfo?.[0]?.thumburl) {
            imageUrls.push(page.imageinfo[0].thumburl);
          } else if (page.imageinfo?.[0]?.url) {
            const url = page.imageinfo[0].url;
            if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
              imageUrls.push(url);
            }
          }
        }
      }
    }

    if (imageUrls.length === 0) {
      imageUrls.push(`https://source.unsplash.com/800x600/?${searchQuery}`);
    }

    return NextResponse.json({
      query,
      images: imageUrls.slice(0, 6),
    });

  } catch (error) {
    console.error("Image search error:", error);
    return NextResponse.json({ error: "Image search failed" }, { status: 500 });
  }
}
