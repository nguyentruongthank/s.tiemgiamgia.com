export async function onRequest(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  let path = url.pathname.replace(/\/+$/, "");

  if (path === "/admin") {
    return new Response("Admin OK");
  }

  return new Response("Hello từ Pages Functions");
}
