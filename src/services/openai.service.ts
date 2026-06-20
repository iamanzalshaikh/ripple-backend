import OpenAI from "openai";
import config from "../config/config.js";

export function isOpenAIConfigured(): boolean {
  return Boolean(config.OPENAI_API_KEY);
}

/** OpenAI SDK also reads OPENAI_BASE_URL from env — normalize to avoid 404 Invalid URL. */
function resolveOpenAIBaseURL(): string | undefined {
  const raw = process.env.OPENAI_BASE_URL?.trim();
  if (!raw) return undefined;

  let url = raw.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) {
    console.warn(
      "[ripple-backend] OPENAI_BASE_URL ignored — must start with http:// or https://",
    );
    return undefined;
  }

  if (!url.endsWith("/v1")) {
    url = `${url}/v1`;
  }

  return url;
}

export function getOpenAIClient(): OpenAI {
  if (!config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const baseURL = resolveOpenAIBaseURL();
  return new OpenAI({
    apiKey: config.OPENAI_API_KEY,
    ...(baseURL ? { baseURL } : {}),
  });
}
