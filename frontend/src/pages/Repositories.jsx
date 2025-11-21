import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { repositoriesAPI } from '../services/api';
import '../App.css';

function Repositories() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      const response = await repositoriesAPI.getAll();
      setRepos(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(filter.toLowerCase()) ||
    repo.vulnerability_type?.toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (sortField === 'name' || sortField === 'vulnerability_type' || sortField === 'language') {
      aVal = (aVal || '').toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(filteredRepos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRepos = filteredRepos.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return <div className="loading">Loading repositories...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="container">
      <h1>Repositories</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search repositories..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '300px',
            fontSize: '14px'
          }}
        />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Repositories ({filteredRepos.length})</h2>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.9rem' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                Name <SortIcon field="name" />
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('vulnerability_type')}>
                Vulnerability Type <SortIcon field="vulnerability_type" />
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('language')}>
                Language <SortIcon field="language" />
              </th>
              <th>CodeQL Enabled</th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('last_scan_at')}>
                Last Scan <SortIcon field="last_scan_at" />
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRepos.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                  No repositories found
                </td>
              </tr>
            ) : (
              paginatedRepos.map(repo => (
                <tr key={repo._id}>
                  <td>
                    <strong>{repo.name}</strong>
                    <br />
                    <small style={{ color: '#666' }}>{repo.full_name}</small>
                  </td>
                  <td>{repo.vulnerability_type || 'Other'}</td>
                  <td>{repo.language || 'N/A'}</td>
                  <td>
                    {repo.codeql_enabled ? (
                      <span style={{ color: '#28a745' }}>✓ Enabled</span>
                    ) : (
                      <span style={{ color: '#dc3545' }}>✗ Disabled</span>
                    )}
                  </td>
                  <td>
                    {repo.last_scan_at
                      ? new Date(repo.last_scan_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td>
                    <Link
                      to={`/repositories/${repo._id}`}
                      className="btn btn-primary"
                      style={{ textDecoration: 'none', display: 'inline-block' }}
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Repositories;

