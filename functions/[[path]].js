export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let path = url.pathname.replace(/\/+$/, "");

  const isAdmin = request.headers.get("cookie")?.includes("auth=ok");

  // ===== LOGIN =====
  if (path === "/login") {
    return html(`
<style>
body{font-family:sans-serif;background:#f5f5f5;padding:40px}
.box{background:white;padding:20px;border-radius:8px;max-width:300px;margin:auto}
input,button{width:100%;padding:10px;margin-top:10px}
</style>

<div class="box">
<h2>🔐 Login</h2>
<input id="pass" type="password" placeholder="Password">
<button onclick="login()">Login</button>
</div>

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

  // ===== ADMIN =====
  if (path === "/admin") {
    if (!isAdmin) return Response.redirect("/login", 302);

    return html(`
<style>
body{font-family:sans-serif;background:#f5f5f5;padding:20px}
.card{background:white;padding:15px;border-radius:8px;margin-bottom:15px}
input{padding:8px;margin:5px}
button{padding:8px 12px;cursor:pointer}
table{width:100%;background:white;border-collapse:collapse}
td,th{padding:10px;border:1px solid #ddd}
.top{display:flex;gap:10px;flex-wrap:wrap}
</style>

<h2>📊 Link Manager PRO</h2>

<div class="card top">
<input id="key" placeholder="key">
<input id="url" placeholder="url">
<button onclick="add()">➕ Add</button>
<button onclick="exportCSV()">📥 Export CSV</button>
<button onclick="logout()">🚪 Logout</button>
</div>

<div class="card">
<b>Tổng link:</b> <span id="total">0</span> |
<b>Tổng click:</b> <span id="clicks">0</span>
</div>

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

  let total = 0;

  data.forEach(d=>{
    html+=\`<tr>
      <td>\${location.origin+d.key}</td>
      <td>\${d.clicks}</td>
    </tr>\`;

    total += d.clicks;
  });

  table.innerHTML = html;
  document.getElementById("total").innerText = data.length;
  document.getElementById("clicks").innerText = total;
}

function exportCSV(){
  fetch("/api/list").then(r=>r.json()).then(data=>{
    let csv = "link,clicks\\n";
    data.forEach(d=>{
      csv += d.key + "," + d.clicks + "\\n";
    });

    const blob = new Blob([csv]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.csv";
    a.click();
  });
}

function logout(){
  document.cookie = "auth=; Max-Age=0; path=/";
  location.href="/login";
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

  // ===== RANDOM DEAL =====
  if (path === "/deal") {
    const list = await env.LINKS.list();
    if (list.keys.length === 0) {
      return new Response("No link");
    }

    const random = list.keys[Math.floor(Math.random()*list.keys.length)];
    const data = JSON.parse(await env.LINKS.get(random.name));

    return Response.redirect(data.url, 302);
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
  return new Response(`
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Link Manager</title>
  </head>
  <body>
  ${content}
  </body>
  </html>
  `, {
    headers: { "content-type": "text/html; charset=UTF-8" }
  });
}
function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" }
  });
}
