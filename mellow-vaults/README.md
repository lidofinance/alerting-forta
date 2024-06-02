# Lido x Mellow Detection Bot for Forta

## Supported chains

- Ethereum mainnet

## Alerts

1. Aave operations
   1. HandleBlock
      1. 🚨🚨🚨 astETH balance - astETH totalSupply >= 1ETH
      2. 🚨🚨🚨 stableDebtStETH totalSupply is not 0
      3. 🚨🚨🚨 variableDebtStETH totalSupply is not 0
2. Pool balances
   1. HandleBlock
      1. 🚨 Super low stETH:ETH price on Curve
      2. 🚨 Super low stETH:ETH price on Chainlink
      3. 🚨 Curve Pool rapid imbalance change
      4. 🚨️ Significant Curve Pool size change
      5. ⚠️ Significant Curve Pool size change
      6. ⚠️ Curve Pool is imbalanced
      7. ⚠️ stETH:ETH price on Curve decreased
      8. ⚠️ stETH:ETH price on Chainlink decreased

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

### Testnet

For example, you need to add `testnet` tier support for some new sub-agent:

1. Change default import from `./constants` to `requireWithTier` function call:
   ##### Before:
   ```typescript
   import {
     NODE_OPERATORS_REGISTRY_ADDRESS,
     EASY_TRACK_ADDRESS,
     MOTION_ENACTED_EVENT,
     SIGNING_KEY_REMOVED_EVENT,
     NODE_OPERATOR_STAKING_LIMIT_SET_EVENT,
     NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE,
   } from './constants'
   ```
   ##### After:
   ```typescript
   import type * as Constants from './constants'
   const {
     NODE_OPERATORS_REGISTRY_ADDRESS,
     EASY_TRACK_ADDRESS,
     MOTION_ENACTED_EVENT,
     SIGNING_KEY_REMOVED_EVENT,
     NODE_OPERATOR_STAKING_LIMIT_SET_EVENT,
     NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE,
   } = requireWithTier<typeof Constants>(module, './constants')
   ```
2. Copy `./constants.ts` file to `./constants.testnet.ts` and change the addresses and other vars to the testnet ones.
3. Edit `alerting-forta/<SUBMODULE>/forta.config.json` and set `jsonRpcUrl` to your Testnet JSON-RPC provider.
4. Run `export FORTA_AGENT_RUN_TIER=testnet && yarn start:dev`

That's it! Only sub-agents that have `testnet` tier support will be run.
