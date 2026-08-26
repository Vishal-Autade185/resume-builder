/**
 * GET  /api/settings - return the current user's ai_settings (or defaults).
 * PUT  /api/settings - update ai_settings. Validates with AISettingsSchema.
 *
 * Raw BYOK keys are NEVER stored in this table. They live in env vars
 * (apps/web/.env.local in dev, hosting-provider env-var config in prod).
 * The api surfaces which provider+model is active so the ui can show
 * "no API key configured" when the corresponding env var is missing.
 */
import { NextResponse } from "next/server";
import {
  AISettingsSchema,
  defaultAISettings,
  PROVIDER_ENV_VAR,
  type Provider,
} from "@resume-builder/shared";
import { createServiceClient } from "@/lib/supabase-service";

const USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    const defaults = defaultAISettings();
    return NextResponse.json({
      data: defaults,
      keyConfigured: isKeyConfigured(defaults.provider),
    });
  }
  const settings: ReturnType<typeof defaultAISettings> = {
    provider: data.provider as Provider,
    model: data.model,
    factGrounding: data.fact_grounding as "tight" | "loose",
    tier: data.tier as "cheap" | "strong",
  };
  return NextResponse.json({
    data: settings,
    keyConfigured: isKeyConfigured(settings.provider),
  });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = AISettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const settings = parsed.data;
  const supabase = createServiceClient();
  const { error } = await supabase.from("ai_settings").upsert(
    {
      user_id: USER_ID,
      provider: settings.provider,
      model: settings.model,
      fact_grounding: settings.factGrounding,
      tier: settings.tier,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    data: settings,
    keyConfigured: isKeyConfigured(settings.provider),
  });
}

/** True if the env var for the chosen provider has a non-empty value. */
function isKeyConfigured(provider: Provider): boolean {
  const envVar = PROVIDER_ENV_VAR[provider];
  const value = process.env[envVar];
  return typeof value === "string" && value.length > 0;
}