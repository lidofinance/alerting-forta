# Lido bot detecting reverted transactions

## Supported chains

- Ethereum mainnet

## Alerts

- REVERTED-TX: A reverted transaction has been detected on the specified contract
- REVERTED-TX-HIGH-GAS: A reverted transaction with high gas used has been detected on the specified contract
- REVERTED-TX-SPAM: Multiple reverted transactions by one EOA/contract have been detected on the specified contract

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

Testing via Jest:

```
yarn test:e2e
```