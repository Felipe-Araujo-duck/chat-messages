FROM node:22-alpine AS build

WORKDIR /app-web-chat-messages

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app-web-chat-messages/dist /usr/share/nginx/html

EXPOSE 80
#CMD ["nginx", "-g", "daemon off;"]