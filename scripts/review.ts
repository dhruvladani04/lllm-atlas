import { spawn } from "node:child_process";

/**
 * Starts the dev server with the registry review UI enabled — `pnpm review`.
 *
 * This exists because `LLM_ATLAS_REVIEW=1 pnpm dev` is bash syntax and silently is not
 * PowerShell syntax, which is most of this project's actual usage. Setting the variable
 * here rather than in the shell means one command works everywhere, and nobody has to
 * remember which shell they are in to reach a development tool.
 */

const port = process.argv[2] ?? "3000";

const child = spawn("pnpm", ["exec", "next", "dev", "-p", port], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, LLM_ATLAS_REVIEW: "1" },
});

child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
