# Agriflow Backend - Synchronized with Frontend

Complete backend for the Agriflow agricultural marketplace application, fully synchronized with the frontend123 application.

## Features

✓ User authentication (Login/Register)
✓ Role-based access (farmer, buyer, admin, agent)
✓ Crop management (CRUD operations)
✓ Quality inspection system
✓ Order management
✓ Marketplace listings
✓ Delivery tracking
✓ Admin dashboard

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt for password hashing

## Project Structure

```
backend-sync/
├── controllers/        # Business logic
├── routes/            # API endpoints
├── middleware/        # Auth & custom middleware
├── models/            # Database schema
├── uploads/           # File uploads directory
├── index.js           # Server entry point
├── db.js              # Database connection
├── package.json       # Dependencies
└── .env.example       # Environment variables template
```

## Setup Instructions

### 1. Prerequisites

- Node.js (v14+)
- PostgreSQL database
- npm or yarn

### 2. Installation

```bash
# Navigate to backend directory
cd backend-sync

# Install dependencies
npm install

# Or with yarn
yarn install
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb agriflow

# Or in psql:
CREATE DATABASE agriflow;
```

### 4. Environment Configuration

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - DATABASE_URL: PostgreSQL connection string
# - JWT_SECRET: Secret key for JWT tokens
# - CORS_ORIGIN: Frontend URL (http://localhost:5173)
# - PORT: Server port (default: 5000)
```

Example `.env`:
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/agriflow
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### 5. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server should start on `http://localhost:5000`

## API Endpoints

### Authentication (`/api/users`)
- `POST /register` - Create new user
- `POST /login` - User login
- `GET /profile` - Get user profile (protected)
- `PUT /profile` - Update user profile (protected)

### Crops (`/api/crops`)
- `GET /` - Get all listed crops
- `GET /:id` - Get crop details
- `POST /` - Create crop (farmer only)
- `PUT /:id` - Update crop (farmer only)
- `DELETE /:id` - Delete crop (farmer only)
- `GET /farmer/:farmerId` - Get farmer's crops

### Farmer (`/api/farmer`)
- `GET /profile` - Get farmer profile
- `PUT /profile` - Update farmer profile
- `GET /crops` - Get my crops
- `GET /orders` - Get my orders

### Buyers (`/api/buyers`)
- `GET /profile` - Get buyer profile
- `PUT /profile` - Update buyer profile
- `GET /orders` - Get my orders

### Orders (`/api/orders`)
- `POST /` - Create order
- `GET /` - Get all orders
- `GET /:id` - Get order details
- `PUT /:id/status` - Update order status
- `PUT /:id/payment` - Update payment status
- `PUT /:id/cancel` - Cancel order

### Agent (`/api/agent`)
- `POST /inspections` - Create quality report
- `GET /inspections/pending` - Get pending inspections
- `GET /inspections/crop/:cropId` - Get crop reports
- `GET /deliveries` - Get my deliveries
- `PUT /deliveries/:deliveryId` - Update delivery status

### Admin (`/api/admin`)
- `GET /users` - Get all users
- `GET /crops` - Get all crops
- `POST /crops/:cropId/approve` - Approve crop
- `POST /crops/:cropId/reject` - Reject crop
- `POST /crops/:cropId/list` - List crop on marketplace
- `GET /orders` - Get all orders
- `GET /stats` - Get dashboard statistics

## Database Schema

### Users
- Basic user information
- Email & password (hashed)
- Role-based access

### Farmers
- Extended farmer profile
- Farm details, certifications, experience

### Buyers
- Extended buyer profile
- Company info, preferences

### Crops
- Crop details, images, pricing
- Status tracking (pending → approved → listed → sold)

### Quality Reports
- Inspection records
- Agent recommendations

### Orders
- Order details, status tracking
- Payment information

### Transport Logs
- Delivery tracking
- Agent assignment

### Marketplace Listings
- Active marketplace crops
- Availability & pricing

## Frontend Synchronization

This backend is fully synchronized with `frontend123`:

### Matching Points:

1. **Authentication**
   - Frontend: `useAuthStore` → Backend: `/api/users/login|register`
   - Token storage: `localStorage['token']` → JWT validation

2. **Data Types**
   - Frontend TypeScript types match database schema
   - User roles: farmer, buyer, admin, agent

3. **API Endpoints**
   - Frontend API calls to `http://localhost:5000/api/*`
   - All endpoints match frontend requirements

4. **Protected Routes**
   - Frontend: ProtectedRoute components
   - Backend: authenticateToken middleware

## Testing the Backend

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Register User
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Farmer",
    "email": "john@example.com",
    "password": "securepass123",
    "role": "farmer"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

### Get Profile (Authenticated)
```bash
curl http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Server port |
| NODE_ENV | development | Environment mode |
| DATABASE_URL | - | PostgreSQL connection string |
| JWT_SECRET | - | JWT signing secret (change in production!) |
| CORS_ORIGIN | http://localhost:5173 | Frontend URL |
| MAX_FILE_SIZE | 10485760 | Max upload size (10MB) |
| UPLOAD_DIR | ./uploads | File uploads directory |

## Development Tips

### Common Issues

1. **Database Connection Error**
   - Check DATABASE_URL in `.env`
   - Ensure PostgreSQL is running
   - Verify database exists

2. **JWT Token Invalid**
   - Ensure JWT_SECRET matches between calls
   - Check token expiration (24h)

3. **CORS Issues**
   - Verify CORS_ORIGIN matches frontend URL
   - Check browser console for errors

4. **Port Already in Use**
   - Change PORT in `.env`
   - Or kill existing process on port 5000

## Production Deployment

1. Change `JWT_SECRET` to a strong random value
2. Set `NODE_ENV=production`
3. Use a managed PostgreSQL database
4. Enable HTTPS
5. Implement rate limiting
6. Add request validation
7. Setup monitoring & logging

## Support & Documentation

For issues or questions:
- Check API endpoints documentation above
- Review database schema
- Check environment configuration
- Review frontend code for integration patterns

---

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: November 2025
