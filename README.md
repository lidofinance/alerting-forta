# Lido Detection bots for Forta

## Bots list

[ethereum-operations](./ethereum-operations) - Lido Detection bot for stETH protocol operations

[ethereum-financial](./ethereum-financial) - Lido Detection bot for stETH protocol finance activity

[ethereum-huge-tx](./ethereum-huge-tx) - Lido Detection bot for huge tx of the Lido tokens of interest detection

[lido-on-polygon](./lido-on-polygon) - Lido Detection bot for stMATIC protocol (should be launched against Ethereum mainnet)

[polygon](./polygon) - Detection bot for Lido Apps on the Polygon network (should be launched against Polygon mainnet)

[arbitrum](./arbitrum) - Detection bot for Lido Apps on the Arbitrum network (should be launched against Arbitrum mainnet)

[l2-bridge-arbitrum](./l2-bridge-arbitrum) - Detection bot for Arbitrum part of L2 bridge

[l2-bridge-balance](./l2-bridge-balance) - Detection bot for L2 bridges balances

[l2-bridge-ethereum](./l2-bridge-ethereum) - Detection bot for Ethereum part of L2 bridges

[l2-bridge-optimism](./l2-bridge-optimism) - Detection bot for Optimism part of L2 bridge

[phishing-detect](./phishing-detect) - Phishing detection bot for the Lido ERC20 tokens

[multisig-watcher](./multisig-watcher) - Multisig events detector bot

[voting-watcher](./voting-watcher) - Lido bot for watching votes

[storage-watcher](./storage-watcher) - Detection bot that monitors critical storage changes

[reverted-tx-watcher](./reverted-tx-watcher) - Detection bot that monitors critical storage changes

[template](./template) - Template for bot creation

## Contribute

See bots README plus

### We use prettier

From the repository root run

```
npm install prettier
npx prettier --check .
```

in case of \[warn\]s run:

```
npx prettier --write .
```

and commit changes
