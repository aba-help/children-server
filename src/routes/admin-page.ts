/**
 * The admin page served at GET /admin (src/routes/admin.ts). Plain HTML + JS, no build step.
 * It signs in with POST /login, keeps the token in sessionStorage (gone when the tab closes)
 * and works only for super admins. User names come from users, so the page writes every value
 * with textContent, never as HTML.
 */
export const ADMIN_PAGE = String.raw`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>АВАша - доступ к разделам и заявки</title>
<style>
  :root { --green: #11704D; --bg: #F8FAFC; --line: #E5E7EB; --text: #1F2937; --muted: #6B7280; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: var(--text); background: var(--bg); }
  header { background: var(--green); color: #fff; padding: 14px 20px; display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 18px; margin: 0; flex: 1; }
  header button { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.6); }
  main { padding: 20px; }
  button { font: inherit; border-radius: 8px; border: 1px solid var(--line); background: #fff; padding: 6px 12px; cursor: pointer; }
  button.primary { background: var(--green); color: #fff; border-color: var(--green); }
  input[type=email], input[type=password], input[type=search], input[type=text] { font: inherit; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; width: 100%; }
  .card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 20px; }
  #login { max-width: 360px; margin: 60px auto; display: grid; gap: 12px; }
  #login h2 { margin: 0 0 4px; font-size: 18px; }
  .error { color: #B4344E; min-height: 1.2em; font-size: 14px; }
  .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
  .toolbar input { max-width: 320px; }
  .status { color: var(--muted); font-size: 14px; }
  .wrap { overflow-x: auto; background: #fff; border: 1px solid var(--line); border-radius: 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: center; white-space: nowrap; }
  th { background: #F3F8F5; font-weight: 600; position: sticky; top: 0; }
  th.section { white-space: normal; min-width: 84px; font-size: 13px; }
  td.user, th.user { text-align: left; }
  td.user .email { font-weight: 600; }
  td.user .name { color: var(--muted); font-size: 13px; }
  tr:last-child td { border-bottom: none; }
  input[type=checkbox] { width: 20px; height: 20px; accent-color: var(--green); cursor: pointer; }
  input[type=checkbox]:disabled { cursor: default; }
  .row-actions button { padding: 3px 8px; font-size: 13px; }
  .badge { display: inline-block; font-size: 12px; background: #D1FAE5; color: #065F46; border-radius: 6px; padding: 1px 6px; margin-left: 6px; }
  #newUser { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; padding: 14px 16px; }
  #newUser h3 { margin: 0 8px 0 0; font-size: 15px; }
  #newUser input { width: auto; flex: 1 1 180px; }
  #newUser .error { flex-basis: 100%; min-height: 0; }
  button.danger { color: #B4344E; border-color: #F1C6CF; }
  .hidden { display: none !important; }
  tr.parts td { text-align: left; white-space: normal; background: #FBFDFC; }
  /* stays at the left edge when the wide table is scrolled sideways */
  .partGroups { display: flex; gap: 32px; flex-wrap: wrap; position: sticky; left: 10px; max-width: calc(100vw - 80px); }
  .partGroup h4 { margin: 4px 0 8px; font-size: 14px; }
  .partGroup .note { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
  .partGroup label { display: flex; align-items: center; gap: 8px; padding: 2px 0; font-size: 14px; }
  .partGroup label.child { padding-left: 26px; }
  .partGroup input[type=checkbox] { width: 16px; height: 16px; }
  #requests { margin-bottom: 16px; padding: 14px 16px; }
  #requests .head { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
  #requests h3 { margin: 0; font-size: 15px; }
  #requests .count { background: #FDE68A; color: #92400E; border-radius: 999px; padding: 1px 8px; font-size: 13px; font-weight: 600; }
  #requests .mailNote { color: var(--muted); font-size: 13px; }
  #requests .mailNote.warn { color: #B45309; }
  #requests table td, #requests table th { text-align: left; white-space: normal; }
  #requests td.row-actions { min-width: 220px; }
  #requests td.row-actions button { margin: 2px 0; }
  #requests tr.done td { color: var(--muted); }
  #requests .empty { color: var(--muted); font-size: 14px; padding: 4px 0; }
  #requests .mailErr { color: #B4344E; font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>АВАша - доступ к разделам</h1>
  <span id="who"></span>
  <button id="logout" class="hidden">Выйти</button>
</header>
<main>
  <form id="login" class="card">
    <h2>Вход для администратора</h2>
    <input id="email" type="email" placeholder="Email" autocomplete="username" required>
    <input id="password" type="password" placeholder="Пароль" autocomplete="current-password" required>
    <button class="primary" type="submit">Войти</button>
    <div id="loginError" class="error"></div>
  </form>

  <section id="admin" class="hidden">
    <div id="requests" class="card">
      <div class="head">
        <h3>Заявки на доступ</h3>
        <span id="reqCount" class="count hidden"></span>
        <label class="mailNote"><input id="showDone" type="checkbox" style="width:14px;height:14px"> показать обработанные</label>
        <span id="mailNote" class="mailNote"></span>
      </div>
      <div class="wrap"><table id="reqTable"></table></div>
    </div>
    <form id="newUser" class="card">
      <h3>Новый пользователь</h3>
      <input id="newEmail" type="email" placeholder="Email" autocomplete="off" required>
      <input id="newPassword" type="text" placeholder="Пароль" autocomplete="off" required>
      <input id="newName" type="text" placeholder="Имя (необязательно)" autocomplete="off">
      <button class="primary" type="submit">Создать</button>
      <div id="newUserError" class="error"></div>
    </form>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Поиск по email или имени">
      <span id="status" class="status"></span>
    </div>
    <div class="wrap"><table id="users"></table></div>
    <p class="status">Новый пользователь создаётся без открытых разделов. Галочка - раздел открыт пользователю: все его платные части доступны. Изменения сохраняются сразу.
      Суперадмины видят всё всегда.
      В Макатопе и Медиатеке можно открыть отдельные категории и альбомы: кнопка «категории и альбомы» у пользователя.</p>
  </section>
</main>
<script>
(function () {
  var TOKEN_KEY = "avasha_admin_token";
  var EMAIL_KEY = "avasha_admin_email";
  var token = sessionStorage.getItem(TOKEN_KEY);
  var sections = [];
  var users = [];
  // Макатоп categories and Медиатека albums opened on their own; shown per user on demand
  var parts = [];
  var expanded = {};
  // «ПОЛУЧИТЬ ДОСТУП» requests from the app
  var requests = [];
  var mail = null;
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function setStatus(text) { $("status").textContent = text || ""; }

  function api(method, path, body) {
    return fetch(path, {
      method: method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401 || res.status === 403) { signOut(res.status === 403 ? "Нет прав администратора" : "Войдите снова"); throw new Error("auth"); }
        if (!res.ok) throw new Error(data.message || ("HTTP " + res.status));
        return data;
      });
    });
  }

  function signOut(message) {
    token = null;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    $("admin").classList.add("hidden");
    $("logout").classList.add("hidden");
    $("login").classList.remove("hidden");
    $("who").textContent = "";
    $("loginError").textContent = message || "";
  }

  function render() {
    var q = $("search").value.trim().toLowerCase();
    var table = $("users");
    table.textContent = "";
    var head = el("tr");
    head.appendChild(el("th", { "class": "user" }, "Пользователь"));
    sections.forEach(function (s) { head.appendChild(el("th", { "class": "section" }, s.title)); });
    head.appendChild(el("th", null, ""));
    var thead = el("thead"); thead.appendChild(head); table.appendChild(thead);

    var tbody = el("tbody");
    users.filter(function (u) {
      return !q || u.email.toLowerCase().indexOf(q) >= 0 || (u.userName || "").toLowerCase().indexOf(q) >= 0;
    }).forEach(function (u) {
      var tr = el("tr");
      var who = el("td", { "class": "user" });
      var email = el("div", { "class": "email" }, u.email);
      if (u.isSuperAdmin) email.appendChild(el("span", { "class": "badge" }, "суперадмин"));
      who.appendChild(email);
      who.appendChild(el("div", { "class": "name" }, (u.userName || "") + " · " + new Date(u.createdAt).toLocaleDateString("ru-RU")));
      tr.appendChild(who);

      sections.forEach(function (s) {
        var td = el("td");
        var box = el("input", { type: "checkbox", title: s.title });
        box.checked = u.isSuperAdmin || !!u.sectionAccess[s.id];
        box.disabled = u.isSuperAdmin;
        box.addEventListener("change", function () {
          var change = {}; change[s.id] = box.checked;
          save(u, change);
        });
        td.appendChild(box);
        tr.appendChild(td);
      });

      var actions = el("td", { "class": "row-actions" });
      if (!u.isSuperAdmin) {
        [["всё", true], ["ничего", false]].forEach(function (pair) {
          var b = el("button", { type: "button" }, pair[0]);
          b.addEventListener("click", function () {
            var change = {};
            sections.forEach(function (s) { change[s.id] = pair[1]; });
            save(u, change);
          });
          actions.appendChild(b);
          actions.appendChild(document.createTextNode(" "));
        });
        var partCount = (u.partAccess || []).length;
        var more = el("button", { type: "button" }, (expanded[u.id] ? "▴ " : "▾ ") + "категории и альбомы" + (partCount ? " (" + partCount + ")" : ""));
        more.addEventListener("click", function () { expanded[u.id] = !expanded[u.id]; render(); });
        actions.appendChild(more);
        actions.appendChild(document.createTextNode(" "));
        var del = el("button", { type: "button", "class": "danger" }, "удалить");
        del.addEventListener("click", function () { removeUser(u); });
        actions.appendChild(del);
      }
      tr.appendChild(actions);
      tbody.appendChild(tr);
      if (expanded[u.id] && !u.isSuperAdmin) tbody.appendChild(partsRow(u));
    });
    table.appendChild(tbody);
  }

  // Макатоп: each category opens its songs and symbols. Медиатека: an album, or one sub-album.
  // With the whole section ticked everything is open anyway, so the boxes are shown ticked + grey.
  function partsRow(u) {
    var tr = el("tr", { "class": "parts" });
    var td = el("td", { colspan: String(sections.length + 2) });
    var groups = el("div", { "class": "partGroups" });
    var open = {};
    (u.partAccess || []).forEach(function (id) { open[id] = true; });
    sections.filter(function (s) {
      return parts.some(function (p) { return p.section === s.id; });
    }).forEach(function (s) {
      var group = el("div", { "class": "partGroup" });
      group.appendChild(el("h4", null, s.title));
      var whole = !!u.sectionAccess[s.id];
      group.appendChild(el("div", { "class": "note" }, whole
        ? "Открыт весь раздел. Чтобы открыть только часть, снимите галочку раздела в таблице."
        : "Без галочки в каждом списке открыто только первое видео."));
      parts.filter(function (p) { return p.section === s.id; }).forEach(function (p) {
        var label = el("label", { "class": p.parent ? "child" : "" });
        var box = el("input", { type: "checkbox" });
        // a sub-album is open when it or its whole album is ticked
        var viaParent = p.parent && open[p.parent];
        box.checked = whole || !!open[p.id] || !!viaParent;
        box.disabled = whole || !!viaParent;
        box.addEventListener("change", function () {
          var change = {}; change[p.id] = box.checked;
          saveParts(u, change);
        });
        label.appendChild(box);
        label.appendChild(document.createTextNode(p.title));
        group.appendChild(label);
      });
      groups.appendChild(group);
    });
    td.appendChild(groups);
    tr.appendChild(td);
    return tr;
  }

  function saveParts(user, change) {
    setStatus("Сохраняю…");
    api("PATCH", "/admin/api/users/" + encodeURIComponent(user.id) + "/parts", { partAccess: change })
      .then(function (data) {
        users = users.map(function (u) { return u.id === data.user.id ? data.user : u; });
        render();
        setStatus("Сохранено: " + user.email);
      })
      .catch(function (err) {
        if (err.message === "auth") return;
        render();
        setStatus("Не сохранилось: " + err.message);
      });
  }

  function save(user, change) {
    setStatus("Сохраняю…");
    api("PATCH", "/admin/api/users/" + encodeURIComponent(user.id) + "/access", { sectionAccess: change })
      .then(function (data) {
        users = users.map(function (u) { return u.id === data.user.id ? data.user : u; });
        render();
        setStatus("Сохранено: " + user.email);
      })
      .catch(function (err) {
        if (err.message === "auth") return;
        render(); // back to the saved state
        setStatus("Не сохранилось: " + err.message);
      });
  }

  function removeUser(user) {
    if (!confirm("Удалить пользователя " + user.email + "? Вернуть его будет нельзя, только создать заново.")) return;
    setStatus("Удаляю…");
    api("DELETE", "/admin/api/users/" + encodeURIComponent(user.id))
      .then(function () {
        users = users.filter(function (u) { return u.id !== user.id; });
        render();
        setStatus("Удалён: " + user.email);
      })
      .catch(function (err) { if (err.message !== "auth") setStatus("Не удалилось: " + err.message); });
  }

  function sectionTitle(id) {
    var s = sections.filter(function (x) { return x.id === id; })[0];
    return s ? s.title : id;
  }

  function renderRequests() {
    var fresh = requests.filter(function (r) { return r.status === "new"; }).length;
    $("reqCount").textContent = "новых: " + fresh;
    $("reqCount").classList.toggle("hidden", !fresh);
    var note = $("mailNote");
    if (mail && mail.configured) {
      note.textContent = "Письма о заявках уходят на " + mail.recipients.join(", ");
      note.classList.remove("warn");
    } else {
      note.textContent = "Почта не настроена: заявки видны только здесь";
      note.classList.add("warn");
    }
    var showDone = $("showDone").checked;
    var list = requests.filter(function (r) { return showDone || r.status === "new"; });
    var table = $("reqTable");
    table.textContent = "";
    if (!list.length) {
      var row = el("tr"); row.appendChild(el("td", { "class": "empty" }, showDone ? "Заявок нет" : "Новых заявок нет"));
      table.appendChild(row);
      return;
    }
    var head = el("tr");
    ["Дата", "Имя", "Email", "Телефон", "Раздел", "Язык", ""].forEach(function (t) { head.appendChild(el("th", null, t)); });
    var thead = el("thead"); thead.appendChild(head); table.appendChild(thead);
    var tbody = el("tbody");
    list.forEach(function (r) {
      var tr = el("tr", { "class": r.status === "done" ? "done" : "" });
      tr.appendChild(el("td", null, new Date(r.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })));
      tr.appendChild(el("td", null, r.name));
      var mailTd = el("td");
      var link = el("a", { href: "mailto:" + r.email }, r.email);
      mailTd.appendChild(link);
      if (r.mailError && mail && mail.configured) mailTd.appendChild(el("div", { "class": "mailErr", title: r.mailError }, "письмо не ушло"));
      tr.appendChild(mailTd);
      tr.appendChild(el("td", null, r.phone || "—"));
      tr.appendChild(el("td", null, sectionTitle(r.section)));
      tr.appendChild(el("td", null, r.lang === "en" ? "англ." : "рус."));
      var actions = el("td", { "class": "row-actions" });
      var exists = users.some(function (u) { return u.email.toLowerCase() === r.email.toLowerCase(); });
      if (!exists) {
        var create = el("button", { type: "button" }, "создать пользователя");
        create.addEventListener("click", function () {
          $("newEmail").value = r.email;
          $("newName").value = r.name;
          $("newPassword").focus();
          setStatus("Придумайте пароль и нажмите «Создать», потом отметьте разделы.");
        });
        actions.appendChild(create);
        actions.appendChild(document.createTextNode(" "));
      } else {
        actions.appendChild(el("span", { "class": "badge" }, "уже пользователь"));
        actions.appendChild(document.createTextNode(" "));
      }
      var toggle = el("button", { type: "button" }, r.status === "new" ? "обработано" : "вернуть в новые");
      toggle.addEventListener("click", function () {
        var status = r.status === "new" ? "done" : "new";
        api("PATCH", "/admin/api/access-requests/" + encodeURIComponent(r.id), { status: status })
          .then(function () { r.status = status; renderRequests(); })
          .catch(function (err) { if (err.message !== "auth") setStatus("Не сохранилось: " + err.message); });
      });
      actions.appendChild(toggle);
      actions.appendChild(document.createTextNode(" "));
      var del = el("button", { type: "button", "class": "danger" }, "удалить");
      del.addEventListener("click", function () {
        if (!confirm("Удалить заявку " + r.email + "?")) return;
        api("DELETE", "/admin/api/access-requests/" + encodeURIComponent(r.id))
          .then(function () { requests = requests.filter(function (x) { return x.id !== r.id; }); renderRequests(); })
          .catch(function (err) { if (err.message !== "auth") setStatus("Не удалилось: " + err.message); });
      });
      actions.appendChild(del);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
  }

  function load() {
    setStatus("Загружаю…");
    return Promise.all([api("GET", "/admin/api/sections"), api("GET", "/admin/api/users"), api("GET", "/admin/api/access-requests")])
      .then(function (results) {
        sections = results[0].sections;
        parts = results[0].parts || [];
        users = results[1].users;
        requests = results[2].requests || [];
        mail = results[2].mail || null;
        renderRequests();
        $("login").classList.add("hidden");
        $("admin").classList.remove("hidden");
        $("logout").classList.remove("hidden");
        render();
        setStatus("Пользователей: " + users.length);
      })
      .catch(function (err) { if (err.message !== "auth") setStatus("Ошибка: " + err.message); });
  }

  $("login").addEventListener("submit", function (event) {
    event.preventDefault();
    $("loginError").textContent = "";
    fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("email").value.trim(), password: $("password").value })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(res.status === 401 ? "Неверный email или пароль" : (data.message || "Ошибка входа"));
        if (!data.user || !data.user.isSuperAdmin) throw new Error("Нет прав администратора");
        token = data.token;
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(EMAIL_KEY, data.user.email);
        $("password").value = "";
        $("who").textContent = data.user.email;
        return load();
      });
    }).catch(function (err) { $("loginError").textContent = err.message; });
  });

  $("newUser").addEventListener("submit", function (event) {
    event.preventDefault();
    $("newUserError").textContent = "";
    api("POST", "/admin/api/users", {
      email: $("newEmail").value.trim(),
      password: $("newPassword").value,
      userName: $("newName").value.trim() || undefined
    }).then(function (data) {
      users = [data.user].concat(users);
      $("newEmail").value = ""; $("newPassword").value = ""; $("newName").value = "";
      render();
      renderRequests();
      setStatus("Создан: " + data.user.email + ". Отметьте ему разделы.");
    }).catch(function (err) {
      if (err.message !== "auth") $("newUserError").textContent = err.message;
    });
  });

  $("logout").addEventListener("click", function () { signOut(""); });
  $("search").addEventListener("input", render);
  $("showDone").addEventListener("change", renderRequests);

  if (token) {
    $("who").textContent = sessionStorage.getItem(EMAIL_KEY) || "";
    load();
  }
})();
</script>
</body>
</html>
`;
