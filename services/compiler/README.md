# @resume-builder/compiler

Sandboxed LaTeX compile service. Dockerized. Runs `tectonic` with `--no-shell-escape` and no network.

Landing in **Phase 0 — Foundation**: single endpoint `POST /compile` that takes a `.tex` source (and optional `.zip` template), returns PDF bytes.

Deploy target: Render or Fly free tier.