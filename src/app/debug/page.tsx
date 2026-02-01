export const dynamic = 'force-dynamic';

export default async function DebugPage() {
    const wpUrl = "https://memory.emma-kobayashi.com/wp-json/wp/v2/posts?per_page=5&_embed";
    let debugInfo = {
        url: wpUrl,
        status: 0,
        statusText: "",
        rawFirstPost: null as any,
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

        if (res.ok) {
            const posts = await res.json();
            if (posts.length > 0) {
                debugInfo.rawFirstPost = posts[0];
            }
        }

    } catch (e: any) {
        debugInfo.error = e.message;
    }

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4">WordPress Data Inspector</h1>

            <div className="space-y-4">
                <div className={`p-4 rounded ${debugInfo.status === 200 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <h2 className="font-bold">Fetch Status</h2>
                    <p>{debugInfo.status} {debugInfo.statusText}</p>
                    {debugInfo.error && <p className="text-red-600">Error: {debugInfo.error}</p>}
                </div>

                <div className="bg-gray-100 p-4 rounded">
                    <h2 className="font-bold mb-2">Raw JSON (First Post)</h2>
                    <p className="mb-2 text-xs text-gray-600">
                        Check for <code>meta</code>, <code>acf</code>, or custom fields below.
                    </p>
                    <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-[600px] whitespace-pre-wrap break-all">
                        {JSON.stringify(debugInfo.rawFirstPost, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
}
