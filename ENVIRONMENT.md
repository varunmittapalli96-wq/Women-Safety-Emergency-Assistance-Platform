# bSafe Environment & Package Directory

This document details all environment files, libraries, and packages configured for the **bSafe — Women Safety & Emergency Assistance Platform**.

---

## 1. Environment Files Directory

| File Location | Scope | Description |
| :--- | :--- | :--- |
| [`.env`](file:///.env) | Root / Master | Master local environment file storing all configuration keys for both backend and frontend. |
| [`.env.example`](file:///.env.example) | Root / Master | Master template containing all environment variables, documentation, and defaults. |
| [`backend/.env`](file:///backend/.env) | Backend | Active backend environment file used by Express server, Mongoose, JWT, and Socket.IO. |
| [`backend/.env.example`](file:///backend/.env.example) | Backend | Backend environment template documenting all server secrets and database credentials. |
| [`frontend/.env.local`](file:///frontend/.env.local) | Frontend | Active Next.js environment file used by Firebase Client SDK and Leaflet map components. |
| [`frontend/.env.local.example`](file:///frontend/.env.local.example) | Frontend | Frontend environment template documenting all public keys and API endpoints. |
| [`environment.json`](file:///environment.json) | Project-wide | Machine-readable JSON catalogue of all libraries, packages, versions, and variable schemas. |

---

## 2. Backend Libraries & Packages

Configured in [`backend/package.json`](file:///backend/package.json):

| Package Name | Version | Role in Platform | Environment Variable Dependencies |
| :--- | :--- | :--- | :--- |
| **`express`** | `^4.21.0` | Core HTTP web framework for REST API endpoints (`/api/auth`, `/api/alerts`, `/api/contacts`, etc.) | `PORT`, `NODE_ENV` |
| **`mongoose`** | `^8.7.0` | MongoDB Object Data Modeling (ODM) with `2dsphere` geospatial indices for emergency radius queries | `MONGODB_URI` |
| **`jsonwebtoken`** | `^9.0.2` | Issues and cryptographically verifies application session JWT tokens | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| **`bcryptjs`** | `^2.4.3` | One-way password hashing with salt generation for secure user authentication | None |
| **`socket.io`** | `^4.8.3` | Real-time WebSocket server for instantaneous emergency SOS broadcasts and GPS tracking | `FRONTEND_URL` |
| **`google-auth-library`** | `^11.1.0` | Google OAuth2 and ID token verification library | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **`cors`** | `^2.8.5` | Configures authorized cross-origin requests between frontend (Port 3000) and backend (Port 5000) | `FRONTEND_URL` |
| **`helmet`** | `^8.3.0` | Sets secure HTTP headers, including Cross-Origin-Opener-Policy for OAuth popups | None |
| **`express-rate-limit`** | `^8.7.0` | Protects authentication routes from brute force attacks (100 req/15 min) | None |
| **`dotenv`** | `^16.4.5` | Loads configuration from `.env` into `process.env` at startup | None |
| **`nodemon`** | `^3.1.7` | Development hot-reloading tool that restarts the server upon file changes | None |

---

## 3. Frontend Libraries & Packages

Configured in [`frontend/package.json`](file:///frontend/package.json):

| Package Name | Version | Role in Platform | Environment Variable Dependencies |
| :--- | :--- | :--- | :--- |
| **`next`** | `^14.2.15` | Next.js 14 React framework with App Router, server-side rendering, and API routes | None |
| **`react`** & **`react-dom`** | `^18.3.1` | Core declarative UI component library | None |
| **`firebase`** | `^12.19.0` | Firebase Client SDK for "Continue with Google" popup authentication and telemetry | `NEXT_PUBLIC_FIREBASE_*` (7 keys) |
| **`socket.io-client`** | `^4.8.3` | Real-time WebSocket client for live SOS alert tracking and responder coordination | `NEXT_PUBLIC_API_URL` |
| **`leaflet`** & **`react-leaflet`** | `^1.9.4` / `^4.2.1` | Interactive Leaflet maps rendering emergency locations and nearby safe resources | None |
| **`lucide-react`** | `^0.454.0` | Icon system used across dashboards, status badges, and emergency navigation | None |
| **`tailwindcss`** | `^3.4.14` | Utility-first CSS framework for responsive dark glassmorphism styling | None |
| **`typescript`** | `^5.6.3` | Static type checking enforcing interface contracts and preventing runtime bugs | None |

---

## 4. Quick Setup & Run Commands

### Installation
Install all dependencies for both backend and frontend in one command from the project root:
```bash
npm run install:all
```

### Starting Development Servers
Start both servers:
```bash
# Terminal 1: Backend (Port 5000)
npm run dev:backend

# Terminal 2: Frontend (Port 3000)
npm run dev:frontend
```

### Seeding Demo Data
To populate sample verified volunteers, safe zones, emergency contacts, and mock alerts:
```bash
npm run seed
```
