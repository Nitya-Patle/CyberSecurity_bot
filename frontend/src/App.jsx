import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import AuthModal from './AuthModal'
import './App.css'

const DEFAULT_WELCOME = {
  role: 'bot',
  content: 'Hello! I am **CyberSentinel**, your AI cybersecurity assistant.\n\nAsk me anything about phishing, malware, incident response, or online safety.'
};

function createSession() {
  return {
    id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title: 'New Chat',
    messages: [DEFAULT_WELCOME],
    createdAt: Date.now()
  };
}

function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cybersentinel_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  });

  const getStorageKeys = (user) => ({
    sessionsKey: user ? `cybersentinel_sessions_${user.id}` : 'cybersentinel_sessions_guest',
    activeIdKey: user ? `cybersentinel_active_id_${user.id}` : 'cybersentinel_active_id_guest'
  });

  const [sessions, setSessions] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cybersentinel_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      const key = user ? `cybersentinel_sessions_${user.id}` : 'cybersentinel_sessions_guest';
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [createSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cybersentinel_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      const key = user ? `cybersentinel_active_id_${user.id}` : 'cybersentinel_active_id_guest';
      const savedId = localStorage.getItem(key);
      if (savedId) return savedId;
    } catch (e) {
      console.error(e);
    }
    return sessions[0]?.id || '';
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // URL scanner modal state
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlToScanInput, setUrlToScanInput] = useState('');
  const [isScanningUrl, setIsScanningUrl] = useState(false);

  const messagesEndRef = useRef(null);

  // Sync sessions to user-scoped localStorage
  useEffect(() => {
    if (!currentUser) return;
    try {
      const keys = getStorageKeys(currentUser);
      localStorage.setItem(keys.sessionsKey, JSON.stringify(sessions));
    } catch (e) {
      console.error(e);
    }
  }, [sessions, currentUser]);

  // Sync activeSessionId to user-scoped localStorage
  useEffect(() => {
    if (!currentUser) return;
    try {
      if (activeSessionId) {
        const keys = getStorageKeys(currentUser);
        localStorage.setItem(keys.activeIdKey, activeSessionId);
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeSessionId, currentUser]);

  const handleAuthSuccess = ({ token, user }) => {
    localStorage.setItem('cybersentinel_token', token);
    localStorage.setItem('cybersentinel_user', JSON.stringify(user));
    setCurrentUser(user);

    const keys = getStorageKeys(user);
    try {
      const saved = localStorage.getItem(keys.sessionsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          const savedActiveId = localStorage.getItem(keys.activeIdKey);
          setActiveSessionId(savedActiveId && parsed.some(s => s.id === savedActiveId) ? savedActiveId : parsed[0].id);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    const fresh = createSession();
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
  };

  const handleSignOut = () => {
    localStorage.removeItem('cybersentinel_token');
    localStorage.removeItem('cybersentinel_user');
    setCurrentUser(null);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || createSession();
  const currentMessages = activeSession.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, isLoading]);

  const handleNewChat = () => {
    const newSession = createSession();
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleSelectSession = (id) => {
    setActiveSessionId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = (e, idToDelete) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      const fresh = createSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      return;
    }
    const updated = sessions.filter(s => s.id !== idToDelete);
    setSessions(updated);
    if (activeSessionId === idToDelete) {
      setActiveSessionId(updated[0].id);
    }
  };

  const handleClearAllChats = () => {
    if (window.confirm('Clear all chat history?')) {
      const fresh = createSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    }
  };

  const handleSendMessage = async (e, textOverride) => {
    if (e) e.preventDefault();
    const textToSend = (textOverride || inputValue).trim();
    if (!textToSend || isLoading) return;

    const userMessage = { role: 'user', content: textToSend };
    
    // Auto title if it's the first question
    let updatedTitle = activeSession.title;
    if (activeSession.title === 'New Chat') {
      updatedTitle = textToSend.length > 26 ? textToSend.substring(0, 26) + '...' : textToSend;
    }

    // Build history for backend multi-turn context
    const historyPayload = currentMessages
      .filter(m => m.role === 'user' || m.role === 'bot')
      .map(m => ({ role: m.role, content: m.content || '' }));

    const updatedMessages = [...currentMessages, userMessage];
    
    // Optimistically update session
    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          title: updatedTitle,
          messages: updatedMessages,
          updatedAt: Date.now()
        };
      }
      return s;
    }));

    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload
        }),
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      const botMessage = { role: 'bot', content: data.response };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [...updatedMessages, botMessage],
            updatedAt: Date.now()
          };
        }
        return s;
      }));
    } catch (error) {
      console.error('Error fetching chat response:', error);
      const errorMsg = {
        role: 'bot',
        content: '⚠️ Error communicating with CyberSentinel backend on `http://localhost:8001`. Please check if the backend server is running.'
      };
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [...updatedMessages, errorMsg],
            updatedAt: Date.now()
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const executeScanUrl = async (e) => {
    e.preventDefault();
    const targetUrl = urlToScanInput.trim();
    if (!targetUrl || isScanningUrl) return;

    setIsScanningUrl(true);
    const userScanMsg = { role: 'user', content: `Please scan this URL for threats: ${targetUrl}` };

    let updatedTitle = activeSession.title;
    if (activeSession.title === 'New Chat') {
      updatedTitle = `Scan: ${targetUrl.slice(0, 20)}`;
    }

    const updatedWithUser = [...currentMessages, userScanMsg];
    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          title: updatedTitle,
          messages: updatedWithUser,
          updatedAt: Date.now()
        };
      }
      return s;
    }));

    setIsUrlModalOpen(false);
    setUrlToScanInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8001/api/scan-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!response.ok) throw new Error('Scan failed');
      const data = await response.json();

      const scanResultMsg = {
        role: 'bot',
        isScanResult: true,
        url: targetUrl,
        verdict: data.verdict,
        confidence: data.confidence,
        reasons: data.reasons,
        source: data.source
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [...updatedWithUser, scanResultMsg],
            updatedAt: Date.now()
          };
        }
        return s;
      }));
    } catch (err) {
      console.error(err);
      const botErr = {
        role: 'bot',
        content: '⚠️ URL scanning service encountered an issue. Please try again.'
      };
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [...updatedWithUser, botErr],
            updatedAt: Date.now()
          };
        }
        return s;
      }));
    } finally {
      setIsScanningUrl(false);
      setIsLoading(false);
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.isScanResult) {
      const isSafe = msg.verdict === 'safe';
      const isSuspicious = msg.verdict === 'suspicious';
      const badgeColor = isSafe ? '#10b981' : isSuspicious ? '#f59e0b' : '#ef4444';
      const icon = isSafe ? '🛡️' : isSuspicious ? '⚠️' : '🚨';

      return (
        <div className="scan-card">
          <div className="scan-card-top">
            <div className="scan-card-title">{icon} URL Threat Analysis</div>
            <div className="scan-badge" style={{ backgroundColor: badgeColor }}>
              {msg.verdict.toUpperCase()} ({msg.confidence}% Confidence)
            </div>
          </div>
          <p className="scan-target"><strong>Target:</strong> <code>{msg.url}</code></p>
          <div className="scan-reasons">
            <strong>Indicators:</strong>
            <ul>
              {msg.reasons && msg.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
          <p className="scan-source"><small>Engine: {msg.source}</small></p>
          <hr />
          <p className="disclaimer"><em>Automated scan result for cybersecurity triage & awareness.</em></p>
        </div>
      );
    }
    return <ReactMarkdown>{msg.content}</ReactMarkdown>;
  };

  if (!currentUser) {
    return <AuthModal onAuthSuccess={handleAuthSuccess} />;
  }

  const userInitials = currentUser?.name 
    ? currentUser.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'CS';

  return (
    <div className="layout-root">
      {/* ChatGPT-style Left Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="brand-title">
            <span className="brand-icon">🛡️</span>
            <span className="brand-text">CyberSentinel</span>
          </div>
          <button 
            className="sidebar-close-btn" 
            title="Collapse sidebar" 
            onClick={() => setIsSidebarOpen(false)}
          >
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="18" width="18">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <button className="new-chat-btn" onClick={handleNewChat}>
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="16" width="16">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>

        {/* Saved Sessions List */}
        <div className="sessions-section">
          <div className="section-label">Recents</div>
          <div className="sessions-list">
            {sessions.map(s => (
              <div 
                key={s.id} 
                className={`session-item ${s.id === activeSessionId ? 'active' : ''}`}
                onClick={() => handleSelectSession(s.id)}
              >
                <div className="session-icon">
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="16" width="16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="session-title" title={s.title}>{s.title}</span>
                <button 
                  className="delete-session-btn" 
                  title="Delete chat"
                  onClick={(e) => handleDeleteSession(e, s.id)}
                >
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="14" width="14">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer / User Profile & Logout */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar-badge">{userInitials}</div>
            <div className="user-details">
              <span className="user-name" title={currentUser?.name}>{currentUser?.name || 'Security Analyst'}</span>
              <span className="user-status" title={currentUser?.email}>{currentUser?.email || 'Verified User'}</span>
            </div>
          </div>
          <div className="sidebar-footer-actions">
            <button className="signout-btn" onClick={handleSignOut} title="Sign Out of CyberSentinel">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="15" width="15">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <button className="clear-all-btn" onClick={handleClearAllChats} title="Clear all history">
              Clear
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Navbar */}
        <header className="header">
          <div className="header-left">
            {!isSidebarOpen && (
              <button 
                className="sidebar-toggle-btn" 
                title="Open sidebar"
                onClick={() => setIsSidebarOpen(true)}
              >
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="20" width="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="logo-icon">🛡️</div>
            <div className="header-titles">
              <h1>CyberSentinel</h1>
              <span className="current-chat-name">{activeSession.title}</span>
            </div>
          </div>
          
          <div className="header-right">
            <span className="badge">AI DEFENSE</span>
            <button className="header-action-btn" onClick={() => setIsUrlModalOpen(true)}>
              🔍 Scan URL
            </button>
            <button className="header-new-btn" onClick={handleNewChat} title="New chat">
              + New
            </button>
            <button className="header-signout-btn" onClick={handleSignOut} title="Sign Out">
              Sign Out
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <main className="chat-container">
          <div className="chat-inner">
            {currentMessages.map((msg, index) => (
              <div key={index} className={`message-wrapper ${msg.role}`}>
                {msg.role === 'bot' && <div className="avatar bot-avatar">🤖</div>}
                <div className="message">
                  {renderMessageContent(msg)}
                </div>
                {msg.role === 'user' && <div className="avatar user-avatar">👤</div>}
              </div>
            ))}

            {isLoading && (
              <div className="message-wrapper bot">
                <div className="avatar bot-avatar">🤖</div>
                <div className="message typing-indicator">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Bar & Suggestion Chips */}
        <div className="input-container">
          <div className="input-inner">
            <div className="quick-actions">
              <button className="chip" onClick={() => setIsUrlModalOpen(true)}>
                🔍 Check a URL
              </button>
              <button className="chip" onClick={() => handleSendMessage(null, "How do I recognize a phishing email or SMS?")}>
                📧 Phishing Check
              </button>
              <button className="chip" onClick={() => handleSendMessage(null, "I clicked a suspicious link! What steps should I take right now?")}>
                🚨 I Clicked a Suspicious Link
              </button>
              <button className="chip" onClick={() => handleSendMessage(null, "What are the essential password hygiene practices?")}>
                🔑 Password Safety
              </button>
            </div>

            <form className="input-area" onSubmit={handleSendMessage}>
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask CyberSentinel a question or request threat analysis..."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !inputValue.trim()} title="Send message">
                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M48 448l416-192L48 64v149.333L346 256 48 298.667z"></path>
                </svg>
              </button>
            </form>
            <div className="input-footer-note">
              CyberSentinel maintains conversation memory across each session.
            </div>
          </div>
        </div>
      </div>

      {/* URL Scanner Modal Dialog */}
      {isUrlModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsUrlModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 Scan Target URL for Threats</h3>
              <button className="modal-close" onClick={() => setIsUrlModalOpen(false)}>✕</button>
            </div>
            <p className="modal-subtitle">
              Analyzes domain structure, heuristic red flags, and threat intelligence.
            </p>
            <form onSubmit={executeScanUrl}>
              <input 
                type="text"
                placeholder="https://suspicious-banking-login.xyz"
                value={urlToScanInput}
                onChange={e => setUrlToScanInput(e.target.value)}
                className="modal-input"
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsUrlModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!urlToScanInput.trim() || isScanningUrl}>
                  {isScanningUrl ? 'Scanning...' : 'Analyze Threat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
