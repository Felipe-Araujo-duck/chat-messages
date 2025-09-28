#! /bin/bash
PATH_PROJECT="/home/joaom/chat-messages"
cd "$PATH_PROJECT"
git checkout main
git pull

# Obtém o hash do último commit (curto)
GIT_COMMIT_HASH=$(git -C "$PATH_PROJECT" rev-parse --short HEAD)

docker build -t app-web-chat-messages-image:"$GIT_COMMIT_HASH" "$PATH_PROJECT"
docker tag app-web-chat-messages-image:"$GIT_COMMIT_HASH" app-web-chat-messages-image:latest

kubectl delete pod -l app=app-web-chat-messages