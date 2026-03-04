# STT Service

A production-ready, high-performance Speech-to-Text microservice built on [faster-whisper](https://github.com/SYSTRAN/faster-whisper) and served via FastAPI. Designed for low-latency transcription within a containerized, security-hardened environment.

## Table of Contents

- [STT Service](#stt-service)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Dual-Model Pipeline](#dual-model-pipeline)
  - [API](#api)
    - [`POST /v1/stt/transcriptions`](#post-v1stttranscriptions)
    - [`GET /health`](#get-health)
    - [`GET /metrics`](#get-metrics)
  - [Configuration](#configuration)
  - [Dependencies](#dependencies)
  - [Repository Structure](#repository-structure)
  - [Docker](#docker)
    - [Build](#build)
    - [Run](#run)
    - [GPU (optional)](#gpu-optional)
    - [Implementation Details](#implementation-details)
  - [Security](#security)
  - [Observability](#observability)

---

## Features

- **4x faster** inference than standard OpenAI Whisper via the CTranslate2 backend
- **~50% lower memory footprint** through INT8 quantization
- **Dual-model pipeline** — a lightweight `tiny` model performs fast language detection before the main model begins transcription
- **Confidence-threshold fallback** — if the `tiny` model's language probability falls below `0.5`, language detection is delegated to the main model, preventing silent misclassification
- **16.5% reduction in total processing time** from offloading language detection to the `tiny` model
- **VAD (Voice Activity Detection)** filtering built into the transcription pipeline to strip silence and reduce hallucinations
- **Prometheus metrics** exposed at `/metrics` for out-of-the-box observability
- **Non-root container execution** for runtime security and container breakout prevention
- **Multi-stage Docker build** that produces a lean, dependency-minimal runtime image

---

## Dual-Model Pipeline

The service separates language detection from transcription across two independently loaded models. This avoids the overhead of running full-beam search on the main model just to determine language.

```mermaid
flowchart TD
    A([Audio Input]) --> B[Decode Audio
faster-whisper decode_audio]
    B --> C[Tiny Model 
            beam_size=1 
            temperature=0]
    C --> D{language_probability
≥ 0.5?}
    D -- Yes --> E[Use detected language]
    D -- No
Low confidence --> F[Pass language=None
to main model]
    E --> G[Main Model Transcription]
    F --> G
    G --> H([Return text · language · duration])
```

**Key design decisions:**

| Stage | Model | Config | Purpose |
|---|---|---|---|
| Language Detection | `whisper-tiny` | `beam_size=1`, `temperature=0`, `cpu_threads=2` | Fast, greedy language ID |
| Transcription | Configurable (default: `medium`) | INT8, `vad_filter=True`, `min_silence_ms=500` | High-accuracy transcription |

When the tiny model's confidence is below the threshold, `language=None` is passed to the main model, which performs its own internal language detection during the first transcription pass — adding minimal overhead while guaranteeing correctness.

---

## API

### `POST /v1/stt/transcriptions`

Accepts an audio file URL (e.g. from object storage), downloads it internally, and returns the transcription.

**Request body** (`application/json`):

```json
{
  "audio_url": "https://your-storage/audio/file.wav",
  "context": ""
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `audio_url` | `string` | Yes | Presigned or accessible URL pointing to the audio file |
| `context` | `string` | No | Optional context hint (reserved for future prompt conditioning) |

**Response** (`200 OK`):

```json
{
  "text": "Hello, how are you today?",
  "language": "en",
  "duration": 1.43
}
```

| Field | Type | Description |
|---|---|---|
| `text` | `string` | Full transcription of the audio |
| `language` | `string` | BCP-47 language code detected or inferred |
| `duration` | `float` | Total server-side processing time in seconds |

**Error responses:**

| Status | Condition |
|---|---|
| `400` | Audio URL returned a non-2xx response (e.g. storage access denied) |
| `502` | Network error reaching the audio URL |
| `500` | Internal transcription failure |

### `GET /health`

Returns `{"status": "ok"}` — used by container orchestrators for liveness probing.

### `GET /metrics`

Prometheus-compatible metrics endpoint exposed by `prometheus-fastapi-instrumentator`. Includes request counts, latencies, and in-flight request gauges per route.

---

## Configuration

All runtime parameters are injected via environment variables with safe defaults.

| Variable | Default | Description |
|---|---|---|
| `WHISPER_MODEL` | `medium` | Main model size: `tiny`, `base`, `small`, `medium`, `large-v3` |
| `WHISPER_DEVICE` | `cpu` | Inference device: `cpu` or `cuda` |
| `WHISPER_COMPUTE_TYPE` | `int8` | Quantization type: `int8`, `float16`, `float32` |
| `WHISPER_CPU_THREADS` | `8` | CPU thread count for the main model |
| `WHISPER_NUM_WORKERS` | `1` | Parallel worker count for the main model |

> Using `cuda` with `float16` is recommended for GPU-accelerated deployments. The `int8` default is optimised for CPU inference.

---

## Dependencies

| Package | Version | Role |
|---|---|---|
| `fastapi` | `0.128.7` | API layer — request routing, dependency injection, OpenAPI schema generation |
| `uvicorn` | `0.40.0` | ASGI server — serves FastAPI with async I/O via `asyncio` event loop |
| `python-multipart` | `0.0.22` | Multipart form-data parser required for file upload support in FastAPI |
| `faster-whisper` | `1.2.1` | Core inference engine — CTranslate2-optimized Whisper with INT8 quantization |
| `prometheus-fastapi-instrumentator` | `7.1.0` | Auto-instruments FastAPI routes and exposes a `/metrics` Prometheus endpoint |
| `httpx` | `0.28.1` | Async HTTP client used to fetch audio files from object storage URLs |

---

## Repository Structure

```
stt-service/
├── app/
│   ├── core/             # App config & environment variable bindings
│   ├── models/           # Whisper model loader — singleton init on startup
│   ├── routers/          # API route definitions
│   ├── services/         # Core business logic: STT pipeline & language detection
│   ├── utils/            # Shared helpers
│   └── main.py           # Application entry point
├── .dockerignore
├── Dockerfile            # Multi-stage build
├── requirements.txt
└── README.md
```

---

## Docker

### Build

```bash
docker build -t stt-service:latest .
```

### Run

```bash
docker run --rm \
  -p 8000:8000 \
  -e WHISPER_MODEL=medium \
  -e WHISPER_DEVICE=cpu \
  -e WHISPER_COMPUTE_TYPE=int8 \
  -e WHISPER_CPU_THREADS=8 \
  stt-service:latest
```

The service will be available at `http://stt-service:8000`.

### GPU (optional)

```bash
docker run --rm \
  --gpus all \
  -p 8000:8000 \
  -e WHISPER_MODEL=large-v3 \
  -e WHISPER_DEVICE=cuda \
  -e WHISPER_COMPUTE_TYPE=float16 \
  stt-service:latest
```

### Implementation Details

The `Dockerfile` uses a **multi-stage build** to keep the final image lean:

| Stage | Base Image | Purpose |
|---|---|---|
| `builder` | `python:3.10-slim` | Installs Python dependencies into an isolated virtualenv |
| `runtime` | `python:3.10-slim` | Copies only the virtualenv and app code — no build tools |

`ffmpeg` is sourced from a static binary release and installed in the runtime stage to support all audio formats (MP3, OGG, FLAC, M4A, etc.) without pulling in a full `ffmpeg` apt package tree.

---

## Security

The runtime container enforces a **non-root execution model**:

```dockerfile
RUN groupadd -r appuser && useradd -r -g appuser appuser
...
USER appuser
```

This mitigates container breakout risks: if the process is compromised, the attacker operates as an unprivileged user with no write access outside explicitly chowned directories. The model cache directory (`/model_cache`) is the only path owned by `appuser` and intentionally scoped.

---

## Observability

Prometheus metrics are automatically collected for every route:

```
http_requests_total
http_request_duration_seconds
http_requests_in_progress
```

