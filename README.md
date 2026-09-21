# bSafe — Women Safety & Emergency Assistance Platform

A comprehensive, full-stack web-based safety platform designed to help women instantly request emergency assistance from nearby verified volunteers, support teams, and authorities during unsafe situations.

## 🛡️ Features

### For Women (Users)
- **One-Click SOS Button** — Trigger emergency alerts instantly with GPS location
- **Live Location Sharing** — Real-time location shared with responders & contacts
- **Emergency Contacts** — Manage trusted contacts who are notified during alerts
- **Safety Profile** — Blood group, medical conditions, emergency notes
- **Nearby Safe Zones** — View police stations, hospitals, safe houses nearby
- **Alert History** — Complete history of past emergency alerts

### For Volunteers
- **Nearby Alerts** — Receive emergency alerts from women nearby
- **Accept/Decline** — Respond to alerts and navigate to help
- **Availability Toggle** — Go online/offline
- **Response Statistics** — Track total assists, rating, and success rate
- **Profile Management** — Update skills, organization, and bio

### For Admins
- **KPI Dashboard** — Total users, alerts, volunteers, response stats
- **Volunteer Verification** — Verify or reject volunteer registrations
- **Alert Management** — Monitor and resolve all alerts
- **User Management** — View all registered users
- **Safety Zone CRUD** — Manage safe zones (police, hospitals, safe houses)

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS 3 |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Icons | Lucide React |
| Font | Inter (Google Fonts) |

## 📁 Project Structure

```
├── backend/
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/auth.js     # JWT auth + role-based access
│   ├── models/                # User, Alert, EmergencyContact, SafetyZone
│   ├── routes/                # auth, alerts, contacts, volunteers, admin, safetyZones
│   ├── utils/seed.js          # Demo data seeder
│   └── server.js              # Express entry point
├── frontend/
│   ├── app/                   # Next.js App Router pages
│   │   ├── dashboard/         # Role-based dashboards (user, volunteer, admin)
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   └── page.tsx           # Landing page
│   ├── components/            # Reusable UI components
│   └── lib/                   # API client, auth context
```

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run seed    # Seed demo data
npm run dev     # Start on port 5000
```

### Frontend Setup
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev     # Start on port 3000
```

## 📊 API Endpoints

### Auth
- `POST /api/auth/register` — Register user/volunteer (Local email/password)
- `POST /api/auth/login` — Login (Local email/password)
- `GET /api/auth/google` — Initiate Google OAuth 2.0 flow
- `GET /api/auth/google/callback` — Google OAuth 2.0 redirect callback & session establishment
- `POST /api/auth/google` — Verify Google ID token credential
- `GET /api/auth/me` — Get current user
- `PUT /api/auth/me` — Update profile

### Alerts
- `POST /api/alerts` — Create SOS alert
- `GET /api/alerts` — User's alert history
- `PUT /api/alerts/:id/status` — Update alert status
- `PUT /api/alerts/:id/location` — Update live location

### Emergency Contacts
- `GET /api/contacts` — List contacts
- `POST /api/contacts` — Add contact
- `PUT /api/contacts/:id` — Update contact
- `DELETE /api/contacts/:id` — Delete contact

### Volunteers
- `GET /api/volunteers/alerts` — Nearby alerts
- `PUT /api/volunteers/respond/:id` — Accept/decline
- `PUT /api/volunteers/availability` — Toggle availability
- `GET /api/volunteers/stats` — Statistics

### Admin
- `GET /api/admin/dashboard` — KPI stats
- `GET /api/admin/volunteers/pending` — Pending verifications
- `PUT /api/admin/volunteers/:id/verify` — Verify volunteer
- `GET /api/admin/alerts` — All alerts
- `CRUD /api/admin/safety-zones` — Manage safety zones

## 🔐 Google Authentication

bSafe supports **"Continue with Google"** authentication alongside standard email/password registration. Google OAuth identity is verified strictly server-side using Google's official OpenID Connect protocol.

### 1. Google Cloud Console Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `bsafe-safety-platform`).
3. Navigate to **APIs & Services** > **OAuth consent screen**:
   - Choose **External** user type.
   - Fill in App Information (App name: `bSafe`, Support email, Developer contact email).
   - Add scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
   - Save and proceed.

### 2. OAuth Client ID Creation
1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Select Application type: **Web application**.
4. Set **Name**: `bSafe Web Client`.
5. Configure URIs:
   - **Authorized JavaScript origins**:
     - Local development: `http://localhost:3000`
     - Production: `https://your-domain.com`
   - **Authorized redirect URIs**:
     - Local development: `http://localhost:5000/api/auth/google/callback`
     - Production: `https://your-api-domain.com/api/auth/google/callback`
6. Click **Create** and copy the generated **Client ID** and **Client Secret**.

### 3. Environment Variables Configuration

#### Backend (`backend/.env`)
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

#### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

> **Security Note:** `GOOGLE_CLIENT_SECRET` must **never** be exposed in the frontend or committed to source control.

### 4. Account Linking & Role Policy
- **New Google Users:** Automatically created with the `user` role (`authProvider: 'GOOGLE'`). Google authentication **cannot** bypass volunteer verification or inject administrative privileges.
- **Existing Users with Matching Verified Email:** Automatically linked (`authProvider: 'BOTH'`), enabling sign-in with either Google or email/password while preserving existing roles, verification status, and emergency history.
- **CSRF Protection:** OAuth requests utilize a state parameter signed with HMAC-SHA256 and verified upon callback to prevent CSRF and replay attacks.

## 📄 License
Built for Unified Mentor Projects.
