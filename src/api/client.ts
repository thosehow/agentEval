const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const formatDetail = (detail: unknown) => {
      if (typeof detail === "string") {
        return detail;
      }
      if (Array.isArray(detail)) {
        return detail
          .map((item) => {
            if (!item || typeof item !== "object") {
              return "Invalid request.";
            }
            const loc = Array.isArray((item as { loc?: unknown[] }).loc)
              ? ((item as { loc?: unknown[] }).loc ?? []).slice(1).join(".")
              : "";
            const msg =
              typeof (item as { msg?: unknown }).msg === "string"
                ? (item as { msg: string }).msg
                : "Invalid value.";
            return loc ? `${loc}: ${msg}` : msg;
          })
          .join("; ");
      }
      return null;
    };

    const message =
      typeof payload === "string"
        ? payload
        : formatDetail(payload?.detail) || payload?.message || "Request failed.";
    throw new ApiError(response.status, message);
  }

  return payload as T;
}
