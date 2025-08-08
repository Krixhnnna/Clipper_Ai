const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

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

// Helper function to get video dimensions based on ratio
const getVideoDimensions = (ratio) => {
  switch (ratio) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '9:16':
      return { width: 1080, height: 1920 };
    case '1:1':
      return { width: 1080, height: 1080 };
    default:
      return null; // Original dimensions
  }
};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoId, startTime, endTime, ratio, title } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const startSeconds = timeToSeconds(startTime);
    const endSeconds = timeToSeconds(endTime);
    const duration = endSeconds - startSeconds;

    if (duration <= 0) {
      return res.status(400).json({ error: 'Invalid time range' });
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join('/tmp', 'clipzy');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const inputFile = path.join(tempDir, `${videoId}_input.mp4`);
    const outputFile = path.join(tempDir, `${videoId}_clip.mp4`);

    // Download video with improved error handling
    console.log('Clipzy: Downloading video...');
    
    let downloadSuccess = false;
    
    try {
      // Get video info first to validate
      const info = await ytdl.getInfo(videoUrl, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      });
      console.log('Clipzy: Video info retrieved successfully');
      
      // Get available formats and find the best quality
      const videoFormats = info.formats.filter(format => format.hasVideo);
      const combinedFormats = info.formats.filter(format => format.hasVideo && format.hasAudio);
      const audioFormats = info.formats.filter(format => format.hasAudio && !format.hasVideo);
      const maxQuality = Math.max(...videoFormats.map(f => f.height || 0));
      
      // Prioritize 720p combined format for best quality + audio balance
      let selectedCombinedFormat = combinedFormats.find(f => f.height === 720);
      if (!selectedCombinedFormat) {
        // Fallback to best available if 720p not found
        selectedCombinedFormat = combinedFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
      }
      console.log(`Clipzy: Using combined format: ${selectedCombinedFormat.height}p`);
      
      // Download combined format (which has original audio)
      const videoStream = ytdl.downloadFromInfo(info, { format: selectedCombinedFormat });
      const writeStream = fs.createWriteStream(inputFile);
      
      await new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          console.log(`Clipzy: Download completed with combined format: ${selectedCombinedFormat.height}p`);
          resolve();
        });
        writeStream.on('error', reject);
        videoStream.on('error', reject);
        videoStream.pipe(writeStream);
      });
      
      downloadSuccess = true;
      
    } catch (downloadError) {
      console.error('Clipzy: Download failed:', downloadError.message);
      return res.status(500).json({ 
        error: 'Failed to download video. This might be due to YouTube restrictions or the video being unavailable. Please try a different video.' 
      });
    }

    if (!downloadSuccess) {
      return res.status(500).json({ 
        error: 'Failed to download video. This might be due to YouTube restrictions or the video being unavailable. Please try a different video.' 
      });
    }

    // Process video with ffmpeg
    console.log('Clipzy: Processing video with ratio:', ratio);
    const dimensions = getVideoDimensions(ratio);
    
    // Use the combined file which has both video and audio
    console.log('Clipzy: Using combined file with video and audio:', inputFile);
    
    let ffmpegCommand = ffmpeg(inputFile)
      .setStartTime(startTime)
      .setDuration(duration)
      .outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', '-movflags +faststart']);

    if (dimensions && ratio !== 'Original') {
      console.log('Clipzy: Applying ratio dimensions:', dimensions);
      ffmpegCommand = ffmpegCommand
        .size(`${dimensions.width}x${dimensions.height}`)
        .aspect(dimensions.width / dimensions.height)
        .outputOptions(['-vf', `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=increase,crop=${dimensions.width}:${dimensions.height}`]);
    } else {
      console.log('Clipzy: Keeping original dimensions');
    }

    // Process the video
    await new Promise((resolve, reject) => {
      ffmpegCommand
        .output(outputFile)
        .on('end', () => {
          console.log('Clipzy: Video processing completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('Clipzy: FFmpeg error:', err);
          reject(err);
        })
        .run();
    });

    // Read the processed file and send it
    const videoBuffer = fs.readFileSync(outputFile);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="Clipzy_Clip.mp4"');
    res.setHeader('Content-Length', videoBuffer.length);
    
    // Send the video buffer
    res.send(videoBuffer);
    
    // Clean up temp files
    try {
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    } catch (cleanupError) {
      console.error('Clipzy: Error cleaning up temp files:', cleanupError);
    }

  } catch (error) {
    console.error('Clipzy server error:', error);
    res.status(500).json({ 
      error: 'Clipzy server error. Please try again.' 
    });
  }
};
