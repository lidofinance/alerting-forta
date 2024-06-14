function getSubpathForNetwork(): string {
  const runTier = process.env.FORTA_AGENT_RUN_TIER
  if (runTier === 'testnet') {
    return `holesky.`
  }
  if (runTier && runTier !== 'mainnet') {
    return `${runTier}.`
  }
  return ''
}

export function etherscanAddress(address: string, text = address): string {
  return `[${text}](https://${getSubpathForNetwork()}etherscan.io/address/${address})`
}
