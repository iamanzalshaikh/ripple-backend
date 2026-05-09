import OpenAI from "openai";
import config from "../config/config.js";

export function isOpenAIConfigured(): boolean {
  return Boolean(config.OPENAI_API_KEY);
}

export function getOpenAIClient(): OpenAI {
  if (!config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  return new OpenAI({ apiKey: config.OPENAI_API_KEY });
}

