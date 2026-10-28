"""Shared login budgets cover API and Django Admin; never trust forwarded IPs."""
import hashlib
import json
import time
from django.core.cache import cache
from django.http import JsonResponse


class SecurityLimitsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            body_size = int(request.META.get('CONTENT_LENGTH') or 0)
        except ValueError:
            return JsonResponse({'detail': 'Invalid request size.'}, status=400)
        if body_size > 6 * 1024 * 1024:
            return JsonResponse({'detail': 'Request exceeds the 6 MB limit.'}, status=413)
        if request.method == 'POST' and request.path in ('/api/users/login/', '/admin/login/'):
            if body_size > 16_384:
                return JsonResponse({'detail': 'Login request too large.'}, status=413)
            try:
                data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
                username = str(data.get('username', '')).strip().casefold()
            except (ValueError, AttributeError, UnicodeError):
                return JsonResponse({'detail': 'Invalid login request.'}, status=400)
            # Atomic cache increments with fixed windows. Redis shares limits across workers.
            window = int(time.time()) // 600
            budgets = [('ip', request.META.get('REMOTE_ADDR', ''), 30), ('account', username, 10)]
            try:
                for kind, identity, limit in budgets:
                    digest = hashlib.sha256(identity.encode()).hexdigest()
                    key = f'login:{kind}:{digest}:{window}'
                    if cache.add(key, 1, timeout=660):
                        count = 1
                    else:
                        try:
                            count = cache.incr(key)
                        except ValueError:
                            cache.add(key, 1, timeout=660)
                            count = 1
                    if count > limit:
                        response = JsonResponse({'detail': 'Too many sign-in attempts. Try again in 10 minutes.'}, status=429)
                        response['Retry-After'] = '600'
                        return response
            except Exception:
                # Cache failures must not silently disable login protection.
                return JsonResponse({'detail': 'Sign-in temporarily unavailable.'}, status=503)
        response = self.get_response(request)
        if request.path.startswith(('/api/', '/admin/', '/media/articles/')):
            response['Cache-Control'] = 'private, no-store'
        return response
