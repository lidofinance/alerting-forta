# Lido Detection Bot for zkSync part of L2 bridge

## Supported chains

- zkSync Era (chain id: 324)
- Eth mainnet (chain id: 1)

1. Governance alerts
   1. 🚨 ZkSync Gov Bridge: Ethereum Governance Executor Updated
   2. 🚨 ZkSync Gov Bridge: Guardian Updated
   3. ⚠️ ZkSync Gov Bridge: Delay Updated
   4. ⚠️ ZkSync Gov Bridge: Grace Period Updated
   5. ⚠️ ZkSync Gov Bridge: Min Delay Updated
   6. ⚠️ ZkSync Gov Bridge: Max Delay Updated
   7. ℹ️ ZkSync Gov Bridge: Action set queued
   8. ℹ️ ZkSync Gov Bridge: Action set executed
   9. ℹ️ ZkSync Gov Bridge: Action set canceled
2. Proxy events
   1. 🚨 ZkSync: Proxy admin changed
   2. 🚨 ZkSync: Proxy upgraded
   3. 🚨 ZkSync: Proxy beacon upgraded
   4. 🚨 ZkSync: Proxy owner transferred
3. Bridge Events
   1. 🚨🚨🚨 ZkSync bridge balance mismatch 🚨🚨🚨
   2. 🚨 ZkSync L2 Bridge: Role Admin changed
   3. 🚨 ZkSync L2 Bridge: Withdrawals Disabled
   4. 🚨 ZkSync L2 Bridge: Implementation initialized
   5. 🚨 ZkSync L2 Bridge: Deposits Disabled
   6. ⚠️ ZkSync L2 Bridge: Role granted
   7. ⚠️ ZkSync L2 Bridge: Role revoked
   8. ℹ️ ZkSync L2 Bridge: Deposits Enabled
   9. ℹ️ ZkSync L2 Bridge: Withdrawals Enabled
4. Withdrawals alerts
   1. ⚠️ ZkSync: Huge withdrawals during the last ...

## Development

cp `forta.config.example.json forta.config.json` and set `jsonRpcUrl` to your zkSync blockchain JSON-RPC provider.
Install deps:

```
yarn install
```

Running in a live mode:

```
yarn start
```
