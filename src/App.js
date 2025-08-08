import React, { useState, useEffect, useCallback } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase';
import './App.css';

function App() {
  console.log('App component rendering');
  
  // Simple test to see if component renders at all
  const [testState, setTestState] = useState('App is loading...');
  
  useEffect(() => {
    console.log('App useEffect running');
    setTestState('App loaded successfully!');
  }, []);
  
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('00:00:10');
  const [ratio, setRatio] = useState('Original');
  const [videoInfo, setVideoInfo] = useState(null);
  // const [isLoading, setIsLoading] = useState(false);
  const [isClipLoading, setIsClipLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userClipCount, setUserClipCount] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const ratioOptions = ['Original', '16:9', '9:16', '1:1'];

  // Firebase auth state listener
  useEffect(() => {
    try {
      console.log('Setting up Firebase auth listener');
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'No user');
        setUser(user);
        setAuthLoading(false);
        if (user) {
          // Load user's clip count from localStorage
          const savedCount = localStorage.getItem(`clipCount_${user.uid}`);
          setUserClipCount(savedCount ? parseInt(savedCount) : 0);
        } else {
          setUserClipCount(0);
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up Firebase auth:', error);
      setAuthLoading(false);
    }
  }, []);

  // Google login handler
  const handleGoogleLogin = async () => {
    try {
      console.log('Starting Google login...');
      console.log('Auth object:', auth);
      console.log('Google provider:', googleProvider);
      console.log('Firebase config:', auth.app.options);
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Login successful:', result.user.displayName);
      setShowLoginPopup(false);
    } catch (error) {
      console.error('Login error details:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User closed the popup');
      } else if (error.code === 'auth/popup-blocked') {
        console.log('Popup was blocked by browser');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('Multiple popup requests');
      } else if (error.code === 'auth/unauthorized-domain') {
        console.log('Domain not authorized in Firebase console');
      } else if (error.code === 'auth/operation-not-allowed') {
        console.log('Google Sign-In not enabled in Firebase console');
      }
    }
  };



  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to increment clip count
  const incrementClipCount = () => {
    if (user) {
      const newCount = userClipCount + 1;
      setUserClipCount(newCount);
      localStorage.setItem(`clipCount_${user.uid}`, newCount.toString());
    }
  };

  // Function to reset clip count (for testing)
  // const resetClipCount = () => {
  //   if (user) {
  //     setUserClipCount(0);
  //     localStorage.removeItem(`clipCount_${user.uid}`);
  //   }
  // };

  // Function to get ratio icon
  const getRatioIcon = (ratio) => {
    switch (ratio) {
      case '16:9':
        return (
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="1" y="1" width="14" height="10" rx="1"/>
            <line x1="4" y1="4" x2="12" y2="4"/>
            <line x1="4" y1="6" x2="12" y2="6"/>
            <line x1="4" y1="8" x2="12" y2="8"/>
          </svg>
        );
      case '9:16':
        return (
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="1" y="1" width="10" height="14" rx="1"/>
            <line x1="3" y1="4" x2="9" y2="4"/>
            <line x1="3" y1="7" x2="9" y2="7"/>
            <line x1="3" y1="10" x2="9" y2="10"/>
            <line x1="3" y1="13" x2="9" y2="13"/>
          </svg>
        );
      case '1:1':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="1" y="1" width="12" height="12" rx="1"/>
            <line x1="4" y1="4" x2="10" y2="4"/>
            <line x1="4" y1="7" x2="10" y2="7"/>
            <line x1="4" y1="10" x2="10" y2="10"/>
          </svg>
        );
      default:
        return null; // No icon for Original
    }
  };

  const extractVideoId = (url) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const fetchVideoInfo = async (videoId) => {
    try {
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await response.json();
      
      if (data.title) {
        setVideoInfo({
          title: data.title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`,
          videoId: videoId
        });
      } else {
        setVideoInfo({
          title: `YouTube Video (ID: ${videoId})`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`,
          videoId: videoId
        });
      }
    } catch (error) {
      console.error('Error fetching video info:', error);
      setVideoInfo({
        title: `YouTube Video (ID: ${videoId})`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`,
        videoId: videoId
      });
    }
  };

  const debouncedFetchVideoInfo = useCallback((videoId) => {
    let timeoutId;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fetchVideoInfo(videoId);
    }, 500); // 500ms delay
  }, []);

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setYoutubeUrl(newUrl);
    
    // Remove video info when URL is cleared
    if (!newUrl.trim()) {
      setVideoInfo(null);
      return;
    }

    // Extract video ID and fetch info with debouncing
    const videoId = extractVideoId(newUrl);
    if (videoId) {
      debouncedFetchVideoInfo(videoId);
    }
  };

  const handleClip = async () => {
    if (!youtubeUrl) return;
    
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      console.log('Please enter a valid YouTube URL');
      return;
    }

    if (!user) {
      console.log('Please login to clip videos');
      setShowLoginPopup(true);
      return;
    }

    // Validate time inputs
    const startTimeSeconds = timeToSeconds(startTime);
    const endTimeSeconds = timeToSeconds(endTime);
    
    if (startTimeSeconds >= endTimeSeconds) {
      console.log('End time must be greater than start time');
      return;
    }

    setIsClipLoading(true);
    setProgressMessage('Preparing your clip...');
    
    try {
      // Create clip data
      const clipData = {
        videoId: videoId,
        startTime: startTime,
        endTime: endTime,
        ratio: ratio,
        title: videoInfo?.title || 'YouTube Video',
        userId: user.uid,
        userName: user.displayName
      };

      // Simulate progress steps
      const progressSteps = [
        'Downloading video from YouTube...',
        'Processing video with FFmpeg...',
        'Applying aspect ratio...',
        'Creating your clip...',
        'Preparing download...'
      ];
      
      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          setProgressMessage(progressSteps[currentStep]);
          currentStep++;
        }
      }, 2000); // Change message every 2 seconds
      
      // Call backend API to process the clip
      const response = await fetch('/api/clip-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clipData)
      });

      clearInterval(progressInterval);

      if (response.ok) {
        setProgressMessage('Downloading your clip...');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clip_${videoId}_${startTime.replace(/:/g, '-')}_${endTime.replace(/:/g, '-')}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setTimeout(() => {
          console.log('Clip downloaded successfully!');
          incrementClipCount(); // Increment clip count after successful download
          setProgressMessage('');
        }, 1000);
      } else {
        const error = await response.text();
        console.log(`Error creating clip: ${error}`);
        setProgressMessage('Error creating clip. Please try again.');
      }
    } catch (error) {
      console.error('Error creating clip:', error);
      console.log('Error creating clip. Please try again.');
      setProgressMessage('Error creating clip. Please try again.');
    } finally {
      setIsClipLoading(false);
    }
  };

  // Helper function to convert time string to seconds
  const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(timeStr) || 0;
  };

  return (
    <div className="App">
      {/* Test render to see if component loads */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        background: 'red', 
        color: 'white', 
        padding: '10px', 
        zIndex: 9999 
      }}>
        {testState}
      </div>
      
      <div className="login-button">
        {!authLoading && (
          user ? (
            <div className="user-info">
              <span className="user-name">{user.displayName}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowLoginPopup(true)}>
              Login
            </button>
          )
        )}
      </div>
      
      <div className="hero-text">
        <h1>Clip Fast. Go Viral Faster.</h1>
        <p>Clipzy is your platform for YT clips. Create viral clips<br />from your favorite moments from videos.</p>
      </div>
      
      {!user && (
        <div className="get-started-section">
          <button className="get-started-btn" onClick={() => setShowLoginPopup(true)}>
            Get Started
          </button>
        </div>
      )}
      
      {user && (
        <div className="clipping-tool">
          {videoInfo && (
            <div className="video-info-card animate-in">
              <div className="video-thumbnail">
                <img src={videoInfo.thumbnail} alt="Video thumbnail" />
              </div>
              <div className="video-title">
                {videoInfo.title}
              </div>
            </div>
          )}
          
          <div className="clipping-interface-card">
            <div className="url-section">
              <input 
                type="text" 
                value={youtubeUrl} 
                onChange={handleUrlChange}
                placeholder="Enter YouTube URL"
                className="url-input"
              />
              <button 
                className={`refresh-btn ${youtubeUrl.trim() ? 'active' : ''}`} 
                onClick={handleClip} 
                disabled={isClipLoading || !youtubeUrl.trim()}
              >
                {isClipLoading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14"/>
                    <path d="m12 5 7 7-7 7"/>
                  </svg>
                )}
              </button>
            </div>
            
            <div className="clipping-controls">
              <div className="control-group">
                <label>Start At</label>
                <input 
                  type="text" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)}
                  className="time-input"
                />
              </div>
              
              <div className="control-group">
                <label>End At</label>
                <input 
                  type="text" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)}
                  className="time-input"
                />
              </div>
              
              <div className="control-group">
                <label>Ratio</label>
                <div className="custom-dropdown">
                  <button 
                    className="dropdown-button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <div className="ratio-display">
                      <span>{ratio}</span>
                      {getRatioIcon(ratio)}
                    </div>
                    <svg 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      className={`dropdown-arrow ${isDropdownOpen ? 'rotated' : ''}`}
                    >
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <div className="dropdown-menu">
                      {ratioOptions.map((option) => (
                        <button
                          key={option}
                          className={`dropdown-item ${option === ratio ? 'active' : ''}`}
                          onClick={() => {
                            setRatio(option);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="ratio-item-display">
                            <span>{option}</span>
                            {getRatioIcon(option)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="stats">
            {isClipLoading ? (
              <div className="progress-message">
                <div className="loading-spinner"></div>
                {progressMessage}
              </div>
            ) : (
              `🔥 ${userClipCount === 0 ? 'Start Creating Viral Clips!' : `${userClipCount} Viral Clips Created`}`
            )}
          </div>
        </div>
      )}

      {!user && (
        <div className="example-image-container">
          <video 
            src="/preview.mp4" 
            className="example-video" 
            autoPlay 
            muted 
            loop 
            playsInline
            preload="auto"
            poster="/example.png"
            onError={(e) => console.error('Video error:', e)}
            onLoadStart={() => console.log('Video loading started')}
            onCanPlay={() => console.log('Video can play')}
          />
        </div>
      )}

      {showLoginPopup && (
        <div className="login-overlay">
          <div className="login-popup">
            <div className="login-header">
              <h2>Welcome Back</h2>
              <button 
                className="close-btn"
                onClick={() => setShowLoginPopup(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18"/>
                  <path d="M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="login-content">
              <div className="social-login-buttons">
                <button className="google-login-btn" onClick={handleGoogleLogin}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

              </div>
              <div className="login-footer">
                <p className="terms-text">By continuing, you agree to our Terms of Service and Privacy Policy</p>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default App;
