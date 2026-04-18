kill -9 $(lsof -ti:5175) 2>/dev/null || echo 'Port 5174 déjà libre'
