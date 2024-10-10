import { DeploymentAddress, DeploymentAddresses } from '../../utils/constants.holesky'
import { expect } from '@jest/globals'
import { TransactionDto } from '../../entity/events'
import {
    CSModule__factory,
    CSAccounting__factory,
    CSFeeDistributor__factory,
    CSFeeOracle__factory,
} from '../../generated/typechain'
import { CSFeeOracleSrv, ICSFeeOracleClient } from './CSFeeOracle.srv'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { ethers } from '@fortanetwork/forta-bot'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import promClient from 'prom-client'
import { Metrics } from '../../utils/metrics/metrics'
import {
    getCSFeeOracleEvents,
    getHashConsensusEvents,
} from '../../utils/events/cs_fee_oracle_events'

const TEST_TIMEOUT = 120_000 // ms

describe('CSFeeOracle and HashConsensus events tests', () => {
    const chainId = 17000

    const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
    })

    const address: DeploymentAddress = DeploymentAddresses

    const fortaEthersProvider = new ethers.providers.JsonRpcProvider(
        getFortaConfig().jsonRpcUrl,
        chainId,
    )
    const csModuleRunner = CSModule__factory.connect(address.CS_MODULE_ADDRESS, fortaEthersProvider)
    const csAccountingRunner = CSAccounting__factory.connect(
        address.CS_ACCOUNTING_ADDRESS,
        fortaEthersProvider,
    )
    const csFeeDistributorRunner = CSFeeDistributor__factory.connect(
        address.CS_FEE_DISTRIBUTOR_ADDRESS,
        fortaEthersProvider,
    )
    const csFeeOracleRunner = CSFeeOracle__factory.connect(
        address.CS_FEE_ORACLE_ADDRESS,
        fortaEthersProvider,
    )

    const registry = new promClient.Registry()
    const m = new Metrics(registry, 'test_')

    const csFeeOracleClient: ICSFeeOracleClient = new ETHProvider(
        logger,
        m,
        fortaEthersProvider,
        csModuleRunner,
        csAccountingRunner,
        csFeeDistributorRunner,
        csFeeOracleRunner,
    )

    const csFeeOracleSrv = new CSFeeOracleSrv(
        logger,
        csFeeOracleClient,
        getHashConsensusEvents(address.HASH_CONSENSUS_ADDRESS),
        getCSFeeOracleEvents(address.CS_FEE_ORACLE_ADDRESS),
        address.HASH_CONSENSUS_ADDRESS,
        address.CS_FEE_ORACLE_ADDRESS,
    )

    test(
        '🔵 CSFeeOracle: Processing Started, Report Settled',
        async () => {
            const txHash = '0xf53cfcc9e576393b481a1c8ff4d28235703b6b5b62f9edb623d913b5d059f9c5'
            const trx = await fortaEthersProvider.getTransaction(txHash)
            const receipt = await trx.wait()

            const transactionDto: TransactionDto = {
                logs: receipt.logs,
                to: trx.to ? trx.to : null,
                block: {
                    timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
                    number: trx.blockNumber ? trx.blockNumber : 1,
                },
                hash: trx.hash,
            }

            const results = csFeeOracleSrv.handleTransaction(transactionDto)

            expect(results).toMatchSnapshot()
            expect(results.length).toBe(2)
        },
        TEST_TIMEOUT,
    )

    test(
        '🔴 HashConsensus: FrameConfig Set',
        async () => {
            const txHash = '0xa6f4206ce30d66b378ab6e4ddef442ac4f29c95c5175fbb4a8944e6bec663724'
            const trx = await fortaEthersProvider.getTransaction(txHash)
            const receipt = await trx.wait()

            const transactionDto: TransactionDto = {
                logs: receipt.logs,
                to: trx.to ? trx.to : null,
                block: {
                    timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
                    number: trx.blockNumber ? trx.blockNumber : 1,
                },
                hash: trx.hash,
            }

            const result = csFeeOracleSrv.handleTransaction(transactionDto)

            expect(result).toMatchSnapshot()
            expect(result.length).toBe(1)
        },
        TEST_TIMEOUT,
    )

    test(
        '🔴 HashConsensus: Member added, Quorum Set',
        async () => {
            const txHash = '0xdfcdbe0b9e795b2b83ad405c17b0c7326b00748cb3b11282a460c50b1f4588b0'

            const trx = await fortaEthersProvider.getTransaction(txHash)
            const receipt = await trx.wait()

            const transactionDto: TransactionDto = {
                logs: receipt.logs,
                to: trx.to ? trx.to : null,
                block: {
                    timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
                    number: trx.blockNumber ? trx.blockNumber : 1,
                },
                hash: trx.hash,
            }

            const results = csFeeOracleSrv.handleTransaction(transactionDto)

            expect(results).toMatchSnapshot()
            expect(results.length).toBe(2)
        },
        TEST_TIMEOUT,
    )

    test(
        '🔴 HashConsensus: Member Removed, Quorum Set, Consensus Reached, Report Submitted',
        async () => {
            const txHash = '0xd22f8208b4bb2013a1113d68f9f19e3be13147c1f77ce811baa32ef082deed42'
            const trx = await fortaEthersProvider.getTransaction(txHash)
            const receipt = await trx.wait()

            const transactionDto: TransactionDto = {
                logs: receipt.logs,
                to: trx.to ? trx.to : null,
                block: {
                    timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
                    number: trx.blockNumber ? trx.blockNumber : 1,
                },
                hash: trx.hash,
            }

            const result = csFeeOracleSrv.handleTransaction(transactionDto)

            expect(result).toMatchSnapshot()
            expect(result.length).toBe(4)
        },
        TEST_TIMEOUT,
    )

    test(
        'Empty findings',
        async () => {
            const txHash = '0x74ff368ba6ea748e19a7f0fefd9d0f708078176e56799dbe97d46ae59782ff9d'
            const trx = await fortaEthersProvider.getTransaction(txHash)
            const receipt = await trx.wait()

            const transactionDto: TransactionDto = {
                logs: receipt.logs,
                to: trx.to ? trx.to : null,
                block: {
                    timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
                    number: trx.blockNumber ? trx.blockNumber : 1,
                },
                hash: trx.hash,
            }

            const result = csFeeOracleSrv.handleTransaction(transactionDto)

            expect(result.length).toBe(0)
        },
        TEST_TIMEOUT,
    )

    test(
        '🔴 CSFeeOracle: Consensus Hash Contract Set, Consensus Version Set, FeeDistributor Contract Set, Perf Leeway Set',
        async () => {
            const txHash = '0xdc5ed949e5b30a5ff6f325cd718ba5a52a32dc7719d3fe7aaf9661cc3da7e9a6'
            const trx = await fortaEthersProvider.getTransaction(txHash)
            const receipt = await trx.wait()

            const transactionDto: TransactionDto = {
                logs: receipt.logs,
                to: trx.to ? trx.to : null,
                block: {
                    timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
                    number: trx.blockNumber ? trx.blockNumber : 1,
                },
                hash: trx.hash,
            }

            const result = csFeeOracleSrv.handleTransaction(transactionDto)

            expect(result).toMatchSnapshot()
            expect(result.length).toBe(4)
        },
        TEST_TIMEOUT,
    )
})
