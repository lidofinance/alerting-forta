# Lido Detection Bot for BSC part of a.DI

## Supported chains

- Binance Smart Chain

## Sub-bots

### CrossChainExecutorWatcher

Alerts about events on the CrossChainExecutor

**Alerts:**

- 🚨🚨🚨 BSC a.DI: Guardians updated
- 🚨🚨🚨 BSC a.DI: Proxy admin changed
- 🚨🚨🚨 BSC a.DI: Proxy upgraded
- 🚨 BSC a.DI: Allowed Bridges quorum updated
- 🚨 BSC a.DI: Allowed bridges set updated
- ⚠️ BSC a.DI: Message hasn’t achieved a quorum after 1 hour
- ⚠️ BSC a.DI: Cross-chain executor delay updated
- ⚠️ BSC a.DI: Cross-chain executor Grace Period updated
- ⚠️ BSC a.DI: Cross-chain executor Min Delay updated
- ⚠️ BSC a.DI: Cross-chain executor Max Delay updated
- ℹ️ BSC a.DI: Action set queued
- ℹ️ BSC a.DI: Action set executed
- ℹ️ BSC a.DI: Action set canceled

### CrossChainController

Alerts about events on the CrossChainController

- ℹ️ BSC a.DI: Message received by the X adapter

## Development

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
