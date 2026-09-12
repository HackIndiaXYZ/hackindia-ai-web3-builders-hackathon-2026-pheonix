"""Run one durable-outbox pass: `python outbox_worker.py`.

Deploy this as a separately supervised worker. It never treats an API request
as confirmation; only a confirmed adapter receipt advances a transfer to
COMPLETED.
"""

from app import process_v2_outbox_once

if __name__ == "__main__":
    result = process_v2_outbox_once()
    print("no submitted outbox events" if result is None else result)
