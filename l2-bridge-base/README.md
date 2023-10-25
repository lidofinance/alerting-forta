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
