import dns from "node:dns/promises";
import net from "node:net";
import { ENV } from "../config/env.js";

export class UnsafeUrlError extends Error {
  public readonly code = "UNSAFE_URL";
}

const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.azure.internal",
  "169.254.169.254"
]);

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224;
}

export function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  if (net.isIPv4(normalized)) return isPrivateIpv4(normalized);
  if (!net.isIPv6(normalized)) return true;
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1]) : false;
}

export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("URL không hợp lệ");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeUrlError("Chỉ cho phép URL HTTP/HTTPS");
  }
  // WHATWG URL keeps IPv6 brackets in `hostname` (for example `[::1]`).
  // Strip them before net.isIP()/private-range checks so loopback and other
  // literal IPv6 targets are rejected before any DNS lookup is attempted.
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!hostname || blockedHostnames.has(hostname) || hostname.endsWith(".local")) {
    throw new UnsafeUrlError("Tên miền nội bộ bị chặn");
  }
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new UnsafeUrlError("Địa chỉ IP nội bộ bị chặn");
    return url;
  }
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(entry => isPrivateIp(entry.address))) {
    throw new UnsafeUrlError("Tên miền phân giải tới mạng nội bộ");
  }
  return url;
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxBytes?: number;
  allowedContentTypes?: string[];
  maxRedirects?: number;
}

export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = ENV.OUTBOUND_TIMEOUT_MS, maxBytes = ENV.OUTBOUND_MAX_BYTES,
    allowedContentTypes, maxRedirects = 3, ...fetchOptions } = options;
  let currentUrl = rawUrl;
  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const safeUrl = await assertSafePublicUrl(currentUrl);
    let response: Response;
    response = await fetch(safeUrl, { ...fetchOptions, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirect === maxRedirects) throw new UnsafeUrlError("Quá nhiều chuyển hướng");
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }
    const contentLength = Number(response.headers.get("content-length") || "0");
    if (contentLength > maxBytes) throw new Error("RESPONSE_TOO_LARGE");
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (allowedContentTypes?.length && !allowedContentTypes.some(type => contentType.includes(type))) {
      throw new Error(`UNEXPECTED_CONTENT_TYPE: ${contentType || "unknown"}`);
    }
    const reader = response.body?.getReader();
    if (!reader) return response;
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error("RESPONSE_TOO_LARGE");
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  throw new UnsafeUrlError("Không thể tải URL");
}

export function assertShopifyDomain(rawDomain: string): string {
  const domain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) {
    throw new UnsafeUrlError("Shopify domain phải có dạng shop-name.myshopify.com");
  }
  return domain;
}
