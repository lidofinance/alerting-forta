# Lido Detection Mantle Bot

How does it work.

The bot works on two networks: ETH mainnet and Mantle.
Here's how it operates: The bot monitors new blocks on the ETH mainnet.
Since Forta doesn't currently support Mantle, the bot reads blocks on the L2 network (Mantle) and stores the latest one
in an in-memory cache.
When the bot reads the next block on ETH, it also retrieves a segment of Mantle blocks (cachedBlock, LatestBlock) from
the cache.

## Supported chains

- Ethereum mainnet, Mantle network

## Alerts

1. StETH operations
    1. 🚨🚨🚨 Buffered ETH drain
    2. 🚨 Huge depositable ETH amount
    3. ⚠️ High depositable ETH amount
    4. ⚠️ Low deposit executor balance
    5. ⚠️ Staking limit below 10%
    6. 📉 Staking limit below 30%

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
