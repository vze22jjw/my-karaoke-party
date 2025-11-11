#to build for local development use commands like
bash docker-builds/docker-build.sh --build-type dev

#redeploy after local docker build
bash docker-builds/dev-docker-compose.sh

#deploy to public ecr for PROD release
bash docker-builds/docker-build.sh --build-type release --deploy