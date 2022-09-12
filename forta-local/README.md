# Local mode

To run forta bots in local mode you need to follow several steps:

- Build all required bot images
  - Navigate to the bot folder
  - Run `yarn install && yarn push`
  - Save imageId
- Configure and run [forta-discord](https://github.com/lidofinance/forta-discord)
- Install and configure [forta client](https://docs.forta.network/en/latest/scanner-local-mode/). There are several things that differ from the original guide:
  - Make sure you have properly set WH address. It will most likely look like `http://localhost:5001/hook/<your slug name>`
  - To avoid `forta client` from failing due to lack of the trace RPC. Add replace content of the `trace:` block in the config with `enabled: false`. And set `chainId: <random number differing from 1>`
  - See `config.yml.example` for the reference
- Run `forta client` with `forta run --passphrase=<secret passed to init>`
