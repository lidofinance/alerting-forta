# Lido CSM bot

## Supported chains

- Holesky testnet

## Alerts

1. **CSModule**
   1. General
      1. 🔴 HIGH: EL rewards stealing penalty reported/settled/cancelled for an operator.
      2. 🟠 MEDIUM: targetLimitMode was set for an operator.
      3. 🟢 LOW: Module's share is close to the targetShare.
      4. 🟢 LOW: More than N "empty" batches in the queue. (N = 30)
      5. 🟢 LOW: More than N validators in the queue. (N = 200)
      6. 🔵 INFO: Operator X was unvetted.
      7. 🔵 INFO: Public release is activated.
      8. 🔵 INFO: Every 100 new operators created (69th as well).
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
      1. 🟢 LOW: Average bond value for a validator is below some threshold.
      2. 🟢 LOW: Total bond lock more than some value.
      3. 🟢 LOW: sharesOf(CSAccounting.address) - CSBondCoreStorage.totalBondShares > 0.1 ether
   2. Events monitoring
      1. 🚨 CRITICAL: ChargePenaltyRecipientSet(address chargeRecipient)
      2. 🚨 CRITICAL: BondCurveUpdated(uint256 indexed curveId, uint256[] bondCurve)
      3. 🔴 HIGH: BondCurveAdded(uint256[] bondCurve)
      4. 🔴 HIGH: BondCurveSet(uint256 indexed nodeOperatorId, uint256 curveId)
      5. 🔵 INFO: Approval(address owner, address spender, uint256 value) (stETH contract)
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
      1. 🚨 CRITICAL: ConsensusHashContractSet(address indexed addr, address indexed prevAddr)
      2. 🔴 HIGH: PerfLeewaySet(uint256 valueBP)
      3. 🔴 HIGH: FeeDistributorContractSet(address feeDistributorContract)
      4. 🔴 HIGH: ConsensusVersionSet(uint256 indexed version, uint256 indexed prevVersion)
      5. 🔵 INFO: WarnProcessingMissed(uint256 indexed refSlot)
      6. 🔵 INFO: ReportSubmitted(uint256 indexed refSlot, bytes32 hash, uint256 processingDeadlineTime)
      7. 🔵 INFO: ProcessingStarted(uint256 indexed refSlot, bytes32 hash)
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
         9. 🔵 INFO: ConsensusReached(uint256 indexed refSlot, bytes32 report, uint256 support)
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
   2. Roles monitoring
      1. 🚨 CRITICAL: DEFAULT_ADMIN_ROLE
      2. 🚨 CRITICAL: RECOVERER_ROLE

5. **CSEarlyAdoption**

   - _To be added_

6. **OssifiableProxy**
   For the following contracts:

   - CSModule
   - CSAccounting
   - CSFeeOracle
   - CSFeeDistributor

   1. 🚨 CRITICAL: event ProxyOssified()
   2. 🚨 CRITICAL: event Upgraded(address indexed implementation)
   3. 🚨 CRITICAL: event AdminChanged(address previousAdmin, address newAdmin)

7. **PausableUntil**
   For the following contracts:

   - CSModule
   - CSAccounting
   - CSFeeOracle

   1. 🚨 CRITICAL: Paused(uint256 duration);
   2. 🚨 CRITICAL: Resumed();

8. **AssetRecoverer**
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

## Development (Forta specific)

Edit `alerting-forta/<SUBMODULE>/forta.config.json` and set `jsonRpcUrl` to your JSON-RPC provider. Install deps:

```
yarn install
yarn build
yarn start
```

In separate console run

```
docker-compose up -d
```

## Testing alerts

1. For testing alerts you have to install promtool on your machine.

   ```
   make tools
   ```

2. Check alerts

   ```
   make test_alerts
   ```
