/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BytesLike,
  CallOverrides,
  PopulatedTransaction,
  Signer,
  utils,
} from 'ethers'
import type { FunctionFragment, Result } from '@ethersproject/abi'
import type { Listener, Provider } from '@ethersproject/providers'
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
} from './common'

export interface ProxyShortABIInterface extends utils.Interface {
  functions: {
    'proxy__getAdmin()': FunctionFragment
    'proxy__getImplementation()': FunctionFragment
  }

  getFunction(
    nameOrSignatureOrTopic: 'proxy__getAdmin' | 'proxy__getImplementation',
  ): FunctionFragment

  encodeFunctionData(
    functionFragment: 'proxy__getAdmin',
    values?: undefined,
  ): string
  encodeFunctionData(
    functionFragment: 'proxy__getImplementation',
    values?: undefined,
  ): string

  decodeFunctionResult(
    functionFragment: 'proxy__getAdmin',
    data: BytesLike,
  ): Result
  decodeFunctionResult(
    functionFragment: 'proxy__getImplementation',
    data: BytesLike,
  ): Result

  events: {}
}

export interface ProxyShortABI extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this
  attach(addressOrName: string): this
  deployed(): Promise<this>

  interface: ProxyShortABIInterface

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TEvent>>

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>,
  ): Array<TypedListener<TEvent>>
  listeners(eventName?: string): Array<Listener>
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>,
  ): this
  removeAllListeners(eventName?: string): this
  off: OnEvent<this>
  on: OnEvent<this>
  once: OnEvent<this>
  removeListener: OnEvent<this>

  functions: {
    proxy__getAdmin(overrides?: CallOverrides): Promise<[string]>

    proxy__getImplementation(overrides?: CallOverrides): Promise<[string]>
  }

  proxy__getAdmin(overrides?: CallOverrides): Promise<string>

  proxy__getImplementation(overrides?: CallOverrides): Promise<string>

  callStatic: {
    proxy__getAdmin(overrides?: CallOverrides): Promise<string>

    proxy__getImplementation(overrides?: CallOverrides): Promise<string>
  }

  filters: {}

  estimateGas: {
    proxy__getAdmin(overrides?: CallOverrides): Promise<BigNumber>

    proxy__getImplementation(overrides?: CallOverrides): Promise<BigNumber>
  }

  populateTransaction: {
    proxy__getAdmin(overrides?: CallOverrides): Promise<PopulatedTransaction>

    proxy__getImplementation(
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>
  }
}