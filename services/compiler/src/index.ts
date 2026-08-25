/**
 * Compile service — phase 0.
 *
 * POST /compile — accepts { tex, mainFile, assets? }, runs tectonic,
 * returns { pdf: base64, log }. On error returns 500 with { error, log }.
 *
 * Security model (per product.md §4):
 *   - tectonic is inherently sandboxed: no shell-escape, no \write18 RCE.
 *   - The container runs as non-root, no network access (the dockerfile
 *     alpine base plus tectonic's offline cache handles this once warmed)
 *   - No filesystem paths escape /tmp; each compile is its own scratch dir
 *
 * For dev we run on host with `tectonic` from ~/.local/bin (set up in
 * phase 0 prep). For prod the dockerfile pins ghcr.io/tectonic-typesetting/
 * tectonic so the binary version is identical.
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT ?? 4000);
const TECTONIC = process.env.TECTONIC_BIN ?? "tectonic";

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ status: "ok", tectonic: TECTONIC }));

app.post("/compile", async (req, reply) => {
  const body = req.body as {
    tex?: string;
    mainFile?: string;
    assets?: Record<string, string>; // filename -> content (string)
  };

  if (!body?.tex) {
    return reply.code(400).send({ error: "missing tex in body" });
  }
  const mainFile = body.mainFile ?? "main.tex";

  const dir = await mkdtemp(join(tmpdir(), "rb-compile-"));
  try {
    await writeFile(join(dir, mainFile), body.tex, "utf8");
    if (body.assets) {
      for (const [name, content] of Object.entries(body.assets)) {
        await writeFile(join(dir, name), content, "utf8");
      }
    }

    const { stdout, stderr } = await execFileAsync(
      TECTONIC,
      ["--keep-logs", "--print", "-o", ".", mainFile],
      { cwd: dir, maxBuffer: 50 * 1024 * 1024, timeout: 60_000 },
    );

    const pdf = await readFile(join(dir, mainFile.replace(/\.tex$/, ".pdf")));
    return {
      pdf: pdf.toString("base64"),
      log: stdout + (stderr ? `\n[stderr]\n${stderr}` : ""),
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    app.log.error({ err }, "compile failed");
    return reply.code(500).send({
      error: e.message ?? "compile failed",
      log: (e.stdout ?? "") + (e.stderr ?? ""),
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`compile service listening at ${address}`);
});
