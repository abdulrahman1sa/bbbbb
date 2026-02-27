import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idx = parseInt(searchParams.get('idx') || '0', 10);

    if (!id) {
        return new NextResponse('Missing id', { status: 400 });
    }

    try {
        const response = await fetch(`https://t.me/Bandaralgaloud/${id}?embed=1`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            },
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            return new NextResponse('Failed to fetch', { status: 502 });
        }

        const html = await response.text();
        const photoRegex = /background-image:url\(['"]?(https:\/\/cdn[^'"\)]+)['"]?\)/g;
        const matches = Array.from(html.matchAll(photoRegex));

        if (matches && matches.length > idx) {
            const freshUrl = matches[idx][1];
            const res = NextResponse.redirect(freshUrl, 302);
            res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
            return res;
        } else {
            const imgRegex = /<img[^>]+src=['"](https:\/\/cdn[^'"]+)['"]/g;
            const imgMatches = Array.from(html.matchAll(imgRegex));
            if (imgMatches && imgMatches.length > idx) {
                const freshUrl = imgMatches[idx][1];
                const res = NextResponse.redirect(freshUrl, 302);
                res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
                return res;
            }
            return new NextResponse('Image not found', { status: 404 });
        }
    } catch (error) {
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
