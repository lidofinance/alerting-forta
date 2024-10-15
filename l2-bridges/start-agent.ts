const { configureContainer } = require("forta-agent");

const DEV = "dev";
const PROD = "prod";


function parseCommandLineArgs() {
  const cmdArgs = process.argv.slice(2);
  if (cmdArgs.length !== 2) {
    console.error(`ERROR: Must specify two arguments: <L2 network name> <run mode:${DEV}:${PROD}>`);
    process.exit(1);
  }
  const l2NetworkName = cmdArgs[0];
  const runMode = cmdArgs[1];
  if (runMode !== DEV && runMode !== PROD) {
    console.error(`ERROR: Invalid run mode specified: ${runMode}`);
    process.exit(1);
  }
  return { l2NetworkName, runMode };
}

const main = async () => {
  const args = parseCommandLineArgs();

  const containerArgs = { contextPath: `${__dirname}/${args.l2NetworkName}` };
  const container = configureContainer(containerArgs);
  let runFunction;
  if (args.runMode === PROD) {
    runFunction = container.resolve("runProdServer");
  } else if (args.runMode) {
    runFunction = container.resolve("runLive");
  }
  await runFunction();
}

main()
