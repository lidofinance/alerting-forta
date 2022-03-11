# Lido Agent for Forta

## Supported chains

* Ethereum mainnet


## Alerts

General:

* LIDO-AGENT-LAUNCHED: Agent launched (INFO)
* LIDO-AGENT-ERROR: An error occured while initializing, handling tx or block (HIGH)

Lido Oracle:

* LIDO-ORACLE-REPORT: Lido oracles quorum reached (INFO)
* LIDO-ORACLE-OVERDUE: No Lido Oracle report within the expected timeframe (HIGH)
* LIDO-ORACLE-REWARDS-DECREASED: Lido staking rewards decreased compared to the previous report (MEDUIM)

Anchor/bETH integration:

* ANCHOR-REWARDS-OVERDUE: Anchor rewards sell overdue (MAJOR)
* ANCHOR-REWARDS-COLLECTED: Anchor rewards sold (INFO)


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



