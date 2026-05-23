from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from urllib.parse import urlparse

import pandas as pd

from config import settings


@contextmanager
def connection():
    parsed = urlparse(settings.database_url)
    if parsed.scheme == "sqlite":
        path = parsed.path
        if parsed.netloc:
            path = f"/{parsed.netloc}{parsed.path}"
        conn = sqlite3.connect(path)
        try:
            yield conn
        finally:
            conn.close()
        return

    if parsed.scheme in {"postgres", "postgresql"}:
        import psycopg
        conn = psycopg.connect(settings.database_url)
        try:
            yield conn
        finally:
            conn.close()
        return

    raise ValueError(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")


def read_sql(query: str, params: tuple = ()) -> pd.DataFrame:
    with connection() as conn:
        return pd.read_sql_query(query, conn, params=params)
