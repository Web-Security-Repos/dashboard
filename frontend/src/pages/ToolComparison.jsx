import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../App.css';

function ToolComparison() {
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [comparison, setComparison] = useState(null);
  const [toolStats, setToolStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanningLocal, setScanningLocal] = useState(false);

  useEffect(() => {
    fetchRepositories();
    fetchToolStats();
  }, []);

  const fetchRepositories = async () => {
    try {
      const repos = await api.getRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  };

  const fetchToolStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tools/stats');
      const stats = await response.json();
      setToolStats(stats);
    } catch (error) {
      console.error('Error fetching tool stats:', error);
    }
  };

  const handleRepoSelect = async (repoId) => {
    setSelectedRepo(repoId);
    if (!repoId) {
      setComparison(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/tools/comparison/${repoId}`);
      const data = await response.json();
      setComparison(data);
    } catch (error) {
      console.error('Error fetching comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerLocalScan = async () => {
    setScanningLocal(true);
    try {
      const response = await fetch('http://localhost:3001/api/tools/scan-local', {
        method: 'POST'
      });
      const data = await response.json();
      alert(data.message);
      
      // Refresh after a delay
      setTimeout(() => {
        fetchToolStats();
        if (selectedRepo) {
          handleRepoSelect(selectedRepo);
        }
      }, 5000);
    } catch (error) {
      console.error('Error triggering scan:', error);
      alert('Failed to trigger scan');
    } finally {
      setScanningLocal(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>Multi-Tool Comparison</h1>
        <p className="subtitle">Compare results from Semgrep, ESLint, and CodeQL</p>
        <button 
          onClick={triggerLocalScan} 
          disabled={scanningLocal}
          className="btn btn-primary"
          style={{marginTop: '10px'}}
        >
          {scanningLocal ? 'Scanning...' : 'Run Local Multi-Tool Scan'}
        </button>
      </div>

      {/* Overall Tool Stats */}
      {toolStats && (
        <div className="stats-grid" style={{marginBottom: '30px'}}>
          <h2>Overall Statistics</h2>
          <div className="cards-grid">
            {toolStats.alerts_by_tool?.map(tool => (
              <div key={tool.tool_name} className="stat-card">
                <h3>{tool.tool_name}</h3>
                <div className="stat-value">{tool.total_alerts}</div>
                <div className="stat-label">Total Alerts</div>
                <div style={{marginTop: '10px', fontSize: '14px'}}>
                  <div>Critical: {tool.by_severity.critical}</div>
                  <div>High: {tool.by_severity.high}</div>
                  <div>Medium: {tool.by_severity.medium}</div>
                  <div>Low: {tool.by_severity.low}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repository Selector */}
      <div className="card" style={{marginBottom: '20px'}}>
        <h2>Compare by Repository</h2>
        <select 
          value={selectedRepo} 
          onChange={(e) => handleRepoSelect(e.target.value)}
          className="select-input"
          style={{width: '100%', padding: '10px', fontSize: '16px'}}
        >
          <option value="">Select a repository...</option>
          {repositories.map(repo => (
            <option key={repo._id} value={repo._id}>
              {repo.name}
            </option>
          ))}
        </select>
      </div>

      {/* Comparison Results */}
      {loading && <div className="loading">Loading comparison...</div>}
      
      {comparison && !loading && (
        <div>
          {/* Overlap Summary */}
          <div className="card">
            <h2>Overlap Analysis</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Tools Analyzed:</span>
                <span className="stat-value">{comparison.tools.join(', ')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Common Findings:</span>
                <span className="stat-value">{comparison.overlap.common_findings}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Unique Findings:</span>
                <span className="stat-value">{comparison.overlap.unique_findings}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Unique Issues:</span>
                <span className="stat-value">{comparison.overlap.total_unique_issues}</span>
              </div>
            </div>
          </div>

          {/* Tool Effectiveness */}
          <div className="card">
            <h2>Tool Effectiveness</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Total Detections</th>
                  <th>Unique Detections</th>
                  <th>Shared Detections</th>
                  <th>Uniqueness Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(comparison.effectiveness).map(([tool, metrics]) => (
                  <tr key={tool}>
                    <td><strong>{tool}</strong></td>
                    <td>{metrics.total_detections}</td>
                    <td>{metrics.unique_detections}</td>
                    <td>{metrics.shared_detections}</td>
                    <td>{metrics.uniqueness_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Severity Comparison */}
          <div className="card">
            <h2>Findings by Severity</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Critical</th>
                  <th>High</th>
                  <th>Medium</th>
                  <th>Low</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(comparison.by_severity).map(([tool, severities]) => (
                  <tr key={tool}>
                    <td><strong>{tool}</strong></td>
                    <td><span className="badge badge-critical">{severities.critical}</span></td>
                    <td><span className="badge badge-high">{severities.high}</span></td>
                    <td><span className="badge badge-medium">{severities.medium}</span></td>
                    <td><span className="badge badge-low">{severities.low}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Category Comparison */}
          <div className="card">
            <h2>Findings by Category</h2>
            {Object.entries(comparison.by_category).map(([tool, categories]) => (
              <div key={tool} style={{marginBottom: '20px'}}>
                <h3>{tool}</h3>
                <div className="category-grid">
                  {Object.entries(categories).map(([category, count]) => (
                    <div key={category} className="category-item">
                      <span>{category}</span>
                      <span className="badge">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Common Findings Detail */}
          {comparison.detailed_overlap.length > 0 && (
            <div className="card">
              <h2>Common Findings (Detected by Multiple Tools)</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Severity</th>
                    <th>Detected By</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.detailed_overlap.slice(0, 20).map((finding, idx) => (
                    <tr key={idx}>
                      <td>{finding.alert.location?.path}:{finding.alert.location?.start_line}</td>
                      <td><span className={`badge badge-${finding.alert.security_severity}`}>
                        {finding.alert.security_severity}
                      </span></td>
                      <td>{finding.detectedBy.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {comparison.detailed_overlap.length > 20 && (
                <p style={{marginTop: '10px', color: '#666'}}>
                  Showing 20 of {comparison.detailed_overlap.length} common findings
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!comparison && !loading && selectedRepo && (
        <div className="card">
          <p>No multi-tool comparison data available for this repository.</p>
          <p>Run a multi-tool scan to generate comparison data.</p>
        </div>
      )}
    </div>
  );
}

export default ToolComparison;

