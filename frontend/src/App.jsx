import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { DraftProvider } from './context/DraftContext';
import SetupPage from './pages/SetupPage';
import DraftPage from './pages/DraftPage';
import SimulatePage from './pages/SimulatePage';
import { styles } from './styles/styles';

const Layout = ({ children }) => {
  return (
    <div style={styles.appContainer}>
      {/* Premium UCL Broadcast Header */}
      <header style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logoStarball}>
            <Trophy size={28} color="#00f0ff" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.7))' }} />
          </div>
          <h1 style={styles.brandTitle}>
            UCL <span style={{ color: 'var(--cyan-glow)' }}>DRAFT</span> SIMULATOR
          </h1>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.liveBadge}>LIVE</span>
        </div>
      </header>
      {children}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <DraftProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<SetupPage />} />
            <Route path="/draft" element={<DraftPage />} />
            <Route path="/simulate" element={<SimulatePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </DraftProvider>
    </Router>
  );
};

export default App;
