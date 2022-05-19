# Lido Detection Bot for Forta

## Supported chains

* Ethereum mainnet


## Sub-bots

### AAVE

General alerts about health of the Lido to AAVE integration.

**Alerts:**

- ASTETH-BALANCE-AND-SUPPLY-DIFFERENCE - There is a difference between astETH balance and totalSupply
- STABLE-DEBT-STETH-SUPPLY - stableDebtStETH totalSupply is not 0
- VARIABLE-DEBT-STETH-SUPPLY - variableDebtStETH totalSupply is not 0
- HUGE-ASTETH-MINT-SINGLE-TX - Huge number of astETH minted in a single TX

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

### dwstETH

Alerts about huge mints of leveraged stETH debt on Euler

**Alerts:**

- HIGH-DWSTETH-MINTS-SUM - High amount of dwstETH minted in a short period
- HIGH-DWSTETH-MINT-SINGLE-TX - High amount of dwstETH minted in a single TX

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

### Pools-balances

Monitoring and alerting about balances of the main stETH LPs

**Alerts:**

- \[CURVE|BALANCER\]-POOL-IMBALANCE - Curve Pool is imbalanced
- \[CURVE|BALANCER\]-POOL-IMBALANCE-RAPID-CHANGE - Curve Pool rapid imbalance change
- \[CURVE|BALANCER|CURVE-WETH\]-POOL-SIZE-CHANGE - significant changes in pool size
- LOW-STETH-CURVE-PEG - stETH PEG in Curve pool is too low
- STETH-CURVE-PEG-DECREASE - stETH PEG in Curve pool decreased below safe threshold

### Pools-rewards

Monitoring and alerting about rewards for the main stETH LPs

**Alerts:**

- LDO-\[CURVE|BALANCER\]-REWARDS-PROLONGED - Rewards for the pool prolonged
- LDO-\[CURVE|BALANCER\]-REWARDS-STILL-NOT-PROLONGED - Period is about to end but rewards not prolonged
- LDO-\[CURVE|BALANCER\]-REWARDS-EXPIRED-NO-LDO - Rewards period expired but no LDO left for the new period
- LDO-\[CURVE|BALANCER\]-REWARDS-EXPIRATION - Rewards will expire soon

### Proxy-watcher

Alerting for the proxy implementation changes

**Alerts:**

- PROXY-IMPL-CHANGED - Implementation of one of the Lido proxies has changed


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



