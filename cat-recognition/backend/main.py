"""MEOW MATCH Marketplace API entrypoint (uvicorn main:app)."""

from __future__ import annotations

import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload

from ai_pipeline import add_embedding_to_index, image_to_embedding, knn_search_top5
from auth import create_access_token, get_current_user, hash_password, verify_password
from database import (
    Cat,
    CatImage,
    Shelter,
    User,
    VaccineRecord,
    Order,
    ChatRoom,
    ChatMessage,
    get_db,
    init_db,
)
from face_pipeline import distance_to_confidence, prepare_face_image
from file_storage import save_upload_bytes
from searcher import get_searcher

_BACKEND_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = Path(os.environ.get("UPLOADS_DIR", _BACKEND_DIR / "uploads"))
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    # Seed mock shelters if empty
    db = next(get_db())
    if db.query(Shelter).count() == 0:
        db.add_all([
            Shelter(name="Happy Paws Shelter", address="123 Sukhumvit Rd", lat=13.7563, lng=100.5018, phone="02-111-2222"),
            Shelter(name="Cat Haven BKK", address="456 Silom Rd", lat=13.7278, lng=100.5244, phone="02-333-4444"),
        ])
        db.commit()
    yield


app = FastAPI(title="MEOW MATCH Marketplace API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# -----------------------------
# Auth (JWT)
# -----------------------------

@app.post("/api/auth/register")
def register_user(
    db: Annotated[Session, Depends(get_db)],
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone: str = Form(""),
    role: str = Form("buyer"),
):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว")

    normalized_role = role.strip().lower()
    if normalized_role not in {"buyer", "seller"}:
        normalized_role = "buyer"
    
    user = User(
        name=name.strip(),
        email=email.strip(),
        password_hash=hash_password(password),
        phone=phone.strip() or None,
        role=normalized_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(sub=str(user.id), role=user.role)
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "name": user.name, "role": user.role}}


@app.post("/api/auth/login")
def login(
    db: Annotated[Session, Depends(get_db)],
    email: str = Form(...),
    password: str = Form(...),
):
    user = db.query(User).filter(User.email == email.strip()).first()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")

    token = create_access_token(sub=str(user.id), role=user.role)
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "name": user.name, "role": user.role}}


# -----------------------------
# Marketplace & Listings
# -----------------------------

def _cat_result(cat: Cat, confidence: float = None) -> dict:
    image_url = None
    if cat.images:
        stored = cat.images[0].image_path
        image_url = stored if stored.startswith("/") else f"/uploads/{stored}"
    
    res = {
        "id": cat.id,
        "owner_id": cat.owner_id,
        "name": cat.name,
        "breed": cat.breed or "ไม่ระบุ",
        "color": cat.color or "ไม่ระบุ",
        "gender": cat.gender or "ไม่ระบุ",
        "estimated_age": cat.estimated_age or "ไม่ระบุ",
        "weight": cat.weight or 0.0,
        "category": cat.category or "cat",
        "price": cat.price or 0.0,
        "status": cat.status,
        "location": cat.location_name or "ไม่ระบุ",
        "image_url": image_url,
        "seller": {
            "name": cat.owner.name if cat.owner else "",
            "phone": cat.owner.phone if cat.owner else "",
        }
    }
    if confidence is not None:
        res["match_confidence"] = round(confidence, 1)
    return res


@app.get("/api/cats")
def list_cats(
    db: Annotated[Session, Depends(get_db)],
    q: str = Query(None, description="ค้นหาจากชื่อ พันธุ์ หรือสี"),
    category: str = Query(None, description="กรองตามหมวดหมู่ (cat, food, accessory, clinic)"),
):
    """Get all available cats in the marketplace."""
    query = db.query(Cat).options(joinedload(Cat.owner), joinedload(Cat.images)).filter(Cat.status == "available")
    
    if category:
        query = query.filter(Cat.category == category)

    if q:
        search_term = f"%{q}%"
        query = query.filter(
            (Cat.name.ilike(search_term)) | 
            (Cat.breed.ilike(search_term)) | 
            (Cat.color.ilike(search_term))
        )
        
    cats = query.order_by(Cat.created_at.desc()).limit(50).all()
    return {"results": [_cat_result(cat) for cat in cats]}


@app.get("/api/my-cats")
def list_my_cats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get marketplace listings owned by the current user."""
    cats = (
        db.query(Cat)
        .options(joinedload(Cat.owner), joinedload(Cat.images))
        .filter(Cat.owner_id == current_user.id)
        .order_by(Cat.created_at.desc())
        .all()
    )
    return {"results": [_cat_result(cat) for cat in cats]}


@app.post("/api/cats")
async def create_listing(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    image: UploadFile = File(...),
    name: str = Form(...),
    breed: str = Form(""),
    color: str = Form(""),
    gender: str = Form(""),
    estimated_age: str = Form(""),
    weight: float = Form(0.0),
    category: str = Form("cat"),
    price: float = Form(0.0),
    location_name: str = Form(""),
    description: str = Form(""),
    vaccine_status: str = Form(""),
):
    """Seller creates a new cat listing with face upload."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="กรุณาอัปโหลดไฟล์รูปภาพ")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="ไฟล์รูปว่างเปล่า")

    try:
        _, aligned, embedding = prepare_face_image(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"ไม่สามารถจับใบหน้าแมวได้: {exc}") from exc

    from io import BytesIO
    buf = BytesIO()
    aligned.save(buf, format="JPEG", quality=90)
    cropped_bytes = buf.getvalue()

    cat = Cat(
        owner_id=current_user.id,
        name=name.strip(),
        breed=breed.strip() or None,
        color=color.strip() or None,
        gender=gender.strip() or None,
        estimated_age=estimated_age.strip() or None,
        weight=weight,
        category=category.strip() or "cat",
        price=price,
        location_name=location_name.strip() or None,
        description=description.strip() or None,
        status="available"
    )
    db.add(cat)
    db.flush()

    image_url = await save_upload_bytes(content=cropped_bytes, prefix=f"cat_{cat.id}", ext=".jpg")
    cat_image = CatImage(
        cat_id=cat.id,
        image_path=image_url,
        embedding=embedding,
    )
    db.add(cat_image)

    searcher = get_searcher()
    searcher.add_embedding(cat.id, embedding)
    searcher.save_index()

    if vaccine_status.strip():
        from datetime import datetime
        v_record = VaccineRecord(
            cat_id=cat.id,
            name="วัคซีนรวมแมว (ข้อมูลจากผู้ขาย)",
            date_given=datetime.now(),
            status=vaccine_status.strip()
        )
        db.add(v_record)

    db.commit()

    return {"message": "ลงขายสำเร็จ", "cat_id": cat.id}

@app.put("/api/cats/{cat_id}")
async def update_cat(
    cat_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    name: str = Form(...),
    price: float = Form(0),
    description: str = Form(""),
    status: str = Form("available"),
    breed: str = Form(None),
    color: str = Form(None),
    gender: str = Form(None),
    estimated_age: str = Form(None),
    weight: float = Form(None),
    location_name: str = Form(None),
    category: str = Form(None),
    image: UploadFile = File(None)
):
    cat = db.query(Cat).filter(Cat.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Cat not found")
    if cat.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    cat.name = name
    cat.price = price
    cat.description = description
    cat.status = status
    if breed is not None:
        cat.breed = breed
    if color is not None:
        cat.color = color
    if gender is not None:
        cat.gender = gender
    if estimated_age is not None:
        cat.estimated_age = estimated_age
    if weight is not None:
        cat.weight = weight
    if location_name is not None:
        cat.location_name = location_name
    if category is not None:
        cat.category = category

    # Handle new image upload
    if image and image.filename:
        raw = await image.read()
        saved = await save_upload_bytes(content=raw, prefix=f"cat_{cat.id}")
        if cat.images:
            cat.images[0].image_path = saved
        else:
            new_img = CatImage(cat_id=cat.id, image_path=saved)
            db.add(new_img)

    db.commit()
    return {"message": "อัปเดตข้อมูลสำเร็จ"}

@app.delete("/api/cats/{cat_id}")
def delete_cat(
    cat_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    cat = db.query(Cat).filter(Cat.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Cat not found")
    if cat.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.query(Order).filter(Order.cat_id == cat.id).update({"cat_id": None})
    db.delete(cat)
    db.commit()
    return {"message": "ลบข้อมูลสำเร็จ"}

@app.get("/api/cats/{cat_id}")
def get_cat_details(
    cat_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    """Get full details/passport for a specific cat."""
    cat = (
        db.query(Cat)
        .options(joinedload(Cat.owner), joinedload(Cat.images), joinedload(Cat.vaccines))
        .filter(Cat.id == cat_id)
        .first()
    )
    if not cat:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลแมว")
        
    res = _cat_result(cat)
    res["description"] = cat.description or ""
    res["location_name"] = cat.location_name or ""
    res["created_at"] = cat.created_at.isoformat()
    res["vaccines"] = [
        {
            "id": v.id,
            "name": v.name,
            "date_given": v.date_given.isoformat(),
            "next_due_date": v.next_due_date.isoformat() if v.next_due_date else None,
            "status": v.status,
        }
        for v in cat.vaccines
    ]
    return res


# -----------------------------
# Search & YOLOv5 AI
# -----------------------------

@app.post("/api/search")
async def search_face(
    db: Annotated[Session, Depends(get_db)],
    image: UploadFile = File(...),
):
    """Upload an image to find visually similar cats for sale."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="กรุณาอัปโหลดไฟล์รูปภาพ")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="ไฟล์รูปว่างเปล่า")

    try:
        _, _, embedding = prepare_face_image(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"AI ไม่สามารถตรวจจับใบหน้าได้: {exc}") from exc

    matches = get_searcher().search(embedding, k=10)
    if not matches:
        return {"results": []}

    results = []
    seen_cats = set()

    for cat_id, distance in matches:
        if cat_id in seen_cats:
            continue
        seen_cats.add(cat_id)

        cat = (
            db.query(Cat)
            .options(joinedload(Cat.owner), joinedload(Cat.images))
            .filter(Cat.id == cat_id)
            .first()
        )
        # Only show available cats in search results
        if not cat or cat.status != "available":
            continue

        confidence = distance_to_confidence(distance)
        results.append(_cat_result(cat, confidence))

    return {"results": results[:5]} # Top 5


# -----------------------------
# Shelters Map (GPS)
# -----------------------------

@app.get("/api/shelters/nearby")
def get_nearby_shelters(
    db: Annotated[Session, Depends(get_db)],
    lat: float = Query(None),
    lng: float = Query(None),
):
    """Return shelters/shops for the GPS map."""
    shelters = db.query(Shelter).all()
    results = []
    for s in shelters:
        results.append({
            "id": s.id,
            "name": s.name,
            "address": s.address,
            "phone": s.phone,
            "lat": s.lat,
            "lng": s.lng,
        })
    return {"results": results}


# -----------------------------
# Orders & Escrow
# -----------------------------

from pydantic import BaseModel
class OrderCreate(BaseModel):
    cat_id: int | None = None
    seller_id: int | None = None
    order_type: str = "cat"
    price: float
    discount: float = 0.0
    tag: str | None = None

def _resolve_order_seller(db: Session, req: OrderCreate, current_user: User) -> int:
    if req.seller_id:
        seller = db.get(User, req.seller_id)
        if seller:
            return seller.id

    if req.cat_id:
        cat = db.get(Cat, req.cat_id)
        if cat and cat.owner_id:
            return cat.owner_id

    seller = db.query(User).filter(User.role == "seller", User.id != current_user.id).first()
    if seller:
        return seller.id

    platform_seller = db.query(User).filter(User.email == "platform@meowmatch.local").first()
    if not platform_seller:
        platform_seller = User(
            name="MeowMatch Platform",
            email="platform@meowmatch.local",
            password_hash=hash_password("password123"),
            role="seller",
        )
        db.add(platform_seller)
        db.commit()
        db.refresh(platform_seller)
    return platform_seller.id

@app.post("/api/orders")
def create_order(
    req: OrderCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a new order and put funds in holding (Escrow)."""
    seller_id = _resolve_order_seller(db, req, current_user)
    fee_pct = 0.05 if req.order_type == "cat" else 0.10
    fee = (req.price - req.discount) * fee_pct
    net_amount = (req.price - req.discount) - fee
    
    order = Order(
        buyer_id=current_user.id,
        seller_id=seller_id,
        cat_id=req.cat_id,
        order_type=req.order_type,
        price=req.price,
        fee=fee,
        discount=req.discount,
        net_amount=net_amount,
        status="holding",
        tag=req.tag
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Auto-create chat room or get existing
    room = db.query(ChatRoom).filter(
        ChatRoom.buyer_id == current_user.id,
        ChatRoom.seller_id == seller_id,
    ).first()
    
    if not room:
        room = ChatRoom(buyer_id=current_user.id, seller_id=seller_id, order_id=order.id)
        db.add(room)
        db.commit()
        db.refresh(room)
    else:
        room.order_id = order.id
        db.commit()
        
    # Send system message
    msg_text = f"🛡️ สร้างออเดอร์ใหม่แล้ว (เงินถูกพักไว้ในระบบ)\nกรุณากดยืนยันรับแมว/เข้าพักเมื่อเสร็จสิ้น"
    sys_msg = ChatMessage(room_id=room.id, content=msg_text, is_system=True)
    db.add(sys_msg)
    
    if req.cat_id:
        cat = db.query(Cat).get(req.cat_id)
        if cat:
            cat.status = "sold" # Mark as sold temporarily or pending
            
    db.commit()
    
    return {"message": "Order created", "order_id": order.id, "room_id": room.id, "tag": order.tag}


@app.get("/api/orders")
def get_orders(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get orders where the current user is either the buyer or seller."""
    # Fetch orders where the user is either buyer or seller
    orders = db.query(Order).filter(
        (Order.buyer_id == current_user.id) | (Order.seller_id == current_user.id)
    ).order_by(Order.created_at.desc()).all()
    
    results = []
    for o in orders:
        # Resolve item details and images
        item_name = ""
        item_image = ""
        if o.cat:
            item_name = o.cat.name
            if o.cat.images:
                item_image = o.cat.images[0].image_path
        elif o.order_type == "hotel":
            item_name = "บริการรับฝากเลี้ยง"
            item_image = ""
        elif o.order_type == "clinic":
            item_name = "แพ็กเกจคลินิก"
            item_image = ""
        elif o.order_type == "food":
            item_name = "อาหารแมว/สินค้า"
            item_image = ""
        elif o.order_type == "accessory":
            item_name = "อุปกรณ์แมว/สินค้า"
            item_image = ""
        else:
            item_name = "สินค้าอื่นๆ"
            item_image = ""
        
        # We also need buyer/seller names
        buyer_name = o.buyer.name if o.buyer else ""
        seller_name = o.seller.name if o.seller else ""
        
        results.append({
            "id": f"ORD-{o.id:06d}",
            "raw_id": o.id,
            "buyerName": buyer_name,
            "sellerName": seller_name,
            "item": item_name,
            "type": o.order_type,
            "price": o.price,
            "fee": o.fee,
            "discount": o.discount,
            "net_amount": o.net_amount,
            "status": o.status,
            "tag": o.tag,
            "date": o.created_at.strftime("%d %b %Y %H:%M"),
            "created_at_iso": o.created_at.isoformat(),
            "image": f"http://localhost:8000{item_image}" if item_image else ""
        })
        
    return {"results": results}


@app.put("/api/orders/{order_id}/release")
def release_order_funds(
    order_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    order.status = "completed"
    
    room = db.query(ChatRoom).filter(ChatRoom.order_id == order.id).first()
    if room:
        sys_msg = ChatMessage(
            room_id=room.id, 
            content=f"✅ ผู้ซื้อยืนยันการรับแมวแล้ว\n💰 แพลตฟอร์มได้โอนเงิน ฿{order.net_amount:,.2f} ให้ผู้ขายแล้ว (หักค่าธรรมเนียม = ฿{order.fee:,.2f})", 
            is_system=True
        )
        db.add(sys_msg)
        
    db.commit()
    return {"message": "Funds released"}

@app.put("/api/orders/{order_id}/cancel")
def cancel_order(
    order_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if current_user.id not in [order.buyer_id, order.seller_id]:
        raise HTTPException(status_code=403, detail="Not authorized")

    order.status = "cancelled"

    if order.cat:
        order.cat.status = "available"

    room = db.query(ChatRoom).filter(ChatRoom.order_id == order.id).first()
    if room:
        sys_msg = ChatMessage(
            room_id=room.id,
            content="❌ คำสั่งซื้อถูกยกเลิกแล้ว",
            is_system=True,
        )
        db.add(sys_msg)

    db.commit()
    return {"message": "Order cancelled", "status": order.status}


# -----------------------------
# Chat System
# -----------------------------

@app.get("/api/chats")
def list_chats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    rooms = db.query(ChatRoom).filter(
        (ChatRoom.buyer_id == current_user.id) | (ChatRoom.seller_id == current_user.id)
    ).all()
    
    results = []
    for r in rooms:
        # Determine the other party
        other_user = r.seller if r.buyer_id == current_user.id else r.buyer
        role = "buyer" if r.buyer_id == current_user.id else "seller"
        
        last_msg = db.query(ChatMessage).filter(ChatMessage.room_id == r.id).order_by(ChatMessage.created_at.desc()).first()
        results.append({
            "room_id": r.id,
            "order_id": r.order_id,
            "order_status": r.order.status if r.order else None,
            "other_user": {"id": other_user.id, "name": other_user.name},
            "my_role": role,
            "last_message": last_msg.content if last_msg else None,
            "updated_at": last_msg.created_at.isoformat() if last_msg else r.created_at.isoformat()
        })
    return {"results": results}

@app.get("/api/chats/{room_id}")
def get_chat_history(
    room_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(404, "Chat not found")
        
    if current_user.id not in [room.buyer_id, room.seller_id]:
        raise HTTPException(403, "Not authorized")
        
    messages = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.created_at.asc()).all()
    
    return {
        "room_id": room.id,
        "order_id": room.order_id,
        "order_status": room.order.status if room.order else None,
        "other_user_name": room.buyer.name if current_user.id == room.seller_id else room.seller.name,
        "messages": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "content": m.content,
                "is_system": m.is_system,
                "created_at": m.created_at.isoformat()
            } for m in messages
        ]
    }

class MessageCreate(BaseModel):
    content: str

@app.post("/api/chats/{room_id}/messages")
def send_message(
    room_id: int,
    req: MessageCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room or current_user.id not in [room.buyer_id, room.seller_id]:
        raise HTTPException(404, "Chat not found or access denied")
        
    msg = ChatMessage(room_id=room_id, sender_id=current_user.id, content=req.content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    return {
        "id": msg.id,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
        "sender_id": msg.sender_id,
    }

# -----------------------------
# Admin Dashboard
# -----------------------------

@app.get("/api/admin/users")
def get_all_users(db: Annotated[Session, Depends(get_db)]):
    users = db.query(User).all()
    results = []
    for u in users:
        results.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role
        })
    return {"results": results}

@app.get("/api/admin/orders")
def get_all_orders(db: Annotated[Session, Depends(get_db)]):
    orders = db.query(Order).options(joinedload(Order.buyer), joinedload(Order.seller), joinedload(Order.cat)).all()
    results = []
    for o in orders:
        results.append({
            "id": o.id,
            "type": o.order_type,
            "net_amount": o.net_amount,
            "status": o.status,
            "created_at_iso": o.created_at.isoformat(),
        })
    return {"results": results}

@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Simple cascade handling
    db.query(Order).filter((Order.buyer_id == user.id) | (Order.seller_id == user.id)).delete()
    db.query(Cat).filter(Cat.owner_id == user.id).delete()
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

@app.delete("/api/admin/cats/{cat_id}")
def admin_delete_cat(cat_id: int, db: Annotated[Session, Depends(get_db)]):
    cat = db.query(Cat).filter(Cat.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Cat not found")
    db.query(Order).filter(Order.cat_id == cat.id).update({"cat_id": None})
    db.delete(cat)
    db.commit()
    return {"message": "Cat deleted"}

@app.delete("/api/admin/orders/{order_id}")
def delete_order(order_id: int, db: Annotated[Session, Depends(get_db)]):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.query(ChatRoom).filter(ChatRoom.order_id == order.id).delete()
    db.delete(order)
    db.commit()
    return {"message": "Order deleted"}
