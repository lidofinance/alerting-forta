# Lido Detection Bot for base part of L2 bridge

## Supported chains

- base

## Sub-bots

### Bridge-watcher

Alerts about events on the L2-bridge (base side)

**Alerts:**

- Alerts on the admin events in L2-bridge (base side)

### Governance

Alerts about events on the gov-bridge (base side)

**Alerts:**

- Alerts on all events in gov-bridge (base side)

### Proxy-watcher

Alert on proxy state changes

**Alerts:**

- PROXY-UPGRADED - One of the proxies on the base side was upgraded
- PROXY-ADMIN-CHANGED - Admin for of the proxies on the base side was changed
- Alerts on the admin events in L2-bridge (Base side)

### Withdrawals

Alert on huge withdrawals

**Alerts:**

- HUGE-WITHDRAWALS-FROM-L2 - There were more than 10k wstETH withdrawal requests over the last 48h or less

## Development

cp `forta.config.example.json forta.config.json` and set `jsonRpcUrl` to your Base blockchain JSON-RPC provider. Install deps:

```
yarn install
```

Running in a live mode:

```
yarn start:dev
```

Testing on a specific block/range/transaction:

```
yarn block 5764029
yarn range '5764000..5764029'
yarn tx 0x5e7e3adcbe9645ca65703055bf3a5355225ee61eda0b24ebcad36f69869e7a01
```
