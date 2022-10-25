import fs from "fs";
import { join } from "path";
import { jsonc } from "jsonc";

/**
 * Helper function to use the given module as agent path.
 * @see https://github.dev/forta-network/forta-bot-sdk/blob/d73d5070897c9cbad8c1d356589d53222a9e692d/cli/di.container.ts#L156-L171
 */
export function provideAgentPath(
  moduleName: string
): (contextPath: string) => string {
  return (contextPath: string) => {
    const tsConfigPath = join(contextPath, "tsconfig.json");
    const { compilerOptions } = jsonc.parse(
      fs.readFileSync(tsConfigPath, "utf8")
    );

    return join(contextPath, compilerOptions.outDir, moduleName);
  };
}
