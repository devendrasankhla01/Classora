# 🎓 CampusOne (formerly Classora)

> **The Next-Generation Smart Academic Management & Attendance Intelligence Platform for Students, Faculty, HODs, and Principals.**

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

---

## 🌟 Overview

**CampusOne** is a high-performance, offline-first Progressive Web Application (PWA) designed to streamline academic operations, attendance tracking, timetable management, and departmental analytics across higher education institutions.

Built with modern web technologies, **CampusOne** bridges the gap between students, educators, department heads, and institute principals through role-tailored dashboards, automated attendance calculations, and real-time schedule insights.

---

## ✨ Key Features & Multi-Role Dashboards

CampusOne provides dedicated, secure portals for all institution stakeholders:

```
                  ┌─────────────────────────────────────────┐
                  │          CampusOne Auth Portal          │
                  └────────────────────┬────────────────────┘
                                       │
        ┌──────────────────┬───────────┴───────────┬──────────────────┐
        ▼                  ▼                       ▼                  ▼
┌───────────────┐  ┌───────────────┐       ┌───────────────┐  ┌───────────────┐
│ 🎓 Student    │  │ 👨‍🏫 Faculty    │       │ 🏛️ HOD        │  │ 👑 Principal  │
│ - Timetable   │  │ - Class List  │       │ - Dept Stats  │  │ - Admin Panel │
│ - Can I Skip? │  │ - Mark Roll   │       │ - Analytics   │  │ - Management  │
│ - Attendance  │  │ - Timetable   │       │ - Trends      │  │ - Settings    │
└───────────────┘  └───────────────┘       └───────────────┘  └───────────────┘
```

### 🎓 1. Student Portal
* **Interactive Daily Schedule**: Real-time timeline showing ongoing, upcoming, and completed lectures.
* **"Can I Skip?" Calculator**: Instant calculation of how many classes a student can safely skip while staying above mandatory thresholds (75% / 85%).
* **Leave Impact Simulator**: Predict how missing upcoming dates will affect overall attendance percentages per subject.
* **USN Identification**: USN lookup system (e.g., `4PM25CS001`) with automatic section and roster matching.

### 👨‍🏫 2. Faculty Portal
* **Daily Teaching Schedule**: Streamlined overview of daily assigned periods, laboratories, and lecture halls.
* **Quick Attendance Roll**: Fast digital attendance marking with batch log history.
* **Period Breakdown**: Clear display of double blocks, lab sessions, and assigned course codes.

### 🏛️ 3. HOD (Head of Department) Portal
* **Departmental Analytics**: High-level visual metrics on overall student attendance, subject health, and risk alerts.
* **Batch & Section Performance**: Comparative graphs for tracking attendance distribution across branches and semesters.
* **Faculty Allocation Overview**: View active course allocations and lecture coverage.

### 👑 4. Principal & Admin Control Panel (`/admin`)
* **Institute-Wide Dashboard**: Full administrative oversight of overall college performance and enrollment.
* **Section & Department Management**: Tools for adding, editing, and managing branches, classes, and academic calendars.
* **System Policy Controls**: Configure institute-wide attendance requirements, notification rules, and system backups.

---

## 🚀 Tech Stack & Architecture

### **Frontend & State Management**
* **Framework**: React 18 with TypeScript
* **Build Tool**: Vite 5
* **Routing**: React Router DOM v6
* **State Management**: Zustand & React Query (`@tanstack/react-query`)
* **Styling & Icons**: Tailwind CSS, Plus Jakarta Sans font, Material Symbols Rounded

### **Data & Storage**
* **Local Data**: Dexie.js (IndexedDB) for offline-first persistent storage
* **Cloud Sync**: Supabase Client (`@supabase/supabase-js`)
* **Offline PWA**: `vite-plugin-pwa` with Service Worker caching

### **Testing & Code Quality**
* **Test Runner**: Vitest with `@testing-library/react` and JSDOM
* **Linter & Formatter**: ESLint, Prettier
* **Type Checking**: TypeScript Strict Mode

---

## 🛠️ Getting Started

### Prerequisites
* **Node.js**: `v20.0.0` or higher
* **npm**: `v9.0.0` or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/devendrasankhla01/Classora.git
   cd Classora
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Launch Vite development server |
| `npm run build` | Run TypeScript type check and compile production bundle |
| `npm run preview` | Locally preview the compiled production build |
| `npm run typecheck` | Run standalone TypeScript type checking (`tsc -b`) |
| `npm run test` | Run Vitest unit & integration test suite once |
| `npm run test:watch` | Run Vitest in interactive watch mode |
| `npm run test:ui` | Open Vitest visual UI runner |
| `npm run lint` | Run ESLint check across all codebase files |
| `npm run format` | Auto-format codebase using Prettier |

---

## 📂 Project Structure

```text
Classora/
├── public/                    # Static assets, PWA icons, branding logos
│   ├── branding/              # CampusOne logos and mark assets
│   └── icons/                 # PWA & favicon icons
├── src/
│   ├── app/                   # App routes, shell layout, Zustand store, smoke tests
│   ├── components/            # Reusable UI controls, modals, layout headers, date strips
│   ├── data/                  # Mock data, preset rosters, timetable definitions
│   ├── features/              # Feature modules:
│   │   ├── admin/             # Principal & Admin Dashboard
│   │   ├── analytics/         # HOD Departmental Analytics
│   │   ├── attendance/        # Attendance tracker, review screens
│   │   ├── auth/              # Multi-role Login Portal (Student, Faculty, HOD, Principal)
│   │   ├── home/              # Student Home Dashboard & Smart Insights
│   │   ├── onboarding/        # CampusOne Onboarding Experience
│   │   ├── profile/           # User Settings, Data Export, Calendar
│   │   ├── shared/            # Shared timeline components
│   │   └── timetable/         # Timetable grid, USN import, versioning
│   ├── hooks/                 # Custom React hooks (schedule data, navigation)
│   ├── lib/                   # Attendance logic, notification handlers, date helpers
│   ├── services/              # Local (Dexie IndexedDB) & Cloud (Supabase) data layer
│   └── styles/                # Global CSS, Tailwind setup, design tokens
├── scripts/                   # PWA icon generator scripts
├── vite.config.ts             # Vite configuration & PWA setup
├── tailwind.config.js         # Tailwind theme customizations
└── package.json               # Dependencies & build scripts
```

---

## 🧪 Testing

The repository includes comprehensive smoke and unit test suites covering attendance calculations, schedule resolvers, onboarding flows, and screen rendering:

```bash
# Run all unit and smoke tests
npm run test
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p center="text-center">
  Crafted with ❤️ for <b>CampusOne</b>
</p>
