# Root updater [![Build Status](https://github.com/tornadocash/root-updater/workflows/build/badge.svg)](https://github.com/tornadocash/root-updater/actions) [![Docker Image Version (latest semver)](https://img.shields.io/docker/v/tornadocash/root-updater?logo=docker&logoColor=%23FFFFFF&sort=semver)](https://hub.docker.com/repository/docker/tornadocash/root-updater)

Uploads deposit and withdrawal events from tornado instances into merkle tree

## Usage with docker

```shell script
wget https://raw.githubusercontent.com/tornadocash/root-updater/master/docker-compose.yml
wget https://raw.githubusercontent.com/tornadocash/root-updater/master/.env.example -O .env
vi .env # update env vars
docker-compose up -d
```

## Usage for development

```shell script
yarn
cp .env.example .env
yarn start
```

Caches events from both mining and tornado cash instances
