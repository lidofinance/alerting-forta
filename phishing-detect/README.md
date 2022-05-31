# Lido Detection Bot for Phishing detection

## Supported chains

- Ethereum mainnet

## Alerts

- HIGH-ERC20-APPROVALS: Many approvals of single Lido ERC20 token to single non WL address
- HIGH-ERC20-TOKENS: Many approvals of the different Lido ERC20 tokens to single non WL address

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
