# Lido on Polygon Detection Bot for Forta

## Supported chains

- Ethereum mainnet

## Sub-bots

### DAO-OPS

DAO operations related alerts

**Alerts:**

- \[HUGE|HIGH\]-BUFFERED-MATIC - Too many MATIC in the buffer
- STMATIC-REWARDS-DISTRIBUTION-DELAY - stMATIC rewards distribution delay (more than 24h)
- STMATIC-CHEKPOINT-REWARD-UPDATE - Protocol checkpoint reward changed
- INVALID-PROXY-ADMIN-OWNER - Invalid proxy admin owner
- INVALID-PROXY-ADMIN-ADDR - Invalid proxy admin address
- LOW-DEPOSIT-EXECUTOR-BALANCE - Low balance of depositor bot
- STMATIC-REWARDS-DECREASED - Decrease in stMATIC rewards
- PROXY-ADMIN-OWNER-CHANGE - Proxy admin address changed
- Alerts on the admin events in Lido on Polygon contracts

### Node-operators

Node Operators related alerts

**Alerts:**

- NO-ACTIVE-NODE-OPERATORS-POLYGON - No Active Node Operators
- BAD-OPERATOR-STATUS-POLYGON - There are operators with the bad state
- BAD-OPERATOR-NFT-OWNER-POLYGON - Bad Node Operator proxy NFT owner

### Withdrawals-monitoring

Withdrawals monitoring

**Alerts:**

- HUGE-WITHDRAWALS-REQUESTS-MATIC - Huge withdrawals during last {period}

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
