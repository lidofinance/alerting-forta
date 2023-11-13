# Lido Detection Bot for zkSync part of L2 bridge

## Supported chains

- zkSync Era (chain id: 324)
- Eth mainnet (chain id: 1)

## Sub-bots

### Bridge-watcher alerts

Alerts about events on the L2-bridge (zkSync side)

- 🚨 ZkSync L2 Bridge: Role Admin changed
- ⚠️ ZkSync L2 Bridge: Role granted
- ⚠️ ZkSync L2 Bridge: Role revoked
- ✅ ZkSync L2 Bridge: Deposits Enabled
- ❌ ZkSync L2 Bridge: Deposits Disabled
- ✅ ZkSync L2 Bridge: Withdrawals Enabled
- ❌ ZkSync L2 Bridge: Withdrawals Disabled
- 🚨 ZkSync L2 Bridge: Implementation initialized

### Governance alerts

Alerts about events on the gov-bridge (zkSync side)

- 🚨 ZkSync Gov Bridge: Ethereum Governance Executor Updated
- 🚨 ZkSync Gov Bridge: Guardian Updated
- ⚠️ ZkSync Gov Bridge: Delay Updated
- ⚠️ ZkSync Gov Bridge: Grace Period Updated
- ⚠️ ZkSync Gov Bridge: Min Delay Updated
- ⚠️ ZkSync Gov Bridge: Max Delay Updated
- ℹ ZkSync Gov Bridge: Action set queued
- ℹ ZkSync Gov Bridge: Action set executed
- ℹ ZkSync Gov Bridge: Action set canceled

### Proxy-watcher alerts

Alert on proxy state changes:

- 🚨 ZkSync: Proxy ossified
- 🚨 ZkSync: Proxy admin changed
- 🚨 ZkSync: Proxy upgraded
- 🚨 ZkSync: Proxy beacon upgraded
- 🚨 ZkSync L2 Bridge: Role Admin changed
- ⚠️ ZkSync L2 Bridge: Role granted
- ⚠️ ZkSync L2 Bridge: Role revoked
- ✅ ZkSync L2 Bridge: Deposits Enabled
- ❌ ZkSync L2 Bridge: Deposits Disable
- ✅ ZkSync L2 Bridge: Withdrawals Enabled
- ❌ ZkSync L2 Bridge: Withdrawals Disabled
- 🚨 ZkSync L2 Bridge: Implementation initialize

### Withdrawals alerts

Alert on huge withdrawals

- ⚠️ ZkSync: Huge withdrawals during the last ...

## Development

cp `forta.config.example.json forta.config.json` and set `jsonRpcUrl` to your zkSync blockchain JSON-RPC provider. Install deps:

```
yarn install
```

Running in a live mode:

```
yarn start:dev
```

Testing on a specific block/range/transaction:

```
yarn block 5764029
yarn range '5764000..5764029'
yarn tx 0x5e7e3adcbe9645ca65703055bf3a5355225ee61eda0b24ebcad36f69869e7a01
```
