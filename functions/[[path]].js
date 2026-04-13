export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname.replace(/\/+$/, "");

    // ===== AUTH CHECK =====
    const isAdmin = request.headers.get("cookie")?.includes("auth=ok");

    // ===== LOGIN PAGE =====
    if (path === "/login") {
      return html(loginHTML());
    }

    if (path === "/api/login") {
      const { password } = await request.json();

      if (password === env.ADMIN_PASS) {
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            "Set-Cookie": "auth=ok; path=/; HttpOnly"
          }
        });
      }
      return json({ success: false });
    }

    // ===== ADMIN =====
    if (path === "/admin") {
      if (!isAdmin) return Response.redirect("/login", 302);
      return html(adminHTML());
    }

    // ===== RATE LIMIT =====
    const ip = request.headers.get("cf-connecting-ip");
    const keyRate = "rate:" + ip;
    let count = await env.RATE.get(keyRate);

    if (count > 100) {
      return new Response("Too many requests", { status: 429 });
    }
    await env.RATE.put(keyRate, (parseInt(count || 0) + 1), { expirationTtl: 60 });

    // ===== API =====
    if (path.startsWith("/api")) {
      if (!isAdmin) return json({ error: "Unauthorized" });

      // ADD
      if (path === "/api/add") {
        const { key, target } = await request.json();

        await env.LINKS.put("/" + key, JSON.stringify({
          url: target,
          clicks: 0,
          created: Date.now()
        }));

        return json({ success: true });
      }

      // DELETE
      if (path === "/api/delete") {
        const { key } = await request.json();
        await env.LINKS.delete("/" + key);
        return json({ success: true });
      }

      // LIST
      if (path === "/api/list") {
        const list = await env.LINKS.list();
        let result = [];

        await Promise.all(list.keys.map(async k => {
          const data = JSON.parse(await env.LINKS.get(k.name));
          result.push({ key: k.name, ...data });
        }));

        return json(result);
      }

      // EXPORT CSV
      if (path === "/api/export") {
        const list = await env.LINKS.list();
        let csv = "key,url,clicks\n";

        for (const k of list.keys) {
          const d = JSON.parse(await env.LINKS.get(k.name));
          csv += `${k.name},${d.url},${d.clicks}\n`;
        }

        return new Response(csv, {
          headers: {
            "content-type": "text/csv",
            "Content-Disposition": "attachment; filename=links.csv"
          }
        });
      }
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
};

// ===== UI =====

function html(content) {
  return new Response(content, {
    headers: { "content-type": "text/html;charset=UTF-8" }
  });
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" }
  });
}

function loginHTML() {
  return `
  <h2>Login</h2>
  <input id="pass" type="password" placeholder="Password">
  <button onclick="login()">Login</button>

  <script>
  async function login() {
    const pass = document.getElementById("pass").value;

    const res = await fetch("/api/login", {
      method:"POST",
      body: JSON.stringify({ password: pass })
    });

    const data = await res.json();
    if(data.success) location.href="/admin";
    else alert("Sai mật khẩu");
  }
  </script>
  `;
}

function adminHTML() {
  return `
  <h2>🔥 PRO Link Manager</h2>

  <input id="key" placeholder="key">
  <input id="url" placeholder="url">
  <button onclick="add()">Add</button>
  <button onclick="exportCSV()">Export CSV</button>

  <input id="search" placeholder="search..." oninput="load()">

  <div id="stats"></div>
  <table id="table"></table>

<script>
async function add(){
  await fetch("/api/add",{method:"POST",body:JSON.stringify({
    key: key.value,
    target: url.value
  })});
  load();
}

async function exportCSV(){
  window.location="/api/export";
}

async function load(){
  const res = await fetch("/api/list");
  let data = await res.json();

  const q = document.getElementById("search").value.toLowerCase();
  data = data.filter(d => d.key.includes(q) || d.url.includes(q));

  let total = data.reduce((a,b)=>a+b.clicks,0);

  stats.innerHTML = "Total Clicks: " + total;

  let html = "<tr><th>Link</th><th>Clicks</th><th></th></tr>";

  data.sort((a,b)=>b.clicks-a.clicks);

  data.forEach(d=>{
    html+=\`<tr>
    <td>\${location.origin+d.key}</td>
    <td>\${d.clicks}</td>
    <td><button onclick="del('\${d.key}')">X</button></td>
    </tr>\`
  });

  table.innerHTML = html;
}

async function del(key){
  await fetch("/api/delete",{method:"POST",body:JSON.stringify({key:key.replace("/","")})});
  load();
}

load();
</script>
  `;
}
