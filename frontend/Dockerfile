FROM node:20-alpine

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build \
    && npm install -g serve@14

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"]
