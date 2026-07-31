#!/usr/bin/env python3
import os
import sys
import argparse
import subprocess
import requests

def download_audio_ytdlp(url, output_filename="audio.mp3"):
    """Downloads audio from Instagram Reels/TikTok/YouTube using yt-dlp CLI."""
    cmd = [
        "yt-dlp",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "5",
        "-o", output_filename,
        url
    ]
    print(f"Executing yt-dlp command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"yt-dlp error: {result.stderr}")
        return False
    return os.path.exists(output_filename)

def transcribe_audio_groq(audio_file_path, groq_api_key):
    """Transcribes MP3 file using Groq Whisper API (whisper-large-v3)."""
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {groq_api_key}"
    }
    
    with open(audio_file_path, "rb") as f:
        files = {
            "file": (audio_file_path, f, "audio/mpeg")
        }
        data = {
            "model": "whisper-large-v3",
            "temperature": "0.0",
            "response_format": "json"
        }
        print(f"Sending audio file {audio_file_path} to Groq Whisper API...")
        response = requests.post(url, headers=headers, files=files, data=data)
        
    if response.status_code == 200:
        res_json = response.json()
        return res_json.get("text", "")
    else:
        print(f"Groq Whisper API error ({response.status_code}): {response.text}")
        return None

def main():
    parser = argparse.ArgumentParser(description="BookmarkAI Hub Audio Extraction Worker")
    parser.add_argument("--url", required=True, help="Social media URL")
    parser.add_argument("--bookmark-id", required=True, help="Bookmark ID in Supabase")
    parser.add_argument("--callback-url", required=True, help="Vercel callback API endpoint")
    parser.add_argument("--groq-key", required=True, help="Groq API key")
    
    args = parser.parse_args()
    
    audio_file = f"audio_{args.bookmark_id}.mp3"
    
    success = download_audio_ytdlp(args.url, audio_file)
    transcript = None
    status = "failed"
    
    if success and os.path.exists(audio_file):
        transcript = transcribe_audio_groq(audio_file, args.groq_key)
        if transcript:
            status = "done"
            print(f"Transcribed Audio Text ({len(transcript)} chars): {transcript[:100]}...")
            
    # Send callback payload to Vercel API
    payload = {
        "bookmark_id": args.bookmark_id,
        "audio_transcript": transcript,
        "status": status
    }
    
    print(f"Sending callback to {args.callback_url}...")
    try:
        res = requests.post(args.callback_url, json=payload, timeout=30)
        print(f"Callback response status: {res.status_code}")
    except Exception as e:
        print(f"Callback failed: {e}")
        
    # Cleanup temp file
    if os.path.exists(audio_file):
        os.remove(audio_file)

if __name__ == "__main__":
    main()
