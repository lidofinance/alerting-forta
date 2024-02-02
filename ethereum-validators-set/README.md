# Lido Detection Bot for Forta

## Supported chains

- Ethereum mainnet
- Ethereum Goerli testnet (dev)
- Ethereum Holesky testnet (dev)

## Sub-bots

### Accounting-oracle

Alerting for the Accounting Oracle events

**Alerts:**

- ACCOUNTING-ORACLE-MEMBER-LOW-BALANCE - Member balance is low
- ACCOUNTING-ORACLE-REPORT-RECEIVED-ALTERNATIVE-HASH - Report received with alternative hash
- SLOPPY-ACCOUNTING-ORACLE-MEMBER - Member is sloppy
- SLOPPY-ACCOUNTING-ORACLE-FASTLANE-MEMBER - Fastlane member is sloppy
- ACCOUNTING-ORACLE-MAIN-DATA-OVERDUE - Main data is overdue
- ACCOUNTING-ORACLE-EXTRA-DATA-OVERDUE - Extra data is overdue

### Exitbus-oracle

Alerting for the Exitbus Oracle events

**Alerts:**

- EXITBUS-ORACLE-MEMBER-LOW-BALANCE - Member balance is low
- EXITBUS-ORACLE-REPORT-RECEIVED-ALTERNATIVE-HASH - Report received with alternative hash
- SLOPPY-EXITBUS-ORACLE-MEMBER - Member is sloppy
- SLOPPY-EXITBUS-ORACLE-FASTLANE-MEMBER - Fastlane member is sloppy
- EXITBUS-ORACLE-EXIT-REQUESTS-DIGEST - Exit requests digest
- EXITBUS-ORACLE-HUGE-EXIT-REQUESTS - Huge exit requests
- EXITBUS-ORACLE-OVERDUE - Report is overdue
- EXITBUS-ORACLE-NO-EXIT-REQUESTS-WHEN-HUGE-QUEUE - No exit requests when huge queue
- EXITBUS-ORACLE-TOO-LOW-BUFFER-SIZE - Too low buffer size

### Lido-report

Alerting for the Lido Report events

**Alerts:**

- LIDO-EL-REWARDS-VAULT-OVERFILLED - Rewards vault overfilled
- LIDO-WITHDRAWALS-VAULT-OVERFILLED - Withdrawals vault overfilled
- LIDO-BURNER-UNBURNT-OVERFILLED - Burner unburnt overfilled
- LIDO-REPORT-EXITED-STUCK-REFUNDED-KEYS-DIGEST - Exited stuck refunded keys digest
- LIDO-REPORT-REBASE-DIGEST - Rebase digest
- LIDO-UNUSUAL-REPORT-APR-STATS - Unusual report APR stats
- LIDO-REPORT-CL-REWARDS-DECREASED - CL rewards decreased

### Node-operators-registry

Alerting for the Node Operators Registry events

**Alerts:**

- NODE-OPERATORS-BIG-EXIT - Big exit
- NODE-OPERATORS-ALL-STUCK-EXITED - All stuck exited
- NODE-OPERATORS-NEW-STUCK-KEYS - New stuck keys
- NODE-OPERATORS-ALL-STUCK-REFUNDED - All stuck refunded
- NODE-OPERATORS-KEYS-REMOVED - Keys removed
- NODE-OPERATORS-VETTED-KEYS-SET - Vetted keys set
- NODE-OPERATORS-STUCK-PENALTY-ENDED - Stuck penalty ended

### Oracle-daemon-config

Alerting for the Oracle Daemon Config events

### Sanity-checker

Alerting for the Sanity Checker events

**Alerts:**

- ORACLE-REPORT-SANITY-CHECKER-LIMITS-CHANGED - Oracle report sanity checker limits changed

### Set-ops

DAO operations related alerts

**Alerts:**

- LOW-OPERATORS-AVAILABLE-KEYS-NUM - Few available keys left
- MEV-LOW-RELAY-COUNT - Low relay count

### Staking-router

Alerting for the Staking Router events

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
4. Change `chainId` in `package.json`.
5. Run `export FORTA_AGENT_RUN_TIER=testnet && yarn start:dev`

That's it! Only sub-agents that have `testnet` tier support will be run.

# Deployment

## Prepare configuration

First of all, the private key with passphrase of the wallet (usually it's Metamask) must be received from the application owners. The wallet will be used to sign into https://app.forta.network/bots as well as deploying bots.

Then, prepare `forta.config.json` in the root of the agent based on the following format:

```json
{
  "jsonRpcUrl": "<jsonRpcUrl>",
  "keyfilePassword": "<passphrase from the wallet>",
  "agentId": "0x399792adf7b57c0adc8de54ee27284d8ef70b0af2ff3c2c97f69ae894f66759a"
}
```

Beside that, place into `~/.forta` directory the private key with name: `UTC--2024-01-31T01:37:55.270Z--123.json`

## Build docker image and push it into IPFS

1. `yarn push`, write the docker image id down
2. Open `My Detection Bots` section with [the list of bots](https://app.forta.network/profile/0x6aea36C4a9Cf8AC053c07E662fa27e8BDF047121/bots)
3. Find `lido-validator-set-alerts` item in the list of bots, click `Edit` and paste the new docker image id
4. Sign the new changes and wait for updating completion
5. Enjoy!
