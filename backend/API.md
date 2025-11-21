# API Documentation

This document describes the REST API endpoints for the Web Security Dashboard backend.

## Base URL

```
http://localhost:3001/api
```

## Endpoints

### Health Check

**GET** `/api/health`

Check if the API server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Repositories

#### Get All Repositories

**GET** `/api/repositories`

Get a list of all repositories.

**Query Parameters:**
- `vulnerability_type` (optional): Filter by vulnerability type
- `codeql_enabled` (optional): Filter by CodeQL enabled status (`true`/`false`)

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "test-xss-nodejs",
    "full_name": "Web-Security-Repos/test-xss-nodejs",
    "owner": "Web-Security-Repos",
    "url": "https://api.github.com/repos/Web-Security-Repos/test-xss-nodejs",
    "html_url": "https://github.com/Web-Security-Repos/test-xss-nodejs",
    "language": "JavaScript",
    "vulnerability_type": "XSS",
    "codeql_enabled": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "last_scan_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Get Repository by ID

**GET** `/api/repositories/:id`

Get details of a specific repository.

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "test-xss-nodejs",
  "full_name": "Web-Security-Repos/test-xss-nodejs",
  // ... same as above
}
```

#### Get Repository Analyses

**GET** `/api/repositories/:id/analyses`

Get all analyses for a specific repository.

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "analysis_id": "123456",
    "repository": "507f1f77bcf86cd799439011",
    "commit_sha": "abc123def456",
    "ref": "refs/heads/main",
    "tool_name": "CodeQL",
    "results_count": 5,
    "rules_count": 3,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Get Repository Alerts

**GET** `/api/repositories/:id/alerts`

Get all alerts for a specific repository.

**Query Parameters:**
- `severity` (optional): Filter by severity (`critical`, `high`, `medium`, `low`)
- `state` (optional): Filter by state (`open`, `dismissed`, `fixed`)

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "alert_number": 1,
    "rule_id": "js/xss",
    "rule_description": "Reflected cross-site scripting",
    "security_severity": "high",
    "state": "open",
    "location": {
      "path": "index.js",
      "start_line": 10,
      "end_line": 10
    },
    "message": "User input is reflected in response",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Alerts

#### Get All Alerts

**GET** `/api/alerts`

Get all alerts across all repositories.

**Query Parameters:**
- `severity` (optional): Filter by severity
- `state` (optional): Filter by state
- `repository` (optional): Filter by repository ID
- `rule_id` (optional): Filter by rule ID

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    // ... same structure as repository alerts
  }
]
```

---

### Statistics

#### Get Summary Statistics

**GET** `/api/stats/summary`

Get overall summary statistics.

**Response:**
```json
{
  "repositories": {
    "total": 7,
    "with_codeql": 7
  },
  "analyses": {
    "total": 3
  },
  "alerts": {
    "total": 5,
    "by_severity": {
      "critical": 1,
      "high": 4
    },
    "by_state": {
      "open": 5
    }
  }
}
```

#### Get Trends

**GET** `/api/stats/trends?days=30`

Get analysis trends over time.

**Query Parameters:**
- `days` (required): Number of days to look back (default: 30)

**Response:**
```json
[
  {
    "_id": "2024-01-01",
    "count": 2,
    "total_alerts": 5
  }
]
```

#### Get Vulnerability Distribution

**GET** `/api/stats/vulnerability-distribution`

Get distribution of vulnerabilities by type.

**Response:**
```json
[
  {
    "_id": "XSS",
    "count": 3
  },
  {
    "_id": "SQL Injection",
    "count": 2
  }
]
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message here"
}
```

**Status Codes:**
- `200`: Success
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

---

### Scan Management

#### Trigger Scan for Repository

**POST** `/api/scan/trigger/:repoId`

Trigger a CodeQL workflow for a specific repository.

**Response:**
```json
{
  "success": true,
  "message": "CodeQL workflow triggered for repo-name",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Trigger Scans for All Repositories

**POST** `/api/scan/trigger-all`

Trigger CodeQL workflows for all repositories with CodeQL enabled.

**Response:**
```json
{
  "success": true,
  "message": "Triggered workflows for 7 repositories",
  "results": [
    { "repo": "test-xss-nodejs", "status": "success" },
    { "repo": "test-sql-injection", "status": "error", "error": "Workflow not found" }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Fetch Latest Data

**POST** `/api/scan/fetch-data`

Fetch the latest scan results from GitHub and update the database.

**Response:**
```json
{
  "success": true,
  "message": "Data fetch started. This may take a few minutes.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Note:** This endpoint returns immediately and runs data ingestion in the background.

---

## Notes

- All dates are in ISO 8601 format
- The API uses MongoDB ObjectIds for `_id` fields
- Pagination is not yet implemented but may be added in the future
- Rate limiting is not currently implemented
- Scan endpoints require `GITHUB_TOKEN` and `GITHUB_ORG` environment variables

