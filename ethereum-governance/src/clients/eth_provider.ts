import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import BigNumber from 'bignumber.js'
import {
  AragonVoting as AragonVotingContract,
  BaseAdapter__factory,
  CrossChainController__factory,
  ENS as EnsContract,
  IncreaseStakingLimit as IncreaseStakingLimitContract,
  NodeOperatorsRegistry as NodeOperatorsRegistryContract,
  Stonks__factory,
  Swap__factory,
} from '../generated'
import { IEtherscanProvider } from './contracts'
import { NetworkError } from '../shared/errors'
import { IEnsNamesClient } from '../services/ens-names/contract'
import { IEasyTrackClient, INodeOperatorInfo } from '../services/easy-track/contract'
import { IProxyWatcherClient } from '../services/proxy-watcher/contract'
import { BlockTag } from '@ethersproject/providers'
import { AclEnumerableABI } from 'constants/acl-changes'
import { IAclChangesClient } from '../services/acl-changes/contract'
import { IAragonVotingClient, IVoteInfo } from '../services/aragon-voting/contract'
import { BLOCK_TO_WATCH, COW_PROTOCOL_ADDRESS } from 'constants/stonks'
import { TypedEvent } from '../generated/common'
import { formatEther } from 'ethers/lib/utils'
import { BSC_CHAIN_ID, BSC_L1_CROSS_CHAIN_CONTROLLER } from '../shared/constants/cross-chain/mainnet'
import { ICrossChainForwarder } from '../generated/CrossChainController'
import { ICrossChainClient } from '../services/cross-chain-watcher/contract'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export interface IProxyContractData {
  name: string
  shortABI: string
}

export class ETHProvider
  implements
    IEnsNamesClient,
    IEasyTrackClient,
    IProxyWatcherClient,
    IAclChangesClient,
    IAragonVotingClient,
    ICrossChainClient
{
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private etherscanProvider: IEtherscanProvider

  private readonly ensContract: EnsContract
  private readonly increaseStakingLimitContract: IncreaseStakingLimitContract
  private readonly nodeOperatorsRegistryContract: NodeOperatorsRegistryContract
  private readonly aragonVotingContract: AragonVotingContract

  constructor(
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    etherscanProvider: IEtherscanProvider,

    ensContract: EnsContract,
    increaseStakingLimitContract: IncreaseStakingLimitContract,
    nodeOperatorsRegistryContract: NodeOperatorsRegistryContract,
    aragonVotingContract: AragonVotingContract,
  ) {
    this.jsonRpcProvider = jsonRpcProvider
    this.etherscanProvider = etherscanProvider

    this.ensContract = ensContract
    this.increaseStakingLimitContract = increaseStakingLimitContract
    this.nodeOperatorsRegistryContract = nodeOperatorsRegistryContract
    this.aragonVotingContract = aragonVotingContract
  }

  public async getBlock(blockNumber: number): Promise<E.Either<Error, ethers.providers.Block>> {
    try {
      const block = await retryAsync(
        async () => {
          return await this.jsonRpcProvider.getBlock(blockNumber)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(block)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not get block #${blockNumber}`))
    }
  }

  public async getLogs(filter: ethers.providers.Filter): Promise<E.Either<Error, ethers.providers.Log[]>> {
    try {
      const logs = await retryAsync(
        async () => {
          return this.jsonRpcProvider.getLogs(filter)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(logs)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not get logs`))
    }
  }

  public async getVote(voteId: number, toBlock: BlockTag): Promise<E.Either<Error, IVoteInfo>> {
    try {
      const vote = await retryAsync(
        async () => {
          const voteInfo = await this.aragonVotingContract.getVote(voteId, {
            blockTag: toBlock,
          })
          return {
            id: voteId,
            startDate: voteInfo.startDate.toNumber(),
            open: voteInfo.open,
            yea: new BigNumber(String(voteInfo.yea)),
            nay: new BigNumber(String(voteInfo.nay)),
            votingPower: new BigNumber(String(voteInfo.votingPower)),
            supportRequired: Number(formatEther(voteInfo.supportRequired)),
            minAcceptQuorum: Number(formatEther(voteInfo.minAcceptQuorum)),
            phase: voteInfo.phase,
          }
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(vote)
    } catch (e) {
      return E.left(
        new NetworkError(e, `Could not call ethers.aragonVotingContract.getVote id ${voteId} block ${toBlock}`),
      )
    }
  }

  public async getStartedVotes(
    fromBlock: BlockTag,
    toBlock: BlockTag,
  ): Promise<E.Either<Error, Map<number, IVoteInfo>>> {
    try {
      const votes = await retryAsync(
        async () => {
          const filterStartVote = await this.aragonVotingContract.filters.StartVote()
          const votes = await this.aragonVotingContract.queryFilter(filterStartVote, fromBlock, toBlock)
          const voteIds = votes.map((value) => parseInt(String(value.args.voteId)))

          const voteList = await Promise.all(voteIds.map(async (voteId) => this.getVote(voteId, toBlock)))

          for (const vote of voteList) {
            if (E.isLeft(vote)) {
              throw vote.left
            }
          }

          const voteMap = new Map<number, IVoteInfo>()

          voteList.forEach((vote) => {
            if (E.isRight(vote) && vote.right.open) {
              voteMap.set(vote.right.id, vote.right)
            }
          })

          return voteMap
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(votes)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call getStartedVotes from ${fromBlock} to ${toBlock}`))
    }
  }

  public async getContractOwner(
    address: string,
    method: string,
    currentBlock: number,
  ): Promise<E.Either<Error, string>> {
    /*
    getContractOwner calls the method written in the ownershipMethod field in contract description
    and returns the owner of the contract address.
    */
    try {
      const members = await retryAsync(
        async (): Promise<string> => {
          const abi = [`function ${method}() view returns (address)`]
          const contract = new ethers.Contract(address, abi, this.jsonRpcProvider)
          return contract.functions[method]({ blockTag: currentBlock })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(String(members))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call ethers.Contract for address ${address}`))
    }
  }

  public async getRoleMembers(
    address: string,
    hash: string,
    currentBlock: BlockTag,
  ): Promise<E.Either<Error, string[]>> {
    try {
      const members = await retryAsync(
        async (): Promise<string[]> => {
          const contract = new ethers.Contract(address, AclEnumerableABI, this.jsonRpcProvider)

          const count = await contract.functions.getRoleMemberCount(hash, {
            blockTag: currentBlock,
          })

          if (Number(count) === 0) {
            return []
          }

          const members = []
          for (let i = 0; i < Number(count); i++) {
            const member = await contract.functions.getRoleMember(hash, i, {
              blockTag: currentBlock,
            })
            members.push(String(member).toLowerCase())
          }
          return members
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(members)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call ethers.Contract for address ${address}`))
    }
  }

  public async getProxyImplementation(
    address: string,
    data: IProxyContractData,
    currentBlock: number,
  ): Promise<E.Either<Error, string[]>> {
    try {
      const str = await retryAsync(
        async (): Promise<string[]> => {
          const proxyContract = new ethers.Contract(address, data.shortABI, this.jsonRpcProvider)
          if ('implementation' in proxyContract.functions) {
            return await proxyContract.functions.implementation({
              blockTag: currentBlock,
            })
          }
          if ('proxy__getImplementation' in proxyContract.functions) {
            return await proxyContract.functions.proxy__getImplementation({
              blockTag: currentBlock,
            })
          }

          throw new Error(
            `Proxy contract ${address} does not have "implementation" or "proxy__getImplementation" functions`,
          )
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(str)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call ethers.Contract for address ${address}`))
    }
  }

  public async isDeployed(address: string, blockNumber?: number): Promise<E.Either<Error, boolean>> {
    try {
      const result = await retryAsync(
        async (): Promise<boolean> => {
          const code = await this.jsonRpcProvider.getCode(address, blockNumber)
          return code !== '0x'
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(result)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getCode for address ${address}`))
    }
  }

  public async getNOInfoByMotionData(callData: string): Promise<E.Either<Error, INodeOperatorInfo>> {
    try {
      const expiryTimestamp = await retryAsync<INodeOperatorInfo>(
        async (): Promise<INodeOperatorInfo> => {
          const [nodeOperatorId, stakingLimit] =
            await this.increaseStakingLimitContract.functions.decodeEVMScriptCallData(callData)
          const [, name] = await this.nodeOperatorsRegistryContract.functions.getNodeOperator(nodeOperatorId, true)
          const [totalSigningKeys] =
            await this.nodeOperatorsRegistryContract.functions.getTotalSigningKeyCount(nodeOperatorId)

          return {
            name,
            totalSigningKeys: new BigNumber(String(totalSigningKeys)),
            stakingLimit: new BigNumber(String(stakingLimit)),
          }
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(expiryTimestamp)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call ensContract.functions.nameExpires for callData ${callData}`))
    }
  }

  public async getEnsExpiryTimestamp(ensName: string): Promise<E.Either<Error, BigNumber>> {
    try {
      const expiryTimestamp = await retryAsync<BigNumber>(
        async (): Promise<BigNumber> => {
          const labelHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ensName))
          const tokenId = ethers.BigNumber.from(labelHash).toString()
          const [resp] = await this.ensContract.functions.nameExpires(tokenId)

          return new BigNumber(String(resp))
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(expiryTimestamp)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call ensContract.functions.nameExpires for name ${ensName}`))
    }
  }

  public async getStartedBlockForApp(argv: string[]): Promise<E.Either<Error, number>> {
    let latestBlockNumber: number = -1

    if (argv.includes('--block')) {
      latestBlockNumber = parseInt(argv[4])
    } else if (argv.includes('--range')) {
      latestBlockNumber = parseInt(argv[4].slice(0, argv[4].indexOf('.')))
    } else if (argv.includes('--tx')) {
      const txHash = argv[4]
      const tx = await this.getTransaction(txHash)
      if (E.isLeft(tx)) {
        return E.left(tx.left)
      }

      if (tx.right.blockNumber !== undefined) {
        latestBlockNumber = tx.right.blockNumber
      }
    }
    if (latestBlockNumber == -1) {
      try {
        latestBlockNumber = await this.jsonRpcProvider.getBlockNumber()
      } catch (e) {
        return E.left(new NetworkError(e, `Could not fetch latest block number`))
      }
    }

    return E.right(latestBlockNumber)
  }

  public async getTransaction(txHash: string): Promise<E.Either<Error, TransactionResponse>> {
    try {
      const out = await retryAsync<TransactionResponse>(
        async (): Promise<TransactionResponse> => {
          const tx = await this.jsonRpcProvider.getTransaction(txHash)

          if (!tx) {
            throw new Error(`Can't find transaction ${txHash}`)
          }

          if (tx.blockNumber === undefined) {
            throw new Error(`Transaction ${txHash} was not yet included into block`)
          }

          return tx
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call getTransaction`))
    }
  }

  public async getStonksOrderEvents(
    stonksContractAddress: string,
    blockNumber: number,
  ): Promise<E.Either<Error, TypedEvent[]>> {
    try {
      const stonksContract = Stonks__factory.connect(stonksContractAddress, this.jsonRpcProvider)
      const result = await retryAsync(
        async () => {
          return await stonksContract.queryFilter(
            { address: stonksContractAddress },
            blockNumber - BLOCK_TO_WATCH,
            blockNumber,
          )
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(result)
    } catch (e) {
      return E.left(
        new NetworkError(e, `Could not call jsonRpcProvider.queryFilter for address ${stonksContractAddress}`),
      )
    }
  }

  public async getStonksOrderParams(stonksContractAddress: string) {
    const stonksContract = Stonks__factory.connect(stonksContractAddress, this.jsonRpcProvider)
    try {
      const result = await retryAsync(
        async () => {
          return await stonksContract.getOrderParameters()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(result)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getStonksOrderParams`))
    }
  }

  public async getStonksCOWInfo(fromBlock: number, toBlock: number, orderAddress: string) {
    try {
      const result = await retryAsync(
        async () => {
          return this.jsonRpcProvider.getLogs({
            fromBlock: `0x${fromBlock.toString(16)}`,
            toBlock: `0x${toBlock.toString(16)}`,
            address: COW_PROTOCOL_ADDRESS,
            topics: [
              null, // any
              orderAddress.replace('0x', '0x000000000000000000000000'),
            ],
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      const iface = Swap__factory.createInterface()
      const args = iface.parseLog(result[0]).args
      return E.right(args)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getStonksOrderParams`))
    }
  }

  public async getOrderBalance(orderAddress: string) {
    try {
      const result = await retryAsync(
        async () => {
          return await this.jsonRpcProvider.getBalance(orderAddress)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(result)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getStonksOrderParams`))
    }
  }

  public async getBalance(address: string, tokenAddress?: string): Promise<E.Either<Error, ethers.BigNumber>> {
    if (!tokenAddress) {
      try {
        const result = await retryAsync(
          async () => {
            return await this.jsonRpcProvider.getBalance(address)
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )
        return E.right(result)
      } catch (e) {
        return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getBalance`))
      }
    }

    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)'],
      this.jsonRpcProvider,
    )
    try {
      const result = await retryAsync(
        async () => {
          return await tokenContract.balanceOf(address)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(result)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getLinkBalance`))
    }
  }

  public async getTokenSymbol(tokenAddress: string) {
    const abi = [
      {
        inputs: [],
        name: 'symbol',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
      },
    ]
    try {
      const result = await retryAsync(
        async () => {
          const tokenContract = new ethers.Contract(tokenAddress, abi, this.jsonRpcProvider)
          return await tokenContract.symbol()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(result)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not get symbol for token ${tokenAddress}`))
    }
  }

  public async getBSCForwarderBridgeAdapterNames() {
    const cccContract = CrossChainController__factory.connect(BSC_L1_CROSS_CHAIN_CONTROLLER, this.jsonRpcProvider)
    let adapters: ICrossChainForwarder.ChainIdBridgeConfigStructOutput[] = []
    const bscAdapters = new Map<string, string>()

    try {
      adapters = await retryAsync(
        async () => {
          return await cccContract.getForwarderBridgeAdaptersByChain(BSC_CHAIN_ID)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
    } catch (e) {
      return E.left(new NetworkError(e, `Could not get forwarder bridge adapters for BSC chain`))
    }

    for (const adapterAddress of adapters) {
      const bridgeAdapterContract = BaseAdapter__factory.connect(
        adapterAddress.currentChainBridgeAdapter,
        this.jsonRpcProvider,
      )

      try {
        const adapterName = await retryAsync(
          async () => {
            return await bridgeAdapterContract.adapterName()
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )
        bscAdapters.set(adapterAddress.currentChainBridgeAdapter, adapterName)
      } catch (e) {
        return E.left(new NetworkError(e, `Could not get forwarder bridge adapters for BSC chain`))
      }
    }

    return E.right(bscAdapters)
  }
}
