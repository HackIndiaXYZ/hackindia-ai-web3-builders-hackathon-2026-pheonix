from title_history import TitleTimelineService, OwnershipGraphService

def test_timeline_distinguishes_archival_and_blockchain_sources():
    parcel = {"ulpin": "UP-X", "owners": [{"name": "Current", "share_percent": 100}], "transfer_history": [{"from": "Original", "to": "Current", "date": "2010-01-01", "doc_hash": "d"}]}
    chain = [{"event_type": "TRANSFER", "from": "Current", "to": "Later", "timestamp": "2026-01-01T00:00:00Z", "doc_hash": "d2", "tx_hash": "0xtx"}]
    timeline = TitleTimelineService().build(parcel, chain, [], [])
    assert {event["source"] for event in timeline} == {"ARCHIVAL", "BLOCKCHAIN_NATIVE"}
    graph = OwnershipGraphService().build(parcel, timeline)
    assert any(node["label"] == "Current" for node in graph["nodes"])
    assert any(edge["from"] == "Original" and edge["to"] == "Current" for edge in graph["edges"])
