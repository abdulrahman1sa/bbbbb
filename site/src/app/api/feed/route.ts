import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await fetch('https://t.me/s/Bandaralgaloud', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            },
            next: { revalidate: 600 }
        });

        if (!response.ok) return new NextResponse('Error fetching feed', { status: 502 });

        const html = await response.text();
        const posts: any[] = [];

        const wrappers = html.split('tgme_widget_message_wrap');
        for (let i = 1; i < wrappers.length; i++) {
            const block = wrappers[i];

            const idMatch = block.match(/data-post="Bandaralgaloud\/(\d+)"/);
            if (!idMatch) continue;
            const id = idMatch[1];

            const photoRegex = /background-image:url\(['"]?(https:\/\/cdn[^'"\)]+)['"]?\)/g;
            const photos = [];
            let match;
            while ((match = photoRegex.exec(block)) !== null) {
                photos.push(match[1]);
            }

            let text = "";
            const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
            if (textMatch) {
                text = textMatch[1].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').trim();
            }

            let date = "";
            const dateMatch = block.match(/<time datetime="([^"]+)"/);
            if (dateMatch) {
                date = dateMatch[1];
            }

            if (photos.length > 0) {
                posts.push({ id, text, photos, date });
            }
        }

        return NextResponse.json(posts, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600'
            }
        });
    } catch (error) {
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
