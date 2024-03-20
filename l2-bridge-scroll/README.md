# Lido Detection Mantle Bot

How does it work.

The bot works on two networks: ETH mainnet and Mantle.
Here's how it operates: The bot monitors new blocks on the ETH mainnet.
Since Forta doesn't currently support Mantle, the bot reads blocks on the L2 network (Mantle) and stores the latest one
in an in-memory cache.
When the bot reads the next block on ETH, it also retrieves a segment of Mantle blocks (cachedBlock, LatestBlock) from
the cache.

## Supported chains

- Ethereum mainnet, Mantle network

## Alerts

1. Bridge events
   1. 🚨🚨🚨 Mantle L2 Bridge: Implementation initialized
   2. 🚨 Mantle L2 Bridge: Deposits Disabled
   3. 🚨 Mantle L2 Bridge: Role Admin changed
   4. 🚨 Mantle L2 Bridge: Withdrawals Disabled
   5. ⚠️ Mantle L2 Bridge: Role granted
   6. ⚠️ Mantle L2 Bridge: Role revoked
   7. ℹ️ Mantle L2 Bridge: Deposits Enabled
   8. ℹ️ Mantle L2 Bridge: Withdrawals Enabled
2. Gov Events
   1. 🚨 Mantle Gov Bridge: Ethereum Governance Executor Updated
   2. 🚨 Mantle Gov Bridge: Guardian Updated
   3. ⚠️ Mantle Gov Bridge: Delay Updated
   4. ⚠️ Mantle Gov Bridge: Grace Period Updated
   5. ⚠️ Mantle Gov Bridge: Min Delay Updated
   6. ⚠️ Mantle Gov Bridge: Max Delay Updated
   7. ℹ️ Mantle Gov Bridge: Action set queued
   8. ℹ️ Mantle Gov Bridge: Action set executed
   9. ℹ️ Mantle Gov Bridge: Action set canceled
3. Proxy events
   1. 🚨 Mantle: Proxy ossified
   2. 🚨 Mantle: Proxy admin changed
   3. 🚨 Mantle: Proxy implementation changed
   4. 🚨 Mantle: Proxy upgraded
   5. 🚨 Mantle: Proxy beacon upgraded
4. Monitor Withdrawals
   1. ⚠️ Mantle: Huge withdrawals during the last ...
5. Agent balance

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
