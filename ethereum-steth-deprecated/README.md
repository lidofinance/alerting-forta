# Lido Detection Bot for Forta

## Supported chains

- Ethereum mainnet
- Ethereum Goerli testnet (dev)

## Sub-bots

### Gate-seal

Gate seal related alerts

**Alerts:**

- GATE-SEAL-DEFAULT-EXPIRED - Default gate seal default expired
- GATE-SEAL-DEFAULT-WITHOUT-ROLE - Default gate seal without role
- GATE-SEAL-WITHOUT-PAUSE-ROLE - Gate seal without pause role
- GATE-SEAL-IS-EXPIRED - Gate seal is expired
- GATE-SEAL-IS-ABOUT-TO-BE-EXPIRED - Gate seal is about to be expired
- GATE-SEAL-IS-SEALED - Gate seal is sealed
- GATE-SEAL-NEW-ONE-CREATED - New gate seal created

### stETH-ops

stETH operations related alerts

**Alerts:**

- LOW-STAKING-LIMIT - Staking limit is below threshold
- HIGH-DEPOSITABLE-ETH - Too many ETH in the buffer
- BUFFERED-ETH-DRAIN - Buffer is being drained unexpectedly
- LOW-DEPOSIT-EXECUTOR-BALANCE - Deposit executor balance below threshold
- Alerts on the admin events in Lido DAO contracts

### Vaults

Vaults related alerts

**Alerts:**

- WITHDRAWAL-VAULT-BALANCE-CHANGE - Vault balance has changed
- WITHDRAWAL-VAULT-BALANCE-DRAIN - Vault balance is being drained unexpectedly
- EL-VAULT-BALANCE_CHANGE - EL vault balance has changed
- EL-VAULT-BALANCE-DRAIN - EL vault balance is being drained unexpectedly
- BURNER-SHARES-TRANSFER - Burner shares transfer

### Withdrawals

Withdrawals related alerts

**Alerts:**

- WITHDRAWALS-UNFINALIZED-QUEUE-AND-STAKE-LIMIT - Stake limit is drained and unfinalized queue is on par with drained stake limit
- WITHDRAWALS-BIG-UNFINALIZED-QUEUE - Unfinalized queue is too big
- WITHDRAWALS-LONG-UNFINALIZED-QUEUE - Unfinalized queue is too long
- WITHDRAWALS-UNCLAIMED-REQUESTS - Unclaimed requests are too many
- WITHDRAWALS-UNCLAIMED-REQUESTS-MORE-THAN-BALANCE - Unclaimed requests are more than withdrawal queue balance
- WITHDRAWALS-CLAIMED-AMOUNT-MORE-THAN-REQUESTED - Claimed amount is more than requested
- WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-BATCH - Withdrawal request batch is too big
- WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-AFTER-REBASE - Withdrawal request after rebase is too big
- WITHDRAWALS-BUNKER-ENABLED - Bunker is enabled
- WITHDRAWALS-BUNKER-DISABLED - Bunker is disabled

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
   } from "./constants";
   ```
   ##### After:
   ```typescript
   import type * as Constants from "./constants";
   const {
     NODE_OPERATORS_REGISTRY_ADDRESS,
     EASY_TRACK_ADDRESS,
     MOTION_ENACTED_EVENT,
     SIGNING_KEY_REMOVED_EVENT,
     NODE_OPERATOR_STAKING_LIMIT_SET_EVENT,
     NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE,
   } = requireWithTier<typeof Constants>(module, "./constants");
   ```
2. Copy `./constants.ts` file to `./constants.testnet.ts` and change the addresses and other vars to the testnet ones.
3. Edit `alerting-forta/<SUBMODULE>/forta.config.json` and set `jsonRpcUrl` to your Testnet JSON-RPC provider.
4. Run `export FORTA_AGENT_RUN_TIER=testnet && yarn start:dev`

That's it! Only sub-agents that have `testnet` tier support will be run.
