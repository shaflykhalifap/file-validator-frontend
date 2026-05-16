# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine

# Copy hasil build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy konfigurasi nginx
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Railway inject $PORT secara otomatis
ENV PORT=80

EXPOSE $PORT

CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
