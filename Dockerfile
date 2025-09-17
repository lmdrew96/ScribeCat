FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        xvfb \
        xauth \
        x11-utils \
        libgtk-3-0 \
        libayatana-appindicator3-1 \
    && if apt-get install -y --no-install-recommends libwebkit2gtk-4.1-0; then \
        true; \
    else \
        apt-get install -y --no-install-recommends libwebkit2gtk-4.0-37; \
    fi \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
        sh -s -- -y --no-modify-path --default-toolchain stable \
    && cargo install tauri-cli

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "tauri", "dev"]
