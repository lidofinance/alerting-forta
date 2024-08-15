import BigNumber from 'bignumber.js'

export const formatBN2Str = (bn: BigNumber): string => {
  return bn.toNumber().toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
