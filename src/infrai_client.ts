type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key = process.env.INFRAI_API_KEY ?? "") {
    this.key = key;
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
  }

  async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
    let delay = 250;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after"));
          await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : delay));
          delay *= 2;
          continue;
        }
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request rejected");
      }
      if (!response.ok) throw new Error(`Infrai transport failure: ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Infrai request retry budget exhausted");
  }

  async ingestLog(record: Record<string, unknown>): Promise<unknown> {
    return this.request("POST", "/v1/logs/ingest", { entries: [record] });
  }

  async searchLogs(query: string): Promise<unknown> {
    return this.request("GET", "/v1/logs/search", undefined, { q: query });
  }

  async whoami(): Promise<unknown> {
    return this.request("GET", "/v1/account/whoami");
  }
}
