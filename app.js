/* Laverie Transfer — self-contained staff walkthrough.
   Fake data only. State lives in localStorage. */
(function () {
  const KEY = "laverie-demo-v2";
  const WM = "img/laverie-wordmark-orange.png";
  const DEMO_PHONE = "2125550142";
  const DEMO_CODE = "482910";
  const STAFF = "Nia";
  const STAFF_FULL = "Nia Mensah";
  const ROLE = "Staff";

  const SOHO_ORDERS = [
    { id: "1842", name: "Maria C.", bags: 2, due: "Due today" },
    { id: "1851", name: "Luis R.", bags: 2, due: "Due today" },
    { id: "1837", name: "Priya P.", bags: 2, due: "Due Wed" },
    { id: "1860", name: "Amara O.", bags: 2, due: "Due Wed" },
    { id: "1864", name: "Jonah B.", bags: 1, due: "Due Thu" },
    { id: "1871", name: "Elena R.", bags: 2, due: "Due Thu" },
    { id: "1829", name: "Diego A.", bags: 3, due: "Due Fri" },
    { id: "1858", name: "Keiko K.", bags: 1, due: "Personal" }
  ];
  const EV_ORDERS = [
    { id: "1912", name: "Carmen D.", bags: 2, due: "Due today" },
    { id: "1920", name: "Omar S.", bags: 1, due: "Due today" },
    { id: "1908", name: "Naomi T.", bags: 2, due: "Due Wed" },
    { id: "1933", name: "Wei L.", bags: 2, due: "Due Wed" },
    { id: "1917", name: "Grace M.", bags: 1, due: "Due Thu" },
    { id: "1899", name: "Isabel F.", bags: 2, due: "Due Thu" },
    { id: "1926", name: "Andre P.", bags: 3, due: "Due Fri" },
    { id: "1941", name: "Tomas V.", bags: 1, due: "Personal" }
  ];

  const PHASES = ["planned", "sent", "received", "processing", "ready", "return-sent", "returned"];
  const PHASE_LABEL = {
    planned: "Planned",
    sent: "Sent",
    received: "Received",
    processing: "Processing",
    ready: "Ready for return",
    "return-sent": "Return sent",
    returned: "Returned"
  };
  const SECTIONS = [
    { key: "planned", label: "Planned" },
    { key: "arriving", label: "Arriving" },
    { key: "processing", label: "Processing" },
    { key: "ready", label: "Ready for return" },
    { key: "returning", label: "Returning" },
    { key: "returned", label: "Recently returned" }
  ];
  const FILTER_ICON =
    '<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.2 7.5V18l-3.6 2v-7.5L4 5z"/></svg>';

  function defaultOtherBatches() {
    return [
      { id: "EV-B009", origin: "ev", dest: "soho", phase: "sent", orders: 3, bags: 5, meta: "sent 7:55 AM ET" },
      { id: "EV-B007", origin: "ev", dest: "soho", phase: "processing", orders: 4, bags: 7, ready: 2, meta: "" },
      { id: "EV-B006", origin: "ev", dest: "soho", phase: "ready", orders: 4, bags: 7, meta: "" },
      { id: "SOHO-B013", origin: "soho", dest: "ev", phase: "return-sent", orders: 3, bags: 6, meta: "return sent 2:10 PM ET" },
      { id: "SOHO-B012", origin: "soho", dest: "ev", phase: "returned", orders: 6, bags: 11, meta: "returned 11:40 AM ET" },
      { id: "EV-B010", origin: "ev", dest: "soho", phase: "planned", orders: 2, bags: 4, meta: "" },
      { id: "SOHO-B011", origin: "soho", dest: "ev", phase: "ready", orders: 3, bags: 5, meta: "" },
      { id: "EV-B005", origin: "ev", dest: "soho", phase: "returned", orders: 5, bags: 8, meta: "returned 10:18 AM ET" }
    ];
  }

  function defaultState() {
    return {
      signedIn: false,
      store: "soho",
      phone: "",
      selected: ["1842", "1851", "1837", "1860"],
      batch: null,
      otherBatches: defaultOtherBatches(),
      hiddenSections: [],
      savedHidden: [],
      sheet: null,
      removeId: null,
      stepbackId: null,
      stepbackTo: null,
      pendingStore: null,
      codeError: "",
      menuOpen: false,
      filterOpen: false,
      toast: null
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const next = Object.assign(defaultState(), JSON.parse(raw));
      next.menuOpen = false;
      next.filterOpen = false;
      next.toast = null;
      return next;
    } catch (e) {
      return defaultState();
    }
  }
  function save() {
    const { menuOpen, filterOpen, toast, ...rest } = state;
    localStorage.setItem(KEY, JSON.stringify(rest));
  }
  function resetDemo() {
    localStorage.removeItem(KEY);
    state = defaultState();
    go("phone", true);
  }

  let state = load();
  let toastTimer = null;

  function nowET() {
    return (
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }).format(new Date()) + " ET"
    );
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function digits(s) {
    return String(s || "").replace(/\D/g, "");
  }
  function formatPhone(s) {
    const d = digits(s).slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return "(" + d.slice(0, 3) + ") " + d.slice(3);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }
  function storeName(id) {
    return id === "ev" ? "East Village" : "SoHo";
  }
  function storeHeading(id) {
    return id === "ev" ? "EAST VILLAGE" : "SOHO";
  }
  function routeLabel(origin) {
    return origin === "ev" ? "East Village → SoHo" : "SoHo → East Village";
  }
  function ordersFor(store) {
    return store === "ev" ? EV_ORDERS : SOHO_ORDERS;
  }
  function bagTotal(orders) {
    return orders.reduce((n, o) => n + o.bags, 0);
  }
  function firstName(full) {
    return (full || "").split(" ")[0] || STAFF;
  }

  function hashRoute() {
    const h = (location.hash || "#/phone").replace(/^#\/?/, "");
    return h.split("?")[0] || "phone";
  }
  function go(route, replace) {
    const url = "#/" + route;
    if (replace) history.replaceState(null, "", url);
    else if (location.hash !== url) location.hash = "/" + route;
    render();
  }

  const AUTH = new Set(["phone", "code-sent", "code"]);

  function route() {
    let r = hashRoute();
    if (r === "reset") {
      resetDemo();
      return "phone";
    }
    if (r.indexOf("store/") === 0) r = "board";
    if (r.indexOf("order/") === 0) r = "batch";
    if (r.indexOf("remove/") === 0) r = "planned";
    if (!state.signedIn && !AUTH.has(r)) {
      history.replaceState(null, "", "#/phone");
      r = "phone";
    }
    if (state.signedIn && AUTH.has(r)) {
      history.replaceState(null, "", "#/board");
      r = "board";
    }
    if (r === "code") {
      history.replaceState(null, "", "#/code-sent");
      r = "code-sent";
    }
    if (r === "planned" && !state.batch) r = "build";
    if (r === "batch" && !state.batch) r = "board";
    if (r === "send") {
      sendBatchFromRoute();
      r = state.batch && state.batch.phase !== "planned" ? "batch" : "planned";
      history.replaceState(null, "", "#/" + r);
    }
    return r;
  }

  /* ---------- derived batch / order helpers ---------- */
  function readyCount(b) {
    if (!b || !b.orders) return 0;
    return b.orders.filter((o) => o.phase === "ready").length;
  }
  function processingCount(b) {
    if (!b || !b.orders) return 0;
    return b.orders.filter((o) => o.phase === "processing").length;
  }
  function allReady(b) {
    return b && b.orders && b.orders.length > 0 && readyCount(b) === b.orders.length;
  }
  function derivedPhase(b) {
    if (!b) return null;
    if (b.phase === "planned" || b.phase === "sent" || b.phase === "return-sent" || b.phase === "returned") {
      return b.phase;
    }
    if (allReady(b)) return "ready";
    if (b.orders.some((o) => o.phase === "processing" || o.phase === "ready")) return "processing";
    return "received";
  }
  function readyLabel(b) {
    if (!b || !b.orders || !b.orders.length) return "";
    const n = readyCount(b);
    const m = b.orders.length;
    if (n === 0) return "";
    return n + " of " + m + " ready";
  }
  function stampOrder(order, phase, extra) {
    const entry = Object.assign(
      { phase: phase, who: STAFF, time: nowET() },
      extra || {}
    );
    order.history = (order.history || []).concat([entry]);
    order.phase = phase;
    order.lastStamp = entry;
  }
  function stampBatch(b, phase, extra) {
    const entry = Object.assign(
      { phase: PHASE_LABEL[phase], who: STAFF, time: nowET(), key: phase },
      extra || {}
    );
    b.history = (b.history || []).concat([entry]);
    b.phase = phase;
  }
  function findOrder(id) {
    return state.batch && state.batch.orders.find((o) => o.id === id);
  }

  /* ---------- chrome ---------- */
  function banner() {
    return (
      '<div class="brand-bar"></div>' +
      '<div class="sample-banner" data-sample>Sample data, prototype only · <a href="#/reset" data-reset>Reset demo</a></div>'
    );
  }
  function header() {
    const open = state.menuOpen;
    const menuBtn =
      '<a class="menu-btn' + (open ? " is-open" : "") + '" href="#/menu" data-action="menu" aria-label="' +
      (open ? "Close menu" : "Open menu") + '" aria-haspopup="menu" aria-expanded="' + (open ? "true" : "false") + '">' +
      '<span class="hamburger" aria-hidden="true"><span></span><span></span><span></span></span></a>';
    const panel = open
      ? '<div class="account-menu" role="menu" aria-label="Account">' +
        '<a href="#/profile" role="menuitem">Profile</a>' +
        '<a class="is-danger" href="#/phone" data-signout role="menuitem">Sign out</a>' +
        "</div>"
      : "";
    return (
      '<header class="e2e-header">' +
        '<a href="#/board"><img class="wordmark" src="' + WM + '" alt="Laverie" /></a>' +
        '<div class="who-menu">' +
          '<div class="who"><strong>' + esc(STAFF) + " · " + esc(ROLE) + "</strong></div>" +
          menuBtn +
          panel +
        "</div>" +
      "</header>"
    );
  }
  function backRow(href, label) {
    return (
      '<p class="back-row"><a class="back-btn" href="' + href + '">' +
        '<span class="back-arrow" aria-hidden="true">←</span> ' + esc(label) +
      "</a></p>"
    );
  }
  function storeBar() {
    const evOn = state.store === "ev";
    const hidden = (state.hiddenSections || []).length;
    const badge = hidden ? '<span class="filter-badge">' + hidden + "</span>" : "";
    const filterOpen = state.filterOpen;
    const filterBtn =
      '<a class="filter-btn' + (filterOpen ? " is-open" : "") + '" href="#/filter" data-action="filter" aria-label="' +
      (filterOpen ? "Close section filter" : "Filter board sections") +
      '" aria-haspopup="dialog" aria-expanded="' + (filterOpen ? "true" : "false") + '">' +
      FILTER_ICON + badge + "</a>";
    const checks = SECTIONS.map((s) => {
      const on = state.hiddenSections.indexOf(s.key) === -1;
      return (
        '<label class="view-option"><input type="checkbox" data-section="' + s.key + '"' +
        (on ? " checked" : "") + " /> " + s.label + "</label>"
      );
    }).join("");
    const panel = filterOpen
      ? '<div class="view-panel view-panel-drop" role="group" aria-label="Board sections">' +
        '<p class="view-default-note">Uncheck a section to hide it. Save a selection as your default on this phone.</p>' +
        checks +
        '<div class="view-panel-actions">' +
          '<a class="btn" href="#/save-default" data-action="save-default">Save as my default</a>' +
          '<a class="btn btn-outline" href="#/filter-done" data-action="filter-done">Done</a>' +
        "</div></div>"
      : "";
    return (
      '<div class="store-bar" aria-label="Current store">' +
        '<div class="store-band"></div>' +
        '<div class="store-bar-inner">' +
          '<div class="store-bar-row store-bar-title">' +
            '<h1 class="store-name">' + storeHeading(state.store) + "</h1>" +
            '<span class="updated">Updated just now</span>' +
          "</div>" +
          '<div class="store-bar-row store-bar-controls">' +
            '<nav class="switch store-switch" aria-label="Origin store">' +
              '<a href="#/store/soho" data-switch="soho"' + (evOn ? "" : ' class="is-on"') + ">SoHo</a>" +
              '<a href="#/store/ev" data-switch="ev"' + (evOn ? ' class="is-on"' : "") + ">East Village</a>" +
            "</nav>" +
            filterBtn +
          "</div>" +
        "</div>" +
        panel +
      "</div>"
    );
  }
  function boardChrome() {
    return '<div class="chrome-sticky">' + header() + storeBar() + "</div>";
  }

  function toastHtml() {
    if (!state.toast) return "";
    return '<div class="toast" role="status">' + esc(state.toast.text) + "</div>";
  }
  function showToast(text) {
    const id = Date.now();
    state.toast = { text: text, id: id };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (state.toast && state.toast.id === id) {
        state.toast = null;
        const el = document.querySelector(".toast");
        if (el) el.remove();
      }
    }, 4000);
  }

  /* ---------- views ---------- */
  function viewPhone() {
    return (
      banner() +
      '<main class="e2e auth">' +
        '<img class="wordmark" src="' + WM + '" alt="Laverie" />' +
        "<h1>Sign in</h1>" +
        '<form data-form="phone">' +
          '<label class="field-label" for="phone">Mobile number</label>' +
          '<input class="tel-input" id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(212) 555-0142" value="' +
            esc(formatPhone(state.phone)) + '" required />' +
          '<button class="btn" type="submit">Send code</button>' +
        "</form>" +
        '<p class="demo-hint">Staff walkthrough · use <strong>(212) 555-0142</strong>. The one-time code is <strong>482910</strong>.</p>' +
      "</main>"
    );
  }
  function viewCodeSent() {
    const err = state.codeError ? '<p class="field-error">' + esc(state.codeError) + "</p>" : "";
    return (
      banner() +
      '<main class="e2e auth">' +
        '<img class="wordmark" src="' + WM + '" alt="Laverie" />' +
        "<h1>Check your texts</h1>" +
        '<form data-form="code">' +
          '<label class="field-label" for="otp">One-time code</label>' +
          '<div class="otp-wrap">' +
            '<input id="otp" class="otp-real" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" autocapitalize="off" autocorrect="off" spellcheck="false" />' +
            '<div class="otp-slots" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>' +
          "</div>" +
          err +
          '<button class="btn" type="submit">Continue</button>' +
        "</form>" +
        '<p class="link-row">Didn’t get it? <a class="resend" href="#/code-sent" data-action="resend">Resend code</a></p>' +
        '<p class="link-row"><a href="#/phone">Use a different number</a></p>' +
        '<p class="demo-hint">The demo code is <strong>482910</strong>.</p>' +
      "</main>"
    );
  }

  function heroOnBoard(store) {
    const b = state.batch;
    if (!b) return null;
    const originHere = b.origin === store;
    const destHere = b.dest === store;
    const phase = derivedPhase(b);
    if (phase === "planned" && originHere) return "planned";
    if (phase === "sent" && destHere) return "arriving";
    if ((phase === "received" || phase === "processing") && destHere) return "processing";
    if (phase === "ready" && destHere) return "ready";
    if (phase === "return-sent" && (originHere || destHere)) return "returning";
    if (phase === "returned" && originHere) return "returned";
    return null;
  }
  function otherInGroup(store, group) {
    return state.otherBatches.filter((b) => {
      const originHere = b.origin === store;
      const destHere = b.dest === store;
      if (group === "planned") return b.phase === "planned" && originHere;
      if (group === "arriving") return b.phase === "sent" && destHere;
      if (group === "processing") return (b.phase === "received" || b.phase === "processing") && destHere;
      if (group === "ready") return b.phase === "ready" && destHere;
      if (group === "returning") return b.phase === "return-sent" && (originHere || destHere);
      if (group === "returned") return b.phase === "returned" && originHere;
      return false;
    });
  }
  function countChipHtml(text) {
    if (!text) return "";
    return '<div class="badges"><span class="count-chip">' + esc(text) + "</span></div>";
  }
  function batchRowHero() {
    const b = state.batch;
    const orders = b.orders.length;
    const bags = bagTotal(b.orders);
    const chip = allReady(b) || derivedPhase(b) === "planned" || derivedPhase(b) === "sent" || derivedPhase(b) === "return-sent" || derivedPhase(b) === "returned"
      ? ""
      : countChipHtml(readyLabel(b));
    const href = derivedPhase(b) === "planned" ? "#/planned" : "#/batch";
    const extra = b.meta ? " · " + b.meta : "";
    return (
      '<a class="batch-row" href="' + href + '">' +
        '<div class="batch-id">' + esc(b.id) + "</div>" +
        chip +
        '<div class="batch-meta">' + routeLabel(b.origin) + " · " + orders + " " + (orders === 1 ? "order" : "orders") +
          (orders ? " · " + bags + " " + (bags === 1 ? "bag" : "bags") : "") + extra + "</div>" +
      "</a>"
    );
  }
  function batchRowOther(b) {
    const chip = b.ready && b.ready < b.orders ? countChipHtml(b.ready + " of " + b.orders + " ready") : "";
    const extra = b.meta ? " · " + b.meta : "";
    return (
      '<div class="batch-row">' +
        '<div class="batch-id">' + esc(b.id) + "</div>" +
        chip +
        '<div class="batch-meta">' + routeLabel(b.origin) + " · " + b.orders + " orders" +
          (b.bags ? " · " + b.bags + " bags" : "") + extra + "</div>" +
      "</div>"
    );
  }
  function groupCard(store, key, label) {
    if (state.hiddenSections.indexOf(key) !== -1) return "";
    const hero = heroOnBoard(store) === key ? batchRowHero() : "";
    const others = otherInGroup(store, key).map(batchRowOther).join("");
    const body = hero + others || '<p class="empty-group">None right now</p>';
    return (
      '<section class="board-group">' +
        '<div class="group-label">' + label + "</div>" +
        '<div class="card">' + body + "</div>" +
      "</section>"
    );
  }
  function viewBoard() {
    const store = state.store;
    return (
      banner() +
      boardChrome() +
      '<main class="e2e-body">' +
        '<div class="cta-row"><a class="btn" href="#/build">Create Transfer</a></div>' +
        SECTIONS.map((s) => groupCard(store, s.key, s.label)).join("") +
      "</main>" +
      toastHtml()
    );
  }

  function eligibleList() {
    const store = state.store;
    const taken = new Set();
    if (state.batch && state.batch.origin === store && state.batch.phase !== "returned") {
      state.batch.orders.forEach((o) => taken.add(o.id));
    }
    return ordersFor(store).filter((o) => !taken.has(o.id));
  }
  function orderPickRow(o, selected) {
    const cls = "order-row selectable" + (selected ? " is-selected" : "");
    const chk = selected ? " checked" : "";
    return (
      '<div class="' + cls + '" data-order="' + o.id + '">' +
        '<input class="check" type="checkbox"' + chk + " />" +
        '<span class="onum">#' + o.id + "</span>" +
        '<span class="name">' + esc(o.name) + "</span>" +
        '<span class="bags">' + o.bags + (o.bags === 1 ? " bag" : " bags") + "</span>" +
        '<span class="badge badge-hold">' + esc(o.due) + "</span>" +
      "</div>"
    );
  }
  function viewBuild() {
    const store = state.store;
    const list = eligibleList();
    const selected = list.filter((o) => state.selected.indexOf(o.id) !== -1);
    const bags = bagTotal(selected);
    const n = selected.length;
    const summary = n
      ? n + " " + storeName(store) + " " + (n === 1 ? "order" : "orders") + " selected · " + bags + " " + (bags === 1 ? "bag" : "bags")
      : "No " + storeName(store) + " orders selected";
    const ctaLabel = "Create " + storeName(store) + " batch";
    const emptyLabel = "Create empty " + storeName(store) + " batch";
    const blocked = state.batch && state.batch.phase !== "returned";
    const disabled = blocked
      ? '<p class="auth-hint">A batch is already in progress (' + esc(state.batch.id) + "). Open it from the board to continue.</p>"
      : "";
    const createHref = n && !blocked ? "#/create" : "#/build";
    const createCls = n && !blocked ? "btn" : "btn is-disabled";
    return (
      banner() +
      header() +
      '<main class="e2e-body">' +
        backRow("#/board", storeName(store) + " board") +
        '<h1 class="flow-title">Create Transfer</h1>' +
        '<p class="flow-sub">' + routeLabel(store) + "</p>" +
        '<p class="orders-summary" data-selection-summary>' + summary + "</p>" +
        '<div class="card orders-card">' +
          '<div class="group-label">Eligible at ' + storeName(store) + "</div>" +
          list.map((o) => orderPickRow(o, state.selected.indexOf(o.id) !== -1)).join("") +
        "</div>" +
        '<div class="btn-row">' +
          '<a class="' + createCls + '" href="' + createHref + '" data-action="create">' + ctaLabel + "</a>" +
          '<a class="btn btn-outline" href="#/create-empty" data-action="create-empty">' + emptyLabel + "</a>" +
        "</div>" +
        disabled +
        '<p class="auth-hint">Only ' + storeName(store) + "-eligible orders. Earliest due first. Personal-detergent orders stay on the list — staff decide.</p>" +
      "</main>" +
      switchSheet()
    );
  }

  function plannedOrderRow(o) {
    return (
      '<div class="order-row">' +
        '<span class="onum">#' + o.id + "</span>" +
        '<span class="name">' + esc(o.name) + "</span>" +
        '<span class="bags">' + o.bags + (o.bags === 1 ? " bag" : " bags") + "</span>" +
        '<span class="actions"><a class="text-btn" href="#/remove/' + o.id + '" data-remove="' + o.id + '">Remove</a></span>' +
      "</div>"
    );
  }
  function viewPlanned() {
    const b = state.batch;
    const empty = !b.orders.length;
    const bags = bagTotal(b.orders);
    const sendCls = empty ? "btn is-disabled" : "btn";
    const sendHref = empty ? "#/planned" : "#/send";
    const list = empty
      ? '<p class="empty-group">Planned (empty)</p>'
      : b.orders.map(plannedOrderRow).join("");
    const emptyCopy = empty
      ? '<p class="orders-summary">No ' + storeName(b.origin) + " orders in this batch yet. A Planned (empty) " + storeName(b.origin) + " batch can’t be sent until at least one " + storeName(b.origin) + " order is added.</p>"
      : "";
    return (
      banner() +
      header() +
      '<main class="e2e-body">' +
        backRow("#/board", storeName(state.store) + " board") +
        '<h1 class="flow-title">' + esc(b.id) + "</h1>" +
        '<p class="flow-sub">' + routeLabel(b.origin) + " · " +
          (empty ? "Planned (empty)" : b.orders.length + " orders · " + bags + " bags · Planned") +
        "</p>" +
        emptyCopy +
        '<div class="card orders-card">' +
          '<div class="group-label">' + storeName(b.origin) + " orders</div>" +
          list +
        "</div>" +
        '<div class="btn-row">' +
          '<a class="' + sendCls + '" href="' + sendHref + '" data-action="send">Mark sent</a>' +
          '<a class="btn btn-outline" href="#/build">Add ' + storeName(b.origin) + " orders</a>" +
        "</div>" +
      "</main>" +
      removeSheet()
    );
  }

  function historyList(b) {
    const recorded = {};
    (b.history || []).forEach((h) => {
      const key = h.key || Object.keys(PHASE_LABEL).find((k) => PHASE_LABEL[k] === h.phase) || h.phase;
      recorded[key] = h;
    });
    const current = derivedPhase(b);
    const currentIdx = PHASES.indexOf(current);
    const items = PHASES.map((key, i) => {
      const rec = recorded[key];
      let cls = " is-pending";
      if (rec && i < currentIdx) cls = " is-done";
      else if (rec && i === currentIdx) cls = " is-current";
      else if (i < currentIdx) cls = " is-done";
      else if (i === currentIdx) cls = " is-current";
      const who = rec ? rec.who : "Not yet";
      const when = rec ? rec.time : "";
      const corr = rec && rec.note
        ? '<div class="correction"><strong>' + esc(rec.title || "Note") + "</strong>" + esc(rec.note) +
          '<span class="when">' + esc(rec.time) + "</span></div>"
        : "";
      return (
        '<li class="step' + cls + '">' +
          '<span class="dot"></span>' +
          "<div><div class=\"step-phase\">" + PHASE_LABEL[key] + "</div>" +
          '<div class="step-who">' + esc(who) + "</div>" + corr + "</div>" +
          '<div class="when">' + esc(when) + "</div>" +
        "</li>"
      );
    });
    return '<ol class="timeline">' + items.join("") + "</ol>";
  }

  function orderBadge(o) {
    if (!o.phase || o.phase === "planned" || o.phase === "sent") return "";
    if (o.phase === "ready") return '<span class="badge badge-ready">Ready</span>';
    if (o.phase === "processing") return '<span class="badge badge-processing">Processing</span>';
    if (o.phase === "received") return '<span class="badge badge-received">Received</span>';
    return "";
  }
  function batchOrderRow(o) {
    const clickable = state.batch && (derivedPhase(state.batch) !== "planned");
    const inner =
      '<span class="onum">#' + o.id + "</span>" +
      '<span class="name">' + esc(o.name) + "</span>" +
      '<span class="bags">' + o.bags + (o.bags === 1 ? " bag" : " bags") + "</span>" +
      orderBadge(o) +
      (clickable ? '<span class="chev" aria-hidden="true">›</span>' : "");
    if (!clickable) return '<div class="order-row">' + inner + "</div>";
    return '<a class="order-row" href="#/order/' + o.id + '" data-order-open="' + o.id + '">' + inner + "</a>";
  }

  function batchButtons(b) {
    const dest = state.store === b.dest;
    const origin = state.store === b.origin;
    const phase = derivedPhase(b);
    const n = b.orders.length;
    const remaining = processingCount(b);
    let html = '<div class="btn-row" id="batch-actions">';
    if (phase === "sent" && dest) {
      html += '<a class="btn" href="#/received" data-action="received">Record received</a>';
    } else if (phase === "received" && dest) {
      html += '<a class="btn" href="#/processing" data-action="processing">Start processing</a>';
    } else if ((phase === "processing") && dest) {
      if (remaining > 0) {
        html += '<a class="btn" href="#/mark-remaining" data-action="mark-remaining">Mark ' + remaining + " remaining ready</a>";
      }
      html += '<a class="btn btn-outline is-disabled" href="#" aria-disabled="true">Send return</a>';
      html += '<p class="btn-hint">Available when all ' + n + " are ready</p>";
    } else if (phase === "ready" && dest) {
      html += '<a class="btn" href="#/return-sent" data-action="return-sent">Send return</a>';
    } else if (phase === "return-sent" && origin) {
      html += '<a class="btn" href="#/returned" data-action="returned">Acknowledge returned</a>';
    } else if (phase === "sent" && origin) {
      html += '<a class="btn btn-outline" href="#/board" data-switch="' + b.dest + '">View on the ' + storeName(b.dest) + " board</a>";
    } else if (phase === "return-sent" && dest) {
      html += '<a class="btn btn-outline" href="#/board" data-switch="' + b.origin + '">View on the ' + storeName(b.origin) + " board</a>";
    }
    html += "</div>";
    return html;
  }

  function lockedNote(b) {
    const phase = derivedPhase(b);
    if (phase === "sent" && state.store !== b.dest) {
      return '<p class="locked-note">This batch is on its way to ' + storeName(b.dest) + ". Open the " + storeName(b.dest) + " board to mark it received.</p>";
    }
    if (phase === "return-sent" && state.store !== b.origin) {
      return '<p class="locked-note">The return is on its way to ' + storeName(b.origin) + ". Acknowledge it on the " + storeName(b.origin) + " board.</p>";
    }
    return '<p class="locked-note">Locked after sending — orders can’t be added. Travel step-backs are admin corrections.</p>';
  }

  function viewBatch() {
    const b = state.batch;
    const bags = bagTotal(b.orders);
    const phase = derivedPhase(b);
    const ready = readyLabel(b);
    const subBits = [routeLabel(b.origin), b.orders.length + " orders", bags + " bags"];
    if (ready && phase === "processing") subBits.push(ready);
    else if (phase === "ready") subBits.push("Ready for return");
    else if (phase === "return-sent") subBits.push("Return sent");
    else if (phase === "returned") subBits.push("Returned");
    const orderSheet = state.sheet === "order" ? orderSheetHtml() : "";
    const stepSheet = state.sheet === "stepback" ? stepbackSheetHtml() : "";
    const bulkSheet = state.sheet === "mark-remaining" ? markRemainingSheetHtml() : "";
    return (
      banner() +
      header() +
      '<main class="e2e-body">' +
        backRow("#/board", storeName(state.store) + " board") +
        '<h1 class="flow-title">' + esc(b.id) + "</h1>" +
        '<p class="flow-sub">' + subBits.join(" · ") + "</p>" +
        lockedNote(b) +
        (ready ? '<p class="orders-summary">' + ready + "</p>" : "") +
        '<div class="card orders-card"><div class="group-label">Orders</div>' +
          b.orders.map(batchOrderRow).join("") +
        "</div>" +
        '<div class="card history-card"><div class="group-label">Handoff history</div>' + historyList(b) + "</div>" +
        batchButtons(b) +
      "</main>" +
      orderSheet + stepSheet + bulkSheet +
      toastHtml()
    );
  }

  function viewProfile() {
    return (
      banner() +
      header() +
      '<main class="e2e-body">' +
        backRow("#/board", storeName(state.store) + " board") +
        '<h1 class="flow-title">Profile</h1>' +
        '<p class="flow-sub">This is the account that will be recorded on handoffs.</p>' +
        '<div class="card profile-card"><dl>' +
          "<dt>Name</dt><dd>" + esc(STAFF_FULL) + "</dd>" +
          "<dt>Role</dt><dd>" + esc(ROLE) + "</dd>" +
          "<dt>Registered number</dt><dd>" + esc(formatPhone(state.phone || DEMO_PHONE)) + "</dd>" +
          "<dt>Store</dt><dd>Not tied to a store. Switch boards to work SoHo or East Village.</dd>" +
        "</dl></div>" +
      "</main>"
    );
  }

  function orderHistoryHtml(order) {
    const items = (order.history || []).map((h) => {
      const cls = h.stepback ? ' class="stepback"' : "";
      const reason = h.reason
        ? '<span class="reason">Stepped back from ' + esc(PHASE_LABEL[h.from] || h.from) + ". Reason: “" + esc(h.reason) + ".”</span>"
        : "";
      return (
        "<li" + cls + '><span class="phase">' + esc(PHASE_LABEL[h.phase] || h.phase) + "</span>" +
        '<span class="who-when">' + esc(h.who) + " · " + esc(h.time) + "</span>" + reason + "</li>"
      );
    }).join("");
    return '<div class="group-label">Order history</div><ol class="order-history">' + items + "</ol>";
  }
  function stampLine(order) {
    const last = (order.history || [])[order.history.length - 1];
    if (!last) return "";
    let line = last.who + " · " + last.time;
    if (order.phase === "ready" && !last.stepback) line = last.who + " marked ready · " + last.time;
    if (order.phase === "processing" && !last.stepback) line = last.who + " started processing · " + last.time;
    if (order.phase === "received" && !last.stepback) line = last.who + " marked received · " + last.time;
    if (last.stepback) line = last.who + " stepped back · " + last.time;
    return (
      '<div class="stamp"><strong>' + esc(PHASE_LABEL[order.phase] || order.phase) + "</strong>" +
      esc(line) + "</div>"
    );
  }
  function orderActions(order) {
    const b = state.batch;
    const dest = b && state.store === b.dest;
    const travel = !b || derivedPhase(b) === "sent" || derivedPhase(b) === "return-sent" || derivedPhase(b) === "returned" || derivedPhase(b) === "planned";
    if (!dest || travel) {
      return '<a class="sheet-cancel" href="#/batch" data-action="cancel-sheet">Close</a>';
    }
    if (order.phase === "processing") {
      return (
        '<a class="btn" href="#/mark-ready" data-action="mark-ready" data-id="' + order.id + '">Mark ready</a>' +
        '<a class="btn btn-outline" href="#/stepback" data-action="stepback" data-id="' + order.id + '" data-to="received">Move back to Received</a>' +
        '<a class="sheet-cancel" href="#/batch" data-action="cancel-sheet">Cancel</a>'
      );
    }
    if (order.phase === "ready") {
      return (
        '<a class="btn btn-outline" href="#/stepback" data-action="stepback" data-id="' + order.id + '" data-to="processing">Move back to Processing</a>' +
        '<a class="sheet-cancel" href="#/batch" data-action="cancel-sheet">Close</a>'
      );
    }
    if (order.phase === "received") {
      return (
        '<a class="btn" href="#/order-process" data-action="order-process" data-id="' + order.id + '">Start processing</a>' +
        '<a class="sheet-cancel" href="#/batch" data-action="cancel-sheet">Close</a>'
      );
    }
    return '<a class="sheet-cancel" href="#/batch" data-action="cancel-sheet">Close</a>';
  }
  function orderSheetHtml() {
    const order = findOrder(state.sheetId);
    if (!order) return "";
    const b = state.batch;
    return (
      '<div class="sheet-backdrop">' +
        '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
          '<h2 id="sheet-title">#' + order.id + " " + esc(order.name) + "</h2>" +
          "<p>" + storeName(b.origin) + " · " + order.bags + (order.bags === 1 ? " bag" : " bags") + " · in " + esc(b.id) + "</p>" +
          stampLine(order) +
          '<p class="proposal-note">Orders move one phase at a time. Send, receive, and return stay on the batch.</p>' +
          orderHistoryHtml(order) +
          orderActions(order) +
        "</div>" +
      "</div>"
    );
  }
  function stepbackSheetHtml() {
    const order = findOrder(state.stepbackId);
    if (!order) return "";
    const to = state.stepbackTo;
    const toLabel = PHASE_LABEL[to];
    const fromLabel = PHASE_LABEL[order.phase];
    return (
      '<div class="sheet-backdrop">' +
        '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
          '<h2 id="sheet-title">Move back to ' + toLabel + "</h2>" +
          "<p>#" + order.id + " " + esc(order.name) + " is " + fromLabel + ". This moves it one phase, to " + toLabel + ". A reason is required and will be added to this order’s history.</p>" +
          '<label class="field-label" for="reason">Reason</label>' +
          '<textarea id="reason" name="reason" required placeholder="Why are you stepping this order back?"></textarea>' +
          '<a class="btn is-disabled" id="confirm-stepback" href="#/confirm-stepback" data-action="confirm-stepback" aria-disabled="true">Move back to ' + toLabel + "</a>" +
          '<a class="sheet-cancel" href="#/order/' + order.id + '" data-action="cancel-stepback">Cancel</a>' +
        "</div>" +
      "</div>"
    );
  }
  function markRemainingSheetHtml() {
    const b = state.batch;
    const left = b.orders.filter((o) => o.phase === "processing");
    const n = left.length;
    if (!n) return "";
    const names = left.map((o) => "#" + o.id + " " + o.name).join(" and ");
    const after = readyCount(b) + n;
    return (
      '<div class="sheet-backdrop">' +
        '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
          '<h2 id="sheet-title">Mark ' + n + " remaining ready</h2>" +
          "<p>Mark " + esc(names) + " ready? The batch will show " + after + " of " + b.orders.length + " ready" +
          (after === b.orders.length ? " and become Ready for return." : ".") + "</p>" +
          '<a class="btn" href="#/confirm-mark-remaining" data-action="confirm-mark-remaining">Mark ' + n + " orders ready</a>" +
          '<a class="sheet-cancel" href="#/batch" data-action="cancel-sheet">Cancel</a>' +
        "</div>" +
      "</div>"
    );
  }
  function switchSheet() {
    const other = state.store === "soho" ? "East Village" : "SoHo";
    const n = state.selected.length;
    const msg = "Switching to " + other + " clears " + n + " selected " + storeName(state.store) + " " + (n === 1 ? "order" : "orders") + ".";
    const hidden = state.sheet === "switch" ? "" : " hidden";
    return (
      '<div id="switch-confirm" class="sheet-backdrop"' + hidden + ">" +
        '<div class="sheet" role="dialog" aria-modal="true">' +
          "<h2>Switch store</h2>" +
          "<p>" + msg + "</p>" +
          '<a class="btn" href="#/confirm-switch" data-action="confirm-switch">Switch store</a>' +
          '<a class="sheet-cancel" href="#/cancel-sheet" data-action="cancel-sheet">Cancel</a>' +
        "</div>" +
      "</div>"
    );
  }
  function removeSheet() {
    const id = state.removeId;
    const order = id && state.batch ? state.batch.orders.find((o) => o.id === id) : null;
    const hidden = state.sheet === "remove" && order ? "" : " hidden";
    const label = order ? "#" + order.id + " " + order.name : "this order";
    return (
      '<div id="remove-sheet" class="sheet-backdrop"' + hidden + ">" +
        '<div class="sheet" role="dialog" aria-modal="true">' +
          "<h2>Remove order</h2>" +
          "<p>Remove " + esc(label) + " from " + (state.batch ? esc(state.batch.id) : "this batch") + "? This undoes adding it. A note is required.</p>" +
          '<label class="field-label" for="remove-note">Note</label>' +
          '<textarea id="remove-note" required placeholder="Why is this order coming out of the batch?">Customer asked to hold this bag until tomorrow’s move.</textarea>' +
          '<a class="btn" href="#/confirm-remove" data-action="confirm-remove">Remove from batch</a>' +
          '<a class="sheet-cancel" href="#/cancel-sheet" data-action="cancel-sheet">Cancel</a>' +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- actions ---------- */
  function nextHeroId(store) {
    return store === "soho" ? "SOHO-B014" : "EV-B011";
  }
  function seedOrder(src) {
    return {
      id: src.id,
      name: src.name,
      bags: src.bags,
      due: src.due,
      phase: "planned",
      history: [{ phase: "planned", who: STAFF, time: nowET() }]
    };
  }
  function createBatch(empty) {
    if (state.batch && state.batch.phase !== "returned") return;
    const store = state.store;
    const catalog = ordersFor(store);
    const chosen = empty ? [] : catalog.filter((o) => state.selected.indexOf(o.id) !== -1);
    const dest = store === "soho" ? "ev" : "soho";
    const t = nowET();
    state.batch = {
      id: nextHeroId(store),
      origin: store,
      dest: dest,
      phase: "planned",
      orders: chosen.map(seedOrder),
      history: [{ phase: PHASE_LABEL.planned, who: STAFF, time: t, key: "planned" }],
      meta: ""
    };
    state.selected = [];
    state.sheet = null;
    save();
    go("planned");
  }
  function applySend() {
    const b = state.batch;
    if (!b || !b.orders.length || b.phase !== "planned") return false;
    const t = nowET();
    stampBatch(b, "sent");
    b.orders.forEach((o) => {
      o.phase = "sent";
      o.history = (o.history || []).concat([{ phase: "sent", who: STAFF, time: t }]);
    });
    b.meta = "sent " + t;
    state.sheet = null;
    save();
    return true;
  }
  function sendBatch() {
    if (applySend()) go("batch", true);
  }
  function sendBatchFromRoute() {
    applySend();
  }
  function confirmRemove() {
    const ta = document.getElementById("remove-note");
    const note = ta ? ta.value.trim() : "";
    if (!note || !state.batch || !state.removeId) return;
    const id = state.removeId;
    const order = state.batch.orders.find((o) => o.id === id);
    state.batch.orders = state.batch.orders.filter((o) => o.id !== id);
    if (order) {
      const planned = state.batch.history.find((h) => h.key === "planned");
      if (planned) {
        planned.title = "Removed #" + order.id + " " + order.name + " ";
        planned.note = note;
      } else {
        state.batch.history.push({
          phase: PHASE_LABEL.planned,
          key: "planned",
          who: STAFF,
          time: nowET(),
          title: "Removed #" + order.id + " " + order.name + ". ",
          note: note
        });
      }
    }
    state.sheet = null;
    state.removeId = null;
    save();
    go("planned");
  }
  function markReceived() {
    const b = state.batch;
    if (!b || derivedPhase(b) !== "sent" || state.store !== b.dest) return;
    const t = nowET();
    stampBatch(b, "received");
    b.orders.forEach((o) => {
      o.phase = "received";
      o.history = (o.history || []).concat([{ phase: "received", who: STAFF, time: t }]);
    });
    b.meta = "";
    state.sheet = null;
    save();
    go("batch");
  }
  function startProcessing() {
    const b = state.batch;
    if (!b || derivedPhase(b) !== "received" || state.store !== b.dest) return;
    const t = nowET();
    stampBatch(b, "processing");
    b.orders.forEach((o) => {
      if (o.phase === "received") {
        o.phase = "processing";
        o.history = (o.history || []).concat([{ phase: "processing", who: STAFF, time: t }]);
      }
    });
    state.sheet = null;
    save();
    go("batch");
  }
  function markOrderReady(id) {
    const b = state.batch;
    const order = findOrder(id);
    if (!b || !order || order.phase !== "processing") return;
    stampOrder(order, "ready");
    if (allReady(b) && b.phase !== "ready" && b.phase !== "return-sent" && b.phase !== "returned") {
      stampBatch(b, "ready");
    }
    const n = readyCount(b);
    showToast(STAFF + " marked #" + order.id + " " + order.name + " ready · " + n + " of " + b.orders.length + " ready.");
    state.sheet = null;
    state.sheetId = null;
    save();
    go("batch");
  }
  function startOrderProcessing(id) {
    const order = findOrder(id);
    if (!order || order.phase !== "received") return;
    stampOrder(order, "processing");
    if (state.batch && derivedPhase(state.batch) === "processing" && state.batch.phase === "received") {
      stampBatch(state.batch, "processing");
    }
    state.sheet = "order";
    state.sheetId = id;
    save();
    go("batch");
  }
  function confirmStepback() {
    const ta = document.getElementById("reason");
    const reason = ta ? ta.value.trim() : "";
    const order = findOrder(state.stepbackId);
    const to = state.stepbackTo;
    if (!reason || !order || !to) return;
    const from = order.phase;
    if (!(from === "ready" && to === "processing") && !(from === "processing" && to === "received")) return;
    stampOrder(order, to, { stepback: true, from: from, reason: reason });
    if (state.batch && state.batch.phase === "ready" && !allReady(state.batch)) {
      state.batch.phase = "processing";
    }
    state.sheet = "order";
    state.sheetId = order.id;
    state.stepbackId = null;
    state.stepbackTo = null;
    save();
    go("batch");
  }
  function confirmMarkRemaining() {
    const b = state.batch;
    if (!b) return;
    const left = b.orders.filter((o) => o.phase === "processing");
    const n = left.length;
    if (!n) return;
    const t = nowET();
    left.forEach((o) => {
      o.phase = "ready";
      o.history = (o.history || []).concat([{ phase: "ready", who: STAFF, time: t }]);
    });
    if (allReady(b)) stampBatch(b, "ready");
    showToast(STAFF + " marked " + n + " orders ready · " + readyCount(b) + " of " + b.orders.length + " ready.");
    state.sheet = null;
    save();
    go("batch");
  }
  function sendReturn() {
    const b = state.batch;
    if (!b || !allReady(b) || state.store !== b.dest) return;
    stampBatch(b, "return-sent");
    b.meta = "return sent " + nowET();
    state.sheet = null;
    save();
    go("batch");
  }
  function acknowledgeReturned() {
    const b = state.batch;
    if (!b || derivedPhase(b) !== "return-sent" || state.store !== b.origin) return;
    stampBatch(b, "returned");
    b.meta = "returned " + nowET();
    state.sheet = null;
    save();
    go("batch");
  }
  function signOut() {
    state.signedIn = false;
    state.menuOpen = false;
    state.filterOpen = false;
    state.sheet = null;
    state.codeError = "";
    save();
    go("phone");
  }
  function switchStore(id, force) {
    if (id !== "soho" && id !== "ev") return;
    if (id === state.store) return;
    const onBuild = route() === "build" && state.selected.length && !force;
    if (onBuild) {
      state.sheet = "switch";
      state.pendingStore = id;
      save();
      render();
      return;
    }
    state.store = id;
    state.selected = id === "soho" ? ["1842", "1851", "1837", "1860"] : ["1912", "1920", "1908", "1933"];
    state.pendingStore = null;
    state.sheet = null;
    state.menuOpen = false;
    state.filterOpen = false;
    save();
    go("board");
  }

  function onClick(e) {
    const reset = e.target.closest("[data-reset]");
    if (reset) {
      e.preventDefault();
      resetDemo();
      return;
    }
    const signout = e.target.closest("[data-signout]");
    if (signout) {
      e.preventDefault();
      signOut();
      return;
    }
    const sw = e.target.closest("[data-switch]");
    if (sw) {
      e.preventDefault();
      switchStore(sw.getAttribute("data-switch"));
      return;
    }
    const section = e.target.closest("[data-section]");
    if (section && e.target.matches("input[type=checkbox]")) {
      const key = section.getAttribute("data-section");
      const hidden = state.hiddenSections.slice();
      const i = hidden.indexOf(key);
      if (section.checked) {
        if (i !== -1) hidden.splice(i, 1);
      } else if (i === -1) hidden.push(key);
      state.hiddenSections = hidden;
      save();
      render();
      return;
    }
    const toggle = e.target.closest("[data-order]");
    if (toggle && !e.target.closest("[data-order-open]")) {
      const id = toggle.getAttribute("data-order");
      const i = state.selected.indexOf(id);
      if (i === -1) state.selected.push(id);
      else state.selected.splice(i, 1);
      save();
      render();
      return;
    }
    const open = e.target.closest("[data-order-open]");
    if (open) {
      e.preventDefault();
      state.sheet = "order";
      state.sheetId = open.getAttribute("data-order-open");
      save();
      go("batch");
      return;
    }
    const rm = e.target.closest("[data-remove]");
    if (rm) {
      e.preventDefault();
      state.sheet = "remove";
      state.removeId = rm.getAttribute("data-remove");
      save();
      render();
      return;
    }
    const actEl = e.target.closest("[data-action]");
    if (!actEl) {
      if (state.menuOpen && !e.target.closest(".who-menu")) {
        state.menuOpen = false;
        render();
      }
      return;
    }
    const act = actEl.getAttribute("data-action");
    if (actEl.classList.contains("is-disabled") || actEl.getAttribute("aria-disabled") === "true") {
      e.preventDefault();
      return;
    }
    if (act === "menu") {
      e.preventDefault();
      state.menuOpen = !state.menuOpen;
      state.filterOpen = false;
      render();
      return;
    }
    if (act === "filter") {
      e.preventDefault();
      state.filterOpen = !state.filterOpen;
      state.menuOpen = false;
      render();
      return;
    }
    if (act === "filter-done") {
      e.preventDefault();
      state.filterOpen = false;
      save();
      render();
      return;
    }
    if (act === "save-default") {
      e.preventDefault();
      state.savedHidden = state.hiddenSections.slice();
      state.filterOpen = false;
      save();
      showToast("Saved as your default on this phone.");
      render();
      return;
    }
    if (act === "resend") {
      e.preventDefault();
      showToast("Code resent.");
      render();
      return;
    }
    if (act === "create") {
      e.preventDefault();
      createBatch(false);
      return;
    }
    if (act === "create-empty") {
      e.preventDefault();
      createBatch(true);
      return;
    }
    if (act === "send") {
      e.preventDefault();
      sendBatch();
      return;
    }
    if (act === "confirm-remove") {
      e.preventDefault();
      confirmRemove();
      return;
    }
    if (act === "cancel-sheet") {
      e.preventDefault();
      state.sheet = null;
      state.removeId = null;
      state.sheetId = null;
      state.pendingStore = null;
      save();
      render();
      return;
    }
    if (act === "confirm-switch") {
      e.preventDefault();
      const to = state.pendingStore;
      state.sheet = null;
      switchStore(to, true);
      return;
    }
    if (act === "received") {
      e.preventDefault();
      markReceived();
      return;
    }
    if (act === "processing") {
      e.preventDefault();
      startProcessing();
      return;
    }
    if (act === "return-sent") {
      e.preventDefault();
      sendReturn();
      return;
    }
    if (act === "returned") {
      e.preventDefault();
      acknowledgeReturned();
      return;
    }
    if (act === "mark-ready") {
      e.preventDefault();
      markOrderReady(actEl.getAttribute("data-id"));
      return;
    }
    if (act === "order-process") {
      e.preventDefault();
      startOrderProcessing(actEl.getAttribute("data-id"));
      return;
    }
    if (act === "stepback") {
      e.preventDefault();
      state.stepbackId = actEl.getAttribute("data-id");
      state.stepbackTo = actEl.getAttribute("data-to");
      state.sheet = "stepback";
      save();
      render();
      return;
    }
    if (act === "cancel-stepback") {
      e.preventDefault();
      state.sheet = "order";
      state.sheetId = state.stepbackId;
      state.stepbackId = null;
      state.stepbackTo = null;
      save();
      render();
      return;
    }
    if (act === "confirm-stepback") {
      e.preventDefault();
      confirmStepback();
      return;
    }
    if (act === "mark-remaining") {
      e.preventDefault();
      state.sheet = "mark-remaining";
      save();
      render();
      return;
    }
    if (act === "confirm-mark-remaining") {
      e.preventDefault();
      confirmMarkRemaining();
      return;
    }
  }

  function onSubmit(e) {
    const form = e.target.closest("form");
    if (!form) return;
    e.preventDefault();
    const kind = form.getAttribute("data-form");
    if (kind === "phone") {
      const input = form.querySelector("#phone");
      const d = digits(input && input.value);
      if (d.length !== 10) return;
      state.phone = d;
      state.codeError = "";
      save();
      go("code-sent");
      return;
    }
    if (kind === "code") {
      const input = form.querySelector(".otp-real");
      const code = digits(input && input.value);
      if (code !== DEMO_CODE) {
        state.codeError = "That code doesn’t match. Try 482910.";
        render();
        return;
      }
      state.signedIn = true;
      state.codeError = "";
      state.store = "soho";
      save();
      go("board");
    }
  }

  function bindStepbackReason() {
    const ta = document.getElementById("reason");
    const btn = document.getElementById("confirm-stepback");
    if (!ta || !btn) return;
    function sync() {
      const ok = ta.value.trim().length > 0;
      btn.classList.toggle("is-disabled", !ok);
      btn.setAttribute("aria-disabled", ok ? "false" : "true");
    }
    ta.addEventListener("input", sync);
    sync();
  }
  function bindRemoveNote() {
    const ta = document.getElementById("remove-note");
    const btn = document.querySelector("[data-action=confirm-remove]");
    if (!ta || !btn) return;
    function sync() {
      const ok = ta.value.trim().length > 0;
      btn.classList.toggle("is-disabled", !ok);
    }
    ta.addEventListener("input", sync);
    sync();
  }

  function applyBody(r) {
    const body = document.body;
    const screen = r === "batch" ? (state.sheet === "order" && state.sheetId ? "order-" + state.sheetId : "batch-locked") : r;
    body.setAttribute("data-screen", screen);
    body.classList.toggle("menu-open", !!state.menuOpen);
    body.classList.toggle("store-soho", state.store === "soho");
    body.classList.toggle("store-ev", state.store === "ev");
    if (!body.classList.contains("page")) body.classList.add("page");
    if (!body.classList.contains("e2e-page")) body.classList.add("e2e-page");
  }

  function render() {
    const app = document.getElementById("app");
    if (!app) return;
    const r = route();
    if (r !== "board") {
      state.menuOpen = false;
      state.filterOpen = false;
    }
    applyBody(r);
    const views = {
      phone: viewPhone,
      "code-sent": viewCodeSent,
      board: viewBoard,
      build: viewBuild,
      planned: viewPlanned,
      batch: viewBatch,
      profile: viewProfile
    };
    app.innerHTML = (views[r] || viewPhone)();
    if (!state.sheet && r !== "board") window.scrollTo(0, 0);
    if (r === "code-sent" && typeof bindLaverieOtp === "function") bindLaverieOtp(app);
    if (r === "phone") {
      const input = document.getElementById("phone");
      if (input) {
        input.addEventListener("input", () => {
          input.value = formatPhone(input.value);
        });
      }
    }
    if (r === "batch") {
      bindStepbackReason();
      if (state.toast) {
        requestAnimationFrame(function () {
          const actions = document.getElementById("batch-actions");
          if (actions) actions.scrollIntoView({ block: "end", behavior: "instant" });
        });
      }
    }
    if (r === "planned") bindRemoveNote();
    if (r === "board" && state.batch && !state.filterOpen && !state.menuOpen) {
      requestAnimationFrame(function () {
        const hero = document.querySelector("a.batch-row");
        if (hero) hero.scrollIntoView({ block: "center", behavior: "instant" });
      });
    }
  }

  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  window.addEventListener("hashchange", render);

  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = document.createElement("span");
      el.className = "tap-ripple";
      el.style.left = e.clientX + "px";
      el.style.top = e.clientY + "px";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 450);
    },
    { passive: true }
  );

  if (new URLSearchParams(location.search).get("reset") === "1") {
    localStorage.removeItem(KEY);
    state = defaultState();
    history.replaceState(null, "", location.pathname + "#/phone");
  }

  render();
})();
