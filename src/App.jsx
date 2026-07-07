import React, { useState, useEffect, useRef } from 'react';
import translations from './translations.json';

const TRACKS = [
  './tracks/Snowboard00000000.mp4',
  './tracks/Snowboard00001365.mp4',
];

export default function App() {
  // Localization state
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('pplayer_lang') || 'en';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Download Tab State
  const [selectedOs, setSelectedOs] = useState('windows');

  // Simulator State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [intervalSetting, setIntervalSetting] = useState(3); // Switch clip every N seconds (default 3 to match screenshot)
  const [countdown, setCountdown] = useState(3);
  const [randomOffsetMode, setRandomOffsetMode] = useState(true);
  const [randomFileMode, setRandomFileMode] = useState(true);
  const [saveListMode, setSaveListMode] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [randomTimerMode, setRandomTimerMode] = useState(true);
  const [trackOffsetPercentage, setTrackOffsetPercentage] = useState(10);
  const [progress, setProgress] = useState(10);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const videoRef = useRef(null);

  // Helper for translated strings
  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  // Smooth language switching
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setIsTransitioning(true);
    setTimeout(() => {
      setLanguage(newLang);
      localStorage.setItem('pplayer_lang', newLang);
      setIsTransitioning(false);
    }, 180);
  };

  // Contact Form Handlers
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      return;
    }
    setContactSubmitting(true);

    // Form ID loaded from environment variables (hidden from GitHub commits)
    const formspreeInput = import.meta.env.VITE_FORMSPREE_ID || "";

    // Extract the Form ID if a full URL was provided
    let formId = formspreeInput.trim();
    if (formId.includes("/")) {
      formId = formId.split("/").pop();
    }

    const isDemoMode = !formId || formId === "YOUR_ID" || formId.toLowerCase().includes("your_id");

    if (isDemoMode) {
      // Local fallback simulator if Formspree ID is not configured
      setTimeout(() => {
        setContactSubmitting(false);
        setContactSuccess(true);
        console.log("Formspree ID not set. Simulated submission:", {
          name: contactName,
          email: contactEmail,
          message: contactMessage
        });
      }, 1200);
      return;
    }

    try {
      const response = await fetch(`https://formspree.io/f/${formId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage
        })
      });

      if (response.ok) {
        setContactSuccess(true);
      } else {
        alert("Failed to send message. Please verify your Formspree ID or try again.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("A network error occurred. Please try again.");
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleContactReset = () => {
    setContactName('');
    setContactEmail('');
    setContactMessage('');
    setContactSuccess(false);
  };

  // Helper to determine the media source to load
  const getVideoSrc = (trackName) => {
    if (!trackName) return '';
    if (trackName.startsWith('./')) {
      return trackName.substring(1); // Converts "./tracks/..." to "/tracks/..."
    }
    if (trackName.startsWith('/')) {
      return trackName;
    }
    return `/tracks/${trackName}`;
  };

  // Helper to extract filename from track path
  const getFilename = (trackPath) => {
    if (!trackPath) return '';
    return trackPath.split('/').pop();
  };

  // Helper to get random interval between 50% and 150% of base setting
  const getRandomInterval = (baseInterval) => {
    const min = Math.max(1, Math.round(baseInterval * 0.5));
    const max = Math.round(baseInterval * 1.5);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Helper to format track elapsed time into HH:MM:SS
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00:00";
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Skip simulation track manually or procedurally
  const triggerRandomShuffle = () => {
    let nextIndex;
    if (randomFileMode) {
      const nextIdx = Math.floor(Math.random() * TRACKS.length);
      nextIndex = nextIdx === currentTrackIndex ? (nextIdx + 1) % TRACKS.length : nextIdx;
    } else {
      nextIndex = (currentTrackIndex + 1) % TRACKS.length;
    }

    const randomPercent = randomOffsetMode ? Math.floor(Math.random() * 65) + 15 : 0;

    setTrackOffsetPercentage(randomPercent);
    setProgress(randomPercent);
    setCurrentTrackIndex(nextIndex);

    const nextInterval = randomTimerMode ? getRandomInterval(intervalSetting) : intervalSetting;
    setCountdown(nextInterval);

    // Apply seek offset to actual HTML5 video element
    if (videoRef.current) {
      if (videoRef.current.duration) {
        videoRef.current.currentTime = (randomPercent / 100) * videoRef.current.duration;
      }
      if (!isPaused) {
        videoRef.current.play().catch(() => { });
      }
    }
  };

  // Simulator interval loop
  useEffect(() => {
    let timerId = null;
    if (!isPaused && timerEnabled) {
      timerId = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            triggerRandomShuffle();
            const nextInterval = randomTimerMode ? getRandomInterval(intervalSetting) : intervalSetting;
            return nextInterval;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isPaused, timerEnabled, intervalSetting, currentTrackIndex, randomOffsetMode, randomTimerMode, randomFileMode]);

  // Adjust timers if settings slider changes
  useEffect(() => {
    setCountdown(intervalSetting);
  }, [intervalSetting]);

  // Sync actual HTML5 video progress indicator
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const duration = videoRef.current.duration;
      const currentTime = videoRef.current.currentTime;
      setElapsedTime(currentTime);
      setProgress((currentTime / duration) * 100);
    }
  };

  const handleTimelineChange = (e) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = (newProgress / 100) * videoRef.current.duration;
    }
  };

  const handleVolumeChange = (e) => {
    const rawVal = parseInt(e.target.value, 10);
    setVolume(rawVal);
    if (videoRef.current) {
      videoRef.current.volume = rawVal / 100;
      videoRef.current.muted = rawVal === 0;
    }
    setIsMuted(rawVal === 0);
  };

  return (
    <>

      {/* Navigation Header */}
      <header className="header-nav">
        <div className="container nav-wrapper">
          <a href="#" className="logo-container">
            <img src="/logo.png" alt="PPlayer logo" className="logo-img" />
            <span className="logo-text">P<span>Player</span></span>
          </a>

          <nav>
            <ul className="nav-menu">
              <li><a href="#preview-simulator" className="nav-link">{t('nav_demo')}</a></li>
              <li><a href="#features" className="nav-link">{t('nav_features')}</a></li>
              <li><a href="#how-it-works" className="nav-link">{t('nav_howitworks')}</a></li>
              <li><a href="#download" className="nav-link">{t('nav_download')}</a></li>
              <li><a href="#support" className="nav-link">{t('nav_support')}</a></li>
              <li><a href="#contact" className="nav-link">{t('nav_contact')}</a></li>
              <li>
                <select
                  className="nav-lang-select"
                  value={language}
                  onChange={handleLanguageChange}
                  aria-label="Language Selector"
                >
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                  <option value="ru">Русский</option>
                  <option value="zh">中文</option>
                </select>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div className={`app-root ${isTransitioning ? 'fade-out' : 'fade-in'}`}>

        {/* Ambient background accent graphics */}
        <div className="ambient-glow-1"></div>
        <div className="ambient-glow-2"></div>

        {/* Hero Section */}
        <section className="hero-section container">
          <div className="hero-content">
            <span className="hero-subtitle">NEXT-GEN COMPILATION MEDIA</span>
            <h1 className="hero-title">{t('hero_title')}</h1>
            <p className="hero-description">{t('hero_subtitle')}</p>
            <div className="hero-actions">
              <a href="#download" className="btn btn-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                {t('btn_download')}
              </a>
              <a href="#preview-simulator" className="btn btn-secondary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                {t('btn_preview')}
              </a>
            </div>
          </div>

          {/* Live Simulator Mockup */}
          <div id="preview-simulator" className="preview-container">
            <div className="mock-player">
              {/* 1. Windows titlebar */}
              <div className="window-titlebar">
                <div className="titlebar-left">
                  <img src="/logo.png" alt="PPlayer Icon" className="titlebar-icon" />
                  <span className="titlebar-text">PPlayer</span>
                </div>
                <div className="titlebar-right">
                  <button aria-label="Minimize Window" className="titlebar-btn">—</button>
                  <button aria-label="Maximize Window" className="titlebar-btn">☐</button>
                  <button aria-label="Close Window" className="titlebar-btn close">✕</button>
                </div>
              </div>

              {/* 2. Main content viewport + sidebar */}
              <div className="window-main-content">
                {/* Left video area */}
                <div className="viewport-container">
                  <video
                    ref={videoRef}
                    src={getVideoSrc(TRACKS[currentTrackIndex])}
                    loop
                    muted={isMuted}
                    autoPlay
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = (trackOffsetPercentage / 100) * videoRef.current.duration;
                      }
                    }}
                    className="viewport-video"
                  />

                  {/* Large countdown overlay in top-left */}
                  {timerEnabled && (
                    <div className="viewport-countdown">
                      {countdown}
                    </div>
                  )}
                </div>

                {/* Right Sidebar: Video List */}
                <div className="sidebar-container">
                  <div className="sidebar-header">
                    <span>{t('preview_playlist')}</span>
                    <span className="sidebar-header-count">{TRACKS.length}</span>
                  </div>
                  <div className="sidebar-playlist">
                    {TRACKS.map((track, index) => (
                      <button
                        key={index}
                        className={`sidebar-playlist-item ${currentTrackIndex === index ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentTrackIndex(index);
                          const randomPct = randomOffsetMode ? Math.floor(Math.random() * 60) + 15 : 0;
                          setTrackOffsetPercentage(randomPct);
                          setProgress(randomPct);
                          if (videoRef.current) {
                            if (videoRef.current.duration) {
                              videoRef.current.currentTime = (randomPct / 100) * videoRef.current.duration;
                            }
                          }
                          const nextInterval = randomTimerMode ? Math.floor(Math.random() * 12) + 3 : intervalSetting;
                          setCountdown(nextInterval);
                        }}
                      >
                        {getFilename(track)}
                      </button>
                    ))}
                  </div>

                  {/* Import buttons */}
                  <div className="sidebar-actions">
                    <button className="sidebar-action-btn">{t('preview_files')}</button>
                    <button className="sidebar-action-btn">{t('preview_folder')}</button>
                    <button className="sidebar-action-btn" onClick={() => {
                      setCurrentTrackIndex(0);
                      setProgress(0);
                      setCountdown(intervalSetting);
                    }}>{t('preview_clear')}</button>
                  </div>

                  {/* Simulated checkboxes */}
                  <div className="sidebar-checkboxes">
                    <label className="sidebar-checkbox-label">
                      <input
                        type="checkbox"
                        checked={randomFileMode}
                        onChange={(e) => setRandomFileMode(e.target.checked)}
                      />
                      {t('preview_random_file')}
                    </label>
                    <label className="sidebar-checkbox-label">
                      <input
                        type="checkbox"
                        checked={randomOffsetMode}
                        onChange={(e) => setRandomOffsetMode(e.target.checked)}
                      />
                      {t('preview_random_position')}
                    </label>
                    <label className="sidebar-checkbox-label">
                      <input
                        type="checkbox"
                        checked={saveListMode}
                        onChange={(e) => setSaveListMode(e.target.checked)}
                      />
                      {t('preview_save_list')}
                    </label>
                  </div>
                </div>
              </div>

              {/* 3. Seeker Timeline (across full width) */}
              <div className="timeline-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress}
                  onChange={handleTimelineChange}
                  className="timeline-slider"
                  style={{
                    background: `linear-gradient(to right, #0078d4 0%, #0078d4 ${progress}%, #3a3a42 ${progress}%, #3a3a42 100%)`
                  }}
                  aria-label="Video Seek Timeline"
                />
              </div>

              {/* 4. Controls row bar */}
              <div className="controls-container">
                {/* Playback buttons */}
                <div className="controls-left">
                  <button
                    className="control-btn"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.play().catch(() => { });
                      }
                      setIsPaused(false);
                    }}
                  >
                    {t('preview_play')}
                  </button>
                  <button
                    className="control-btn"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.pause();
                      }
                      setIsPaused(true);
                    }}
                  >
                    {t('preview_pause')}
                  </button>
                  <button
                    className="control-btn"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.pause();
                        videoRef.current.currentTime = 0;
                      }
                      setIsPaused(true);
                      setProgress(0);
                      setCountdown(intervalSetting);
                    }}
                  >
                    {t('preview_stop')}
                  </button>
                  <button
                    className="control-btn icon-only"
                    title="Previous Clip"
                    onClick={() => {
                      const prevIdx = currentTrackIndex === 0 ? TRACKS.length - 1 : currentTrackIndex - 1;
                      setCurrentTrackIndex(prevIdx);
                    }}
                  >
                    &lt;
                  </button>
                  <button
                    className="control-btn icon-only"
                    title="Next Clip"
                    onClick={triggerRandomShuffle}
                  >
                    &gt;
                  </button>
                  <button className="control-btn icon-only" title="Toggle Projection mode">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="3" width="20" height="12" rx="2" />
                      <path d="M6 19h12v2H6z" />
                    </svg>
                  </button>
                </div>

                {/* Volume & Timer Options */}
                <div className="controls-middle">
                  {/* Audio volume slider */}
                  <div className="volume-group">
                    <button
                      className="volume-icon"
                      onClick={() => {
                        if (videoRef.current) {
                          const nextMute = !isMuted;
                          videoRef.current.muted = nextMute;
                          setIsMuted(nextMute);
                          if (nextMute) {
                            setVolume(0);
                          } else {
                            setVolume(80);
                            videoRef.current.volume = 0.8;
                          }
                        }
                      }}
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" opacity="0.3" />
                          <path d="M19 12c0 2.76-1.81 5.1-4.3 5.92v2.06c3.61-.9 6.3-4.17 6.3-7.98s-2.69-7.08-6.3-7.98v2.06C17.19 6.9 19 9.24 19 12z" opacity="0.3" />
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="volume-slider"
                      aria-label="Volume Slider"
                    />
                  </div>

                  {/* Timer options */}
                  <div className="timer-group">
                    <label className="sidebar-checkbox-label">
                      <input
                        type="checkbox"
                        checked={timerEnabled}
                        onChange={(e) => setTimerEnabled(e.target.checked)}
                      />
                      {t('preview_timer')}
                    </label>
                    <select
                      className="timer-select"
                      value={intervalSetting}
                      onChange={(e) => {
                        const nextVal = parseInt(e.target.value, 10);
                        setIntervalSetting(nextVal);
                        setCountdown(nextVal);
                      }}
                      aria-label="Timer Switch Interval Selection"
                    >
                      <option value="3">3</option>
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                    </select>

                    <label className="sidebar-checkbox-label">
                      <input
                        type="checkbox"
                        checked={randomTimerMode}
                        onChange={(e) => setRandomTimerMode(e.target.checked)}
                      />
                      {t('preview_random_timer')}
                    </label>
                  </div>
                </div>

                {/* Time display & Settings */}
                <div className="controls-right">
                  <span className="time-display">{formatTime(elapsedTime)}</span>
                  <button className="settings-btn" title="Settings Menu">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                    </svg>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Features Grid Section */}
        <section id="features" className="features-section">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">ENGINEERING METRIC</span>
              <h2 className="section-title">{t('features_title')}</h2>
              <p className="section-subtitle">{t('features_subtitle')}</p>
            </div>

            <div className="features-grid">
              <div className="glass-card feature-card">
                <div className="feature-icon-wrapper">🔄</div>
                <h3>{t('f1_title')}</h3>
                <p>{t('f1_desc')}</p>
              </div>

              <div className="glass-card feature-card">
                <div className="feature-icon-wrapper">📍</div>
                <h3>{t('f2_title')}</h3>
                <p>{t('f2_desc')}</p>
              </div>

              <div className="glass-card feature-card">
                <div className="feature-icon-wrapper">⏱️</div>
                <h3>{t('f3_title')}</h3>
                <p>{t('f3_desc')}</p>
              </div>

              <div className="glass-card feature-card">
                <div className="feature-icon-wrapper">📦</div>
                <h3>{t('f4_title')}</h3>
                <p>{t('f4_desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="howitworks-section">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">GUIDELINES</span>
              <h2 className="section-title">{t('hiw_title')}</h2>
              <p className="section-subtitle">{t('hiw_subtitle')}</p>
            </div>

            <div className="steps-container">
              <div className="step-card">
                <span className="step-number">01</span>
                <h3 className="step-title">{t('hiw_s1_title')}</h3>
                <p className="step-desc">{t('hiw_s1_desc')}</p>
              </div>

              <div className="step-card">
                <span className="step-number">02</span>
                <h3 className="step-title">{t('hiw_s2_title')}</h3>
                <p className="step-desc">{t('hiw_s2_desc')}</p>
              </div>

              <div className="step-card">
                <span className="step-number">03</span>
                <h3 className="step-title">{t('hiw_s3_title')}</h3>
                <p className="step-desc">{t('hiw_s3_desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Download and Tabbed Setup Selection */}
        <section id="download" className="download-section">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">COMPILATION BUILDS</span>
              <h2 className="section-title">{t('dl_title')}</h2>
              <p className="section-subtitle">{t('dl_subtitle')}</p>
            </div>

            <div className="download-panel-wrapper" id="download-panel">

              {/* Directly Accessible OS Panel */}
              <div className="glass-panel tabs-container" style={{ padding: '2.5rem' }}>
                <div className="tabs-header-wrapper">
                  <ul className="tabs-list">
                    <li>
                      <button
                        type="button"
                        className={`tab-btn ${selectedOs === 'windows' ? 'active' : ''}`}
                        onClick={() => setSelectedOs('windows')}
                      >
                        Windows
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`tab-btn ${selectedOs === 'macos' ? 'active' : ''}`}
                        onClick={() => setSelectedOs('macos')}
                      >
                        macOS
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`tab-btn ${selectedOs === 'linux' ? 'active' : ''}`}
                        onClick={() => setSelectedOs('linux')}
                      >
                        Linux
                      </button>
                    </li>
                  </ul>
                </div>

                {/* Switchable installers details */}
                <div className="tab-content">
                  <div className="os-details">
                    {selectedOs === 'windows' && (
                      <>
                        <h3 className="os-tag">PPlayer <span>for Windows x64</span></h3>
                        <p className="os-desc">{t('dl_windows_desc')}</p>
                        <a href="#download-triggered" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={(e) => { e.preventDefault(); alert("Mock download triggered: pplayer_win_x64.zip"); }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          {t('dl_download_btn')}
                        </a>
                      </>
                    )}
                    {selectedOs === 'macos' && (
                      <>
                        <h3 className="os-tag">PPlayer <span>for macOS (Universal)</span></h3>
                        <p className="os-desc">{t('dl_macos_desc')}</p>
                        <a href="#download-triggered" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={(e) => { e.preventDefault(); alert("Mock download triggered: PPlayer_macOS.dmg"); }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          {t('dl_download_btn')}
                        </a>
                      </>
                    )}
                    {selectedOs === 'linux' && (
                      <>
                        <h3 className="os-tag">PPlayer <span>for Linux x64</span></h3>
                        <p className="os-desc">{t('dl_linux_desc')}</p>
                        <a href="#download-triggered" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={(e) => { e.preventDefault(); alert("Mock download triggered: pplayer_linux_x64.zip"); }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          {t('dl_download_btn')}
                        </a>
                      </>
                    )}
                  </div>

                  {/* Setup Guides block */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="guide-title-tag">{t('dl_guide_title')}</div>

                    {selectedOs === 'windows' && (
                      <pre className="guide-panel" style={{ fontStyle: 'normal' }}>
                        {t('dl_guide_windows')}
                      </pre>
                    )}

                    {selectedOs === 'macos' && (
                      <pre className="guide-panel">
                        {t('dl_guide_macos')}
                      </pre>
                    )}

                    {selectedOs === 'linux' && (
                      <pre className="guide-panel">
                        {t('dl_guide_linux')}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section id="support" className="support-section">
          <div className="container support-grid">

            <div className="support-content-side">
              <span className="section-tag" style={{ color: 'var(--accent-pink)' }}>MONETIZATION</span>
              <h2 className="section-title" style={{ fontSize: '2.5rem' }}>{t('support_title')}</h2>
              <p className="section-subtitle" style={{ margin: '1.5rem 0', fontSize: '1.05rem', lineHeight: '1.7' }}>
                {t('support_subtitle')}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('support_card_footer')}
              </p>
            </div>

            <div className="support-cards-side">
              {(() => {
                const destreamUrl = import.meta.env.VITE_DESTREAM_URL;
                if (!destreamUrl) return null;
                return (
                  <a href={destreamUrl} target="_blank" rel="noopener noreferrer" className="donation-card destream">
                    <div className="dn-info">
                      <div className="dn-logo-circle">💎</div>
                      <div className="dn-text">
                        <span className="dn-name">{t('support_btn_destream')}</span>
                        <span className="dn-action">
                          {destreamUrl.replace("https://", "").replace("www.", "")}
                        </span>
                      </div>
                    </div>
                    <span className="dn-arrow">→</span>
                  </a>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="contact-section">
          <div className="container contact-container">
            <div className="section-header">
              <span className="section-tag">SUPPORT & FEEDBACK</span>
              <h2 className="section-title">{t('contact_title')}</h2>
              <p className="section-subtitle">{t('contact_subtitle')}</p>
            </div>

            <div className="contact-grid">
              {/* Contact Information Cards */}
              <div className="contact-info-column">
                <div className="glass-panel contact-info-card">
                  <div className="info-icon">✉️</div>
                  <div className="info-details">
                    <h4>Email</h4>
                    <a href="mailto:support@pplayer.app" className="info-link">support@pplayer.app</a>
                  </div>
                </div>

                <div className="glass-panel contact-info-card">
                  <div className="info-icon">💻</div>
                  <div className="info-details">
                    <h4>GitHub</h4>
                    <a href="https://github.com/pplayer/pplayer" target="_blank" rel="noopener noreferrer" className="info-link">github.com/pplayer</a>
                  </div>
                </div>
              </div>

              {/* Contact Email Sender Form */}
              <div className="glass-panel contact-form-card">
                {!contactSuccess ? (
                  <form onSubmit={handleContactSubmit} className="contact-form">
                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor="contact-name">{t('contact_name_placeholder')}</label>
                        <input
                          type="text"
                          id="contact-name"
                          className="form-input"
                          placeholder={t('contact_name_placeholder')}
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="contact-email">{t('contact_email_placeholder')}</label>
                        <input
                          type="email"
                          id="contact-email"
                          className="form-input"
                          placeholder={t('contact_email_placeholder')}
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="contact-message">{t('contact_msg_placeholder')}</label>
                      <textarea
                        id="contact-message"
                        className="form-input textarea"
                        placeholder={t('contact_msg_placeholder')}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-submit"
                      disabled={contactSubmitting}
                    >
                      {contactSubmitting ? (
                        <span className="spinner"></span>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                          </svg>
                          {t('contact_btn_send')}
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="contact-success-state">
                    <div className="success-icon-circle">✓</div>
                    <h3 className="success-title">{t('contact_success_title')}</h3>
                    <p className="success-desc">{t('contact_success_desc')}</p>
                    <button
                      type="button"
                      onClick={handleContactReset}
                      className="btn btn-secondary"
                    >
                      {t('contact_success_reset')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="site-footer">
          <div className="container footer-wrapper">
            <div className="footer-copyright">
              &copy; {new Date().getFullYear()} PPlayer. Released under the MIT License.
            </div>
            <ul className="footer-links">
              <li><a href="#features" className="footer-link">{t('nav_features')}</a></li>
              <li><a href="#how-it-works" className="footer-link">{t('nav_howitworks')}</a></li>
              <li><a href="#preview-simulator" className="footer-link">{t('nav_demo')}</a></li>
              <li><a href="#download" className="footer-link">{t('nav_download')}</a></li>
              <li><a href="#contact" className="footer-link">{t('nav_contact')}</a></li>
            </ul>
          </div>
        </footer>

      </div>
    </>
  );
}
