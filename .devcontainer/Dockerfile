FROM mcr.microsoft.com/devcontainers/javascript-node:20

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libglib2.0-dev \
        libgobject-2.0-dev \
    && rm -rf /var/lib/apt/lists/*

