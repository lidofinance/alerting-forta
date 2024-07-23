# Lido CSM bot

## Supported chains

- Holesky testnet

## Alerts

1. **CSModule**
   1. General
      - _To be added_
   2. Roles monitoring
      - _To be added_
2. **CSAccounting**
   1. General
      - _To be added_
   2. Events monitoring
      1. 🟣 CRITICAL: ChargePenaltyRecipientSet(address chargeRecipient)
      2. 🟣 CRITICAL: BondCurveUpdated(uint256 indexed curveId, uint256[] bondCurve)
      3. 🔴 HIGH: BondCurveAdded(uint256[] bondCurve)
      4. 🔴 HIGH: BondCurveSet(uint256 indexed nodeOperatorId, uint256 curveId)
      5. 🔵 INFO: Approval(address owner, address spender, uint256 value) (stETH contract)
   3. Roles monitoring
      - _To be added_
3. **CSFeeOracle**
   1. General
      1. 🟣 CRITICAL: ConsensusHashContractSet(address indexed addr, address indexed prevAddr)
      2. 🔴 HIGH: PerfLeewaySet(uint256 valueBP)
      3. 🔴 HIGH: FeeDistributorContractSet(address feeDistributorContract)
      4. 🔴 HIGH: ConsensusVersionSet(uint256 indexed version, uint256 indexed prevVersion)
      5. 🔴 HIGH: WarnProcessingMissed(uint256 indexed refSlot)
      6. 🔵 INFO: ReportSubmitted(uint256 indexed refSlot, bytes32 hash, uint256 processingDeadlineTime)
      7. 🔵 INFO: ProcessingStarted(uint256 indexed refSlot, bytes32 hash)
      8. 🔵 INFO: ReportSettled(uint256 indexed refSlot, uint256 distributed, bytes32 treeRoot, string treeCid)
   2. Roles monitoring
      - _To be added_
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
         - _To be added_
4. **CSFeeDistributor**
   1. Alerting for failed transactions
      - _To be added_
   2. Events monitoring
      1. 🟣 CRITICAL: Receiver of TransferShares is NOT CSAccounting, if from is CSFeeDistributor
      2. 🔵 INFO: DistributionDataUpdated -> Oracle settled a new report.
   3. Roles monitoring
      - _To be added_

5. **CSEarlyAdoption**
   - _To be added_

6. **OssifiableProxy**
   For the following contracts:

   - CSModule
   - CSAccounting
   - CSFeeOracle
   - CSFeeDistributor

1.  🟣 CRITICAL: event ProxyOssified()
2.  🟣 CRITICAL: event Upgraded(address indexed implementation)
3.  🟣 CRITICAL: event AdminChanged(address previousAdmin, address newAdmin)
4.  🟣 CRITICAL: event BeaconUpgraded(address indexed beacon)

7.  **PausableUntil**
    For the following contracts:

    - CSModule
    - CSAccounting
    - CSFeeOracle

    1.  🟣 CRITICAL: Paused(uint256 duration);
    2.  🟣 CRITICAL: Resumed();

8.  **AssetRecoverer**
    For the following contracts:

    - CSModule
    - CSAccounting
    - CSFeeOracle
    - CSFeeDistributor

    1.  🔴 HIGH: EtherRecovered()
    2.  🔴 HIGH: ERC20Recovered()
    3.  🔴 HIGH: StETHSharesRecovered()
    4.  🔴 HIGH: ERC721Recovered()
    5.  🔴 HIGH: ERC1155Recovered()

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
