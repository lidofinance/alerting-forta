# Lido Detection Linea Bot

How does it work.

The bot works on two networks: ETH mainnet and Linea.
Here's how it operates: The bot monitors new blocks on the ETH mainnet.
Since Forta doesn't currently support Linea, the bot reads blocks on the L2 network (Linea) and stores the latest one
in an in-memory cache.
When the bot reads the next block on ETH, it also retrieves a segment of Linea blocks (cachedBlock, LatestBlock) from
the cache.

## Supported chains

- Ethereum mainnet, Linea network

## Alerts

1. Bridge events
   1. 🚨 Linea L2 Bridge: Paused
   2. 🚨 Linea L2 Bridge: Implementation initialized 
   3. ⚠️ Linea L2 Bridge: Unpaused
2. Gov Events
   1. 🚨 Linea Gov Bridge: Ethereum Governance Executor Updated
   2. 🚨 Linea Gov Bridge: Guardian Updated
   3. ⚠️ Linea Gov Bridge: Delay Updated
   4. ⚠️ Linea Gov Bridge: Grace Period Updated
   5. ⚠️ Linea Gov Bridge: Min Delay Updated
   6. ⚠️ Linea Gov Bridge: Max Delay Updated
   7. ℹ️ Linea Gov Bridge: Action set queued
   8. ℹ️ Linea Gov Bridge: Action set executed
   9. ℹ️ Linea Gov Bridge: Action set canceled
3. Proxy events
   1. 🚨 Linea: Proxy admin changed
   2. 🚨 Linea: Proxy upgraded
   3. 🚨 Linea: Proxy beacon upgraded
4. Monitor Withdrawals
   1. ⚠️ Linea: Huge withdrawals during the last ...

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
