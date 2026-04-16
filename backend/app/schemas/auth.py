from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class StaffProfile(BaseModel):
    id: str
    name: str
    role: str
    department: str | None = None
    email: str | None = None
