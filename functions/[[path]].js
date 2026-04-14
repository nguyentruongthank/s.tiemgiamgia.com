export async function onRequest(context) {
  const { request } = context;

  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/|\/$/g, "");

  // 👉 trang root
  if (!path) {
    return new Response("🚀 Link system running", {
      headers: { "content-type": "text/plain;charset=UTF-8" }
    });
  }

  // 🔥 CACHE
  const cache = caches.default;
  const cacheKey = new Request("https://cache/links");

  let response = await cache.match(cacheKey);

  let text;

  if (!response) {
    // 👉 fetch file local
    const res = await fetch(new URL("/links.txt", request.url));

    text = await res.text();

    // 👉 lưu vào cache
    response = new Response(text, {
      headers: {
        "Cache-Control": "public, max-age=300"
      }
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));

  } else {
    // 👉 lấy từ cache
    text = await response.text();
  }

  // 🔍 parse
  const lines = text.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    let [key, ...rest] = line.split(/\s+/);
    let target = rest.join(" ");

    // bỏ dấu /
    key = key.replace(/^\/|\/$/g, "");

    if (key === path) {
      return Response.redirect(target, 301);
    }
  }

  return new Response("❌ Link không tồn tại", {
    status: 404,
    headers: { "content-type": "text/plain;charset=UTF-8" }
  });
}
