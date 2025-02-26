export function eventSig(abi: string) {
  const sig = abi.replace('event ', '')
  const [name, argsStr] = sig.split('(')
  const argsRaw = argsStr.split(')')[0].split(',')
  const args: string[] = []
  argsRaw.map((arg) => args.push(arg.trim().split(' ')[0]))
  return `${name}(${args.join(',')})`
}
