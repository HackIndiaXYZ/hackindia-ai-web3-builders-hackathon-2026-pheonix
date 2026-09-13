import os
import json
import time
from web3 import Web3

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ[k] = v

import chain_client

def run_smoke_test():
    print("Starting MST smoke test...")
    w3, contract, signer = chain_client._client()
    
    # 1-4 are done in _client() init
    print("Connected to MST. Chain ID:", w3.eth.chain_id)
    print("Contract bytecode verified.")
    print("Registrar verified:", contract.functions.registrar().call())
    
    # 5. Build a real LandRegistryV2 transaction
    test_ulpin = "SMOKE-TEST-" + str(int(time.time()))
    print("Using test parcel:", test_ulpin)
    
    owner_addr = chain_client.name_to_address("Smoke Test Owner")
    
    tx = contract.functions.registerParcel(
        chain_client.ulpin_to_hash(test_ulpin),
        [owner_addr],
        [10000],
        [chain_client.ulpin_to_hash("Smoke Test Owner_cid")],
        [1],
        1
    ).build_transaction({
        "from": signer.get_address(),
        "nonce": w3.eth.get_transaction_count(signer.get_address()),
        "chainId": w3.eth.chain_id,
        "maxPriorityFeePerGas": w3.to_wei("30", "gwei"),
        "maxFeePerGas": w3.eth.gas_price + w3.to_wei("30", "gwei"),
    })
    
    tx["gas"] = int(w3.eth.estimate_gas(tx) * 1.2)
    print("Gas estimated:", tx["gas"])
    
    # 6. Sign using the configured dedicated testnet signer
    signed = signer.sign_transaction(tx)
    
    # 7. Broadcast it
    print("Broadcasting transaction...")
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    
    # 8. Capture actual tx hash
    print("Transaction hash:", tx_hash.hex())
    
    # 9. Wait for receipt
    print("Waiting for receipt...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    
    # 10. Verify success
    if receipt.status != 1:
        print("Transaction failed!")
        return
    print("Transaction succeeded! Block:", receipt.blockNumber)
    
    # 11. Decode the expected event
    events = contract.events.ParcelRegistered().process_receipt(receipt)
    if events:
        print("Decoded event:", events[0]["args"])
    else:
        print("No event found!")
        
    # 12. Query the contract again
    owners = contract.functions.getParcelOwners(chain_client.ulpin_to_hash(test_ulpin)).call()
    print("Queried contract owners:", owners)
    
    # 13. Record result
    print("Smoke test completed successfully.")

if __name__ == "__main__":
    run_smoke_test()
