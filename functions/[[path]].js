export async function onRequest(context) {
  const { request } = context;

  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/|\/$/g, ""); 
  // => "evo"

  const GITHUB_RAW = "https://raw.githubusercontent.com/nguyentruongthanh/s.tiemgiamgia.com/main/links.txt";

  const res = await fetch(GITHUB_RAW);
  const text = await res.text();

  const lines = text.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    let [key, target] = line.split(/\s+/);

    // 🔥 xử lý bỏ dấu /
    key = key.replace(/^\/|\/$/g, "");

    if (key === path) {
      return Response.redirect(target, 301);
    }
  }

  return new Response("❌ Link không tồn tại", { status: 404 });
}

  const cache = caches.default;
  let response = await cache.match(GITHUB_RAW);
  
  if (!response) {
    response = await fetch(GITHUB_RAW);
    response = new Response(response.body, response);
    response.headers.append("Cache-Control", "s-maxage=60");
    context.waitUntil(cache.put(GITHUB_RAW, response.clone()));
  }

const text = await response.text();
}
