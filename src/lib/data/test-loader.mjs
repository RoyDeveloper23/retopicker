import { resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      url: "data:text/javascript,export%20{}",
      shortCircuit: true,
    };
  }

  if (specifier.startsWith("@/")) {
    const absolutePath = pathToFileURL(
      resolvePath(projectRoot, "src", specifier.slice(2)),
    ).href;
    try {
      return await nextResolve(absolutePath, context);
    } catch (error) {
      if (
        error?.code !== "ERR_MODULE_NOT_FOUND" &&
        error?.code !== "ERR_UNSUPPORTED_DIR_IMPORT"
      ) {
        throw error;
      }
      try {
        return await nextResolve(`${absolutePath}.ts`, context);
      } catch (fileError) {
        if (fileError?.code !== "ERR_MODULE_NOT_FOUND") throw fileError;
        return nextResolve(`${absolutePath}/index.ts`, context);
      }
    }
  }

  if (specifier.startsWith(".")) {
    try {
      return await nextResolve(specifier, context);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  }

  return nextResolve(specifier, context);
}
