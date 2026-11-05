"""Unit tests for Escrow and Anti-Fraud Security components in MEOW MATCH."""

from __future__ import annotations

import io
from datetime import datetime, timedelta
from PIL import Image
import numpy as np

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, User, PetProfile, PetFace, LostReport, EscrowTransaction, FinderCheckin
from escrow_security import (
    extract_exif,
    calculate_distance_km,
    verify_photo_metadata,
    hold_reward_funds,
    release_reward_funds,
)


def generate_image_with_exif(lat: float, lng: float, dt_str: str) -> bytes:
    """Helper to programmatically generate JPEG bytes containing custom EXIF tags."""
    img = Image.new("RGB", (100, 100), color="blue")
    exif = img.getexif()

    # Tag 306 is DateTime
    exif[306] = dt_str

    def decimal_to_dms(dec: float) -> tuple[float, float, float]:
        abs_dec = abs(dec)
        d = int(abs_dec)
        m = int((abs_dec - d) * 60)
        s = (abs_dec - d - m / 60.0) * 3600.0
        return (float(d), float(m), s)

    lat_dms = decimal_to_dms(lat)
    lng_dms = decimal_to_dms(lng)

    lat_ref = "N" if lat >= 0 else "S"
    lng_ref = "E" if lng >= 0 else "W"

    # GPSTag values (Tag 34853 / 0x8825)
    gps_dict = {
        1: lat_ref,
        2: lat_dms,
        3: lng_ref,
        4: lng_dms,
    }
    exif[34853] = gps_dict

    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


def test_distance_calculation():
    print("Running test_distance_calculation...")
    # Suranaree University of Technology coordinates
    lat1, lng1 = 14.8824, 102.0206
    # Save a point ~300 meters away
    lat2, lng2 = 14.8845, 102.0220
    
    dist = calculate_distance_km(lat1, lng1, lat2, lng2)
    print(f"Calculated distance: {dist:.4f} km ({dist * 1000:.1f} meters)")
    assert dist < 0.5, "Distance should be under 500 meters"
    assert dist > 0.1, "Distance should be over 100 meters"
    print("✅ test_distance_calculation passed!\n")


def test_metadata_verification():
    print("Running test_metadata_verification...")
    now_str = "2026:06:02 12:00:00"
    claim_time = datetime(2026, 6, 2, 12, 15, 0) # 15 mins later
    
    # 1. Success case: matches perfectly
    lat, lng = 14.8824, 102.0206
    photo_bytes = generate_image_with_exif(lat, lng, now_str)
    
    res = verify_photo_metadata(
        photo_bytes=photo_bytes,
        claim_lat=lat,
        claim_lng=lng,
        claim_time=claim_time,
    )
    print("Verification result (Success Case):", res)
    assert res["valid"] is True
    assert res["distance_km"] is not None
    assert res["distance_km"] < 0.01
    
    # 2. Fraud case: wrong location (50 km away)
    photo_bytes_far = generate_image_with_exif(15.3, 102.0206, now_str)
    res_far = verify_photo_metadata(
        photo_bytes=photo_bytes_far,
        claim_lat=lat,
        claim_lng=lng,
        claim_time=claim_time,
    )
    print("Verification result (Location Mismatch Case):", res_far)
    assert res_far["valid"] is False
    assert "พิกัดรูปถ่ายไม่ตรงกับที่แจ้ง" in res_far["reason"]

    # 3. Fraud case: old photo (3 days old)
    old_str = "2026:05:30 12:00:00"
    photo_bytes_old = generate_image_with_exif(lat, lng, old_str)
    res_old = verify_photo_metadata(
        photo_bytes=photo_bytes_old,
        claim_lat=lat,
        claim_lng=lng,
        claim_time=claim_time,
    )
    print("Verification result (Timestamp Mismatch Case):", res_old)
    assert res_old["valid"] is False
    assert "วันเวลาถ่ายรูปไม่ตรงกับที่แจ้ง" in res_old["reason"]

    print("✅ test_metadata_verification passed!\n")


def test_escrow_lifecycle():
    print("Running test_escrow_lifecycle...")
    # Set up in-memory SQLite DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Create users
        owner = User(name="Owner User", role="Owner", phone="0812345678")
        finder = User(name="Finder User", role="Finder", phone="0887654321", wallet_balance=0)
        db.add_all([owner, finder])
        db.commit()

        # Create pet profile
        pet = PetProfile(owner_id=owner.id, cat_name="Nong Som", breed="Orange Tabby")
        db.add(pet)
        db.commit()

        # Create lost report with 10,000 reward
        report = LostReport(
            pet_id=pet.id,
            missing_location="SUT Gate 1",
            reward_amount=10000,
            status="Active",
        )
        db.add(report)
        db.commit()

        # 1. Test Hold Reward Funds
        tx = hold_reward_funds(db, report.id)
        assert tx is not None
        assert tx.amount_held == 10000
        # 10% fee calculation: 1000
        assert tx.platform_fee == 1000
        assert tx.payout_status == "Held"
        print(f"Funds locked in Escrow. Amount: {tx.amount_held}, Fee: {tx.platform_fee}, Status: {tx.payout_status}")

        # 2. Test Release Reward Funds
        res = release_reward_funds(db, report.id, finder.id)
        assert res["status"] == "success"
        assert res["payout_amount"] == 9000  # 10000 - 1000
        assert res["finder_wallet_balance"] == 9000
        
        # Check database states are updated
        db.refresh(tx)
        db.refresh(report)
        db.refresh(finder)
        
        assert tx.payout_status == "Released"
        assert report.status == "Resolved"
        assert finder.wallet_balance == 9000
        print(f"Funds released. Finder balance: {finder.wallet_balance}, Report status: {report.status}")

        print("✅ test_escrow_lifecycle passed!\n")
    finally:
        db.close()


if __name__ == "__main__":
    print("=== STARTING ESCROW & ANTI-FRAUD TESTS ===\n")
    test_distance_calculation()
    test_metadata_verification()
    test_escrow_lifecycle()
    print("=== ALL TESTS PASSED SUCCESSFULLY! ===")
