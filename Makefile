# PLATFORM=win
PLATFORM=linux

start: 
	npx tsx ./src/index.ts
start-dev: 
	npx tsx watch src/
build:
	tsc
	pkg -t node20-$(PLATFORM)-x64 ./dist/index.js --debug
