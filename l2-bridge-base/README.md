# Lido Detection Bot for base part of L2 bridge

## Supported chains

- Ethereum mainnet, Base network

## Alerts

1. Bridge events
   1. 🚨 Base L2 Bridge: Role Admin changed
   2. 🚨 Base L2 Bridge: Withdrawals Disabled
   3. 🚨 Base L2 Bridge: Implementation initialized
   4. 🚨 Base L2 Bridge: Deposits Disabled
   5. ⚠️ Base L2 Bridge: Role granted
   6. ⚠️ Base L2 Bridge: Role revoked
   7. ℹ️ Base L2 Bridge: Deposits Enabled
   8. ℹ️ Base L2 Bridge: Withdrawals Enabled
2. Gov Events
   1. 🚨 Base Gov Bridge: Ethereum Governance Executor Updated
   2. 🚨 Base Gov Bridge: Guardian Updated
   3. ⚠️ Base Gov Bridge: Delay Updated
   4. ⚠️ Base Gov Bridge: Grace Period Updated
   5. ⚠️ Base Gov Bridge: Min Delay Updated
   6. ⚠️ Base Gov Bridge: Max Delay Updated
   7. ℹ️ Base Gov Bridge: Action set queued
   8. ℹ️ Base Gov Bridge: Action set executed
   9. ℹ️ Base Gov Bridge: Action set canceled
3. Proxy events
   1. 🚨 Base: Proxy admin changed
   2. 🚨 Base: Proxy upgraded
   3. 🚨 Base: Proxy beacon upgraded
   4. 🚨 Base: Proxy ossified
4. Monitor Withdrawals
   1. ⚠️ Base: Huge withdrawals during the last ...

## Development

cp `forta.config.example.json forta.config.json` and set `jsonRpcUrl` to your Base blockchain JSON-RPC provider. Install deps:

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
