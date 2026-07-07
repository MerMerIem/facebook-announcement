.PHONY: dev up down reset-container seed backend frontend install logs stop

# Start db, then backend and frontend
dev: up
	cd backend && npm start &
	cd frontend && npm run dev

# Start docker containers only
up:
	docker compose up -d

# Stop docker containers
down:
	docker compose down

# Stop and wipe volumes, then bring back up fresh (re-runs init sql)
reset-container:
	docker compose down -v
	docker compose up -d

# Seed the database (adds/updates admin user)
seed:
	cd backend && node seed.js

# Run backend only
backend:
	cd backend && npm install && npm start

# Run frontend only
frontend:
	cd frontend && npm install && npm run dev

# Install deps in both backend and frontend
install:
	cd backend && npm install
	cd frontend && npm install

# Tail docker container logs
logs:
	docker compose logs -f

# Stop any background npm processes started by dev (best effort)
stop:
	pkill -f "npm start" || true
	pkill -f "npm run dev" || true