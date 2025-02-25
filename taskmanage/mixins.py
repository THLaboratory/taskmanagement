from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from django.conf import settings

class GuestAllowedLoginRequiredMixin(LoginRequiredMixin):
    """ゲストユーザーも通過できる LoginRequiredMixin"""
    def dispatch(self, request, *args, **kwargs):
        print(f"GuestAllowedLoginRequiredMixin - request.user: {request.user}")
        print(f"GuestAllowedLoginRequiredMixin - is_authenticated: {request.user.is_authenticated}")
        print(f"GuestAllowedLoginRequiredMixin - username: {getattr(request.user, 'username', None)}")
        print(f"Session user_id: {request.session.get('_auth_user_id', 'No user_id in session')}")
        
        if request.user.is_authenticated or getattr(request.user, 'username', '') == 'guest':
            print("Access granted")
            return super().dispatch(request, *args, **kwargs)

        print("Redirecting to LOGIN_URL")
        return redirect(settings.LOGIN_URL)
