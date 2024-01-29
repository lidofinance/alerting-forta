import path from "path";

export interface Version {
  desc: string;
  commitHash: string;
  commitHashShort: string;
  commitMsg: string;
  commitMsgShort: string;
  isWdClean: boolean;
}

export default readVersion(path.join(__dirname, "..", "version.json"));

function readVersion(versionFilePath: string): Version {
  try {
    return require(versionFilePath);
  } catch (e) {
    return {
      desc: "unknown",
      commitHash: "unknown",
      commitHashShort: "unknown",
      commitMsg: "unknown",
      commitMsgShort: "unknown",
      isWdClean: false,
    };
  }
}
