import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { beforeEach, describe, expect, it, vi } from "vitest";

const buildMeshLlmProviderMock = vi.hoisted(() => vi.fn());
type DiscoverOpenAICompatibleSelfHostedProviderParams = {
  buildProvider: (args: { baseUrl?: string }) => Promise<Record<string, unknown>>;
  ctx: {
    resolveProviderApiKey: () => {
      apiKey?: string;
    };
    resolveProviderAuth: () => {
      discoveryApiKey?: string;
    };
  };
  providerId: string;
};
const discoverOpenAICompatibleSelfHostedProviderMock = vi.hoisted(() =>
  vi.fn(async (params: DiscoverOpenAICompatibleSelfHostedProviderParams) => ({
    provider: await params.buildProvider({}),
  })),
);

vi.mock("./api.js", () => ({
  MESH_LLM_DEFAULT_API_KEY: "mesh-llm-local",
  MESH_LLM_DEFAULT_BASE_URL: "http://127.0.0.1:9337/v1",
  MESH_LLM_DEFAULT_MANAGEMENT_PORT: 3131,
  MESH_LLM_MODEL_PLACEHOLDER: "auto",
  MESH_LLM_PROVIDER_LABEL: "Mesh LLM",
  buildMeshLlmProvider: (...args: unknown[]) => buildMeshLlmProviderMock(...args),
}));

vi.mock("openclaw/plugin-sdk/provider-setup", () => ({
  discoverOpenAICompatibleSelfHostedProvider: (
    params: DiscoverOpenAICompatibleSelfHostedProviderParams,
  ) => discoverOpenAICompatibleSelfHostedProviderMock(params),
}));

type ProviderDiscoveryRun = (ctx: {
  config: Record<string, unknown>;
  env: NodeJS.ProcessEnv;
  resolveProviderApiKey: () => {
    apiKey: string | undefined;
  };
  resolveProviderAuth: () => {
    apiKey: string | undefined;
    discoveryApiKey?: string;
    mode: "api_key" | "oauth" | "token" | "none";
    source: "env" | "profile" | "none";
  };
}) => Promise<unknown>;

type RegisteredMeshLlmProvider = {
  id: string;
  discovery?: {
    order?: string;
    run: ProviderDiscoveryRun;
  };
  resolveSyntheticAuth?: () => {
    apiKey: string;
    source: string;
    mode: string;
  };
};

describe("mesh-llm provider discovery contract", () => {
  beforeEach(() => {
    buildMeshLlmProviderMock.mockReset();
    discoverOpenAICompatibleSelfHostedProviderMock.mockClear();
  });

  it("registers with synthetic auth and no API key requirement", async () => {
    const { default: plugin } = await import("./index.js");
    let provider: RegisteredMeshLlmProvider | undefined;
    plugin.register({
      registerProvider: (registeredProvider) => {
        provider = registeredProvider as RegisteredMeshLlmProvider;
      },
    } as OpenClawPluginApi);
    expect(provider?.id).toBe("mesh-llm");
    expect(provider?.discovery?.order).toBe("late");
    expect(provider?.resolveSyntheticAuth).toBeDefined();

    // Synthetic auth should return the local marker key
    const syntheticAuth = provider!.resolveSyntheticAuth!();
    expect(syntheticAuth.apiKey).toBe("mesh-llm-local");
  });

  it("discovers models from a running mesh-llm node", async () => {
    const { default: plugin } = await import("./index.js");
    let provider: RegisteredMeshLlmProvider | undefined;
    plugin.register({
      registerProvider: (registeredProvider) => {
        provider = registeredProvider as RegisteredMeshLlmProvider;
      },
    } as OpenClawPluginApi);

    const discovery = provider?.discovery;
    expect(discovery).toBeDefined();

    buildMeshLlmProviderMock.mockResolvedValueOnce({
      baseUrl: "http://127.0.0.1:9337/v1",
      api: "openai-completions",
      models: [{ id: "Qwen2.5-32B-Q4_K_M", name: "Qwen2.5 32B" }],
    });

    await expect(
      discovery!.run({
        config: {},
        env: {} as NodeJS.ProcessEnv,
        resolveProviderApiKey: () => ({
          apiKey: undefined,
        }),
        resolveProviderAuth: () => ({
          apiKey: undefined,
          mode: "none",
          source: "none",
        }),
      }),
    ).resolves.toEqual({
      provider: {
        baseUrl: "http://127.0.0.1:9337/v1",
        api: "openai-completions",
        models: [{ id: "Qwen2.5-32B-Q4_K_M", name: "Qwen2.5 32B" }],
      },
    });
    expect(discoverOpenAICompatibleSelfHostedProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: "mesh-llm",
        buildProvider: expect.any(Function),
      }),
    );
  });
});
