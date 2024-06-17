# Lido x Mellow Detection Bot for Forta

## Supported chains

- Ethereum mainnet

## Alerts

1. Vault operations
   1. HandleBlock
      1. 🚨🚨🚨 Vault vaultTotalSupply and vaultUnderlyingTvl is not the same
      2. 🚨🚨🚨 Vault totalSupply more than maximalTotalSupply
      3. 🚨🚨🚨 Vault critical storage slot value changed
      4. 🚨 Vault critical storage not loaded
      5. ⚠️ Vault totalSupply close to maximalTotalSupply (every 1800 blocks)
      6. ⚠️ Vault totalSupply reached maximalTotalSupply (every 1800 blocks)
   2. HandleTransaction
      1. 🚨 Vault: Role Admin changed
      2. 🚨 Vault: Role revoked
      3. 🚨 Vault: Role granted
      4. ⚠️ Vault: Symbiotic limit increased
      5. ⚠️ Vault: Symbiotic limit reached
2. Multisig
   1. HandleTransaction
      1. 🚨 Gnosis Safe: Owner added
      2. 🚨 Gnosis Safe: Owner removed
      3. 🚨 Gnosis Safe: Fallback handler changed
      3. 🚨 Gnosis Safe: Guard changed
      4. 🚨 Gnosis Safe: Threshold changed
      5. 🚨 Gnosis Safe: Module disabled
      6. 🚨 Gnosis Safe: Module enabled
      7. ❌ Gnosis Safe: TX Execution faile
      8. ✅ Gnosis Safe: TX Executed
      9. ❌ Gnosis Safe: Execution failed from module
      10. ✅ Gnosis Safe: Execution success from module
3. ACL
   1. HandleBlock
      1. 🚨 Vault Contract owner set to address not in whitelist
      2. 🚨🚨🚨 Vault Contract owner set to EOA 🚨🚨🚨

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