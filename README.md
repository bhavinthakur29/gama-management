# GAMA Management System 🥋
**Ganesha Academy of Martial Arts - Backend Engine**

A robust, multi-tenant management system designed for scale across multiple martial arts branches. Built with **Bun**, **Express**, and **Supabase**.

---

## 🌟 Core Features
* **Multi-Tenant Architecture:** Complete data isolation between branches. GAMA North cannot see GAMA South data.
* **Three-Tier Authentication:**
    * **Super Admin:** Full system control, branch creation, and account recovery.
    * **Academy Account:** Persistent branch-level login for tablets/desktops.
    * **Instructor PINs:** Quick, 4-digit shift-based access for staff.
* **IST Timezone Locked:** All attendance and financial records are strictly synchronized to **Asia/Kolkata** (Indian Standard Time).
* **Data Integrity:** Includes "Soft Deletes" for students and rate-limiting/lockouts for security.

## 🛠️ Tech Stack
* **Runtime:** Bun
* **Framework:** Express.js (TypeScript)
* **Database:** PostgreSQL (via Supabase)
* **Security:** JWT + BcryptJS

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Bun](https://bun.sh) installed.

### 2. Environment Setup
Create a `.env` file in the root:
```env
PORT=5000
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Installation
```
bun install
```

### 4. Running the Engine
```
bun run dev
```

----
*Built for Ganesha Academy of Martial Arts © 2026*

----