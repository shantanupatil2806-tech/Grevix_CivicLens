# CivicLens — AI-Assisted Civic Issue Reporting & Management

CivicLens is a civic technology platform designed to make reporting, prioritizing, assigning, and resolving local infrastructure problems more transparent and efficient. It connects citizens, civic officers, and maintenance workers through a shared issue-management workflow.

Citizens can report problems such as potholes, garbage accumulation, water leaks, drainage issues, and broken streetlights. CivicLens helps officers review reports, assess urgency, assign work, and monitor progress while citizens can follow the public status of an issue.

> **Project status:** Update this README to reflect which features are currently implemented in your repository. AI prioritization and duplicate detection may use rule-based logic in the initial version.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Our Solution](#our-solution)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [Issue Workflow](#issue-workflow)
- [AI-Assisted Priority Assessment](#ai-assisted-priority-assessment)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Suggested Project Structure](#suggested-project-structure)
- [Privacy and Security](#privacy-and-security)
- [Future Scope](#future-scope)
- [Contributing](#contributing)
- [License](#license)

## Problem Statement

Civic problems are often reported through disconnected channels, making it difficult for residents to track progress and for municipal teams to coordinate repairs. Reports may lack useful location details, duplicate reports can create extra work, and urgent issues may be difficult to identify among less critical complaints.

CivicLens aims to provide a centralized platform for reporting civic problems and managing them from submission to resolution.

## Our Solution

CivicLens brings the reporting and repair process into one shared system:

- Citizens submit reports with descriptions, categories, photos, and map locations.
- The system suggests issue priority using explainable assessment rules.
- Civic officers review reports, manage priorities, and assign work.
- Maintenance workers update task progress and submit completion evidence.
- Citizens can track public status updates without seeing private reporter details.

## Key Features

### Citizen Portal
- Report civic issues with a title, description, category, and optional photo.
- Select a location using an interactive map.
- Search for a location or PIN code where geocoding is configured.
- View public issue markers and their current statuses.
- Receive a unique issue ID after a successful submission.
- Track issue progress through status history.
- See possible nearby duplicate reports before submitting.

### Civic Officer Dashboard
- View and filter submitted issues.
- Review issue details, photos, locations, and priority assessments.
- Accept or reject reports with a reason.
- Adjust priority when necessary and record an override reason.
- Assign accepted issues to maintenance workers or departments.
- Set deadlines, monitor progress, and identify overdue work.
- Verify completion evidence before resolving a report.
- View metrics such as open, high-priority, in-progress, overdue, and resolved issues.

### Maintenance Worker Portal
- View tasks assigned to the logged-in worker.
- Access issue descriptions, locations, deadlines, and officer instructions.
- Update task progress and add work notes.
- Upload before-and-after photos when supported.
- Submit completed work for officer verification.
- Review assigned and completed tasks.

### Interactive Issue Map
- Display issue locations using Leaflet and OpenStreetMap.
- Use marker styles to communicate issue priority and status.
- Open a public summary by selecting a marker.
- Filter visible issues by category or status.
- Keep map locations synchronized with issue records.
- Avoid silently placing issues at arbitrary coordinates when location lookup fails.

### Shared Issue Management
- Keep citizen reports, officer actions, and worker updates connected to the same backend records.
- Preserve a timestamped history of status changes.
- Restrict private contact information and internal notes to authorized users.

## User Roles

| Role | Main responsibilities |
|---|---|
| **Citizen** | Submit reports, view public issues, and track authorized report details. |
| **Civic Officer** | Review reports, manage priority, assign work, and verify resolution. |
| **Maintenance Worker** | View assigned work, record progress, and submit repair evidence. |

Role restrictions should be enforced by the backend, not only by hiding interface controls.

## Issue Workflow

A typical issue moves through the following stages:

1. **Reported** — A citizen submits a civic issue.
2. **Under Review** — An officer checks the report.
3. **Accepted or Rejected** — The officer decides whether the report should proceed and records a reason when rejecting it.
4. **Assigned** — An accepted issue is assigned to a worker or department.
5. **In Progress** — The assigned worker begins the repair.
6. **Pending Verification** — The worker submits an update and, where applicable, completion evidence.
7. **Resolved** — An officer verifies the work and closes the issue.

The exact status names may vary depending on the implementation. Resolved issues can be reopened if the repair is insufficient or the problem returns.

## AI-Assisted Priority Assessment

CivicLens is designed to support decisions with a transparent priority score from 0 to 100. A rule-based implementation can consider:

- Safety risk
- Issue severity
- Impact on pedestrians or traffic
- Number of people affected, when known
- Time the issue has remained unresolved
- Disruption to essential services

An example configurable classification is:

| Score | Suggested priority |
|---:|---|
| 80–100 | Critical |
| 60–79 | High |
| 35–59 | Moderate |
| 0–34 | Low |

These are suggested initial thresholds, not universal standards. Officers should be able to review the score and override the suggested priority with a recorded reason.

**Transparency note:** If the current implementation uses rules and weighted conditions, describe it as rule-based AI-assisted assessment rather than claiming that it uses a trained machine-learning model or large language model.

## Technology Stack

The intended stack may include:

- **Frontend:** React, Vite, Tailwind CSS, and Lucide icons
- **Backend:** Node.js and Express
- **Database:** MongoDB with Mongoose
- **Maps:** Leaflet and OpenStreetMap
- **Priority assessment:** Explainable rule-based scoring, with optional AI integrations later

Keep this list aligned with the technologies actually present in your project.

## Getting Started

### Prerequisites

Install the tools used by your project:

- Node.js and npm
- MongoDB, either locally or through a hosted provider
- Git

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd <your-project-folder>
```

Replace the placeholders with your actual repository URL and folder name.

### 2. Install dependencies

If the frontend and backend have separate `package.json` files, install dependencies in each directory:

```bash
cd client
npm install
```

Then, in a separate terminal:

```bash
cd server
npm install
```

If your project uses different directory names or a single root `package.json`, follow its existing structure instead.

### 3. Configure environment variables

Create the environment file required by your backend, based on the variables your code actually reads. A typical local configuration might look like this:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/civiclens
```

If your application uses authentication, image storage, or external geocoding services, configure the required credentials separately. Do not commit real secrets to GitHub.

### 4. Start MongoDB

Ensure your local MongoDB service is running, or configure `MONGODB_URI` to point to your hosted database.

### 5. Run the backend

From the backend directory, use the development script defined in its `package.json`. For example:

```bash
npm run dev
```

### 6. Run the frontend

From the frontend directory, use the development script defined in its `package.json`. For example:

```bash
npm run dev
```

Open the local URL printed by Vite in the terminal.

> **Note:** The commands and environment variable names above are examples. Check your existing `package.json` files and backend configuration before running them. Do not add placeholder variables that your code does not use.

## Configuration

Before running CivicLens, verify:

- The frontend points to the correct backend API URL.
- The backend connects successfully to MongoDB.
- Map tiles load and display OpenStreetMap attribution.
- Geocoding is configured if users can search by area or PIN code.
- Photo uploads use the storage method configured by the project.
- Authentication and role permissions are enabled for restricted actions.

Standard OpenStreetMap tiles generally do not require an API key. If an external geocoding provider is used, its terms, limits, and configuration requirements may differ.

## Suggested Project Structure

The exact structure depends on the current repository. A possible organization is:

```text
civiclens/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── CitizenPortal/
│   │   │   ├── OfficerDashboard/
│   │   │   └── WorkerPortal/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
├── server/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── services/
│   └── package.json
└── README.md
```

This is an example, not a requirement to restructure an existing working application.

## Privacy and Security

- Do not expose reporter phone numbers, email addresses, or names in public issue views unless explicitly intended and consented to.
- Keep internal officer notes private.
- Enforce role-based access checks in backend routes.
- Validate submitted fields, coordinates, and uploaded files.
- Limit upload size and accept only supported file types.
- Keep credentials and secret keys out of source control.
- Give workers access only to tasks they are authorized to view and update.
- Preserve an audit trail for important assignments, status changes, and priority overrides.

## Future Scope

Potential future improvements include:

- More advanced duplicate detection using text similarity and geographic distance.
- Optional image-based issue classification.
- Notifications when a report is assigned or its status changes.
- Department-level analytics and geographic hotspots.
- Multilingual reporting.
- Accessibility improvements and stronger mobile support.
- Public service-level targets and overdue escalation.
- Citizen feedback after a repair is verified.

## Contributing

Contributions and suggestions are welcome.

1. Create a branch for your change.
2. Keep changes focused and compatible with the existing architecture.
3. Test the affected workflow before opening a pull request.
4. Never include secrets, private user data, or real reporter contact details in test fixtures.

## License

Choose and add a license before distributing the project publicly. If the repository is part of a hackathon, check the event's rules and your team's preferences before selecting one.
