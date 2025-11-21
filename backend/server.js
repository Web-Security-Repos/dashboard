const express = require('express');
const cors = require('cors');
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const { connectToDatabase } = require('../../database/config/connection');
const {
  getAllRepositories,
  getRepository,
  getAnalysesForRepository,
  getAlerts,
  getAlertsForRepository,
  getSummaryStats,
  getHistoricalTrends,
  getVulnerabilityDistribution
} = require('../../database/queries');
const { ingestData } = require('../../database/scripts/ingest-data');
const GitHubSecurityScanner = require('../../codeql-audit/api/index');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Repositories endpoints
app.get('/api/repositories', async (req, res) => {
  try {
    const filters = {
      vulnerability_type: req.query.vulnerability_type,
      codeql_enabled: req.query.codeql_enabled === 'true' ? true : 
                     req.query.codeql_enabled === 'false' ? false : undefined
    };
    
    const repos = await getAllRepositories(filters);
    console.log(`Retrieved ${repos.length} repositories`);
    res.json(repos);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    console.error('Error stack:', error.stack);
    // Return empty array on any error
    res.json([]);
  }
});

app.get('/api/repositories/:id', async (req, res) => {
  try {
    const repo = await getRepository(req.params.id);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.json(repo);
  } catch (error) {
    console.error('Error fetching repository:', error);
    res.status(404).json({ error: 'Repository not found' });
  }
});

// Analyses endpoints
app.get('/api/repositories/:id/analyses', async (req, res) => {
  try {
    const repo = await getRepository(req.params.id);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const analyses = await getAnalysesForRepository(repo._id, options);
    res.json(analyses);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.json([]);
  }
});

// Alerts endpoints
app.get('/api/alerts', async (req, res) => {
  try {
    const filters = {
      repository: req.query.repository,
      severity: req.query.severity,
      state: req.query.state,
      rule_id: req.query.rule_id,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const alerts = await getAlerts(filters);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.json([]);
  }
});

app.get('/api/repositories/:id/alerts', async (req, res) => {
  try {
    const repo = await getRepository(req.params.id);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    const filters = {
      severity: req.query.severity,
      state: req.query.state,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const alerts = await getAlertsForRepository(repo._id, filters);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.json([]);
  }
});

// Statistics endpoints
app.get('/api/stats/summary', async (req, res) => {
  try {
    const stats = await getSummaryStats();
    console.log('Summary stats retrieved:', JSON.stringify(stats));
    res.json(stats);
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    console.error('Error stack:', error.stack);
    // Return empty stats on any error
    res.json({
      repositories: { total: 0, with_codeql: 0 },
      analyses: { total: 0 },
      alerts: { total: 0, by_severity: {}, by_state: {} }
    });
  }
});

app.get('/api/stats/trends', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const trends = await getHistoricalTrends(days);
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.json([]);
  }
});

app.get('/api/stats/vulnerability-distribution', async (req, res) => {
  try {
    const distribution = await getVulnerabilityDistribution();
    res.json(distribution);
  } catch (error) {
    console.error('Error fetching vulnerability distribution:', error);
    res.json([]);
  }
});

// Scan management endpoints
app.post('/api/scan/trigger/:repoId', async (req, res) => {
  try {
    if (!process.env.GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
    }

    const repo = await getRepository(req.params.repoId);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = repo.owner;
    const repoName = repo.name;
    const workflowFile = 'codeql.yml';

    try {
      await octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo: repoName,
        workflow_id: workflowFile,
        ref: 'main'
      });

      // Update last scan time
      repo.last_scan_at = new Date();
      await repo.save();

      res.json({ 
        success: true, 
        message: `CodeQL workflow triggered for ${repoName}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.status === 404) {
        res.status(404).json({ 
          error: 'CodeQL workflow not found. Make sure the repository has CodeQL enabled.' 
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error triggering scan:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger scan' });
  }
});

app.post('/api/scan/trigger-all', async (req, res) => {
  try {
    if (!process.env.GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const org = process.env.GITHUB_ORG || 'Web-Security-Repos';
    const workflowFile = 'codeql.yml';

    // Get all repositories
    const repos = await getAllRepositories({ codeql_enabled: true });
    const results = [];

    for (const repo of repos) {
      try {
        await octokit.rest.actions.createWorkflowDispatch({
          owner: org,
          repo: repo.name,
          workflow_id: workflowFile,
          ref: 'main'
        });

        repo.last_scan_at = new Date();
        await repo.save();

        results.push({ repo: repo.name, status: 'success' });
      } catch (error) {
        results.push({ 
          repo: repo.name, 
          status: 'error', 
          error: error.status === 404 ? 'Workflow not found' : error.message 
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({ 
      success: true, 
      message: `Triggered workflows for ${repos.length} repositories`,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering scans:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger scans' });
  }
});

app.post('/api/scan/fetch-data', async (req, res) => {
  try {
    // Run data ingestion in the background
    res.json({ 
      success: true, 
      message: 'Data fetch started. This may take a few minutes.',
      timestamp: new Date().toISOString()
    });

    // Run ingestion asynchronously - don't disconnect (backend needs connection)
    ingestData(false).catch(error => {
      console.error('Background data ingestion failed:', error);
    });
  } catch (error) {
    console.error('Error starting data fetch:', error);
    res.status(500).json({ error: error.message || 'Failed to start data fetch' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    // Try to connect to database (but don't fail if it's not available)
    try {
      await connectToDatabase();
      console.log('✅ Database connected');
    } catch (dbError) {
      console.warn('⚠️  Database connection failed. Server will start without database.');
      console.warn('   The dashboard will show empty data until MongoDB is configured.');
      console.warn('   To configure: Create a .env file in dashboard/backend with MONGODB_URI');
    }
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;

