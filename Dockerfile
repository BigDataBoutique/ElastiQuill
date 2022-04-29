FROM node:14.18.2-alpine
LABEL maintainer="info@bigdataboutique.com"

RUN apk add git

WORKDIR /app
COPY . .

RUN cd admin-frontend && npm install && npm run build && mv build .. && cd .. && \
    cd backend && npm install && npm run build && mv node_modules dist/* .. && cd .. && \
    ls -A | grep -v "server.js\|_setup\|build\|node_modules\|views" | xargs rm -rf

EXPOSE 3000
CMD NODE_ENV=production node server.js
