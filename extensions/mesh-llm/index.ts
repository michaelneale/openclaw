import {
  definePluginEntry,
  type OpenClawPluginApi,
  type ProviderAuthMethodNonInteractiveContext,
} from "openclaw/plugin-sdk/plugin-entry";
import {
  buildMeshLlmProvider,
  MESH_LLM_DEFAULT_API_KEY_ENV_VAR,
  MESH_LLM_DEFAULT_BASE_URL,
  MESH_LLM_MODEL_PLACEHOLDER,
  MESH_LLM_PROVIDER_LABEL,
} from "./api.js";

const PROVIDER_ID = "mesh-llm";

async function loadProviderSetup() {
  return await import("openclaw/plugin-sdk/provider-setup");
}

export default definePluginEntry({
  id: "mesh-llm",
  name: "Mesh LLM Provider",
  description: "Bundled Mesh LLM provider plugin",
  register(api: OpenClawPluginApi) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: "Mesh LLM",
      docsPath: "/providers/mesh-llm",
      envVars: ["MESH_LLM_API_KEY"],
      auth: [
        {
          id: "custom",
          label: MESH_LLM_PROVIDER_LABEL,
          hint: "Distributed GPU mesh · OpenAI-compatible",
          kind: "custom",
          run: async (ctx) => {
            const providerSetup = await loadProviderSetup();
            return await providerSetup.promptAndConfigureOpenAICompatibleSelfHostedProviderAuth({
              cfg: ctx.config,
              prompter: ctx.prompter,
              providerId: PROVIDER_ID,
              providerLabel: MESH_LLM_PROVIDER_LABEL,
              defaultBaseUrl: MESH_LLM_DEFAULT_BASE_URL,
              defaultApiKeyEnvVar: MESH_LLM_DEFAULT_API_KEY_ENV_VAR,
              modelPlaceholder: MESH_LLM_MODEL_PLACEHOLDER,
            });
          },
          runNonInteractive: async (ctx: ProviderAuthMethodNonInteractiveContext) => {
            const providerSetup = await loadProviderSetup();
            return await providerSetup.configureOpenAICompatibleSelfHostedProviderNonInteractive({
              ctx,
              providerId: PROVIDER_ID,
              providerLabel: MESH_LLM_PROVIDER_LABEL,
              defaultBaseUrl: MESH_LLM_DEFAULT_BASE_URL,
              defaultApiKeyEnvVar: MESH_LLM_DEFAULT_API_KEY_ENV_VAR,
              modelPlaceholder: MESH_LLM_MODEL_PLACEHOLDER,
            });
          },
        },
      ],
      discovery: {
        order: "late",
        run: async (ctx) => {
          const providerSetup = await loadProviderSetup();
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
          methodId: "custom",
        },
        modelPicker: {
          label: "Mesh LLM (auto-discover)",
          hint: "Detect models from a local or remote Mesh LLM node",
          methodId: "custom",
        },
      },
      buildUnknownModelHint: () =>
        "Mesh LLM requires authentication to be registered as a provider. " +
        'Set MESH_LLM_API_KEY (any value works) or run "openclaw configure". ' +
        "See: https://docs.openclaw.ai/providers/mesh-llm",
    });
  },
});
