import {
  definePluginEntry,
  type OpenClawPluginApi,
  type ProviderDiscoveryContext,
} from "openclaw/plugin-sdk/plugin-entry";
import {
  buildMeshLlmProvider,
  MESH_LLM_DEFAULT_API_KEY,
  MESH_LLM_DEFAULT_BASE_URL,
  MESH_LLM_MODEL_PLACEHOLDER,
  MESH_LLM_PROVIDER_LABEL,
} from "./api.js";

const PROVIDER_ID = "mesh-llm";

export default definePluginEntry({
  id: "mesh-llm",
  name: "Mesh LLM Provider",
  description: "Bundled Mesh LLM provider plugin",
  register(api: OpenClawPluginApi) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: "Mesh LLM",
      docsPath: "/providers/mesh-llm",
      auth: [
        {
          id: "local",
          label: MESH_LLM_PROVIDER_LABEL,
          hint: "Distributed GPU mesh · OpenAI-compatible",
          kind: "custom",
          run: async (ctx) => {
            const providerSetup = await import("openclaw/plugin-sdk/provider-setup");
            return await providerSetup.promptAndConfigureOpenAICompatibleSelfHostedProviderAuth({
              cfg: ctx.config,
              prompter: ctx.prompter,
              providerId: PROVIDER_ID,
              providerLabel: MESH_LLM_PROVIDER_LABEL,
              defaultBaseUrl: MESH_LLM_DEFAULT_BASE_URL,
              defaultApiKeyEnvVar: undefined,
              modelPlaceholder: MESH_LLM_MODEL_PLACEHOLDER,
            });
          },
        },
      ],
      discovery: {
        order: "late",
        run: async (ctx: ProviderDiscoveryContext) => {
          const providerSetup = await import("openclaw/plugin-sdk/provider-setup");
          return await providerSetup.discoverOpenAICompatibleSelfHostedProvider({
            ctx,
            providerId: PROVIDER_ID,
            buildProvider: buildMeshLlmProvider,
          });
        },
      },
      wizard: {
        setup: {
          choiceId: "mesh-llm",
          choiceLabel: "Mesh LLM",
          choiceHint: "Distributed GPU mesh · OpenAI-compatible",
          groupId: "mesh-llm",
          groupLabel: "Mesh LLM",
          groupHint: "Distributed GPU mesh",
          methodId: "local",
        },
        modelPicker: {
          label: "Mesh LLM (auto-discover)",
          hint: "Detect models from a local or remote Mesh LLM node",
          methodId: "local",
        },
      },
      resolveSyntheticAuth: () => ({
        apiKey: MESH_LLM_DEFAULT_API_KEY,
        source: "mesh-llm (synthetic local key)",
        mode: "api-key",
      }),
      shouldDeferSyntheticProfileAuth: ({ resolvedApiKey }) =>
        resolvedApiKey?.trim() === MESH_LLM_DEFAULT_API_KEY,
      matchesContextOverflowError: ({ errorMessage }) =>
        /\b(?:context|n_ctx|ctx)\b.*\b(?:exceed|overflow|too long|too many|limit)/i.test(
          errorMessage,
        ) ||
        /\bexceeds? the available context size\b/i.test(errorMessage) ||
        /\bprompt.*tokens.*exceed/i.test(errorMessage),
      buildUnknownModelHint: () =>
        "Mesh LLM auto-discovers models from a running mesh-llm node. " +
        "Start mesh-llm with: mesh-llm --client --auto",
    });
  },
});
