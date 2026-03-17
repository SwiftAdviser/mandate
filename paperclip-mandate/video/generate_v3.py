#!/usr/bin/env python3
"""
Mandate 60-Second Demo Video Generator — Iteration 3: The Control Room
=======================================================================
Modern security operations dashboard aesthetic. Clean cards, status pills,
progress bars, sparklines. Dark navy background, not pure black.

Usage: python generate_v3.py [--preview] [--vertical]
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

# Colors — dashboard palette
BG_NAVY = (10, 14, 26)
BG_CARD = (16, 22, 40)
BG_CARD_HEADER = (20, 28, 52)
BORDER_DEFAULT = (36, 48, 80)
BORDER_BLUE = (51, 136, 255)
BORDER_RED = (220, 40, 40)
BORDER_GREEN = (0, 200, 100)

WHITE = (255, 255, 255)
WHITE_DIM = (180, 185, 200)
GRAY = (100, 110, 130)
GRAY_LIGHT = (140, 150, 170)

GREEN_STATUS = (0, 220, 100)
GREEN_PILL = (16, 60, 36)
RED_STATUS = (240, 50, 50)
RED_PILL = (70, 20, 20)
RED_TINT = (40, 8, 8)
YELLOW_STATUS = (255, 200, 0)
YELLOW_PILL = (60, 50, 10)

MANDATE_BLUE = (51, 136, 255)
MANDATE_CYAN = (0, 200, 220)
ORANGE = (255, 140, 0)


# ── Utilities ──────────────────────────────────────────────────────────────

def font(size, bold=False):
    s = max(10, int(size * SCALE))
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, s)


def text_size(draw, text, f):
    bbox = draw.textbbox((0, 0), text, font=f)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def blank(color=BG_NAVY):
    return Image.new("RGB", (W, H), color)


def center_text(draw, text, y, f, color=WHITE):
    tw, _ = text_size(draw, text, f)
    draw.text(((W - tw) // 2, int(y * SCALE)), text, font=f, fill=color)


def s(v):
    """Scale a value."""
    return int(v * SCALE)


# ── Dashboard Drawing Helpers ──────────────────────────────────────────────

def draw_card(draw, x, y, w, h, title=None, border_color=BORDER_DEFAULT,
              bg=BG_CARD, header_bg=BG_CARD_HEADER, alpha=1.0, radius=8):
    """Draw a rounded rectangle card with optional title header."""
    r = s(radius)
    # drop shadow
    sh = s(4)
    draw.rounded_rectangle([x + sh, y + sh, x + w + sh, y + h + sh],
                            radius=r, fill=(4, 6, 12))
    # main card
    bc = tuple(int(c * alpha) for c in border_color)
    draw.rounded_rectangle([x, y, x + w, y + h], radius=r,
                            fill=bg, outline=bc, width=max(1, s(1)))
    if title:
        header_h = s(36)
        draw.rounded_rectangle([x, y, x + w, y + header_h], radius=r,
                                fill=header_bg)
        # clip bottom corners of header (draw rect over rounded bottom)
        draw.rectangle([x + 1, y + header_h - r, x + w - 1, y + header_h], fill=header_bg)
        f_title = font(14, bold=True)
        draw.text((x + s(14), y + s(10)), title, font=f_title,
                   fill=tuple(int(c * alpha) for c in WHITE_DIM))
        return header_h
    return 0


def draw_status_pill(draw, x, y, text, color, bg_color=None, alpha=1.0):
    """Draw a colored status pill badge."""
    f_pill = font(11, bold=True)
    tw, th = text_size(draw, text, f_pill)
    pw, ph = tw + s(16), th + s(8)
    if bg_color is None:
        if color == GREEN_STATUS:
            bg_color = GREEN_PILL
        elif color == RED_STATUS:
            bg_color = RED_PILL
        elif color == YELLOW_STATUS:
            bg_color = YELLOW_PILL
        else:
            bg_color = (40, 40, 50)
    bg_a = tuple(int(c * alpha) for c in bg_color)
    fg_a = tuple(int(c * alpha) for c in color)
    draw.rounded_rectangle([x, y, x + pw, y + ph], radius=s(4), fill=bg_a)
    draw.text((x + s(8), y + s(4)), text, font=f_pill, fill=fg_a)
    return pw, ph


def draw_progress_bar(draw, x, y, w, value, max_val, color, alpha=1.0):
    """Draw a horizontal progress bar."""
    h = s(10)
    # background track
    draw.rounded_rectangle([x, y, x + w, y + h], radius=s(3),
                            fill=(30, 36, 56))
    # filled portion
    fill_w = max(s(4), int(w * min(1.0, value / max_val)))
    fc = tuple(int(c * alpha) for c in color)
    draw.rounded_rectangle([x, y, x + fill_w, y + h], radius=s(3), fill=fc)
    return h


def draw_sparkline(draw, x, y, w, h, data, color, alpha=1.0):
    """Draw a simple sparkline chart."""
    if not data:
        return
    max_v = max(data) or 1
    min_v = min(data)
    rng = max_v - min_v or 1
    points = []
    for i, v in enumerate(data):
        px = x + int(i / (len(data) - 1) * w) if len(data) > 1 else x
        py = y + h - int((v - min_v) / rng * h)
        points.append((px, py))
    c = tuple(int(v * alpha) for v in color)
    for i in range(len(points) - 1):
        draw.line([points[i], points[i + 1]], fill=c, width=max(1, s(2)))


def draw_checklist_row(draw, x, y, text, status, color, alpha=1.0):
    """Draw a checklist row with status pill."""
    f_row = font(14)
    tc = tuple(int(c * alpha) for c in WHITE_DIM)
    draw.text((x, y), text, font=f_row, fill=tc)
    # status pill at right
    pill_x = x + s(320)
    draw_status_pill(draw, pill_x, y - s(2), status, color, alpha=alpha)
    return s(30)


def draw_status_dot(draw, x, y, color, radius=5):
    """Draw a small status indicator dot."""
    r = s(radius)
    draw.ellipse([x - r, y - r, x + r, y + r], fill=color)


def animate_balance(start, end, progress):
    """Interpolate a dollar balance."""
    val = start + (end - start) * min(1.0, progress)
    return f"${int(val):,}"


def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def ease_in_out(t):
    return 3 * t ** 2 - 2 * t ** 3 if t < 1 else 1.0


# ── Audio (same engine as iteration1) ─────────────────────────────────────

def write_wav(path, samples, sample_rate=44100):
    """Write a numpy float array as 16-bit WAV."""
    samples = np.clip(samples, -1.0, 1.0)
    int_samples = (samples * 32767).astype(np.int16)
    n = len(int_samples)
    with open(path, "wb") as f:
        f.write(b"RIFF")
        data_size = n * 2
        f.write(struct.pack("<I", 36 + data_size))
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate,
                            sample_rate * 2, 2, 16))
        f.write(b"data")
        f.write(struct.pack("<I", data_size))
        f.write(int_samples.tobytes())


def adsr(n_samples, attack=0.05, decay=0.1, sustain=0.7, release=0.2):
    env = np.zeros(n_samples)
    a = int(attack * n_samples)
    d = int(decay * n_samples)
    r = int(release * n_samples)
    s_len = n_samples - a - d - r
    if s_len < 0:
        s_len = 0
    if a > 0:
        env[:a] = np.linspace(0, 1, a)
    if d > 0:
        env[a:a + d] = np.linspace(1, sustain, d)
    if s_len > 0:
        env[a + d:a + d + s_len] = sustain
    if r > 0:
        start = a + d + s_len
        env[start:start + r] = np.linspace(sustain, 0, r)
    return env


def pink_noise(duration, sr=44100):
    n = int(duration * sr)
    white = np.random.randn(n)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004709510]
    a = [1.0, -2.494956002, 2.017265875, -0.522189400]
    from scipy.signal import lfilter
    try:
        return lfilter(b, a, white) * 0.3
    except Exception:
        return white * 0.1


def apply_reverb(signal, decay=0.4, delay_ms=50, sr=44100):
    delay_samples = int(delay_ms / 1000 * sr)
    out = signal.copy()
    for i in range(1, 4):
        d = delay_samples * i
        gain = decay ** i
        if d < len(out):
            out[d:] += signal[:len(out) - d] * gain
    return out


def gen_impact(duration=0.3, freq=40, sr=44100):
    n = int(duration * sr)
    t = np.linspace(0, duration, n, endpoint=False)
    sig = np.sin(2 * np.pi * freq * t) * np.exp(-t * 15)
    noise = np.random.randn(n) * np.exp(-t * 20) * 0.3
    return (sig + noise) * 0.8


def gen_tick(duration=0.05, sr=44100):
    n = int(duration * sr)
    t = np.linspace(0, duration, n, endpoint=False)
    return np.sin(2 * np.pi * 2500 * t) * np.exp(-t * 80) * 0.3


def gen_drone(duration_s, base_freq=55, sr=44100):
    n = int(duration_s * sr)
    t = np.linspace(0, duration_s, n, endpoint=False)
    lfo = 0.3 * np.sin(2 * np.pi * 0.15 * t)
    mod = 15 * np.sin(2 * np.pi * 0.5 * t)
    sig = 0.3 * np.sin(2 * np.pi * (base_freq + mod) * t + lfo)
    sig += 0.15 * np.sin(2 * np.pi * (base_freq * 2.01) * t)
    sig += 0.08 * np.sin(2 * np.pi * (base_freq * 3.03) * t)
    env = adsr(n, attack=0.1, decay=0.05, sustain=0.8, release=0.15)
    return sig * env


def gen_alarm(duration_s, sr=44100):
    n = int(duration_s * sr)
    t = np.linspace(0, duration_s, n, endpoint=False)
    freq = 440 + 200 * np.sin(2 * np.pi * 3 * t)
    sig = 0.4 * np.sin(2 * np.pi * freq * t / sr * sr)
    phase = np.cumsum(freq) / sr
    sig = 0.4 * np.sin(2 * np.pi * phase)
    on_off = (np.sin(2 * np.pi * 2 * t) > 0).astype(float)
    env = adsr(n, attack=0.01, decay=0.05, sustain=0.9, release=0.05)
    return sig * on_off * env * 0.5


def gen_heartbeat(duration_s, bpm=60, sr=44100):
    n = int(duration_s * sr)
    interval = int(60 / bpm * sr)
    sig = np.zeros(n)
    beat_len = min(int(0.15 * sr), interval // 2)
    t_beat = np.linspace(0, 0.15, beat_len, endpoint=False)
    beat = np.sin(2 * np.pi * 50 * t_beat) * np.exp(-t_beat * 25)
    for pos in range(0, n, interval):
        end = min(pos + beat_len, n)
        sig[pos:end] += beat[:end - pos] * 0.6
        second = pos + int(0.18 * sr)
        end2 = min(second + beat_len, n)
        if second < n:
            sig[second:end2] += beat[:end2 - second] * 0.35
    return sig


def gen_calm_pad(duration_s, sr=44100):
    n = int(duration_s * sr)
    t = np.linspace(0, duration_s, n, endpoint=False)
    freqs = [220, 277.18, 329.63, 440]
    sig = np.zeros(n)
    for freq in freqs:
        vibrato = 2 * np.sin(2 * np.pi * 0.2 * t)
        sig += 0.12 * np.sin(2 * np.pi * (freq + vibrato) * t)
    env = adsr(n, attack=0.2, decay=0.1, sustain=0.6, release=0.25)
    sig = sig * env
    return apply_reverb(sig, decay=0.5, delay_ms=80, sr=sr)


def gen_success_chime(duration_s=1.5, sr=44100):
    n = int(duration_s * sr)
    t = np.linspace(0, duration_s, n, endpoint=False)
    note_len = n // 3
    sig = np.zeros(n)
    freqs = [523, 659, 784]
    for idx, freq in enumerate(freqs):
        start = idx * note_len
        end = min(start + note_len, n)
        nt = t[start:end] - t[start]
        mod = 8 * np.sin(2 * np.pi * 4 * nt)
        note = 0.4 * np.sin(2 * np.pi * (freq + mod) * nt)
        note_env = adsr(end - start, attack=0.02, decay=0.1, sustain=0.5, release=0.3)
        sig[start:end] = note * note_env
    sig = apply_reverb(sig * 0.6, decay=0.5, delay_ms=60, sr=sr)
    return sig


def gen_silence(duration_s, sr=44100):
    return np.zeros(int(duration_s * sr))


def normalize_and_clip(samples, headroom_db=-1.0):
    peak = np.max(np.abs(samples))
    if peak > 0:
        target = 10 ** (headroom_db / 20)
        samples = samples * (target / peak)
    return np.tanh(samples)


def place_at(timeline, signal, time_s, sr=44100):
    start = int(time_s * sr)
    end = min(start + len(signal), len(timeline))
    sig_end = end - start
    timeline[start:end] += signal[:sig_end]


def generate_audio():
    """Generate full 60s audio track — same as iteration1."""
    sr = 44100
    total_samples = 60 * sr
    timeline = np.zeros(total_samples)

    # 0-3s: silence → FM drone + pink noise fade in
    drone_full = gen_drone(12, 55, sr)
    drone_env = np.ones(len(drone_full))
    fade_in = int(2.5 * sr)
    drone_env[:fade_in] = np.linspace(0, 1, fade_in)
    place_at(timeline, drone_full * drone_env, 0.5, sr)

    pn = pink_noise(12, sr) * 0.4
    pn_env = np.clip(np.linspace(0, 2, len(pn)), 0, 1)
    place_at(timeline, pn * pn_env, 0.5, sr)

    # 3-12s: heartbeat + drone
    hb = gen_heartbeat(9, 50, sr)
    place_at(timeline, hb * 0.5, 3, sr)

    place_at(timeline, gen_impact(0.3, 40, sr), 8, sr)
    place_at(timeline, gen_impact(0.4, 35, sr), 12, sr)

    # 12-18s: stacked alarm + impacts
    alarm = gen_alarm(6, sr)
    drone_bg = gen_drone(6, 55, sr) * 0.3
    place_at(timeline, alarm * 0.7 + drone_bg, 12, sr)
    place_at(timeline, gen_impact(0.3, 45, sr), 13, sr)
    place_at(timeline, gen_impact(0.35, 38, sr), 15, sr)
    place_at(timeline, gen_impact(0.4, 32, sr), 17, sr)

    # 18-25s: silence + heartbeat + impact
    place_at(timeline, gen_silence(0.5, sr), 18, sr)
    place_at(timeline, gen_heartbeat(4.5, 50, sr) * 0.6, 18.5, sr)
    place_at(timeline, gen_impact(0.5, 30, sr) * 1.2, 20, sr)

    # 25-44s: warm pad + tick sounds
    pad = gen_calm_pad(19, sr)
    place_at(timeline, pad, 25, sr)
    tick_times = [31, 31.8, 32.5, 33.2, 34,
                  36, 36.7, 37.4, 38,
                  40, 40.8, 41.5, 42, 42.5]
    for tt in tick_times:
        place_at(timeline, gen_tick(0.05, sr), tt, sr)
    place_at(timeline, gen_impact(0.5, 35, sr) * 1.0, 42.5, sr)

    # 44-46s: FM chime
    chime = gen_success_chime(1.5, sr)
    place_at(timeline, chime, 44, sr)

    # 46-60s: pad outro with fade
    outro_pad = gen_calm_pad(14, sr)
    fade_len = 3 * sr
    fade_start = len(outro_pad) - fade_len
    if fade_start > 0:
        outro_pad[fade_start:] *= np.linspace(1, 0, len(outro_pad) - fade_start)
    place_at(timeline, outro_pad, 46, sr)

    timeline = normalize_and_clip(timeline, -1.0)

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    wav_path = str(AUDIO_DIR / "full_track_v3.wav")
    write_wav(wav_path, timeline, sr)
    return wav_path


# ── Scene Renderers ────────────────────────────────────────────────────────

def scene_cold_open():
    """0-3s: Dark screen → single dashboard card fades in with agent status."""
    frames = []
    total = 3 * FPS
    sparkline_data = [12, 15, 14, 18, 16, 20, 19, 22, 21, 25, 23, 28]

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)
        a = min(1.0, p * 2.5)  # fade in

        # main card — centered
        cw, ch = s(480), s(260)
        cx = (W - cw) // 2
        cy = (H - ch) // 2 - s(20)

        draw_card(draw, cx, cy, cw, ch, title="AGENT MONITOR", border_color=BORDER_BLUE, alpha=a)
        hh = s(36)

        # agent name + status dot
        f_name = font(22, bold=True)
        f_val = font(16)
        f_label = font(12)

        name_y = cy + hh + s(16)
        draw.text((cx + s(14), name_y), "Treasury Bot",
                   font=f_name, fill=tuple(int(c * a) for c in WHITE))
        draw_status_dot(draw, cx + cw - s(20), name_y + s(10),
                         tuple(int(c * a) for c in GREEN_STATUS))
        draw.text((cx + cw - s(60), name_y + s(3)), "Active",
                   font=f_label, fill=tuple(int(c * a) for c in GREEN_STATUS))

        # balance
        bal_y = name_y + s(44)
        draw.text((cx + s(14), bal_y), "BALANCE", font=f_label,
                   fill=tuple(int(c * a) for c in GRAY))
        draw.text((cx + s(14), bal_y + s(18)), "$142,000", font=font(28, bold=True),
                   fill=tuple(int(c * a) for c in WHITE))

        # sparkline
        if p > 0.4:
            sa = min(1.0, (p - 0.4) * 3)
            draw_sparkline(draw, cx + s(260), bal_y + s(10), s(180), s(40),
                            sparkline_data, MANDATE_BLUE, alpha=sa)
            draw.text((cx + s(260), bal_y), "7d ACTIVITY", font=f_label,
                       fill=tuple(int(c * sa) for c in GRAY))

        # bottom bar — last tx
        btm_y = cy + ch - s(40)
        draw.text((cx + s(14), btm_y), "Last TX: 2h ago", font=f_label,
                   fill=tuple(int(c * a) for c in GRAY_LIGHT))
        if p > 0.6:
            draw_status_pill(draw, cx + cw - s(120), btm_y - s(2),
                              "NO POLICY", GRAY, bg_color=(40, 40, 50),
                              alpha=min(1.0, (p - 0.6) * 3))

        frames.append(img)
    return frames


def scene_agent_acts():
    """3-8s: Transaction card appears with fields filling in."""
    frames = []
    total = 5 * FPS
    activity_data = [5, 8, 12, 6, 15, 9, 7, 11, 14, 8, 22, 45]

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        f_label = font(12)
        f_val = font(16)
        f_big = font(14, bold=True)

        # left card — agent status (persists from scene 1)
        lcw, lch = s(320), s(180)
        lcx = s(80)
        lcy = (H - lch) // 2

        draw_card(draw, lcx, lcy, lcw, lch, title="AGENT MONITOR", border_color=BORDER_BLUE)
        hh = s(36)
        draw.text((lcx + s(14), lcy + hh + s(12)), "Treasury Bot", font=font(18, bold=True), fill=WHITE)
        draw_status_dot(draw, lcx + lcw - s(20), lcy + hh + s(22), GREEN_STATUS)
        draw.text((lcx + s(14), lcy + hh + s(42)), "$142,000",
                   font=font(22, bold=True), fill=WHITE)

        # right card — transaction (slides in)
        rcw, rch = s(420), s(280)
        slide = ease_out_cubic(min(1.0, p * 2))
        rcx = int(s(440) + (1 - slide) * s(500))
        rcy = (H - rch) // 2

        draw_card(draw, rcx, rcy, rcw, rch, title="PENDING TRANSACTION",
                  border_color=YELLOW_STATUS)
        rhh = s(36)

        # fields appear progressively
        fields = [
            ("FROM", "treasury-bot-v2", WHITE_DIM, 0.15),
            ("TO", "0xd3aD...8f4c", WHITE_DIM, 0.25),
            ("AMOUNT", "42,000 USDC", WHITE, 0.35),
            ("CHAIN", "Ethereum Mainnet", GRAY_LIGHT, 0.45),
            ("GAS", "~$3.20", GRAY_LIGHT, 0.55),
        ]

        fy = rcy + rhh + s(16)
        for label, value, color, threshold in fields:
            if p > threshold:
                fa = min(1.0, (p - threshold) * 5)
                draw.text((rcx + s(14), fy), label, font=f_label,
                           fill=tuple(int(c * fa) for c in GRAY))
                draw.text((rcx + s(100), fy), value, font=f_val,
                           fill=tuple(int(c * fa) for c in color))
                fy += s(38)

        # activity chart in background
        if p > 0.3:
            ca = min(0.4, (p - 0.3) * 0.8)
            chart_x = lcx + s(14)
            chart_y = lcy + lch - s(50)
            draw_sparkline(draw, chart_x, chart_y, lcw - s(28), s(30),
                            activity_data, MANDATE_BLUE, alpha=ca)

        frames.append(img)
    return frames


def scene_tx_confirms():
    """8-12s: Status changes PENDING→CONFIRMED. Balance drains. No policy badge."""
    frames = []
    total = 4 * FPS

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        f_label = font(12)
        f_val = font(16)

        # tx card — center
        cw, ch = s(480), s(320)
        cx = (W - cw) // 2
        cy = (H - ch) // 2

        border = YELLOW_STATUS if p < 0.35 else GREEN_STATUS
        draw_card(draw, cx, cy, cw, ch, title="TRANSACTION STATUS", border_color=border)
        hh = s(36)

        # status pill — animates
        pill_y = cy + hh + s(14)
        if p < 0.35:
            draw_status_pill(draw, cx + s(14), pill_y, "PENDING", YELLOW_STATUS)
            # pulse effect
            pulse = 0.5 + 0.5 * math.sin(p * 20)
            dot_c = tuple(int(c * pulse) for c in YELLOW_STATUS)
            draw_status_dot(draw, cx + s(110), pill_y + s(10), dot_c, radius=4)
        else:
            draw_status_pill(draw, cx + s(14), pill_y, "CONFIRMED", GREEN_STATUS)

        # tx details
        ty = pill_y + s(36)
        details = [
            ("Block", "#19,482,331"),
            ("Gas Used", "21,000"),
            ("To", "0xd3aD...8f4c"),
            ("Amount", "42,000 USDC"),
        ]
        for label, val in details:
            draw.text((cx + s(14), ty), label, font=f_label, fill=GRAY)
            draw.text((cx + s(140), ty), val, font=f_val, fill=WHITE_DIM)
            ty += s(32)

        # balance counter — drains after confirm
        bal_y = ty + s(16)
        draw.text((cx + s(14), bal_y), "WALLET BALANCE", font=f_label, fill=GRAY)
        if p > 0.35:
            drain_p = min(1.0, (p - 0.35) / 0.4)
            bal_text = animate_balance(142000, 100000, drain_p)
            bc = tuple(int(r + (g - r) * (1 - drain_p))
                       for r, g in zip(RED_STATUS, WHITE))
            draw.text((cx + s(14), bal_y + s(18)), bal_text,
                       font=font(26, bold=True), fill=bc)
        else:
            draw.text((cx + s(14), bal_y + s(18)), "$142,000",
                       font=font(26, bold=True), fill=WHITE)

        # "No policy layer" badge — appears at end
        if p > 0.7:
            ba = min(1.0, (p - 0.7) * 4)
            badge_y = cy + ch - s(44)
            draw_status_pill(draw, cx + s(14), badge_y, "NO POLICY LAYER",
                              RED_STATUS, alpha=ba)

        frames.append(img)
    return frames


def scene_reveal():
    """12-18s: Cards flash red. THREAT ANALYSIS card slides in."""
    frames = []
    total = 6 * FPS

    threat_items = [
        ("Contract Age", "2 hours", RED_STATUS),
        ("Interactions", "Known mixer", RED_STATUS),
        ("Pattern", "Phishing contract", RED_STATUS),
        ("Risk Score", "CRITICAL", RED_STATUS),
        ("Recovery", "IMPOSSIBLE", RED_STATUS),
    ]

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        # red tint builds up
        if p > 0.15:
            tint_a = min(0.3, (p - 0.15) * 0.5)
            tint = Image.new("RGB", (W, H),
                              tuple(int(c * tint_a * 3) for c in (60, 5, 5)))
            img = Image.blend(img, tint, tint_a)
            draw = ImageDraw.Draw(img)

        f_label = font(12)
        f_val = font(14)

        # left: balance card — red border, cracking
        lcw, lch = s(300), s(200)
        lcx = s(60)
        lcy = (H - lch) // 2

        flash = RED_STATUS if (p * 10) % 1 < 0.5 and p < 0.3 else BORDER_RED
        draw_card(draw, lcx, lcy, lcw, lch, title="WALLET STATUS",
                  border_color=flash)
        hh = s(36)

        draw.text((lcx + s(14), lcy + hh + s(16)), "$100,000",
                   font=font(24, bold=True), fill=RED_STATUS)
        draw.text((lcx + s(14), lcy + hh + s(50)), "-$42,000 USDC",
                   font=font(16), fill=RED_STATUS)
        draw_status_pill(draw, lcx + s(14), lcy + lch - s(44),
                          "COMPROMISED", RED_STATUS)

        # right: threat analysis card slides in
        rcw, rch = s(440), s(340)
        slide = ease_out_cubic(min(1.0, max(0, p - 0.1) * 2))
        rcx = int(s(420) + (1 - slide) * s(500))
        rcy = (H - rch) // 2

        draw_card(draw, rcx, rcy, rcw, rch, title="THREAT ANALYSIS",
                  border_color=RED_STATUS)
        rhh = s(36)

        if slide > 0.3:
            items_p = (slide - 0.3) / 0.7
            ty = rcy + rhh + s(14)
            n_show = min(len(threat_items), int(items_p * len(threat_items) * 1.4) + 1)
            for j in range(n_show):
                label, val, color = threat_items[j]
                draw.text((rcx + s(14), ty), label, font=f_label, fill=GRAY)
                draw.text((rcx + s(180), ty), val, font=f_val, fill=color)
                ty += s(34)

            # bottom verdict
            if items_p > 0.7:
                va = min(1.0, (items_p - 0.7) * 4)
                vy = rcy + rch - s(50)
                draw.text((rcx + s(14), vy), "VERDICT:", font=font(14, bold=True),
                           fill=tuple(int(c * va) for c in WHITE))
                draw.text((rcx + s(120), vy), "FUNDS UNRECOVERABLE",
                           font=font(14, bold=True),
                           fill=tuple(int(c * va) for c in RED_STATUS))

        frames.append(img)
    return frames


def scene_punchline():
    """18-22s: All cards fade. Single stark card with the damage summary."""
    frames = []
    total = 4 * FPS

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        # single center card
        cw, ch = s(560), s(240)
        cx = (W - cw) // 2
        cy = (H - ch) // 2

        a = min(1.0, p * 2)
        draw_card(draw, cx, cy, cw, ch, border_color=BORDER_RED, alpha=a)

        # text inside card
        lines = [
            ("No policy.", WHITE, font(28, bold=True)),
            ("No simulation.", WHITE, font(28, bold=True)),
            ("No approval.", WHITE, font(28, bold=True)),
            ("$42,000 gone.", RED_STATUS, font(32, bold=True)),
        ]

        ly = cy + s(30)
        for j, (text, color, f) in enumerate(lines):
            threshold = j * 0.15 + 0.1
            if p > threshold:
                la = min(1.0, (p - threshold) * 4)
                tw, _ = text_size(draw, text, f)
                draw.text(((W - tw) // 2, ly), text, font=f,
                           fill=tuple(int(c * la) for c in color))
            ly += s(48)

        # pulsing red border
        if p > 0.6:
            pulse = 0.5 + 0.5 * math.sin((p - 0.6) * 20)
            bc = tuple(int(c * pulse) for c in RED_STATUS)
            draw.rounded_rectangle([cx - 1, cy - 1, cx + cw + 1, cy + ch + 1],
                                    radius=s(8), outline=bc,
                                    width=max(1, s(2)))

        frames.append(img)
    return frames


def scene_beat():
    """22-25s: Screen clears. Gradient sweep. 'Same scenario. With Mandate.'"""
    frames = []
    total = 3 * FPS

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        # gradient line sweeps left to right
        if p < 0.5:
            sweep_x = int(p * 2 * W)
            line_w = s(3)
            for dx in range(-s(40), s(40)):
                x = sweep_x + dx
                if 0 <= x < W:
                    intensity = max(0, 1 - abs(dx) / s(40))
                    c = tuple(int(v * intensity * 0.6) for v in MANDATE_BLUE)
                    draw.line([(x, 0), (x, H)], fill=c)

        # text appears after sweep
        if p > 0.35:
            ta = min(1.0, (p - 0.35) * 3)
            f1 = font(22)
            f2 = font(32, bold=True)
            text1 = "Same scenario."
            text2 = "With Mandate."
            tw1, _ = text_size(draw, text1, f1)
            tw2, _ = text_size(draw, text2, f2)
            draw.text(((W - tw1) // 2, H // 2 - s(30)), text1, font=f1,
                       fill=tuple(int(c * ta) for c in GRAY_LIGHT))
            draw.text(((W - tw2) // 2, H // 2 + s(10)), text2, font=f2,
                       fill=tuple(int(c * ta) for c in MANDATE_BLUE))

        frames.append(img)
    return frames


def scene_pipeline():
    """25-30s: Three pipeline cards appear connected by arrows."""
    frames = []
    total = 5 * FPS

    cards = [
        ("POLICY ENGINE", MANDATE_BLUE),
        ("REPUTATION", MANDATE_CYAN),
        ("SIMULATION", (160, 100, 255)),
    ]

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        card_w = s(220)
        card_h = s(120)
        gap = s(60)
        total_w = card_w * 3 + gap * 2
        start_x = (W - total_w) // 2
        cy = (H - card_h) // 2

        for j, (name, color) in enumerate(cards):
            threshold = j * 0.2
            if p > threshold:
                ca = min(1.0, (p - threshold) * 3)
                cx = start_x + j * (card_w + gap)

                draw_card(draw, cx, cy, card_w, card_h, border_color=color, alpha=ca)

                # card label
                f_name = font(14, bold=True)
                tw, _ = text_size(draw, name, f_name)
                draw.text((cx + (card_w - tw) // 2, cy + s(20)), name,
                           font=f_name,
                           fill=tuple(int(c * ca) for c in color))

                # processing status
                if p > threshold + 0.3:
                    sa = min(1.0, (p - threshold - 0.3) * 3)
                    draw_status_pill(draw, cx + s(40), cy + card_h - s(40),
                                      "PROCESSING...", YELLOW_STATUS, alpha=sa)

                # arrow to next card
                if j < 2 and p > threshold + 0.15:
                    aa = min(1.0, (p - threshold - 0.15) * 4)
                    ax = cx + card_w + s(5)
                    ay = cy + card_h // 2
                    ac = tuple(int(c * aa) for c in GRAY)
                    draw.line([(ax, ay), (ax + gap - s(10), ay)], fill=ac,
                               width=max(1, s(2)))
                    # arrowhead
                    aw = s(8)
                    draw.polygon([(ax + gap - s(10), ay - aw // 2),
                                   (ax + gap - s(10), ay + aw // 2),
                                   (ax + gap - s(2), ay)], fill=ac)

        frames.append(img)
    return frames


def scene_layer1_policy():
    """30-35s: Policy card expands with checklist."""
    frames = []
    total = 5 * FPS

    checks = [
        ("Single TX limit: $5,000", "ESCALATE", YELLOW_STATUS),
        ("Daily limit: $50,000", "PASS", GREEN_STATUS),
        ("Monthly limit: $200,000", "PASS", GREEN_STATUS),
        ("Destination allowlist", "ESCALATE", YELLOW_STATUS),
    ]

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        cw, ch = s(500), s(300)
        cx = (W - cw) // 2
        cy = (H - ch) // 2

        draw_card(draw, cx, cy, cw, ch, title="POLICY ENGINE",
                  border_color=MANDATE_BLUE)
        hh = s(36)

        n_show = min(len(checks), int(p * len(checks) * 1.5) + 1)
        ry = cy + hh + s(16)
        for j in range(n_show):
            text, status, color = checks[j]
            draw_checklist_row(draw, cx + s(14), ry, text, status, color)
            ry += s(34)

        # verdict at bottom
        if p > 0.7:
            va = min(1.0, (p - 0.7) * 4)
            vy = cy + ch - s(44)
            draw.text((cx + s(14), vy), "Result:", font=font(14, bold=True),
                       fill=tuple(int(c * va) for c in WHITE))
            draw_status_pill(draw, cx + s(100), vy - s(2),
                              "NEEDS APPROVAL", YELLOW_STATUS, alpha=va)

        frames.append(img)
    return frames


def scene_layer2_reputation():
    """35-39s: Reputation card with progress bar."""
    frames = []
    total = 4 * FPS

    checks = [
        ("Agent age: 14 days", "PASS", GREEN_STATUS),
        ("Success rate: 98.2%", "PASS", GREEN_STATUS),
        ("Previous violations: 0", "PASS", GREEN_STATUS),
    ]

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        cw, ch = s(500), s(320)
        cx = (W - cw) // 2
        cy = (H - ch) // 2

        draw_card(draw, cx, cy, cw, ch, title="REPUTATION ENGINE",
                  border_color=MANDATE_CYAN)
        hh = s(36)

        # reputation score bar
        bar_y = cy + hh + s(16)
        draw.text((cx + s(14), bar_y), "REPUTATION SCORE", font=font(12), fill=GRAY)
        bar_y += s(20)
        score_p = min(1.0, p * 2)
        draw_progress_bar(draw, cx + s(14), bar_y, cw - s(28),
                           87 * score_p, 100, MANDATE_CYAN)
        # score number
        if score_p > 0.3:
            score = int(87 * min(1.0, score_p / 0.8))
            draw.text((cx + cw - s(60), bar_y - s(18)), f"{score}/100",
                       font=font(16, bold=True), fill=MANDATE_CYAN)

        # checklist
        ry = bar_y + s(30)
        n_show = min(len(checks), int(p * len(checks) * 1.5) + 1)
        for j in range(n_show):
            text, status, color = checks[j]
            draw_checklist_row(draw, cx + s(14), ry, text, status, color)
            ry += s(34)

        # verdict
        if p > 0.75:
            va = min(1.0, (p - 0.75) * 5)
            vy = cy + ch - s(44)
            draw.text((cx + s(14), vy), "Result:", font=font(14, bold=True),
                       fill=tuple(int(c * va) for c in WHITE))
            draw_status_pill(draw, cx + s(100), vy - s(2),
                              "TRUSTED", GREEN_STATUS, alpha=va)

        frames.append(img)
    return frames


def scene_layer3_simulation():
    """39-44s: Simulation card → CRITICAL → BLOCKED banner."""
    frames = []
    total = 5 * FPS

    checks = [
        ("Dry-run execution", "RUNNING...", YELLOW_STATUS),
        ("Token flow analysis", "ANOMALY", ORANGE),
        ("Contract verification", "CRITICAL", RED_STATUS),
        ("Destination: phishing contract", "CRITICAL", RED_STATUS),
    ]

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        cw, ch = s(500), s(300)
        cx = (W - cw) // 2
        cy = (H - ch) // 2

        sim_color = (160, 100, 255)
        draw_card(draw, cx, cy, cw, ch, title="SIMULATION ENGINE",
                  border_color=sim_color)
        hh = s(36)

        n_show = min(len(checks), int(p * len(checks) * 1.3) + 1)
        ry = cy + hh + s(16)
        for j in range(n_show):
            text, status, color = checks[j]
            # animate running dots
            if status == "RUNNING..." and p < 0.4:
                dots = "." * (int(p * 10) % 4)
                status = "RUNNING" + dots
            elif status == "RUNNING..." and p >= 0.4:
                status = "DONE"
                color = GREEN_STATUS
            draw_checklist_row(draw, cx + s(14), ry, text, status, color)
            ry += s(34)

        # BLOCKED banner slides down
        if p > 0.7:
            ba = min(1.0, (p - 0.7) * 4)
            banner_h = s(56)
            banner_y = cy + ch + s(20)
            # red banner full width
            bx = cx - s(20)
            bw = cw + s(40)
            draw.rounded_rectangle([bx, banner_y, bx + bw, banner_y + banner_h],
                                    radius=s(6),
                                    fill=tuple(int(c * ba) for c in RED_STATUS))
            f_block = font(24, bold=True)
            block_text = "BLOCKED"
            btw, _ = text_size(draw, block_text, f_block)
            draw.text(((W - btw) // 2, banner_y + s(14)), block_text,
                       font=f_block, fill=(int(255 * ba), int(255 * ba), int(255 * ba)))

        frames.append(img)
    return frames


def scene_notification():
    """44-50s: Slack-like notification (same as iteration2 cherry-pick)."""
    frames = []
    total = 6 * FPS

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)
        f = font(18)
        f_head = font(20, bold=True)
        f_sm = font(14)

        # card slides in
        card_w = int(W * 0.65)
        card_h = int(H * 0.72)
        slide = min(1.0, p * 2.5)
        slide = 1 - (1 - slide) ** 3
        card_x = int(W * 0.17 + (1 - slide) * W * 0.5)
        card_y = int(H * 0.12)

        # drop shadow
        sh = s(8)
        draw.rectangle([card_x + sh, card_y + sh,
                         card_x + card_w + sh, card_y + card_h + sh],
                         fill=(3, 3, 3))

        # main bg
        draw.rectangle([card_x, card_y, card_x + card_w, card_y + card_h],
                         fill=(25, 18, 32))

        # Slack sidebar
        sidebar_w = s(56)
        draw.rectangle([card_x, card_y, card_x + sidebar_w, card_y + card_h],
                         fill=(42, 16, 56))
        icon_r = s(16)
        icon_cx = card_x + sidebar_w // 2
        icon_cy = card_y + s(28)
        draw.ellipse([icon_cx - icon_r, icon_cy - icon_r,
                       icon_cx + icon_r, icon_cy + icon_r], fill=(80, 40, 100))
        draw.text((icon_cx - s(6), icon_cy - s(8)), "M",
                   font=font(16, bold=True), fill=WHITE)
        for j in range(3):
            dy = s(70 + j * 30)
            dr = s(4)
            draw.ellipse([icon_cx - dr, card_y + dy - dr,
                           icon_cx + dr, card_y + dy + dr], fill=(80, 60, 90))

        # header bar
        header_h = s(44)
        hx = card_x + sidebar_w
        draw.rectangle([hx, card_y, card_x + card_w, card_y + header_h],
                         fill=(30, 22, 38))
        draw.text((hx + s(16), card_y + s(12)),
                   "# alerts-treasury", font=font(16, bold=True),
                   fill=(200, 200, 210))
        dot_x = card_x + card_w - s(20)
        draw.ellipse([dot_x - 4, card_y + s(20) - 4,
                       dot_x + 4, card_y + s(20) + 4], fill=GREEN_STATUS)

        # message area
        msg_x = card_x + sidebar_w + s(16)
        msg_y = card_y + header_h + s(16)

        if slide > 0.3:
            cp = (slide - 0.3) / 0.7

            # bot avatar
            av_r = s(18)
            av_cx = msg_x + av_r
            av_cy = msg_y + av_r
            draw.ellipse([av_cx - av_r, av_cy - av_r,
                           av_cx + av_r, av_cy + av_r], fill=MANDATE_BLUE)
            draw.text((av_cx - s(7), av_cy - s(9)), "M",
                       font=font(18, bold=True), fill=WHITE)

            name_x = av_cx + av_r + s(10)
            draw.text((name_x, msg_y + s(2)), "Mandate Bot", font=f_head, fill=WHITE)
            draw.text((name_x + s(120), msg_y + s(4)),
                       "APP  3:14 AM", font=f_sm, fill=GRAY)

            content_lines = [
                ("Transaction BLOCKED", RED_STATUS, True),
                ("", WHITE, False),
                ("Agent treasury-bot-v2 attempted:", WHITE, False),
                ("  Transfer 42,000 USDC -> 0xd3aD", WHITE, False),
                ("  Destination: PHISHING CONTRACT", RED_STATUS, False),
                ("", WHITE, False),
                ("Three layers caught it:", MANDATE_BLUE, True),
                ("  Policy:     [!!] Over auto-approve", YELLOW_STATUS, False),
                ("  Reputation: [OK] Agent trusted", GREEN_STATUS, False),
                ("  Simulation: [!!] Phishing contract", RED_STATUS, False),
                ("", WHITE, False),
                ("Funds: SAFE", GREEN_STATUS, True),
                ("Circuit breaker: ACTIVATED", ORANGE, False),
            ]
            lines_shown = min(len(content_lines),
                               int(cp * len(content_lines) * 1.3) + 1)
            cy = msg_y + s(44)
            bar_top = cy
            for j in range(lines_shown):
                text, color, bold = content_lines[j]
                used_f = f_head if bold else f
                draw.text((msg_x + s(16), cy), text, font=used_f, fill=color)
                cy += s(26)
            draw.rectangle([msg_x + s(4), bar_top, msg_x + s(8), cy],
                            fill=RED_STATUS)

            if cp > 0.8:
                ry = cy + s(12)
                reactions = [("eyes  3", (60, 50, 70)),
                             ("rotating_light  1", (60, 50, 70))]
                rx = msg_x + s(16)
                for rtxt, rbg in reactions:
                    rw = int(len(rtxt) * 8 * SCALE) + s(16)
                    draw.rounded_rectangle([rx, ry, rx + rw, ry + s(24)],
                                            radius=s(4), fill=rbg,
                                            outline=(80, 70, 90))
                    draw.text((rx + s(6), ry + s(3)), rtxt, font=f_sm,
                               fill=(200, 200, 210))
                    rx += rw + s(8)

        frames.append(img)
    return frames


def scene_split_screen():
    """50-55s: Two dashboard states side by side."""
    frames = []
    total = 5 * FPS

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        mid_x = W // 2
        f_label = font(12)

        # divider
        draw.line([(mid_x, s(40)), (mid_x, H - s(40))], fill=GRAY,
                   width=max(1, s(1)))

        # LEFT: unprotected (red)
        lcw, lch = s(360), s(300)
        lcx = (mid_x - lcw) // 2
        lcy = (H - lch) // 2

        # red tint on left half
        for yy in range(0, H, 4):
            draw.line([(0, yy), (mid_x - 1, yy)],
                       fill=tuple(int(c * 0.06) for c in RED_STATUS))

        draw_card(draw, lcx, lcy, lcw, lch, title="WITHOUT MANDATE",
                  border_color=BORDER_RED)
        hh = s(36)
        ly = lcy + hh + s(16)
        draw.text((lcx + s(14), ly), "BALANCE", font=f_label, fill=GRAY)
        ly += s(18)
        draw.text((lcx + s(14), ly), "$100,000", font=font(24, bold=True),
                   fill=RED_STATUS)
        ly += s(40)
        draw_status_pill(draw, lcx + s(14), ly, "COMPROMISED", RED_STATUS)
        ly += s(36)
        draw.text((lcx + s(14), ly), "-$42,000 stolen", font=font(14),
                   fill=RED_STATUS)
        ly += s(24)
        draw.text((lcx + s(14), ly), "Funds unrecoverable", font=font(12),
                   fill=GRAY)

        # RIGHT: with Mandate (green)
        rcx = mid_x + (mid_x - lcw) // 2
        rcy = lcy

        # green tint on right half
        for yy in range(0, H, 4):
            draw.line([(mid_x + 1, yy), (W - 1, yy)],
                       fill=tuple(int(c * 0.04) for c in GREEN_STATUS))

        slide_a = min(1.0, p * 2)
        draw_card(draw, rcx, rcy, lcw, lch, title="WITH MANDATE",
                  border_color=BORDER_GREEN, alpha=slide_a)
        ry = rcy + hh + s(16)
        c_a = lambda c: tuple(int(v * slide_a) for v in c)
        draw.text((rcx + s(14), ry), "BALANCE", font=f_label, fill=c_a(GRAY))
        ry += s(18)
        draw.text((rcx + s(14), ry), "$142,000", font=font(24, bold=True),
                   fill=c_a(GREEN_STATUS))
        ry += s(40)
        draw_status_pill(draw, rcx + s(14), ry, "PROTECTED", GREEN_STATUS,
                          alpha=slide_a)
        ry += s(36)
        draw.text((rcx + s(14), ry), "TX blocked by Mandate", font=font(14),
                   fill=c_a(GREEN_STATUS))
        ry += s(24)
        draw.text((rcx + s(14), ry), "Circuit breaker active", font=font(12),
                   fill=c_a(GRAY))

        frames.append(img)
    return frames


def scene_tagline():
    """55-58s: 'Three layers of trust...' + wallet compatibility."""
    frames = []
    total = 3 * FPS
    wallets = "Local key  |  Privy  |  Turnkey  |  Multisig  |  Any signer"

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        a = min(1.0, p * 2)
        f1 = font(42, bold=True)
        f2 = font(36)
        f3 = font(20)

        text1 = "Three layers of trust"
        tw1, _ = text_size(draw, text1, f1)
        y1 = H // 2 - s(60)
        draw.text(((W - tw1) // 2, y1), text1, font=f1,
                   fill=tuple(int(c * a) for c in WHITE))

        if p > 0.3:
            a2 = min(1.0, (p - 0.3) * 2)
            text2 = "before any agent touches money."
            tw2, _ = text_size(draw, text2, f2)
            y2 = H // 2 - s(10)
            draw.text(((W - tw2) // 2, y2), text2, font=f2,
                       fill=tuple(int(c * a2) for c in MANDATE_BLUE))

        if p > 0.6:
            a3 = min(1.0, (p - 0.6) * 3)
            f_compat = font(24, bold=True)
            compat_text = "Works with any wallet."
            tw_c, _ = text_size(draw, compat_text, f_compat)
            y_compat = H // 2 + s(60)
            draw.text(((W - tw_c) // 2, y_compat), compat_text,
                       font=f_compat, fill=tuple(int(c * a3) for c in GREEN_STATUS))
            tw_w, _ = text_size(draw, wallets, f3)
            y_wallets = H // 2 + s(92)
            draw.text(((W - tw_w) // 2, y_wallets), wallets,
                       font=f3, fill=tuple(int(c * a3) for c in GRAY))

        frames.append(img)
    return frames


def scene_logo():
    """58-60s: MANDATE logo + URL."""
    frames = []
    total = 2 * FPS

    for i in range(total):
        p = i / total
        img = blank()
        draw = ImageDraw.Draw(img)

        a = min(1.0, p * 3)

        # logo
        f_logo = font(72, bold=True)
        text_logo = "MANDATE"
        tw, _ = text_size(draw, text_logo, f_logo)
        x = (W - tw) // 2
        y = H // 2 - s(80)
        draw.text((x, y), text_logo, font=f_logo,
                   fill=tuple(int(c * a) for c in WHITE))

        # blue accent line under logo
        line_w = int(tw * min(1.0, p * 2.5))
        line_x = (W - line_w) // 2
        line_y = y + s(70)
        if line_w > 0:
            # gradient blue→cyan
            for dx in range(line_w):
                ratio = dx / max(1, line_w)
                c = tuple(int(MANDATE_BLUE[k] + (MANDATE_CYAN[k] - MANDATE_BLUE[k]) * ratio)
                          for k in range(3))
                c = tuple(int(v * a) for v in c)
                draw.line([(line_x + dx, line_y), (line_x + dx, line_y + s(3))], fill=c)

        # subtitle
        f_sub = font(22)
        sub_text = "Policy. Reputation. Simulation. Any wallet. Non-custodial."
        tw_sub, _ = text_size(draw, sub_text, f_sub)
        draw.text(((W - tw_sub) // 2, line_y + s(24)), sub_text, font=f_sub,
                   fill=tuple(int(c * a) for c in GRAY))

        # URL
        f_url = font(28, bold=True)
        url_text = "mandate.krutovoy.me"
        tw_url, _ = text_size(draw, url_text, f_url)
        draw.text(((W - tw_url) // 2, line_y + s(64)), url_text, font=f_url,
                   fill=tuple(int(c * a) for c in GREEN_STATUS))

        frames.append(img)
    return frames


# ── Assembly ────────────────────────────────────────────────────────────────

def main():
    global FRAMES_DIR
    print(f"Generating Mandate demo v3 — The Control Room ({W}x{H} @ {FPS}fps)")
    print(f"   Mode: {'PREVIEW' if PREVIEW else 'PRODUCTION'}")
    print(f"   Orientation: {'VERTICAL' if VERTICAL else 'HORIZONTAL'}")

    print("Generating audio track...")
    audio_path = generate_audio()
    print(f"   Audio: {audio_path}")

    FRAMES_DIR = Path(tempfile.mkdtemp(prefix="mandate_v3_"))
    print(f"Rendering frames to {FRAMES_DIR}")

    scene_builders = [
        ("Cold Open (0-3s)", scene_cold_open),
        ("Agent Acts (3-8s)", scene_agent_acts),
        ("TX Confirms (8-12s)", scene_tx_confirms),
        ("Reveal (12-18s)", scene_reveal),
        ("Punchline (18-22s)", scene_punchline),
        ("Beat (22-25s)", scene_beat),
        ("Pipeline (25-30s)", scene_pipeline),
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

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = str(OUTPUT_DIR / "mandate-demo-v3-60s.mp4")

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

    shutil.rmtree(FRAMES_DIR)

    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nDone!")
    print(f"   Output: {output_path}")
    print(f"   Size: {file_size:.1f} MB")
    print(f"   Duration: {total_duration:.1f}s")
    print(f"   Resolution: {W}x{H} @ {FPS}fps")


if __name__ == "__main__":
    main()
