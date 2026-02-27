# ==========================================
# STAGE 1: Build the React Application
# ==========================================
# We use a Node alpine image just for building the static files
FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first for layer caching
COPY package*.json ./

# Clean install of dependencies
RUN npm install

# Copy the rest of your React code
COPY . .

# Generate the production build static files (HTML/CSS/JS)
RUN npm run build

# ==========================================
# STAGE 2: Serve the App using Nginx
# ==========================================
# We throw away the heavy Node environment and only keep a tiny Nginx web server
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the production build files from Stage 1 into the Nginx server directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80 inside the container (Nginx default)
EXPOSE 80

# Start Nginx and keep it running in the foreground
CMD ["nginx", "-g", "daemon off;"]