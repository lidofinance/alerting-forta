# Lido Detection bots for Forta

## Bots list

[ethereum-operations](./ethereum-operations) - Lido Detection bot fot stETH protocol operations

[ethereum-financial](./ethereum-financial) - Lido Detection bot fot stETH protocol finance activity

[ethereum-huge-tx](./ethereum-huge-tx) - Lido Detection bot fot huge tx of the Lido tokens of interest detection

[lido-on-polygon](./lido-on-polygon) - Lido Detection bot for stMATIC protocol (should be launched against Ethereum
mainnet)

[polygon](./polygon) - Detection bot for Lido Apps on the Polygon network (should be launched against Polygon mainnet)

[arbitrum](./arbitrum) - Detection bot for Lido Apps on the Arbitrum network (should be launched against Arbitrum
mainnet)

[l2-bridge-arbitrum](./l2-bridge-arbitrum) - Detection bot for Arbitrum part of L2 bridge

[l2-bridge-balance](./l2-bridge-balance) - Detection bot for L2 bridges balances

[l2-bridge-base](./l2-bridge-base) - Detection bot for Base part of L2 bridge

[l2-bridge-ethereum](./l2-bridge-ethereum) - Detection bot for Ethereum part of L2 bridges

[l2-bridge-mantle](./l2-bridge-mantle) - Detection bot for Mantle part of L2 bridges

[l2-bridge-optimism](./l2-bridge-optimism) - Detection bot for Optimism part of L2 bridge

[l2-bridge-zkSync](./l2-bridge-zksync) - Detection bot for ZkSync part of L2 bridge

[phishing-detect](./phishing-detect) - Phishing detection bot for the Lido ERC20 tokens

[multisig-watcher](./multisig-watcher) - Multisig events detector bot

[voting-watcher](./voting-watcher) - Lido bot for watching votes

[storage-watcher](./storage-watcher) - Detection bot that monitors critical storage changes

[reverted-tx-watcher](./reverted-tx-watcher) - Detection bot that monitors reverted transactions

[template](./template) - Template for bot creation. (Forta version)

[template-v2](./template-v2) - Template for bot creation. (Sergey Wh1te's version)

## Contribute

See bots README plus
How to setup l2 bot. Please, check it [L2_BOT](L2_BOT.md)

### We use prettier and eslint

Everything you need to do involves a few steps.
Add the following scripts to your package.json:

- Add dependencies like devDependencies:

```json
{
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.12.0",
    "@typescript-eslint/parser": "^6.12.0",
    "eslint": "^8.54.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-jest": "^27.6.0",
    "eslint-plugin-prettier": "^5.0.1",
    "prettier": "^3.1.0"
  }
}
```

```json
{
  "scripts": {
    "eslint:lint": "eslint ./src",
    "eslint:format": "eslint ./src --fix",
    "prettier:check": "prettier --check .",
    "prettier:format": "prettier --write .",
    "lint": "yarn run prettier:check && yarn run eslint:lint",
    "format": "yarn run eslint:format && yarn run prettier:format"
  }
}
```

touch .eslintrc.json and past settings for eslint. This will allow to use eslint and prettier together.

```
{
  "parser": "@typescript-eslint/parser",
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  "plugins": ["@typescript-eslint", "prettier"],
  "env": {
    "node": true,
    "es6": true
  },
  "rules": {
    "prettier/prettier": "error",
    "curly": "error"
  }
}
```

And finally:

```bash
yarn install
yarn format
```
