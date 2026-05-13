# School Bus Tracking System (SBTS)

A comprehensive, real-time, bilingual (English/Arabic) web application designed to manage, route, and track school buses. The system connects School Administrators, Bus Drivers, Parents, and System Administrators (Super Admins) into a unified platform to ensure the safety and efficiency of student transportation.

## 🌟 Key Features

### 👨‍💼 For School Administrators
- **Fleet & Bus Management:** Add, update, and manage buses and drivers. Automatically assign students to buses based on location and capacity.
- **Smart Route Management:** Visually draw and manage smart routes on a map. The system utilizes OSRM (Open Source Routing Machine) to calculate the most optimal path.
- **Student Management:** Bulk import students via CSV, manage parent links, and handle student data.
- **Live Fleet Tracking:** Monitor all active buses in real-time on a centralized map.
- **Attendance Records:** View detailed logs of student boarding, drop-offs, absences, and generate PDF reports.
- **Emergency Contacts:** Manage emergency contact numbers that drivers can instantly access.

### 🚌 For Drivers
- **Interactive Dashboard:** Step-by-step guidance for morning (to school) and afternoon (to home) trips.
- **Smart Navigation:** Built-in map with an optimized OSRM route for picking up and dropping off students.
- **Digital Attendance:** Easily mark students as Boarded, Absent, Dropped Off, or "No Receiver". 
- **Offline/Local Resilience:** Capable of continuing the trip locally if backend connectivity drops.
- **Emergency Access:** Quick-dial buttons for 911, school administration, and parent contacts.

### 👨‍👩‍👧‍👦 For Parents
- **Real-Time Tracking:** Live map view of the bus location when the trip is active.
- **Live ETA:** Real-time estimates of when the bus will reach the student's stop.
- **Secure Onboarding:** Secure 2-step OTP verification using National ID and Date of Birth to link students to parent accounts.
- **Instant Notifications:** Receive alerts when the bus is approaching, when the student boards, and when they are dropped off.

### 👑 For Super Admins
- **School Onboarding:** Generate secure, time-limited invitation links for new schools to register their administrators.
- **System Overview:** View high-level metrics (total schools, total buses, total students) across the entire platform.

---

## 🛠️ Technology Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose)
- **Real-time:** Socket.io
- **Security & Auth:** JWT, bcryptjs, helmet
- **Utilities:** multer (uploads), csv-parser, nodemailer, puppeteer (PDF generation)

### Frontend
- **Framework:** React 18 (Vite)
- **Routing:** React Router DOM
- **Styling:** Tailwind CSS & Vanilla CSS
- **Maps:** Leaflet & React-Leaflet
- **Icons:** Lucide React
- **Localization:** i18next & react-i18next (English & Arabic)
- **HTTP Client:** Axios
- **Real-time:** Socket.io-client

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas)
- Git

### 1. Backend Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root directory (use `.env.example` as a template) and add your environment variables:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   # Add other required environment variables (e.g., Email SMTP for OTPs)
   ```
3. (Optional) Seed the database with demo data:
   ```bash
   npm run seed-demo
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173` (or the port specified by Vite).

---

## 🌍 Localization (i18n)
The system is fully bilingual. The UI automatically adjusts to RTL (Right-to-Left) when Arabic is selected.
Translation files are located at:
- `frontend/public/locales/en/translation.json`
- `frontend/public/locales/ar/translation.json`

## 🗺️ Maps & Routing
The platform heavily relies on map interfaces. 
- Map tiles are served via OpenStreetMap.
- Optimal route calculation (solving the Traveling Salesperson Problem for bus routes) is handled by making API calls to the **OSRM (Open Source Routing Machine)** public API. 

## 🔐 Security & Access Control
The API utilizes Role-Based Access Control (RBAC). A custom middleware ensures that routes are strictly protected and only accessible by authorized roles (`superadmin`, `schooladmin`, `driver`, `parent`).
