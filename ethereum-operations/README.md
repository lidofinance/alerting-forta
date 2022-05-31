# Lido Detection Bot for Forta

## Supported chains

- Ethereum mainnet

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

### DAO-OPS

DAO operations related alerts

**Alerts:**

- LOW-OPERATORS-AVAILABLE-KEYS-NUM - Few available keys left
- HUGE-BUFFERED-ETH - Too many ETH in the buffer
- LOW-DEPOSIT-EXECUTOR-BALANCE - Deposit executor balance below threshold
- Alerts on the admin events in Lido DAO contracts

### Easy-track

Notifications about EasyTrack events

**Alerts:**

- Alerts on the events in EasyTrack contracts

### Lido-oracle

ETH2 Oracles monitoring

**Alerts:**

- SLOPPY-LIDO-ORACLE - Detect oracles than has not participated in quorum for a long time
- LIDO-ORACLE-OVERDUE - Delay in Oracles report
- LIDO-ORACLE-LOW-BALANCE - Low balance of the Lido Oracle
- LIDO-ORACLE-REPORT - Details about the latest oracle report
- LIDO-ORACLE-REWARDS-DECREASED - Beacon chain rewards decreased compared to the previous period
- Alerts on the admin events in Lido Oracle contract

### Proxy-watcher

Alerting for the proxy implementation changes

**Alerts:**

- PROXY-IMPL-CHANGED - Implementation of one of the Lido proxies has changed

### Node Operators Registry

Alerting for the Node Operators Registry events

**Alerts:**

- NODE-OPERATORS-KEYS-REMOVED - Operators keys removed
- NODE-OPERATORS-STAKING-LIMIT-SET - Node Operator staking limit set by non-EasyTrack motion
- Alerts on the events in Node Operators Registry contract

## Development

Edit `~/.forta/forta.config.json` and set `jsonRpcUrl` to your JSON-RPC provider. Install deps:

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
