# CivicLens — AI-Powered Community Issue Tracker

A polished, full-stack civic-tech web app for reporting, prioritizing, and tracking local community issues.

## Project Structure

```
CivicLens/
├── frontend/      # React + Vite + Tailwind CSS
├── backend/       # Node.js + Express + MongoDB
└── uploads/       # Uploaded images (auto-created)
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`) or a MongoDB Atlas URI

---

### 1. Backend

```bash
cd backend

# Copy environment config
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

# Edit .env and set MONGODB_URI if using Atlas
# Install dependencies (already done if you followed setup)
npm install

# Start in development mode (hot-reload)
npm run dev

# Or start normally
npm start
```

The API will be available at **http://localhost:5000**

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/issues` | List issues (supports `search`, `category`, `status`, `minSeverity` query params) |
| POST | `/api/issues` | Create issue (multipart/form-data with optional `image`) |
| GET | `/api/issues/:id` | Get single issue |
| PATCH | `/api/issues/:id` | Update issue fields |
| PATCH | `/api/issues/:id/status` | Update issue status |
| GET | `/health` | Health check |

---

### 2. Frontend

```bash
cd frontend

# Install dependencies (already done if you followed setup)
npm install

# Start dev server
npm run dev
```

The app will be available at **http://localhost:5173**

> The frontend will show **Demo mode** if the backend is not running (falls back to sample data).  
> Switch to **Live data** mode by starting the backend.

---

## Features

### 📊 Dashboard
- Summary cards: Total / Open / High Priority / Resolved
- Recent issues table
- Urgent issues highlight panel

### 🗂️ All Issues
- Full filterable/searchable table
- Filter by category, status, severity
- Click any row to open the detail modal

### 📝 Report an Issue
- Auto-suggests category from title/description keywords
- Shows live priority score estimate
- Detects potential duplicate reports and flags them
- Optional image upload
- Full form validation with helpful messages

### 🚨 Priority Issues
- Shows only High/Critical severity open issues

### ✅ Resolved Issues
- Shows closed/resolved issues

### 🔍 Issue Detail Modal
- Full issue info including image
- Status update buttons (Reported → Acknowledged → In Progress → Resolved)
- Works in demo mode (optimistic update) and live mode (API call)

---

## Rule-Based Intelligence

CivicLens includes a pure-JavaScript analysis engine that requires **no paid AI services**:

| Feature | How it works |
|---------|-------------|
| **Auto-categorization** | Keyword regex matching on title + description |
| **Priority scoring** | Category base weight + urgency keyword boost (0-100) |
| **Duplicate detection** | Normalized title/description string matching |

The analysis module is identical on frontend and backend — swap in an LLM by replacing a single function.

---

## Environment Variables

### Backend `.env`
```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/civiclens
UPLOAD_DIR=./uploads
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000/api
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS 3, Lucide React |
| HTTP client | Axios |
| Backend | Node.js, Express 4 |
| Database | MongoDB, Mongoose |
| File uploads | Multer |
| Security | Helmet, CORS |
