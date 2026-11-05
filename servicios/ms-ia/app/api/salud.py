from fastapi import APIRouter

router = APIRouter()


@router.get("/salud")
async def salud() -> dict[str, str]:
    """Liveness: el proceso esta arriba. Publico, sin JWT."""
    return {"estado": "ok"}
