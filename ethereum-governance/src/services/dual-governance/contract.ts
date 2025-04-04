import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { Address } from '../../shared/types'

export type DualGovernanceDetailedState = {
  effectiveState: number
  persistedState: number
  persistedStateEnteredAt: number
  vetoSignallingActivatedAt: number
  vetoSignallingReactivationTime: number
  normalOrVetoCooldownExitedAt: number
  rageQuitRound: BigNumber
  vetoSignallingDuration: number
}

export type DualGovernanceConfig = {
  firstSealRageQuitSupport: BigNumber
  secondSealRageQuitSupport: BigNumber
  minAssetsLockDuration: number
  vetoSignallingMinDuration: number
  vetoSignallingMaxDuration: number
  vetoSignallingMinActiveDuration: number
  vetoSignallingDeactivationMaxDuration: number
  vetoCooldownDuration: number
  rageQuitExtensionPeriodDuration: number
  rageQuitEthWithdrawalsMinDelay: number
  rageQuitEthWithdrawalsMaxDelay: number
  rageQuitEthWithdrawalsDelayGrowth: number
}

export abstract class IDualGovernanceClient {
  public abstract getVetoSignallingEscrow(): Promise<E.Either<Error, Address>>

  public abstract getRageQuitEscrow(): Promise<E.Either<Error, Address>>

  public abstract getConfig(): Promise<E.Either<Error, DualGovernanceConfig>>

  public abstract getRageQuitSupport(escrowAddress: Address): Promise<E.Either<Error, BigNumber>>

  public abstract getDualGovernanceStateDetails(): Promise<E.Either<Error, DualGovernanceDetailedState>>
}
