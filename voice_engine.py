import sys
import os
import asyncio
import base64
import json
import numpy as np
import torch
import torchaudio
import librosa
import soundfile as sf

os.environ["COQUI_TOS_AGREED"] = "1"

_orig_torch_load = torch.load
def _safe_torch_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _orig_torch_load(*args, **kwargs)
torch.load = _safe_torch_load

def _patched_torchaudio_load(filepath, **kwargs):
    y, sr = librosa.load(filepath, sr=24000)
    tensor = torch.from_numpy(y).unsqueeze(0).float()
    return tensor, sr

torchaudio.load = _patched_torchaudio_load

def find_sample_file():
    sample_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "voice_sample")
    if not os.path.exists(sample_dir):
        return None, None
    
    latents_path = os.path.join(sample_dir, "sir_latents.pth")
    has_latents = os.path.exists(latents_path)
    
    sample_file = None
    for preferred in ["sir_voice_best.wav", "sir_voice_10s.wav", "sir_voice_enhanced.wav", "sir_voice_trimmed.wav", "sir_voice_sample.wav"]:
        p = os.path.join(sample_dir, preferred)
        if os.path.exists(p):
            sample_file = p
            break
            
    if not sample_file:
        for f in os.listdir(sample_dir):
            if f.lower().endswith(('.mp3', '.wav', '.m4a', '.ogg', '.flac')) and not f.startswith('.'):
                sample_file = os.path.join(sample_dir, f)
                break
                
    return (latents_path if has_latents else None), sample_file

def generate_coqui_xtts(text, latents_path, sample_path, output_path):
    from TTS.api import TTS
    tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False, gpu=False).to("cpu")

    # Use 'en' for English/Latin text so phonemes match letters clearly, or 'hi' for Devanagari script
    lang = "en"
    if any('\u0900' <= c <= '\u097f' for c in text):
        lang = "hi"

    if sample_path and os.path.exists(sample_path):
        tts.tts_to_file(
            text=text,
            speaker_wav=sample_path,
            language=lang,
            file_path=output_path,
            speed=1.0,
            temperature=0.7,
            repetition_penalty=2.0,
            top_p=0.80,
            top_k=50,
        )
    else:
        raise ValueError("No valid speaker sample found for voice cloning.")

async def generate_edge_tts(text, output_path):
    import edge_tts
    if any('\u0c00' <= c <= '\u0c7f' for c in text):
        voice_name = "te-IN-MohanNeural"
    else:
        voice_name = "en-IN-PrabhatNeural"
    communicate = edge_tts.Communicate(text, voice=voice_name, rate="-3%", pitch="-3Hz")
    await communicate.save(output_path)

def post_process_to_ogg(temp_file_path, final_ogg_path):
    y, sr = librosa.load(temp_file_path, sr=24000)
    sf.write(final_ogg_path, y, sr, format='OGG', subtype='OPUS')
    if os.path.exists(temp_file_path):
        os.remove(temp_file_path)
    
    duration = float(len(y) / sr)
    abs_y = np.abs(y)
    chunks = np.array_split(abs_y, 100)
    waveform_bytes = bytes([int(np.clip(np.max(chunk) * 255, 0, 255)) for chunk in chunks])
    waveform_b64 = base64.b64encode(waveform_bytes).decode('utf-8')
    
    return duration, waveform_b64

async def main():
    if len(sys.argv) < 3:
        print("Usage: python3 voice_engine.py <text> <output_path>")
        sys.exit(1)

    text = sys.argv[1]
    final_output_path = sys.argv[2]
    if not final_output_path.endswith('.ogg'):
        final_output_path = os.path.splitext(final_output_path)[0] + '.ogg'

    temp_raw_path = final_output_path + '.tmp.wav'
    latents_path, sample_path = find_sample_file()

    success = False
    if latents_path or sample_path:
        try:
            print(f"Synthesizing cloned Sir voice...", file=sys.stderr)
            generate_coqui_xtts(text, latents_path, sample_path, temp_raw_path)
            success = True
        except Exception as e:
            print(f"Coqui XTTS voice cloning failed ({e}), falling back to Edge-TTS.", file=sys.stderr)

    if not success:
        temp_raw_mp3 = final_output_path + '.tmp.mp3'
        await generate_edge_tts(text, temp_raw_mp3)
        temp_raw_path = temp_raw_mp3

    duration, waveform_b64 = post_process_to_ogg(temp_raw_path, final_output_path)

    result = {
        "status": "success",
        "file": final_output_path,
        "duration": round(duration, 2),
        "waveform": waveform_b64
    }
    print(json.dumps(result))

if __name__ == "__main__":
    asyncio.run(main())



