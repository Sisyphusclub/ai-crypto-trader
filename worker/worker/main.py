import os
from dotenv import load_dotenv
from rq import Worker, Queue, Connection
import redis

def main():
    load_dotenv()
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    conn = redis.from_url(redis_url)
    with Connection(conn):
        worker = Worker([Queue("default")])
        worker.work()

if __name__ == "__main__":
    main()
