# Lido CSM bot

## Supported chains

-   Mainnet
-   Holesky
-   Hoodi

## Alerts

1. **CSModule**
    1. General
        1. 🔴 HIGH: Low prover wallet balance
        2. 🟠 MEDIUM: targetLimitMode was set for an operator.
        3. 🫧 LOW: Module's share is close to the targetShare.
        4. 🫧 LOW: More than N "empty" batches in the queue. (N = 30)
        5. 🫧 LOW: More than N validators in the queue. (N = 200)
        6. 🔵 INFO: EL rewards stealing penalty reported/settled/cancelled for an operator.
        7. 🔵 INFO: Operator X was unvetted.
        8. 🔵 INFO: Public release is activated.
        9. 🔵 INFO: Every 100 new operators created (69th as well).
    2. Roles monitoring
        1. 🚨 CRITICAL: role change: DEFAULT_ADMIN_ROLE
        2. 🚨 CRITICAL: role change: PAUSE_ROLE
        3. 🚨 CRITICAL: role change: RESUME_ROLE
        4. 🚨 CRITICAL: role change: MODULE_MANAGER_ROLE
        5. 🚨 CRITICAL: role change: STAKING_ROUTER_ROLE
        6. 🚨 CRITICAL: role change: REPORT_EL_REWARDS_STEALING_PENALTY_ROLE
        7. 🚨 CRITICAL: role change: SETTLE_EL_REWARDS_STEALING_PENALTY_ROLE
        8. 🚨 CRITICAL: role change: VERIFIER_ROLE
        9. 🚨 CRITICAL: role change: RECOVERER_ROLE
2. **CSAccounting**
    1. General
        1. 🚨 CRITICAL: sharesOf(CSAccounting.address) < CSBondCoreStorage.totalBondShares
        2. 🫧 LOW: sharesOf(CSAccounting.address) - CSBondCoreStorage.totalBondShares > 0.1 ether
    2. Events monitoring
        1. 🚨 CRITICAL: ChargePenaltyRecipientSet(address chargeRecipient)
        2. 🚨 CRITICAL: BondCurveUpdated(uint256 indexed curveId, uint256[] bondCurve)
        3. 🚨 CRITICAL: Approval(address owner, address spender, uint256 value) of stETH from CSAccounting, unless to the Burner
        4. 🔴 HIGH: BondCurveAdded(uint256[] bondCurve)
        5. 🔴 HIGH: BondCurveSet(uint256 indexed nodeOperatorId, uint256 curveId)
        6. 🔴 HIGH: Penalty exceeding bond applied
    3. Roles monitoring
        1. 🚨 CRITICAL: DEFAULT_ADMIN_ROLE
        2. 🚨 CRITICAL: PAUSE_ROLE
        3. 🚨 CRITICAL: RESUME_ROLE
        4. 🚨 CRITICAL: ACCOUNTING_MANAGER_ROLE
        5. 🚨 CRITICAL: MANAGE_BOND_CURVES_ROLE
        6. 🚨 CRITICAL: SET_BOND_CURVE_ROLE
        7. 🚨 CRITICAL: RESET_BOND_CURVE_ROLE
        8. 🚨 CRITICAL: RECOVERER_ROLE
3. **CSFeeOracle**
    1. General
        1. 🚨 CRITICAL: FeeDistributorContractSet(address feeDistributorContract)
        2. 🚨 CRITICAL: ConsensusHashContractSet(address indexed addr, address indexed prevAddr)
        3. 🔴 HIGH: PerfLeewaySet(uint256 valueBP)
        4. 🔴 HIGH: ConsensusVersionSet(uint256 indexed version, uint256 indexed prevVersion)
        5. 🫧 INFO: WarnProcessingMissed(uint256 indexed refSlot)
        6. 🫧 INFO: ReportSubmitted(uint256 indexed refSlot, bytes32 hash, uint256 processingDeadlineTime)
    2. Roles monitoring
        1. 🚨 CRITICAL: DEFAULT_ADMIN_ROLE
        2. 🚨 CRITICAL: CONTRACT_MANAGER_ROLE
        3. 🚨 CRITICAL: SUBMIT_DATA_ROLE
        4. 🚨 CRITICAL: PAUSE_ROLE
        5. 🚨 CRITICAL: RESUME_ROLE
        6. 🚨 CRITICAL: RECOVERER_ROLE
    3. HashConsensus (for CSFeeOracle)
        1. Events monitoring
            1. 🔴 HIGH: MemberAdded(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)
            2. 🔴 HIGH: MemberRemoved(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)
            3. 🔴 HIGH: QuorumSet(uint256 newQuorum, uint256 totalMembers, uint256 prevQuorum)
            4. 🔴 HIGH: FastLaneConfigSet(uint256 fastLaneLengthSlots)
            5. 🔴 HIGH: FrameConfigSet(uint256 newInitialEpoch, uint256 newEpochsPerFrame)
            6. 🔴 HIGH: ReportProcessorSet(address indexed processor, address indexed prevProcessor)
            7. 🔴 HIGH: another report variant appeared (alternative hash) event ReportReceived(uint256 indexed refSlot, address indexed member, bytes32 report)
            8. 🔴 HIGH: ConsensusLost(uint256 indexed refSlot)
            9. 🟡 MEDIUM: Sloppy oracle fast lane member
            10. 🔵 INFO: ConsensusReached(uint256 indexed refSlot, bytes32 report, uint256 support)
        2. Roles monitoring
            1. 🚨 CRITICAL: DEFAULT_ADMIN_ROLE
            2. 🚨 CRITICAL: DISABLE_CONSENSUS_ROLE
            3. 🚨 CRITICAL: MANAGE_MEMBERS_AND_QUORUM_ROLE
            4. 🚨 CRITICAL: MANAGE_FRAME_CONFIG_ROLE
            5. 🚨 CRITICAL: MANAGE_FAST_LANE_CONFIG_ROLE
            6. 🚨 CRITICAL: MANAGE_REPORT_PROCESSOR_ROLE
4. **CSFeeDistributor**

    1. Events monitoring
        1. 🚨 CRITICAL: Receiver of TransferShares is NOT CSAccounting, if from is CSFeeDistributor
        2. 🔴 HIGH: No fees distributed for X days (repeat every 1 day).
        3. 🔵 INFO: DistributionDataUpdated -> Oracle settled a new report.
        4. 🔵 INFO: DistributionLogUpdated.
    2. Roles monitoring
        1. 🚨 CRITICAL: DEFAULT_ADMIN_ROLE
        2. 🚨 CRITICAL: RECOVERER_ROLE

5. **OssifiableProxy**
   For the following contracts:

    - CSModule
    - CSAccounting
    - CSFeeOracle
    - CSFeeDistributor

    1. 🚨 CRITICAL: event ProxyOssified()
    2. 🚨 CRITICAL: event Upgraded(address indexed implementation)
    3. 🚨 CRITICAL: event AdminChanged(address previousAdmin, address newAdmin)

6. **PausableUntil**
   For the following contracts:

    - CSModule
    - CSAccounting
    - CSFeeOracle

    1. 🚨 CRITICAL: Paused(uint256 duration);
    2. 🚨 CRITICAL: Resumed();

7. **AssetRecoverer**
   For the following contracts:

    - CSModule
    - CSAccounting
    - CSFeeOracle
    - CSFeeDistributor

    1. 🔴 HIGH: EtherRecovered()
    2. 🔴 HIGH: ERC20Recovered()
    3. 🔴 HIGH: StETHSharesRecovered()
    4. 🔴 HIGH: ERC721Recovered()
    5. 🔴 HIGH: ERC1155Recovered()

8. **GateSeal**
    1. 🔴 HIGH: CSM GateSeal expires soon (less than 3 months).

## Deployment

-   Make sure you have uncommitted changes
-   Run `yarn push` command
-   Copy the resulting docker image reference
-   Deploy a new version via https://app.forta.network with the image reference from the previous step

## Development

Install dependencies.

```shell
yarn install
```

Create a `forta.config.json` file with the following content and replace Ethereum RPC URL with the
one you're gonna use for development.

```json
{
    "localRpcUrls": {
        "ethereum": "http://127.0.0.1:8545"
    }
}
```

To start the bot in local mode just run:

```shell
yarn run start
```

Use one of the following commands to check specific range/block/transaction(s):

```shell
yarn run range $BLOCK_NUMBER..$BLOCK_NUMBER
yarn run block $SOME_BLOCK_NUMBER_OR_HASH
yarn run tx $SOME_TX_HASH[,$ANOTHER_HASH]
```

## Forta bot v1 or v2?

This bot is developed using SDKv2, so it's the v2 bot. But the project provides a shim to be used as
a v1 bot, though not well tested. By default, the `yarn push` command uses the Dockerfile in the
repository to build an image of the v2 bot. If you want to push an image to be used as a v1 bot,
replace the command in the Dockerfile with `yarn run start:prod:v1`.

CMD ["yarn", "run", "start:prod:v1"]
