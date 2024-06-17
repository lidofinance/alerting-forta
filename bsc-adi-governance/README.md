# Lido Detection Bot for BSC part of a.DI

## Supported chains

- Binance Smart Chain

## Sub-bots

### CrossChainExecutor

Alerts about events on the CrossChainExecutor

**Alerts:**

- 🚨🚨🚨 BSC a.DI: Guardians updated

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
