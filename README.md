# 🏥 DMC Hospital — Health Information Management System (HIMS)

> **Version:** 1.0 Demo  
> **Type:** Frontend-only click-through demo for stakeholder review  
> **Stack:** Pure HTML + CSS + Vanilla JavaScript (ES6+)  
> **Persistence:** Browser `localStorage` — no backend, no database, no external APIs

---

## Table of Contents

1. [Overview](#overview)  
2. [Quick Start](#quick-start)  
3. [Project Structure](#project-structure)  
4. [System Users & Roles](#system-users--roles)  
5. [Patient Journey & Roadblock Logic](#patient-journey--roadblock-logic)  
6. [Modules](#modules)  
   - [Reception](#-reception)  
   - [Cashier / Billing](#-cashier--billing)  
   - [Doctor / Consultations](#️-doctor--consultations)  
   - [Nurse / Maternity](#️-nurse--maternity)  
   - [Pharmacy](#-pharmacy)  
   - [Human Resources](#️-human-resources)  
   - [IT / Admin](#️-it--admin)  
7. [Data Model (localStorage)](#data-model-localstorage)  
8. [Department Configuration](#department-configuration)  
9. [UI Features](#ui-features)  
10. [Browser Compatibility](#browser-compatibility)  
11. [Known Limitations & Non-Goals](#known-limitations--non-goals)  
12. [Extending the Demo](#extending-the-demo)  
13. [FAQ](#faq)  

---

## Overview

This is a **single-browser, single-machine demo** of a Hospital Information Management System built for **DMC Hospital**. It is designed for **stakeholder review** — allowing decision-makers to interact with every module, see the patient journey end-to-end, and validate the workflow before committing to a production build.

**What this demo IS:**
- A fully interactive, seven-role click-through prototype
- A tool for validating workflows, UI/UX, and business rules
- Self-contained — runs by opening a single HTML file in any browser

**What this demo is NOT:**
- A production system (no real authentication, encryption, or RBAC)
- Connected to any external services (NIDA, SMS gateways are simulated)
- Multi-user or multi-device (data lives in one browser's `localStorage`)

---

## Quick Start

### Prerequisites

- Any modern web browser (Chrome, Firefox, Edge, Safari)
- No installation, no server, no build tools required

### Launch

1. Navigate to the project folder
2. **Double-click `index.html`** — the app opens in your default browser
3. You're logged in as `reception1` by default
4. Use the **Switch User** button in the sidebar footer to change roles

That's it. Zero setup.

---

## Project Structure

```
hims/
├── index.html      → HTML structure (panels, modals, forms, layout)
├── styles.css      → All styling (design tokens, components, responsive, animations)
├── app.js          → Application logic (data layer, modules, event handlers)
└── README.md       → This documentation file
```

| File         | Size   | Responsibility |
|-------------|--------|----------------|
| `index.html` | ~32 KB | DOM structure for all 7 role panels, 3 modals, toast container |
| `styles.css` | ~23 KB | CSS custom properties, layout, cards, tables, badges, responsive breakpoints, animations |
| `app.js`     | ~62 KB | `localStorage` data access, all CRUD operations, role switching, navigation, toast notifications |

> **Important:** All three files must remain in the same folder for the app to work.

---

## System Users & Roles

The demo ships with **7 pre-seeded users**, one per role. You can add more users from the Admin panel.

| Username     | Role               | Default Panel       |
|-------------|--------------------|--------------------|
| `reception1` | Reception          | Reception           |
| `cashier1`   | Cashier / Billing  | Billing             |
| `drmugabo`   | Doctor             | Consultations       |
| `nursejane`  | Nurse / Maternity  | Nursing / Maternity |
| `pharm1`     | Pharmacy           | Pharmacy            |
| `hr1`        | Human Resources    | Human Resources     |
| `itadmin`    | IT / Admin         | Administration      |

### Switching Users

- Click **👤 Switch User** in the sidebar footer
- A modal lists all active users — click one to switch
- The header updates to show the active username and role badge
- The sidebar navigation updates to show only the panels relevant to the selected role

### Role Visibility

Each role only sees the sidebar items relevant to them:

| Role       | Visible Panels |
|------------|----------------|
| Reception  | Reception |
| Cashier    | Billing |
| Doctor     | Consultations |
| Nurse      | Nursing / Maternity |
| Pharmacy   | Pharmacy |
| HR         | Human Resources |
| IT / Admin | **All panels** (super-admin) |

---

## Patient Journey & Roadblock Logic

The system enforces a strict sequential flow with a **hard payment roadblock**:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  RECEPTION   │───▶│   CASHIER    │───▶│    DOCTOR    │───▶│ NURSE / PHARM│───▶│  DISCHARGE   │
│  Check-in    │    │  Payment     │    │  Consult     │    │  Ancillary   │    │              │
│  + Queue #   │    │  Mark Paid   │    │  🔒 GATED   │    │  Billed back │    │  🚪 Remove   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### The Payment Roadblock (Critical Rule)

> A doctor **cannot** open a patient's consultation form until the patient's payment status is `paid` in `localStorage`.

**How it works:**

1. **Reception** registers a patient → patient appears in queue with status `⏳ Pending`
2. **Cashier** marks the patient as paid (quick action or manual form)
3. **Doctor** sees the patient's row update:
   - **Before payment:** `🔒 Awaiting Payment` (grayed out, non-clickable)
   - **After payment:** `🩺 Consult` (blue, active button)
4. Clicking the Consult button opens the consultation form
5. Attempting to bypass the lock (e.g., via code) still checks `localStorage` and shows an error toast

### Demonstrating the Roadblock

To demo this for stakeholders:

1. Log in as `reception1` → register a patient
2. Switch to `drmugabo` → observe the `🔒 Awaiting Payment` lock
3. Switch to `cashier1` → click `✓ Mark Paid`
4. Switch back to `drmugabo` → the `🩺 Consult` button is now active

---

## Modules

### 📋 Reception

**Purpose:** Patient registration and queue management.

| Feature | Description |
|---------|-------------|
| **Registration Form** | First name, last name, NIDA number, DOB, phone, insurance type, department, inpatient/outpatient toggle |
| **Insurance Types** | RAMA, RSSB, MMI, Mutuelle de Santé, Private, None |
| **Queue Auto-Assign** | Each check-in gets a sequential queue number |
| **Live Queue Board** | Visual card grid showing all patients with color-coded status badges |
| **Patient Table** | Detailed list view with payment status, time, and action buttons |
| **NIDA Verification** | Simulated — shows a toast notification (no real API call) |
| **SMS Confirmation** | Simulated — shows a toast notification (no real SMS gateway) |
| **Department Validation** | Warns if selecting Inpatient for an Outpatient-Only department |

**Buttons:**
| Button | Action |
|--------|--------|
| `📋 Check In Patient` | Validates form, registers patient, assigns queue number |
| `👁️ View` | Opens patient detail modal with full information |
| `🚪 Discharge` | Removes patient from queue (appears after consultation) |
| Queue cards | Clickable — opens patient detail modal |

---

### 💳 Cashier / Billing

**Purpose:** Payment processing and billing management.

| Feature | Description |
|---------|-------------|
| **Pending Payments** | Table of all unpaid patients with quick-pay action |
| **Payment Form** | Manual entry with patient, amount (RWF), and payment method |
| **Payment Methods** | Cash, Mobile Money, Insurance, Bank Transfer, Card |
| **Payment History** | Table of all completed payments with receipt generation |
| **Ancillary Charges** | Nursing acts flagged "Awaiting Billing" — can be billed here |
| **Void Requests** | Placeholder table structure for future approval workflow |

**Buttons:**
| Button | Action |
|--------|--------|
| `✓ Mark Paid` | Quick-pays patient (default 5,000 RWF), unlocks doctor roadblock |
| `💳 Record Payment` | Records a manual payment with amount and method |
| `🧾 Receipt` | Shows a formatted receipt preview (simulated print) |
| `✓ Bill` | Marks an ancillary nursing charge as billed |

**Stats displayed:** Pending count, Paid count, Total collected (RWF)

---

### 👨‍⚕️ Doctor / Consultations

**Purpose:** Clinical consultations for paid patients only.

| Feature | Description |
|---------|-------------|
| **Patient Queue** | All patients listed — paid patients get a Consult button, unpaid are locked |
| **Payment Roadblock** | `🔒 Awaiting Payment` shown for unpaid patients — non-clickable |
| **Consultation Form** | Chief complaint, ICD-11 diagnosis (free text), clinical notes, treatment/Rx |
| **Mandatory Validation** | Complaint, Diagnosis, and Clinical Notes are required — form highlights errors in red |
| **Encounter History** | Table of all completed consultations with view details |

**Buttons:**
| Button | Action |
|--------|--------|
| `🩺 Consult` | Opens the consultation form (only for paid patients) |
| `🔒 Awaiting Payment` | Disabled/locked indicator — not clickable |
| `💾 Save Consultation` | Validates mandatory fields, saves encounter |
| `✕ Close` | Closes the consultation form without saving |
| `👁️ View` | Opens a detail modal with full encounter information |

**Stats displayed:** In queue, Paid & ready, Completed today

---

### 👩‍⚕️ Nurse / Maternity

**Purpose:** Ward consumable logging and maternity partogram tracking.

#### Ward Consumables / Acts

| Feature | Description |
|---------|-------------|
| **Act Types** | Peripheral Line Insertion, Normal Saline (IV), Dressing Change, Injection, Vitals Check, Catheterization, Wound Suturing, Blood Draw, Oxygen Therapy |
| **Billing Flag** | All logged acts are flagged `Awaiting Billing` for the Cashier |
| **Quantity & Notes** | Quantity per act and optional free-text notes |

#### Maternity Partogram

| Feature | Description |
|---------|-------------|
| **Partogram Fields** | Cervical dilation (cm), fetal heart rate (bpm), contractions per 10 min, time of observation, observations |
| **Validation** | Dilation 0–10 cm, FHR 60–220 bpm, contractions 0–10 |
| **Log Table** | Chronological record of all partogram entries |

**Buttons:**
| Button | Action |
|--------|--------|
| `🩺 Log Act` | Records a ward consumable/act with billing flag |
| `📝 Log Partogram Entry` | Records a maternity observation |
| `✕ Delete` (Acts) | Removes an unbilled act (billed acts cannot be deleted) |
| `✕ Delete` (Partogram) | Removes a partogram entry |

---

### 💊 Pharmacy

**Purpose:** Drug inventory management and medication dispensing.

| Feature | Description |
|---------|-------------|
| **Add Drug** | Name, category, unit price (RWF), stock quantity, expiry date |
| **Categories** | Antibiotic, Analgesic, Antipyretic, Antihypertensive, Antimalarial, Antiretroviral, IV Fluid, Supplement, Surgical Supply, Other |
| **Expiry Alerts** | Banner alerts for expired drugs (red) and drugs expiring within 30 days (yellow) |
| **Low Stock Alert** | Banner alert for drugs with ≤10 units remaining |
| **Status Badges** | In Stock, Low Stock, Expiring Soon, Expired, Out of Stock |
| **Dispense Workflow** | Select patient + drug + quantity → decrements stock → records log |
| **Expiry Block** | Cannot dispense expired medication |

**Buttons:**
| Button | Action |
|--------|--------|
| `📦 Add to Inventory` | Adds a new drug to the inventory |
| `📝 Edit Stock` | Opens a prompt to update stock quantity |
| `✕ Remove Drug` | Deletes a drug from inventory |
| `💊 Dispense` | Dispenses medication to a patient, decrements stock |

---

### 🗂️ Human Resources

**Purpose:** Staff management and document generation.

| Feature | Description |
|---------|-------------|
| **Employee Registration** | Full name, department, position, phone, start date |
| **Staff Directory** | Table with document count per employee |
| **Document Generation** | Employment Contract, Leave Form, Warning Letter, Performance Appraisal |
| **Document Preview** | View formatted document templates |

**Buttons:**
| Button | Action |
|--------|--------|
| `➕ Add Employee` | Registers a new staff member |
| `📄 Generate Document` | Creates a document record for an employee |
| `👁️ Preview` | Shows a formatted preview of the generated document |
| `✕ Delete Employee` | Removes employee and all their associated documents |
| `✕ Delete Document` | Removes a single document record |

---

### ⚙️ IT / Admin

**Purpose:** System administration, user management, and master data views.

| Feature | Description |
|---------|-------------|
| **Dashboard Stats** | Total patients, payments done, pending consults, total revenue, encounters, drugs, staff |
| **User Management** | Add, enable/disable, and remove system users with role assignment |
| **Department Config** | View departments tagged as Inpatient & Outpatient or Outpatient Only |
| **Master Patient Register** | Every registered patient with payment + consultation status at a glance |
| **Patient Search** | Live search/filter across the master patient table |
| **Data Reset** | Full factory reset of all demo data |

**Buttons:**
| Button | Action |
|--------|--------|
| `➕ Add User` | Opens modal to create a new system user |
| `Enable / Disable` | Toggles a user's active status (disabled users can't be selected) |
| `Remove` | Permanently deletes a user (super-admin `itadmin` is protected) |
| `👁️ View` | Opens patient detail modal from the master register |
| `🔍 Search` | Live-filters the master patient table |
| `🗑️ Reset All Demo Data` | Clears all `localStorage` and re-seeds defaults (requires confirmation) |

---

## Data Model (localStorage)

All data is stored in the browser's `localStorage` through a thin data-access wrapper (`DB.get`, `DB.set`, `DB.getArr`, `DB.getObj`).

| Key          | Type             | Description |
|-------------|------------------|-------------|
| `patients`   | `Array<Object>` | Registered patients |
| `queue`      | `Array<Object>` | Check-in / queue entries (linked to patients by `patientId`) |
| `payments`   | `Object`         | Keyed by `patientId` → `{ amount, method, paidAt, status }` |
| `encounters` | `Array<Object>` | Completed doctor consultations (linked by `patientId`) |
| `nurseActs`  | `Array<Object>` | Logged ward consumables / acts |
| `partograms` | `Array<Object>` | Maternity partogram entries |
| `drugs`      | `Array<Object>` | Pharmacy inventory items |
| `dispensed`  | `Array<Object>` | Dispensing log entries |
| `employees`  | `Array<Object>` | HR staff records |
| `hrDocs`     | `Array<Object>` | Generated HR documents (linked by `employeeId`) |
| `users`      | `Array<Object>` | System users `{ username, role, status }` |
| `departments`| `Array<Object>` | Department configuration `{ name, type }` |
| `currentUser`| `String`         | Username of the currently active user |

### Data Access Wrapper

```javascript
const DB = {
  get(key)      // Parse JSON from localStorage, returns null if missing
  set(key, val) // Stringify and save to localStorage
  getArr(key)   // get() with [] as default
  getObj(key)   // get() with {} as default
};
```

---

## Department Configuration

| Department        | Service Type            |
|------------------|------------------------|
| General Medicine  | Inpatient & Outpatient |
| Pediatrics        | Inpatient & Outpatient |
| Maternity         | Inpatient & Outpatient |
| Orthopedics       | Inpatient & Outpatient |
| Internal Medicine | Inpatient & Outpatient |
| Ophthalmology     | Outpatient Only        |
| ENT               | Outpatient Only        |
| Dental            | Outpatient Only        |

> **Rule enforced:** If a receptionist selects an Outpatient-Only department and sets the patient type to Inpatient, the system shows a warning toast and blocks registration.

---

## UI Features

### Design Principles

- **Minimal-luxury aesthetic** — Apple / Vercel-inspired
- **Ample whitespace** and crisp system-font typography
- **Rounded cards** (10px radius), soft shadows, no visual clutter
- **Color-coded status badges** used consistently across all tables

### Interactive Elements

| Feature | Description |
|---------|-------------|
| **Toast Notifications** | Slide-in toasts (success/error/info/warning) for all actions — replaces disruptive `alert()` dialogs |
| **Detail Modals** | Rich patient and encounter detail views in an overlay modal |
| **Form Validation** | Red border highlight on invalid mandatory fields |
| **Search** | Live client-side filtering on the admin master patient table |
| **Keyboard Shortcuts** | Press `Escape` to close any open modal |
| **Mobile Responsive** | Sidebar collapses to hamburger menu below 900px; single-column stack below 600px |
| **Click-to-view** | Queue board cards are clickable to open patient details |
| **Animations** | Fade-in panel transitions, modal scale-in, toast slide-in/out |

### Status Badge Reference

| Badge | Color | Meaning |
|-------|-------|---------|
| `⏳ Pending` | Amber | Awaiting payment |
| `✓ Paid` | Green | Payment confirmed |
| `✓ Consulted` | Green | Doctor consultation completed |
| `🔒 Awaiting Payment` | Gray | Consultation locked — payment required |
| `Awaiting Billing` | Orange | Nursing act not yet billed by cashier |
| `✓ Billed` | Green | Nursing act has been billed |
| `In Stock` | Green | Drug available |
| `Low Stock` | Amber | Drug quantity ≤ 10 |
| `⚠️ Expiring Soon` | Amber | Drug expires within 30 days |
| `⛔ Expired` | Red | Drug past expiry date |
| `Out of Stock` | Red | Drug quantity = 0 |
| `Active` | Green | User account enabled |
| `Disabled` | Gray | User account disabled |

---

## Browser Compatibility

| Browser | Version | Supported |
|---------|---------|-----------|
| Chrome  | 80+     | ✅ |
| Firefox | 78+     | ✅ |
| Edge    | 80+     | ✅ |
| Safari  | 14+     | ✅ |

> Requires ES6+ support and `localStorage` availability. Private/incognito mode may limit data persistence.

---

## Known Limitations & Non-Goals

| Item | Status |
|------|--------|
| Real authentication / encryption | ❌ Not implemented — UI-level role switching only |
| NIDA API integration | ❌ Simulated with toast notifications |
| SMS gateway | ❌ Simulated with toast notifications |
| Multi-device sync | ❌ Single-browser, single-machine only |
| Persistent storage | ❌ Data is lost if browser storage is cleared |
| RBAC enforcement | ❌ UI-level only — no server-side access control |
| Void request approval workflow | ⏳ Table structure only — logic placeholder |
| PDF document generation | ❌ Previews shown as formatted text |
| ICD-11 code validation | ❌ Free text entry — no code lookup |
| Multi-language support | ❌ English only |

---

## Extending the Demo

### Adding a New Module

1. **HTML** (`index.html`): Add a new `<div class="panel" id="panel-newmodule">` inside `.content`
2. **HTML** (`index.html`): Add a `<div class="nav-item" data-panel="newmodule" data-roles="role1,itadmin">` in the sidebar
3. **JS** (`app.js`): Add a `refreshNewModule()` function and register it in `refreshPanel()`
4. **JS** (`app.js`): Add the panel title to `PANEL_TITLES` and default panel to `ROLE_DEFAULT_PANEL`

### Adding a New Data Entity

1. Add the key to `initSeedData()` in `app.js`
2. Use `DB.getArr('key')` / `DB.set('key', array)` for all reads/writes
3. Follow the existing pattern: `genId()` for IDs, `new Date().toISOString()` for timestamps

### Adding a New User Role

1. Add the user to `SEED_USERS` in `app.js`
2. Add the role label to `ROLE_LABELS` and color to `ROLE_COLORS`
3. Add the default panel mapping to `ROLE_DEFAULT_PANEL`
4. Update `data-roles` attributes on relevant nav items in `index.html`

### Resetting Demo Data

- **From the UI:** Log in as `itadmin` → scroll to System Maintenance → click `🗑️ Reset All Demo Data`
- **From the browser:** Open DevTools → Console → `localStorage.clear()` → refresh

---

## FAQ

**Q: How do I reset the demo to a clean state?**  
A: Log in as `itadmin`, scroll to the bottom of the Administration panel, and click `🗑️ Reset All Demo Data`. Alternatively, open your browser's DevTools console and run `localStorage.clear()`, then refresh.

**Q: Can I use this on my phone?**  
A: Yes. The UI is fully responsive. Open the HTML file or serve it via a local server and access it from your mobile browser.

**Q: Why do I see "NIDA verified (simulated)" when registering a patient?**  
A: The demo does not connect to any external API. NIDA verification and SMS notifications are simulated with toast messages as placeholders.

**Q: I registered a patient but the doctor can't consult them — why?**  
A: This is the payment roadblock by design. Switch to `cashier1` and mark the patient as paid first, then switch back to the doctor.

**Q: Can multiple people use this at the same time?**  
A: No. This demo runs in a single browser on a single machine. There is no server-side state or real-time sync.

**Q: How do I serve this over a local network for a demo session?**  
A: Use any simple HTTP server. For example:
```bash
# Python
python -m http.server 8080

# Node.js (npx)
npx serve .
```
Then access `http://localhost:8080` from any device on the same network.

---

## License

This demo is provided as-is for internal stakeholder review at DMC Hospital. Not intended for production use.

---

*Built with ❤️ for DMC Hospital — July 2026*
