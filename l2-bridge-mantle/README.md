# Lido Detection Mantle Bot

How does it work.

This PR introduces a new bot operating on the Mantle network.
The existing bot functions on two networks: ETH mainnet and Mantle.
Here's how it operates: The bot monitors new blocks on the ETH mainnet.
Since Forta doesn't currently support Mantle, the bot reads blocks on the L2 network (Mantle) and stores the latest one
in an in-memory cache.
When the bot reads the next block on ETH, it also retrieves a segment of Mantle blocks (cachedBlock, LatestBlock) from
the cache.

## Supported chains

- Ethereum mainnet, Mantle network

## Alerts

1. Bridge events
   1. 🚨 Mantle L2 Bridge: Role Admin changed
   2. ⚠️ Mantle L2 Bridge: Role granted
   3. ⚠️ Mantle L2 Bridge: Role revoked
   4. ✅ Mantle L2 Bridge: Deposits Enabled
   5. ❌ Mantle L2 Bridge: Deposits Disabled
   6. ✅ Mantle L2 Bridge: Withdrawals Enabled
   7. ❌ Mantle L2 Bridge: Withdrawals Disabled
   8. 🚨 Mantle L2 Bridge: Implementation initialized
2. Gov Events
   1. 🚨 Mantle Gov Bridge: Ethereum Governance Executor Updated
   2. 🚨 Mantle Gov Bridge: Guardian Updated
   3. ⚠️ Mantle Gov Bridge: Delay Updated
   4. ⚠️ Mantle Gov Bridge: Grace Period Updated
   5. ⚠️ Mantle Gov Bridge: Min Delay Updated
   6. ⚠️ Mantle Gov Bridge: Max Delay Updated
   7. ℹ Mantle Gov Bridge: Action set queued
   8. ℹ Mantle Gov Bridge: Action set executed
   9. ℹ Mantle Gov Bridge: Action set canceled
3. Proxy events
   1. 🚨 Mantle: Proxy ossified
   2. 🚨 Mantle: Proxy admin changed
   3. 🚨 Mantle: Proxy upgraded
   4. 🚨 Mantle: Proxy beacon upgraded
4. Monitor Withdrawals
   1. ⚠️ Mantle: Huge withdrawals during the last ...
5. Agent balance
   1. Added wstETH: 🚨🚨🚨 Mantle bridge balance mismatch 🚨🚨🚨

## How to setup new bot and network

1. Find out a repository which contains WstETH information. For current project it's
   1. https://www.notion.so/wstETH-on-Mantle-Deployment-Verification-08a1e257034b4ed9b6f5de1ef5293399
   2. https://github.com/mantlenetworkio/lido-l2
   3. Get Proofs of addreses and constants got from https://docs.lido.fi/deployed-contracts/:
      1. L1ERC20TokenBridge
         Impl : [0x6fBBe1Af52D22557D7F161Dc5952E306F4742e23](https://etherscan.io/address/0x2D001d79E5aF5F65a939781FE228B267a8Ed468B)
      2. L1ERC20TokenBridge
         Proxy: [0x2D001d79E5aF5F65a939781FE228B267a8Ed468B](https://etherscan.io/address/0x6fBBe1Af52D22557D7F161Dc5952E306F4742e23)
      3. ERC20Bridged
         Impl: [0x1FaBaAec88198291A4efCc85Cabb33a3785165ba](https://explorer.mantle.xyz/address/0x1FaBaAec88198291A4efCc85Cabb33a3785165ba)
      4. ERC20Bridged
         Proxy: [0x458ed78EB972a369799fb278c0243b25e5242A83](https://explorer.mantle.xyz/address/0x458ed78EB972a369799fb278c0243b25e5242A83)
      5. L2ERC20TokenBridge
         Impl: [0xf10A7ffC613a9b23Abc36167925A375bf5986181](https://explorer.mantle.xyz/address/0xf10A7ffC613a9b23Abc36167925A375bf5986181)
      6. L2ERC20TokenBridge
         Proxy: [0x9c46560D6209743968cC24150893631A39AfDe4d](https://explorer.mantle.xyz/address/0x9c46560D6209743968cC24150893631A39AfDe4d)
      7. OptimismBridgeExecutor: [0x3a7b055bf88cdc59d20d0245809c6e6b3c5819dd](https://explorer.mantle.xyz/address/0x3a7b055bf88cdc59d20d0245809c6e6b3c5819dd)
2. Clone https://github.com/mantlenetworkio/lido-l2 repository and compile contracts.
   1. Then copy and past needed abi's into ./abi folder in current repo
3. `yarn install`
4. `yarn generate-types` Install abi bindings though typechain. Generated files place in ./src/generated
5. Set up correct contract addresses.
6. Provide l2 rpc url. In most cases FORTA-SDK does not support it. For checking it go
   to https://app.forta.network/network, please.
   1. Go to ./src/config and change rpc. Also, you have to encode url into base64 format
7. On current stage you have to fix all TS syntax errors
8. Go to ./src/utils/constants.ts and provide address to new Network. In our case - Mantle.
   1. Change GOV_BRIDGE_ADDRESS
   2. Change L2_ERC20_TOKEN_GATEWAY_ADDRESS
   3. Change \*\_WST_ETH_BRIDGED_ADDRESS
   4. Consider that WithdrawalInitiated is set up - correct.
      1. For this go to ./src/abi, find WithdrawalInitiated and compare event abi. Must be the same.
   5. Check address roles. In most case they're same because the source of truth place on ETH mainnet.
9. Go to ./utils/events/\*
   1. bridge_events.ts
      1. Replace all network name to your-network name
      2. Check event signatures
   2. gov_events.ts
      1. Replace all network name to your-network name
      2. Check event signatures
   3. proxy_admin_events.ts
      1. Replace all network name to your-network name
      2. Check event signatures
10. Go to ./src/workers and replace all network name to your-network name
11. Add new folder to .github/CODEOWNERS file
12. Finish. Type yarn run in your CLI

## Update l2-bridge-balance bot

1. Go to ./l2-bridge-balance/config/bot-config.json and provide your RPC network URL.
2. Go to l2-bridge-balance/src/constants.ts
   1. Add to BRIDGE_PARAMS_WSTETH obj your network by analogy with other networks
   2. In case network has LDO, also update BRIDGE_PARAMS_LDO obj
3. Inside l2-bridge-balance/src/agent-balance.ts::handleBlock add call handleBridgeBalanceWstETH and
   handleBridgeBalanceLDO with new network
4. Finish. `yarn run start`

## Development (Forta specific)

Edit `alerting-forta/<SUBMODULE>/forta.config.json` and set `jsonRpcUrl` to your JSON-RPC provider. Install deps:

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
