# PyMySQL comme driver MySQL sous Windows (si mysqlclient absent)
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass

try:
    from .celery import app as celery_app  # type: ignore
except Exception:
    celery_app = None

__all__ = ('celery_app',)
