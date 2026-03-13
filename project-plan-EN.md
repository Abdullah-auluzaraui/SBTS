# School Bus Tracking System — Master Project Plan

**Version:** 2.0 (Multi-Tenant Architecture) &nbsp;|&nbsp; **Date:** March 2026 &nbsp;|&nbsp; **Language:** English

---

## 1. Project Overview

### 1.1 Platform Summary

The **School Bus Tracking System** is a Multi-Tenant, full-stack web and IoT platform that provides:

- 🏫 **Multi-School Management:** Centralized control for a higher authority (e.g., Ministry/District) to onboard multiple schools.
- 🚌 Live GPS tracking of school buses.
- 📲 NFC-based student attendance on the bus.
- 🔒 **Secure Parent Onboarding:** 2-step verification using a unique Student ID and a system-generated Secret Access Code.
- 🔔 Real-time parental notifications (approaching, boarded, left bus).
- 📊 Administrative reporting and control per school.

The system is designed for **Super Admins (Ministry/District)**, **School Administrators**, **Bus Drivers**, and **Parents**.

---

### 1.2 Core Objectives

| # | Objective |
|---|-----------|
| 1 | Enable a Super Admin to register, authorize, and generate unique IDs for participating schools. |
| 2 | Provide live GPS tracking of school buses visible to authorized parents and school admins. |
| 3 | Automate student attendance via NFC card taps on the bus. |
| 4 | Ensure secure mapping between students and a parent account, allowing parents to link multiple children using Access Codes. |
| 5 | Give School Administrators full control over their specific fleet, routes, and students using Bulk CSV Uploads. |
| 6 | Ensure strict data segregation so no school can access another school's data. |

---

### 1.3 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React.js (Vite) | Super Admin, Admin, Driver, and Parent dashboards |
| **Styling** | CSS / Tailwind | Responsive UI |
| **Maps** | Google Maps JS API | Live bus tracking, route display, ETA |
| **Backend** | Node.js + Express.js | REST API + Socket.IO server |
| **Database** | MongoDB + Mongoose | Data persistence |
| **Real-Time** | Socket.IO | Bidirectional WebSocket communication (Multi-Tenant Rooms) |
| **IoT Hardware** | Raspberry Pi | GPS module + NFC reader on the bus |
| **IoT Simulation** | Python (`requests`) | Development simulator for GPS/NFC |
| **Auth** | JWT + bcryptjs | Secure authentication |
| **Reports** | pdfkit + exceljs | PDF and Excel report generation |
| **Deployment** | Firebase (FE) + Railway (BE) + MongoDB Atlas | Cloud hosting (Ephemeral storage handled via on-the-fly streams/buffers) |

---

### 1.4 User Roles

| Role | Capabilities |
|------|-------------|
| **Super Admin** | Ministry/District level. Registers new schools, assigns School IDs, and creates the initial School Admin accounts. Views global statistics. |
| **School Admin** | Manages a specific school. Can bulk-upload students/buses, manage routes, view attendance, generate school-specific reports, and receive emergency alerts. |
| **Driver** | Starts/ends trips, views live student list for their assigned bus, triggers emergency alerts. |
| **Parent** | Registers securely via Secret Code. Views live bus location, receives notifications, and views ETA for their child. |

---

## 2. Full Sprint Roadmap (8 Weeks)

```
Week 1–2  │ Sprint 1 │ Multi-Tenant Infrastructure, Auth & Secure Onboarding
Week 3–4  │ Sprint 2 │ Super/School Admin Data Management & CSV Uploads
Week 5–6  │ Sprint 3 │ Real-Time Tracking & IoT Integration
Week 7–8  │ Sprint 4 │ Reporting, Emergency Alerts & Final Testing
```

| Sprint | Weeks | Focus Area | Use Cases |
|--------|-------|-----------|-----------|
| Sprint 1 | 1–2 | Multi-Tenant Data, Auth, JWT, Security | UC-4, UC-5, UC-9, UC-14 |
| Sprint 2 | 3–4 | Super/School Admin CRUD, Bulk CSV, Data Segregation | UC-6, UC-7, UC-8, UC-10 |
| Sprint 3 | 5–6 | Live GPS, NFC Check-In, Segregated Socket Rooms | UC-1, UC-2, UC-3, UC-15 |
| Sprint 4 | 7–8 | School-Scoped Reports, Alerts, Deploy | UC-11, UC-12, UC-13 |

---

## 3. Sprint 1 — Infrastructure & Authentication (Weeks 1–2)

**Use Cases:** UC-4 (Driver Login) · UC-5 (School/Super Admin Login) · UC-9 (Register Parent) · UC-14 (Logout)

---

### 3.1 Frontend Tasks (React)

| Task ID | Description | UC |
|---------|-------------|-----|
| FE-S1-1 | Project setup: Vite + React Router v6 + Axios + Context API routing for 4 roles. | All |
| FE-S1-2 | `LoginForm` — username/password fields; error display for invalid credentials. Handles all 4 roles. | UC-4, UC-5 |
| FE-S1-3 | `RegisterForm` (Parent) — Requires Name, Email, Password, Student ID, and Secret Access Code. | UC-9 |
| FE-S1-4 | `AuthContext` — stores JWT, user role, expiry; provides `login()`, `logout()` | All |
| FE-S1-5 | `ProtectedRoute` — guards routes by auth status and role | All |
| FE-S1-6 | `LogoutConfirmModal` — "Are you sure?" dialog before clearing token | UC-14 |
| FE-S1-7 | Axios interceptor — auto-logout on `401 Unauthorized` (session expiry) | UC-14 |
| FE-S1-8 | Role-based redirect depending on role: Super Admin → `/super`, School Admin → `/admin`, Driver → `/driver`, Parent → `/parent`. | UC-4, UC-5 |
| FE-S1-9 | `ParentDashboard` "Add Another Child" Modal — Allows parent to link an additional student using ID and Access Code. | UC-9 |

---

### 3.2 Backend Tasks (Node.js)

| Task ID | Description | UC |
|---------|-------------|-----|
| BE-S1-1 | Create `School` Mongoose model (name, schoolId, contact info). | All |
| BE-S1-2 | Update all models (`User`, `Student`, `Bus`, etc.) to include `schoolId` reference. | All |
| BE-S1-3 | `POST /api/auth/login` — validate credentials, check `isActive`, return JWT | UC-4, UC-5 |
| BE-S1-4 | `POST /api/auth/register` — Validate `studentId` AND `parentAccessCode`. Ensure `student.parentId` is null. Hash password, save user, update student document. | UC-9 |
| BE-S1-4b| `POST /api/parents/students` — Validate ID/Code and link an additional student to the logged-in parent (1-to-many relationship). | UC-9 |
| BE-S1-5 | `POST /api/auth/logout` — client-side token removal (stateless JWT) | UC-14 |
| BE-S1-6 | `authMiddleware` — verify JWT on protected routes | All |
| BE-S1-7 | `roleMiddleware(rolesArray)` — Enforce granular role-based access | All |
| BE-S1-8 | Tenant Middleware — Automatically attach `req.user.schoolId` to all DB queries for SchoolAdmin, Driver, and Parent to enforce data segregation. | All |
| BE-S1-9 | Seed script — create Super Admin, a dummy School, School Admin, active Driver, suspended Driver (for demo) | UC-4, UC-5 |

---

### 3.3 API Contracts

#### `POST /api/auth/login`

```json
// Request
{ "username": "admin01", "password": "Admin@123" }

// Success 200
{ "success": true, "token": "<JWT>", "user": { "id": "...", "name": "...", "role": "schooladmin", "schoolId": "SCH-1234" } }

// Error — Invalid credentials
{ "success": false, "errorCode": "INVALID_CREDENTIALS", "message": "Username or password is incorrect" }

// Error — Inactive account
{ "success": false, "errorCode": "ACCOUNT_INACTIVE", "message": "Your account has been suspended" }
```

#### `POST /api/auth/register` (Parent)

```json
// Request
{ 
  "name": "Sara Al-Mutairi", "email": "sara@email.com", "password": "Pass@123", 
  "studentId": "STU-2024-001", "parentAccessCode": "A7X-92K" 
}

// Success 201
{ "success": true, "token": "<JWT>", "user": { "id": "...", "name": "Sara Al-Mutairi", "role": "parent" } }

// Error — Invalid Code or ID
{ "success": false, "errorCode": "INVALID_CREDENTIALS", "message": "Invalid Student ID or Access Code" }

// Error — Already Linked
{ "success": false, "errorCode": "STUDENT_ALREADY_LINKED", "message": "This student is already linked to a parent account. Contact school administration." }
```

---

### 3.4 Integration Demo Goals

1. Login as Super Admin → redirected to Super Admin Dashboard
2. Login as School Admin → redirected to School Admin Dashboard
3. Login with wrong password → error message shown
4. Register as Parent with valid Student ID but missing Access Code → error message shown
5. Register as Parent with valid ID and Access Code → auto-logged in, student's `parentId` updated
6. Attempt second registration for the same student → "Already Linked" error
7. Logout → confirmation dialog → token cleared → redirected to login

---

### ✅ Sprint 1 — Expected Output (End of Week 2)

**Screens that must be working:**

| Screen | URL | Who Sees It |
|--------|-----|-------------|
| Login Page | `/login` | All Roles |
| Parent Registration | `/register` | New parents only |
| Super Admin Dashboard (stub) | `/super` | Super Admin only |
| School Admin Dashboard (stub) | `/admin` | School Admin only |
| Driver Dashboard (stub) | `/driver` | Driver only |
| Parent Dashboard (stub) | `/parent` | Parent only |

**UI Layout — Login Page:**
```
┌─────────────────────────────────────┐
│        🚌 School Bus Tracker        │
│  ─────────────────────────────────  │
│  Username: [_____________________]  │
│  Password: [_____________________]  │
│                                     │
│         [ Log In ]                  │
│  Don't have an account? Register    │
│  ─────────────────────────────────  │
│  ⚠ Error: Username or password is  │
│    incorrect       (shown on error) │
└─────────────────────────────────────┘
```

**Functional capabilities confirmed at Sprint 1 end:**

- ✅ JWT issued on login; stored securely in `localStorage`
- ✅ Role-based redirection handles 4 distinct roles
- ✅ Parent registration implements 2-step verification (`studentId` + `parentAccessCode`)
- ✅ Strict one-to-one mapping verified (no multiple parents per student)
- ✅ Tenant middleware actively scoping queries to `schoolId` internally
- ✅ Inactive account shows specific error (not generic wrong-password)

---

## 4. Sprint 2 — Administration & Data Management (Weeks 3–4)

**Use Cases:** UC-6 (Route Management) · UC-7 (Add Bus) · UC-8 (Register Student) · UC-10 (View Attendance)

---

### 4.1 Frontend Tasks (React)

| Task ID | Description | UC |
|---------|-------------|-----|
| FE-S2-1 | `SuperAdminDashboard` — Form to register a new School, generate unique `schoolId`, and create its initial School Admin account. | All |
| FE-S2-2 | Install `@react-google-maps/api`; configure API key via `.env` | UC-6 |
| FE-S2-3 | `RouteMapEditor` — draw/edit polyline; scoped to Admin's `schoolId` | UC-6 |
| FE-S2-4 | `RouteForm` and `RouteList` — create, edit, logic bounds. Scoped. | UC-6 |
| FE-S2-5 | `BusForm` and `BusList` — Manage fleets. Scoped to Admin's `schoolId`. | UC-7 |
| FE-S2-6 | `StudentForm` (Manual) — Add single student, bus dropdown, auto-generate `parentAccessCode`. | UC-8 |
| FE-S2-7 | `CSVBulkUpload` — UI component for School Admins to drag-and-drop a CSV file to register 50+ students at once. | UC-8 |
| FE-S2-8 | `StudentList` (School Admin) — Display `parentAccessCode` for unregistered students so the school can print/distribute them. | UC-8 |
| FE-S2-9 | `AttendanceTable` — Filter by bus, date, student. Scoped to Admin's `schoolId`. | UC-10 |
| FE-S2-10 | `AdminDashboard` — summary cards (buses, students, routes, today's attendance) | All |

---

### 4.2 Backend Tasks (Node.js)

| Task ID | Description | UC |
|---------|-------------|-----|
| BE-S2-1 | `POST /api/super/schools` — Create school, generate unique `schoolId`, create School Admin user. | All |
| BE-S2-1b| `PATCH /api/super/schools/:id/status` & `POST /api/super/schools/:id/reset-admin-password` — Handle school status and admin password recovery. | All |
| BE-S2-2 | `POST /api/students/bulk` — Parse CSV directly from memory buffer (`multer` memoryStorage) to avoid ephemeral storage loss. Auto-generate `parentAccessCode`s and save. | UC-8 |
| BE-S2-3 | Data Segregation Verification — Ensure `GET /api/buses`, `GET /api/students`, etc., strictly filter using `req.user.schoolId` injected by Tenant Middleware. | All |
| BE-S2-4 | `Bus`, `Route`, `Attendance` models — Include `school: ObjectId` references. | All |
| BE-S2-5 | CRUD endpoints for Buses (`POST/PUT/DELETE /api/buses`) | UC-7 |
| BE-S2-6 | CRUD endpoints for Routes (`POST/PUT/DELETE /api/routes`) | UC-6 |
| BE-S2-7 | `POST /api/students` — Single student creation API | UC-8 |
| BE-S2-8 | `GET /api/attendance` — Fetch attendance records scoped by school. Filter by busId, studentId, date range; paginated. | UC-10 |

---

### 4.3 API Contracts

#### `POST /api/super/schools` (Super Admin)

```json
// Request
{
  "schoolName": "Al-Nour High School",
  "contactEmail": "info@alnour.edu.sa",
  "contactPhone": "+966500000000",
  "adminUsername": "admin_alnour",
  "adminName": "Yousef"
}

// Success 201
{ 
  "success": true, 
  "school": { "schoolId": "SCH-1234", "name": "Al-Nour High School" },
  "adminUser": { "username": "admin_alnour", "defaultPassword": "TempPassword123!" }
}
```

#### `POST /api/super/schools/:id/reset-admin-password`

```json
// Request
{ "newPassword": "SecurePassword123!" } // Optional, or system generated

// Success 200
{ "success": true, "message": "School Admin password has been reset.", "tempPassword": "SecurePassword123!" }
```

#### `POST /api/students/bulk` (School Admin)

```json
// Request (FormData/CSV)
// file: students.csv

// Success 201
{ 
  "success": true, 
  "message": "Successfully imported 54 students", 
  "skipped": 2,
  "downloadUnregisteredCodesUrl": "/api/students/access-codes/export"
}
```

#### `POST /api/routes`

```json
// Request
{
  "name": "Route A — North District",
  "driverId": "64f1...",
  "waypoints": [
    { "lat": 24.7136, "lng": 46.6753, "label": "School Gate" },
    { "lat": 24.7200, "lng": 46.6800, "label": "Stop 1" }
  ],
  "estimatedDuration": 35
}

// Success 201
{ "success": true, "message": "Route created successfully", "route": { "id": "...", "name": "...", "driver": { "id": "...", "name": "..." }, "waypoints": [...] } }
```

---

### 4.4 Integration Demo Goals

1. Super Admin registers a new school → Receives `schoolId` and School Admin credentials.
2. School Admin logs in, sees empty dashboard scoped only to their new `schoolId`.
3. School Admin performs CSV Bulk Upload → 50 students created with auto-generated Access Codes.
4. School Admin creates a Route via Google Maps and assigns a Bus.
5. School Admin exports a PDF of `parentAccessCode`s to distribute to parents.
6. Try saving route with 1 waypoint → validation error.

---

### ✅ Sprint 2 — Expected Output (End of Week 4)

**Screens that must be working:**

| Screen | URL | Who Sees It |
|--------|-----|-------------|
| Super Admin Dashboard | `/super` | Super Admin |
| Admin Dashboard (full) | `/admin` | School Admin |
| Route Management | `/admin/routes` | School Admin |
| Bus Management | `/admin/buses` | School Admin |
| Student Management | `/admin/students` | School Admin |
| Attendance Records | `/admin/attendance` | School Admin |

**UI Layout — Super Admin Dashboard:**
```
┌──────────────────────────────────────────────────────┐
│  🏫 Super Admin System                     [Logout]  │
│  ─────────────────────────────────────────────────── │
│  [+] Register New School                             │
│  ─────────────────────────────────────────────────── │
│  Active Schools:                                     │
│  • Al-Nour High (SCH-1234) — 840 Students, 12 Buses  │
│  • Al-Nahda Middle (SCH-1235) — 450 Students, 6 Buses│
└──────────────────────────────────────────────────────┘
```

**UI Layout — School Admin Dashboard (Students):**
```
┌──────────────────────────────────────────────────────┐
│  👨‍🎓 Student Management       [Upload CSV] [+ Add Single] │
│  ─────────────────────────────────────────────────── │
│  ID           Name          Code      Parent Linked  │
│  STU-001      Khalid        A7X-92K        ❌        │
│  STU-002      Sara          ---            ✅        │
└──────────────────────────────────────────────────────┘
```

**Functional capabilities confirmed at Sprint 2 end:**

- ✅ Super Admin can create isolated schools.
- ✅ School Admin can bulk-upload students via CSV.
- ✅ System auto-generates 6-character access codes for new students.
- ✅ All routes, buses, and students are successfully siloed by `schoolId`.
- ✅ Admin maps/route editing functional and restricted to specific school.
- ✅ Bus dropdown is disabled on student form when no buses exist.
- ✅ Attendance table supports filtering by bus, date range, and student.
- ✅ Soft-deleted buses/routes are hidden from dropdowns but data preserved.

---

## 5. Sprint 3 — Real-Time Tracking & IoT Integration (Weeks 5–6)

**Use Cases:** UC-1 (NFC Check-In/Out) · UC-2 (GPS Tracking) · UC-3 (Parental Notifications) · UC-15 (Parent Route & ETA)

---

### 5.1 Real-Time Architecture (Multi-Tenant)

```
Raspberry Pi (Python)
  ├─ POST /api/iot/location  { busId, lat, lng, speed }
  └─ POST /api/iot/nfc-scan  { nfcTagId, busId }
          │
          ▼
  Node.js (Express) — Looks up busId ➔ determines schoolId
          │
          ▼
  Socket.IO Router
  ├─ Emits to: school:{schoolId}:bus:{busId}   ──► Parent, Driver
  ├─ Emits to: school:{schoolId}:admin         ──► School Admin
  └─ Emits to: parent:{parentId}               ──► Private Notification
```

---

### 5.2 Frontend Tasks (React)

| Task ID | Description | UC |
|---------|-------------|-----|
| FE-S3-1 | `useSocket.js` — Connects to school-prefixed rooms (`school:{schoolId}:admin`, etc.); handles all events. | All |
| FE-S3-2 | `LiveBusMap` — animated bus marker; stale GPS indicator ("Data Last Updated: HH:MM") | UC-2 |
| FE-S3-3 | `ParentDashboard` — live map, student status badge, ETA panel; "No Scheduled Trip" empty state | UC-15 |
| FE-S3-4 | ETA panel — refreshes every 30s; delay warning banner if delay >5 min | UC-15 |
| FE-S3-5 | `NotificationToast` — APPROACHING, BOARDED, LEFT_BUS, DELAY, EMERGENCY types | UC-3 |
| FE-S3-6 | `DriverDashboard` — "Start Trip" button; live student list; missing student alert | UC-1 |
| FE-S3-7 | `AdminDashboard` — live attendance feed; fleet map; route deviation flag | UC-1, UC-2 |
| FE-S3-8 | `RouteWithStopsMap` — route polyline + stop markers; stop-specific info on tap | UC-15 |
| FE-S3-9 | `NotificationPreferences` — parent mutes per route/time window | UC-3 |

---

### 5.3 Backend Tasks (Node.js)

| Task ID | Description | UC |
|---------|-------------|-----|
| BE-S3-1 | `Trip` model — status lifecycle, stopLog[], include `school` ref | UC-1 |
| BE-S3-2 | `LocationLog` model — busId, lat, lng, speed, `school` ref, TTL 24h | UC-2 |
| BE-S3-3 | `POST /api/trips/start` — driver starts trip; validates bus + route | UC-1 |
| BE-S3-4 | `POST /api/iot/location` — Finds bus, identifies `schoolId`, emits `locationUpdate` to `school:{schoolId}:bus:{busId}`. | UC-2 |
| BE-S3-4b| `POST /api/iot/location/batch` — Receives buffered offline GPS/NFC data from Pi in a batch array, backfilling the database when internet reconnects. | UC-1, UC-2 |
| BE-S3-5 | `POST /api/iot/nfc-scan` — Validates tag against `schoolId`, logs attendance, emits `attendanceUpdate`. | UC-1 |
| BE-S3-6 | Geofence Check — Calculates if bus is approaching stop (2-ping confirmed), emits to `parent:{parentId}`. | UC-3 |
| BE-S3-7 | `GET /api/buses/:id/location` — latest GPS; isStale flag if >60s | UC-2 |
| BE-S3-8 | `GET /api/buses/:id/eta` — Distance Matrix API; studentCount per stop; delay flag; stale fallback | UC-15 |
| BE-S3-9 | Missing student detection — compare expected vs boarded; emit `missingStudent` | UC-1 |
| BE-S3-10 | Notification channel logic — WebSocket primary; escalate to SMS/email on failure | UC-3 |

---

### 5.4 Socket.IO Event Contracts

*Event payloads remain identical to v1.0, but their routing is strictly governed by the Multi-Tenant rooms.*

#### `locationUpdate` — emitted to Room: `school:{schoolId}:bus:{busId}`

```json
{
  "event": "locationUpdate",
  "busId": "...",
  "busLabel": "BUS-001",
  "location": { "lat": 24.7250, "lng": 46.6820 },
  "speed": 42,
  "isStale": false,
  "timestamp": "2026-03-19T07:22:10.000Z"
}
```

#### `attendanceUpdate` — emitted to driver and admin rooms

```json
{
  "event": "attendanceUpdate",
  "busId": "...",
  "student": { "id": "...", "name": "Khalid Al-Otaibi", "studentId": "STU-2024-002" },
  "action": "boarding",
  "timestamp": "2026-03-19T07:15:32.000Z"
}
```

#### `notification` — emitted to parent's private room `parent:{userId}`

```json
{
  "event": "notification",
  "type": "BOARDED",
  "message": "Khalid has boarded BUS-001",
  "student": { "name": "Khalid" },
  "bus": { "busId": "BUS-001" },
  "timestamp": "..."
}
```

---

### 5.5 ETA Calculation

**Method:** Google Maps Distance Matrix API (traffic-aware)

```javascript
// services/etaService.js
const { data } = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
  params: {
    origins: `${bus.lat},${bus.lng}`,
    destinations: stops.map(s => `${s.lat},${s.lng}`).join('|'),
    mode: 'driving',
    departure_time: 'now',
    key: process.env.GOOGLE_MAPS_API_KEY
  }
});
```

---

### 5.6 Raspberry Pi Simulator (Python)

The simulator sends data for specific buses. The backend routes the data to the correct school's namespace.

```python
# raspberry_pi_simulator.py — pip install requests
import requests, time, random

API_BASE_URL = "http://localhost:5000/api/iot"
DEVICE_TOKEN = "your-secret-device-token"
BUS_ID       = "64f1a2b3c4d5e6f7a8b9c0d6"  # Belongs to a specific school
HEADERS      = { "Content-Type": "application/json", "X-Device-Token": DEVICE_TOKEN }

ROUTE_WAYPOINTS = [
    {"lat": 24.7136, "lng": 46.6753},  # School Gate
    {"lat": 24.7200, "lng": 46.6800},  # Stop 1
    {"lat": 24.7350, "lng": 46.6900},  # Stop 2
]
NFC_TAGS = ["NFC-TAG-001", "NFC-TAG-002"]

def send_gps_ping(lat, lng, speed):
    requests.post(f"{API_BASE_URL}/location",
        json={"busId": BUS_ID, "lat": lat, "lng": lng, "speed": speed},
        headers=HEADERS, timeout=5)

offline_buffer = []

def send_nfc_scan(tag):
    try:
        requests.post(f"{API_BASE_URL}/nfc-scan",
            json={"nfcTagId": tag, "busId": BUS_ID},
            headers=HEADERS, timeout=5)
        # If successful, flush offline_buffer logic would run here
    except requests.exceptions.RequestException:
        # Cache locally during offline periods (e.g., weak 4G signal)
        offline_buffer.append({"type": "nfc", "tag": tag, "timestamp": time.time()})

# Main loop: GPS every 5s, NFC every 30s. Offline batch sent on reconnect.
```

---

### 5.7 Integration Demo Goals

1. Driver starts trip → GPS simulator runs → bus marker moves on Parent Dashboard
2. NFC scan → unknown tag → "Unrecognized ID"; wrong bus → "Not on this route"
3. All students board → `ALL_BOARDED` event → driver notified
4. Bus within 500m (2 pings) → `APPROACHING` notification to parent
5. GPS loss → stale indicator shown; bus off-route → deviation flag on Admin Dashboard
6. Parent views route → stop-specific ETA + student count; delay warning if >5 min late

---

### ✅ Sprint 3 — Expected Output (End of Week 6)

**Screens that must be working:**

| Screen | URL | Who Sees It |
|--------|-----|-------------|
| Parent Dashboard (live) | `/parent` | Parent |
| Driver Dashboard (live) | `/driver` | Driver |
| Admin Dashboard (live) | `/admin` | School Admin |

**UI Layout — Parent Dashboard:**
```
┌──────────────────────────────────────────────────────┐
│  🚌 School Bus Tracker        [Sara] [🔔] [Logout]   │
│  ─────────────────────────────────────────────────── │
│  ┌───────────────────────────────────────────────┐   │
│  │               [Google Maps]                   │   │
│  │   🚌 ──────────────────────► [Stop 1] [Stop 2]│   │
│  │   Bus BUS-001  •  Speed: 42 km/h              │   │
│  └───────────────────────────────────────────────┘   │
│  ─────────────────────────────────────────────────── │
│  Khalid Al-Otaibi       Status: 🟢 Onboard           │
│  ─────────────────────────────────────────────────── │
│  ETA to Your Stop:     ~8 min   (Stop 1 — Al Nakheel)│
│  Next stop:            ~14 min  (Stop 2 — Al Wurud)  │
│  ─────────────────────────────────────────────────── │
│  ╔═══════════════════════════════════════════════╗   │
│  ║ 🔔 Bus BUS-001 is approaching your stop (~3 min)║  │
│  ╚═══════════════════════════════════════════════╝   │
└──────────────────────────────────────────────────────┘
```

**UI Layout — Driver Dashboard:**
```
┌──────────────────────────────────────────────────────┐
│  🚌 Driver Panel — BUS-001        [Ahmed] [Logout]   │
│  ─────────────────────────────────────────────────── │
│  [ 🚨 START TRIP ]   Route: North District           │
│  ─────────────────────────────────────────────────── │
│  Students On Board (8 / 12):                         │
│  ✅ Khalid Al-Otaibi    — Onboard  07:15             │
│  ✅ Sara Al-Mutairi     — Onboard  07:18             │
│  ⏳ Omar Al-Zahrani     — Waiting                    │
│  ─────────────────────────────────────────────────── │
│  ⚠ Missing: Omar Al-Zahrani has not boarded yet      │
│  ─────────────────────────────────────────────────── │
│  [ 🆘 EMERGENCY ALERT ]                              │
└──────────────────────────────────────────────────────┘
```

**Functional capabilities confirmed at Sprint 3 end:**

- ✅ GPS pings from a Pi map correctly to the assigned `schoolId` room.
- ✅ A School Admin from School A cannot see Socket.IO events for School B's buses.
- ✅ NFC taps correctly boarding/exiting students logged directly to their linked school.
- ✅ Parent ETAs and geofencing notifications work robustly.
- ✅ Stale GPS: marker dims and "Data Last Updated: HH:MM" banner appears.
- ✅ Route deviation: admin sees red flag on fleet map after 2 off-route pings.
- ✅ Parent can mute/unmute notifications per route from settings panel.

---

## 6. Sprint 4 — Reporting, Emergency Alerts & Final Testing (Weeks 7–8)

**Use Cases:** UC-11 (Generate Reports) · UC-12 (Emergency Alert) · UC-13 (Edit Profile)

---

### 6.1 Frontend Tasks (React)

| Task ID | Description | UC |
|---------|-------------|-----|
| FE-S4-1 | `ReportsPage` — Generates PDF/Excel based on `schoolId` data only. Downloaded on-the-fly directly to browser. | UC-11 |
| FE-S4-2 | Format selector (PDF/Excel) + download button (blob response) | UC-11 |
| FE-S4-3 | `ReportHistory` table — Log of report requests (Metadata audit only, no file storage links). | UC-11 |
| FE-S4-4 | Data visualization charts — attendance trend (bar), boarding per bus (pie) using `recharts` | UC-11 |
| FE-S4-5 | Emergency Alert button on `DriverDashboard` — large, red, opens confirm dialog | UC-12 |
| FE-S4-6 | `EmergencyConfirmModal` — two-step confirm; cancel returns to main screen | UC-12 |
| FE-S4-7 | `EmergencyAlertBanner` — full-screen urgent overlay on Parent + Admin dashboards | UC-12 |
| FE-S4-8 | `EditProfileForm` — Update personal info, reset passwords. | UC-13 |

---

### 6.2 Backend Tasks (Node.js)

| Task ID | Description | UC |
|---------|-------------|-----|
| BE-S4-1 | `Report` Mongoose model — Audit log only: adminId, parameters, format, recordCount, generatedAt (NO `filePath`). | UC-11 |
| BE-S4-2 | `POST /api/reports/generate` — Aggregates data bound to `req.user.schoolId` and streams PDF/Excel on-the-fly to prevent ephemeral storage wipe. | UC-11 |
| BE-S4-3 | `GET /api/reports` — list school admin's generated reports | UC-11 |
| BE-S4-4 | `POST /api/emergency/alert` — verify driver + active trip; broadcast EMERGENCY event strictly to the specific `school:{schoolId}:admin` room and to specific parents. | UC-12 |
| BE-S4-5 | `PATCH /api/users/me` — validate; update; `passwordChanged: true` flag forces re-login | UC-13 |
| BE-S4-6 | DB error handler — log + `503 DB_ERROR` with retry prompt | UC-13 |

---

### 6.3 API Contracts

#### `POST /api/reports/generate`

```json
// Request
{ "dateFrom": "2026-02-01", "dateTo": "2026-02-19", "busId": "64f1...", "studentId": null, "format": "pdf" }

// Success 200 (Streamed Response)
// Content-Type: application/pdf
// Content-Disposition: attachment; filename="report_2026-03-19.pdf"
// (File streams directly to client memory, avoiding server file storage)

// Error — No data
{ "success": false, "errorCode": "NO_DATA", "message": "No sufficient data available to generate report" }
```

#### `POST /api/emergency/alert`

```json
// Request
{ "tripId": "64f1...", "message": "Medical emergency on board" }

// Success 200
{ "success": true, "message": "Emergency alert broadcast to 14 parents and admin", "alertId": "...", "broadcastedAt": "..." }
```

---

### 6.4 Integration Demo Goals

1. Admin generates PDF report → downloads → opens with correct data
2. Select date range with no data → "No sufficient data" message
3. Driver triggers emergency → confirm dialog → broadcast → parent sees full-screen banner
4. Driver cancels emergency → no alert sent
5. User edits profile → password change → forced re-login
6. Invalid email format → field highlighted; cross-user URL → Access Denied

---

### ✅ Sprint 4 — Expected Output (End of Week 8)

**Screens that must be working:**

| Screen | URL | Who Sees It |
|--------|-----|-------------|
| Reports Page | `/admin/reports` | School Admin |
| Edit Profile | `/profile/edit` | Admin, Driver, Parent |
| Emergency Banner (overlay) | All screens | Parent, School Admin |

**UI Layout — Reports Page:**
```
┌──────────────────────────────────────────────────────┐
│  📊 Generate Report                                  │
│  ─────────────────────────────────────────────────── │
│  From: [2026-02-01]  To: [2026-02-19]               │
│  Bus:  [BUS-001 ▼]   Student: [All ▼]               │
│  Format: ( ) PDF  (•) Excel                          │
│                    [ Generate Report ]               │
│  ─────────────────────────────────────────────────── │
│  📈 Attendance Trend (Bar Chart — last 7 days)       │
│  🥧 Boarding by Bus (Pie Chart)                      │
│  ─────────────────────────────────────────────────── │
│  Report History:                                     │
│  2026-02-19  BUS-001  PDF  87 records  [⬇ Download] │
│  2026-02-15  All      XLS  210 records [⬇ Download] │
└──────────────────────────────────────────────────────┘
```

**UI Layout — Emergency Alert Flow:**
```
┌──────────────────────────────────────────────────────┐  ← Driver screen
│  [ 🆘 EMERGENCY ALERT ]  ← red button, always visible│
│  ┌────────────────────────────────────────────────┐  │
│  │  ⚠ Confirm Emergency?                         │  │
│  │  This will alert all parents and admin         │  │
│  │  immediately.                                  │  │
│  │  [ CONFIRM ]          [ CANCEL ]               │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐  ← Parent/Admin screen
│ 🚨🚨🚨  EMERGENCY ALERT  🚨🚨🚨                      │
│  ─────────────────────────────────────────────────── │
│  Bus BUS-001 has reported an emergency.              │
│  Driver: Ahmed Al-Rashidi  •  07:45 AM               │
│  Route: North District                               │
│                            [ I Have Read This ✓ ]    │
└──────────────────────────────────────────────────────┘
```

**UI Layout — Edit Profile:**
```
┌──────────────────────────────────────────────────────┐
│  Edit Profile                                        │
│  ─────────────────────────────────────────────────── │
│  Name:  [Ahmed Al-Rashidi           ]                │
│  Email: [ahmed@school.sa            ] ⚠ invalid      │
│  Phone: [+966501234567              ]                │
│  ─────────────────────────────────────────────────── │
│  Change Password (optional):                         │
│  Current Password: [_______________]                 │
│  New Password:     [_______________]  (min 8 chars)  │
│  ─────────────────────────────────────────────────── │
│              [ Save Changes ]                        │
└──────────────────────────────────────────────────────┘
```

**Functional capabilities confirmed at Sprint 4 end:**

- ✅ School Admin generates PDF and Excel reports that *only* contain data for their school.
- ✅ Emergency alerts fired by a driver only notify *that specific school's* admin and the parents of students on *that specific bus*.
- ✅ Full cross-tenant penetration testing guarantees no data leaks.
- ✅ Cancelled emergency leaves no trace in the system.
- ✅ All users can edit their own profile (name, email, phone).
- ✅ Password change forces re-login with clear toast message.

---

## 7. Database Schemas (Multi-Tenant Updates)

### 7.1 School Model (NEW)

```javascript
// models/School.js
{
  name:      { type: String, required: true },
  schoolId:  { type: String, required: true, unique: true }, // e.g., "SCH-9921"
  contact:   { phone: String, email: String },
  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}
```

### 7.2 User Model (Updated)

```javascript
// models/User.js
{
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  name:     { type: String, required: true },
  role:     { type: String, enum: ['superadmin', 'schooladmin', 'driver', 'parent'], required: true },
  school:   { type: ObjectId, ref: 'School', required: function() { return this.role !== 'superadmin'; } }, // Nullable only for SuperAdmin
  phone:    { type: String },
  isActive: { type: Boolean, default: true }
}
```

### 7.3 Student Model

```javascript
// models/Student.js
{
  name:             { type: String, required: true },
  studentId:        { type: String, required: true, unique: true },
  school:           { type: ObjectId, ref: 'School', required: true },
  parentAccessCode: { type: String, required: true }, // Auto-generated string (e.g., 'X9K-2M1')
  parentId:         { type: ObjectId, ref: 'User', index: true, sparse: true, default: null }, // 1-to-Many mapping (Parents can have multiple children)
  grade:            { type: String },
  nfcTagId:         { type: String, unique: true, sparse: true },
  assignedBus:      { type: ObjectId, ref: 'Bus', default: null }
}
```

### 7.4 Route Model

```javascript
// models/Route.js
{
  school:            { type: ObjectId, ref: 'School', required: true, index: true },
  name:              { type: String, required: true },
  waypoints:         [{ lat: Number, lng: Number, label: String }],
  driver:            { type: ObjectId, ref: 'User' },
  estimatedDuration: { type: Number },
  isActive:          { type: Boolean, default: true }
}
```

### 7.5 Bus Model

```javascript
// models/Bus.js
{
  school:   { type: ObjectId, ref: 'School', required: true, index: true },
  busId:    { type: String, required: true, unique: true, uppercase: true },
  capacity: { type: Number, required: true, min: 1, max: 100 },
  route:    { type: ObjectId, ref: 'Route', default: null },
  driver:   { type: ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true }
}
```

### 7.6 Attendance Model

```javascript
// models/Attendance.js
{
  school:     { type: ObjectId, ref: 'School', required: true, index: true },
  student:    { type: ObjectId, ref: 'Student', required: true },
  bus:        { type: ObjectId, ref: 'Bus', required: true },
  trip:       { type: ObjectId, ref: 'Trip' },
  event:      { type: String, enum: ['boarding', 'exit'], required: true },
  timestamp:  { type: Date, default: Date.now },
  recordedBy: { type: String, enum: ['NFC', 'manual'], default: 'NFC' }
}
```

### 7.7 Trip Model

```javascript
// models/Trip.js
{
  school:    { type: ObjectId, ref: 'School', required: true, index: true },
  bus:       { type: ObjectId, ref: 'Bus', required: true },
  route:     { type: ObjectId, ref: 'Route', required: true },
  driver:    { type: ObjectId, ref: 'User', required: true },
  status:    { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  startedAt: { type: Date },
  endedAt:   { type: Date },
  stopLog:   [{ stopLabel: String, arrivedAt: Date, lat: Number, lng: Number }]
}
```

### 7.8 LocationLog Model

```javascript
// models/LocationLog.js
{
  school:    { type: ObjectId, ref: 'School', required: true, index: true },
  bus:       { type: ObjectId, ref: 'Bus', required: true },
  trip:      { type: ObjectId, ref: 'Trip' },
  lat:       { type: Number, required: true },
  lng:       { type: Number, required: true },
  speed:     { type: Number },
  isStale:   { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now, index: { expireAfterSeconds: 86400 } }  // TTL 24h
}
```

### 7.9 Report Model

```javascript
// models/Report.js
{
  school:      { type: ObjectId, ref: 'School', required: true, index: true },
  admin:       { type: ObjectId, ref: 'User', required: true },
  parameters:  { dateFrom: Date, dateTo: Date, busId: ObjectId, studentId: ObjectId },
  format:      { type: String, enum: ['pdf', 'excel'] },
  // filePath removed to support on-the-fly generation against ephemeral storage
  recordCount: { type: Number },
  generatedAt: { type: Date, default: Date.now }
}
```

---

## 8. Security Checklist

| # | Item | Implementation |
|---|------|---------------|
| SEC-1 | HTTPS enforced | TLS on deployment; HTTP → HTTPS redirect |
| SEC-2 | Password hashing | bcryptjs, salt rounds ≥ 10 |
| SEC-3 | JWT expiry | 24h; auto-logout on 401 |
| SEC-4 | Role-based access control | `roleMiddleware` on all protected routes |
| SEC-5 | Own-profile-only edit | `req.user.id` check on `PATCH /api/users/me` |
| SEC-6 | IoT device auth | `X-Device-Token` header on `/api/iot/*` |
| SEC-7 | Input sanitization | `express-validator` on all POST/PATCH |
| SEC-8 | Rate limiting | `express-rate-limit` on `/api/auth/*` (10 req/min) |
| SEC-9 | CORS policy | Whitelist FE origin only in production |
| SEC-10 | Sensitive field exclusion | `password: { select: false }` in User schema |
| SEC-11 | Emergency guard | Requires active trip + driver identity |
| SEC-12 | Report access control | Admin downloads own reports only |
| SEC-13 | **Data Segregation (Multi-Tenancy)** | Enforced at the Mongoose query level using `req.user.school`. |
| SEC-14 | **Secure Multi-Child Linking** | `Student.parentId` links strictly via Code, allowing 1-to-many from Parent. |
| SEC-15 | **Secure Parent Registration** | Registration strictly requires both `studentId` AND `parentAccessCode`. |

---

## 9. Deployment Strategy

**Recommended Stack:** Firebase Hosting (FE) · Railway (BE) · MongoDB Atlas (DB)

```
Frontend (React)     Backend (Node.js)    Database
Firebase Hosting ──► Railway.app     ──► MongoDB Atlas
• Free SSL/CDN       • GitHub deploy      • Free 512MB
• SPA routing        • Env vars panel     • Auto backups
```

**Key Environment Variables:**

```env
# Backend
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-strong-secret
GOOGLE_MAPS_API_KEY=...
DEVICE_TOKEN=iot-shared-secret
GEOFENCE_RADIUS_M=500

# Frontend (.env.production)
REACT_APP_API_URL=https://your-railway-app.up.railway.app
REACT_APP_GOOGLE_MAPS_KEY=...
REACT_APP_SOCKET_URL=https://your-railway-app.up.railway.app
```

---

## 10. Performance Targets

| Metric | Target |
|--------|--------|
| Login response | < 2 seconds |
| Map initial load | < 5 seconds |
| GPS marker update | < 3 seconds after Pi ping |
| Socket.IO notification | < 1 second after NFC scan |
| Report generation (PDF, 30 days) | < 10 seconds |
| API responses (p95) | < 500ms |

---

*End of Master Project Plan — Version 2.0 (English Version)*