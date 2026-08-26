/**
 * Settings page - AI provider, model, fact-grounding strictness, tier.
 *
 * BYOK is BYOK: keys are not stored on our side. We surface whether the
 * env var for the chosen provider is configured, so users see clearly
 * when they need to put a key in apps/web/.env.local (or hosting env vars
 * in production). When they switch providers, they need to add the key
 * for the new provider - we can't do that for them.
 */
"use client";
import { useEffect, useState } from "react";
import {
  type AISettings,
  type Provider,
  DEFAULT_MODELS,
  PROVIDER_ENV_VAR,
} from "@resume-builder/shared";

type ApiResponse = { data: AISettings; keyConfigured: boolean };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: 14,
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#555",
  marginBottom: 2,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: "1rem",
  borderRadius: 6,
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((body: ApiResponse) => {
        setSettings(body.data);
        setKeyConfigured(body.keyConfigured);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `save failed (${res.status})`);
      }
      const body = (await res.json()) as ApiResponse;
      setSettings(body.data);
      setKeyConfigured(body.keyConfigured);
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <main style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Settings</h1>
        <p style={{ color: "#666" }}>{error ?? "loading..."}</p>
      </main>
    );
  }

  // When the user switches provider, snap the model to the default for that
  // provider if the current model doesn't match any provider's default. This
  // is a UX nicety - the user can always override after.
  function onProviderChange(newProvider: Provider) {
    if (!settings) return;
    const next = { ...settings, provider: newProvider };
    const known = (Object.values(DEFAULT_MODELS) as string[]).includes(settings.model);
    if (!known) next.model = DEFAULT_MODELS[newProvider];
    setSettings(next);
  }

  return (
    <main style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Settings</h1>

      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 0.5rem" }}>AI provider</h3>
        <p style={{ color: "#666", fontSize: 13, margin: "0 0 0.75rem" }}>
          Choose which AI service to use for JD parsing and resume tailoring.
          BYOK - keys live in env vars (see requirements.md).
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Provider</label>
          <select
            style={inputStyle}
            value={settings.provider}
            onChange={(e) => onProviderChange(e.target.value as Provider)}
          >
            <option value="gemini">Gemini (free tier)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="nvidia">NVIDIA NIM</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Model</label>
          <input
            style={inputStyle}
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            placeholder={DEFAULT_MODELS[settings.provider]}
          />
          <p style={{ color: "#888", fontSize: 11, margin: "4px 0 0" }}>
            Default for {settings.provider}: <code>{DEFAULT_MODELS[settings.provider]}</code>
          </p>
        </div>

        <div
          style={{
            background: keyConfigured ? "#eef4fb" : "#fff5f5",
            border: "1px solid " + (keyConfigured ? "#bcd" : "#ebb"),
            borderRadius: 4,
            padding: "0.5rem 0.75rem",
            fontSize: 13,
          }}
        >
          {keyConfigured ? (
            <>
              ✓ API key for <strong>{settings.provider}</strong> is configured
              (env var <code>{PROVIDER_ENV_VAR[settings.provider]}</code>).
            </>
          ) : (
            <>
              ✗ No API key for <strong>{settings.provider}</strong>. Set{" "}
              <code>{PROVIDER_ENV_VAR[settings.provider]}</code> in your
              environment (apps/web/.env.local for dev, hosting env vars for
              prod) and restart the app.
            </>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 0.5rem" }}>Generation behavior</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Tier</label>
          <select
            style={inputStyle}
            value={settings.tier}
            onChange={(e) => setSettings({ ...settings, tier: e.target.value as "cheap" | "strong" })}
          >
            <option value="cheap">Cheap / fast (default)</option>
            <option value="strong">Strong / accurate</option>
          </select>
          <p style={{ color: "#888", fontSize: 11, margin: "4px 0 0" }}>
            Cheap tier uses faster models for parsing/extraction; strong tier
            uses the same model you picked above for rewriting. Override the
            tier at the call site when needed.
          </p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Fact-grounding strictness</label>
          <select
            style={inputStyle}
            value={settings.factGrounding}
            onChange={(e) => setSettings({ ...settings, factGrounding: e.target.value as "tight" | "loose" })}
          >
            <option value="loose">Loose - post-hoc check, any source overlap OK</option>
            <option value="tight">Tight - every claim must cite a source field</option>
          </select>
          <p style={{ color: "#888", fontSize: 11, margin: "4px 0 0" }}>
            Per product.md section 2.7: any number or entity claim not in
            your data bank is flagged for confirmation before insertion.
            Tight mode applies this to every AI rewrite; loose mode only
            checks after the fact.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: "0.5rem 1rem",
            background: saving ? "#888" : "#1f3a5f",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontSize: 14,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "saving..." : "save settings"}
        </button>
        {savedAt && (
          <span style={{ fontSize: 12, color: "#666" }}>
            saved {savedAt.toLocaleTimeString()}
          </span>
        )}
        {error && (
          <span style={{ fontSize: 12, color: "#b00020" }}>{error}</span>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: "#888" }}>
        <a href="/" style={{ color: "#1f3a5f" }}>← back to data bank</a>
      </p>
    </main>
  );
}