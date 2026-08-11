import { failoverChain, providers, type ProviderConfig, type ProviderName } from './config';

export type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export type CompleteOptions = {
  /** Provider order to try. Defaults to the NIM -> Groq -> Gemini failover chain. */
  chain?: ProviderName[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

/** Role-based chains (AGENT.md §6). Same failover, different first pick. */
export const chains: Record<'default' | 'fast' | 'long', ProviderName[]> = {
  default: failoverChain,
  fast: ['groq', 'nim', 'gemini'],
  long: ['gemini', 'nim', 'groq'],
};

export type CallLog = {
  provider: ProviderName;
  model: string;
  ms: number;
  promptTokens?: number;
  completionTokens?: number;
  error?: string;
};

/**
 * Latency/token log. Never holds message content — on-device tuning data only
 * (AGENT.md §6).
 * ponytail: in-memory ring buffer, newest first. Persist to SQLite in Phase 2 if
 * tuning ever needs history across launches.
 */
export const callLog: CallLog[] = [];

function record(entry: CallLog) {
  callLog.unshift(entry);
  callLog.length = Math.min(callLog.length, 50);
}

async function post(cfg: ProviderConfig, messages: Msg[], opts: CompleteOptions) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 512,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
  } finally {
    clearTimeout(timer);
  }
}

export type LLMProvider = {
  name: ProviderName;
  complete(messages: Msg[], opts?: CompleteOptions): Promise<string>;
};

/**
 * All three providers speak the OpenAI chat-completions shape, so one client
 * covers them — only baseUrl/apiKey/model differ (see `config.ts`).
 */
export const llmProviders: Record<ProviderName, LLMProvider> = Object.fromEntries(
  (Object.keys(providers) as ProviderName[]).map((name) => [
    name,
    {
      name,
      async complete(messages, opts = {}) {
        const cfg = providers[name];
        const started = Date.now();
        try {
          if (!cfg.apiKey) throw new Error('no API key configured');
          const json = await post(cfg, messages, opts);
          const text = json.choices?.[0]?.message?.content;
          if (typeof text !== 'string') throw new Error('response had no content');
          record({
            provider: name,
            model: cfg.model,
            ms: Date.now() - started,
            promptTokens: json.usage?.prompt_tokens,
            completionTokens: json.usage?.completion_tokens,
          });
          return text;
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          record({ provider: name, model: cfg.model, ms: Date.now() - started, error });
          throw new Error(error);
        }
      },
    } satisfies LLMProvider,
  ]),
) as Record<ProviderName, LLMProvider>;

export type CompleteResult = { text: string; provider: ProviderName };

/** Try each provider in order; surface one clean error only if all fail. */
export async function complete(messages: Msg[], opts: CompleteOptions = {}): Promise<CompleteResult> {
  const failures: string[] = [];
  for (const name of opts.chain ?? chains.default) {
    try {
      return { text: await llmProviders[name].complete(messages, opts), provider: name };
    } catch (e) {
      failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`All LLM providers failed (${failures.join('; ')})`);
}

/** Pull the JSON body out of a model reply that may be fenced or prefaced with prose. */
export function extractJson<T = unknown>(raw: string): T {
  const starts = [raw.indexOf('{'), raw.indexOf('[')].filter((i) => i >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
  if (start < 0 || end < start) throw new Error('no JSON found in response');
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

const JSON_RULE = 'Respond with JSON only. No prose, no explanation, no markdown fences.';

/** `complete()` constrained to JSON, with a single repair retry on unparseable output. */
export async function completeJson<T = unknown>(
  messages: Msg[],
  opts: CompleteOptions = {},
): Promise<{ data: T; provider: ProviderName }> {
  const first = await complete([{ role: 'system', content: JSON_RULE }, ...messages], opts);
  try {
    return { data: extractJson<T>(first.text), provider: first.provider };
  } catch {
    const repaired = await complete(
      [
        { role: 'system', content: JSON_RULE },
        ...messages,
        { role: 'assistant', content: first.text },
        { role: 'user', content: `That was not valid JSON. ${JSON_RULE}` },
      ],
      opts,
    );
    return { data: extractJson<T>(repaired.text), provider: repaired.provider };
  }
}
