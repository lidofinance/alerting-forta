import BigNumber from 'bignumber.js'


export const TEN_TO_18 = new BigNumber(10).pow(18)


export function formatEth(amount: any, dp: number): string {
  return new BigNumber(String(amount)).div(TEN_TO_18).toFixed(dp)
}


export function formatDelay(delaySec: number) {
  const delayMin = Math.floor(delaySec / 60)
  return `${delayMin} min ${delaySec - delayMin * 60} sec`
}
