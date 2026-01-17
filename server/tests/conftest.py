"""Pytest configuration."""
import os
import pytest
import sys
from pathlib import Path

# Set test environment variables before any imports
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only-32chars!")
os.environ.setdefault("ENCRYPTION_KEY", "testtesttesttesttesttesttesttest")

# Add server to path
sys.path.insert(0, str(Path(__file__).parent.parent))
