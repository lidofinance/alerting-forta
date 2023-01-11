export function etherscanLink(address: string): string {
  return `[${address.toLowerCase()}](https://etherscan.io/address/${address.toLowerCase()})`;
}
