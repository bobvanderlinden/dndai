import { Middleware, Status, Context } from "./deps/oak.ts";
import { Esbuilder } from "./esbuilder.ts";
import { cache } from "./deps/esbuild-plugin-cache.ts";
import * as path from "./deps/path.ts";
import { ensureDir } from "./deps/fs.ts";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const projectRoot = path.dirname(__dirname);
const clientRoot = path.join(projectRoot, "client");
const cacheDir = path.join(projectRoot, "cache");

let files: Record<string, string> = {};

export const middleware: Middleware = (ctx: Context, next) => {
  const content = files[ctx.request.url.pathname];
  if (content) {
    ctx.response.status = Status.OK;
    ctx.response.body = content;
    return;
  }
  return next();
};

const builder = new Esbuilder({
  absWorkingDir: clientRoot,
  entryPoints: ["index.tsx"],
  outfile: "out.js",
  sourcemap: "both",
  bundle: true,
  plugins: [
    cache({
      directory: cacheDir,
      importmap: {
        imports: {},
      },
    }),
  ],
});

async function watchBuild() {
  if (!Deno.env.get("HOME")) {
    Deno.env.set("HOME", path.join(Deno.cwd(), ".home"));
  }
  await ensureDir(cacheDir);

  for await (const [result] of builder.on("result")) {
    files = result.outputFiles.reduce((root, file) => {
      const filePath = path
        .relative(clientRoot, file.path)
        .replace(path.SEP, "/");
      return { ...root, [`/${filePath}`]: file.text };
    }, {});
    console.log(files);
  }
}

watchBuild();

await builder.start();
