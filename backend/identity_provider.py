"""Authorized UIDAI/institutional identity boundaries; no unofficial API."""
from abc import ABC, abstractmethod

class OTPProvider(ABC):
    @abstractmethod
    def request_otp(self, identity_hint: str) -> str: ...
    @abstractmethod
    def verify_otp(self, request_id: str, otp: str) -> dict: ...

class IdentityProvider(ABC):
    @abstractmethod
    def resolve_identity(self, verification: dict) -> dict: ...

class CitizenAuthService:
    def __init__(self, otp_provider: OTPProvider, identity_provider: IdentityProvider):
        self.otp_provider, self.identity_provider = otp_provider, identity_provider
    def request(self, identity_hint): return self.otp_provider.request_otp(identity_hint)
    def verify(self, request_id, otp): return self.identity_provider.resolve_identity(self.otp_provider.verify_otp(request_id, otp))
