
# carlaviz
这是SelfDriveGuard/carlaviz的docker文档。

## Build From Docker

Run following command to pull this image.

```bash
docker pull selfdriveguard/carlaviz:[version tag]
```

## How to run it with docker
```sh
docker run -it --network="host" selfdriveguard/carlaviz:[version tag]
```

## how to build image
```sh
# build image
docker build -f /your/path/to/dockerfile -t [REPOSITORY:tag] .
# push image
docker login -u username -p password
docker push [REPOSITORY:tag]
```
