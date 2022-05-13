# Lido Detection Bot for Forta

## Supported chains

* Ethereum mainnet


## Sub-bots

### AAVE

General alerts about health of the Lido to AAVE integration.

**Alerts:**

- ASTETH-BALANCE-AND-SUPPLY-DIFFERENCE - There is a difference between astETH balance and totalSupply
- STABLE-DEBT-STETH-SUPPLY - stableDebtStETH totalSupply is not 0
- VARIABLE-DEBT-STETH-SUPPLY - variableDebtStETH totalSupply is not 0
- HUGE-ASTETH-MINT-SINGLE-TX - Huge number of astETH minted in a single TX

### Aragon-voting

Alerts on the Aragon votings

**Alerts:**

- ARAGON-VOTE-OUTCOME-CHANGED - Expected vote outcome has changed close to the voting end

### DAO-OPS

DAO operations related alerts

**Alerts:**

- LOW-OPERATORS-AVAILABLE-KEYS-NUM - Few available keys left
- HUGE-BUFFERED-ETH - Too many ETH in the buffer
- LOW-DEPOSIT-EXECUTOR-BALANCE - Deposit executor balance below threshold
- Alerts on the admin events in Lido DAO contracts

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



