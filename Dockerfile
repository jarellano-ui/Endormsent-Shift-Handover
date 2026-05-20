# Build Stage
FROM node:20-slim AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy application files
COPY . .

# Build Vite frontend and esbuild server backend
RUN npm run build

# Production Stage
FROM node:20-slim AS runner
WORKDIR /app

# Only copy built artifacts and backend production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install production dependencies only
RUN npm ci --only=production

# Expose port 3000
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Run the backend server
CMD ["npm", "run", "start"]
