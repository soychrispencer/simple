FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY . .
EXPOSE 3005
CMD ["pnpm", "start"]
