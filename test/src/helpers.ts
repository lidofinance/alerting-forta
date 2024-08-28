export function eventSig(abi: string) {
  let sig = abi.replace("event ", "");
  let [name, argsStr] = sig.split("(");
  let argsRaw = argsStr.split(")")[0].split(",");
  let args: string[] = [];
  argsRaw.map((arg) => args.push(arg.trim().split(" ")[0]));
  return `${name}(${args.join(",")})`;
}
