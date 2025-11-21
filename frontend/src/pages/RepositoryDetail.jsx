import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { repositoriesAPI, scanAPI } from '../services/api';
import { useToast } from '../components/Toast';
import '../App.css';

function RepositoryDetail() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [repo, setRepo] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('alerts');
  const [selectedAlertIndex, setSelectedAlertIndex] = useState(null);
  const [scanStatus, setScanStatus] = useState({ loading: false, message: null, type: null });
  const pollingIntervalRef = useRef(null);
  const [initialAnalysisCount, setInitialAnalysisCount] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [repoRes, analysesRes, alertsRes] = await Promise.all([
        repositoriesAPI.getById(id),
        repositoriesAPI.getAnalyses(id, { limit: 10 }),
        repositoriesAPI.getAlerts(id, { limit: 50 })
      ]);
      
      setRepo(repoRes.data);
      setAnalyses(analysesRes.data);
      setAlerts(alertsRes.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading repository details...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!repo) {
    return <div className="error">Repository not found</div>;
  }

  const severityCounts = alerts.reduce((acc, alert) => {
    const sev = alert.security_severity || 'unknown';
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {});

  const handleTriggerScan = async () => {
    try {
      setScanStatus({ loading: true, message: 'Triggering CodeQL scan...', type: 'info' });
      showToast('Triggering CodeQL scan...', 'info', 3000);
      
      // Get initial analysis count
      const analysesRes = await repositoriesAPI.getAnalyses(id, { limit: 10 });
      const initialCount = analysesRes.data?.length || 0;
      setInitialAnalysisCount(initialCount);
      
      const response = await scanAPI.triggerScan(id);
      setScanStatus({ loading: false, message: null, type: null });
      showToast(`${response.data.message}. Scan will take 5-10 minutes to complete.`, 'success', 6000);
      
      // Start polling for scan completion
      startPollingForCompletion();
    } catch (err) {
      setScanStatus({ loading: false, message: null, type: null });
      showToast(`Error: ${err.response?.data?.error || err.message}`, 'error', 6000);
    }
  };

  const startPollingForCompletion = () => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let pollCount = 0;
    const maxPolls = 40; // Poll for up to 20 minutes (30 seconds * 40 = 20 minutes)
    
    const interval = setInterval(async () => {
      pollCount++;
      
      try {
        const analysesRes = await repositoriesAPI.getAnalyses(id, { limit: 10 });
        const currentCount = analysesRes.data?.length || 0;
        
        // Check if we have new analyses (scan completed)
        if (initialAnalysisCount !== null && currentCount > initialAnalysisCount) {
          clearInterval(interval);
          pollingIntervalRef.current = null;
          setInitialAnalysisCount(null);
          
          // Fetch latest data and show completion notification
          await scanAPI.fetchData();
          showToast('Scan completed! Fetching latest results...', 'success', 5000);
          
          // Refresh data after a short delay
          setTimeout(async () => {
            await loadData();
            showToast('Scan results updated successfully!', 'success', 6000);
          }, 3000);
        } else if (pollCount >= maxPolls) {
          // Stop polling after max attempts
          clearInterval(interval);
          pollingIntervalRef.current = null;
          setInitialAnalysisCount(null);
          showToast('Polling stopped. Scan may still be running. Click "Fetch Latest" to check for results.', 'info', 8000);
        }
      } catch (err) {
        console.error('Error polling for scan completion:', err);
        // Continue polling even if one request fails
      }
    }, 30000); // Poll every 30 seconds
    
    pollingIntervalRef.current = interval;
  };

  const handleFetchData = async () => {
    try {
      setScanStatus({ loading: true, message: 'Fetching latest scan results...', type: 'info' });
      showToast('Fetching latest scan results...', 'info', 3000);
      await scanAPI.fetchData();
      setScanStatus({ loading: false, message: null, type: null });
      showToast('Data fetch started. Refreshing in 5 seconds...', 'success', 5000);
      setTimeout(() => {
        loadData();
        showToast('Data refreshed successfully!', 'success', 4000);
      }, 5000);
    } catch (err) {
      setScanStatus({ loading: false, message: null, type: null });
      showToast(`Error: ${err.response?.data?.error || err.message}`, 'error', 6000);
    }
  };

  return (
    <div className="container">
      <Link to="/repositories" style={{ color: '#007bff', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
        ← Back to Repositories
      </Link>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h1>{repo.name}</h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>{repo.full_name}</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <strong>Vulnerability Type:</strong> {repo.vulnerability_type || 'Other'}
          </div>
          <div>
            <strong>Language:</strong> {repo.language || 'N/A'}
          </div>
          <div>
            <strong>CodeQL Enabled:</strong> {repo.codeql_enabled ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Last Scan:</strong> {repo.last_scan_at ? new Date(repo.last_scan_at).toLocaleString() : 'Never'}
          </div>
        </div>

        {repo.html_url && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
              View on GitHub →
            </a>
            {repo.codeql_enabled && (
              <>
                <button
                  onClick={handleTriggerScan}
                  disabled={scanStatus.loading}
                  className="btn btn-primary"
                  style={{ fontSize: '0.9rem', padding: '6px 12px' }}
                  title="Trigger a new CodeQL scan for this repository"
                >
                  {scanStatus.loading ? 'Triggering...' : 'Trigger Scan'}
                </button>
                <button
                  onClick={handleFetchData}
                  disabled={scanStatus.loading}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.9rem', padding: '6px 12px' }}
                  title="Fetch latest scan results"
                >
                  {scanStatus.loading ? 'Fetching...' : 'Fetch Latest'}
                </button>
              </>
            )}
          </div>
        )}
      </div>


      <div style={{ marginBottom: '1rem' }}>
        <button
          className={`btn ${activeTab === 'alerts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('alerts')}
          style={{ marginRight: '0.5rem' }}
        >
          Alerts ({alerts.length})
        </button>
        <button
          className={`btn ${activeTab === 'analyses' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('analyses')}
        >
          Analyses ({analyses.length})
        </button>
      </div>

      {activeTab === 'alerts' && (
        <div className="card">
          <h2>Security Alerts</h2>
          
          {Object.keys(severityCounts).length > 0 && (
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {Object.entries(severityCounts).map(([severity, count]) => (
                <span key={severity} className={`severity-badge severity-${severity}`}>
                  {severity}: {count}
                </span>
              ))}
            </div>
          )}

          {alerts.length === 0 ? (
            <p>No alerts found for this repository.</p>
          ) : (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Rule ID</th>
                    <th>Severity</th>
                    <th>Location</th>
                    <th>State</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert, index) => (
                    <tr 
                      key={alert._id}
                      style={{ 
                        backgroundColor: selectedAlertIndex === index ? '#f0f8ff' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedAlertIndex(selectedAlertIndex === index ? null : index)}
                    >
                      <td>
                        <strong>{alert.rule_id}</strong>
                        {alert.rule_description && (
                          <>
                            <br />
                            <small style={{ color: '#666' }}>{alert.rule_description}</small>
                          </>
                        )}
                      </td>
                      <td>
                        <span className={`severity-badge severity-${alert.security_severity || 'medium'}`}>
                          {alert.security_severity || 'medium'}
                        </span>
                      </td>
                      <td>
                        {alert.location?.path || 'N/A'}
                        {alert.location?.start_line && (
                          <span style={{ color: '#666' }}> (line {alert.location.start_line})</span>
                        )}
                      </td>
                      <td>{alert.state}</td>
                      <td>{new Date(alert.created_at).toLocaleDateString()}</td>
                      <td>
                        {alert.html_url && (
                          <a
                            href={alert.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: '#007bff', fontSize: '0.85rem' }}
                          >
                            View on GitHub
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedAlertIndex !== null && alerts[selectedAlertIndex] && (
                <div className="card" style={{ marginTop: '2rem', backgroundColor: '#f8f9fa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>Alert Details</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setSelectedAlertIndex(Math.max(0, selectedAlertIndex - 1))}
                        disabled={selectedAlertIndex === 0}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem' }}
                      >
                        ← Previous
                      </button>
                      <span style={{ padding: '0 1rem', display: 'flex', alignItems: 'center' }}>
                        {selectedAlertIndex + 1} of {alerts.length}
                      </span>
                      <button
                        onClick={() => setSelectedAlertIndex(Math.min(alerts.length - 1, selectedAlertIndex + 1))}
                        disabled={selectedAlertIndex === alerts.length - 1}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem' }}
                      >
                        Next →
                      </button>
                      <button
                        onClick={() => setSelectedAlertIndex(null)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem', marginLeft: '0.5rem' }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  
                  {(() => {
                    const alert = alerts[selectedAlertIndex];
                    return (
                      <div>
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Rule ID:</strong> {alert.rule_id}
                        </div>
                        {alert.rule_description && (
                          <div style={{ marginBottom: '1rem' }}>
                            <strong>Description:</strong> {alert.rule_description}
                          </div>
                        )}
                        {alert.message && (
                          <div style={{ marginBottom: '1rem' }}>
                            <strong>Message:</strong> {alert.message}
                          </div>
                        )}
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Location:</strong> {alert.location?.path || 'N/A'}
                          {alert.location?.start_line && (
                            <span> at line {alert.location.start_line}
                              {alert.location?.end_line && alert.location.end_line !== alert.location.start_line && 
                                `-${alert.location.end_line}`}
                            </span>
                          )}
                        </div>
                        {alert.location?.path && repo.html_url && (
                          <div style={{ marginBottom: '1rem' }}>
                            <a
                              href={`${repo.html_url}/blob/main/${alert.location.path}${alert.location.start_line ? `#L${alert.location.start_line}` : ''}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#007bff' }}
                            >
                              View code on GitHub →
                            </a>
                          </div>
                        )}
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Severity:</strong>{' '}
                          <span className={`severity-badge severity-${alert.security_severity || 'medium'}`}>
                            {alert.security_severity || 'medium'}
                          </span>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>State:</strong> {alert.state}
                        </div>
                        <div>
                          <strong>Created:</strong> {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'analyses' && (
        <div className="card">
          <h2>CodeQL Analyses</h2>
          {analyses.length === 0 ? (
            <p>No analyses found for this repository.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Analysis ID</th>
                  <th>Commit SHA</th>
                  <th>Results Count</th>
                  <th>Rules Count</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map(analysis => (
                  <tr key={analysis._id}>
                    <td>{analysis.analysis_id}</td>
                    <td>
                      <code style={{ fontSize: '0.85rem' }}>
                        {analysis.commit_sha.substring(0, 8)}...
                      </code>
                    </td>
                    <td>{analysis.results_count}</td>
                    <td>{analysis.rules_count}</td>
                    <td>{new Date(analysis.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default RepositoryDetail;

