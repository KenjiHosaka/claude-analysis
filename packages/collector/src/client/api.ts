import type { CollectPayload } from "@claude-analysis/shared";

type SendResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendData(
  serverUrl: string,
  apiKey: string,
  payload: CollectPayload,
): Promise<SendResult> {
  const url = `${serverUrl}/api/collect`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { ok: true };
    }

    if (response.status === 401) {
      return {
        ok: false,
        error: "Authentication failed (401). Check your API key.",
      };
    }

    if (response.status === 400) {
      let detail = "";
      try {
        const body = await response.json();
        detail = (body as Record<string, unknown>).error
          ? ` — ${(body as Record<string, unknown>).error}`
          : "";
      } catch {
        // ignore parse errors
      }
      return {
        ok: false,
        error: `Bad request (400)${detail}`,
      };
    }

    return {
      ok: false,
      error: `Server returned ${response.status} ${response.statusText}`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown network error";
    return {
      ok: false,
      error: `Network error: ${message}`,
    };
  }
}
