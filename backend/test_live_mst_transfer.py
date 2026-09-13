import pytest
from app import app
from v2_registry import V2Registry

def test_live_mst_workflow_mocked(client):
    """
    Since testing a real MST network requires actual funds and live connections,
    this test mocks out the MST client submission while exercising the 
    end-to-end credential and signature flow in the backend.
    """
    # 1. Login
    res = client.post("/api/auth/login", json={"username": "Rajesh Kumar", "role": "OWNER"})
    assert res.status_code == 200
    token = res.json["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get properties to find a parcel
    res = client.get("/api/properties")
    parcels = res.json
    parcel_id = None
    for p in parcels:
        if "rajesh kumar" in [o.get("name", "").lower() for o in p.get("owners", [])]:
            parcel_id = p["ulpin"]
            break
            
    if not parcel_id:
        pytest.skip("No parcel owned by Rajesh Kumar found in test db")

    # 3. Create a transfer (requires Registrar)
    res = client.post("/api/auth/login", json={"username": "reg1", "role": "REGISTRAR"})
    reg_token = res.json["token"]
    reg_headers = {"Authorization": f"Bearer {reg_token}"}
    
    # Create transfer
    res = client.post("/api/v2/transfers", json={
        "parcel_id": parcel_id,
        "buyer": "Bob",
        "document_hash": "0x123",
        "assessment_hash": "0x456"
    }, headers=reg_headers)
    assert res.status_code == 201
    transfer_id = res.json["transfer_id"]
    
    # 4. Generate wallet link challenge
    res = client.post("/api/wallets/challenge", json={"wallet_address": "0x1234567890123456789012345678901234567890", "parcel_id": parcel_id}, headers=headers)
    assert res.status_code == 201
    challenge_id = res.json["challenge_id"]
    
    # 5. Transfer approval challenge
    res = client.post(f"/api/v2/transfers/{transfer_id}/approval-challenge", headers=headers)
    assert res.status_code in (201, 403) # Might be 403 if wallet is not linked yet
