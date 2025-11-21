import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Overview from './pages/Overview';
import Repositories from './pages/Repositories';
import RepositoryDetail from './pages/RepositoryDetail';
import Alerts from './pages/Alerts';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <div className="App">
        <nav className="navbar">
          <div className="container">
            <div className="nav-content">
              <Link to="/" className="nav-logo">
                <span className="logo-icon">🛡️</span>
                <span className="logo-text">ShieldGuard</span>
                <span className="logo-tagline">Security Analytics</span>
              </Link>
              <div className="nav-links">
                <Link to="/">Overview</Link>
                <Link to="/repositories">Repositories</Link>
                <Link to="/alerts">Alerts</Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/repositories" element={<Repositories />} />
            <Route path="/repositories/:id" element={<RepositoryDetail />} />
            <Route path="/alerts" element={<Alerts />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;

