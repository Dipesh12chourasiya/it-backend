# Authentication Flow

JWT-based authentication with role-based access control (RBAC).

---

## Registration Flow

```
┌──────────┐     POST /api/v1/auth/register     ┌──────────┐
│ Frontend │ ──────────────────────────────────► │ Backend  │
└──────────┘                                     └──────────┘
                                                     │
                                              ┌──────┴──────┐
                                              │ Validate:   │
                                              │ name        │
                                              │ email       │
                                              │ password    │
                                              │ role        │
                                              └──────┬──────┘
                                                     │
                                              ┌──────┴──────┐
                                              │ Check email │
                                              │ uniqueness  │
                                              └──────┬──────┘
                                                     │
                                              ┌──────┴──────┐
                                              │ Hash pass   │
                                              │ (bcrypt,    │
                                              │  10 rounds) │
                                              └──────┬──────┘
                                                     │
                                              ┌──────┴──────┐
                                              │ Create User │
                                              │ in MongoDB  │
                                              └──────┬──────┘
                                                     │
                                              ┌──────┴──────┐
                                              │ Generate JWT│
                                              │ (user ID)   │
                                              └──────┬──────┘
                                                     │
┌──────────┐  { token, user }                   ┌────┴─────┐
│ Frontend │ ◄────────────────────────────────── │ Backend  │
└──────────┘                                     └──────────┘
```

---

## Login Flow

```
┌──────────┐     POST /api/v1/auth/login       ┌──────────┐
│ Frontend │ ──────────────────────────────────► │ Backend  │
└──────────┘                                     └──────────┘
                                                     │
                                              ┌──────┴──────┐
                                              │ Find user   │
                                              │ by email    │
                                              └──────┬──────┘
                                                     │
                                              ┌──────┴──────┐
                                              │ Compare     │
                                              │ password    │
                                              │ (bcrypt)    │
                                              └──────┬──────┘
                                                     │
                                              ┌──────┴──────┐
                                              │ Generate JWT│
                                              └──────┬──────┘
                                                     │
┌──────────┐  { token, user }                   ┌────┴─────┐
│ Frontend │ ◄────────────────────────────────── │ Backend  │
└──────────┘                                     └──────────┘
```

---

## JWT Token Structure

**Header**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "id": "user_id_string",
  "iat": 1750234800,
  "exp": 1750321200
}
```

**Signature**:
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```

---

## Protected Route Flow

```
┌──────────┐  GET /api/v1/sessions/active/123  ┌──────────┐
│ Frontend │ ──────────────────────────────────► │ Backend  │
│          │  Headers:                          └──────────┘
│          │  Authorization: Bearer <token>           │
└──────────┘                                    ┌─────┴─────┐
                                                │ protect    │
                                                │ middleware  │
                                                └─────┬─────┘
                                                      │
                                               ┌──────┴──────┐
                                               │ Extract     │
                                               │ token from  │
                                               │ header      │
                                               └──────┬──────┘
                                                      │
                                               ┌──────┴──────┐
                                               │ jwt.verify()│
                                               │ with secret │
                                               └──────┬──────┘
                                                      │
                                               ┌──────┴──────┐
                                               │ Find user   │
                                               │ by decoded  │
                                               │ id          │
                                               └──────┬──────┘
                                                      │
                                               ┌──────┴──────┐
                                               │ Attach user │
                                               │ to req.user │
                                               └──────┬──────┘
                                                      │
                                               ┌──────┴──────┐
                                               │ Route       │
                                               │ handler     │
                                               └─────────────┘
```

---

## RBAC Middleware

```typescript
// Role-based access control
authorize('recruiter')  // Only recruiter role
authorize('candidate')  // Only candidate role
authorize('recruiter', 'candidate')  // Both roles
```

**Flow**:
```
Request → protect → authorize(roles) → Controller
                    │
                    ├─ req.user.role in allowed roles?
                    │   ├─ Yes → continue
                    │   └─ No → 403 Forbidden
```

---

## Frontend Token Management

```
┌─────────────────────────────────────────────────┐
│                  TokenService                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  setToken(token)    → localStorage.setItem()     │
│  getToken()         → localStorage.getItem()     │
│  removeToken()      → localStorage.removeItem()  │
│  hasToken()         → !!getToken()               │
│                                                  │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              authInterceptor                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Read token from TokenService                 │
│  2. Clone request with Authorization header      │
│  3. Attach to all HttpClient requests            │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Error Responses

| Scenario | Status | Message |
|---|---|---|
| No token provided | 401 | Not authorized |
| Invalid token | 401 | Invalid token |
| Expired token | 401 | Invalid token |
| Insufficient permissions | 403 | Forbidden |
| Invalid credentials | 401 | Invalid credentials |
| Email already exists | 400 | User already exists |
