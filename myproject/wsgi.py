"""
WSGI config for myproject project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application

# print("Python version:", sys.version)
# print("Current working directory:", os.getcwd())
# print("System path:", sys.path)
# print("DJANGO_SETTINGS_MODULE:", os.getenv("DJANGO_SETTINGS_MODULE"))

try:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
    application = get_wsgi_application()
    print("WSGI application loaded successfully")
except Exception as e:
    print("WSGI application failed to load")
    import traceback
    traceback.print_exc()

