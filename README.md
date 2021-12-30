# Root updater [![Build Status](https://github.com/tornadocash/tornado-root-updater/workflows/build/badge.svg)](https://github.com/tornadocash/tornado-root-updater/actions) [![Docker Image Version (latest semver)](https://img.shields.io/docker/v/tornadocash/tornado-root-updater?logo=docker&logoColor=%23FFFFFF&sort=semver)](https://hub.docker.com/repository/docker/tornadocash/tornado-root-updater)

For Tornado Cash to enable mining, it needs more metadata than is currently available: it needs to know the block number for each Tornado Cash deposit and withdrawal. Since the current version of Tornado cash is immutable the mining system uses a special proxy to collect this data. When users make deposits and withdrawal all necessary data is recorded to the [proxy](https://github.com/tornadocash/tornado-anonymity-mining/blob/master/contracts/TornadoProxy.sol) contract. In order to be used in zkSnark proof, this data should be added to the special Merkle trees (deposits Merkle tree and withdrawals Merkle tree). So long as someone out there does this, the system works smoothly and trustlessly.

This software helps to upload deposit and withdrawal metadata from Tornado Cash anonymity mining [proxy](https://github.com/tornadocash/tornado-anonymity-mining/blob/master/contracts/TornadoProxy.sol) into the [TornadoTrees](https://github.com/tornadocash/tornado-anonymity-mining/blob/master/contracts/TornadoTrees.sol) contract that handles the Merkle trees.

Keep in mind, it could cost some ether to do so.

## Usage for development

```shell script
brew install redis
redis-server

yarn
cp .env.example .env
vi .env
# download and unzip snark keys from https://tornado-trees-circuit.s3-eu-west-1.amazonaws.com/tornado-trees-circuit.tar.gz to `snarks` directory
yarn start
```

Caches events from both mining and tornado cash instances

## Update cached events

```shell script
yarn
cp .env.example .env
vi .env

yarn update:cache

docker build . -t tornadocash/tornado-root-updater:server
docker compose up -d
```
