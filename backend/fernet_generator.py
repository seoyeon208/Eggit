# 먼저 설치 필요: pip install cryptography
from cryptography.fernet import Fernet

key = Fernet.generate_key()
print(key.decode())