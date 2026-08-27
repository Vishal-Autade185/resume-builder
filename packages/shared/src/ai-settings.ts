/**
 * AI Settings - per-user configuration for phase 2 AI tailoring.
 *
 * The raw BYOK API key is NEVER stored on our side. We store only a
 * reference to where the key lives (env var name, or future encrypted
 * blob). The actual key is held in:
 *   - apps/web/.env.local during dev (per-provider keys)
 *   - hosting provider's env-var config in production (vercel/render)
 *
 * Per product.md section 2.4 the user owns their keys. We just decide
 * which env var name to point at.
 */
import { z } from "zod";

export const ProviderSchema = z.enum([
  "gemini",
  "openai",
  "anthropic",
  "nvidia",
  "groq",
]);
export type Provider = z.infer<typeof ProviderSchema>;

/** Default model picks per provider. Users can override in settings. */
export const DEFAULT_MODELS: Record<Provider, string> = {
  // gemini-2.5-flash: works with thinkingBudget: 0 to skip the
  //   internal-reasoning step (~2-4s per call). Free tier available.
  //   The 'gemini-flash-lite-latest' alias is faster but quality drops;
  //   we ship 2.5 for the quality baseline.
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5",
  // NVIDIA NIM (build.nvidia.com) — openai-compatible api at
  //   https://integrate.api.nvidia.com/v1, free credits on signup.
  //   nvidia/nemotron-3-super-120b-a12b: current llama-family model
  //   with JSON output + reliable grounding. Adds ~5-10s of internal
  //   reasoning (returns reasoning_content). Quality comparable to
  //   gemini-2.5-flash.
  nvidia: "nvidia/nemotron-3-super-120b-a12b",
  // Groq — openai-compatible api at
  //   https://api.groq.com/openai/v1, free tier (30 req/min).
  //   openai/gpt-oss-120b is their highest-quality 120b open-source-ish
  //   model. Returns grounded JSON reliably.
  groq: "openai/gpt-oss-120b",
};

/** Per-provider env var names that hold the BYOK API key. */
export const PROVIDER_ENV_VAR: Record<Provider, string> = {
  gemini:    "GEMINI_API_KEY",
  openai:    "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  nvidia:    "NVIDIA_API_KEY",
  groq:      "GROQ_API_KEY",
};

/**
 * Settings the user can change in the settings page. Stored in
 * ai_settings table (jsonb row keyed by user_id).
 */
export const AISettingsSchema = z.object({
  provider: ProviderSchema,
  model: z.string().min(1),
  /** Per-generation strictness. "tight" requires every claim to cite a
   * source field; "loose" only checks post-hoc. */
  factGrounding: z.enum(["tight", "loose"]).default("loose"),
  /** Cheap/fast vs strong. Mapped to provider-specific model picks. */
  tier: z.enum(["cheap", "strong"]).default("cheap"),
});

export type AISettings = z.infer<typeof AISettingsSchema>;

/** Default settings on first visit. */
export const defaultAISettings = (): AISettings => ({
  provider: "gemini",
  model: DEFAULT_MODELS.gemini,
  factGrounding: "loose",
  tier: "cheap",
});
