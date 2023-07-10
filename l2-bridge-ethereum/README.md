# Lido Detection Bot for Ethereum part of L2 bridges

## Supported chains

- Ethereum:mainnet

## Sub-bots

### Bridge-watcher

Alerts about events on the L2-bridge (ethereum side)

**Alerts:**

- Alerts on the admin events in L1-bridge (ethereum side)

### Proxy-watcher

Alert on proxy state changes

**Alerts:**

- PROXY-UPGRADED - One of the proxies on the ethereum side was upgraded
- PROXY-ADMIN-CHANGED - Admin of the proxies on the ethereum side was changed
- Alerts on the admin events in L2-bridge (ethereum side)

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
