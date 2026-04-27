import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
import {
  discoverOpenAICompatibleLocalModels,
  SELF_HOSTED_DEFAULT_CONTEXT_WINDOW,
} from "openclaw/plugin-sdk/provider-setup";
import {
  MESH_LLM_DEFAULT_BASE_URL,
  MESH_LLM_DEFAULT_MANAGEMENT_PORT,
  MESH_LLM_PROVIDER_LABEL,
} from "./defaults.js";

type ModelsConfig = NonNullable<OpenClawConfig["models"]>;
type ProviderConfig = NonNullable<ModelsConfig["providers"]>[string];

/**
 * Response shape for a single model from the mesh-llm management API
 * (`GET /api/models` on port 3131).  Only the fields we consume are typed.
 */
type MeshLlmModelPayload = {
  name: string;
  context_length?: number | null;
};

/**
 * Query the mesh-llm management API for per-model context lengths.
 *
 * The management console runs on a separate port (default 3131) from the
 * OpenAI-compat inference API (default 9337).  We derive the management
 * URL from the inference `baseUrl` host, swapping the port.
 *
 * Returns a map of model-name → context_length, or an empty map on failure.
 */
async function fetchManagementContextLengths(baseUrl: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const parsed = new URL(baseUrl);
    const managementUrl = `${parsed.protocol}//${parsed.hostname}:${MESH_LLM_DEFAULT_MANAGEMENT_PORT}/api/models`;
    const response = await fetch(managementUrl, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return map;
    const payload = (await response.json()) as
      | MeshLlmModelPayload[]
      | { mesh_models: MeshLlmModelPayload[] };
    const models = Array.isArray(payload) ? payload : payload?.mesh_models;
    if (!Array.isArray(models)) return map;
    for (const model of models) {
      if (model.name && typeof model.context_length === "number" && model.context_length > 0) {
        map.set(model.name, model.context_length);
      }
    }
  } catch {
    // Management API unreachable — fall back to defaults.
  }
  return map;
}

export async function buildMeshLlmProvider(params?: { baseUrl?: string }): Promise<ProviderConfig> {
  const baseUrl = (params?.baseUrl?.trim() || MESH_LLM_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const [models, contextLengths] = await Promise.all([
    discoverOpenAICompatibleLocalModels({
      baseUrl,
      label: MESH_LLM_PROVIDER_LABEL,
    }),
    fetchManagementContextLengths(baseUrl),
  ]);

  // Enrich discovered models with real context lengths from the management API.
  if (contextLengths.size > 0) {
    for (const model of models) {
      const real = contextLengths.get(model.id);
      if (real && real !== SELF_HOSTED_DEFAULT_CONTEXT_WINDOW) {
        model.contextWindow = real;
        model.maxTokens = Math.min(model.maxTokens, real);
      }
    }
  }

  return {
    baseUrl,
    api: "openai-completions",
    models,
  };
}
