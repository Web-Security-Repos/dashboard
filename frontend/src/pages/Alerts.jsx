import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { alertsAPI, repositoriesAPI } from '../services/api';
import '../App.css';

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    severity: '',
    state: '',
    repository: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reposRes] = await Promise.all([
        repositoriesAPI.getAll()
      ]);
      setRepos(reposRes.data);
      await loadAlerts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await alertsAPI.getAll(filters);
      setAllAlerts(response.data);
      applySearch(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const applySearch = (alertsToFilter) => {
    if (!searchQuery.trim()) {
      setAlerts(alertsToFilter);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = alertsToFilter.filter(alert => 
      alert.rule_id?.toLowerCase().includes(query) ||
      alert.rule_description?.toLowerCase().includes(query) ||
      alert.message?.toLowerCase().includes(query)
    );
    setAlerts(filtered);
  };

  useEffect(() => {
    applySearch(allAlerts);
  }, [searchQuery]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportToCSV = () => {
    const headers = ['Rule ID', 'Rule Description', 'Repository', 'Severity', 'State', 'Location', 'Message', 'Created'];
    const rows = alerts.map(alert => [
      alert.rule_id || '',
      alert.rule_description || '',
      typeof alert.repository === 'object' ? alert.repository.name : 'Unknown',
      alert.security_severity || '',
      alert.state || '',
      `${alert.location?.path || ''}${alert.location?.start_line ? `:${alert.location.start_line}` : ''}`,
      alert.message || '',
      new Date(alert.created_at).toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(alerts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="loading">Loading alerts...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="container">
      <h1>Security Alerts</h1>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Filters & Search</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={exportToCSV} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              Export CSV
            </button>
            <button onClick={exportToJSON} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              Export JSON
            </button>
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search by rule ID, description, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Severity
            </label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              State
            </label>
            <select
              value={filters.state}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="dismissed">Dismissed</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Repository
            </label>
            <select
              value={filters.repository}
              onChange={(e) => handleFilterChange('repository', e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All</option>
              {repos.map(repo => (
                <option key={repo._id} value={repo._id}>
                  {repo.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>All Alerts ({alerts.length}{allAlerts.length !== alerts.length ? ` of ${allAlerts.length}` : ''})</h2>
        {alerts.length === 0 ? (
          <p>No alerts found matching the filters.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Repository</th>
                <th>Severity</th>
                <th>Location</th>
                <th>State</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => (
                <tr key={alert._id}>
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
                    {alert.repository ? (
                      typeof alert.repository === 'object' ? (
                        <Link to={`/repositories/${alert.repository._id || alert.repository}`} style={{ color: '#007bff' }}>
                          {alert.repository.name || 'Unknown'}
                        </Link>
                      ) : (
                        <Link to={`/repositories/${alert.repository}`} style={{ color: '#007bff' }}>
                          Repository
                        </Link>
                      )
                    ) : (
                      'Unknown'
                    )}
                  </td>
                  <td>
                    <span className={`severity-badge severity-${alert.security_severity || 'medium'}`}>
                      {alert.security_severity || 'medium'}
                    </span>
                  </td>
                  <td>
                    {alert.location?.path}
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
        )}
      </div>
    </div>
  );
}

export default Alerts;

