import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { statsAPI, scanAPI } from '../services/api';
import { useToast } from '../components/Toast';
import '../App.css';

// Severity color mapping matching the CSS badges
const getSeverityColor = (severity) => {
  const colorMap = {
    critical: '#b91c2c',
    high: '#ff9800',
    medium: '#ffc107',
    low: '#28a745'
  };
  return colorMap[severity.toLowerCase()] || '#8884d8';
};

function Overview() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [scanStatus, setScanStatus] = useState({ loading: false, message: null, type: null });
  const pollingIntervalRef = useRef(null);
  const [initialAnalysisCount, setInitialAnalysisCount] = useState(null);

  useEffect(() => {
    loadData();
  }, [days]);

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
      const [summaryRes, trendsRes, distRes] = await Promise.all([
        statsAPI.getSummary(),
        statsAPI.getTrends(days),
        statsAPI.getVulnerabilityDistribution()
      ]);
      
      setSummary(summaryRes.data);
      setTrends(trendsRes.data);
      setDistribution(distRes.data);
      setError(null);
      
      // Return analysis count for polling
      return summaryRes.data?.analyses?.total || 0;
    } catch (err) {
      setError(err.message);
      return 0;
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  const severityData = summary?.alerts?.by_severity ? Object.entries(summary.alerts.by_severity).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value
  })) : [];

  const handleTriggerAllScans = async () => {
    try {
      setScanStatus({ loading: true, message: 'Triggering CodeQL scans for all repositories...', type: 'info' });
      showToast('Triggering CodeQL scans for all repositories...', 'info', 3000);
      
      // Get initial analysis count
      const initialCount = await loadData();
      setInitialAnalysisCount(initialCount);
      
      const response = await scanAPI.triggerAllScans();
      setScanStatus({ loading: false, message: null, type: null });
      showToast(`${response.data.message}. Scans will take 5-10 minutes to complete.`, 'success', 6000);
      
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
        const summaryRes = await statsAPI.getSummary();
        const currentCount = summaryRes.data?.analyses?.total || 0;
        
        // Check if we have new analyses (scans completed)
        if (initialAnalysisCount !== null && currentCount > initialAnalysisCount) {
          clearInterval(interval);
          pollingIntervalRef.current = null;
          setInitialAnalysisCount(null);
          
          // Fetch latest data and show completion notification
          await scanAPI.fetchData();
          showToast('Scans completed! Fetching latest results...', 'success', 5000);
          
          // Refresh dashboard after a short delay
          setTimeout(async () => {
            await loadData();
            showToast('Scan results updated successfully!', 'success', 6000);
          }, 3000);
        } else if (pollCount >= maxPolls) {
          // Stop polling after max attempts
          clearInterval(interval);
          pollingIntervalRef.current = null;
          setInitialAnalysisCount(null);
          showToast('Polling stopped. Scans may still be running. Click "Fetch Latest Data" to check for results.', 'info', 8000);
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
      setScanStatus({ loading: true, message: 'Fetching latest scan results from GitHub...', type: 'info' });
      showToast('Fetching latest scan results from GitHub...', 'info', 3000);
      await scanAPI.fetchData();
      setScanStatus({ loading: false, message: null, type: null });
      showToast('Data fetch started. Refreshing dashboard in 5 seconds...', 'success', 5000);
      setTimeout(() => {
        loadData();
        showToast('Dashboard refreshed successfully!', 'success', 4000);
      }, 5000);
    } catch (err) {
      setScanStatus({ loading: false, message: null, type: null });
      showToast(`Error: ${err.response?.data?.error || err.message}`, 'error', 6000);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>Security Dashboard Overview</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleTriggerAllScans}
              disabled={scanStatus.loading}
              className="btn btn-primary"
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
              title="Trigger CodeQL scans on all repositories"
            >
              {scanStatus.loading ? 'Triggering...' : 'Trigger All Scans'}
            </button>
            <button
              onClick={handleFetchData}
              disabled={scanStatus.loading}
              className="btn btn-secondary"
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
              title="Fetch latest results from GitHub"
            >
              {scanStatus.loading ? 'Fetching...' : 'Fetch Latest Data'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: '500' }}>Time Range:</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Repositories</h3>
          <div className="value">{summary?.repositories?.total || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Repositories with CodeQL</h3>
          <div className="value">{summary?.repositories?.with_codeql || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Total Analyses</h3>
          <div className="value">{summary?.analyses?.total || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Total Alerts</h3>
          <div className="value">{summary?.alerts?.total || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div className="card">
          <h2>Alerts by Severity</h2>
          {severityData.length > 0 ? (
            <PieChart width={400} height={300}>
              <Pie
                data={severityData}
                cx={200}
                cy={150}
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSeverityColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <p>No data available</p>
          )}
        </div>

        <div className="card">
          <h2>Vulnerability Distribution</h2>
          {distribution.length > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: '1rem' }}>
              <BarChart 
                width={400} 
                height={310} 
                data={distribution.map(d => ({ name: d._id, value: d.count }))}
                margin={{ bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </div>
          ) : (
            <p>No data available</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Analysis Trends (Last {days} Days)</h2>
        {trends.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: '1rem' }}>
            <LineChart 
              width={800} 
              height={300} 
              data={trends.map(t => ({ date: t._id, count: t.count, alerts: t.total_alerts }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" name="Analyses" />
              <Line type="monotone" dataKey="alerts" stroke="#82ca9d" name="Total Alerts" />
            </LineChart>
          </div>
        ) : (
          <p>No trend data available</p>
        )}
      </div>
    </div>
  );
}

export default Overview;

