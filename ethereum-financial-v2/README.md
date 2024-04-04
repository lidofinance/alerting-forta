# # Lido Financial Detection Bot for Forta

## Supported chains

- Ethereum mainnet

## Alerts

1. Aave operations
   1. HandleBlock
      1. 🚨🚨🚨 astETH balance - astETH totalSupply >= 1ETH
      2. 🚨🚨🚨 stableDebtStETH totalSupply is not 0
      3. 🚨🚨🚨 variableDebtStETH totalSupply is not 0
2. Pool balances
   1. HandleBlock
      1. 🚨 Super low stETH:ETH price on Curve
      2. 🚨 Super low stETH:ETH price on Chainlink
      3. 🚨 Curve Pool rapid imbalance change
      4. 🚨️ Significant Curve Pool size change
      5. ⚠️ Significant Curve Pool size change
      6. ⚠️ Curve Pool is imbalanced
      7. ⚠️ stETH:ETH price on Curve decreased
      8. ⚠️ stETH:ETH price on Chainlink decreased
