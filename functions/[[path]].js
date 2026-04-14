export async function onRequest(context) {
  const { request } = context;

  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/|\/$/g, "");

  if (!path) {
    return new Response("Trang link hoạt động 🚀");
  }

  // 🔥 link raw GitHub của bạn
  const GITHUB_RAW = "https://raw.githubusercontent.com/nguyentruongthanh/s.tiemgiamgia.com/main/links.txt";

  // fetch file
  const res = await fetch(GITHUB_RAW);
  const text = await res.text();

  const lines = text.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const [key, target] = line.split(/\s+/);

    if (key === path) {
      return Response.redirect(target, 301);
    }
  }

  return new Response("❌ Link không tồn tại", { status: 404 });
}
