FROM node:10-alpine
LABEL maintainer="info@bigdataboutique.com"

WORKDIR /app
COPY . .

RUN cd admin-frontend && npm install && npm run build && mv build .. && cd .. && \
    cd backend && npm install && npm run build && mv node_modules dist/* .. && cd .. && \
    ls -A | grep -v "server.js\|_setup\|build\|node_modules\|views" | xargs rm -rf

EXPOSE 3000
CMD NODE_ENV=production node server.js
