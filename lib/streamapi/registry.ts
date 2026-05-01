import { ConfiguredProviderAdapter, providerConfigs } from "@/lib/streamapi/adapters";
import { PROVIDERS, type ProviderAdapter, type ProviderCode } from "@/lib/streamapi/types";

const adapters = PROVIDERS.reduce((accumulator, provider) => {
  accumulator[provider] = new ConfiguredProviderAdapter(providerConfigs[provider]);
  return accumulator;
}, {} as Record<ProviderCode, ProviderAdapter>);

export function getProvider(provider: ProviderCode): ProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`Provider ${provider} is not registered`);
  }
  return adapter;
}

export function getAllProviders(): ProviderAdapter[] {
  return PROVIDERS.map((provider) => adapters[provider]);
}

export { PROVIDERS };
