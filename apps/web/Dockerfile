FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile=false
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_RENDER_DELAY_MS=5000
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY VITE_RENDER_DELAY_MS=$VITE_RENDER_DELAY_MS
RUN pnpm --filter @bus-tracker/web... build

FROM nginx:1.27-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx/web.conf /etc/nginx/conf.d/default.conf
HEALTHCHECK CMD wget -q -O - http://127.0.0.1/ >/dev/null || exit 1
