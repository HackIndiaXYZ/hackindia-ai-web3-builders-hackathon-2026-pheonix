import os
from backend.blockchain.mst_client import MSTClient

def run_demo():
    print("Initializing MST Client for Live Demo...")
    # These must be set in your environment
    rpc_url = os.environ.get("MST_RPC_URL", "https://rpc.testnet.mst.com")
    chain_id = int(os.environ.get("MST_CHAIN_ID", 91562037))
    wallet_address = os.environ.get("MST_WALLET_ADDRESS")
    private_key = os.environ.get("MST_PRIVATE_KEY")
    
    if not wallet_address or not private_key:
        print("MST_WALLET_ADDRESS and MST_PRIVATE_KEY must be set in environment variables.")
        return

    client = MSTClient(rpc_url=rpc_url, chain_id=chain_id, wallet_address=wallet_address, private_key=private_key)
    
    payload = {
        "event_type": "DEMO_TRANSACTION",
        "message": "Final Live Transaction Proof - Hackathon Demo"
    }
    
    print(f"Submitting payload to MST Testnet: {payload}")
    try:
        receipt = client.submit_event(payload)
        tx_hash = receipt["tx_hash"]
        print(f"Transaction submitted successfully! TX Hash: {tx_hash}")
        
        print("Waiting for confirmation...")
        confirmation = client.verify_confirmation(tx_hash, confirmations=1)
        if confirmation["confirmed"]:
            print(f"Transaction confirmed at block {confirmation['block_number']}")
        else:
            print("Transaction confirmation timed out.")
    except Exception as e:
        print(f"Failed to submit transaction: {e}")

if __name__ == "__main__":
    run_demo()
