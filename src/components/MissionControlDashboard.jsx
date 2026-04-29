import React, { useState, useEffect, useCallback } from 'react'
import './MissionControlDashboard.css'

const MissionControlDashboard = () => {
    const [shifts, setShifts] = useState([])
    const [presence, setPresence] = useState('Detecting...')
    const [loading, setLoading] = useState(true)

    const API_BASE = 'https://victorious-coast-049c93d1e.7.azurestaticapps.net/api'

    const refreshShifts = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/GetCalendar`)
            const data = await response.json()
            if (data.success && data.events) {
                setShifts(data.events)
            }
        } catch (err) {
            console.error('Failed to sync shifts:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refreshShifts()
        const timer = setInterval(refreshShifts, 5 * 60 * 1000)
        return () => clearInterval(timer)
    }, [refreshShifts])

    // Mock presence logic (until IoT node is ported)
    useEffect(() => {
        const timer = setTimeout(() => setPresence('Sovereign Hub Active'), 1500)
        return () => clearTimeout(timer)
    }, [])

    const getShiftClass = (shift) => {
        let classes = 'day-mini'
        if (shift.toUpperCase().includes('DEEP')) classes += ' deep-work'
        if (shift.isToday) classes += ' active'
        return classes
    }

    return (
        <div className="mission-control-container">
            <header className="eth-header">
                <div className="logo-group">
                    <div className="eth-logo">ETH</div>
                    <div className="title-area">
                        <h1>Mission Control</h1>
                        <p className="subtitle">Unified Repository Node // Anti-Grav</p>
                    </div>
                </div>
                <div className="telemetry">
                    <div className="status-badge" id="iot-status">
                        <span className="pulse"></span>
                        Presence: <span id="presence-val">{presence}</span>
                    </div>
                </div>
            </header>

            <main className="eth-grid">
                {/* SECTION A: DEVOPS TOGGLE */}
                <section className="module devops-toggle">
                    <div className="module-header">
                        <h2>DevOps Toggle</h2>
                    </div>
                    <div className="toggle-buttons">
                        <button className="touch-btn sprint-btn">
                            <span className="icon">🏃</span>
                            72H SPRINT
                        </button>
                        <button className="touch-btn health-btn">
                            <span className="icon">☁️</span>
                            AZURE HEALTH
                        </button>
                        <button className="touch-btn cicd-btn" onClick={() => alert('Initiating CI/CD...')}>
                            <span className="icon">🚀</span>
                            TRIGGER CI/CD
                        </button>
                    </div>
                </section>

                {/* SECTION B: STUDY SYNC */}
                <section className="module study-sync">
                    <div className="module-header">
                        <h2>Study Sync</h2>
                        <span className="meta-label">YMCA // AZ-900</span>
                    </div>
                    <div className="schedule-compact">
                        {loading ? (
                            <div className="note-item-skeleton">Syncing vault...</div>
                        ) : (
                            shifts.map((event, idx) => (
                                <div key={idx} className={getShiftClass(event.shift)}>
                                    <div className="shift-main">
                                        <span className="day">{event.day}</span>
                                        <span className="shift">{event.shift}</span>
                                    </div>
                                    <div className="progress-container">
                                        <div 
                                            className="progress-bar" 
                                            style={{ width: `${event.progress || 20}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* SECTION C: CERTIFICATION TRACKER */}
                <section className="module cert-tracker">
                    <div className="module-header">
                        <h2>Certification Path</h2>
                    </div>
                    <div className="cert-stats">
                        <div className="cert-item">
                            <span>AZ-900</span>
                            <div className="progress-container"><div className="progress-bar" style={{ width: '25%' }}></div></div>
                        </div>
                        <div className="cert-item">
                            <span>AI-900</span>
                            <div className="progress-container"><div className="progress-bar" style={{ width: '10%' }}></div></div>
                        </div>
                        <div className="cert-item">
                            <span>PL-900</span>
                            <div className="progress-container"><div className="progress-bar" style={{ width: '5%' }}></div></div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}

export default MissionControlDashboard
