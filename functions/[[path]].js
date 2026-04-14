export async function onRequest(context) {
  const { request, next } = context;

  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/|\/$/g, "");

  // 👉 BỎ QUA FILE STATIC
  if (
    url.pathname.startsWith("/links.txt") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.startsWith("/assets") ||
    url.pathname.includes(".")
  ) {
    return next(); // 👈 QUAN TRỌNG
  }

  if (!path) {
    return new Response("🚀 Link system running");
  }

  // 🔥 load file local
  const res = await fetch(new URL("/links.txt", request.url));
  const text = await res.text();

  const lines = text.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    let [key, ...rest] = line.split(/\s+/);
    let target = rest.join(" ");

    key = key.replace(/^\/|\/$/g, "");

    if (key === path) {
      return Response.redirect(target, 301);
    }
  }

  return new Response("❌ Link không tồn tại", { status: 404 });
}
