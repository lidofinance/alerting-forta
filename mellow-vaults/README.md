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
yarn block 20061166
yarn range '20061165..20061166'
yarn tx 0xb8b96ee47cadb80ec41dafceba1fe5b10b1d50b75e7ad9114ee16180bda2d2b4
```