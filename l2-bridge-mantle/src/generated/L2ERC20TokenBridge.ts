/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from 'ethers'
import type { FunctionFragment, Result, EventFragment } from '@ethersproject/abi'
import type { Listener, Provider } from '@ethersproject/providers'
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from './common'

export interface L2ERC20TokenBridgeInterface extends utils.Interface {
  functions: {
    'DEFAULT_ADMIN_ROLE()': FunctionFragment
    'DEPOSITS_DISABLER_ROLE()': FunctionFragment
    'DEPOSITS_ENABLER_ROLE()': FunctionFragment
    'WITHDRAWALS_DISABLER_ROLE()': FunctionFragment
    'WITHDRAWALS_ENABLER_ROLE()': FunctionFragment
    'disableDeposits()': FunctionFragment
    'disableWithdrawals()': FunctionFragment
    'enableDeposits()': FunctionFragment
    'enableWithdrawals()': FunctionFragment
    'finalizeDeposit(address,address,address,address,uint256,bytes)': FunctionFragment
    'getRoleAdmin(bytes32)': FunctionFragment
    'grantRole(bytes32,address)': FunctionFragment
    'hasRole(bytes32,address)': FunctionFragment
    'initialize(address)': FunctionFragment
    'isDepositsEnabled()': FunctionFragment
    'isInitialized()': FunctionFragment
    'isWithdrawalsEnabled()': FunctionFragment
    'l1Token()': FunctionFragment
    'l1TokenBridge()': FunctionFragment
    'l2Token()': FunctionFragment
    'messenger()': FunctionFragment
    'renounceRole(bytes32,address)': FunctionFragment
    'revokeRole(bytes32,address)': FunctionFragment
    'supportsInterface(bytes4)': FunctionFragment
    'withdraw(address,uint256,uint32,bytes)': FunctionFragment
    'withdrawTo(address,address,uint256,uint32,bytes)': FunctionFragment
  }

  getFunction(
    nameOrSignatureOrTopic:
      | 'DEFAULT_ADMIN_ROLE'
      | 'DEPOSITS_DISABLER_ROLE'
      | 'DEPOSITS_ENABLER_ROLE'
      | 'WITHDRAWALS_DISABLER_ROLE'
      | 'WITHDRAWALS_ENABLER_ROLE'
      | 'disableDeposits'
      | 'disableWithdrawals'
      | 'enableDeposits'
      | 'enableWithdrawals'
      | 'finalizeDeposit'
      | 'getRoleAdmin'
      | 'grantRole'
      | 'hasRole'
      | 'initialize'
      | 'isDepositsEnabled'
      | 'isInitialized'
      | 'isWithdrawalsEnabled'
      | 'l1Token'
      | 'l1TokenBridge'
      | 'l2Token'
      | 'messenger'
      | 'renounceRole'
      | 'revokeRole'
      | 'supportsInterface'
      | 'withdraw'
      | 'withdrawTo',
  ): FunctionFragment

  encodeFunctionData(functionFragment: 'DEFAULT_ADMIN_ROLE', values?: undefined): string
  encodeFunctionData(functionFragment: 'DEPOSITS_DISABLER_ROLE', values?: undefined): string
  encodeFunctionData(functionFragment: 'DEPOSITS_ENABLER_ROLE', values?: undefined): string
  encodeFunctionData(functionFragment: 'WITHDRAWALS_DISABLER_ROLE', values?: undefined): string
  encodeFunctionData(functionFragment: 'WITHDRAWALS_ENABLER_ROLE', values?: undefined): string
  encodeFunctionData(functionFragment: 'disableDeposits', values?: undefined): string
  encodeFunctionData(functionFragment: 'disableWithdrawals', values?: undefined): string
  encodeFunctionData(functionFragment: 'enableDeposits', values?: undefined): string
  encodeFunctionData(functionFragment: 'enableWithdrawals', values?: undefined): string
  encodeFunctionData(
    functionFragment: 'finalizeDeposit',
    values: [string, string, string, string, BigNumberish, BytesLike],
  ): string
  encodeFunctionData(functionFragment: 'getRoleAdmin', values: [BytesLike]): string
  encodeFunctionData(functionFragment: 'grantRole', values: [BytesLike, string]): string
  encodeFunctionData(functionFragment: 'hasRole', values: [BytesLike, string]): string
  encodeFunctionData(functionFragment: 'initialize', values: [string]): string
  encodeFunctionData(functionFragment: 'isDepositsEnabled', values?: undefined): string
  encodeFunctionData(functionFragment: 'isInitialized', values?: undefined): string
  encodeFunctionData(functionFragment: 'isWithdrawalsEnabled', values?: undefined): string
  encodeFunctionData(functionFragment: 'l1Token', values?: undefined): string
  encodeFunctionData(functionFragment: 'l1TokenBridge', values?: undefined): string
  encodeFunctionData(functionFragment: 'l2Token', values?: undefined): string
  encodeFunctionData(functionFragment: 'messenger', values?: undefined): string
  encodeFunctionData(functionFragment: 'renounceRole', values: [BytesLike, string]): string
  encodeFunctionData(functionFragment: 'revokeRole', values: [BytesLike, string]): string
  encodeFunctionData(functionFragment: 'supportsInterface', values: [BytesLike]): string
  encodeFunctionData(functionFragment: 'withdraw', values: [string, BigNumberish, BigNumberish, BytesLike]): string
  encodeFunctionData(
    functionFragment: 'withdrawTo',
    values: [string, string, BigNumberish, BigNumberish, BytesLike],
  ): string

  decodeFunctionResult(functionFragment: 'DEFAULT_ADMIN_ROLE', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'DEPOSITS_DISABLER_ROLE', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'DEPOSITS_ENABLER_ROLE', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'WITHDRAWALS_DISABLER_ROLE', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'WITHDRAWALS_ENABLER_ROLE', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'disableDeposits', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'disableWithdrawals', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'enableDeposits', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'enableWithdrawals', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'finalizeDeposit', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'getRoleAdmin', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'grantRole', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'hasRole', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'initialize', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'isDepositsEnabled', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'isInitialized', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'isWithdrawalsEnabled', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'l1Token', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'l1TokenBridge', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'l2Token', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'messenger', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'renounceRole', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'revokeRole', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'supportsInterface', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'withdraw', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'withdrawTo', data: BytesLike): Result

  events: {
    'DepositFailed(address,address,address,address,uint256,bytes)': EventFragment
    'DepositFinalized(address,address,address,address,uint256,bytes)': EventFragment
    'DepositsDisabled(address)': EventFragment
    'DepositsEnabled(address)': EventFragment
    'Initialized(address)': EventFragment
    'RoleAdminChanged(bytes32,bytes32,bytes32)': EventFragment
    'RoleGranted(bytes32,address,address)': EventFragment
    'RoleRevoked(bytes32,address,address)': EventFragment
    'WithdrawalInitiated(address,address,address,address,uint256,bytes)': EventFragment
    'WithdrawalsDisabled(address)': EventFragment
    'WithdrawalsEnabled(address)': EventFragment
  }

  getEvent(nameOrSignatureOrTopic: 'DepositFailed'): EventFragment
  getEvent(nameOrSignatureOrTopic: 'DepositFinalized'): EventFragment
  getEvent(nameOrSignatureOrTopic: 'DepositsDisabled'): EventFragment
  getEvent(nameOrSignatureOrTopic: 'DepositsEnabled'): EventFragment
  getEvent(nameOrSignatureOrTopic: 'Initialized'): EventFragment
  getEvent(nameOrSignatureOrTopic: 'RoleAdminChanged'): EventFragment
  getEvent(nameOrSignatureOrTopic: 'RoleGranted'): EventFragment
  getEvent(nameOrSignatureOrTopic: 'RoleRevoked'): EventFragment
  getEvent(nameOrSignatureOrTopic: 'WithdrawalInitiated'): EventFragment
  getEvent(nameOrSignatureOrTopic: 'WithdrawalsDisabled'): EventFragment
  getEvent(nameOrSignatureOrTopic: 'WithdrawalsEnabled'): EventFragment
}

export interface DepositFailedEventObject {
  _l1Token: string
  _l2Token: string
  _from: string
  _to: string
  _amount: BigNumber
  _data: string
}
export type DepositFailedEvent = TypedEvent<
  [string, string, string, string, BigNumber, string],
  DepositFailedEventObject
>

export type DepositFailedEventFilter = TypedEventFilter<DepositFailedEvent>

export interface DepositFinalizedEventObject {
  _l1Token: string
  _l2Token: string
  _from: string
  _to: string
  _amount: BigNumber
  _data: string
}
export type DepositFinalizedEvent = TypedEvent<
  [string, string, string, string, BigNumber, string],
  DepositFinalizedEventObject
>

export type DepositFinalizedEventFilter = TypedEventFilter<DepositFinalizedEvent>

export interface DepositsDisabledEventObject {
  disabler: string
}
export type DepositsDisabledEvent = TypedEvent<[string], DepositsDisabledEventObject>

export type DepositsDisabledEventFilter = TypedEventFilter<DepositsDisabledEvent>

export interface DepositsEnabledEventObject {
  enabler: string
}
export type DepositsEnabledEvent = TypedEvent<[string], DepositsEnabledEventObject>

export type DepositsEnabledEventFilter = TypedEventFilter<DepositsEnabledEvent>

export interface InitializedEventObject {
  admin: string
}
export type InitializedEvent = TypedEvent<[string], InitializedEventObject>

export type InitializedEventFilter = TypedEventFilter<InitializedEvent>

export interface RoleAdminChangedEventObject {
  role: string
  previousAdminRole: string
  newAdminRole: string
}
export type RoleAdminChangedEvent = TypedEvent<[string, string, string], RoleAdminChangedEventObject>

export type RoleAdminChangedEventFilter = TypedEventFilter<RoleAdminChangedEvent>

export interface RoleGrantedEventObject {
  role: string
  account: string
  sender: string
}
export type RoleGrantedEvent = TypedEvent<[string, string, string], RoleGrantedEventObject>

export type RoleGrantedEventFilter = TypedEventFilter<RoleGrantedEvent>

export interface RoleRevokedEventObject {
  role: string
  account: string
  sender: string
}
export type RoleRevokedEvent = TypedEvent<[string, string, string], RoleRevokedEventObject>

export type RoleRevokedEventFilter = TypedEventFilter<RoleRevokedEvent>

export interface WithdrawalInitiatedEventObject {
  _l1Token: string
  _l2Token: string
  _from: string
  _to: string
  _amount: BigNumber
  _data: string
}
export type WithdrawalInitiatedEvent = TypedEvent<
  [string, string, string, string, BigNumber, string],
  WithdrawalInitiatedEventObject
>

export type WithdrawalInitiatedEventFilter = TypedEventFilter<WithdrawalInitiatedEvent>

export interface WithdrawalsDisabledEventObject {
  disabler: string
}
export type WithdrawalsDisabledEvent = TypedEvent<[string], WithdrawalsDisabledEventObject>

export type WithdrawalsDisabledEventFilter = TypedEventFilter<WithdrawalsDisabledEvent>

export interface WithdrawalsEnabledEventObject {
  enabler: string
}
export type WithdrawalsEnabledEvent = TypedEvent<[string], WithdrawalsEnabledEventObject>

export type WithdrawalsEnabledEventFilter = TypedEventFilter<WithdrawalsEnabledEvent>

export interface L2ERC20TokenBridge extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this
  attach(addressOrName: string): this
  deployed(): Promise<this>

  interface: L2ERC20TokenBridgeInterface

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TEvent>>

  listeners<TEvent extends TypedEvent>(eventFilter?: TypedEventFilter<TEvent>): Array<TypedListener<TEvent>>
  listeners(eventName?: string): Array<Listener>
  removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this
  removeAllListeners(eventName?: string): this
  off: OnEvent<this>
  on: OnEvent<this>
  once: OnEvent<this>
  removeListener: OnEvent<this>

  functions: {
    DEFAULT_ADMIN_ROLE(overrides?: CallOverrides): Promise<[string]>

    DEPOSITS_DISABLER_ROLE(overrides?: CallOverrides): Promise<[string]>

    DEPOSITS_ENABLER_ROLE(overrides?: CallOverrides): Promise<[string]>

    WITHDRAWALS_DISABLER_ROLE(overrides?: CallOverrides): Promise<[string]>

    WITHDRAWALS_ENABLER_ROLE(overrides?: CallOverrides): Promise<[string]>

    disableDeposits(overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

    disableWithdrawals(overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

    enableDeposits(overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

    enableWithdrawals(overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

    finalizeDeposit(
      l1Token_: string,
      l2Token_: string,
      from_: string,
      to_: string,
      amount_: BigNumberish,
      data_: BytesLike,
      overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>

    getRoleAdmin(role: BytesLike, overrides?: CallOverrides): Promise<[string]>

    grantRole(role: BytesLike, account: string, overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

    hasRole(role: BytesLike, account: string, overrides?: CallOverrides): Promise<[boolean]>

    initialize(admin_: string, overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

    isDepositsEnabled(overrides?: CallOverrides): Promise<[boolean]>

    isInitialized(overrides?: CallOverrides): Promise<[boolean]>

    isWithdrawalsEnabled(overrides?: CallOverrides): Promise<[boolean]>

    l1Token(overrides?: CallOverrides): Promise<[string]>

    l1TokenBridge(overrides?: CallOverrides): Promise<[string]>

    l2Token(overrides?: CallOverrides): Promise<[string]>

    messenger(overrides?: CallOverrides): Promise<[string]>

    renounceRole(
      role: BytesLike,
      account: string,
      overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>

    revokeRole(
      role: BytesLike,
      account: string,
      overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>

    supportsInterface(interfaceId: BytesLike, overrides?: CallOverrides): Promise<[boolean]>

    withdraw(
      l2Token_: string,
      amount_: BigNumberish,
      l1Gas_: BigNumberish,
      data_: BytesLike,
      overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>

    withdrawTo(
      l2Token_: string,
      to_: string,
      amount_: BigNumberish,
      l1Gas_: BigNumberish,
      data_: BytesLike,
      overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>
  }

  DEFAULT_ADMIN_ROLE(overrides?: CallOverrides): Promise<string>

  DEPOSITS_DISABLER_ROLE(overrides?: CallOverrides): Promise<string>

  DEPOSITS_ENABLER_ROLE(overrides?: CallOverrides): Promise<string>

  WITHDRAWALS_DISABLER_ROLE(overrides?: CallOverrides): Promise<string>

  WITHDRAWALS_ENABLER_ROLE(overrides?: CallOverrides): Promise<string>

  disableDeposits(overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

  disableWithdrawals(overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

  enableDeposits(overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

  enableWithdrawals(overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

  finalizeDeposit(
    l1Token_: string,
    l2Token_: string,
    from_: string,
    to_: string,
    amount_: BigNumberish,
    data_: BytesLike,
    overrides?: Overrides & { from?: string },
  ): Promise<ContractTransaction>

  getRoleAdmin(role: BytesLike, overrides?: CallOverrides): Promise<string>

  grantRole(role: BytesLike, account: string, overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

  hasRole(role: BytesLike, account: string, overrides?: CallOverrides): Promise<boolean>

  initialize(admin_: string, overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

  isDepositsEnabled(overrides?: CallOverrides): Promise<boolean>

  isInitialized(overrides?: CallOverrides): Promise<boolean>

  isWithdrawalsEnabled(overrides?: CallOverrides): Promise<boolean>

  l1Token(overrides?: CallOverrides): Promise<string>

  l1TokenBridge(overrides?: CallOverrides): Promise<string>

  l2Token(overrides?: CallOverrides): Promise<string>

  messenger(overrides?: CallOverrides): Promise<string>

  renounceRole(
    role: BytesLike,
    account: string,
    overrides?: Overrides & { from?: string },
  ): Promise<ContractTransaction>

  revokeRole(role: BytesLike, account: string, overrides?: Overrides & { from?: string }): Promise<ContractTransaction>

  supportsInterface(interfaceId: BytesLike, overrides?: CallOverrides): Promise<boolean>

  withdraw(
    l2Token_: string,
    amount_: BigNumberish,
    l1Gas_: BigNumberish,
    data_: BytesLike,
    overrides?: Overrides & { from?: string },
  ): Promise<ContractTransaction>

  withdrawTo(
    l2Token_: string,
    to_: string,
    amount_: BigNumberish,
    l1Gas_: BigNumberish,
    data_: BytesLike,
    overrides?: Overrides & { from?: string },
  ): Promise<ContractTransaction>

  callStatic: {
    DEFAULT_ADMIN_ROLE(overrides?: CallOverrides): Promise<string>

    DEPOSITS_DISABLER_ROLE(overrides?: CallOverrides): Promise<string>

    DEPOSITS_ENABLER_ROLE(overrides?: CallOverrides): Promise<string>

    WITHDRAWALS_DISABLER_ROLE(overrides?: CallOverrides): Promise<string>

    WITHDRAWALS_ENABLER_ROLE(overrides?: CallOverrides): Promise<string>

    disableDeposits(overrides?: CallOverrides): Promise<void>

    disableWithdrawals(overrides?: CallOverrides): Promise<void>

    enableDeposits(overrides?: CallOverrides): Promise<void>

    enableWithdrawals(overrides?: CallOverrides): Promise<void>

    finalizeDeposit(
      l1Token_: string,
      l2Token_: string,
      from_: string,
      to_: string,
      amount_: BigNumberish,
      data_: BytesLike,
      overrides?: CallOverrides,
    ): Promise<void>

    getRoleAdmin(role: BytesLike, overrides?: CallOverrides): Promise<string>

    grantRole(role: BytesLike, account: string, overrides?: CallOverrides): Promise<void>

    hasRole(role: BytesLike, account: string, overrides?: CallOverrides): Promise<boolean>

    initialize(admin_: string, overrides?: CallOverrides): Promise<void>

    isDepositsEnabled(overrides?: CallOverrides): Promise<boolean>

    isInitialized(overrides?: CallOverrides): Promise<boolean>

    isWithdrawalsEnabled(overrides?: CallOverrides): Promise<boolean>

    l1Token(overrides?: CallOverrides): Promise<string>

    l1TokenBridge(overrides?: CallOverrides): Promise<string>

    l2Token(overrides?: CallOverrides): Promise<string>

    messenger(overrides?: CallOverrides): Promise<string>

    renounceRole(role: BytesLike, account: string, overrides?: CallOverrides): Promise<void>

    revokeRole(role: BytesLike, account: string, overrides?: CallOverrides): Promise<void>

    supportsInterface(interfaceId: BytesLike, overrides?: CallOverrides): Promise<boolean>

    withdraw(
      l2Token_: string,
      amount_: BigNumberish,
      l1Gas_: BigNumberish,
      data_: BytesLike,
      overrides?: CallOverrides,
    ): Promise<void>

    withdrawTo(
      l2Token_: string,
      to_: string,
      amount_: BigNumberish,
      l1Gas_: BigNumberish,
      data_: BytesLike,
      overrides?: CallOverrides,
    ): Promise<void>
  }

  filters: {
    'DepositFailed(address,address,address,address,uint256,bytes)'(
      _l1Token?: string | null,
      _l2Token?: string | null,
      _from?: string | null,
      _to?: null,
      _amount?: null,
      _data?: null,
    ): DepositFailedEventFilter
    DepositFailed(
      _l1Token?: string | null,
      _l2Token?: string | null,
      _from?: string | null,
      _to?: null,
      _amount?: null,
      _data?: null,
    ): DepositFailedEventFilter

    'DepositFinalized(address,address,address,address,uint256,bytes)'(
      _l1Token?: string | null,
      _l2Token?: string | null,
      _from?: string | null,
      _to?: null,
      _amount?: null,
      _data?: null,
    ): DepositFinalizedEventFilter
    DepositFinalized(
      _l1Token?: string | null,
      _l2Token?: string | null,
      _from?: string | null,
      _to?: null,
      _amount?: null,
      _data?: null,
    ): DepositFinalizedEventFilter

    'DepositsDisabled(address)'(disabler?: string | null): DepositsDisabledEventFilter
    DepositsDisabled(disabler?: string | null): DepositsDisabledEventFilter

    'DepositsEnabled(address)'(enabler?: string | null): DepositsEnabledEventFilter
    DepositsEnabled(enabler?: string | null): DepositsEnabledEventFilter

    'Initialized(address)'(admin?: string | null): InitializedEventFilter
    Initialized(admin?: string | null): InitializedEventFilter

    'RoleAdminChanged(bytes32,bytes32,bytes32)'(
      role?: BytesLike | null,
      previousAdminRole?: BytesLike | null,
      newAdminRole?: BytesLike | null,
    ): RoleAdminChangedEventFilter
    RoleAdminChanged(
      role?: BytesLike | null,
      previousAdminRole?: BytesLike | null,
      newAdminRole?: BytesLike | null,
    ): RoleAdminChangedEventFilter

    'RoleGranted(bytes32,address,address)'(
      role?: BytesLike | null,
      account?: string | null,
      sender?: string | null,
    ): RoleGrantedEventFilter
    RoleGranted(role?: BytesLike | null, account?: string | null, sender?: string | null): RoleGrantedEventFilter

    'RoleRevoked(bytes32,address,address)'(
      role?: BytesLike | null,
      account?: string | null,
      sender?: string | null,
    ): RoleRevokedEventFilter
    RoleRevoked(role?: BytesLike | null, account?: string | null, sender?: string | null): RoleRevokedEventFilter

    'WithdrawalInitiated(address,address,address,address,uint256,bytes)'(
      _l1Token?: string | null,
      _l2Token?: string | null,
      _from?: string | null,
      _to?: null,
      _amount?: null,
      _data?: null,
    ): WithdrawalInitiatedEventFilter
    WithdrawalInitiated(
      _l1Token?: string | null,
      _l2Token?: string | null,
      _from?: string | null,
      _to?: null,
      _amount?: null,
      _data?: null,
    ): WithdrawalInitiatedEventFilter

    'WithdrawalsDisabled(address)'(disabler?: string | null): WithdrawalsDisabledEventFilter
    WithdrawalsDisabled(disabler?: string | null): WithdrawalsDisabledEventFilter

    'WithdrawalsEnabled(address)'(enabler?: string | null): WithdrawalsEnabledEventFilter
    WithdrawalsEnabled(enabler?: string | null): WithdrawalsEnabledEventFilter
  }

  estimateGas: {
    DEFAULT_ADMIN_ROLE(overrides?: CallOverrides): Promise<BigNumber>

    DEPOSITS_DISABLER_ROLE(overrides?: CallOverrides): Promise<BigNumber>

    DEPOSITS_ENABLER_ROLE(overrides?: CallOverrides): Promise<BigNumber>

    WITHDRAWALS_DISABLER_ROLE(overrides?: CallOverrides): Promise<BigNumber>

    WITHDRAWALS_ENABLER_ROLE(overrides?: CallOverrides): Promise<BigNumber>

    disableDeposits(overrides?: Overrides & { from?: string }): Promise<BigNumber>

    disableWithdrawals(overrides?: Overrides & { from?: string }): Promise<BigNumber>

    enableDeposits(overrides?: Overrides & { from?: string }): Promise<BigNumber>

    enableWithdrawals(overrides?: Overrides & { from?: string }): Promise<BigNumber>

    finalizeDeposit(
      l1Token_: string,
      l2Token_: string,
      from_: string,
      to_: string,
      amount_: BigNumberish,
      data_: BytesLike,
      overrides?: Overrides & { from?: string },
    ): Promise<BigNumber>

    getRoleAdmin(role: BytesLike, overrides?: CallOverrides): Promise<BigNumber>

    grantRole(role: BytesLike, account: string, overrides?: Overrides & { from?: string }): Promise<BigNumber>

    hasRole(role: BytesLike, account: string, overrides?: CallOverrides): Promise<BigNumber>

    initialize(admin_: string, overrides?: Overrides & { from?: string }): Promise<BigNumber>

    isDepositsEnabled(overrides?: CallOverrides): Promise<BigNumber>

    isInitialized(overrides?: CallOverrides): Promise<BigNumber>

    isWithdrawalsEnabled(overrides?: CallOverrides): Promise<BigNumber>

    l1Token(overrides?: CallOverrides): Promise<BigNumber>

    l1TokenBridge(overrides?: CallOverrides): Promise<BigNumber>

    l2Token(overrides?: CallOverrides): Promise<BigNumber>

    messenger(overrides?: CallOverrides): Promise<BigNumber>

    renounceRole(role: BytesLike, account: string, overrides?: Overrides & { from?: string }): Promise<BigNumber>

    revokeRole(role: BytesLike, account: string, overrides?: Overrides & { from?: string }): Promise<BigNumber>

    supportsInterface(interfaceId: BytesLike, overrides?: CallOverrides): Promise<BigNumber>

    withdraw(
      l2Token_: string,
      amount_: BigNumberish,
      l1Gas_: BigNumberish,
      data_: BytesLike,
      overrides?: Overrides & { from?: string },
    ): Promise<BigNumber>

    withdrawTo(
      l2Token_: string,
      to_: string,
      amount_: BigNumberish,
      l1Gas_: BigNumberish,
      data_: BytesLike,
      overrides?: Overrides & { from?: string },
    ): Promise<BigNumber>
  }

  populateTransaction: {
    DEFAULT_ADMIN_ROLE(overrides?: CallOverrides): Promise<PopulatedTransaction>

    DEPOSITS_DISABLER_ROLE(overrides?: CallOverrides): Promise<PopulatedTransaction>

    DEPOSITS_ENABLER_ROLE(overrides?: CallOverrides): Promise<PopulatedTransaction>

    WITHDRAWALS_DISABLER_ROLE(overrides?: CallOverrides): Promise<PopulatedTransaction>

    WITHDRAWALS_ENABLER_ROLE(overrides?: CallOverrides): Promise<PopulatedTransaction>

    disableDeposits(overrides?: Overrides & { from?: string }): Promise<PopulatedTransaction>

    disableWithdrawals(overrides?: Overrides & { from?: string }): Promise<PopulatedTransaction>

    enableDeposits(overrides?: Overrides & { from?: string }): Promise<PopulatedTransaction>

    enableWithdrawals(overrides?: Overrides & { from?: string }): Promise<PopulatedTransaction>

    finalizeDeposit(
      l1Token_: string,
      l2Token_: string,
      from_: string,
      to_: string,
      amount_: BigNumberish,
      data_: BytesLike,
      overrides?: Overrides & { from?: string },
    ): Promise<PopulatedTransaction>

    getRoleAdmin(role: BytesLike, overrides?: CallOverrides): Promise<PopulatedTransaction>

    grantRole(
      role: BytesLike,
      account: string,
      overrides?: Overrides & { from?: string },
    ): Promise<PopulatedTransaction>

    hasRole(role: BytesLike, account: string, overrides?: CallOverrides): Promise<PopulatedTransaction>

    initialize(admin_: string, overrides?: Overrides & { from?: string }): Promise<PopulatedTransaction>

    isDepositsEnabled(overrides?: CallOverrides): Promise<PopulatedTransaction>

    isInitialized(overrides?: CallOverrides): Promise<PopulatedTransaction>

    isWithdrawalsEnabled(overrides?: CallOverrides): Promise<PopulatedTransaction>

    l1Token(overrides?: CallOverrides): Promise<PopulatedTransaction>

    l1TokenBridge(overrides?: CallOverrides): Promise<PopulatedTransaction>

    l2Token(overrides?: CallOverrides): Promise<PopulatedTransaction>

    messenger(overrides?: CallOverrides): Promise<PopulatedTransaction>

    renounceRole(
      role: BytesLike,
      account: string,
      overrides?: Overrides & { from?: string },
    ): Promise<PopulatedTransaction>

    revokeRole(
      role: BytesLike,
      account: string,
      overrides?: Overrides & { from?: string },
    ): Promise<PopulatedTransaction>

    supportsInterface(interfaceId: BytesLike, overrides?: CallOverrides): Promise<PopulatedTransaction>

    withdraw(
      l2Token_: string,
      amount_: BigNumberish,
      l1Gas_: BigNumberish,
      data_: BytesLike,
      overrides?: Overrides & { from?: string },
    ): Promise<PopulatedTransaction>

    withdrawTo(
      l2Token_: string,
      to_: string,
      amount_: BigNumberish,
      l1Gas_: BigNumberish,
      data_: BytesLike,
      overrides?: Overrides & { from?: string },
    ): Promise<PopulatedTransaction>
  }
}