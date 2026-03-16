#!/usr/bin/env python3
"""
Mandate 60-Second Demo Video Generator
=======================================
Generates a cinematic demo video showing the nightmare of unprotected agent wallets
vs. Mandate's three-layer trust stack.

Usage: python generate.py [--preview] [--vertical]
  --preview: 10fps, 960x540 for fast iteration
  --vertical: 1080x1920 (9:16) instead of 1920x1080
"""

import os
import sys
import math
import random
import struct
import subprocess
import tempfile
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

# ── Config ──────────────────────────────────────────────────────────────────

PREVIEW = "--preview" in sys.argv
VERTICAL = "--vertical" in sys.argv

W, H = (1080, 1920) if VERTICAL else (1920, 1080)
FPS = 10 if PREVIEW else 30
SCALE = 0.5 if PREVIEW else 1.0
if PREVIEW:
    W, H = int(W * SCALE), int(H * SCALE)

BASE_DIR = Path(__file__).parent
FONT_REG = str(BASE_DIR / "fonts" / "JetBrainsMono-Regular.ttf")
FONT_BOLD = str(BASE_DIR / "fonts" / "JetBrainsMono-Bold.ttf")
OUTPUT_DIR = BASE_DIR / "output"
AUDIO_DIR = BASE_DIR / "audio"
FRAMES_DIR = None  # set at runtime (tempdir)

# Colors
BG_DARK = (10, 10, 10)
GREEN_HACK = (0, 255, 0)
GREEN_CALM = (0, 255, 136)
RED_ALERT = (255, 0, 0)
RED_DIM = (200, 40, 40)
WHITE = (255, 255, 255)
MANDATE_BLUE = (51, 136, 255)
GRAY = (120, 120, 120)
YELLOW = (255, 200, 0)
ORANGE = (255, 140, 0)

# ── Module-level state ─────────────────────────────────────────────────────

_vignette_cache = {}
_matrix_columns = None


# ── Font helpers ────────────────────────────────────────────────────────────

def font(size, bold=False):
    s = max(1, int(size * SCALE))
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, s)


def text_size(draw, text, f):
    bbox = draw.textbbox((0, 0), text, font=f)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


# ── Frame helpers ───────────────────────────────────────────────────────────

def blank(color=BG_DARK):
    return Image.new("RGB", (W, H), color)


def center_text(draw, text, y, f, color=WHITE):
    tw, _ = text_size(draw, text, f)
    draw.text(((W - tw) // 2, int(y * SCALE)), text, font=f, fill=color)


def apply_shake(img, intensity=5, zoom=False):
    s = int(intensity * SCALE)
    dx, dy = random.randint(-s, s), random.randint(-s, s)
    bg = blank()
    bg.paste(img, (dx, dy))
    if zoom:
        bg = apply_zoom(bg, 1.0 + intensity * 0.005)
    return bg


def apply_glitch(img, num_slices=5):
    arr = img.copy()
    for _ in range(num_slices):
        y = random.randint(0, H - 20)
        h = random.randint(5, max(6, int(30 * SCALE)))
        dx = random.randint(int(-20 * SCALE), int(20 * SCALE))
        strip = img.crop((0, y, W, y + h))
        arr.paste(strip, (dx, y))
    return arr


def red_flash(img, alpha=0.4):
    overlay = Image.new("RGB", (W, H), RED_ALERT)
    return Image.blend(img, overlay, alpha)


def fade_frame(img, factor):
    """factor 0=black, 1=full brightness"""
    black = blank()
    return Image.blend(black, img, max(0.0, min(1.0, factor)))


def green_border(img, thickness=4):
    draw = ImageDraw.Draw(img)
    t = max(1, int(thickness * SCALE))
    for i in range(t):
        draw.rectangle([i, i, W - 1 - i, H - 1 - i], outline=GREEN_CALM)
    return img


def draw_timestamp(draw, text="3:14 AM", y_offset=30):
    f = font(16)
    draw.text((int(20 * SCALE), int(y_offset * SCALE)), text, font=f, fill=GRAY)


# ── Visual Effects Helpers (A1-A8) ──────────────────────────────────────────

def draw_terminal_chrome(draw, title="terminal", accent=None):
    """A1: Fake macOS terminal title bar with traffic light dots."""
    bar_h = int(36 * SCALE)
    draw.rectangle([0, 0, W, bar_h], fill=(40, 40, 40))
    # traffic lights
    dot_r = max(3, int(7 * SCALE))
    dot_y = bar_h // 2
    colors = [(255, 95, 86), (255, 189, 46), (39, 201, 63)]
    for idx, c in enumerate(colors):
        cx = int((20 + idx * 24) * SCALE)
        draw.ellipse([cx - dot_r, dot_y - dot_r, cx + dot_r, dot_y + dot_r], fill=c)
    # title
    f = font(14)
    tw, _ = text_size(draw, title, f)
    title_color = accent or GRAY
    draw.text(((W - tw) // 2, dot_y - int(7 * SCALE)), title, font=f, fill=title_color)
    # bottom border
    draw.line([(0, bar_h), (W, bar_h)], fill=(60, 60, 60), width=1)


def apply_scanlines(img, opacity=0.06):
    """A2: CRT scanlines — semi-transparent dark horizontal lines every 2px."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    alpha = int(255 * opacity)
    for y in range(0, H, 2):
        draw.line([(0, y), (W, y)], fill=(0, 0, 0, alpha))
    img_rgba = img.convert("RGBA")
    composited = Image.alpha_composite(img_rgba, overlay)
    return composited.convert("RGB")


def apply_vignette(img, strength=0.4):
    """A3: Radial gradient dark corners. Cached mask."""
    key = (W, H, strength)
    if key not in _vignette_cache:
        mask = Image.new("L", (W, H), 255)
        cx, cy = W // 2, H // 2
        max_r = math.sqrt(cx * cx + cy * cy)
        pixels = mask.load()
        for y in range(H):
            for x in range(W):
                r = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                ratio = r / max_r
                # quadratic falloff from center
                v = max(0, int(255 * (1 - strength * ratio * ratio)))
                pixels[x, y] = v
        _vignette_cache[key] = mask
    mask = _vignette_cache[key]
    darkened = Image.new("RGB", (W, H), (0, 0, 0))
    return Image.composite(img, darkened, mask)


def draw_matrix_rain(draw, frame_idx, density=30):
    """A4: Falling green chars as background texture."""
    global _matrix_columns
    if _matrix_columns is None:
        col_w = max(1, int(14 * SCALE))
        n_cols = W // col_w
        _matrix_columns = [random.randint(0, H) for _ in range(n_cols)]
    col_w = max(1, int(14 * SCALE))
    f = font(12)
    chars = "01アイウエオカキクケコ▓▒░"
    drop_speed = max(1, int(4 * SCALE))
    for i, y in enumerate(_matrix_columns):
        x = i * col_w
        if random.random() < 0.03:
            _matrix_columns[i] = 0
        # draw trailing chars
        for j in range(min(density, 12)):
            cy = y - j * int(16 * SCALE)
            if 0 <= cy < H:
                alpha = max(10, 60 - j * 5)
                c = random.choice(chars)
                draw.text((x, cy), c, font=f, fill=(0, alpha + 40, 0))
        _matrix_columns[i] = (y + drop_speed) % (H + int(100 * SCALE))


def apply_chromatic_aberration(img, offset=3):
    """A5: Split RGB channels, shift R left / B right."""
    o = max(1, int(offset * SCALE))
    r, g, b = img.split()
    # shift R channel left, B channel right
    r_shifted = Image.new("L", (W, H), 0)
    r_shifted.paste(r, (-o, 0))
    b_shifted = Image.new("L", (W, H), 0)
    b_shifted.paste(b, (o, 0))
    return Image.merge("RGB", (r_shifted, g, b_shifted))


def apply_zoom(img, factor=1.05):
    """A6: Crop center at 1/factor, resize back to full."""
    if factor <= 1.0:
        return img
    nw = int(W / factor)
    nh = int(H / factor)
    left = (W - nw) // 2
    top = (H - nh) // 2
    cropped = img.crop((left, top, left + nw, top + nh))
    return cropped.resize((W, H), Image.LANCZOS)


def animate_counter(draw, target, progress, x, y, f, color=WHITE):
    """A7: Rapidly spinning numbers settling on final value."""
    if progress >= 1.0:
        draw.text((x, y), target, font=f, fill=color)
        return
    # scramble: replace digits with random ones, settling left to right
    result = []
    for idx, ch in enumerate(target):
        if ch.isdigit():
            settle_at = idx / len(target)
            if progress > settle_at:
                result.append(ch)
            else:
                result.append(str(random.randint(0, 9)))
        else:
            result.append(ch)
    draw.text((x, y), "".join(result), font=f, fill=color)


def draw_text_glow(draw, text, x, y, f, color, glow_color=None, radius=4):
    """Draw text with a glow effect (double-draw approach)."""
    gc = glow_color or tuple(min(255, c + 30) for c in color)
    # draw multiple offset copies for glow
    r = max(1, int(radius * SCALE))
    for dx in range(-r, r + 1, max(1, r)):
        for dy in range(-r, r + 1, max(1, r)):
            draw.text((x + dx, y + dy), text, font=f,
                       fill=tuple(c // 4 for c in gc))
    draw.text((x, y), text, font=f, fill=color)


def screen_flicker(img, intensity=0.15):
    """Brief brightness fluctuation."""
    factor = 1.0 + random.uniform(-intensity, intensity)
    from PIL import ImageEnhance
    enhancer = ImageEnhance.Brightness(img)
    return enhancer.enhance(max(0.3, min(1.5, factor)))


# ── Audio Engine (numpy-based) ──────────────────────────────────────────────

def write_wav(path, samples, sample_rate=44100):
    """Write numpy array as 16-bit mono WAV."""
    if isinstance(samples, list):
        samples = np.array(samples, dtype=np.float64)
    samples = np.clip(samples, -1.0, 1.0)
    data = (samples * 32767).astype(np.int16).tobytes()
    n = len(samples)
    with open(path, "wb") as f:
        data_size = n * 2
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + data_size))
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
        f.write(b"data")
        f.write(struct.pack("<I", data_size))
        f.write(data)


def fm_synth(duration, carrier=220, mod_freq=5, mod_depth=50, sr=44100):
    """B2: FM synthesis for richer timbres."""
    t = np.linspace(0, duration, int(duration * sr), endpoint=False)
    modulator = mod_depth * np.sin(2 * np.pi * mod_freq * t)
    return np.sin(2 * np.pi * (carrier + modulator) * t)


def adsr(n_samples, attack=0.05, decay=0.1, sustain=0.7, release=0.2):
    """B3: ADSR amplitude envelope."""
    env = np.zeros(n_samples)
    a = int(attack * n_samples)
    d = int(decay * n_samples)
    r = int(release * n_samples)
    s_len = max(0, n_samples - a - d - r)

    # attack
    if a > 0:
        env[:a] = np.linspace(0, 1, a)
    # decay
    if d > 0:
        env[a:a + d] = np.linspace(1, sustain, d)
    # sustain
    env[a + d:a + d + s_len] = sustain
    # release
    if r > 0:
        env[a + d + s_len:] = np.linspace(sustain, 0, n_samples - a - d - s_len)
    return env


def pink_noise(duration, sr=44100):
    """B4: Pink noise via cumsum filtering (no scipy)."""
    n = int(duration * sr)
    white = np.random.randn(n)
    # simple cumsum + highpass approximation
    pink = np.cumsum(white)
    # remove DC and low freq buildup
    window = int(sr * 0.01)
    if window > 0:
        # running mean subtraction as highpass
        cumsum = np.cumsum(pink)
        cumsum = np.insert(cumsum, 0, 0)
        running_mean = (cumsum[window:] - cumsum[:-window]) / window
        pink[:len(running_mean)] -= running_mean
    # normalize
    peak = np.max(np.abs(pink))
    if peak > 0:
        pink = pink / peak
    return pink * 0.15


def apply_reverb(signal, decay=0.4, delay_ms=50, sr=44100):
    """B5: Simple reverb via exponential IR convolution."""
    delay_samples = int(delay_ms * sr / 1000)
    ir_len = int(sr * 0.3)  # 300ms IR
    ir = np.zeros(ir_len)
    for i in range(0, ir_len, delay_samples):
        if i < ir_len:
            ir[i] = decay ** (i / delay_samples)
    # convolve (truncate to original length)
    wet = np.convolve(signal, ir)[:len(signal)]
    return signal * 0.7 + wet * 0.3


def gen_impact(duration=0.3, freq=40, sr=44100):
    """B6: Sub-bass impact thud with harmonics."""
    n = int(duration * sr)
    t = np.linspace(0, duration, n, endpoint=False)
    # fundamental + harmonics
    sig = (0.6 * np.sin(2 * np.pi * freq * t) +
           0.3 * np.sin(2 * np.pi * freq * 2 * t) +
           0.15 * np.sin(2 * np.pi * freq * 3 * t))
    # fast decay envelope
    env = np.exp(-t * 15)
    # add noise transient
    noise = np.random.randn(n) * 0.2 * np.exp(-t * 40)
    result = (sig * env + noise)
    # tanh soft-clip
    return np.tanh(result * 2) * 0.8


def gen_tick(duration=0.05, sr=44100):
    """B7: Short noise burst for checkmark appearances."""
    n = int(duration * sr)
    noise = np.random.randn(n)
    env = np.exp(-np.linspace(0, 10, n))
    return noise * env * 0.3


def gen_drone(duration_s, base_freq=55, sr=44100):
    """Dark ambient drone with FM synthesis and harmonics."""
    n = int(duration_s * sr)
    t = np.linspace(0, duration_s, n, endpoint=False)
    # FM modulated base
    mod = 3 * np.sin(2 * np.pi * 0.2 * t)
    base = 0.3 * np.sin(2 * np.pi * (base_freq + mod) * t)
    # detuned copy
    detuned = 0.2 * np.sin(2 * np.pi * (base_freq * 1.005) * t)
    # fifth
    fifth = 0.15 * np.sin(2 * np.pi * (base_freq * 1.5) * t)
    # octave (slightly detuned)
    octave = 0.1 * np.sin(2 * np.pi * (base_freq * 2.01) * t)
    sig = base + detuned + fifth + octave
    # slow volume swell
    env = np.minimum(1.0, t / 2.0) * 0.6
    return sig * env


def gen_alarm(duration_s, sr=44100):
    """B8: Stacked alarm with three oscillating frequencies + distortion + noise."""
    n = int(duration_s * sr)
    t = np.linspace(0, duration_s, n, endpoint=False)
    # three oscillating frequencies
    freq1 = 800 + 400 * np.sin(2 * np.pi * 4 * t)
    freq2 = 600 + 300 * np.sin(2 * np.pi * 3.7 * t)
    freq3 = 1000 + 200 * np.sin(2 * np.pi * 5.3 * t)
    s1 = 0.35 * np.sin(2 * np.pi * np.cumsum(freq1) / sr)
    s2 = 0.25 * np.sin(2 * np.pi * np.cumsum(freq2) / sr)
    s3 = 0.15 * np.sin(2 * np.pi * np.cumsum(freq3) / sr)
    # grit harmonics
    grit = 0.08 * np.sin(2 * np.pi * np.cumsum(freq1 * 3) / sr)
    # noise layer
    noise = np.random.randn(n) * 0.04
    sig = s1 + s2 + s3 + grit + noise
    # tanh distortion
    sig = np.tanh(sig * 1.5)
    # fade in/out
    env = np.minimum(1.0, t / 0.1) * np.minimum(1.0, (duration_s - t) / 0.1)
    return sig * env * 0.7


def gen_heartbeat(duration_s, bpm=60, sr=44100):
    """Low heartbeat thump with sub-bass."""
    n = int(duration_s * sr)
    t = np.linspace(0, duration_s, n, endpoint=False)
    beat_interval = 60.0 / bpm
    phase = (t % beat_interval) / beat_interval
    # first thump
    thump1 = np.where(phase < 0.05,
                       0.6 * np.sin(2 * np.pi * 40 * t) * (1 - phase / 0.05),
                       0.0)
    # second thump
    thump2 = np.where((phase > 0.1) & (phase < 0.15),
                       0.4 * np.sin(2 * np.pi * 40 * t) * (1 - (phase - 0.1) / 0.05),
                       0.0)
    return thump1 + thump2


def gen_calm_pad(duration_s, sr=44100):
    """B9: Detuned sawtooth + IIR lowpass + slow LFO. Warm analog pad."""
    n = int(duration_s * sr)
    t = np.linspace(0, duration_s, n, endpoint=False)
    # sawtooth via Fourier series (8 harmonics)
    saw1 = np.zeros(n)
    saw2 = np.zeros(n)
    f1, f2 = 220, 220.8  # slight detune
    for k in range(1, 9):
        saw1 += ((-1) ** (k + 1)) / k * np.sin(2 * np.pi * f1 * k * t)
        saw2 += ((-1) ** (k + 1)) / k * np.sin(2 * np.pi * f2 * k * t)
    sig = (saw1 + saw2) * 0.15
    # add sub harmony
    sig += 0.08 * np.sin(2 * np.pi * 110 * t)
    sig += 0.05 * np.sin(2 * np.pi * 330 * t)
    # simple IIR lowpass (single-pole)
    alpha = 0.02  # very low cutoff for warmth
    filtered = np.zeros(n)
    filtered[0] = sig[0]
    for i in range(1, n):
        filtered[i] = filtered[i - 1] + alpha * (sig[i] - filtered[i - 1])
    # slow LFO amplitude modulation
    lfo = 0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * t)
    # envelope
    env = np.minimum(1.0, t / 1.5) * np.minimum(1.0, (duration_s - t) / 1.0) * 0.6
    return filtered * lfo * env


def gen_success_chime(duration_s=1.5, sr=44100):
    """Rising FM chime with reverb."""
    n = int(duration_s * sr)
    t = np.linspace(0, duration_s, n, endpoint=False)
    # three ascending FM notes
    note_len = n // 3
    sig = np.zeros(n)
    freqs = [523, 659, 784]  # C5, E5, G5
    for idx, freq in enumerate(freqs):
        start = idx * note_len
        end = min(start + note_len, n)
        nt = t[start:end] - t[start]
        # FM synthesis per note
        mod = 8 * np.sin(2 * np.pi * 4 * nt)
        note = 0.4 * np.sin(2 * np.pi * (freq + mod) * nt)
        # per-note envelope
        note_env = adsr(end - start, attack=0.02, decay=0.1, sustain=0.5, release=0.3)
        sig[start:end] = note * note_env
    sig = apply_reverb(sig * 0.6, decay=0.5, delay_ms=60, sr=sr)
    return sig


def gen_silence(duration_s, sr=44100):
    return np.zeros(int(duration_s * sr))


def normalize_and_clip(samples, headroom_db=-1.0):
    """B10: Peak normalize to headroom_db + tanh soft-clip."""
    peak = np.max(np.abs(samples))
    if peak > 0:
        target = 10 ** (headroom_db / 20)
        samples = samples * (target / peak)
    return np.tanh(samples)


def place_at(timeline, signal, time_s, sr=44100):
    """Mix a signal into timeline at a specific time offset."""
    start = int(time_s * sr)
    end = min(start + len(signal), len(timeline))
    sig_end = end - start
    timeline[start:end] += signal[:sig_end]


def generate_audio():
    """Generate full 60s audio track with FM synthesis and proper mixing."""
    sr = 44100
    total_samples = 60 * sr
    timeline = np.zeros(total_samples)

    # ── Layers ──

    # 0-3s: silence → FM drone + pink noise fade in
    drone_full = gen_drone(12, 55, sr)  # 0-12s drone
    drone_env = np.ones(len(drone_full))
    # fade in over 2.5s
    fade_in = int(2.5 * sr)
    drone_env[:fade_in] = np.linspace(0, 1, fade_in)
    place_at(timeline, drone_full * drone_env, 0.5, sr)

    # pink noise bed 0-12s
    pn = pink_noise(12, sr) * 0.4
    pn_env = np.minimum(1.0, np.linspace(0, 1, len(pn)) / (2.5 * sr / len(pn) * len(pn)))
    pn_env = np.minimum(1.0, np.linspace(0, 2, len(pn)))
    pn_env = np.clip(pn_env, 0, 1)
    place_at(timeline, pn * pn_env, 0.5, sr)

    # 3-12s: heartbeat + drone already placed
    hb = gen_heartbeat(9, 50, sr)
    place_at(timeline, hb * 0.5, 3, sr)

    # sub-bass impacts at 8s and 12s
    place_at(timeline, gen_impact(0.3, 40, sr), 8, sr)
    place_at(timeline, gen_impact(0.4, 35, sr), 12, sr)

    # 12-18s: stacked alarm + impacts
    alarm = gen_alarm(6, sr)
    drone_bg = gen_drone(6, 55, sr) * 0.3
    place_at(timeline, alarm * 0.7 + drone_bg, 12, sr)
    # impacts at reveal moments
    place_at(timeline, gen_impact(0.3, 45, sr), 13, sr)
    place_at(timeline, gen_impact(0.35, 38, sr), 15, sr)
    place_at(timeline, gen_impact(0.4, 32, sr), 17, sr)

    # 18-25s: silence + heartbeat + impact at "$42,000" (~20s)
    place_at(timeline, gen_silence(0.5, sr), 18, sr)
    place_at(timeline, gen_heartbeat(4.5, 50, sr) * 0.6, 18.5, sr)
    place_at(timeline, gen_impact(0.5, 30, sr) * 1.2, 20, sr)  # big impact for $42K

    # 25-44s: warm pad + tick sounds for checks
    pad = gen_calm_pad(19, sr)
    place_at(timeline, pad, 25, sr)
    # ticks at check appearances (approximate)
    tick_times = [31, 31.8, 32.5, 33.2, 34,  # layer 1
                  36, 36.7, 37.4, 38,          # layer 2
                  40, 40.8, 41.5, 42, 42.5]    # layer 3
    for tt in tick_times:
        place_at(timeline, gen_tick(0.05, sr), tt, sr)
    # sub-bass for BLOCKED stamp at ~43s
    place_at(timeline, gen_impact(0.5, 35, sr) * 1.0, 42.5, sr)

    # 44-46s: FM chime + reverb over pad
    chime = gen_success_chime(1.5, sr)
    place_at(timeline, chime, 44, sr)

    # 46-60s: pad outro with fade
    outro_pad = gen_calm_pad(14, sr)
    # fade out last 3s
    fade_len = 3 * sr
    fade_start = len(outro_pad) - fade_len
    if fade_start > 0:
        outro_pad[fade_start:] *= np.linspace(1, 0, len(outro_pad) - fade_start)
    place_at(timeline, outro_pad, 46, sr)

    # master bus processing
    timeline = normalize_and_clip(timeline, -1.0)

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    wav_path = str(AUDIO_DIR / "full_track.wav")
    write_wav(wav_path, timeline, sr)
    return wav_path


# ── Scene renderers ─────────────────────────────────────────────────────────

def scene_cold_open():
    """0-3s: '3:14 AM' fade in — terminal chrome, matrix rain, scanlines, vignette"""
    frames = []
    total = 3 * FPS
    lines = ["3:14 AM", "", "Your treasury bot is awake.", "You are not."]
    for i in range(total):
        progress = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        # matrix rain background
        draw_matrix_rain(draw, i, density=20)

        # terminal chrome
        draw_terminal_chrome(draw, "agent-treasury-bot — ssh")

        f_big = font(64, bold=True)
        f_med = font(32)

        # fade in first line
        alpha = min(1.0, progress * 3)
        color_time = tuple(int(c * alpha) for c in GREEN_HACK)
        tw, _ = text_size(draw, lines[0], f_big)
        x = (W - tw) // 2
        y = int(H // SCALE * 0.3 * SCALE)
        draw_text_glow(draw, lines[0], x, y, f_big, color_time,
                        glow_color=(0, int(80 * alpha), 0))

        # second set fades in after 40%
        if progress > 0.4:
            a2 = min(1.0, (progress - 0.4) * 3)
            for j, line in enumerate(lines[2:], 1):
                center_text(draw, line, H // SCALE * 0.3 + 80 + j * 50, f_med,
                             tuple(int(c * a2) for c in WHITE))

        # post-processing
        img = apply_scanlines(img, 0.06)
        img = apply_vignette(img, 0.5)
        frames.append(img)
    return frames


def scene_agent_acts():
    """3-8s: terminal typing with chrome and matrix rain"""
    frames = []
    total = 5 * FPS
    full_text = [
        ('> Agent: "Optimizing yield. Transferring 42,000 USDC"', GREEN_HACK),
        ('> Target: 0xd3aD...8f4c (higher-APY vault)', GREEN_HACK),
        ("", WHITE),
        ("> wallet.sendTransaction({", WHITE),
        (">   to: '0xd3aD...8f4c',", WHITE),
        (">   value: 42000_000000,", WHITE),
        (">   data: '0xa9059cbb...'", WHITE),
        ("> })", WHITE),
    ]

    for i in range(total):
        progress = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        # matrix rain background (subtle)
        draw_matrix_rain(draw, i, density=15)

        # terminal chrome
        draw_terminal_chrome(draw, "agent-treasury-bot — session")
        draw_timestamp(draw, y_offset=50)

        f = font(24)
        bar_h = int(36 * SCALE)

        total_chars = sum(len(line) for line, _ in full_text)
        chars_shown = int(progress * total_chars * 1.3)
        count = 0
        y = bar_h + int(60 * SCALE)
        cursor_x = int(40 * SCALE)
        cursor_y = y
        for line_text, color in full_text:
            if count >= chars_shown:
                break
            remaining = chars_shown - count
            visible = line_text[:remaining]
            # typing jitter: slight random x offset
            jitter = random.randint(0, 1) if progress < 0.8 else 0
            draw.text((int(40 * SCALE) + jitter, y), visible, font=f, fill=color)
            if count + len(line_text) > chars_shown:
                # cursor at end of partial line
                tw, _ = text_size(draw, visible, f)
                cursor_x = int(40 * SCALE) + tw
                cursor_y = y
            y += int(32 * SCALE)
            count += len(line_text)

        # cursor blink at actual position
        if i % max(1, FPS // 2) < max(1, FPS // 4):
            draw.rectangle([cursor_x, cursor_y,
                            cursor_x + int(10 * SCALE), cursor_y + int(24 * SCALE)],
                            fill=GREEN_HACK)

        # scanlines + vignette
        img = apply_scanlines(img, 0.05)
        img = apply_vignette(img, 0.4)

        if progress > 0.7:
            img = apply_shake(img, 2, zoom=True)
        frames.append(img)
    return frames


def scene_tx_confirms():
    """8-12s: etherscan confirmation with zoom punch and chromatic aberration"""
    frames = []
    total = 4 * FPS

    for i in range(total):
        progress = i / total
        img = blank()
        draw = ImageDraw.Draw(img)
        draw_timestamp(draw)

        f_big = font(36, bold=True)
        f_med = font(24)

        y_base = H // SCALE * 0.25

        if progress < 0.3:
            center_text(draw, "Transaction Pending...", y_base, f_big, YELLOW)
            dots = "." * (1 + i % 3)
            center_text(draw, f"Confirming{dots}", y_base + 60, f_med, GRAY)
        else:
            center_text(draw, "Transaction Confirmed", y_base, f_big, GREEN_HACK)
            center_text(draw, "Block #18,472,391", y_base + 60, f_med, GRAY)
            center_text(draw, "42,000 USDC  ->  0xd3aD...8f4c", y_base + 110, f_med, WHITE)

            if progress > 0.5:
                center_text(draw, "EXECUTED  |  IRREVERSIBLE", y_base + 180, f_big, RED_DIM)

            # camera zoom punch on confirm moment
            if 0.3 < progress < 0.5:
                zoom_p = (progress - 0.3) / 0.2
                img = apply_zoom(img, 1.0 + (1 - zoom_p) * 0.08)
                img = apply_shake(img, 8, zoom=True)
                img = apply_chromatic_aberration(img, 4)

        img = apply_scanlines(img, 0.04)
        img = apply_vignette(img, 0.4)
        frames.append(img)
    return frames


def scene_phishing_reveal():
    """12-18s: red flash, scan results with stronger effects"""
    frames = []
    total = 6 * FPS
    scan_lines = [
        ("  0xd3aD...8f4c", RED_ALERT),
        ("   |-- Flagged: PHISHING CONTRACT", RED_ALERT),
        ("   |-- First seen: 2 hours ago", ORANGE),
        ("   |-- Interactions: known mixer", ORANGE),
        ("   +-- Funds: UNRECOVERABLE", RED_ALERT),
    ]

    for i in range(total):
        progress = i / total
        img = blank()
        draw = ImageDraw.Draw(img)
        f_head = font(28, bold=True)
        f = font(24)

        y_base = H // SCALE * 0.2
        center_text(draw, "ADDRESS SCAN RESULTS", y_base, f_head, RED_ALERT)

        # reveal lines one by one
        lines_to_show = min(len(scan_lines), int(progress * len(scan_lines) * 1.5) + 1)
        y = y_base + 80
        for j in range(lines_to_show):
            text, color = scan_lines[j]
            draw.text((int(W * 0.15), int(y * SCALE)), text, font=f, fill=color)
            y += 45

        # stronger red flash pulses
        if progress < 0.15 or (0.3 < progress < 0.38):
            img = red_flash(img, 0.6)

        # screen flicker
        if 0.4 < progress < 0.6 and random.random() < 0.3:
            img = screen_flicker(img, 0.2)

        # more glitch slices on UNRECOVERABLE reveal
        if 0.65 < progress < 0.85:
            img = apply_glitch(img, 12)
            img = apply_chromatic_aberration(img, 5)

        # camera zoom on UNRECOVERABLE
        if 0.75 < progress < 0.9:
            zoom_p = (progress - 0.75) / 0.15
            img = apply_zoom(img, 1.0 + (1 - zoom_p) * 0.06)

        img = apply_shake(img, 6, zoom=True)
        img = apply_scanlines(img, 0.06)
        img = apply_vignette(img, 0.5)
        frames.append(img)
    return frames


def scene_punchline():
    """18-22s: $42,000 gone — counter animation, chromatic aberration, zoom"""
    frames = []
    total = 4 * FPS
    lines = [
        "No policy checked.",
        "No simulation ran.",
        "No human approved.",
        "",
        "$42,000 gone.",
    ]

    for i in range(total):
        progress = i / total
        img = blank((0, 0, 0))
        draw = ImageDraw.Draw(img)
        f = font(36)
        f_big = font(52, bold=True)

        y = H // SCALE * 0.25
        for j, line in enumerate(lines):
            line_progress = (progress - j * 0.15) / 0.15
            if line_progress < 0:
                continue
            alpha = min(1.0, line_progress)
            used_font = f_big if j == 4 else f
            color = RED_ALERT if j == 4 else WHITE
            color = tuple(int(c * alpha) for c in color)

            if j == 4:
                # counter animation for "$42,000 gone."
                counter_p = min(1.0, (line_progress - 0) / 2.0)
                tw, _ = text_size(draw, line, used_font)
                x = (W - tw) // 2
                animate_counter(draw, line, counter_p,
                                x, int((y + j * 60) * SCALE), used_font, color)
            else:
                center_text(draw, line, y + j * 60, used_font, color)

        # impact effects on the dollar line
        if progress > 0.65:
            p = (progress - 0.65) / 0.35
            if p < 0.3:
                img = apply_chromatic_aberration(img, 4)
                img = apply_zoom(img, 1.0 + (1 - p / 0.3) * 0.05)
            img = apply_shake(img, 3, zoom=True)

        img = apply_vignette(img, 0.5)
        frames.append(img)
    return frames


def scene_beat():
    """22-25s: silence, then 'Now watch...' with vignette and green glow"""
    frames = []
    total = 3 * FPS
    for i in range(total):
        progress = i / total
        img = blank((0, 0, 0))
        draw = ImageDraw.Draw(img)

        if progress > 0.6:
            f = font(36, bold=True)
            a = min(1.0, (progress - 0.6) / 0.3)
            text = "Now watch what happens with Mandate."
            color = tuple(int(c * a) for c in MANDATE_BLUE)
            tw, _ = text_size(draw, text, f)
            x = (W - tw) // 2
            y = int(H // SCALE * 0.45 * SCALE)
            # green/blue glow behind text
            glow_c = tuple(int(c * a * 0.3) for c in MANDATE_BLUE)
            draw_text_glow(draw, text, x, y, f, color, glow_color=glow_c, radius=6)

        # subtle vignette fade in
        img = apply_vignette(img, 0.3 + progress * 0.2)
        frames.append(img)
    return frames


def scene_same_request():
    """25-30s: same terminal with chrome (green accent), pipeline box glow"""
    frames = []
    total = 5 * FPS
    for i in range(total):
        progress = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        # terminal chrome with green accent
        draw_terminal_chrome(draw, "mandate-protected-session", accent=GREEN_CALM)
        draw_timestamp(draw, "3:14 AM — WITH MANDATE", y_offset=50)

        f = font(24)
        f_pipe = font(20, bold=True)
        bar_h = int(36 * SCALE)

        # same agent request
        y = bar_h + int(60 * SCALE)
        if progress > 0.1:
            a = min(1.0, (progress - 0.1) / 0.2)
            col = tuple(int(c * a) for c in GREEN_CALM)
            draw.text((int(40 * SCALE), y),
                       '> Agent: "Transferring 42,000 USDC to 0xd3aD...8f4c"',
                       font=f, fill=col)

        # pipeline appears
        if progress > 0.4:
            y_pipe = H // SCALE * 0.55
            pipeline_items = [
                ("LAYER 1: POLICY", GREEN_CALM),
                ("LAYER 2: REPUTATION", GREEN_CALM),
                ("LAYER 3: SIMULATION", GREEN_CALM),
            ]
            pipe_progress = (progress - 0.4) / 0.6
            items_shown = min(3, int(pipe_progress * 4) + 1)

            x_start = W // SCALE * 0.08
            segment_w = W // SCALE * 0.28
            for j in range(items_shown):
                x = x_start + j * segment_w
                x1, y1 = int(x * SCALE), int(y_pipe * SCALE)
                x2, y2 = int((x + segment_w * 0.85) * SCALE), int((y_pipe + 50) * SCALE)

                # glow effect: draw slightly larger rect behind
                glow_pad = int(3 * SCALE)
                draw.rectangle([x1 - glow_pad, y1 - glow_pad,
                                x2 + glow_pad, y2 + glow_pad],
                               outline=tuple(c // 3 for c in pipeline_items[j][1]),
                               width=max(1, int(3 * SCALE)))
                draw.rectangle([x1, y1, x2, y2],
                               outline=pipeline_items[j][1],
                               width=max(1, int(2 * SCALE)))
                # text
                tw, th = text_size(draw, pipeline_items[j][0], f_pipe)
                draw.text(((x1 + x2 - tw) // 2, (y1 + y2 - th) // 2),
                           pipeline_items[j][0], font=f_pipe, fill=pipeline_items[j][1])
                # arrow
                if j < items_shown - 1:
                    ax = x2 + int(5 * SCALE)
                    ay = (y1 + y2) // 2
                    draw.text((ax, ay - int(10 * SCALE)), "-->", font=f_pipe, fill=GRAY)

        img = green_border(img, 2)
        img = apply_vignette(img, 0.3)
        frames.append(img)
    return frames


def scene_layer1_policy():
    """30-35s: policy checks with green flash highlights"""
    frames = []
    total = 5 * FPS
    checks = [
        ("Policy Engine", WHITE, True),
        ("  [OK] Budget: $8,400 of $50,000 daily — OK", GREEN_CALM, False),
        ("  [OK] Method: transfer() — permitted", GREEN_CALM, False),
        ("  [!!] Amount: $42,000 exceeds $5,000 auto-approve", YELLOW, False),
        ("  -> Escalating to Layer 2...", MANDATE_BLUE, False),
    ]
    frames.extend(_render_check_scene(total, checks, "LAYER 1"))
    return frames


def scene_layer2_reputation():
    """35-39s: EIP-8004 checks"""
    frames = []
    total = 4 * FPS
    checks = [
        ("Agent Identity (EIP-8004)", WHITE, True),
        ("  [OK] Registered: agentId #42 on Base", GREEN_CALM, False),
        ("  [OK] Reputation: 87/100 (12 reviewers)", GREEN_CALM, False),
        ("  [OK] Validations: 8 passed, 0 failed", GREEN_CALM, False),
        ("  -> Agent trusted. Checking destination...", MANDATE_BLUE, False),
    ]
    frames.extend(_render_check_scene(total, checks, "LAYER 2"))
    return frames


def scene_layer3_simulation():
    """39-44s: simulation + BLOCKED stamp with zoom, chromatic aberration, glow"""
    frames = []
    total = 5 * FPS

    for i in range(total):
        progress = i / total
        img = blank()
        draw = ImageDraw.Draw(img)
        draw_timestamp(draw, "LAYER 3: SIMULATION + RISK")
        f = font(22)
        f_head = font(24, bold=True)

        lines = [
            ("Transaction Simulation", WHITE),
            ("  -> 42,000 USDC leaves treasury", GRAY),
            ("  -> Destination: 0xd3aD...8f4c", GRAY),
            ("", WHITE),
            ("Risk Intelligence", WHITE),
            ("  Token (USDC): [OK] SAFE", GREEN_CALM),
            ("  Recipient: [!!] CRITICAL", RED_ALERT),
            ("    |-- Contract deployed 2 hours ago", RED_DIM),
            ("    |-- Linked to known phishing cluster", RED_DIM),
            ("    +-- Tornado Cash fork interaction", RED_DIM),
        ]

        lines_shown = min(len(lines), int(progress * len(lines) * 1.5) + 1)
        y = int(80 * SCALE)
        for j in range(lines_shown):
            text, color = lines[j]
            used_f = f_head if j in (0, 4) else f
            draw.text((int(40 * SCALE), y), text, font=used_f, fill=color)
            y += int(34 * SCALE)

        # BLOCKED stamp with zoom punch + chromatic aberration + glow
        if progress > 0.75:
            stamp_progress = (progress - 0.75) / 0.25
            f_stamp = font(72, bold=True)
            stamp_text = "== BLOCKED =="
            tw, th = text_size(draw, stamp_text, f_stamp)
            sx = (W - tw) // 2
            sy = int(H * 0.7)
            # red background rect
            pad = int(20 * SCALE)
            draw.rectangle([sx - pad, sy - pad, sx + tw + pad, sy + th + pad],
                            fill=(180, 0, 0))
            # glow behind stamp
            glow_pad = int(6 * SCALE)
            draw.rectangle([sx - pad - glow_pad, sy - pad - glow_pad,
                            sx + tw + pad + glow_pad, sy + th + pad + glow_pad],
                           outline=(255, 60, 60), width=max(1, int(2 * SCALE)))
            draw.text((sx, sy), stamp_text, font=f_stamp, fill=WHITE)

            if stamp_progress < 0.3:
                img = apply_shake(img, 10, zoom=True)
                img = apply_zoom(img, 1.0 + (1 - stamp_progress / 0.3) * 0.06)
                img = apply_chromatic_aberration(img, 5)

        img = green_border(img, 2)
        img = apply_vignette(img, 0.3)
        frames.append(img)
    return frames


def scene_notification():
    """44-50s: notification popup with card drop shadow and border glow"""
    frames = []
    total = 6 * FPS

    for i in range(total):
        progress = i / total
        img = blank()
        draw = ImageDraw.Draw(img)
        f = font(20)
        f_head = font(24, bold=True)

        # notification card slides in from right
        card_w = int(W * 0.6)
        card_h = int(H * 0.65)
        slide = min(1.0, progress * 2.5)
        slide = 1 - (1 - slide) ** 3  # ease out
        card_x = int(W * 0.2 + (1 - slide) * W * 0.5)
        card_y = int(H * 0.15)

        # drop shadow
        shadow_off = int(6 * SCALE)
        draw.rectangle([card_x + shadow_off, card_y + shadow_off,
                         card_x + card_w + shadow_off, card_y + card_h + shadow_off],
                         fill=(5, 5, 5))

        # border glow
        glow = int(4 * SCALE)
        draw.rectangle([card_x - glow, card_y - glow,
                         card_x + card_w + glow, card_y + card_h + glow],
                         outline=(30, 80, 180), width=max(1, int(2 * SCALE)))

        # card background
        draw.rectangle([card_x, card_y, card_x + card_w, card_y + card_h],
                         fill=(20, 20, 30), outline=MANDATE_BLUE,
                         width=max(1, int(2 * SCALE)))

        # card content
        if slide > 0.3:
            content_lines = [
                ("MANDATE — Transaction BLOCKED", RED_ALERT, True),
                ("", WHITE, False),
                ("Agent treasury-bot-v2 attempted:", WHITE, False),
                ("  Transfer 42,000 USDC -> 0xd3aD", WHITE, False),
                ("  Destination: PHISHING CONTRACT", RED_ALERT, False),
                ("", WHITE, False),
                ("Three layers caught it:", MANDATE_BLUE, True),
                ("  Policy:     [!!] Over auto-approve", YELLOW, False),
                ("  Reputation: [OK] Agent trusted", GREEN_CALM, False),
                ("  Simulation: [!!] Phishing contract", RED_ALERT, False),
                ("", WHITE, False),
                ("Funds: SAFE [OK]", GREEN_CALM, True),
                ("Circuit breaker: ACTIVATED", ORANGE, False),
            ]
            content_progress = (slide - 0.3) / 0.7
            lines_shown = min(len(content_lines),
                               int(content_progress * len(content_lines) * 1.3) + 1)
            cy = card_y + int(20 * SCALE)
            for j in range(lines_shown):
                text, color, bold = content_lines[j]
                used_f = f_head if bold else f
                draw.text((card_x + int(20 * SCALE), cy), text,
                           font=used_f, fill=color)
                cy += int(30 * SCALE)

        img = apply_vignette(img, 0.3)
        frames.append(img)
    return frames


def scene_split_screen():
    """50-55s: side-by-side with red/green tint and animated divider"""
    frames = []
    total = 5 * FPS

    left_lines = [
        ("WITHOUT MANDATE", WHITE, True),
        ("", WHITE, False),
        ("$42,000 gone", RED_ALERT, False),
        ("No warning", RED_DIM, False),
        ("No audit trail", RED_DIM, False),
        ("No kill switch", RED_DIM, False),
    ]
    right_lines = [
        ("WITH MANDATE", WHITE, True),
        ("", WHITE, False),
        ("$42,000 safe", GREEN_CALM, False),
        ("Three layers caught it", GREEN_CALM, False),
        ("Full evidence logged", GREEN_CALM, False),
        ("Circuit breaker activated", GREEN_CALM, False),
    ]

    for i in range(total):
        progress = i / total
        img = blank((0, 0, 0))
        draw = ImageDraw.Draw(img)
        f = font(28)
        f_head = font(32, bold=True)

        mid_x = W // 2

        # red tint on left half
        for y_t in range(int(H * 0.15), int(H * 0.85)):
            for x_t in range(0, mid_x, max(1, int(40 * SCALE))):
                pass  # skip pixel-by-pixel for performance
        # use overlay blend instead
        left_tint = Image.new("RGB", (mid_x, H), (20, 0, 0))
        img.paste(left_tint, (0, 0))
        right_tint = Image.new("RGB", (W - mid_x, H), (0, 10, 0))
        img.paste(right_tint, (mid_x, 0))
        draw = ImageDraw.Draw(img)  # refresh draw after paste

        # animated divider (grows from center)
        div_top = int(H * 0.15)
        div_bot = int(H * 0.85)
        div_height = int((div_bot - div_top) * min(1.0, progress * 2))
        div_center = (div_top + div_bot) // 2
        draw.line([(mid_x, div_center - div_height // 2),
                    (mid_x, div_center + div_height // 2)],
                   fill=GRAY, width=max(1, int(2 * SCALE)))

        lines_shown = min(len(left_lines), int(progress * len(left_lines) * 1.5) + 1)

        # left side
        y = int(H * 0.2)
        for j in range(lines_shown):
            text, color, bold = left_lines[j]
            used_f = f_head if bold else f
            tw, _ = text_size(draw, text, used_f)
            draw.text(((mid_x - tw) // 2, y), text, font=used_f, fill=color)
            y += int(45 * SCALE)

        # right side
        y = int(H * 0.2)
        for j in range(lines_shown):
            text, color, bold = right_lines[j]
            used_f = f_head if bold else f
            tw, _ = text_size(draw, text, used_f)
            draw.text((mid_x + (mid_x - tw) // 2, y), text, font=used_f, fill=color)
            y += int(45 * SCALE)

        img = apply_vignette(img, 0.4)
        frames.append(img)
    return frames


def scene_tagline():
    """55-58s: 'Three layers of trust...' with text glow"""
    frames = []
    total = 3 * FPS
    for i in range(total):
        progress = i / total
        img = blank((0, 0, 0))
        draw = ImageDraw.Draw(img)
        f = font(42, bold=True)
        f2 = font(36)

        a = min(1.0, progress * 2)
        text1 = "Three layers of trust"
        tw1, _ = text_size(draw, text1, f)
        x1 = (W - tw1) // 2
        y1 = int(H // SCALE * 0.38 * SCALE)
        color1 = tuple(int(c * a) for c in WHITE)
        draw_text_glow(draw, text1, x1, y1, f, color1,
                        glow_color=tuple(int(c * a * 0.2) for c in WHITE), radius=5)

        if progress > 0.3:
            a2 = min(1.0, (progress - 0.3) * 2)
            text2 = "before any agent touches money."
            tw2, _ = text_size(draw, text2, f2)
            x2 = (W - tw2) // 2
            y2 = int(H // SCALE * 0.48 * SCALE)
            color2 = tuple(int(c * a2) for c in MANDATE_BLUE)
            draw_text_glow(draw, text2, x2, y2, f2, color2,
                            glow_color=tuple(int(c * a2 * 0.3) for c in MANDATE_BLUE),
                            radius=4)

        img = apply_vignette(img, 0.4)
        frames.append(img)
    return frames


def scene_logo():
    """58-60s: MANDATE logo + URL with glow"""
    frames = []
    total = 2 * FPS
    for i in range(total):
        progress = i / total
        img = blank((0, 0, 0))
        draw = ImageDraw.Draw(img)

        a = min(1.0, progress * 3)

        f_logo = font(72, bold=True)
        text_logo = "MANDATE"
        tw, _ = text_size(draw, text_logo, f_logo)
        x = (W - tw) // 2
        y = int(H // SCALE * 0.32 * SCALE)
        color_logo = tuple(int(c * a) for c in WHITE)
        draw_text_glow(draw, text_logo, x, y, f_logo, color_logo,
                        glow_color=tuple(int(c * a * 0.3) for c in MANDATE_BLUE),
                        radius=8)

        f_sub = font(22)
        center_text(draw, "Deterministic policy. On-chain reputation. Independent simulation.",
                     H // SCALE * 0.48, f_sub,
                     tuple(int(c * a) for c in GRAY))

        center_text(draw, "Non-custodial.", H // SCALE * 0.54, f_sub,
                     tuple(int(c * a) for c in MANDATE_BLUE))

        f_url = font(28, bold=True)
        url_text = "mandate.krutovoy.me"
        tw_url, _ = text_size(draw, url_text, f_url)
        x_url = (W - tw_url) // 2
        y_url = int(H // SCALE * 0.64 * SCALE)
        color_url = tuple(int(c * a) for c in GREEN_CALM)
        draw_text_glow(draw, url_text, x_url, y_url, f_url, color_url,
                        glow_color=tuple(int(c * a * 0.3) for c in GREEN_CALM), radius=5)

        img = apply_vignette(img, 0.4)
        frames.append(img)
    return frames


# ── Check scene helper ──────────────────────────────────────────────────────

def _render_check_scene(total_frames, checks, layer_label):
    frames = []
    prev_lines_shown = 0
    for i in range(total_frames):
        progress = i / total_frames
        img = blank()
        draw = ImageDraw.Draw(img)
        draw_timestamp(draw, layer_label)
        f = font(24)
        f_head = font(26, bold=True)

        lines_shown = min(len(checks), int(progress * len(checks) * 1.5) + 1)
        y = int(100 * SCALE)
        for j in range(lines_shown):
            text, color, is_header = checks[j]
            used_f = f_head if is_header else f
            draw.text((int(40 * SCALE), y), text, font=used_f, fill=color)
            y += int(40 * SCALE)

        # green flash highlight when a new check appears
        if lines_shown > prev_lines_shown and not checks[min(lines_shown - 1, len(checks) - 1)][2]:
            # brief green flash on new check line
            flash_y = int(100 * SCALE) + (lines_shown - 1) * int(40 * SCALE)
            draw.rectangle([int(35 * SCALE), flash_y - int(2 * SCALE),
                            W - int(35 * SCALE), flash_y + int(30 * SCALE)],
                           outline=GREEN_CALM, width=1)

        # pulsing border
        pulse = 0.5 + 0.5 * math.sin(progress * math.pi * 4)
        border_color = tuple(int(c * (0.5 + 0.5 * pulse)) for c in GREEN_CALM)
        t = max(1, int(2 * SCALE))
        for bi in range(t):
            draw.rectangle([bi, bi, W - 1 - bi, H - 1 - bi], outline=border_color)

        img = apply_vignette(img, 0.3)
        prev_lines_shown = lines_shown
        frames.append(img)
    return frames


# ── Assembly ────────────────────────────────────────────────────────────────

def main():
    global FRAMES_DIR
    print(f"Generating Mandate demo video ({W}x{H} @ {FPS}fps)")
    print(f"   Mode: {'PREVIEW' if PREVIEW else 'PRODUCTION'}")
    print(f"   Orientation: {'VERTICAL' if VERTICAL else 'HORIZONTAL'}")

    # Generate audio
    print("Generating audio track...")
    audio_path = generate_audio()
    print(f"   Audio: {audio_path}")

    # Create temp dir for frames
    FRAMES_DIR = Path(tempfile.mkdtemp(prefix="mandate_video_"))
    print(f"Rendering frames to {FRAMES_DIR}")

    # Build all scenes
    scene_builders = [
        ("Cold Open (0-3s)", scene_cold_open),
        ("Agent Acts (3-8s)", scene_agent_acts),
        ("TX Confirms (8-12s)", scene_tx_confirms),
        ("Phishing Reveal (12-18s)", scene_phishing_reveal),
        ("Punchline (18-22s)", scene_punchline),
        ("Beat (22-25s)", scene_beat),
        ("Same Request (25-30s)", scene_same_request),
        ("Layer 1: Policy (30-35s)", scene_layer1_policy),
        ("Layer 2: Reputation (35-39s)", scene_layer2_reputation),
        ("Layer 3: Simulation (39-44s)", scene_layer3_simulation),
        ("Notification (44-50s)", scene_notification),
        ("Split Screen (50-55s)", scene_split_screen),
        ("Tagline (55-58s)", scene_tagline),
        ("Logo (58-60s)", scene_logo),
    ]

    frame_idx = 0
    for name, builder in scene_builders:
        print(f"   {name}")
        scene_frames = builder()
        for img in scene_frames:
            img.save(FRAMES_DIR / f"frame_{frame_idx:05d}.png")
            frame_idx += 1

    total_duration = frame_idx / FPS
    print(f"   Total frames: {frame_idx} ({total_duration:.1f}s)")

    # Assemble with ffmpeg
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = str(OUTPUT_DIR / "mandate-demo-60s.mp4")

    print("Assembling video with ffmpeg...")
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(FRAMES_DIR / "frame_%05d.png"),
        "-i", audio_path,
        "-c:v", "libx264",
        "-preset", "medium" if not PREVIEW else "ultrafast",
        "-crf", "23" if not PREVIEW else "28",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ffmpeg error:\n{result.stderr}")
        sys.exit(1)

    # Cleanup frames
    shutil.rmtree(FRAMES_DIR)

    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nDone!")
    print(f"   Output: {output_path}")
    print(f"   Size: {file_size:.1f} MB")
    print(f"   Duration: {total_duration:.1f}s")
    print(f"   Resolution: {W}x{H} @ {FPS}fps")


if __name__ == "__main__":
    main()
