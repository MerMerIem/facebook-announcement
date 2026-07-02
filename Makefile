dev:
	docker compose up -d
	cd backend && npm install && npm start &
	cd frontend && npm install && npm run dev