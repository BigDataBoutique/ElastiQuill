FROM node:20-alpine
ARG TARGETARCH
LABEL maintainer="info@bigdataboutique.com"

RUN apk add git curl

WORKDIR /app
COPY . .

RUN cd admin-frontend && \
    npm install && \
    npm run build && \
    cd ..

RUN cd backend && \
    npm install && \
    npm run build && \
    mv node_modules dist/* .. && \
    cd ..

EXPOSE 5000
CMD ["node", "server.js"]