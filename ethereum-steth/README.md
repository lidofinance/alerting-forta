# Lido Ethereum StETH bot

## Supported chains

- Ethereum mainnet

## Alerts

1. Infra:
   1. ℹ️ Steth: Currently processing Ethereum network block is outdated
2. StETH operations
   1. HandleBlock
      1. 🚨🚨🚨 Buffered ETH drain (checks each block)
      2. 🚨 Huge depositable ETH amount (checks every 100 blocks)
      3. ⚠️ High depositable ETH amount (checks every 100 blocks)
      4. ⚠️ Low deposit executor balance (checks every 100 blocks)
      5. ⚠️ Unspent staking limit below 10% (checks every 25 blocks)
      6. 📉 Unspent staking limit below 30% (checks every 25 blocks)
   2. HandleTransaction
      1. Deposit Security events
         1. 🚨 Deposit Security: Deposits paused
         2. 🚨 Deposit Security: Guardian quorum changed
         3. 🚨 Deposit Security: Owner changed
         4. ⚠️ Deposit Security: Deposits resumed
         5. ⚠️ Deposit Security: Guardian added
         6. ⚠️ Deposit Security: Guardian removed
         7. ⚠️ Deposit Security: Max deposits changed
         8. ⚠️ Deposit Security: Min deposit block distance changed
      2. Lido events
         1. 🚨🚨🚨 Lido: Stopped 🚨🚨🚨
         2. 🚨🚨🚨 Share rate unexpected has changed
         3. 🚨 Lido: Staking limit removed
         4. 🚨 Lido: Locator set
         5. 🚨 Lido: Staking paused
         6. ⚠️ Lido: Resumed
         7. ⚠️ Lido: Staking resumed
         8. ⚠️ Lido: Staking limit set
         9. ⚠️ Lido: Funds recovered to vault
         10. ⚠️ Lido: Contract version set
         11. ℹ️ Lido: Token rebased
      3. Insurance fund events
         1. 🚨 Insurance fund: ERC20 transferred
         2. 🚨 Insurance fund: Ownership transferred
         3. ⚠️ Insurance fund: ETH transferred
         4. ⚠️ Insurance fund: ERC1155 transferred
         5. ⚠️ Insurance fund: ERC721 transferred
      4. Burner events
         1. ℹ️ Lido Burner: ERC20 recovered
         2. ℹ️ Lido Burner: ERC721 recovered
3. Withdrawals
   1. HandleBlock runs on each 100-th block or one per 20 minutes
      1. 🚨🚨🚨 Withdrawals: unclaimed requests size is more than withdrawal queue balance
      2. ⚠️ Withdrawals: <limitRate>% of stake limit is spent and unfinalized queue is on par with drained stake
         limit
      3. ⚠️ Withdrawals: unfinalized queue is more than 100_000 stETH
      4. ⚠️ Withdrawals: unfinalized queue wait time is <hours> more than 1 day
      5. ℹ️ Withdrawals: ${unclaimedSizeRate.times(100).toFixed(2)}% of finalized requests are unclaimed
   2. HandleTransaction
      1. 🚨🚨🚨 Withdrawals: claimed amount is more than requested
      2. 🚨 Withdrawals: BUNKER MODE ON! 🚨
      3. 🚨 Withdrawals: contract was paused
      4. ⚠️ Withdrawals: BUNKER MODE OFF! ✅
      5. ⚠️ Withdrawals: contract was unpaused
      6. ⚠️ Withdrawals: the sum of received withdrawal requests since the last rebase greater than 150_000 stETH (max
         staking limit)
      7. ℹ️ Huge stETH withdrawal requests batch
4. GateSeal
   1. HandleBlock runs on each next block
      1. 🚨 GateSeal: actual address doesn't have PAUSE_ROLE for contracts
      2. 🚨 GateSeal: is expired!
      3. ⚠️ GateSeal: GateSeal: a new instance deployed from factory
      4. ⚠️ GateSeal: default GateSeal address in forta agent is expired
      5. ⚠️️ GateSeal: default GateSeal address in forta agent doesn't have PAUSE_ROLE for contracts
      6. ⚠️ GateSeal: is about to be expired
   2. HandleTransaction
      1. 🚨🚨🚨 GateSeal: is sealed 🚨🚨🚨
      2. 🚨 GateSeal: is expired
5. Vaults
   1. Handleblock
      1. 🚨🚨🚨 Withdrawal Vault balance mismatch. [without oracle report]
      2. 🚨🚨🚨 Withdrawal Vault balance mismatch. [within oracle report]
      3. 🚨🚨🚨 EL Vault balance mismatch. [without oracle report]
      4. 🚨🚨🚨 EL Vault balance mismatch. [within oracle report]
      5. ℹ️ Withdrawal Vault Balance significant change (checks every on 100-th block)
      6. ℹ️ EL Vault Balance significant change
   2. HandleTransaction
      1. 🚨 Burner shares transfer
6. Storage Watcher
   1. 🚨 Storage slot value changed
      1. in LIDO_STETH
      2. in NOR
      3. in LEGACY_ORACLE
      4. in ACCOUNTING_ORACLE
      5. in ACCOUNTING_HASH_CONSENSUS
      6. in VEBO
      7. in VEBO_HASH_CONSENSUS
      8. in DSM
      9. in WSTETH
      10. in MEV_BOOST_RELAY_ALLOWED_LIST
      11. in ARAGON_VOTING
      12. in ARAGON_TOKEN_MANAGER
      13. in ARAGON_FINANCE
      14. in LIDO_TREASURY
      15. in LIDO_INSURANCE
      16. in STAKING_ROUTER
      17. in WITHDRAWALS_QUEUE
      18. in SIMPLE_DVT
7. Aave operations
   1. HandleBlock
      1. 🚨🚨🚨 astETH balance - astETH totalSupply >= 1ETH
      2. 🚨🚨🚨 stableDebtStETH totalSupply is not 0
      3. 🚨🚨🚨 variableDebtStETH totalSupply is not 0
8. Pool balances
   1. HandleBlock
      1. 🚨 Super low stETH:ETH price on Curve
      2. 🚨 Super low stETH:ETH price on Chainlink
      3. 🚨 Curve Pool rapid imbalance change
      4. 🚨️ Significant Curve Pool size change
      5. ⚠️ Significant Curve Pool size change
      6. ⚠️ Curve Pool is imbalanced
      7. ⚠️ stETH:ETH price on Curve decreased
      8. ⚠️ stETH:ETH price on Chainlink decreased

```
yarn install
yarn start
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
