FROM node:lts-alpine
LABEL maintainer="info@bigdataboutique.com"

RUN apk add git

WORKDIR /app
COPY . .

RUN (cd admin-frontend && npm install && npm run build && mv build ..)
RUN (cd backend && npm install && npm run build && cp -R node_modules/* ../node_modules && mv dist/* ..)
RUN ls -A | grep -v "server.js\|_setup\|build\|node_modules\|views" | xargs rm -rf

EXPOSE 3000
CMD NODE_ENV=production node server.js
