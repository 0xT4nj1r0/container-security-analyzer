// Severity metadata for issue categorization
export const severityMeta = {
  critical: {
    label: 'Critical',
    chip: 'bg-red-600 text-white',
    panel: 'border-red-300 bg-red-50',
    countText: 'text-red-700',
  },
  high: {
    label: 'High',
    chip: 'bg-orange-600 text-white',
    panel: 'border-orange-300 bg-orange-50',
    countText: 'text-orange-700',
  },
  medium: {
    label: 'Medium',
    chip: 'bg-amber-600 text-white',
    panel: 'border-amber-300 bg-amber-50',
    countText: 'text-amber-700',
  },
  low: {
    label: 'Low',
    chip: 'bg-gray-600 text-white',
    panel: 'border-gray-300 bg-gray-50',
    countText: 'text-gray-700',
  },
}

// Sample vulnerable docker-compose for testing
export const SAMPLE_VULNERABLE_COMPOSE = `version: "3.8"

services:
  # Web application - has both good and bad volumes
  webapp:
    image: nginx:alpine
    container_name: my-webapp
    privileged: true
    volumes:
      # DANGEROUS - will be removed
      - /:/host
      - /var/run/docker.sock:/var/run/docker.sock
      # SAFE - will be preserved
      - ./html:/usr/share/nginx/html
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./logs:/var/log/nginx
    ports:
      - "80:80"
      - "443:443"
    network_mode: host
    pid: host
    ipc: host
    uts: host
    security_opt:
      - seccomp:unconfined
      - apparmor:unconfined
    environment:
      - NGINX_HOST=example.com
      - NGINX_PORT=80
    restart: unless-stopped

  # Database - has dangerous and safe volumes
  database:
    image: postgres:15-alpine
    container_name: my-database
    privileged: true
    volumes:
      # DANGEROUS - will be removed
      - /:/host-root
      # SAFE - will be preserved
      - db-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
      - ./backups:/backups
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secretpassword
    network_mode: host
    pid: host
    security_opt:
      - apparmor:unconfined
      - seccomp:unconfined
    restart: always

  # Redis - minimal dangerous config
  cache:
    image: redis:7-alpine
    container_name: my-cache
    volumes:
      # DANGEROUS - will be removed
      - /var/run/docker.sock:/var/run/docker.sock
      # SAFE - will be preserved
      - cache-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
    ports:
      - "6379:6379"
    network_mode: host
    ipc: host
    uts: host
    security_opt:
      - seccomp:unconfined
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped

  # API service - only safe volumes
  api:
    image: node:18-alpine
    container_name: my-api
    working_dir: /app
    volumes:
      # ALL SAFE - all will be preserved
      - ./api:/app
      - ./api/logs:/app/logs
      - api-node-modules:/app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:secretpassword@database:5432/myapp
    network_mode: host
    pid: host
    command: npm start
    restart: unless-stopped

volumes:
  db-data:
  cache-data:
  api-node-modules:
`

// Empty compose file (default state)
export const EMPTY_COMPOSE = ''
