from database import SessionLocal, User, Cat, CatImage, init_db
from auth import hash_password

db = SessionLocal()
if db.query(User).count() == 0:
    u = User(name="Test Seller", email="seller@meow.com", password_hash=hash_password("password"), role="seller")
    db.add(u)
    db.commit()
    db.refresh(u)
    
    cats = [
        Cat(owner_id=u.id, name="Milo", breed="Persian", color="White", gender="male", estimated_age="young", weight=4.5, category="cat", price=5500, location_name="Bangkok"),
        Cat(owner_id=u.id, name="Premium Royal Canin", category="food", price=1200, location_name="Bangkok", description="อาหารแมวเกรดพรีเมียม"),
    ]
    db.add_all(cats)
    db.commit()
    print("Database seeded!")
else:
    print("Database already has data.")
