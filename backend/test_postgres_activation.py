"""Opt-in restart and worker-safety checks for the active repository."""

import threading
import uuid

import pytest


pytestmark = pytest.mark.postgres


def test_transfer_and_outbox_survive_repository_restart(postgres_repo):
    parcel = postgres_repo.load_properties()["UP-0001-CLEAN"]
    transfer = postgres_repo.create_transfer(parcel, "buyer1", "restart-document", "restart-assessment", "registrar_noida2")
    transfer_id = transfer["transfer_id"]
    try:
        restarted = type(postgres_repo)(postgres_repo.database_url)
        assert restarted.get_transfer(transfer_id)["status"] == "OWNER_APPROVAL"
        for owner in parcel["owners"]:
            restarted.approve(transfer_id, owner["name"], "OWNER")
        restarted.approve(transfer_id, "registrar_noida2", "REGISTRAR")
        restarted.approve(transfer_id, "buyer1", "BUYER")
        after_restart = type(postgres_repo)(postgres_repo.database_url)
        assert after_restart.get_transfer(transfer_id)["status"] == "READY_TO_COMMIT"
        assert after_restart.next_outbox_item("PENDING", "restart-worker")["transfer_id"] == transfer_id
    finally:
        with postgres_repo._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("DELETE FROM audit_events WHERE transfer_id=%s", (transfer_id,))
                    cursor.execute("DELETE FROM notifications WHERE transfer_id=%s", (transfer_id,))
                    cursor.execute("DELETE FROM blockchain_outbox WHERE aggregate_id=%s", (transfer_id,))
                    cursor.execute("DELETE FROM transfer_approvals WHERE transfer_id=%s", (transfer_id,))
                    cursor.execute("DELETE FROM transfer_sellers WHERE transfer_id=%s", (transfer_id,))
                    cursor.execute("DELETE FROM transfers WHERE id=%s", (transfer_id,))


def test_two_workers_cannot_claim_same_outbox(postgres_repo):
    parcel = postgres_repo.load_properties()["UP-0001-CLEAN"]
    transfer = postgres_repo.create_transfer(parcel, "buyer1", "worker-document", "worker-assessment", "registrar_noida2")
    transfer_id = transfer["transfer_id"]
    try:
        for owner in parcel["owners"]:
            postgres_repo.approve(transfer_id, owner["name"], "OWNER")
        postgres_repo.approve(transfer_id, "registrar_noida2", "REGISTRAR")
        postgres_repo.approve(transfer_id, "buyer1", "BUYER")
        results = []

        def claim(worker_id):
            results.append(type(postgres_repo)(postgres_repo.database_url).next_outbox_item("PENDING", worker_id))

        workers = [threading.Thread(target=claim, args=(f"worker-{index}",)) for index in range(2)]
        for worker in workers:
            worker.start()
        for worker in workers:
            worker.join()
        assert sum(result is not None for result in results) == 1
    finally:
        with postgres_repo._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("DELETE FROM audit_events WHERE transfer_id=%s", (transfer_id,))
                    cursor.execute("DELETE FROM notifications WHERE transfer_id=%s", (transfer_id,))
                    cursor.execute("DELETE FROM blockchain_outbox WHERE aggregate_id=%s", (transfer_id,))
                    cursor.execute("DELETE FROM transfer_approvals WHERE transfer_id=%s", (transfer_id,))
                    cursor.execute("DELETE FROM transfer_sellers WHERE transfer_id=%s", (transfer_id,))
                    cursor.execute("DELETE FROM transfers WHERE id=%s", (transfer_id,))