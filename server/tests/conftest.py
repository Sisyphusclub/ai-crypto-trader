"""Pytest configuration."""
import os
import pytest
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
import types

# Set test environment variables before any imports
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only-32chars!")
os.environ.setdefault("ENCRYPTION_KEY", "testtesttesttesttesttesttesttest")

# Add server to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Create a proper module mock for database to avoid psycopg2 import
_mock_db_module = types.ModuleType('app.core.database')
_mock_db_module.engine = MagicMock()
_mock_db_module.SessionLocal = MagicMock()
_mock_db_module.get_db = MagicMock()
sys.modules['app.core.database'] = _mock_db_module

# Pre-register app.models as a proper package to prevent later mocks from breaking it
# Import the real app.models to ensure app.models.base is available
try:
    import app.models
    import app.models.base
except ImportError:
    # If import fails, create minimal mock that preserves package structure
    if 'app.models' not in sys.modules:
        _mock_models = types.ModuleType('app.models')
        _mock_models.__path__ = [str(Path(__file__).parent.parent / 'app' / 'models')]
        sys.modules['app.models'] = _mock_models

