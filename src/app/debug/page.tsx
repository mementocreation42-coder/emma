export const dynamic = 'force-dynamic';

export default async function DebugPage() {
    const wpUrl = "https://memory.emma-kobayashi.com/wp-json/wp/v2/posts?per_page=100&_embed";
    let debugInfo = {
        url: wpUrl,
        status: 0,
        statusText: "",
        headers: {} as Record<string, string>,
        rawCount: 0,
        filteredCount: 0,
        filteredReason: [] as string[],
        error: "",
    };

    try {
        const res = await fetch(wpUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            cache: 'no-store'
        });

        debugInfo.status = res.status;
        debugInfo.statusText = res.statusText;

        res.headers.forEach((val, key) => {
            debugInfo.headers[key] = val;
        });

        if (res.ok) {
            const posts = await res.json();
            debugInfo.rawCount = posts.length;

            // Simulate filtering logic
            const validPosts = posts.filter((post: any) => {
                const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0];
                const content = post.content?.rendered || "";
                const hasImgTag = /<img[^>]+src="([^"]+)"/i.test(content);
                const hasVideo = /<video[^>]+src="([^"]+)"/i.test(content);

                const hasMedia = featuredMedia || hasImgTag || hasVideo;

                if (!hasMedia) {
                    debugInfo.filteredReason.push(`Post ID ${post.id} "${post.title.rendered}": No featured media or content images`);
                }
                return hasMedia;
            });

            debugInfo.filteredCount = validPosts.length;
        }

    } catch (e: any) {
        debugInfo.error = e.message;
    }

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4">WordPress Content Debug</h1>

            <div className="space-y-4">
                <div className={`p-4 rounded ${debugInfo.status === 200 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <h2 className="font-bold">Fetch Status</h2>
                    <p>{debugInfo.status} {debugInfo.statusText}</p>
                    {debugInfo.error && <p className="text-red-600">Error: {debugInfo.error}</p>}
                </div>

                <div className="bg-blue-50 p-4 rounded">
                    <h2 className="font-bold">Content Analysis</h2>
                    <p>Total Posts Fetched: <strong>{debugInfo.rawCount}</strong></p>
                    <p>Posts with Media (Visible): <strong>{debugInfo.filteredCount}</strong></p>
                </div>

                {debugInfo.filteredReason.length > 0 && (
                    <div className="bg-orange-50 p-4 rounded">
                        <h2 className="font-bold mb-2">Hidden Posts (No Media)</h2>
                        <ul className="list-disc pl-5 space-y-1 text-xs">
                            {debugInfo.filteredReason.map((reason, i) => (
                                <li key={i}>{reason}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
