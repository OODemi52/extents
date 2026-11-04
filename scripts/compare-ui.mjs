import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nativeRoot = join(root, "src-tauri");
const target = join(nativeRoot, "target");
const runtimeRoot = join(root, ".worktrees", ".ui-comparison");
const cacheRoot = join(root, "node_modules", ".cache", "ui-comparison");
const variants = [
  { name: "unified", folder: "ui-unified", title: "Unified Shell", port: 5181 },
  {
    name: "editor",
    folder: "ui-editor",
    title: "Photo-First Editor",
    port: 5182,
  },
  {
    name: "modular",
    folder: "ui-modular",
    title: "Modular Workspace",
    port: 5183,
  },
];
const servers = [];
const children = new Set();
let stopping = false;
let shutdownPromise;
let sessionCacheRoot;

function startProcess(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    detached: true,
    stdio: "inherit",
  });

  children.add(child);
  child.once("exit", () => children.delete(child));
  child.once("error", () => children.delete(child));

  return child;
}

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }

  return new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveExit({ code, signal }));
  });
}

function stopProcess(child, signal) {
  if (!child.pid) return;

  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

function shutdown(exitCode = 0) {
  if (shutdownPromise) return shutdownPromise;

  stopping = true;
  process.exitCode = exitCode;
  shutdownPromise = (async () => {
    const exits = [...children].map((child) =>
      waitForExit(child).catch(() => {}),
    );

    for (const child of children) stopProcess(child, "SIGTERM");
    await Promise.race([
      Promise.all(exits),
      delay(3000, undefined, { ref: false }),
    ]);
    for (const child of children) stopProcess(child, "SIGKILL");
    await Promise.all(servers.map((server) => server.close()));
  })();

  return shutdownPromise;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 1 && args[0] === "--help") {
    console.log(
      "Usage: node scripts/compare-ui.mjs [--variant unified|editor|modular]",
    );
    console.log(
      "Opens all three macOS UI prototypes by default, or just the selected shell. Ctrl+C closes the session.",
    );
    return;
  }
  let selectedVariants = variants;

  if (args.length) {
    if (args.length !== 2 || args[0] !== "--variant") {
      throw new Error("Use --help for launcher usage.");
    }

    const variant = variants.find((item) => item.name === args[1]);

    if (!variant) {
      throw new Error(
        `Unknown variant "${args[1]}". Choose unified, editor, or modular.`,
      );
    }
    selectedVariants = [variant];
  }
  if (process.platform !== "darwin") {
    throw new Error(
      "This development comparison launcher currently targets macOS.",
    );
  }

  const config = JSON.parse(
    await readFile(join(nativeRoot, "tauri.conf.json"), "utf8"),
  );
  const macConfig = JSON.parse(
    await readFile(join(nativeRoot, "tauri.macos.conf.json"), "utf8"),
  );
  const resources = {
    ...config.bundle.resources,
    ...macConfig.bundle.resources,
  };
  const sessions = [];

  // Fresh paths prevent WebViews from reusing chunks from an interrupted session.
  await mkdir(cacheRoot, { recursive: true });
  sessionCacheRoot = await mkdtemp(join(cacheRoot, "session-"));
  if (stopping) return;

  // Bind selected ports before building, so conflicting sessions fail early.
  for (const variant of selectedVariants) {
    const worktree = join(root, ".worktrees", variant.folder);

    await readFile(join(worktree, "src", "app-next", "experiment.ts"));
    const server = await createServer({
      root: worktree,
      configFile: join(worktree, "vite.config.ts"),
      cacheDir: join(sessionCacheRoot, variant.name),
      clearScreen: false,
      // Tailwind otherwise scans the launcher's working directory.
      css: {
        postcss: {
          plugins: [tailwindcss({ base: worktree }), autoprefixer()],
        },
      },
      server: { host: "127.0.0.1", port: variant.port, strictPort: true },
    });

    if (stopping) {
      await server.close();
      return;
    }
    servers.push(server);
    await server.listen();
    if (stopping) return;
    sessions.push({ ...variant, server });
  }

  const appExits = [];

  for (const session of sessions) {
    if (stopping) return;
    const runtime = join(runtimeRoot, session.name);
    const title = `Extents - ${session.title}`;
    const overrides = {
      identifier: `com.extents.ui-comparison.${session.name}`,
      productName: title,
      build: { devUrl: `http://127.0.0.1:${session.port}` },
      app: {
        windows: config.app.windows.map((window) => ({ ...window, title })),
      },
    };

    console.log(`\n[UI comparison] Building ${session.title}...`);
    const build = startProcess("cargo", ["build", "--no-default-features"], {
      cwd: nativeRoot,
      env: {
        ...process.env,
        CARGO_TARGET_DIR: target,
        TAURI_CONFIG: JSON.stringify(overrides),
      },
    });
    const result = await waitForExit(build);

    if (stopping) return;
    if (result.code !== 0) {
      throw new Error(
        `${session.title} build failed (${result.signal ?? result.code}).`,
      );
    }

    // Snapshot each executable before the shared target is rebuilt for the next identity.
    await mkdir(runtime, { recursive: true });
    const executable = join(runtime, `Extents-${session.name}`);

    await copyFile(
      join(target, "debug", "Extents"),
      executable,
      constants.COPYFILE_FICLONE,
    );
    for (const [source, destination] of Object.entries(resources)) {
      const resourcePath = join(runtime, destination);

      await mkdir(dirname(resourcePath), { recursive: true });
      await cp(resolve(nativeRoot, source), resourcePath, { recursive: true });
    }
    if (stopping) return;

    const app = startProcess(executable, [], {
      cwd: runtime,
      env: process.env,
    });
    const exited = waitForExit(app).then(async ({ code, signal }) => {
      await session.server.close();
      if (!stopping && code !== 0) {
        throw new Error(
          `${session.title} exited unexpectedly (${signal ?? code}).`,
        );
      }
    });

    exited.catch((error) => {
      console.error(`[UI comparison] ${error.message}`);
      void shutdown(1);
    });
    appExits.push(exited);
    console.log(`[UI comparison] Opened ${session.title} (PID ${app.pid}).`);
  }

  const opened =
    sessions.length === 1
      ? `${sessions[0].title} is open.`
      : "All three are open.";

  console.log(
    `\n[UI comparison] ${opened} Ctrl+C closes all apps and servers.`,
  );
  console.log(
    "[UI comparison] Rust changes require a restart; frontend changes use HMR.",
  );
  await Promise.all(appExits);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
process.on("SIGHUP", () => void shutdown());

try {
  await main();
} catch (error) {
  if (!stopping) {
    console.error(`[UI comparison] ${error.message}`);
    process.exitCode = 1;
  }
} finally {
  await shutdown(process.exitCode ?? 0);
  if (sessionCacheRoot) {
    await rm(sessionCacheRoot, { recursive: true, force: true });
  }
}
