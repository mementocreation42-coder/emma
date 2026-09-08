/**
 * Lock down the WordPress backend so photos and schedule entries are no longer
 * publicly readable.
 *
 *   node scripts/wp-lockdown.mjs             # backup → privatize → block anon REST → verify
 *   node scripts/wp-lockdown.mjs --rollback  # restore statuses from backup, deactivate plugin
 *
 * What it does:
 *  1. Snapshots every post's status to scripts/wp-status-backup.json
 *  2. Sets all publish/future posts (and the WP sample page) to "private"
 *     → they disappear from the public WP front-end, RSS feed, and sitemap
 *  3. Installs + activates the "Disable WP REST API" plugin
 *     → anonymous REST requests are rejected; the Next.js app authenticates
 *  4. Verifies: anonymous access blocked, authenticated access still works
 *
 * Requires WORDPRESS_APP_USERNAME / WORDPRESS_APP_PASSWORD (admin) in .env.local.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BACKUP = path.join(root, "scripts", "wp-status-backup.json");

const env = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const get = (k) => {
    const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
    return m ? m[1].trim().replace(/^"|"$/g, "") : null;
};
const API = get("WORDPRESS_API_URL") || "https://memory.emma-kobayashi.com/wp-json/wp/v2";
const SITE = API.replace(/\/wp-json.*$/, "");
const user = get("WORDPRESS_APP_USERNAME");
const pass = get("WORDPRESS_APP_PASSWORD");
if (!user || !pass) {
    console.error("WORDPRESS_APP_USERNAME / WORDPRESS_APP_PASSWORD missing in .env.local");
    process.exit(1);
}
const AUTH = { Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") };
const JSON_HEADERS = { ...AUTH, "Content-Type": "application/json" };

async function fetchAllPosts() {
    let all = [];
    for (let page = 1; ; page++) {
        const r = await fetch(
            `${API}/posts?status=any&per_page=100&page=${page}&_fields=id,status&context=edit`,
            { headers: AUTH }
        );
        if (!r.ok) throw new Error(`posts page ${page}: ${r.status}`);
        all = all.concat(await r.json());
        if (page >= Number(r.headers.get("x-wp-totalpages") || 1)) return all;
    }
}

async function setStatus(kind, id, status) {
    const r = await fetch(`${API}/${kind}/${id}`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status }),
    });
    return r.ok ? null : `${kind}/${id} → ${r.status}`;
}

async function inBatches(items, fn, size = 5) {
    const failures = [];
    for (let i = 0; i < items.length; i += size) {
        const results = await Promise.all(items.slice(i, i + size).map(fn));
        failures.push(...results.filter(Boolean));
        process.stdout.write(".");
    }
    console.log("");
    return failures;
}

async function verify() {
    console.log("\n=== 検証 ===");
    const anonPosts = await fetch(`${API}/posts?per_page=1&_fields=id`);
    const anonBody = await anonPosts.text();
    const anonLeaks = anonPosts.ok && anonBody.trim().startsWith("[") && anonBody.length > 5;
    console.log(`匿名REST posts: ${anonPosts.status} ${anonLeaks ? "← まだ見えています!" : "(遮断OK)"}`);

    const anonMedia = await fetch(`${API}/media?per_page=1&_fields=id`);
    const mediaBody = await anonMedia.text();
    const mediaLeaks = anonMedia.ok && mediaBody.trim().startsWith("[") && mediaBody.length > 5;
    console.log(`匿名REST media: ${anonMedia.status} ${mediaLeaks ? "← まだ見えています!" : "(遮断OK)"}`);

    const authed = await fetch(`${API}/posts?status=private,publish&per_page=1&_fields=id`, { headers: AUTH });
    console.log(`認証付き posts: ${authed.status} ${authed.ok ? "(アプリからの読み取りOK)" : "← アプリが読めません! 至急ロールバックを"}`);

    for (const [label, url] of [
        ["トップページ", `${SITE}/`],
        ["フィード", `${SITE}/feed/`],
    ]) {
        const r = await fetch(url, { redirect: "follow" });
        const html = await r.text();
        const links = (html.match(/\/20\d\d\/\d\d\/\d\d\//g) || []).length;
        console.log(`${label}: ${r.status}, 投稿リンク ${links} 件 ${links > 0 ? "← まだ露出" : "(非表示OK)"}`);
    }
    return { authedOk: authed.ok };
}

async function rollback() {
    if (!fs.existsSync(BACKUP)) {
        console.error("バックアップファイルがありません:", BACKUP);
        process.exit(1);
    }
    const snap = JSON.parse(fs.readFileSync(BACKUP, "utf8"));
    console.log(`ロールバック: ${snap.length} 件の投稿ステータスを復元します`);
    const failures = await inBatches(snap, (p) => setStatus("posts", p.id, p.status));
    console.log("復元失敗:", failures.length ? failures.slice(0, 10) : "なし");
    await setStatus("pages", 2, "publish");

    const r = await fetch(`${API}/plugins/disable-wp-rest-api/disable-wp-rest-api`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: "inactive" }),
    });
    console.log("プラグイン無効化:", r.status, r.ok ? "OK" : await r.text());
    await verify();
}

async function lockdown() {
    // 1. Backup
    const all = await fetchAllPosts();
    const counts = {};
    for (const p of all) counts[p.status] = (counts[p.status] || 0) + 1;
    console.log(`投稿 ${all.length} 件, 内訳: ${JSON.stringify(counts)}`);
    if (!fs.existsSync(BACKUP)) {
        fs.writeFileSync(BACKUP, JSON.stringify(all.map((p) => ({ id: p.id, status: p.status }))));
        console.log("バックアップ保存:", BACKUP);
    } else {
        console.log("既存のバックアップを保持:", BACKUP);
    }

    // 2. Privatize publish + future posts (future posts would auto-publish
    //    publicly when their date arrives; private ones never do)
    const targets = all.filter((p) => p.status === "publish" || p.status === "future");
    console.log(`非公開化: ${targets.length} 件`);
    const failures = await inBatches(targets, (p) => setStatus("posts", p.id, "private"));
    console.log("失敗:", failures.length ? failures.slice(0, 10) : "なし");
    const page = await setStatus("pages", 2, "private");
    console.log("サンプルページ非公開化:", page ?? "OK");

    // 3. Install + activate "Disable WP REST API" (blocks anonymous REST only;
    //    the app's Application-Password requests stay logged-in and pass)
    let r = await fetch(`${API}/plugins`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ slug: "disable-wp-rest-api", status: "active" }),
    });
    if (r.ok) {
        console.log("プラグイン インストール+有効化: OK");
    } else if (r.status === 500 || r.status === 400) {
        // Maybe already installed — try activating in place
        const t = await r.text();
        r = await fetch(`${API}/plugins/disable-wp-rest-api/disable-wp-rest-api`, {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ status: "active" }),
        });
        console.log(r.ok ? "プラグイン有効化: OK (インストール済みでした)" : `プラグイン有効化失敗: ${r.status} ${t}`);
    } else {
        console.log(`プラグイン インストール失敗: ${r.status}`, await r.text());
    }

    // 4. Verify
    const { authedOk } = await verify();
    if (!authedOk) {
        console.log("\n!!! 認証付きアクセスまで遮断されています。次で戻せます:");
        console.log("  node scripts/wp-lockdown.mjs --rollback");
        console.log("  (それも失敗する場合: wp-admin → プラグイン → Disable WP REST API を無効化)");
    } else {
        console.log("\n完了。戻したい場合: node scripts/wp-lockdown.mjs --rollback");
    }
}

(process.argv.includes("--rollback") ? rollback() : lockdown()).catch((e) => {
    console.error("エラー:", e.message);
    process.exit(1);
});
