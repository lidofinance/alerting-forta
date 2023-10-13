# Lido Huge TX Monitor

## Supported chains

- Ethereum mainnet

## Alerts

- HUGE-TOKEN-TRANSFERS-IN-SINGLE-TX - Huge token transfers detected in the TX
- HUGE-TOKEN-TRANSFERS-TECH - Detailed transfer info for tech purposes. Do not route it to alerts channel!
- HUGE-VAULT-BALANCE-CHANGE - Huge change in the AAVE or Maker vaults balance during last 15 min

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
