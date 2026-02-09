# 1️⃣ Match the base image to your target version
FROM python:3.14-slim 

# 2️⃣ Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 3️⃣ Environment setup
ENV UV_SYSTEM_PYTHON=1
ENV PYTHONDONTWRITEBYTECODE=1 
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 4️⃣ Install dependencies using a cache mount for speed
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-dev --no-install-project

# 5️⃣ Copy the rest of the application
COPY . .

# 6️⃣ Compile bytecode for faster startup
RUN uv pip install --system --no-cache-dir -e .

# 5️⃣ Run uvicorn
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001","--reload"]