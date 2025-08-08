module.exports = (req, res) => {
  console.log('Health check endpoint called');
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('Health check responding with OK');
  res.json({ 
    status: 'OK', 
    message: 'Clipzy server is running',
    features: 'Full video clipping enabled',
    timestamp: new Date().toISOString()
  });
};
