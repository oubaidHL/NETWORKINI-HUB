# Stage 1: Build
FROM node:22-alpine as builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
# Copy data so it's included in the build output if we want it static, 
# BUT for this app, it fetches from /data/tools.json.
# We need to ensure public/data exists in the final image.
# If we build, Vite puts public/* into dist/.
# So we should copy public/data into frontend/public/data before building?
# OR we just copy it to the nginx folder.
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy the data folder from the root context to the nginx html folder
# This ensures data is valid at build time. 
# However, the scraper runs daily and updates the repo. 
# If we want the docker image to have the *latest* data when run, we should probably mount it.
# But for a static image deployment, we copy it.
COPY public/data /usr/share/nginx/html/data

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
