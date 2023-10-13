# Lido Detection Bot for Forta

## Supported chains

- Ethereum mainnet
- Ethereum Goerli testnet (dev)

## Sub-bots

### ACL-changes

General alerts about Aragon ACL changes.

**Alerts:**

- ARAGON-ACL-PERMISSION-CHANGED - Aragon ACl permission granted / revoked
- ARAGON-ACL-PERMISSION-MANAGER-CHANGED - Aragon ACl permission manager changed

### Aragon-voting

Alerts on the Aragon votings

**Alerts:**

- ARAGON-VOTE-OUTCOME-CHANGED - Expected vote outcome has changed close to the voting end
- Aragon votes common lifecycle alerts

### Easy-track

Notifications about EasyTrack events

**Alerts:**

- Alerts on the events in EasyTrack contracts

### Ens-names

Alerts on the ENS names

**Alerts:**
ENS-RENT-EXPIRES - ENS name rent expires soon

### Proxy-watcher

Alerting for the proxy implementation changes

**Alerts:**

- PROXY-IMPL-CHANGED - Implementation of one of the Lido proxies has changed

### TRP-changes

Alerting for the TRP changes events

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
