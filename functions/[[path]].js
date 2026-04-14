export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let path = url.pathname.replace(/\/+$/, "");

  const isAdmin = request.headers.get("cookie")?.includes("auth=ok");

  // ===== LOGIN =====
  if (path === "/login") {
    return html(`
    <h2>🔐 Login</h2>
    <input id="pass" type="password" placeholder="Password">
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

  // ===== ADMIN =====
  if (path === "/admin") {
    if (!isAdmin) return Response.redirect("/login", 302);

    return html(`
<style>
body { font-family: Arial; padding:20px; background:#f5f5f5 }
input { padding:8px; margin:5px }
button { padding:8px 12px; cursor:pointer }
table { width:100%; margin-top:20px; background:white; border-collapse: collapse }
td,th { padding:10px; border:1px solid #ddd }
</style>

<h2>📊 Link Manager PRO</h2>

<input id="key" placeholder="key">
<input id="url" placeholder="url">
<button onclick="add()">➕ Add</button>
<button onclick="exportCSV()">📥 Export CSV</button>

<canvas id="chart" height="100"></canvas>

<table id="table"></table>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

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

  let labels = [];
  let clicks = [];

  data.forEach(d=>{
    html+=\`<tr>
      <td>\${location.origin+d.key}</td>
      <td>\${d.clicks}</td>
    </tr>\`;

    labels.push(d.key);
    clicks.push(d.clicks);
  });

  table.innerHTML = html;

  renderChart(labels, clicks);
}

function renderChart(labels, data){
  new Chart(document.getElementById("chart"), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Clicks',
        data: data
      }]
    }
  });
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
  return new Response(content, {
    headers: { "content-type": "text/html" }
  });
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" }
  });
}
