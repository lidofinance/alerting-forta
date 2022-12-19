# Lido Voting Watcher Bot

## Supported chains

- Ethereum mainnet

## Alerts

- VOTE-STATE-CHANGED - when vote state is changed
- HUGE-VOTES - when huge portion of the tokens voted
- VOTE-PING - when it is time to remind about voting

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
