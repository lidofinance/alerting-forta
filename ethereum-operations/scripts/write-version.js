const childProcess = require("child_process");
const fs = require("fs");

const commitHash = childProcess
  .execSync("git rev-parse HEAD")
  .toString("utf-8")
  .trim();
const commitMsg = childProcess
  .execSync("git log -1 --pretty=%B")
  .toString("utf-8")
  .trim();
const gitStatusOutput = childProcess
  .execSync("git status --porcelain")
  .toString("utf-8")
  .trim();

const commitHashShort = commitHash.substr(0, 7);
const commitMsgShort = commitMsg.split("\n")[0];
const isWdClean = gitStatusOutput === "";
const commitHashSuffux = isWdClean ? "" : " [dirty]";

const version = {
  desc: `${commitHashShort}${commitHashSuffux} (${commitMsgShort})`,
  commitHash: commitHash + commitHashSuffux,
  commitHashShort: commitHashShort + commitHashSuffux,
  commitMsg,
  commitMsgShort,
  isWdClean,
};

console.log("Writing to version.json:", JSON.stringify(version, null, "  "));

fs.writeFileSync("version.json", JSON.stringify(version));
