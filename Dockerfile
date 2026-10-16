FROM node:20-alpine AS build

WORKDIR /app

# The API base URL is baked in at build time (CRA env vars are compile-time).
ARG REACT_APP_API_URL=http://localhost:8000/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN CI=false npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
