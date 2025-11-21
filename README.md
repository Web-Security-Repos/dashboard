# Web Security Analysis Dashboard

A full-stack dashboard for visualizing and managing security analysis results from CodeQL and other security scanning tools.

## 📋 Structure

```
dashboard/
├── backend/          # Express API server
│   ├── server.js
│   └── package.json
└── frontend/         # React frontend
    ├── src/
    │   ├── pages/
    │   ├── services/
    │   └── App.jsx
    └── package.json
```

## 🚀 Setup

### Backend Setup

1. **Install dependencies:**
   ```bash
   cd dashboard/backend
   npm install
   ```

2. **Set environment variables:**
   Create a `.env` file in the `dashboard/backend` directory:
   ```
   PORT=3001
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/web-security-db
   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

The backend API will be available at `http://localhost:3001`

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd dashboard/frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

## 📊 Features

### Overview Dashboard
- Summary statistics (total repos, analyses, alerts)
- Charts showing:
  - Alerts by severity (pie chart)
  - Vulnerability distribution (bar chart)
  - Analysis trends over time (line chart)
- **Date range selector** (7, 30, 60, 90 days, 6 months, 1 year)
- **Scan management buttons:**
  - Trigger CodeQL scans for all repositories
  - Fetch latest scan results from GitHub

### Repositories Page
- List all repositories with pagination (10 per page)
- **Search and filter** repositories by name or vulnerability type
- **Sortable columns** (name, vulnerability type, language, last scan)
- View repository details
- Shows vulnerability count per repository

### Repository Detail Page
- Repository information and metadata
- List of CodeQL analyses
- Security alerts for the repository with severity breakdown
- **Interactive alert details** with navigation (Previous/Next)
- **Code location links** to GitHub
- Filter by severity and state
- Tabbed interface (Alerts / Analyses)
- **Scan management buttons:**
  - Trigger CodeQL scan for this repository
  - Fetch latest scan results

### Alerts Page
- View all security alerts across repositories
- **Search functionality** by rule ID, description, or message
- Filter by:
  - Severity (critical, high, medium, low)
  - State (open, dismissed, fixed)
  - Repository
- **Export functionality** (CSV and JSON)
- Link to GitHub for each alert
- Shows filtered vs total count

## 🔌 API Endpoints

For complete API documentation, see [backend/API.md](./backend/API.md).

### Repositories
- `GET /api/repositories` - Get all repositories (with optional filters)
- `GET /api/repositories/:id` - Get repository by ID
- `GET /api/repositories/:id/analyses` - Get analyses for repository
- `GET /api/repositories/:id/alerts` - Get alerts for repository (with optional filters)

### Alerts
- `GET /api/alerts` - Get all alerts (with filters: severity, state, repository, rule_id)

### Statistics
- `GET /api/stats/summary` - Get summary statistics
- `GET /api/stats/trends?days=N` - Get historical trends (N days)
- `GET /api/stats/vulnerability-distribution` - Get vulnerability distribution

### Health
- `GET /api/health` - Health check endpoint

## 🛠️ Technologies

- **Backend:** Express.js, MongoDB (via Mongoose)
- **Frontend:** React, React Router, Recharts
- **Build Tool:** Vite

## 📝 Notes

- Make sure MongoDB is running and accessible
- The backend connects to the database using the connection module from `database/config/connection.js`
- The frontend proxies API requests to the backend (configured in `vite.config.js`)
- All features are fully functional and tested
- Export functionality respects current filters and search queries
- Pagination is implemented for repository list (10 items per page)
- Date range selector updates all trend charts dynamically

## 🧪 Testing

Basic test structure is in place:
- Backend API tests: `backend/tests/api.test.js`
- Database model tests: `database/tests/models.test.js`

Run tests with your preferred test runner (Jest, Mocha, etc.)

## 📚 Documentation

- **API Documentation:** [backend/API.md](./backend/API.md)
- **Database Schema:** [../database/SCHEMA.md](../database/SCHEMA.md)
- **Database README:** [../database/README.md](../database/README.md)

