const SOSO_BASE_URL = process.env.SOSO_BASE_URL ?? "https://openapi.sosovalue.com/openapi/v1";
const SOSO_API_KEY = process.env.SOSO_API_KEY;

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!SOSO_API_KEY) {
    throw new Error("Missing SOSO_API_KEY");
  }

  const response = await fetch(`${SOSO_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-soso-api-key": SOSO_API_KEY,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SoSoValue request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getNews() {
  return request<{ data: unknown[] }>("/feeds/news");
}

export async function getMarketSnapshot() {
  return request<{ data: unknown[] }>("/currency/market-snapshot");
}

export async function getMacroEvents() {
  return request<{ data: unknown[] }>("/macro/events");
}
