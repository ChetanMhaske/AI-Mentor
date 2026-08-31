import os
import sys
from google import genai
from google.genai import types

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    from dotenv import load_dotenv
    load_dotenv("../server/.env")
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found")
        sys.exit(1)

client = genai.Client(api_key=api_key)

try:
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents='Please read this sentence out loud: Hello world, this is a test of Gemini TTS.',
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Aoede"
                    )
                )
            )
        )
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            print("Found inline data!")
            print("Mime type:", part.inline_data.mime_type)
            with open("test_tts.mp3", "wb") as f:
                f.write(part.inline_data.data)
            print("Saved test_tts.mp3")
            sys.exit(0)
    print("No inline data found in response")
except Exception as e:
    print("Error:", e)
    import traceback
    traceback.print_exc()
