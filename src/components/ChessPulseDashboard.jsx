
import React, { useState, useEffect } from 'react'
import './ChessPulseDashboard.jsx.css'

const ChessPulseDashboard = () => {
    const [tournaments, setTournaments] = useState([])
    const [filteredTournaments, setFilteredTournaments] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [email, setEmail] = useState('')
    const [subStatus, setSubStatus] = useState(null)

    // Using localhost:8000 (standard for the Python backend we just moved)
    const API_URL = 'http://localhost:8000'

    useEffect(() => {
        const fetchTournaments = async () => {
            try {
                const res = await fetch(`${API_URL}/tournaments`)
                if (res.ok) {
                    const data = await res.json()
                    setTournaments(data)
                    setFilteredTournaments(data)
                }
            } catch (err) {
                console.error('Pulse API unreachable:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchTournaments()
    }, [])

    useEffect(() => {
        const query = searchQuery.toLowerCase()
        const filtered = tournaments.filter(t => 
            t.title.toLowerCase().includes(query) || 
            (t.platform && t.platform.toLowerCase().includes(query)) ||
            (t.type && t.type.toLowerCase().includes(query))
        )
        setFilteredTournaments(filtered)
    }, [searchQuery, tournaments])

    const handleSubscribe = async (e) => {
        e.preventDefault()
        setSubStatus('loading')
        try {
            const res = await fetch(`${API_URL}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            if (res.ok) {
                setSubStatus('success')
                setEmail('')
            } else {
                setSubStatus('error')
            }
        } catch (err) {
            setSubStatus('error')
        }
    }

    return (
        <div className="chesspulse-container">
            <header className="chesspulse-header">
                <span className="mission-text">
                    <span className="mission-acronym">P.U.L.S.E</span> • PROACTIVE UNIFIED LIVE STREAMLINED ELITE
                </span>
                <h1 className="chesspulse-title">The Global Chess Pipeline</h1>
                <p className="chesspulse-subtitle">
                    Synthesizing physical and digital tournaments into a single high-momentum heartbeat.
                </p>
            </header>

            <input 
                type="text" 
                placeholder="SEARCH GLOBAL PULSE..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-pulse"
            />

            <section className="tournament-grid">
                {loading ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 0', opacity: 0.5 }}>
                        <div className="pulse-dot" style={{ margin: '0 auto 1.5rem', width: '16px', height: '16px' }}></div>
                        <h2 style={{ letterSpacing: '4px', fontSize: '0.8rem', color: 'var(--teal)' }}>SYNCHRONIZING WITH GLOBAL NODES...</h2>
                    </div>
                ) : filteredTournaments.length > 0 ? filteredTournaments.map((t) => (
                    <div key={t.event_id} className="tournament-card">
                        <div style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {t.platform?.split(' + ').map(p => (
                                    <span key={p} className={`platform-tag ${p.toLowerCase().replace('.', '-') || 'unknown'}`}>
                                        {p}
                                    </span>
                                ))}
                            </div>
                            <span className={`status-badge ${t.status === 'LIVE' ? 'status-live' : ''}`}>
                                {t.status === 'LIVE' && <span className="pulse-dot"></span>}
                                {t.status}
                            </span>
                        </div>

                        <h3 style={{ margin: '0 0 1rem', fontSize: '1.3rem', fontWeight: 900, lineHeight: 1.2 }}>{t.title}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0', fontWeight: 600 }}>
                            {t.type} • {t.participants?.length || 0} Registered
                        </p>
                        
                        <div style={{ marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: '900', marginBottom: '0.5rem' }}>
                                <span style={{ opacity: 0.4, letterSpacing: '1px' }}>HYPE INDEX</span>
                                <span style={{ color: t.hype_score > 80 ? 'var(--accent)' : 'var(--teal)' }}>{t.hype_score}%</span>
                            </div>
                            <div className="hype-meter">
                                <div className="hype-fill" style={{ width: `${t.hype_score}%`, background: t.hype_score > 80 ? 'linear-gradient(90deg, var(--teal), var(--accent))' : 'var(--teal)' }}></div>
                            </div>
                        </div>

                        <button 
                            className="watch-btn" 
                            onClick={() => t.watch_links?.[0] && window.open(t.watch_links[0], '_blank')}
                            disabled={!t.watch_links?.[0]}
                        >
                            {t.status === 'LIVE' ? 'WATCH LIVE' : 'VIEW DETAILS'}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                )) : (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 0', opacity: 0.3 }}>
                        <h2 style={{ letterSpacing: '2px', fontSize: '0.9rem' }}>NO ACTIVE PULSE DETECTED</h2>
                    </div>
                )}
            </section>

            <section className="subscribe-section">
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.5rem' }}>Never Miss a Move.</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Get the Daily Pulse delivered to your inbox every morning at 8:00 AM.</p>
                <form onSubmit={handleSubscribe} style={{ display: 'flex', justifyContent: 'center' }}>
                    <input 
                        type="email" 
                        required 
                        placeholder="Sovereign email address..." 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="sub-input"
                    />
                    <button type="submit" className="sub-btn" disabled={subStatus === 'loading'}>
                        {subStatus === 'loading' ? 'LINKING...' : 'JOIN THE PULSE'}
                    </button>
                </form>
                {subStatus === 'success' && <p style={{ color: 'var(--teal)', marginTop: '1.5rem', fontWeight: 800 }}>PULSING DELIVERY CONFIRMED.</p>}
                {subStatus === 'error' && <p style={{ color: 'var(--accent)', marginTop: '1.5rem', fontWeight: 800 }}>PIPELINE ERROR. TRY AGAIN.</p>}
            </section>

            <footer style={{ marginTop: '4rem', opacity: 0.1, fontSize: '0.65rem', letterSpacing: '2px', fontWeight: 800 }}>
                CHESSPULSE CLUSTER // v0.4.5 INTEGRATED
            </footer>
        </div>
    )
}

export default ChessPulseDashboard
