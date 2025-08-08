# Clipzy - YouTube Video Clipper

A React app that allows users to clip YouTube videos with custom start/end times and aspect ratios.

## Features

- 🔐 Firebase Authentication (Google Sign-in)
- 🎥 YouTube video info fetching
- ✂️ Video clipping with custom time ranges
- 📐 Multiple aspect ratios (16:9, 9:16, 1:1, Original)
- 💾 Automatic download of clipped videos
- 🎨 Modern UI with glassmorphism effects

## Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed on your system

### Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure Firebase:**
   - Update `src/firebase.js` with your Firebase config
   - Enable Google Authentication in Firebase Console

3. **Start the development server:**
```bash
npm run dev
```

This will start both the React frontend (port 3000) and the Express backend (port 3001).

## Usage

1. **Login** with your Google account
2. **Paste a YouTube URL** in the input field
3. **Set start and end times** for your clip
4. **Choose aspect ratio** (16:9, 9:16, 1:1, or Original)
5. **Click the clip button** to download your video

## API Endpoints

- `POST /api/clip-video` - Process video clipping
  - Body: `{ videoId, startTime, endTime, ratio, title, userId, userName }`
  - Returns: Video file download

## Technologies Used

- **Frontend:** React, Firebase Auth, CSS3
- **Backend:** Express.js, ytdl-core, fluent-ffmpeg
- **Video Processing:** FFmpeg
- **Authentication:** Firebase Google Auth

## Project Structure

```
clipzy-app/
├── src/
│   ├── App.js          # Main React component
│   ├── App.css         # Styles
│   └── firebase.js     # Firebase configuration
├── server.js           # Express backend server
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## Troubleshooting

- **FFmpeg not found:** Make sure FFmpeg is installed and in your PATH
- **Authentication errors:** Check Firebase configuration and enable Google Auth
- **Video processing fails:** Ensure the YouTube URL is valid and accessible
- **Disk space issues:** Free up disk space for video processing
