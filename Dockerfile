FROM node:21-alpine AS build

WORKDIR /app-web-chat-messages

COPY . .

RUN npm install
RUN npm run build

FROM nginx
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app-web-chat-messages/dist/app-web-chat-messages/browser /usr/share/nginx/html

EXPOSE 80