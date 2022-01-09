import * as esbuild from "./deps/esbuild.ts";
import * as event from "./deps/event.ts";

type BuildResult = esbuild.BuildResult & {
  outputFiles: esbuild.OutputFile[];
};

type BuildFailure = esbuild.BuildFailure;

export class Esbuilder extends event.EventEmitter<{
  error: [BuildFailure];
  result: [BuildResult];
}> {
  #buildOptions: esbuild.BuildOptions;
  #buildResult?: BuildResult;

  constructor(options: esbuild.BuildOptions) {
    super();
    this.#buildOptions = options;
  }

  async start() {
    const result = await esbuild.build({
      watch: {
        onRebuild: (error, result) => {
          if (error) {
            this.#handleBuildError(error);
          } else {
            this.#handleBuildResult(result as BuildResult);
          }
        },
      },
      write: false,
      ...this.#buildOptions,
    });
    this.#handleBuildResult(result as BuildResult);
  }

  #handleBuildError(error: BuildFailure) {
    this.emit("error", error);
  }

  #handleBuildResult(result: BuildResult) {
    this.emit("result", result);
  }

  async stop() {
    await this.#buildResult?.stop?.();
    this.#buildResult = undefined;
  }
}
