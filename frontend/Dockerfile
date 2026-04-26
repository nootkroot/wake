FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# package-lock.json may not exist in fresh checkouts; fall back to install.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi


FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public env vars must be present at build time for Next.js to inline them.
ARG NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1
ARG NEXT_PUBLIC_DEFAULT_CITY=Seattle
ARG NEXT_PUBLIC_DEFAULT_LAT=47.6062
ARG NEXT_PUBLIC_DEFAULT_LNG=-122.3321
ARG NEXT_PUBLIC_MAPBOX_TOKEN=
ARG NEXT_PUBLIC_SUPABASE_URL=
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=
ARG API_BASE_INTERNAL=http://backend:8000/api/v1
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    NEXT_PUBLIC_DEFAULT_CITY=$NEXT_PUBLIC_DEFAULT_CITY \
    NEXT_PUBLIC_DEFAULT_LAT=$NEXT_PUBLIC_DEFAULT_LAT \
    NEXT_PUBLIC_DEFAULT_LNG=$NEXT_PUBLIC_DEFAULT_LNG \
    NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    API_BASE_INTERNAL=$API_BASE_INTERNAL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build


FROM node:20-slim AS runner
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1
ARG API_BASE_INTERNAL=http://backend:8000/api/v1
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    API_BASE_INTERNAL=$API_BASE_INTERNAL \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Drop root.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
