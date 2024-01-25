# Lido ethereum Steth bot

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
         1. 🚨 Deposit Security: Deposits paused
         2. ⚠️Deposit Security: Deposits resumed
         3. ⚠️ Deposit Security: Guardian added
         4. ⚠️ Deposit Security: Guardian removed
         5. 🚨 Deposit Security: Guardian quorum changed
         6. ⚠️ Deposit Security: Max deposits changed
         7. ⚠️ Deposit Security: Min deposit block distance changed
         8. 🚨 Deposit Security: Owner changed
      2. Lido events
         1. 🚨🚨🚨 Lido: Stopped 🚨🚨🚨
         2. ⚠️ Lido: Resumed
         3. 🚨 Lido: Staking paused
         4. ⚠️ Lido: Staking resumed
         5. ⚠️ Lido: Staking limit set
         6. 🚨 Lido: Staking limit removed
         7. 🚨 Lido: Locator set
         8. ⚠️Lido: Funds recovered to vault
         9. ⚠️Lido: Contract version set
         10. ⚠️ Lido: Token rebased
         11. 🚨 Share rate unexpected has changed
      3. Insurance fund events
         1. ⚠️ Insurance fund: ETH transferred
         2. ⚠️ Insurance fund: ERC721 transferred
         3. 🚨 Insurance fund: ERC20 transferred
         4. ⚠️ Insurance fund: ERC1155 transferred
         5. 🚨 Insurance fund: Ownership transferred
      4. Burner events
         1. ℹ️ Lido Burner: ERC20 recovered
         2. ℹ️ Lido Burner: ERC721 recovered
2. Withdrawals.
   1. HandleBlock runs on each 100-th block or one per 20 minutes
      1. ⚠️ Withdrawals: <limitRate>% of stake limit is spent and unfinalized queue is on par with drained stake
         limit
      2. ⚠️ Withdrawals: unfinalized queue is more than 100_000 stETH
      3. ⚠️ Withdrawals: unfinalized queue wait time is <hours> more then 1 day
      4. ⚠️ Withdrawals: ${unclaimedSizeRate.times(100).toFixed(2)}% of finalized requests are unclaimed
      5. ⚠️ Withdrawals: unclaimed requests size is more than withdrawal queue balance
   2. HandleTransaction
      1. 🚨 Withdrawals: BUNKER MODE ON! 🚨
      2. ⚠️Withdrawals: BUNKER MODE OFF! ✅
      3. ℹ️ Huge stETH withdrawal requests batch
      4. ⚠️ Withdrawals: the sum of received withdrawal requests since the last rebase greater than 150_000 stETH (max staking limit)
      5. ⚠️Withdrawals: claimed amount is more than requested
      6. ⚠️Withdrawals: contract was unpaused
      7. 🚨 Withdrawals: contract was paused
3. GateSeal
   1. HandleBlock runs on each next block
      1. ⚠️ GateSeal: default GateSeal address in forta agent is expired
      2. ⚠️️ GateSeal: default GateSeal address in forta agent doesn't have PAUSE_ROLE for contracts
      3. 🚨 GateSeal: actual address doesn't have PAUSE_ROLE for contracts
      4. 🚨 GateSeal: is expired!
      5. ⚠️ GateSeal: is about to be expired
   2. HandleTransaction
      1. 🚨🚨🚨 GateSeal: is sealed 🚨🚨🚨
      2. ℹ️ GateSeal: is expired
4. Vaults
   1. Handleblock
      1. 💵 Withdrawal Vault Balance significant change (checks every on 100-th block)
      2. 💵 EL Vault Balance significant change
      3. 🚨🚨🚨 Withdrawal Vault balance mismatch
      4. 🚨🚨🚨 EL Vault balance mismatch
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
