import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../utils/constants'
import {
  ENS as EnsContract,
  AragonVoting as AragonVotingContract,
  IncreaseStakingLimit as IncreaseStakingLimitContract,
  NodeOperatorsRegistry as NodeOperatorsRegistryContract,
} from '../generated'
import { IEtherscanProvider } from './contracts'
import { NetworkError } from '../utils/errors'
import { IEnsNamesClient } from '../services/ens-names/contract'
import { IEasyTrackClient, INodeOperatorInfo } from '../services/easy-track/contract'
import { IProxyWatcherClient } from '../services/proxy-watcher/contract'
import { BlockTag } from '@ethersproject/providers'
import { AclEnumerableABI } from 'constants/acl-changes'
import { IAclChangesClient } from '../services/acl-changes/contract'
import { IAragonVotingClient, IVoteInfo } from '../services/aragon-voting/contract'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export interface IProxyContractData {
  name: string
  shortABI: string
}

export class ETHProvider
  implements IEnsNamesClient, IEasyTrackClient, IProxyWatcherClient, IAclChangesClient, IAragonVotingClient
{
  private jsonRpcProvider: ethers.providers.JsonRpcProvider
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
            supportRequired: new BigNumber(String(voteInfo.supportRequired)).div(ETH_DECIMALS).toNumber(),
            minAcceptQuorum: new BigNumber(String(voteInfo.minAcceptQuorum)).div(ETH_DECIMALS).toNumber(),
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

  public async getOwner(address: string, method: string, currentBlock: number): Promise<E.Either<Error, string>> {
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
}
