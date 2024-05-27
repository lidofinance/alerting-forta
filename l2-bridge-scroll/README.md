# Lido Detection Scroll Bot

How does it work.

The bot works on two networks: ETH mainnet and Scroll.
Here's how it operates: The bot monitors new blocks on the ETH mainnet.
Since Forta doesn't currently support Scroll, the bot reads blocks on the L2 network (Scroll) and stores the latest one
in an in-memory cache.
When the bot reads the next block on ETH, it also retrieves a segment of Scroll blocks (cachedBlock, latestBlock) from
the cache.

## Supported chains

- Ethereum mainnet, Scroll network

## Alerts

1. Bridge events
   1. 🚨🚨🚨 Scroll bridge balance mismatch 🚨🚨🚨
   2. 🚨 Scroll L2 Bridge: (re-)initialized
   3. 🚨 Scroll L2 Bridge: Deposits Disabled
   4. 🚨 Scroll: L2 gateway owner changed
   5. 🚨 Scroll L2 Bridge: Withdrawals Disabled
   6. ⚠️ Scroll L2 Bridge: Role granted
   7. ⚠️ Scroll L2 Bridge: Role revoked
   8. ℹ️ Scroll L2 Bridge: Deposits Enabled
   9. ℹ️ Scroll L2 Bridge: Withdrawals Enabled
2. Gov Events
   1. 🚨 Scroll Gov Bridge: Ethereum Governance Executor Updated
   2. 🚨 Scroll Gov Bridge: Guardian Updated
   3. ⚠️ Scroll Gov Bridge: Delay Updated
   4. ⚠️ Scroll Gov Bridge: Grace Period Updated
   5. ⚠️ Scroll Gov Bridge: Min Delay Updated
   6. ⚠️ Scroll Gov Bridge: Max Delay Updated
   7. ℹ️ Scroll Gov Bridge: Action set queued
   8. ℹ️ Scroll Gov Bridge: Action set executed
   9. ℹ️ Scroll Gov Bridge: Action set canceled
3. Proxy events
   1. 🚨 Scroll: Proxy admin changed
   2. 🚨 Scroll: Proxy implementation changed
   3. 🚨 Scroll: Proxy upgraded
   4. 🚨 Scroll: Proxy beacon upgraded
4. Monitor Withdrawals
   1. ⚠️ Scroll: Huge withdrawals during the last ...

## Development (Forta specific)

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
