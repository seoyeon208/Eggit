# 1. Node.js 이미지를 기반으로 함 (가볍고 안정적인 버전)
FROM node:20-alpine

# 2. 작업 폴더 설정
WORKDIR /app

# 3. 패키지 파일만 먼저 복사 (캐시 효율을 위해)
COPY package*.json ./

# 4. 의존성 설치
RUN npm install

# 5. 나머지 소스 코드 복사
COPY . .

# 6. 실행 명령어 (React: npm start, Vite: npm run dev 등 프로젝트에 맞춰 수정)
CMD ["npm", "run", "dev"]