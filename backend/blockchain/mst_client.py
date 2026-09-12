"""MST adapter boundary.

Configure an approved MST SDK/provider in deployment and implement this
interface there. No private key is accepted by this module or frontend.
"""

class MSTChainClient:
    def submit_transfer(self, payload: dict) -> dict:
        raise RuntimeError("MST client is not configured; use CHAIN_MODE=mock for the demo")

    def get_events(self, parcel_id: str) -> list:
        raise RuntimeError("MST client is not configured")
