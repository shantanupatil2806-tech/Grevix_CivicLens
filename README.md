# 🏙️ CivicLens

### Report it. Track it. Resolve it.

**A civic issue reporting and management platform that connects
citizens, civic officers, and maintenance workers --- even when internet
connectivity is unreliable.**

[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-API-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)

[**🌐 Live Demo**](https://grevix-civic-lens.vercel.app/) · [**💻 GitHub
Repository**](https://github.com/shantanupatil2806-tech/Grevix_CivicLens)
· [**⚙️ Backend
Health**](https://civiclens-backend-ucyz.onrender.com/health)

------------------------------------------------------------------------
## 📌 Overview

CivicLens is a full-stack civic technology application built to make
local issue reporting more accessible, organized, and transparent.
Residents can report problems such as potholes, overflowing garbage,
damaged roads, drainage issues, and broken streetlights. Civic teams can
review reports, prioritize work, assign workers, and track resolution.

The project also tackles a common real-world challenge: **what happens
when someone needs to report a civic issue but has no reliable internet
connection?** CivicLens supports offline report storage and
synchronization when connectivity returns.

## ✨ What You Can Do
  -----------------------------------------------------------------------
  Feature                             What it does
  ----------------------------------- -----------------------------------
  📝 **Civic issue reporting**        Submit an issue with a title,
                                      description, category, location,
                                      and optional photo.

  🗺️ **Interactive issue map**        Explore reported issues
                                      geographically using Leaflet and
                                      OpenStreetMap.

  📴 **Offline-first reporting**      Save reports locally in IndexedDB
                                      when they cannot be submitted
                                      online.

  🔄 **Automatic synchronization**    Retry pending reports when
                                      connectivity returns, with stable
                                      client IDs to help prevent
                                      duplicate records on retries.

  👥 **Community support**            Support an existing issue instead
                                      of creating another ticket for the
                                      same problem.

  🧠 **Rule-based issue analysis**    Assess severity and priority using
                                      configured rules, and surface
                                      potential duplicate reports for
                                      review.

  🧑‍💼 **Officer workflow**             Review reports, manage status and
                                      priority, assign work, and verify
                                      completion.

  🦺 **Worker workflow**              View assigned tasks, provide
                                      progress updates, and submit
                                      completion evidence where
                                      supported.

  🔐 **Authentication and roles**     JWT-based sign-in with citizen,
                                      officer, worker, and admin roles.

  📊 **Issue monitoring**             Filter and review issue records and
                                      available dashboard metrics.
  -----------------------------------------------------------------------

> **About the analysis:** CivicLens uses rule-based scoring and
> duplicate-suggestion logic. It is not presented as a trained
> machine-learning model.

## 🔁 How It Works

``` text
Citizen reports an issue
          │
          ▼
CivicLens checks the report and assesses priority
          │
          ▼
Issue is stored and shown in the issue workflow/map
          │
          ▼
Officer reviews the report and assigns work
          │
          ▼
Worker updates progress and submits evidence
          │
          ▼
Officer verifies the work
          │
          ▼
Issue is marked resolved
```

### Offline reporting flow

``` text
Create report
     ↓
Save locally in IndexedDB
     ↓
Wait for internet connectivity
     ↓
Synchronize with the backend
     ↓
Mark report as synced
```

Pending reports can remain on the device across page refreshes. Reports
older than the configured threshold may be flagged for review before
synchronization, helping users confirm that the issue still exists.

## 🧭 User Roles

-   **Citizen** --- Submit and track civic reports, explore issues, and
    support existing reports.
-   **Civic Officer** --- Review issues, assess or adjust priority,
    assign workers, and verify resolutions.
-   **Maintenance Worker** --- View assigned tasks, record progress, and
    submit work evidence.
-   **Admin** --- Manage authorized user accounts and access
    administrative functions.

Access should always be enforced by backend authorization, not just by
hiding interface elements.

## 🛠️ Tech Stack

### Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   Leaflet and React Leaflet
-   Axios
-   IndexedDB for local offline report storage

### Backend

-   Node.js
-   Express
-   MongoDB and Mongoose
-   JWT authentication
-   bcryptjs password hashing
-   Multer for photo uploads
-   Helmet and CORS middleware

### Deployment

-   **Frontend:** Vercel
-   **Backend:** Render
-   **Database:** MongoDB (configure a local instance or MongoDB Atlas)

## 🌐 Live Deployment

-   **Frontend:** https://grevix-civic-lens.vercel.app/
-   **Backend health endpoint:**
    https://civiclens-backend-ucyz.onrender.com/health
-   **Backend API base:**
    `https://civiclens-backend-ucyz.onrender.com/api`

The health endpoint checks whether the backend is responding. It does
not by itself guarantee that every feature or login account is
configured correctly.

## 🚀 Run Locally

### Prerequisites

Install: - [Node.js](https://nodejs.org/) and npm -
[Git](https://git-scm.com/) - MongoDB locally or a MongoDB Atlas
connection string

### 1. Clone the repository

``` bash
git clone https://github.com/shantanupatil2806-tech/Grevix_CivicLens.git
cd Grevix_CivicLens
```

### 2. Configure and start the backend

``` bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

``` env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/civiclens
JWT_SECRET=replace_with_a_long_random_secret
SEED_DEMO_USERS=false
```

Then start the backend:

``` bash
npm run dev
```

The API will normally be available at `http://localhost:5000`, and the
health endpoint at `http://localhost:5000/health`.

**Environment notes** - `MONGODB_URI` must point to the database you
intend to use. - Set `JWT_SECRET` to a strong, private value. Never
commit it. - In production, default demo-user seeding is skipped unless
`SEED_DEMO_USERS=true`. Do not enable demo seeding on a public
deployment with predictable credentials. Prefer creating accounts
securely and using unique passwords. - Uploaded files are stored in the
configured upload directory. Production deployments should use
persistent or external file storage if uploaded files must survive
instance replacement.

### 3. Configure and start the frontend

Open a second terminal from the repository root:

``` bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

The current frontend API client is configured to use the deployed
CivicLens API URL. For a fully local setup, update the API base URL in
`frontend/src/services/api.ts` to:

``` ts
const BASE_URL = 'http://localhost:5000/api';
```

If you switch between local and deployed environments often, consider
moving this value into a Vite environment variable.

### 4. Build the frontend

From `frontend/`:

``` bash
npm run build
npm run lint
```

## 🔌 API Overview

The backend exposes these main route groups:

  -----------------------------------------------------------------------
  Route                               Purpose
  ----------------------------------- -----------------------------------
  `GET /health`                       Backend health check

  `/api/auth`                         Login, current-user information,
                                      password flows, demo-user listing,
                                      and user administration routes

  `/api/issues`                       Issue reporting, listing, analysis,
                                      status updates, assignments, worker
                                      updates, community support, and
                                      resolution workflows
  -----------------------------------------------------------------------

Example health check:

``` bash
curl https://civiclens-backend-ucyz.onrender.com/health
```

Expected response:

``` json
{
  "status": "ok"
}
```

## 🔒 Security & Privacy

-   Keep `.env` files, database credentials, and JWT secrets out of Git.
-   Use unique passwords and avoid public demo accounts with privileged
    access.
-   Validate and authorize sensitive operations on the backend.
-   Protect reporter contact information and internal work notes.
-   Review upload validation and storage settings before production use.
-   Remember that offline reports are stored in the browser on the
    current device; avoid using sensitive information on shared devices.
-   Test account creation, login, role permissions, and logout in the
    deployed environment.

## 🧪 Suggested Test Checklist

Use this checklist when validating a local or deployed build:

-   [ ] Backend health endpoint responds successfully.
-   [ ] A valid account can sign in and an invalid password is rejected.
-   [ ] A citizen can submit an issue with and without a photo.
-   [ ] Issue details and map locations display correctly.
-   [ ] A report created offline remains in the pending queue after
    refresh.
-   [ ] Pending reports synchronize after connectivity returns.
-   [ ] Retrying synchronization does not create duplicate records for
    the same client ID.
-   [ ] Supporting an existing issue updates its support count as
    expected.
-   [ ] Officers can assign work and workers can submit progress
    updates.
-   [ ] Resolution follows the configured verification workflow.
-   [ ] The frontend production build completes successfully.

## 🗺️ Future Improvements

Potential next steps include: - Stronger detection of separate reports
describing the same real-world issue. - Notifications when reports are
assigned or resolved. - Multilingual and accessibility improvements. -
Better analytics for recurring civic problems and issue hotspots. - More
robust conflict handling for old offline reports. - External file
storage for durable production photo uploads.

## 🤝 Contributing

Contributions, bug reports, and practical suggestions are welcome.

1.  Fork the repository.
2.  Create a feature branch: `git checkout -b feature/your-feature`
3.  Commit your changes.
4.  Push the branch and open a pull request.

Please avoid committing secrets, local database files, uploaded user
data, or `node_modules`.

------------------------------------------------------------------------

**Built to make civic reporting more accessible, accountable, and
community-driven.**

### 🏙️ CivicLens --- See the issue. Support the solution.
