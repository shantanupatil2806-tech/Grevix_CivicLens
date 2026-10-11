# CivicLens — AI-Assisted Civic Issue Reporting & Management

CivicLens is a civic technology platform designed to make reporting, prioritizing, assigning, and resolving local infrastructure problems more accessible and transparent. It connects citizens, civic officers, and maintenance workers through a shared issue-management workflow.

Citizens can report problems such as potholes, garbage accumulation, water leakage, drainage issues, and broken streetlights. Officers can review reports, assess priority, assign maintenance work, and monitor progress, while citizens can track the status of reported issues.

CivicLens also addresses unreliable internet connectivity through an **offline-first reporting system** that stores pending reports on the user's device and synchronizes them when connectivity returns.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Our Solution](#our-solution)
- [Challenge 1: Offline-First Reporting](#challenge-1-offline-first-reporting)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [Issue Workflow](#issue-workflow)
- [Priority Assessment](#priority-assessment)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Privacy and Security](#privacy-and-security)
- [Testing](#testing)
- [Future Scope](#future-scope)
- [Repository](#repository)

## Problem Statement

Civic issues are often reported through disconnected channels, making it difficult for residents to track progress and for municipal teams to coordinate repairs. Reports may lack accurate location details, duplicate submissions can create unnecessary work, and urgent problems may be difficult to identify among less critical complaints.

Traditional online reporting systems also depend on reliable internet access and may encourage users to attach photos even when their devices lack a functioning camera.

These limitations can prevent people in remote locations, areas with poor connectivity, or disaster-affected regions from reporting important civic problems.

## Our Solution

CivicLens provides a shared platform for the civic issue lifecycle:

- Citizens submit reports with descriptions, categories, locations, and optional photos.
- A rule-based priority assessment helps officers identify issues that may require urgent attention.
- Officers review reports, manage priorities, and assign maintenance workers.
- Workers update task progress and submit notes or supporting evidence.
- Officers verify completed work before resolving issues.
- Citizens can track report status through the platform.
- Offline reporting allows citizens to prepare and save reports when internet connectivity is unavailable.

## Challenge 1: Offline-First Reporting

### The Challenge

The original reporting workflow depended on internet connectivity to submit civic issues. In remote areas, during natural disasters, or in locations with unreliable infrastructure, citizens may be unable to send reports. A broken or unavailable camera can also prevent users from providing photographic evidence.

The goal was to redesign CivicLens so users could report issues offline while minimizing data loss, duplicate submissions, and problems caused by outdated reports when connectivity returns.

### Our Solution

CivicLens uses an offline-first reporting workflow that stores pending reports locally on the device and synchronizes them with the backend when connectivity is restored.

### Key Capabilities

- **Offline report creation:** Citizens can prepare and save issue reports without an active internet connection.
- **Local persistence:** IndexedDB stores pending reports on the device so they can remain available after a page refresh.
- **Camera-independent reporting:** Photos are optional, allowing users to submit reports even when a camera is unavailable.
- **Connectivity awareness:** The application checks connectivity and distinguishes pending reports from synchronized reports.
- **Automatic and manual synchronization:** Pending reports can be synchronized when connectivity returns, with manual synchronization available where implemented.
- **Duplicate prevention:** Stable client-side identifiers and idempotent backend handling help prevent duplicate records when synchronization is retried.
- **Existing online workflow preserved:** Users with stable connectivity can continue using the regular reporting process.
- **Service-worker support:** The application can cache the configured application shell to improve access during connectivity interruptions, depending on the build and deployment configuration.

### Offline Reporting Workflow

`Create Report → Save to IndexedDB → Wait for Connectivity → Synchronize with Backend → Confirm Submission`

1. A citizen fills out an issue report.
2. If the report cannot be submitted online, it is stored in the local pending queue.
3. The report remains available locally while synchronization is pending.
4. When connectivity returns, the synchronization process sends the report to the backend.
5. The backend uses the stable client identifier to handle retries safely and reduce duplicate creation.
6. After successful synchronization, the local queue is updated to reflect the result.

### Handling Duplicate and Outdated Reports

Offline reports may be submitted long after they were created, and synchronization can be retried if a network request fails.

CivicLens addresses these risks through:

- Stable client identifiers for locally created reports.
- Idempotent backend handling to reduce duplicate creation during retries.
- Local queue state to distinguish pending reports from successfully synchronized reports.
- Timestamps and report details that can help identify older submissions.

A stable identifier prevents repeated synchronization of the same report from creating duplicate records when the backend correctly enforces idempotency. It does not automatically detect separate reports describing the same real-world problem. Duplicate-issue detection across different reports remains a separate concern.

### Demonstration Scenarios

The following scenarios can be used to demonstrate the Challenge 1 implementation:

1. Submit a report while online and verify that it appears in the backend.
2. Disconnect the internet and create a new report.
3. Verify that the report appears in the local pending queue.
4. Refresh the application while offline and verify that the report remains available.
5. Restore connectivity and synchronize the queued report.
6. Verify that the backend contains exactly one record for the synchronized report.
7. Retry synchronization and verify that the same report is not created again.
8. Submit a report without a photo to demonstrate camera-independent reporting.
9. Verify that ordinary online reporting continues to work.

These are validation scenarios, not claims that every scenario has been independently verified in every browser or deployment environment.

## Key Features

### Citizen Portal

- Report civic issues with titles, descriptions, categories, and optional photos.
- Select locations using an interactive map.
- Search for locations where geocoding is configured.
- View public issue markers and their statuses.
- Track reports using exact tracking information.
- Save reports offline and view pending submissions.
- Synchronize queued reports when connectivity returns.

### Civic Officer Dashboard

- View and filter civic issue reports.
- Review issue details, locations, and supporting evidence.
- Assess priority using rule-based scoring.
- Assign issues to maintenance workers.
- Monitor issue status and work progress.
- Verify completion evidence before resolving a report.
- View available issue metrics.
- Distinguish live backend data from demo fallback data when that fallback is enabled.

### Maintenance Worker Portal

- View assigned civic issues.
- Access issue descriptions, locations, and task details.
- Update task progress and add work notes.
- Submit supporting evidence where uploads are supported.
- Send completed work for officer verification.

### Interactive Issue Map

- Display civic issues geographically using Leaflet and OpenStreetMap.
- Show issue locations and categories.
- Allow users to explore reported problems.
- Support category and status filtering where implemented.

### Shared Issue Management

- Connect citizen reports, officer actions, and worker updates through backend records.
- Track issue progress through the configured status workflow.
- Restrict private reporter information and internal notes to authorized users.

## User Roles

| Role                   | Responsibilities                                                      |
| ---------------------- | --------------------------------------------------------------------- |
| **Citizen**            | Submit reports, view public issues, and track reports.                |
| **Civic Officer**      | Review reports, assess priority, assign work, and verify resolutions. |
| **Maintenance Worker** | View assigned tasks, record progress, and submit repair evidence.     |

Role-based restrictions must be enforced by the backend, not only by hiding interface controls.

## Issue Workflow

A typical issue follows this workflow:

1. **Reported** — A citizen submits a civic issue.
2. **Under Review** — An officer reviews the report.
3. **Accepted or Rejected** — The officer decides whether the report should proceed.
4. **Assigned** — An accepted issue is assigned to a worker or department.
5. **In Progress** — The worker begins the required work.
6. **Pending Verification** — The worker submits an update and, where applicable, completion evidence.
7. **Resolved** — An officer verifies the work and closes the issue.

The exact status names depend on the backend's configured status definitions.

## Priority Assessment

CivicLens uses a rule-based priority assessment to help officers identify civic issues that may need earlier attention.

Depending on the configured rules, assessment factors may include:

- Issue severity.
- Potential safety impact.
- Disruption to pedestrians or traffic.
- Impact on essential services.
- Other issue-specific factors supported by the implementation.

A score can support decision-making, but it should not replace officer review.

**Transparency note:** The current priority assessment should be described as rule-based AI-assisted scoring if it relies on predefined rules and weighted conditions. It should not be presented as a trained machine-learning model unless such a model is actually implemented.

## Technology Stack

| Component                   | Technology                               |
| --------------------------- | ---------------------------------------- |
| Frontend                    | React, TypeScript, Vite                  |
| Styling                     | Tailwind CSS                             |
| Backend                     | Node.js, Express.js                      |
| Database                    | MongoDB                                  |
| Mapping                     | Leaflet, OpenStreetMap                   |
| Authentication              | JWT-based authentication                 |
| Offline storage             | IndexedDB                                |
| Offline application support | Service worker and synchronization logic |
| API communication           | REST APIs                                |

## Getting Started

### Prerequisites

Install the following tools:

- Node.js and npm.
- MongoDB locally or through MongoDB Atlas.
- Git.

### 1. Clone the Repository

```bash
git clone https://github.com/shantanupatil2806-tech/Grevix_CivicLens.git
cd Grevix_CivicLens
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure the Backend

Create a `backend/.env` file using the environment variable names expected by the backend.

Example:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/civiclens
JWT_SECRET=replace_with_a_strong_random_secret
SEED_DEMO_USERS=false
```

These values are examples. Confirm the port, environment variable names, and demo-user seeding behavior against the actual source code.

Never commit real credentials, database passwords, or JWT secrets to GitHub.

### 4. Install Frontend Dependencies

Open a second terminal from the repository root:

```bash
cd frontend
npm install
```

### 5. Configure the Frontend

If the frontend uses a configurable API base URL, create `frontend/.env` and set the variable expected by the application.

For example, if the code reads `VITE_API_URL`:

```env
VITE_API_URL=http://localhost:5000/api
```

Use the actual API base URL expected by your frontend. Do not add environment variables that the application does not read.

### 6. Start MongoDB

Ensure MongoDB is running locally or that the configured hosted database is accessible.

### 7. Start the Backend

From the `backend` directory, use the start command configured in `package.json`.

If the project uses `src/index.js` directly, run:

```bash
node src/index.js
```

### 8. Start the Frontend

From the `frontend` directory:

```bash
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## Configuration

Before running or demonstrating CivicLens, verify:

- The backend connects successfully to MongoDB.
- The frontend points to the correct API URL.
- Authentication and role permissions work as expected.
- Map tiles load and OpenStreetMap attribution is visible.
- Geocoding is configured if location search is enabled.
- Photo uploads use the configured storage path.
- Offline storage and synchronization behave correctly in the target browser.
- Service-worker registration matches the development or production build configuration.

## Privacy and Security

- Keep database credentials and JWT secrets out of source control.
- Protect private reporter contact information.
- Restrict internal officer notes to authorized users.
- Validate submitted fields, coordinates, and uploaded files.
- Enforce authentication and role-based authorization on the backend.
- Restrict workers to tasks they are authorized to access.
- Avoid storing unnecessary personal information in offline reports.
- Test synchronization behavior when requests fail or are retried.

Offline data stored in the browser may remain on the device until removed. Users should be informed of relevant local data retention behavior, particularly on shared devices.

## Testing

Before a demonstration or deployment, verify the following:

- [x] Online report creation.
- [x] Offline report creation.
- [x] Pending report persistence after a page refresh.
- [x] Successful synchronization after connectivity returns.
- [x] No duplicate server records after synchronization retries.
- [x] Report submission without a photo.
- [x] Correct report tracking.
- [x] Officer assignment and worker task updates.
- [x] Officer verification and issue resolution.
- [x] Photo upload and retrieval.
- [x] Correct map markers and category labels.
- [x] Clear distinction between live backend data and demo data.
- [x] Service-worker behavior in the intended deployment environment.

Run the checks configured in `package.json`. For example, if the frontend defines these scripts:

```bash
npm run lint
npm run build
```

## Future Scope

Potential future improvements include:

- Better duplicate detection across separate reports.
- Conflict handling for reports that become outdated while offline.
- Image-assisted civic issue classification.
- Notifications when issue statuses change.
- Geographic analytics and issue hotspots.
- Multilingual reporting and accessibility improvements.
- More detailed reporting and resolution analytics.

## Challenge 2

*The Challenge 2 problem statement and implementation details will be added here when the next challenge is announced.*

## Repository

**GitHub:** [Grevix CivicLens](https://github.com/shantanupatil2806-tech/Grevix_CivicLens)

---

**CivicLens — Making civic issue reporting and resolution more accessible, transparent, and organized.**
