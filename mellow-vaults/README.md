# Lido x Mellow Detection Bot for Forta

## Supported chains

- Ethereum mainnet

## Alerts

1. Vault operations
   1. HandleBlock
      1. 🚨🚨🚨 Vault vaultTotalSupply and vaultUnderlyingTvl is almost same
      2. 🚨🚨🚨 Vault totalSupply more than maximalTotalSupply
      3. 🚨🚨🚨 Vault critical storage slot value changed
      4. 🚨 Vault critical storage not loaded
   2. HandleTransaction
      1. 🚨 Vault: Role Admin changed
      2. 🚨 Vault: Role revoked
      3. 🚨 Vault: Role granted

## Development

Install deps:

```
yarn install
```

### Mainnet

Edit `alerting-forta/<SUBMODULE>/forta.config.json` and set `jsonRpcUrl` to your Mainnet JSON-RPC provider.

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