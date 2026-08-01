#!/usr/bin/env python3
import os
import sys
import json
import argparse
import subprocess
import requests

def get_ytdlp_metadata(url):
    """Extracts metadata (description/caption, title, thumbnail) using yt-dlp --dump-json."""
    cmd = ["yt-dlp", "--dump-json", "--no-warnings", url]
    print(f"Extracting metadata via yt-dlp: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0 and result.stdout:
        try:
            data = json.loads(result.stdout)
            caption = data.get("description") or data.get("title") or ""
            thumbnail = data.get("thumbnail") or ""
            return {
                "caption": caption,
                "thumbnail": thumbnail,
                "title": data.get("title") or ""
            }
        except Exception as e:
            print(f"Error parsing yt-dlp JSON: {e}")
    else:
        print(f"yt-dlp metadata extraction notice: {result.stderr}")
    return {}

def download_audio_ytdlp(url, output_filename="audio.mp3"):
    """Downloads audio from Instagram Reels/TikTok/YouTube using yt-dlp CLI."""
    cmd = [
        "yt-dlp",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "5",
        "-o", output_filename,
        "--no-warnings",
        url
    ]
    print(f"Executing yt-dlp audio download: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"yt-dlp audio download notice: {result.stderr}")
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
    parser = argparse.ArgumentParser(description="BookmarkAI Hub Metadata & Audio Extraction Worker")
    parser.add_argument("--url", required=True, help="Social media URL")
    parser.add_argument("--bookmark-id", required=True, help="Bookmark ID in Supabase")
    parser.add_argument("--callback-url", required=True, help="Vercel callback API endpoint")
    parser.add_argument("--groq-key", required=True, help="Groq API key")
    parser.add_argument("--chat-id", required=False, default=None, help="Telegram Chat ID")
    parser.add_argument("--message-id", required=False, default=None, help="Telegram Message ID")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print(f"[WORKER START] Processing URL: {args.url}")
    print(f"[WORKER START] Bookmark ID: {args.bookmark_id}")
    print(f"[WORKER START] Chat ID: {args.chat_id} | Message ID: {args.message_id}")
    print("=" * 60)
    
    # Step 1: Extract Full Caption & Thumbnail via yt-dlp
    print("[WORKER STEP 1] Fetching yt-dlp metadata JSON...")
    meta = get_ytdlp_metadata(args.url)
    caption = meta.get("caption") if meta else None
    thumbnail = meta.get("thumbnail") if meta else None
    
    if caption:
        print(f"[WORKER STEP 1 SUCCESS] Extracted Caption ({len(caption)} chars): {caption[:150]}...")
    else:
        print("[WORKER STEP 1 WARNING] No caption extracted via yt-dlp.")

    if thumbnail:
        print(f"[WORKER STEP 1 SUCCESS] Extracted Thumbnail URL: {thumbnail[:80]}...")
        
    # Step 2: Try Downloading Audio MP3 if available
    print("[WORKER STEP 2] Attempting audio MP3 extraction...")
    audio_file = f"audio_{args.bookmark_id}.mp3"
    audio_success = download_audio_ytdlp(args.url, audio_file)
    transcript = None
    
    if audio_success and os.path.exists(audio_file):
        print("[WORKER STEP 3] Transcribing audio via Groq Whisper API...")
        transcript = transcribe_audio_groq(audio_file, args.groq_key)
        if transcript:
            print(f"[WORKER STEP 3 SUCCESS] Transcribed Text ({len(transcript)} chars): {transcript[:150]}...")
            
    status = "done" if (caption or transcript or thumbnail) else "failed"

    # Send enriched callback payload to Vercel API
    payload = {
        "bookmark_id": args.bookmark_id,
        "caption": caption,
        "thumbnail_url": thumbnail,
        "audio_transcript": transcript,
        "chat_id": args.chat_id,
        "message_id": args.message_id,
        "status": status
    }
    
    print(f"[WORKER STEP 4] Sending enriched callback payload to Vercel: {args.callback_url}...")
    try:
        res = requests.post(args.callback_url, json=payload, timeout=30)
        print(f"[WORKER STEP 4 SUCCESS] Vercel Callback Status: {res.status_code} | Body: {res.text}")
    except Exception as e:
        print(f"[WORKER STEP 4 ERROR] Callback failed: {e}")
        
    # Cleanup temp audio file
    if os.path.exists(audio_file):
        os.remove(audio_file)

    print("=" * 60)
    print("[WORKER FINISHED] Job execution complete.")
    print("=" * 60)

if __name__ == "__main__":
    main()
