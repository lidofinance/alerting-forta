# Lido Detection Bot for Rewards programs

## Supported chains

* Ethereum mainnet


## Alerts

* REWARD-PROGRAM-TOP-UP-MOTION-CREATED: EasyTrack Top Up Motion was created (INFO)
* REWARD-PROGRAM-TOP-UP-MOTION-ENACTED: EasyTrack Top Up Motion was enacted (INFO)

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



