/* ═══════════════════════════════════════════════════════════════
   DMC Hospital HIMS — Application Logic
   All data persists via localStorage through a thin DB wrapper.
   ═══════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────
// DATA ACCESS LAYER
// ────────────────────────────────────────────
const DB = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch {
      return null;
    }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  getArr(key) {
    return this.get(key) || [];
  },
  getObj(key) {
    return this.get(key) || {};
  },
};

// ────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────
const SEED_USERS = [
  { username: "reception1", role: "reception", status: "active" },
  { username: "cashier1", role: "cashier", status: "active" },
  { username: "drmugabo", role: "doctor", status: "active" },
  { username: "nursejane", role: "nurse", status: "active" },
  { username: "pharm1", role: "pharmacy", status: "active" },
  { username: "hr1", role: "hr", status: "active" },
  { username: "itadmin", role: "itadmin", status: "active" },
];

const SEED_DEPARTMENTS = [
  { name: "General Medicine", type: "Inpatient & Outpatient" },
  { name: "Pediatrics", type: "Inpatient & Outpatient" },
  { name: "Maternity", type: "Inpatient & Outpatient" },
  { name: "Orthopedics", type: "Inpatient & Outpatient" },
  { name: "Internal Medicine", type: "Inpatient & Outpatient" },
  { name: "Ophthalmology", type: "Outpatient Only" },
  { name: "ENT", type: "Outpatient Only" },
  { name: "Dental", type: "Outpatient Only" },
];

const ROLE_LABELS = {
  reception: "Reception",
  cashier: "Cashier / Billing",
  doctor: "Doctor",
  nurse: "Nurse / Maternity",
  pharmacy: "Pharmacy",
  hr: "Human Resources",
  itadmin: "IT / Admin",
};

const ROLE_COLORS = {
  reception: "badge-info",
  cashier: "badge-success",
  doctor: "badge-purple",
  nurse: "badge-pending",
  pharmacy: "badge-billing",
  hr: "badge-neutral",
  itadmin: "badge-danger",
};

const PANEL_TITLES = {
  reception: "📋 Reception",
  cashier: "💳 Billing",
  doctor: "👨‍⚕️ Consultations",
  nurse: "👩‍⚕️ Nursing / Maternity",
  pharmacy: "💊 Pharmacy",
  hr: "🗂️ Human Resources",
  admin: "⚙️ Administration",
};

const ROLE_DEFAULT_PANEL = {
  reception: "reception",
  cashier: "cashier",
  doctor: "doctor",
  nurse: "nurse",
  pharmacy: "pharmacy",
  hr: "hr",
  itadmin: "admin",
};

// ────────────────────────────────────────────
// SEED DATA INIT
// ────────────────────────────────────────────
function initSeedData() {
  if (!DB.get("users")) DB.set("users", SEED_USERS);
  if (!DB.get("departments")) DB.set("departments", SEED_DEPARTMENTS);
  [
    "patients",
    "queue",
    "encounters",
    "nurseActs",
    "partograms",
    "drugs",
    "dispensed",
    "employees",
    "hrDocs",
  ].forEach((k) => {
    if (!DB.get(k)) DB.set(k, []);
  });
  if (!DB.get("payments")) DB.set("payments", {});
}

// ────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ────────────────────────────────────────────
function toast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 3000);
}

// ────────────────────────────────────────────
// UTILITY HELPERS
// ────────────────────────────────────────────
function genId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  );
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return fmtDate(d) + " " + fmtTime(d);
}
function patientName(p) {
  return p ? `${p.firstName} ${p.lastName}` : "—";
}
function getPatient(id) {
  return DB.getArr("patients").find((p) => p.id === id);
}
function getPaymentStatus(patientId) {
  const payments = DB.getObj("payments");
  return payments[patientId] ? payments[patientId].status : "pending";
}
function isConsulted(patientId) {
  return DB.getArr("encounters").some((e) => e.patientId === patientId);
}
function escHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
function populateSelect(selectId, options, placeholder) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML =
    `<option value="">${placeholder || "Select…"}</option>` +
    options
      .map((o) => `<option value="${o.value}">${escHtml(o.label)}</option>`)
      .join("");
}

// ────────────────────────────────────────────
// CURRENT USER STATE
// ────────────────────────────────────────────
let currentUser = null;

function setCurrentUser(username) {
  const users = DB.getArr("users");
  const u = users.find((x) => x.username === username && x.status === "active");
  if (!u) return;
  currentUser = u;
  localStorage.setItem("currentUser", username);
  document.getElementById("headerUser").textContent = u.username;
  const roleTag = document.getElementById("headerRole");
  roleTag.textContent = ROLE_LABELS[u.role] || u.role;
  roleTag.className = "role-tag " + (ROLE_COLORS[u.role] || "badge-neutral");
  updateNavVisibility();
  navigateToDefaultPanel();
}

function getCurrentRole() {
  return currentUser ? currentUser.role : "reception";
}

// ────────────────────────────────────────────
// NAVIGATION
// ────────────────────────────────────────────
function updateNavVisibility() {
  const role = getCurrentRole();
  document.querySelectorAll(".nav-item[data-panel]").forEach((item) => {
    const roles = (item.dataset.roles || "").split(",");
    item.classList.toggle("hidden", !roles.includes(role));
  });
}

function navigateToDefaultPanel() {
  switchPanel(ROLE_DEFAULT_PANEL[getCurrentRole()] || "reception");
}

function switchPanel(panel) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  const target = document.getElementById("panel-" + panel);
  if (target) target.classList.add("active");
  const navItem = document.querySelector(`.nav-item[data-panel="${panel}"]`);
  if (navItem) navItem.classList.add("active");
  document.getElementById("pageTitle").textContent =
    PANEL_TITLES[panel] || "Dashboard";
  refreshPanel(panel);
  document.getElementById("sidebar").classList.remove("open");
}

function refreshPanel(panel) {
  const map = {
    reception: refreshReception,
    cashier: refreshCashier,
    doctor: refreshDoctor,
    nurse: refreshNurse,
    pharmacy: refreshPharmacy,
    hr: refreshHR,
    admin: refreshAdmin,
  };
  if (map[panel]) map[panel]();
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ────────────────────────────────────────────
// MODAL HELPERS
// ────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

// ────────────────────────────────────────────
// USER PICKER
// ────────────────────────────────────────────
function openUserPicker() {
  const users = DB.getArr("users").filter((u) => u.status === "active");
  const list = document.getElementById("userPickerList");
  list.innerHTML = users
    .map(
      (u) => `
    <div class="user-option ${currentUser && currentUser.username === u.username ? "current" : ""}" onclick="selectUser('${u.username}')">
      <div>
        <div class="u-name">${escHtml(u.username)}</div>
        <div class="u-role">${ROLE_LABELS[u.role] || u.role}</div>
      </div>
      <span class="badge ${ROLE_COLORS[u.role] || "badge-neutral"}">${u.role}</span>
    </div>
  `
    )
    .join("");
  openModal("userPickerModal");
}

function selectUser(username) {
  closeModal("userPickerModal");
  setCurrentUser(username);
  toast(`Switched to ${username}`, "info");
}

// ────────────────────────────────────────────
// POPULATE DEPARTMENT SELECTS
// ────────────────────────────────────────────
function populateDeptSelects() {
  const depts = DB.getArr("departments");
  const opts =
    '<option value="">Select department…</option>' +
    depts.map((d) => `<option value="${d.name}">${d.name}</option>`).join("");
  ["pDept", "empDept"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
}

// ────────────────────────────────────────────
// POPULATE PATIENT SELECTS
// ────────────────────────────────────────────
function populatePatientSelects() {
  const patients = DB.getArr("patients");
  const queue = DB.getArr("queue");
  const activeIds = new Set(queue.map((q) => q.patientId));
  const opts = patients
    .filter((p) => activeIds.has(p.id))
    .map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }));
  ["naPatient", "pgPatient", "dispPatient", "payPatient"].forEach((id) => {
    populateSelect(id, opts, "Select patient…");
  });
}

// ────────────────────────────────────────────
// PATIENT TYPE TOGGLE
// ────────────────────────────────────────────
let selectedPatientType = "Outpatient";

function setPatientType(type, btn) {
  selectedPatientType = type;
  document.getElementById("pType").value = type;
  btn.parentElement
    .querySelectorAll("button")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  // If outpatient-only department is selected and user picks Inpatient, warn
  const dept = document.getElementById("pDept").value;
  if (dept && type === "Inpatient") {
    const depts = DB.getArr("departments");
    const deptObj = depts.find((d) => d.name === dept);
    if (deptObj && deptObj.type === "Outpatient Only") {
      toast(`${dept} is Outpatient Only — please choose another department`, "warning");
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// MODULE: RECEPTION
// ═══════════════════════════════════════════════════════════════
function registerPatient(e) {
  e.preventDefault();
  const dept = document.getElementById("pDept").value;
  const pType = document.getElementById("pType").value;

  // Enforce department/type rule
  if (pType === "Inpatient") {
    const depts = DB.getArr("departments");
    const deptObj = depts.find((d) => d.name === dept);
    if (deptObj && deptObj.type === "Outpatient Only") {
      toast(`${dept} does not accept inpatients. Please change department or patient type.`, "error");
      return false;
    }
  }

  const patient = {
    id: genId(),
    firstName: document.getElementById("pFirstName").value.trim(),
    lastName: document.getElementById("pLastName").value.trim(),
    nida: document.getElementById("pNIDA").value.trim(),
    dob: document.getElementById("pDOB").value,
    phone: document.getElementById("pPhone").value.trim(),
    insurance: document.getElementById("pInsurance").value,
    department: dept,
    patientType: pType,
    registeredAt: new Date().toISOString(),
  };
  const patients = DB.getArr("patients");
  patients.push(patient);
  DB.set("patients", patients);

  const queue = DB.getArr("queue");
  const queueNum = queue.length + 1;
  queue.push({
    id: genId(),
    patientId: patient.id,
    queueNumber: queueNum,
    checkedInAt: new Date().toISOString(),
    status: "waiting",
  });
  DB.set("queue", queue);

  if (patient.nida) {
    toast("📡 NIDA verified (simulated) — no real API call", "info");
  }
  if (patient.phone) {
    toast("📱 SMS confirmation sent (simulated)", "info");
  }

  toast(`Patient ${patient.firstName} ${patient.lastName} checked in — Queue #${queueNum}`, "success");
  document.getElementById("patientForm").reset();
  selectedPatientType = "Outpatient";
  document.getElementById("pType").value = "Outpatient";
  const toggleBtns = document.querySelectorAll("#patientForm .toggle-group button");
  toggleBtns.forEach((b, i) => b.classList.toggle("active", i === 0));
  refreshReception();
  return false;
}

function viewPatientDetail(patientId) {
  const p = getPatient(patientId);
  if (!p) return;
  const payments = DB.getObj("payments");
  const pay = payments[patientId];
  const consulted = isConsulted(patientId);
  const encounter = DB.getArr("encounters").find((e) => e.patientId === patientId);
  const queue = DB.getArr("queue").find((q) => q.patientId === patientId);

  document.getElementById("detailModalTitle").textContent = `Patient — ${patientName(p)}`;
  document.getElementById("detailModalBody").innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">Full Name</div><div class="detail-value">${escHtml(patientName(p))}</div></div>
      <div class="detail-item"><div class="detail-label">Queue #</div><div class="detail-value">${queue ? "#" + queue.queueNumber : "—"}</div></div>
      <div class="detail-item"><div class="detail-label">NIDA</div><div class="detail-value">${escHtml(p.nida || "—")}</div></div>
      <div class="detail-item"><div class="detail-label">Date of Birth</div><div class="detail-value">${fmtDate(p.dob)}</div></div>
      <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${escHtml(p.phone || "—")}</div></div>
      <div class="detail-item"><div class="detail-label">Insurance</div><div class="detail-value">${escHtml(p.insurance)}</div></div>
      <div class="detail-item"><div class="detail-label">Department</div><div class="detail-value">${escHtml(p.department)}</div></div>
      <div class="detail-item"><div class="detail-label">Type</div><div class="detail-value">${escHtml(p.patientType)}</div></div>
      <div class="detail-item"><div class="detail-label">Payment</div><div class="detail-value"><span class="badge badge-${pay?.status === "paid" ? "paid" : "pending"}">${pay?.status === "paid" ? "✓ Paid" : "⏳ Pending"}</span>${pay?.amount ? " — " + pay.amount.toLocaleString() + " RWF" : ""}</div></div>
      <div class="detail-item"><div class="detail-label">Consultation</div><div class="detail-value"><span class="badge badge-${consulted ? "completed" : "neutral"}">${consulted ? "✓ Consulted" : "Not Yet"}</span></div></div>
      ${
        encounter
          ? `<div class="detail-item full"><div class="detail-label">Diagnosis</div><div class="detail-value">${escHtml(encounter.diagnosis)}</div></div>
             <div class="detail-item full"><div class="detail-label">Treatment</div><div class="detail-value">${escHtml(encounter.treatment || "—")}</div></div>`
          : ""
      }
      <div class="detail-item"><div class="detail-label">Registered</div><div class="detail-value">${fmtDateTime(p.registeredAt)}</div></div>
    </div>
  `;
  openModal("detailModal");
}

function dischargePatient(patientId) {
  const p = getPatient(patientId);
  if (!p) return;
  if (!confirm(`Discharge ${patientName(p)} from the queue?`)) return;

  let queue = DB.getArr("queue");
  queue = queue.filter((q) => q.patientId !== patientId);
  DB.set("queue", queue);
  toast(`${patientName(p)} discharged`, "success");

  // Refresh whichever panel is active
  const activePanel = document.querySelector(".panel.active");
  if (activePanel) {
    const panelName = activePanel.id.replace("panel-", "");
    refreshPanel(panelName);
  }
}

function refreshReception() {
  const patients = DB.getArr("patients");
  const queue = DB.getArr("queue");
  const payments = DB.getObj("payments");

  const totalToday = queue.length;
  const paid = queue.filter((q) => payments[q.patientId]?.status === "paid").length;
  const pending = totalToday - paid;
  const consulted = queue.filter((q) => isConsulted(q.patientId)).length;

  document.getElementById("receptionStats").innerHTML = `
    <div class="stat-card"><div class="stat-label">Checked In</div><div class="stat-value">${totalToday}</div></div>
    <div class="stat-card"><div class="stat-label">Pending Payment</div><div class="stat-value" style="color:var(--warning)">${pending}</div></div>
    <div class="stat-card"><div class="stat-label">Paid</div><div class="stat-value" style="color:var(--success)">${paid}</div></div>
    <div class="stat-card"><div class="stat-label">Consulted</div><div class="stat-value" style="color:var(--purple)">${consulted}</div></div>
  `;

  // Queue Board
  const board = document.getElementById("queueBoard");
  if (queue.length === 0) {
    board.innerHTML = '<div class="empty"><div class="icon">📋</div><p>No patients in queue</p></div>';
  } else {
    board.innerHTML = queue
      .map((q) => {
        const p = getPatient(q.patientId);
        const isPaid = payments[q.patientId]?.status === "paid";
        const isDone = isConsulted(q.patientId);
        let statusBadge;
        if (isDone) statusBadge = '<span class="badge badge-completed">✓ Consulted</span>';
        else if (isPaid) statusBadge = '<span class="badge badge-paid">✓ Paid</span>';
        else statusBadge = '<span class="badge badge-pending">⏳ Pending</span>';
        return `
        <div class="queue-card" onclick="viewPatientDetail('${q.patientId}')" style="cursor:pointer" title="Click to view details">
          <div class="queue-num">#${q.queueNumber}</div>
          <div class="queue-name">${escHtml(patientName(p))}</div>
          <div class="queue-dept">${escHtml(p?.department || "—")} · ${escHtml(p?.patientType || "—")}</div>
          ${statusBadge}
        </div>
      `;
      })
      .join("");
  }

  // Table
  document.getElementById("receptionTable").innerHTML =
    queue.length === 0
      ? '<tr><td colspan="9" class="text-muted text-sm" style="text-align:center;padding:20px;">No records</td></tr>'
      : queue
          .map((q, i) => {
            const p = getPatient(q.patientId);
            const isPaid = payments[q.patientId]?.status === "paid";
            const isDone = isConsulted(q.patientId);
            return `<tr>
        <td>${i + 1}</td>
        <td><strong>#${q.queueNumber}</strong></td>
        <td>${escHtml(patientName(p))}</td>
        <td>${escHtml(p?.department || "—")}</td>
        <td>${escHtml(p?.insurance || "—")}</td>
        <td><span class="badge badge-neutral">${escHtml(p?.patientType || "—")}</span></td>
        <td><span class="badge badge-${isPaid ? "paid" : "pending"}">${isPaid ? "✓ Paid" : "⏳ Pending"}</span></td>
        <td>${fmtTime(q.checkedInAt)}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-outline btn-sm" onclick="viewPatientDetail('${q.patientId}')" title="View details">👁️</button>
            ${isDone ? `<button class="btn btn-warning btn-sm" onclick="dischargePatient('${q.patientId}')" title="Discharge">🚪</button>` : ""}
          </div>
        </td>
      </tr>`;
          })
          .join("");

  populatePatientSelects();
  populateDeptSelects();
}

// ═══════════════════════════════════════════════════════════════
// MODULE: CASHIER / BILLING
// ═══════════════════════════════════════════════════════════════
function markPaid(patientId) {
  const p = getPatient(patientId);
  const payments = DB.getObj("payments");
  payments[patientId] = {
    amount: payments[patientId]?.amount || 5000,
    method: payments[patientId]?.method || "Quick Pay",
    paidAt: new Date().toISOString(),
    status: "paid",
  };
  DB.set("payments", payments);
  toast(`Payment confirmed for ${patientName(p)}`, "success");
  refreshCashier();
}

function recordPayment(e) {
  e.preventDefault();
  const patientId = document.getElementById("payPatient").value;
  const amount = parseInt(document.getElementById("payAmount").value);
  const method = document.getElementById("payMethod").value;
  if (!patientId || !amount || !method) {
    toast("Please fill in all payment fields", "error");
    return false;
  }

  const payments = DB.getObj("payments");
  payments[patientId] = {
    amount,
    method,
    paidAt: new Date().toISOString(),
    status: "paid",
  };
  DB.set("payments", payments);

  const p = getPatient(patientId);
  toast(`${amount.toLocaleString()} RWF recorded for ${patientName(p)} via ${method}`, "success");
  document.getElementById("paymentForm").reset();
  refreshCashier();
  return false;
}

function markActBilled(actId) {
  const acts = DB.getArr("nurseActs");
  const idx = acts.findIndex((a) => a.id === actId);
  if (idx !== -1) {
    acts[idx].billingStatus = "billed";
    DB.set("nurseActs", acts);
    toast("Charge billed successfully", "success");
    refreshCashier();
  }
}

function printReceipt(patientId) {
  const p = getPatient(patientId);
  const payments = DB.getObj("payments");
  const pay = payments[patientId];
  if (!p || !pay) return;

  const receipt = `
═══════════════════════════════════
       DMC HOSPITAL — RECEIPT
═══════════════════════════════════
Patient: ${patientName(p)}
Date:    ${fmtDateTime(pay.paidAt)}
Method:  ${pay.method}
Amount:  ${pay.amount?.toLocaleString()} RWF
Status:  PAID
═══════════════════════════════════
       Thank you for your visit
═══════════════════════════════════
  `;
  alert(receipt);
  toast("Receipt printed (simulated)", "info");
}

function refreshCashier() {
  const queue = DB.getArr("queue");
  const payments = DB.getObj("payments");

  const pendingList = queue.filter((q) => payments[q.patientId]?.status !== "paid");
  const paidList = queue.filter((q) => payments[q.patientId]?.status === "paid");
  const totalAmount = Object.values(payments).reduce((s, p) => s + (p.amount || 0), 0);

  document.getElementById("cashierStats").innerHTML = `
    <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--warning)">${pendingList.length}</div></div>
    <div class="stat-card"><div class="stat-label">Paid</div><div class="stat-value" style="color:var(--success)">${paidList.length}</div></div>
    <div class="stat-card"><div class="stat-label">Total Collected</div><div class="stat-value">${totalAmount.toLocaleString()} RWF</div></div>
  `;

  // Pending table
  document.getElementById("cashierPending").innerHTML =
    pendingList.length === 0
      ? '<tr><td colspan="6" class="text-muted text-sm" style="text-align:center;padding:20px;">All payments up to date ✓</td></tr>'
      : pendingList
          .map((q) => {
            const p = getPatient(q.patientId);
            return `<tr>
        <td><strong>#${q.queueNumber}</strong></td>
        <td>${escHtml(patientName(p))}</td>
        <td>${escHtml(p?.department || "—")}</td>
        <td>${escHtml(p?.insurance || "—")}</td>
        <td><span class="badge badge-pending">⏳ Pending</span></td>
        <td><button class="btn btn-success btn-sm" onclick="markPaid('${q.patientId}')">✓ Mark Paid</button></td>
      </tr>`;
          })
          .join("");

  // Paid history table
  document.getElementById("cashierPaidHistory").innerHTML =
    paidList.length === 0
      ? '<tr><td colspan="6" class="text-muted text-sm" style="text-align:center;padding:20px;">No payments recorded yet</td></tr>'
      : paidList
          .map((q) => {
            const p = getPatient(q.patientId);
            const pay = payments[q.patientId];
            return `<tr>
        <td><strong>#${q.queueNumber}</strong></td>
        <td>${escHtml(patientName(p))}</td>
        <td>${pay.amount?.toLocaleString() || "—"} RWF</td>
        <td>${escHtml(pay.method || "—")}</td>
        <td>${fmtDateTime(pay.paidAt)}</td>
        <td><button class="btn btn-outline btn-sm" onclick="printReceipt('${q.patientId}')">🧾 Receipt</button></td>
      </tr>`;
          })
          .join("");

  // Ancillary charges
  const acts = DB.getArr("nurseActs").filter((a) => a.billingStatus === "awaiting");
  document.getElementById("ancillaryCharges").innerHTML =
    acts.length === 0
      ? '<tr><td colspan="6" class="text-muted text-sm" style="text-align:center;padding:20px;">No pending charges</td></tr>'
      : acts
          .map((a) => {
            const p = getPatient(a.patientId);
            return `<tr>
        <td>${escHtml(patientName(p))}</td>
        <td>${escHtml(a.act)}</td>
        <td>${a.qty}</td>
        <td>${escHtml(a.loggedBy || "—")}</td>
        <td><span class="badge badge-billing">Awaiting Billing</span></td>
        <td><button class="btn btn-success btn-sm" onclick="markActBilled('${a.id}')">✓ Bill</button></td>
      </tr>`;
          })
          .join("");

  populatePatientSelects();
}

// ═══════════════════════════════════════════════════════════════
// MODULE: DOCTOR
// ═══════════════════════════════════════════════════════════════
function openConsult(patientId) {
  const status = getPaymentStatus(patientId);
  if (status !== "paid") {
    toast("🔒 Payment required — consultation locked until patient pays", "error");
    return;
  }
  const p = getPatient(patientId);
  document.getElementById("consultPatientId").value = patientId;
  document.getElementById("consultTitle").textContent = `Consultation — ${patientName(p)}`;
  document.getElementById("consultCard").classList.remove("hidden");
  document.getElementById("consultCard").scrollIntoView({ behavior: "smooth" });
}

function closeConsult() {
  document.getElementById("consultCard").classList.add("hidden");
  document.getElementById("consultForm").reset();
}

function saveConsult(e) {
  e.preventDefault();
  const complaint = document.getElementById("cComplaint").value.trim();
  const diagnosis = document.getElementById("cDiagnosis").value.trim();
  const notes = document.getElementById("cNotes").value.trim();
  const treatment = document.getElementById("cTreatment").value.trim();

  // Clear previous error highlights
  ["cComplaint", "cDiagnosis", "cNotes"].forEach((id) =>
    document.getElementById(id).classList.remove("error")
  );

  let hasError = false;
  if (!complaint) { document.getElementById("cComplaint").classList.add("error"); hasError = true; }
  if (!diagnosis) { document.getElementById("cDiagnosis").classList.add("error"); hasError = true; }
  if (!notes) { document.getElementById("cNotes").classList.add("error"); hasError = true; }

  if (hasError) {
    toast("Complaint, Diagnosis, and Clinical Notes are mandatory", "error");
    return false;
  }

  const encounter = {
    id: genId(),
    patientId: document.getElementById("consultPatientId").value,
    complaint,
    diagnosis,
    notes,
    treatment,
    doctor: currentUser?.username || "unknown",
    createdAt: new Date().toISOString(),
  };
  const encounters = DB.getArr("encounters");
  encounters.push(encounter);
  DB.set("encounters", encounters);

  const p = getPatient(encounter.patientId);
  toast(`Consultation saved for ${patientName(p)}`, "success");
  closeConsult();
  refreshDoctor();
  return false;
}

function viewEncounter(encounterId) {
  const encounters = DB.getArr("encounters");
  const enc = encounters.find((e) => e.id === encounterId);
  if (!enc) return;
  const p = getPatient(enc.patientId);

  document.getElementById("detailModalTitle").textContent = `Consultation — ${patientName(p)}`;
  document.getElementById("detailModalBody").innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">Patient</div><div class="detail-value">${escHtml(patientName(p))}</div></div>
      <div class="detail-item"><div class="detail-label">Doctor</div><div class="detail-value">${escHtml(enc.doctor)}</div></div>
      <div class="detail-item full"><div class="detail-label">Chief Complaint</div><div class="detail-value">${escHtml(enc.complaint)}</div></div>
      <div class="detail-item full"><div class="detail-label">Diagnosis (ICD-11)</div><div class="detail-value"><strong>${escHtml(enc.diagnosis)}</strong></div></div>
      <div class="detail-item full"><div class="detail-label">Clinical Notes</div><div class="detail-value">${escHtml(enc.notes)}</div></div>
      <div class="detail-item full"><div class="detail-label">Treatment / Prescription</div><div class="detail-value">${escHtml(enc.treatment || "—")}</div></div>
      <div class="detail-item"><div class="detail-label">Date</div><div class="detail-value">${fmtDateTime(enc.createdAt)}</div></div>
    </div>
  `;
  openModal("detailModal");
}

function refreshDoctor() {
  const queue = DB.getArr("queue");
  const payments = DB.getObj("payments");
  const encounters = DB.getArr("encounters");

  const paidCount = queue.filter((q) => payments[q.patientId]?.status === "paid").length;
  const awaitingConsult = queue.filter(
    (q) =>
      payments[q.patientId]?.status === "paid" &&
      !encounters.some((e) => e.patientId === q.patientId)
  ).length;

  document.getElementById("doctorStats").innerHTML = `
    <div class="stat-card"><div class="stat-label">In Queue</div><div class="stat-value">${queue.length}</div></div>
    <div class="stat-card"><div class="stat-label">Paid & Ready</div><div class="stat-value" style="color:var(--primary)">${awaitingConsult}</div></div>
    <div class="stat-card"><div class="stat-label">Completed Today</div><div class="stat-value" style="color:var(--success)">${encounters.length}</div></div>
  `;

  // Queue table
  document.getElementById("doctorQueue").innerHTML =
    queue.length === 0
      ? '<tr><td colspan="7" class="text-muted text-sm" style="text-align:center;padding:20px;">No patients in queue</td></tr>'
      : queue
          .map((q) => {
            const p = getPatient(q.patientId);
            const paid = payments[q.patientId]?.status === "paid";
            const consulted = encounters.some((e) => e.patientId === q.patientId);
            let actionHtml;
            if (consulted) {
              actionHtml = '<span class="badge badge-completed">✓ Consulted</span>';
            } else if (paid) {
              actionHtml = `<button class="btn btn-primary btn-sm" onclick="openConsult('${q.patientId}')">🩺 Consult</button>`;
            } else {
              actionHtml = '<span class="btn-locked">🔒 Awaiting Payment</span>';
            }
            return `<tr>
        <td><strong>#${q.queueNumber}</strong></td>
        <td>${escHtml(patientName(p))}</td>
        <td>${escHtml(p?.department || "—")}</td>
        <td>${escHtml(p?.insurance || "—")}</td>
        <td><span class="badge badge-${paid ? "paid" : "pending"}">${paid ? "✓ Paid" : "⏳ Pending"}</span></td>
        <td>${consulted ? '<span class="badge badge-completed">Done</span>' : '<span class="badge badge-info">Waiting</span>'}</td>
        <td>${actionHtml}</td>
      </tr>`;
          })
          .join("");

  // Encounters table
  document.getElementById("encounterTable").innerHTML =
    encounters.length === 0
      ? '<tr><td colspan="6" class="text-muted text-sm" style="text-align:center;padding:20px;">No consultations yet</td></tr>'
      : encounters
          .slice()
          .reverse()
          .map((enc) => {
            const p = getPatient(enc.patientId);
            return `<tr>
        <td>${escHtml(patientName(p))}</td>
        <td><strong>${escHtml(enc.diagnosis)}</strong></td>
        <td class="text-sm">${escHtml((enc.complaint || "").substring(0, 50))}${(enc.complaint || "").length > 50 ? "…" : ""}</td>
        <td>${escHtml(enc.doctor)}</td>
        <td>${fmtDateTime(enc.createdAt)}</td>
        <td><button class="btn btn-outline btn-sm" onclick="viewEncounter('${enc.id}')">👁️ View</button></td>
      </tr>`;
          })
          .join("");
}

// ═══════════════════════════════════════════════════════════════
// MODULE: NURSE / MATERNITY
// ═══════════════════════════════════════════════════════════════
function logNurseAct(e) {
  e.preventDefault();
  const patientId = document.getElementById("naPatient").value;
  const act = document.getElementById("naAct").value;
  if (!patientId || !act) {
    toast("Please select a patient and an act", "error");
    return false;
  }
  const entry = {
    id: genId(),
    patientId,
    act,
    qty: parseInt(document.getElementById("naQty").value) || 1,
    notes: document.getElementById("naNotes").value.trim(),
    billingStatus: "awaiting",
    loggedBy: currentUser?.username || "unknown",
    loggedAt: new Date().toISOString(),
  };
  const acts = DB.getArr("nurseActs");
  acts.push(entry);
  DB.set("nurseActs", acts);
  toast(`${act} logged for billing`, "success");
  document.getElementById("nurseActForm").reset();
  document.getElementById("naQty").value = "1";
  refreshNurse();
  return false;
}

function deleteNurseAct(actId) {
  if (!confirm("Delete this logged act?")) return;
  let acts = DB.getArr("nurseActs");
  acts = acts.filter((a) => a.id !== actId);
  DB.set("nurseActs", acts);
  toast("Act deleted", "info");
  refreshNurse();
}

function logPartogram(e) {
  e.preventDefault();
  const patientId = document.getElementById("pgPatient").value;
  if (!patientId) {
    toast("Please select a patient", "error");
    return false;
  }
  const entry = {
    id: genId(),
    patientId,
    time: document.getElementById("pgTime").value,
    dilation: parseFloat(document.getElementById("pgDilation").value),
    fhr: parseInt(document.getElementById("pgFHR").value),
    contractions: parseInt(document.getElementById("pgContractions").value),
    observations: document.getElementById("pgObs").value.trim(),
    recordedBy: currentUser?.username || "unknown",
    recordedAt: new Date().toISOString(),
  };
  const partograms = DB.getArr("partograms");
  partograms.push(entry);
  DB.set("partograms", partograms);
  toast("Partogram entry recorded", "success");
  document.getElementById("partogramForm").reset();
  refreshNurse();
  return false;
}

function deletePartogram(pgId) {
  if (!confirm("Delete this partogram entry?")) return;
  let partograms = DB.getArr("partograms");
  partograms = partograms.filter((p) => p.id !== pgId);
  DB.set("partograms", partograms);
  toast("Partogram entry deleted", "info");
  refreshNurse();
}

function refreshNurse() {
  populatePatientSelects();

  const acts = DB.getArr("nurseActs");
  document.getElementById("nurseActTable").innerHTML =
    acts.length === 0
      ? '<tr><td colspan="7" class="text-muted text-sm" style="text-align:center;padding:20px;">No acts logged</td></tr>'
      : acts
          .slice()
          .reverse()
          .map((a) => {
            const p = getPatient(a.patientId);
            const bClass = a.billingStatus === "billed" ? "badge-completed" : "badge-billing";
            const bLabel = a.billingStatus === "billed" ? "✓ Billed" : "Awaiting Billing";
            return `<tr>
        <td>${escHtml(patientName(p))}</td>
        <td>${escHtml(a.act)}</td>
        <td>${a.qty}</td>
        <td class="text-sm">${escHtml(a.notes || "—")}</td>
        <td><span class="badge ${bClass}">${bLabel}</span></td>
        <td>${fmtDateTime(a.loggedAt)}</td>
        <td>${a.billingStatus !== "billed" ? `<button class="btn btn-danger btn-sm" onclick="deleteNurseAct('${a.id}')" title="Delete">✕</button>` : ""}</td>
      </tr>`;
          })
          .join("");

  const pgrams = DB.getArr("partograms");
  document.getElementById("partogramTable").innerHTML =
    pgrams.length === 0
      ? '<tr><td colspan="8" class="text-muted text-sm" style="text-align:center;padding:20px;">No partogram entries</td></tr>'
      : pgrams
          .slice()
          .reverse()
          .map((pg) => {
            const p = getPatient(pg.patientId);
            return `<tr>
        <td>${escHtml(patientName(p))}</td>
        <td>${pg.time}</td>
        <td>${pg.dilation}</td>
        <td>${pg.fhr}</td>
        <td>${pg.contractions}</td>
        <td class="text-sm">${escHtml(pg.observations || "—")}</td>
        <td>${fmtDateTime(pg.recordedAt)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deletePartogram('${pg.id}')" title="Delete">✕</button></td>
      </tr>`;
          })
          .join("");
}

// ═══════════════════════════════════════════════════════════════
// MODULE: PHARMACY
// ═══════════════════════════════════════════════════════════════
function addDrug(e) {
  e.preventDefault();
  const drug = {
    id: genId(),
    name: document.getElementById("dName").value.trim(),
    category: document.getElementById("dCategory").value,
    price: parseInt(document.getElementById("dPrice").value),
    stock: parseInt(document.getElementById("dStock").value),
    expiry: document.getElementById("dExpiry").value,
    addedAt: new Date().toISOString(),
  };
  if (!drug.name || !drug.category || !drug.expiry) {
    toast("Please fill in all drug fields", "error");
    return false;
  }
  const drugs = DB.getArr("drugs");
  drugs.push(drug);
  DB.set("drugs", drugs);
  toast(`${drug.name} added to inventory`, "success");
  document.getElementById("drugForm").reset();
  refreshPharmacy();
  return false;
}

function editDrugStock(drugId) {
  const drugs = DB.getArr("drugs");
  const drug = drugs.find((d) => d.id === drugId);
  if (!drug) return;
  const newStock = prompt(`Update stock for ${drug.name}\nCurrent: ${drug.stock}`, drug.stock);
  if (newStock === null) return;
  const val = parseInt(newStock);
  if (isNaN(val) || val < 0) {
    toast("Invalid stock value", "error");
    return;
  }
  drug.stock = val;
  DB.set("drugs", drugs);
  toast(`Stock updated for ${drug.name}: ${val}`, "success");
  refreshPharmacy();
}

function deleteDrug(drugId) {
  if (!confirm("Remove this drug from inventory?")) return;
  let drugs = DB.getArr("drugs");
  drugs = drugs.filter((d) => d.id !== drugId);
  DB.set("drugs", drugs);
  toast("Drug removed from inventory", "info");
  refreshPharmacy();
}

function dispenseDrug(e) {
  e.preventDefault();
  const patientId = document.getElementById("dispPatient").value;
  const drugId = document.getElementById("dispDrug").value;
  const qty = parseInt(document.getElementById("dispQty").value);
  if (!patientId || !drugId) {
    toast("Please select a patient and a drug", "error");
    return false;
  }

  const drugs = DB.getArr("drugs");
  const idx = drugs.findIndex((d) => d.id === drugId);
  if (idx === -1) { toast("Drug not found", "error"); return false; }
  if (drugs[idx].stock < qty) { toast(`Insufficient stock — only ${drugs[idx].stock} available`, "error"); return false; }

  // Check expiry
  if (new Date(drugs[idx].expiry) <= new Date()) {
    toast("⛔ Cannot dispense expired medication!", "error");
    return false;
  }

  drugs[idx].stock -= qty;
  DB.set("drugs", drugs);

  const record = {
    id: genId(),
    patientId,
    drugId,
    drugName: drugs[idx].name,
    qty,
    dispensedBy: currentUser?.username || "unknown",
    dispensedAt: new Date().toISOString(),
  };
  const dispensed = DB.getArr("dispensed");
  dispensed.push(record);
  DB.set("dispensed", dispensed);

  const p = getPatient(patientId);
  toast(`${drugs[idx].name} × ${qty} dispensed to ${patientName(p)}`, "success");
  document.getElementById("dispenseForm").reset();
  refreshPharmacy();
  return false;
}

function refreshPharmacy() {
  const drugs = DB.getArr("drugs");
  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Alerts
  const expiring = drugs.filter((d) => {
    const exp = new Date(d.expiry);
    return exp > today && exp <= in30;
  });
  const expired = drugs.filter((d) => new Date(d.expiry) <= today);
  const lowStock = drugs.filter((d) => d.stock > 0 && d.stock <= 10 && new Date(d.expiry) > today);

  let alertsHtml = "";
  if (expired.length > 0) {
    alertsHtml += `<div class="alert alert-danger">⛔ <strong>${expired.length} drug(s) EXPIRED:</strong> ${expired.map((d) => d.name).join(", ")}</div>`;
  }
  if (expiring.length > 0) {
    alertsHtml += `<div class="alert alert-warning">⚠️ <strong>${expiring.length} drug(s) expiring within 30 days:</strong> ${expiring.map((d) => d.name).join(", ")}</div>`;
  }
  if (lowStock.length > 0) {
    alertsHtml += `<div class="alert alert-info">📦 <strong>${lowStock.length} drug(s) low stock (≤10):</strong> ${lowStock.map((d) => `${d.name} (${d.stock})`).join(", ")}</div>`;
  }
  document.getElementById("pharmacyAlerts").innerHTML = alertsHtml;

  // Inventory table
  document.getElementById("drugTable").innerHTML =
    drugs.length === 0
      ? '<tr><td colspan="7" class="text-muted text-sm" style="text-align:center;padding:20px;">No drugs in inventory</td></tr>'
      : drugs
          .map((d) => {
            const exp = new Date(d.expiry);
            let statusBadge;
            if (exp <= today) statusBadge = '<span class="badge badge-danger">⛔ Expired</span>';
            else if (exp <= in30) statusBadge = '<span class="badge badge-pending">⚠️ Expiring Soon</span>';
            else if (d.stock === 0) statusBadge = '<span class="badge badge-danger">Out of Stock</span>';
            else if (d.stock <= 10) statusBadge = '<span class="badge badge-pending">Low Stock</span>';
            else statusBadge = '<span class="badge badge-success">In Stock</span>';
            return `<tr>
        <td><strong>${escHtml(d.name)}</strong></td>
        <td>${escHtml(d.category)}</td>
        <td>${d.price.toLocaleString()}</td>
        <td>${d.stock}</td>
        <td>${fmtDate(d.expiry)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-outline btn-sm" onclick="editDrugStock('${d.id}')" title="Update stock">📝</button>
            <button class="btn btn-danger btn-sm" onclick="deleteDrug('${d.id}')" title="Remove drug">✕</button>
          </div>
        </td>
      </tr>`;
          })
          .join("");

  // Drug select for dispensing (only in-stock, non-expired)
  const availableDrugs = drugs.filter((d) => d.stock > 0 && new Date(d.expiry) > today);
  populateSelect(
    "dispDrug",
    availableDrugs.map((d) => ({
      value: d.id,
      label: `${d.name} (Stock: ${d.stock})`,
    })),
    "Select drug…"
  );

  // Dispense log
  const dispensed = DB.getArr("dispensed");
  document.getElementById("dispenseTable").innerHTML =
    dispensed.length === 0
      ? '<tr><td colspan="5" class="text-muted text-sm" style="text-align:center;padding:20px;">No dispensing records</td></tr>'
      : dispensed
          .slice()
          .reverse()
          .map((d) => {
            const p = getPatient(d.patientId);
            return `<tr>
        <td>${escHtml(patientName(p))}</td>
        <td>${escHtml(d.drugName)}</td>
        <td>${d.qty}</td>
        <td>${escHtml(d.dispensedBy)}</td>
        <td>${fmtDateTime(d.dispensedAt)}</td>
      </tr>`;
          })
          .join("");

  populatePatientSelects();
}

// ═══════════════════════════════════════════════════════════════
// MODULE: HUMAN RESOURCES
// ═══════════════════════════════════════════════════════════════
function addEmployee(e) {
  e.preventDefault();
  const name = document.getElementById("empName").value.trim();
  const dept = document.getElementById("empDept").value;
  const position = document.getElementById("empPosition").value.trim();
  const start = document.getElementById("empStart").value;
  if (!name || !dept || !position || !start) {
    toast("Please fill in all required fields", "error");
    return false;
  }
  const emp = {
    id: genId(),
    name,
    department: dept,
    position,
    phone: document.getElementById("empPhone").value.trim(),
    startDate: start,
    addedAt: new Date().toISOString(),
  };
  const employees = DB.getArr("employees");
  employees.push(emp);
  DB.set("employees", employees);
  toast(`${name} added to staff directory`, "success");
  document.getElementById("empForm").reset();
  refreshHR();
  return false;
}

function deleteEmployee(empId) {
  if (!confirm("Remove this employee from the directory?")) return;
  let employees = DB.getArr("employees");
  employees = employees.filter((e) => e.id !== empId);
  DB.set("employees", employees);
  // Also remove their docs
  let docs = DB.getArr("hrDocs");
  docs = docs.filter((d) => d.employeeId !== empId);
  DB.set("hrDocs", docs);
  toast("Employee removed", "info");
  refreshHR();
}

function generateHRDoc(e) {
  e.preventDefault();
  const employeeId = document.getElementById("docEmployee").value;
  const docType = document.getElementById("docType").value;
  if (!employeeId || !docType) {
    toast("Please select an employee and document type", "error");
    return false;
  }

  const doc = {
    id: genId(),
    employeeId,
    type: docType,
    generatedBy: currentUser?.username || "unknown",
    generatedAt: new Date().toISOString(),
  };
  const docs = DB.getArr("hrDocs");
  docs.push(doc);
  DB.set("hrDocs", docs);

  const emp = DB.getArr("employees").find((e) => e.id === employeeId);
  toast(`${docType} generated for ${emp?.name || "Unknown"}`, "success");
  document.getElementById("hrDocForm").reset();
  refreshHR();
  return false;
}

function viewHRDoc(docId) {
  const docs = DB.getArr("hrDocs");
  const doc = docs.find((d) => d.id === docId);
  if (!doc) return;
  const emp = DB.getArr("employees").find((e) => e.id === doc.employeeId);

  const templates = {
    "Employment Contract": `
EMPLOYMENT CONTRACT

DMC Hospital hereby confirms the employment of ${emp?.name || "—"}
in the department of ${emp?.department || "—"} as ${emp?.position || "—"}.

Start Date: ${fmtDate(emp?.startDate)}
Generated: ${fmtDateTime(doc.generatedAt)}

This document is system-generated for demo purposes.`,
    "Leave Form": `
LEAVE APPLICATION FORM

Employee: ${emp?.name || "—"}
Department: ${emp?.department || "—"}
Position: ${emp?.position || "—"}

Leave Type: _______________
From: _______________  To: _______________
Reason: _______________

Generated: ${fmtDateTime(doc.generatedAt)}`,
    "Warning Letter": `
WARNING LETTER

To: ${emp?.name || "—"}
Department: ${emp?.department || "—"}

This letter serves as a formal warning regarding:
_______________________________________________

Date Issued: ${fmtDateTime(doc.generatedAt)}
Issued By: ${doc.generatedBy}`,
    "Performance Appraisal": `
PERFORMANCE APPRAISAL FORM

Employee: ${emp?.name || "—"}
Department: ${emp?.department || "—"}
Position: ${emp?.position || "—"}
Review Period: _______________

Rating:  [ ] Excellent  [ ] Good  [ ] Satisfactory  [ ] Needs Improvement

Generated: ${fmtDateTime(doc.generatedAt)}`,
  };

  alert(templates[doc.type] || `Document: ${doc.type}\nEmployee: ${emp?.name}\nDate: ${fmtDateTime(doc.generatedAt)}`);
}

function deleteHRDoc(docId) {
  if (!confirm("Delete this document record?")) return;
  let docs = DB.getArr("hrDocs");
  docs = docs.filter((d) => d.id !== docId);
  DB.set("hrDocs", docs);
  toast("Document record deleted", "info");
  refreshHR();
}

function refreshHR() {
  populateDeptSelects();
  const employees = DB.getArr("employees");
  const docs = DB.getArr("hrDocs");

  // Employee select
  populateSelect(
    "docEmployee",
    employees.map((e) => ({ value: e.id, label: e.name })),
    "Select employee…"
  );

  // Staff directory
  document.getElementById("empTable").innerHTML =
    employees.length === 0
      ? '<tr><td colspan="7" class="text-muted text-sm" style="text-align:center;padding:20px;">No employees registered</td></tr>'
      : employees
          .map((emp) => {
            const docCount = docs.filter((d) => d.employeeId === emp.id).length;
            return `<tr>
        <td><strong>${escHtml(emp.name)}</strong></td>
        <td>${escHtml(emp.department)}</td>
        <td>${escHtml(emp.position)}</td>
        <td>${escHtml(emp.phone || "—")}</td>
        <td>${fmtDate(emp.startDate)}</td>
        <td><span class="badge badge-info">${docCount} doc${docCount !== 1 ? "s" : ""}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteEmployee('${emp.id}')" title="Remove employee">✕</button></td>
      </tr>`;
          })
          .join("");

  // Documents table
  document.getElementById("hrDocTable").innerHTML =
    docs.length === 0
      ? '<tr><td colspan="5" class="text-muted text-sm" style="text-align:center;padding:20px;">No documents generated</td></tr>'
      : docs
          .slice()
          .reverse()
          .map((d) => {
            const emp = employees.find((e) => e.id === d.employeeId);
            return `<tr>
        <td>${escHtml(emp?.name || "—")}</td>
        <td><span class="badge badge-purple">${escHtml(d.type)}</span></td>
        <td>${escHtml(d.generatedBy || "—")}</td>
        <td>${fmtDateTime(d.generatedAt)}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-outline btn-sm" onclick="viewHRDoc('${d.id}')" title="Preview document">👁️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteHRDoc('${d.id}')" title="Delete">✕</button>
          </div>
        </td>
      </tr>`;
          })
          .join("");
}

// ═══════════════════════════════════════════════════════════════
// MODULE: ADMIN / IT
// ═══════════════════════════════════════════════════════════════
function openAddUserModal() {
  openModal("addUserModal");
}

function addSystemUser(e) {
  e.preventDefault();
  const username = document.getElementById("newUsername").value.trim().toLowerCase();
  const role = document.getElementById("newRole").value;
  if (!username || !role) {
    toast("Username and role are required", "error");
    return false;
  }
  const users = DB.getArr("users");
  if (users.find((u) => u.username === username)) {
    toast("Username already exists", "error");
    return false;
  }
  users.push({ username, role, status: "active" });
  DB.set("users", users);
  closeModal("addUserModal");
  document.getElementById("newUsername").value = "";
  document.getElementById("newRole").value = "";
  toast(`User "${username}" created with role ${ROLE_LABELS[role]}`, "success");
  refreshAdmin();
  return false;
}

function toggleUserStatus(username) {
  const users = DB.getArr("users");
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) return;
  if (username === "itadmin") { toast("Cannot disable the super-admin account", "warning"); return; }
  users[idx].status = users[idx].status === "active" ? "disabled" : "active";
  DB.set("users", users);
  toast(`User "${username}" ${users[idx].status}`, "info");
  refreshAdmin();
}

function removeUser(username) {
  if (username === "itadmin") { toast("Cannot remove the super-admin account", "warning"); return; }
  if (!confirm(`Remove user "${username}"? This cannot be undone.`)) return;
  let users = DB.getArr("users");
  users = users.filter((u) => u.username !== username);
  DB.set("users", users);
  toast(`User "${username}" removed`, "info");
  refreshAdmin();
}

function resetAllData() {
  if (!confirm("⚠️ This will delete ALL demo data (patients, payments, encounters, drugs, employees, etc.).\n\nSystem users will be reset to defaults.\n\nContinue?")) return;
  localStorage.clear();
  initSeedData();
  toast("All data has been reset", "warning");
  setCurrentUser("itadmin");
}

function searchMasterPatients() {
  const query = document.getElementById("masterPatientSearch").value.toLowerCase().trim();
  const rows = document.querySelectorAll("#masterPatientTable tr");
  rows.forEach((row) => {
    if (!query) {
      row.style.display = "";
      return;
    }
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query) ? "" : "none";
  });
}

function refreshAdmin() {
  const patients = DB.getArr("patients");
  const payments = DB.getObj("payments");
  const encounters = DB.getArr("encounters");
  const queue = DB.getArr("queue");
  const drugs = DB.getArr("drugs");
  const employees = DB.getArr("employees");

  const totalPaid = Object.values(payments).filter((p) => p.status === "paid").length;
  const totalRevenue = Object.values(payments).reduce((s, p) => s + (p.amount || 0), 0);
  const pendingConsults = queue.filter(
    (q) =>
      payments[q.patientId]?.status === "paid" &&
      !encounters.some((e) => e.patientId === q.patientId)
  ).length;

  document.getElementById("adminStats").innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Patients</div><div class="stat-value">${patients.length}</div></div>
    <div class="stat-card"><div class="stat-label">Payments Done</div><div class="stat-value" style="color:var(--success)">${totalPaid}</div></div>
    <div class="stat-card"><div class="stat-label">Pending Consults</div><div class="stat-value" style="color:var(--primary)">${pendingConsults}</div></div>
    <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">${totalRevenue.toLocaleString()} RWF</div></div>
    <div class="stat-card"><div class="stat-label">Encounters</div><div class="stat-value">${encounters.length}</div></div>
    <div class="stat-card"><div class="stat-label">Drugs in Stock</div><div class="stat-value">${drugs.length}</div></div>
    <div class="stat-card"><div class="stat-label">Staff</div><div class="stat-value">${employees.length}</div></div>
  `;

  // Users table
  const users = DB.getArr("users");
  document.getElementById("userTable").innerHTML = users
    .map((u) => {
      const statusBadge =
        u.status === "active"
          ? '<span class="badge badge-success">Active</span>'
          : '<span class="badge badge-neutral">Disabled</span>';
      return `<tr>
      <td><strong>${escHtml(u.username)}</strong></td>
      <td><span class="badge ${ROLE_COLORS[u.role] || "badge-neutral"}">${ROLE_LABELS[u.role] || u.role}</span></td>
      <td>${statusBadge}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-outline btn-sm" onclick="toggleUserStatus('${u.username}')">${u.status === "active" ? "Disable" : "Enable"}</button>
          ${u.username !== "itadmin" ? `<button class="btn btn-danger btn-sm" onclick="removeUser('${u.username}')">Remove</button>` : ""}
        </div>
      </td>
    </tr>`;
    })
    .join("");

  // Departments table
  const depts = DB.getArr("departments");
  document.getElementById("deptTable").innerHTML = depts
    .map((d) => {
      const typeBadge =
        d.type === "Outpatient Only"
          ? '<span class="badge badge-info">Outpatient Only</span>'
          : '<span class="badge badge-purple">Inpatient & Outpatient</span>';
      return `<tr>
      <td><strong>${escHtml(d.name)}</strong></td>
      <td>${typeBadge}</td>
    </tr>`;
    })
    .join("");

  // Master patient table
  document.getElementById("masterPatientTable").innerHTML =
    patients.length === 0
      ? '<tr><td colspan="9" class="text-muted text-sm" style="text-align:center;padding:20px;">No patients registered</td></tr>'
      : patients
          .map((p, i) => {
            const paid = payments[p.id]?.status === "paid";
            const consulted = encounters.some((e) => e.patientId === p.id);
            return `<tr>
        <td>${i + 1}</td>
        <td><strong>${escHtml(patientName(p))}</strong></td>
        <td class="text-sm">${escHtml(p.nida || "—")}</td>
        <td>${escHtml(p.department)}</td>
        <td>${escHtml(p.insurance)}</td>
        <td><span class="badge badge-${paid ? "paid" : "pending"}">${paid ? "✓ Paid" : "⏳ Pending"}</span></td>
        <td><span class="badge badge-${consulted ? "completed" : "neutral"}">${consulted ? "✓ Consulted" : "Not Yet"}</span></td>
        <td>${fmtDate(p.registeredAt)}</td>
        <td><button class="btn btn-outline btn-sm" onclick="viewPatientDetail('${p.id}')" title="View details">👁️</button></td>
      </tr>`;
          })
          .join("");
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  initSeedData();
  populateDeptSelects();

  const savedUser = localStorage.getItem("currentUser");
  setCurrentUser(savedUser || "reception1");

  // Nav click handlers
  document.querySelectorAll(".nav-item[data-panel]").forEach((item) => {
    item.addEventListener("click", () => {
      const panel = item.dataset.panel;
      if (panel) switchPanel(panel);
    });
  });

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  // Close modals with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.open").forEach((m) => m.classList.remove("open"));
    }
  });

  // Close sidebar when clicking outside on mobile
  document.querySelector(".main").addEventListener("click", () => {
    if (window.innerWidth <= 900) {
      document.getElementById("sidebar").classList.remove("open");
    }
  });
});
