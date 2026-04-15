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

    const searchQuery = query.trim();
    const imageUrls: string[] = [];
    
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodedQuery}&srnamespace=6&srlimit=20&srprop=size&format=json&origin=*`;
      
      const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
      const searchData = await searchRes.json();
      
      if (searchData.query?.search?.length > 0) {
        const results = searchData.query.search;
        
        const titles = results
          .slice(0, 10)
          .map((r: { title: string }) => r.title);
        
        if (titles.length > 0) {
          const imageinfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles.join('|'))}&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=800&iiextmetadata=License,LicenseShortName&format=json&origin=*`;
          
          const infoRes = await fetch(imageinfoUrl, { next: { revalidate: 3600 } });
          const infoData = await infoRes.json();
          
          const pages = infoData.query?.pages || {};
          
          for (const page of Object.values(pages) as { 
            title?: string;
            imageinfo?: { 
              thumburl?: string; 
              url?: string; 
              mime?: string;
              size?: number;
            }[];
          }[]) {
            const info = page.imageinfo?.[0];
            if (!info) continue;
            
            const mime = info.mime || '';
            const isImage = mime.startsWith('image/');
            const isJpeg = mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';
            
            if (!isImage) continue;
            
            const thumbUrl = info.thumburl || info.url;
            if (thumbUrl) {
              const url = thumbUrl;
              const isValidFormat = url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
              
              if (isValidFormat || isJpeg) {
                imageUrls.push(url);
              }
            }
          }
        }
        
        console.log(`Wikimedia search for "${query}": found ${imageUrls.length} images`);
      }
    } catch (wikiError) {
      console.error("Wikimedia API error:", wikiError);
    }

    if (imageUrls.length === 0) {
      const fallbackUrl = `https://loremflickr.com/800/600/${encodeURIComponent(searchQuery)}?lock=0-100`;
      imageUrls.push(fallbackUrl);
      console.log(`Using LoremFlickr fallback for "${query}"`);
    }

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
