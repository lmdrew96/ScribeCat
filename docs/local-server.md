# Local API server binding

The development server (`server.mjs`) now binds only to loopback interfaces by default.
This keeps the notes API private to the current machine while still letting the web app
and Tauri desktop client talk to it automatically.

## Default behavior

- `node server.mjs` (or `npm run dev`) binds to **127.0.0.1** and attempts an IPv6
  loopback bind on **::1**.
- If IPv6 is unavailable, the server continues to run on 127.0.0.1 and prints a warning.
- Visiting `http://127.0.0.1:8787/` now reports the loopback URLs that are serving the API.

You can confirm the bindings with a tool such as `netstat -tln` or `ss -ltn` – only loopback
addresses should appear on port 8787.

## Advanced: exposing the server

Power users can opt-in to different bind addresses by setting the `SCRIBECAT_BIND_HOST`
environment variable before launching the server.

- Comma-separated lists are supported: `SCRIBECAT_BIND_HOST="127.0.0.1,::1"`
- IPv6 entries may be provided with or without brackets: `SCRIBECAT_BIND_HOST=[::1]`
- A single public interface is allowed (for example `0.0.0.0`), but be sure you
  understand the security implications.

A legacy fallback of `SERVER_HOST` is also honored, but new setups should prefer
`SCRIBECAT_BIND_HOST`.
