# Lido Detection Bot for Arbitrum part of L2 bridge

## Supported chains

- Arbitrum

## Sub-bots

### Bridge-watcher

Alerts about events on the L2-bridge (Arbitrum side)

**Alerts:**

- Alerts on the admin events in L2-bridge (Arbitrum side)

### Governance

Alerts about events on the gov-bridge (Arbitrum side)

**Alerts:**

- Alerts on all events in gov-bridge (Arbitrum side)

### Proxy-watcher

Alert on proxy state changes

**Alerts:**

- PROXY-UPGRADED - One of the proxies on the Arbitrum side was upgraded
- PROXY-ADMIN-CHANGED - Admin of the proxies on the Arbitrum side was changed
- Alerts on the admin events in L2-bridge (Arbitrum side)

### Withdrawals

Alert on huge withdrawals

**Alerts:**

- HUGE-WITHDRAWALS-FROM-L2 - There were more than 10k wstETH withdrawal requests over the last 48h or less

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
