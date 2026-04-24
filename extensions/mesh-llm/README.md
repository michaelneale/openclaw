# Mesh LLM Provider

Bundled provider plugin for [Mesh LLM](https://github.com/Mesh-LLM/mesh-llm) discovery and setup.

Mesh LLM pools GPUs across machines and exposes the result as one
OpenAI-compatible API at `http://localhost:9337/v1`. Models are
auto-discovered — whatever the mesh is serving appears in the model list.

## Quick start

```bash
# Start a mesh-llm node (installs automatically)
curl -fsSL https://raw.githubusercontent.com/Mesh-LLM/mesh-llm/main/install.sh | bash
mesh-llm serve --auto

# Configure OpenClaw to use it
openclaw configure
# → choose "Mesh LLM"

# Or set the env var directly
export MESH_LLM_API_KEY=mesh-llm-local
```

Models are discovered dynamically from the mesh's `/v1/models` endpoint.
Use `auto` as the model placeholder during setup — the mesh routes requests
to the best available model automatically.

## Context windows

The plugin queries the mesh-llm management API (`http://localhost:3131/api/models`)
to get real per-model context lengths from GGUF metadata. If the management
API is unreachable the plugin falls back to the default 128k assumption.
