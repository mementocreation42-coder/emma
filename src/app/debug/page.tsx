export const dynamic = 'force-dynamic';

export default async function DebugPage() {
    const wpUrl = process.env.WORDPRESS_API_URL || "https://memory.emma-kobayashi.com/wp-json/wp/v2/posts?per_page=1";
    let debugInfo = {
        url: wpUrl,
        status: 0,
        statusText: "",
        headers: {} as Record<string, string>,
        bodyPreview: "",
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

        const text = await res.text();
        debugInfo.bodyPreview = text.substring(0, 500);

    } catch (e: any) {
        debugInfo.error = e.message;
    }

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4">WordPress Connection Debug</h1>

            <div className="space-y-4">
                <div className="bg-gray-100 p-4 rounded">
                    <h2 className="font-bold">Request Info</h2>
                    <p>URL: {debugInfo.url}</p>
                </div>

                <div className={`p-4 rounded ${debugInfo.status === 200 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <h2 className="font-bold">Response Status</h2>
                    <p>{debugInfo.status} {debugInfo.statusText}</p>
                    {debugInfo.error && <p className="text-red-600">Error: {debugInfo.error}</p>}
                </div>

                <div className="bg-gray-100 p-4 rounded">
                    <h2 className="font-bold mb-2">Response Headers</h2>
                    <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(debugInfo.headers, null, 2)}
                    </pre>
                </div>

                <div className="bg-gray-100 p-4 rounded">
                    <h2 className="font-bold mb-2">Body Preview</h2>
                    <pre className="whitespace-pre-wrap break-all bg-white p-2 border">
                        {debugInfo.bodyPreview}
                    </pre>
                </div>
            </div>
        </div>
    );
}
