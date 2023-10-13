# Lido Detection Bot for L2 bridges balances

## Supported chains

- Ethereum.mainnet

## Sub-bots

### Balance

Alerts about balance mismatch

**Alerts:**

- BRIDGE-BALANCE-MISMATCH - totalSupply of the bridged wstETH is greater than balance of L1 bridge side

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
