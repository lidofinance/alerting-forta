# Lido Ethereum StETH bot

## Supported chains

- Ethereum mainnet

## Alerts

1. StETH operations
   1. HandleBlock
      1. 🚨🚨🚨 Buffered ETH drain (checks each block)
      2. 🚨 Huge depositable ETH amount (checks every 100 blocks)
      3. ⚠️ High depositable ETH amount (checks every 100 blocks)
      4. ⚠️ Low deposit executor balance (checks every 100 blocks)
      5. ⚠️ Unspent staking limit below 10% (checks every 25 blocks)
      6. 📉 Unspent staking limit below 30% (checks every 25 blocks)
   2. HandleTransaction
      1. Deposit Security events
      2. 🚨 Deposit Security: Deposits paused
      3. 🚨 Deposit Security: Guardian quorum changed
      4. 🚨 Deposit Security: Owner changed
      5. ⚠️ Deposit Security: Deposits resumed
      6. ⚠️ Deposit Security: Guardian added
      7. ⚠️ Deposit Security: Guardian removed
      8. ⚠️ Deposit Security: Max deposits changed
      9. ⚠️ Deposit Security: Min deposit block distance changed
   3. Lido events
      1. 🚨🚨🚨 Lido: Stopped 🚨🚨🚨
      2. 🚨🚨🚨 Share rate unexpected has changed
      3. 🚨 Lido: Staking limit removed
      4. 🚨 Lido: Locator set
      5. ⚠️ Lido: Resumed
      6. 🚨 Lido: Staking paused
      7. ⚠️ Lido: Staking resumed
      8. ⚠️ Lido: Staking limit set
      9. ⚠️ Lido: Funds recovered to vault
      10. ⚠️ Lido: Contract version set
      11. ℹ️ Lido: Token rebased
   4. Insurance fund events
      1. 🚨 Insurance fund: ERC20 transferred
      2. 🚨 Insurance fund: Ownership transferred
      3. ⚠️ Insurance fund: ETH transferred
      4. ⚠️ Insurance fund: ERC1155 transferred
      5. ⚠️ Insurance fund: ERC721 transferred
   5. Burner events
      1. ℹ️ Lido Burner: ERC20 recovered
      2. ℹ️ Lido Burner: ERC721 recovered
2. Withdrawals
   1. HandleBlock runs on each 100-th block or one per 20 minutes
      1. ⚠️ Withdrawals: <limitRate>% of stake limit is spent and unfinalized queue is on par with drained stake
         limit
      2. ⚠️ Withdrawals: unfinalized queue is more than 100_000 stETH
      3. ⚠️ Withdrawals: unfinalized queue wait time is <hours> more than 1 day
      4. ⚠️ Withdrawals: ${unclaimedSizeRate.times(100).toFixed(2)}% of finalized requests are unclaimed
      5. ⚠️ Withdrawals: unclaimed requests size is more than withdrawal queue balance
   2. HandleTransaction
      1. 🚨 Withdrawals: BUNKER MODE ON! 🚨
      2. 🚨 Withdrawals: contract was paused
      3. ⚠️ Withdrawals: BUNKER MODE OFF! ✅
      4. ℹ️ Huge stETH withdrawal requests batch
      5. ⚠️ Withdrawals: the sum of received withdrawal requests since the last rebase greater than 150_000 stETH (max
         staking limit)
      6. ⚠️ Withdrawals: claimed amount is more than requested
      7. ⚠️ Withdrawals: contract was unpaused
3. GateSeal
   1. HandleBlock runs on each next block
      1. 🚨 GateSeal: actual address doesn't have PAUSE_ROLE for contracts
      2. 🚨 GateSeal: is expired!
      3. 🚨️ GateSeal: is expired. Update code!
      4. ⚠️ GateSeal: default GateSeal address in forta agent is expired
      5. ⚠️️ GateSeal: default GateSeal address in forta agent doesn't have PAUSE_ROLE for contracts
      6. ⚠️ GateSeal: is about to be expired
   2. HandleTransaction
      1. 🚨🚨🚨 GateSeal: is sealed 🚨🚨🚨
      2. 🚨 GateSeal: is expired
4. Vaults
   1. Handleblock
      1. 🚨🚨🚨 Withdrawal Vault balance mismatch. [without oracle report]
      2. 🚨🚨🚨 Withdrawal Vault balance mismatch. [within oracle report]
      3. 🚨🚨🚨 EL Vault balance mismatch. [without oracle report]
      4. 🚨🚨🚨 EL Vault balance mismatch. [within oracle report]
      5. 💵 Withdrawal Vault Balance significant change (checks every on 100-th block)
      6. 💵 EL Vault Balance significant change
   2. HandleTransaction
      1. 🚨 Burner shares transfer

## Development (Forta specific)

Edit `alerting-forta/<SUBMODULE>/forta.config.json` and set `jsonRpcUrl` to your JSON-RPC provider. Install deps:

```
yarn install
```

Running in a live mode:

```
yarn start:dev
```

Testing on a specific block/range/transaction:

```
yarn block 13626668
yarn range '13626667..13626668'
yarn tx 0x2d2774c04e3faf9f17cd26e0978bb812081b9d0b5cc6fd8bf04cc441f92c0a8c
```
