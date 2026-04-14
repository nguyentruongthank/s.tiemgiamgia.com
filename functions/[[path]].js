let cache = null; // ⚡ cache RAM
let stats = {};   // 📊 click stats

export async function onRequest(context) {
  const { request, next } = context;

  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/|\/$/g, "");

  // ✅ cho phép static file chạy
  if (
    url.pathname.startsWith("/links.txt") ||
    url.pathname.includes(".")
  ) {
    return next();
  }

  if (!path) {
    return new Response("🚀 Link system PRO running");
  }

  // ⚡ LOAD + CACHE 1 LẦN
  if (!cache) {
    const res = await fetch(new URL("/links.txt", request.url));
    const text = await res.text();

    cache = {};
    const lines = text.split("\n");

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      let [key, ...rest] = line.split(/\s+/);
      let target = rest.join(" ");

      key = key.replace(/^\/|\/$/g, "");
      cache[key] = target;
    }

    console.log("🔥 Loaded links:", Object.keys(cache).length);
  }

  // 🔥 RANDOM DEAL
  if (path === "deal") {
    const keys = Object.keys(cache);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const target = cache[randomKey];

    stats[randomKey] = (stats[randomKey] || 0) + 1;

    return Response.redirect(target, 302);
  }

  // 🔍 CHECK LINK
  if (cache[path]) {
    stats[path] = (stats[path] || 0) + 1;

    return Response.redirect(cache[path], 301);
  }

  // 📊 XEM STATS (optional)
  if (path === "stats") {
    return new Response(JSON.stringify(stats, null, 2), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("❌ Link không tồn tại", { status: 404 });
}
