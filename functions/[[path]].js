export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let path = url.pathname.replace(/\/+$/, "");

  // ===== LOGIN =====
  if (path === "/login") {
    return html(`
      <h2>Login</h2>
      <input id="pass" type="password">
      <button onclick="login()">Login</button>
      <script>
      async function login(){
        const pass = document.getElementById("pass").value;
        const res = await fetch("/api/login",{method:"POST",body:JSON.stringify({password:pass})});
        const data = await res.json();
        if(data.success) location.href="/admin";
        else alert("Sai mật khẩu");
      }
      </script>
    `);
  }

  if (path === "/api/login") {
    const { password } = await request.json();
    if (password === env.ADMIN_PASS) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Set-Cookie": "auth=ok; path=/" }
      });
    }
    return json({ success: false });
  }

  const isAdmin = request.headers.get("cookie")?.includes("auth=ok");

  // ===== ADMIN =====
  if (path === "/admin") {
    if (!isAdmin) return Response.redirect("/login", 302);

    return html(`
      <h2>Link Manager</h2>
      <input id="key" placeholder="key">
      <input id="url" placeholder="url">
      <button onclick="add()">Add</button>
      <table id="table"></table>

<script>
async function add(){
  await fetch("/api/add",{method:"POST",body:JSON.stringify({
    key: key.value,
    target: url.value
  })});
  load();
}

async function load(){
  const res = await fetch("/api/list");
  const data = await res.json();

  let html = "<tr><th>Link</th><th>Clicks</th></tr>";

  data.forEach(d=>{
    html+=\`<tr>
    <td>\${location.origin+d.key}</td>
    <td>\${d.clicks}</td>
    </tr>\`
  });

  table.innerHTML = html;
}

load();
</script>
    `);
  }

  // ===== API =====
  if (path === "/api/add") {
    if (!isAdmin) return json({ error: "Unauthorized" });

    const { key, target } = await request.json();

    await env.LINKS.put("/" + key, JSON.stringify({
      url: target,
      clicks: 0
    }));

    return json({ success: true });
  }

  if (path === "/api/list") {
    if (!isAdmin) return json({ error: "Unauthorized" });

    const list = await env.LINKS.list();
    let result = [];

    for (const k of list.keys) {
      const d = JSON.parse(await env.LINKS.get(k.name));
      result.push({ key: k.name, ...d });
    }

    return json(result);
  }

  // ===== REDIRECT =====
  const data = await env.LINKS.get(path);

  if (data) {
    let obj = JSON.parse(data);
    obj.clicks++;
    await env.LINKS.put(path, JSON.stringify(obj));

    return Response.redirect(obj.url, 301);
  }

  return new Response("Not Found", { status: 404 });
}

function html(content) {
  return new Response(content, {
    headers: { "content-type": "text/html" }
  });
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" }
  });
}
