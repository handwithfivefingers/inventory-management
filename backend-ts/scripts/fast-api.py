from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Bật CORS cho phép Node.js frontend gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"], # Điền port của Node.js vào đây
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)