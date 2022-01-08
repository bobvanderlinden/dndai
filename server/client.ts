import { Middleware, Status, Context } from "oak";
import { Esbuilder } from "./esbuilder.ts";
import { cache } from "esbuild-plugin-cache";
import * as path from "path";

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
      importmap: JSON.parse(
        await Deno.readTextFile(path.join(projectRoot, "import-map.json"))
      ),
    }),
  ],
});

async function watchBuild() {
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
