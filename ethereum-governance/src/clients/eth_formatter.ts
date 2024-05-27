import { Formatter } from '@ethersproject/providers'

export class FormatterWithEIP1898 extends Formatter {
  /**
   * blockTag formatter with EIP-1898 support
   * https://eips.ethereum.org/EIPS/eip-1898
   */

  // eslint-disable-next-line
  public blockTag(blockTag: any): string {
    if (
      typeof blockTag === 'object' &&
      blockTag != null &&
      (Object.prototype.hasOwnProperty.call(blockTag, 'blockNumber') ||
        Object.prototype.hasOwnProperty.call(blockTag, 'blockHash'))
    ) {
      return blockTag
    }

    return super.blockTag(blockTag)
  }
}
