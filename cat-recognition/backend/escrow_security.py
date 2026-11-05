"""Escrow & Anti-Fraud Security logic for MEOW MATCH."""

from __future__ import annotations

import io
from datetime import datetime
import numpy as np
from PIL import Image
from PIL.ExifTags import GPSTAGS, TAGS
from sqlalchemy.orm import Session

from database import EscrowTransaction, LostReport, User


def extract_exif(photo_bytes: bytes) -> tuple[float | None, float | None, datetime | None]:
    """Extract GPS coordinates and datetime from image EXIF metadata.

    Returns:
        (latitude, longitude, datetime) or (None, None, None) on failure.
    """
    try:
        img = Image.open(io.BytesIO(photo_bytes))
        exif_data = img._getexif()
        if not exif_data:
            return None, None, None

        gps_info = {}
        dt_str = None

        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                for g_tag_id in value:
                    g_tag = GPSTAGS.get(g_tag_id, g_tag_id)
                    gps_info[g_tag] = value[g_tag_id]
            elif tag in ("DateTimeOriginal", "DateTimeDigitized", "DateTime"):
                dt_str = value

        lat = None
        lng = None
        if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
            lat_dms = gps_info["GPSLatitude"]
            lat_ref = gps_info.get("GPSLatitudeRef", "N")
            lng_dms = gps_info["GPSLongitude"]
            lng_ref = gps_info.get("GPSLongitudeRef", "E")

            def dms_to_decimal(dms, ref) -> float:
                d = float(dms[0])
                m = float(dms[1])
                s = float(dms[2])
                dec = d + (m / 60.0) + (s / 3600.0)
                if ref in ("S", "W"):
                    dec = -dec
                return dec

            lat = dms_to_decimal(lat_dms, lat_ref)
            lng = dms_to_decimal(lng_dms, lng_ref)

        dt = None
        if dt_str:
            dt_str_clean = str(dt_str).strip()
            for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S"):
                try:
                    dt = datetime.strptime(dt_str_clean, fmt)
                    break
                except ValueError:
                    continue

        return lat, lng, dt
    except Exception:
        return None, None, None


def calculate_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate the great-circle distance between two points on Earth using numpy."""
    phi1, lambda1 = np.radians(lat1), np.radians(lng1)
    phi2, lambda2 = np.radians(lat2), np.radians(lng2)
    dphi = phi2 - phi1
    dlambda = lambda2 - lambda1

    a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0)**2
    c = 2.0 * np.arcsin(np.sqrt(a))
    r = 6371.0  # Earth's radius in kilometers
    return float(r * c)


def verify_photo_metadata(
    photo_bytes: bytes,
    claim_lat: float,
    claim_lng: float,
    claim_time: datetime,
    max_distance_km: float = 0.5,
    max_time_diff_hours: float = 24.0,
) -> dict:
    """Verify that photo EXIF metadata matches the claimed location and time.

    Used to detect scams where users upload downloaded/old images to claim rewards.
    """
    exif_lat, exif_lng, exif_time = extract_exif(photo_bytes)

    if exif_lat is None or exif_lng is None or exif_time is None:
        return {
            "valid": False,
            "exif_lat": exif_lat,
            "exif_lng": exif_lng,
            "exif_time": exif_time.isoformat() if exif_time else None,
            "distance_km": None,
            "time_diff_hours": None,
            "reason": "ไม่พบข้อมูลพิกัด (GPS) หรือวันเวลาใน EXIF เมทาดาตาของรูปภาพ"
        }

    distance_km = calculate_distance_km(exif_lat, exif_lng, claim_lat, claim_lng)
    time_diff_seconds = abs((claim_time - exif_time).total_seconds())
    time_diff_hours = time_diff_seconds / 3600.0

    valid_distance = distance_km <= max_distance_km
    valid_time = time_diff_hours <= max_time_diff_hours
    valid = valid_distance and valid_time

    if valid:
        reason = "การตรวจสอบความถูกต้องของรูปภาพสำเร็จ"
    else:
        reasons = []
        if not valid_distance:
            reasons.append(f"พิกัดรูปถ่ายไม่ตรงกับที่แจ้ง ({distance_km:.2f} กม., เกินค่าสูงสุด {max_distance_km} กม.)")
        if not valid_time:
            reasons.append(f"วันเวลาถ่ายรูปไม่ตรงกับที่แจ้ง ({time_diff_hours:.2f} ชม., เกินค่าสูงสุด {max_time_diff_hours} ชม.)")
        reason = "ตรวจสอบเมทาดาตาไม่ผ่าน: " + " และ ".join(reasons)

    return {
        "valid": bool(valid),
        "exif_lat": float(exif_lat),
        "exif_lng": float(exif_lng),
        "exif_time": exif_time.isoformat(),
        "distance_km": float(distance_km),
        "time_diff_hours": float(time_diff_hours),
        "reason": reason,
    }


def hold_reward_funds(db: Session, report_id: int) -> EscrowTransaction | None:
    """Locks reward funds in Escrow when an owner issues an SOS alert.

    Calculates a 10% platform fee using numpy.
    """
    report = db.get(LostReport, report_id)
    if not report:
        raise ValueError("ไม่พบรายงานแมวหายที่ระบุ")

    if report.reward_amount <= 0:
        return None

    # Calculate 10% platform fee
    fee = int(np.round(np.multiply(report.reward_amount, 0.10)))

    # Create Escrow transaction
    tx = EscrowTransaction(
        report_id=report.id,
        amount_held=report.reward_amount,
        platform_fee=fee,
        payout_status="Held",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def release_reward_funds(db: Session, report_id: int, finder_id: int) -> dict:
    """Releases escrow funds to the finder's internal wallet after owner confirmation."""
    tx = (
        db.query(EscrowTransaction)
        .filter(EscrowTransaction.report_id == report_id, EscrowTransaction.payout_status == "Held")
        .first()
    )
    if not tx:
        raise ValueError("ไม่พบยอดเงินในระบบ Escrow ที่ถูกล็อกไว้สำหรับรายงานนี้")

    finder = db.get(User, finder_id)
    if not finder:
        raise ValueError("ไม่พบพลเมืองดีที่ระบุ")

    payout_amount = tx.amount_held - tx.platform_fee
    finder.wallet_balance += payout_amount
    tx.payout_status = "Released"

    report = db.get(LostReport, report_id)
    if report:
        report.status = "Resolved"

    db.commit()
    db.refresh(finder)
    db.refresh(tx)

    return {
        "status": "success",
        "escrow_id": tx.id,
        "amount_held": tx.amount_held,
        "platform_fee": tx.platform_fee,
        "payout_amount": payout_amount,
        "finder_wallet_balance": finder.wallet_balance,
    }
