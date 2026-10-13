# 🎓 CampusOne (formerly Classora)

> **The Next-Generation Smart Academic Management & Attendance Intelligence Platform for Students, Faculty, HODs, and Principals.**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-classora--tau.vercel.app-indigo?style=for-the-badge&logo=vercel)](https://classora-tau.vercel.app)

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

🔗 **Live Web Application**: [https://classora-tau.vercel.app](https://classora-tau.vercel.app)

---

## 💡 Why I Built This

College students and faculty frequently struggle with opaque attendance rules, last-minute eligibility panics, and fragmented academic schedules. **CampusOne** was created to eliminate guesswork by providing automated 75%/85% attendance criteria tracking, real-time "Can I Skip?" calculators, and a unified platform for students, faculty, department heads, and institute administrators to manage academic life effortlessly.

---

## 🌟 Overview

**CampusOne** is a high-performance, offline-first Progressive Web Application (PWA) built to streamline academic operations, attendance tracking, timetable management, and departmental analytics across higher education institutions.

Built with modern web technologies, **CampusOne** bridges the gap between students, educators, department heads, and institute principals through role-tailored dashboards, automated attendance calculations, and real-time schedule insights.

---

## 📸 Screenshots

> *Captures highlighting key interface components across all 4 system roles.*

| 🎓 Student Home & Schedule | 👨‍🏫 Faculty Attendance Portal |
| :---: | :---: |
| ![Student Home](docs/screenshots/student-home.png) | ![Faculty Attendance](docs/screenshots/faculty-attendance.png) |
| *Real-time lecture timeline & attendance target tracking* | *Digital roster roll call & period schedule* |

| 🏛️ HOD Department Analytics | 👑 Principal Admin Panel |
| :---: | :---: |
| ![HOD Analytics](docs/screenshots/hod-analytics.png) | ![Admin Panel](docs/screenshots/admin-panel.png) |
| *Departmental health trends & section metrics* | *Institute-wide controls & system settings* |

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
│ - Timetable   │  │ - Class List  │       │ - Dept Stats  │  │ - Analytics   │
│ - Can I Skip? │  │ - Mark Roll   │       │ - Analytics   │  │ - Management  │
│ - Attendance  │  │ - Timetable   │       │ - Trends      │  │ - Settings    │
└───────────────┘  └───────────────┘       └───────────────┘  └───────────────┘
```

### 🎓 1. Student Portal
* **Interactive Daily Schedule**: Real-time timeline showing ongoing, upcoming, and completed lectures.
* **"Can I Skip?" Calculator**: Instant calculation of how many classes a student can safely skip while staying above mandatory thresholds (75% / 85%).
* **Leave Impact Simulator**: Predict how missing upcoming dates will affect overall attendance percentages per subject.
* **USN Identification**: USN lookup system (e.g., `4PM25XX000`) with automatic section and roster matching.

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
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   *(For local offline mode with IndexedDB, default settings in `.env.local` work out of the box).*

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
| `npm run preview` | Locally preview compiled production build |
| `npm run typecheck` | Run standalone TypeScript type checking (`tsc -b`) |
| `npm run test` | Run Vitest unit & integration test suite |
| `npm run test:watch` | Run Vitest in interactive watch mode |
| `npm run test:ui` | Open Vitest visual UI runner |
| `npm run lint` | Run ESLint check across all codebase files |
| `npm run format` | Auto-format codebase using Prettier |

---

## 📂 Project Structure

```text
Classora/
├── docs/                      # Documentation & screenshot assets
│   └── screenshots/           # UI screenshots for README
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

## 🗺️ Roadmap & Future Improvements

- [ ] **AI-Powered OCR Timetable Scanning**: Enhance PDF & image extraction using multimodal LLMs to auto-generate schedules from raw university notice boards.
- [ ] **Automated Push Notifications**: Web Push integration for smart morning schedule alerts and attendance threshold warnings.
- [ ] **Multi-College Multi-Tenant Architecture**: Support for custom university regulations, grading schemes, and multi-campus configurations.
- [ ] **Parental Attendance Reports**: Automated periodic email & SMS summaries for parents and guardians.

---

## 👤 Author

**Devendra Sankhla**
* **GitHub**: [@devendrasankhla01](https://github.com/devendrasankhla01)
* **LinkedIn**: [Devendra Sankhla](https://linkedin.com/in/devendrasankhla)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
