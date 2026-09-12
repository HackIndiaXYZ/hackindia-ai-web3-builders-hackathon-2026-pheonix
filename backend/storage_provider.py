"""Private document storage boundary. Implement Supabase Storage/S3 in deploy."""
from abc import ABC, abstractmethod

class StorageProvider(ABC):
    @abstractmethod
    def put_private(self, key: str, content: bytes, mime_type: str) -> str: ...
    @abstractmethod
    def signed_download_url(self, reference: str, expires_seconds: int) -> str: ...
