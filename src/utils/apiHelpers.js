// src/utils/apiHelpers.js
export async function fetchWithAuth(url, token, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...opts, headers });

  // Try parse body if possible
  let body = null;
  try {
    body = await res.clone().json();
  } catch {
    body = null;
  }

  // If unauthorized: special handling for expired token
  if (res.status === 401 || res.status === 403) {
    const message = body?.error || body?.message || res.statusText || "Unauthorized";

    // If server indicated token expired -> force client-side cleanup + redirect
    const isExpired =
      message &&
      (String(message).toLowerCase().includes("expire") ||
        String(message).toLowerCase().includes("token expired") ||
        body?.expired === true);

    if (isExpired) {
      try {
        // clear locally stored auth
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("userId");
          // redirect to login
          window.location.href = "/auth/login";
        }
      } catch (e) {
        // ignore redirect errors
        console.warn("Failed to clear local auth on token expiry", e);
      }

      const err = new Error("Token expired");
      err.status = res.status;
      err.body = body;
      throw err;
    }

    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  // If non-JSON, still return response.json attempt
  const json = await res.json().catch(() => null);
  return { res, json };
}
