const shelljs = require("shelljs");
const fs = require("fs");
const path = require("path");

const DOCKER_ARG_L2_NETWORK_NAME = "L2_NETWORK_NAME";


function parseCommandLineArgs() {
  const cmdArgs = process.argv.slice(2);
  if (cmdArgs.length !== 1) {
    console.error(`ERROR: Must specify these arguments: <L2 network name>`);
    process.exit(1);
  }
  return { l2NetworkName: cmdArgs[0] };
}


function assertShellResult(result, errMsg) {
  if (result.code !== 0) {
    throw new Error(`${errMsg}: ${result.stderr}`)
  }
}

const main = async () => {
  const args = parseCommandLineArgs();
  const agentName = JSON.parse(fs.readFileSync(path.join(__dirname, args.l2NetworkName, "package.json"))).name;


  // NB: Docker-related code below is copied from forta-agent/cli/commands/publish/upload.image.ts

  const imageRepositoryUrl = "disco.forta.network";
  const shell = shelljs;
  const imageTagSuffix = undefined;

  // build the agent image
  console.log('building agent image...')
  const imageTag = `${agentName}-intermediate${imageTagSuffix ? `-${imageTagSuffix}` : ''}`
  let buildCommand = `docker buildx build --load --platform linux/amd64 \
    --build-arg ${DOCKER_ARG_L2_NETWORK_NAME}=${args.l2NetworkName} \
    --tag ${imageTag} \
    .`
  const buildResult = shell.exec(buildCommand)
  assertShellResult(buildResult, 'error building agent image')


  // push agent image to repository
  console.log('pushing agent image to repository...')
  const tagResult = shell.exec(`docker tag ${imageTag} ${imageRepositoryUrl}/${imageTag}`)
  assertShellResult(tagResult, 'error tagging agent image')

  const pushResult = shell.exec(`docker push ${imageRepositoryUrl}/${imageTag}`)
  assertShellResult(pushResult, 'error pushing agent image')

  // extract image sha256 digest from pushResult
  const digestLine = pushResult.grep('sha256').toString()
  const digestStartIndex = digestLine.indexOf('sha256:')+7
  const imageDigest = digestLine.substring(digestStartIndex, digestStartIndex+64)

  // pull all tagged images for digest to get ipfs CID
  const pullResult = shell.exec(`docker pull -a ${imageRepositoryUrl}/${imageDigest}`)
  assertShellResult(pullResult, 'error pulling tagged agent images')

  // extract image ipfs CID from pullResult
  const cidLine = pullResult.grep('bafy').toString()// v1 CID begins with 'bafy'
  const cidStartIndex = cidLine.indexOf('bafy')
  const cidEndIndex = cidLine.indexOf(':', cidStartIndex)
  const imageIpfsCid = cidLine.substring(cidStartIndex, cidEndIndex)
  const imageReference = `${imageIpfsCid}@sha256:${imageDigest}`

  console.log(`\nThe docker image reference: ${imageReference}`)
}

main()
