import React, { useState, useEffect } from 'react';
import './MissionControl.css';

const API_BASE = 'https://victorious-coast-049c93d1e.7.azurestaticapps.net/api';

const MissionControl = () => {
  const [events, setEvents] = useState([]);
  const [presence, setPresence] = useState('Detecting...');
  const [clock, setClock] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${API_BASE}/GetCalendar`);
        const data = await response.json();
        if (data.success && data.events) {
          setEvents(data.events);
        }
      } catch (err) {
        console.error('Failed to sync shifts:', err);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCicd = () => {
    alert('Initiating CI/CD for ATX Let\'s Play...');
  };

  const bdayEvent = events.find(e => e.isBirthday || (e.shift && e.shift.toLowerCase().includes('birthday')) || (e.time && e.time.toLowerCase().includes('may 11')));
  const familyEvent = events.find(e => e.time && (e.time.toLowerCase().includes('may 16') || e.time.toLowerCase().includes('may 17')));

  return (
    <div className="mission-control-container">
      <header className="mission-header">
        <div className="header-left">
          <div className="mc-logo">A.R.C</div>
          <div className="mc-titles">
            <h1>Automated Resource Command</h1>
            <p className="mc-subtitle">Unified Repository Node // Multi-Cloud Security</p>
          </div>
        </div>
        <div className="header-right">
          <div className="presence-status">
            <span className="pulse-dot"></span>
            Presence: <span className="val">{presence}</span>
          </div>
        </div>
      </header>

      <main className="mission-grid">
        {/* Section 1: DevOps Toggle */}
        <section className="mc-module devops-module">
          <div className="module-title">
            <h2>DevOps Toggle</h2>
            <span className="live-tag">LIVE ENCLAVE</span>
          </div>
          <div className="mc-button-stack">
            <button className="mc-btn sprint" onClick={() => alert('72H Sprint Mode Active')}>
              <span className="icon">🏃</span>
              72H SPRINT
            </button>
            <button className="mc-btn health" onClick={() => alert('Azure Health: NOMINAL')}>
              <span className="icon">☁️</span>
              AZURE HEALTH
            </button>
            <button className="mc-btn cicd" onClick={handleCicd}>
              <span className="icon">🚀</span>
              TRIGGER CI/CD
            </button>
          </div>
        </section>

        {/* Section 2: Study Sync */}
        <section className="mc-module study-module">
          <div className="module-title">
            <h2>Study Sync</h2>
            <span className="meta-label">YMCA // AZ-900</span>
          </div>
          <div className="mc-alert-stack">
            {bdayEvent && (
              <div className="mc-alert bday">
                <div className="alert-icon">🎂</div>
                <div className="alert-text">
                  <h3>Mission: Birthday Breakout</h3>
                  <p>Status: {bdayEvent.status || 'Seeking Cover'}</p>
                </div>
                <div className="alert-percent">{bdayEvent.progress || 50}%</div>
              </div>
            )}
            {familyEvent && (
              <div className="mc-alert family">
                <div className="alert-icon">🏠</div>
                <div className="alert-text">
                  <h3>Mission: Family Arrival</h3>
                  <p>Status: {familyEvent.status || 'Clearing Weekend'}</p>
                </div>
                <div className="alert-percent">{familyEvent.progress || 50}%</div>
              </div>
            )}
          </div>
          <div className="mc-days-list">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => {
              const event = events.find(e => e.day.toUpperCase() === day);
              return (
                <div key={day} className={`mc-day-card ${event?.progress === 100 ? 'active' : ''}`}>
                  <div className="day-top">
                    <span className="day-name">{day}</span>
                    <span className="shift-time">{event?.shift || 'OFF'}</span>
                  </div>
                  <div className="mc-progress-track">
                    <div className="mc-progress-bar" style={{ width: `${event?.progress || 0}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Telemetry */}
        <section className="mc-module tele-module">
          <div className="module-title">
            <h2>System Telemetry</h2>
          </div>
          <div className="tele-stats">
            <div className="stat-row">
              <span>AZ-900</span>
              <span className="stat-val">25%</span>
            </div>
            <div className="stat-row">
              <span>AI-900</span>
              <span className="stat-val">10%</span>
            </div>
            <div className="stat-row">
              <span>PL-900</span>
              <span className="stat-val">5%</span>
            </div>
          </div>
          <button 
            className="mc-btn verify-portal-btn" 
            onClick={() => window.open('https://ironclad-verify-portal.web.app', '_blank')}
            style={{ marginTop: '20px', borderColor: 'var(--teal)', color: 'var(--teal)' }}
          >
            <span className="icon">🛡️</span>
            VERIFY ASSETS
          </button>
          <div className="mc-clock">{clock}</div>
        </section>
      </main>
    </div>
  );
};

export default MissionControl;
