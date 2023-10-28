# Local mode

To run forta bots in local mode you need to follow several steps:

- Build all required bot images
  - Navigate to the bot folder
  - Run `yarn install && yarn push`
  - Fill image section in `docker-compose` bot container part with imageId
- Configure and run [forta-discord](https://github.com/lidofinance/forta-discord) or do it through docker-compose by uncommenting the corresponding section
- Make sure you have properly set WH address. It will most likely look like `http://localhost:5001/hook/<your slug name>`
- Fill `forta.config.json` file with corresponding values (see example file)
- Run `docker-compose up -d`

If you want to add new bot (second, third and etc.), you need to add it to `docker-compose.yml` file and container name to `botContainers` section
