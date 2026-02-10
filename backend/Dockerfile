FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# ▼▼▼ [추가] 시스템 의존성 설치 (MySQL, 암호화 라이브러리 등을 위해 필수) ▼▼▼
RUN apt-get update && apt-get install -y \
    git \
    gcc \
    pkg-config \
    libffi-dev \
    default-libmysqlclient-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


COPY . .

# (참고) 실행 명령어는 docker-compose에서 정의하므로 여기선 생략