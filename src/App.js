import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  console.log('App component rendering');
  
  const [testState, setTestState] = useState('App is loading...');
  
  useEffect(() => {
    console.log('App useEffect running');
    setTestState('App loaded successfully!');
  }, []);

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
      
      <div style={{ 
        background: 'blue', 
        color: 'white', 
        padding: '20px', 
        margin: '20px',
        fontSize: '24px'
      }}>
        <h1>Clipzy App</h1>
        <p>If you can see this, React is working!</p>
        <p>Test State: {testState}</p>
      </div>
    </div>
  );
}

export default App;
