const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Clip counter for sequential numbering
let clipCounter = 0;

// Middleware
app.use(cors());
app.use(express.json());

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

// Video clipping endpoint for Clipzy
app.post('/api/clip-video', async (req, res) => {
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
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
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
      
      let selectedVideoFormat;
      if (maxQuality > 1080) {
        // If max quality is above 1080p, get 1080p with highest FPS
        const formats1080p = videoFormats.filter(f => f.height === 1080);
        selectedVideoFormat = formats1080p.sort((a, b) => (b.fps || 0) - (a.fps || 0))[0];
        console.log(`Clipzy: Max quality available: ${maxQuality}p, downloading 1080p at ${selectedVideoFormat.fps}fps`);
      } else {
        // Otherwise get the best quality available
        selectedVideoFormat = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
        console.log(`Clipzy: Best available quality: ${selectedVideoFormat.height}p`);
      }
      
      // Best approach: Get highest quality video (1080p max) + highest quality original audio
      console.log('Clipzy: Available video formats:', videoFormats.length);
      console.log('Clipzy: Available audio formats:', audioFormats.length);
      
      // Get best video format (1080p max if available)
      let bestVideoFormat;
      if (maxQuality > 1080) {
        // If max quality is above 1080p, get 1080p with highest FPS
        const formats1080p = videoFormats.filter(f => f.height === 1080);
        bestVideoFormat = formats1080p.length > 0 ? 
          formats1080p.sort((a, b) => (b.fps || 0) - (a.fps || 0))[0] :
          videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
        console.log(`Clipzy: Max quality available: ${maxQuality}p, using 1080p video: ${bestVideoFormat.height}p at ${bestVideoFormat.fps}fps`);
      } else {
        // Get best available quality
        bestVideoFormat = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
        console.log(`Clipzy: Using best available video: ${bestVideoFormat.height}p`);
      }
      
      // Get highest quality original audio (first format is usually original)
      const bestAudioFormat = audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
      console.log(`Clipzy: Using highest quality original audio: ${bestAudioFormat.audioBitrate}kbps`);
      
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
      
      // If it's an age verification error, try with different approach
      if (downloadError.message.includes('Sign in to confirm your age') || 
          downloadError.message.includes('age verification')) {
        console.log('Clipzy: Age verification required, trying alternative approach...');
        try {
          const info = await ytdl.getInfo(videoUrl, {
            requestOptions: {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
              }
            }
          });
          
                     const videoFormats = info.formats.filter(format => format.hasVideo);
           const audioFormats = info.formats.filter(format => format.hasAudio && !format.hasVideo);
           const maxQuality = Math.max(...videoFormats.map(f => f.height || 0));
           
           let selectedVideoFormat;
           if (maxQuality > 1080) {
             // If max quality is above 1080p, get 1080p with highest FPS
             const formats1080p = videoFormats.filter(f => f.height === 1080);
             selectedVideoFormat = formats1080p.sort((a, b) => (b.fps || 0) - (a.fps || 0))[0];
             console.log(`Clipzy: Max quality available (alternative): ${maxQuality}p, downloading 1080p at ${selectedVideoFormat.fps}fps`);
           } else {
             // Otherwise get the best quality available
             selectedVideoFormat = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
             console.log(`Clipzy: Best available quality (alternative): ${selectedVideoFormat.height}p`);
           }
           
           // Get best audio format (original language only)
           console.log('Clipzy: Available audio formats (alternative):', audioFormats.map(f => ({ language: f.language, bitrate: f.audioBitrate })));
           
           // Try to get the original language from video details
           const originalLanguage = info.videoDetails.language || 'en';
           console.log(`Clipzy: Original video language (alternative): ${originalLanguage}`);
           
           // Since all formats show undefined language, we'll use the first audio format (usually the original)
           // and also check if there are any formats with explicit language tags
           const explicitLanguageFormats = audioFormats.filter(format => format.language && format.language !== 'und');
           const bestAudioFormat = explicitLanguageFormats.length > 0 ? 
             explicitLanguageFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0] :
             audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
             
           console.log(`Clipzy: Selected audio format (alternative) - Language: ${bestAudioFormat.language || 'original'}, Bitrate: ${bestAudioFormat.audioBitrate}kbps`);
           
           const videoStream = ytdl.downloadFromInfo(info, { format: selectedVideoFormat });
           const audioStream = ytdl.downloadFromInfo(info, { format: bestAudioFormat });
           
           const videoFile = path.join(tempDir, `${videoId}_video.mp4`);
           const audioFile = path.join(tempDir, `${videoId}_audio.m4a`);
           
           // Download video
           const videoWriteStream = fs.createWriteStream(videoFile);
           await new Promise((resolve, reject) => {
             videoWriteStream.on('finish', resolve);
             videoWriteStream.on('error', reject);
             videoStream.on('error', reject);
             videoStream.pipe(videoWriteStream);
           });
           
           // Download audio
           const audioWriteStream = fs.createWriteStream(audioFile);
           await new Promise((resolve, reject) => {
             audioWriteStream.on('finish', resolve);
             audioWriteStream.on('error', reject);
             audioStream.on('error', reject);
             audioStream.pipe(audioWriteStream);
           });
           
           console.log(`Clipzy: Download completed with ${selectedVideoFormat.height}p video and ${bestAudioFormat.audioBitrate}kbps audio (alternative)`);
           downloadSuccess = true;
          
        } catch (altError) {
          console.error('Clipzy: Alternative approach also failed:', altError.message);
        }
      }
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

    ffmpegCommand
      .output(outputFile)
      .on('end', () => {
        console.log('Clipzy: Video processing completed');
        
        // Generate sequential clip number
        clipCounter++;
        const clipFileName = `Clipzy Clip${clipCounter.toString().padStart(2, '0')}.mp4`;
        
        // Send the file
        res.download(outputFile, clipFileName, (err) => {
          // Clean up temp files
          try {
            if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
            if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
            if (fs.existsSync(path.join(tempDir, `${videoId}_video.mp4`))) fs.unlinkSync(path.join(tempDir, `${videoId}_video.mp4`));
            if (fs.existsSync(path.join(tempDir, `${videoId}_audio.m4a`))) fs.unlinkSync(path.join(tempDir, `${videoId}_audio.m4a`));
          } catch (cleanupError) {
            console.error('Clipzy: Error cleaning up temp files:', cleanupError);
          }
        });
      })
      .on('error', (err) => {
        console.error('Clipzy: FFmpeg error:', err);
        res.status(500).json({ error: 'Error processing video' });
        
        // Clean up temp files
        try {
          if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
          if (fs.existsSync(path.join(tempDir, `${videoId}_video.mp4`))) fs.unlinkSync(path.join(tempDir, `${videoId}_video.mp4`));
          if (fs.existsSync(path.join(tempDir, `${videoId}_audio.m4a`))) fs.unlinkSync(path.join(tempDir, `${videoId}_audio.m4a`));
        } catch (cleanupError) {
          console.error('Clipzy: Error cleaning up temp files:', cleanupError);
        }
      })
      .run();

  } catch (error) {
    console.error('Clipzy server error:', error);
    res.status(500).json({ 
      error: 'Clipzy server error. Please try again.' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Clipzy server is running',
    features: 'Full video clipping enabled'
  });
});

app.listen(PORT, () => {
  console.log(`Clipzy server running on port ${PORT}`);
  console.log('✅ Full video clipping enabled - Ready to process clips!');
}); 