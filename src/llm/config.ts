export type ProviderName = 'nim' | 'groq' | 'gemini';

export type ProviderConfig = {
  name: ProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
};

function provider(name: ProviderName, prefix: string, defaultBaseUrl: string, defaultModel: string): ProviderConfig {
  return {
    name,
    baseUrl: process.env[`EXPO_PUBLIC_${prefix}_BASE_URL`] || defaultBaseUrl,
    apiKey: process.env[`EXPO_PUBLIC_${prefix}_API_KEY`] || '',
    model: process.env[`EXPO_PUBLIC_${prefix}_MODEL`] || defaultModel,
  };
}

// Failover order: NIM (default reasoning) -> Groq (low-latency) -> Gemini (long-context).
export const providers: Record<ProviderName, ProviderConfig> = {
  nim: provider('nim', 'NIM', 'https://integrate.api.nvidia.com/v1', 'meta/llama-3.1-8b-instruct'),
  groq: provider('groq', 'GROQ', 'https://api.groq.com/openai/v1', 'llama-3.1-8b-instant'),
  gemini: provider(
    'gemini',
    'GEMINI',
    'https://generativelanguage.googleapis.com/v1beta/openai',
    'gemini-1.5-flash',
  ),
};

export const failoverChain: ProviderName[] = ['nim', 'groq', 'gemini'];
