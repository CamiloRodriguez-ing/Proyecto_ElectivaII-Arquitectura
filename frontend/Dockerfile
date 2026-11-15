FROM node:24.15.0-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build -- --configuration local

FROM node:24.15.0-alpine
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/frontend/server/server.mjs"]
