# Weather Web Server

Express.js web server that provides REST API endpoints for querying weather data stored in MongoDB.

## Prerequisites

- Node.js 20.10.0 (or any 20.x version)
- pnpm 8.15.0 (or any 8.x version)
- MongoDB (cloud instance or local)
- MongoDB database populated by the pipeline service

## Setup and Running

1. **Install pnpm (if not already installed):**
   ```bash
   npm install -g pnpm
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   Create a `.env` file:
   ```env
   MONGODB_URI=mongodb://your-mongodb-uri/weather
   PORT=3000
   NODE_ENV=development
   LOG_LEVEL=info
   WEATHER_API_BASE_URL=https://us-east1-climacell-platform-production.cloudfunctions.net/weather-data
   ```

4. **Build the project:**
   ```bash
   pnpm build
   ```

5. **Start the server:**
   ```bash
   pnpm start
   ```

   Or for development with auto-reload:
   ```bash
   pnpm dev
   ```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

The API provides the following endpoints:

- **GET /api/weather/data** - Get weather forecast data for a specific location (requires `lat` and `lon` query parameters)
- **GET /api/weather/summarize** - Get min, max, and average weather data for a specific location (requires `lat` and `lon` query parameters)
- **GET /api/batches** - Get all batch metadata with status information
- **GET /health** - Health check endpoint

For detailed API documentation including request/response schemas, examples, and interactive testing, visit the **Swagger UI** at:

**http://localhost:3000/api-docs** (or your deployed URL + `/api-docs`)

The Swagger documentation provides:
- Complete endpoint descriptions
- Request/response schemas
- Query parameter specifications
- Interactive API testing
- Example requests and responses


## Project Structure

```
webserver/
├── src/
│   ├── index.ts                 # Main server entry point
│   ├── config/
│   │   └── database.ts          # MongoDB connection
│   ├── controllers/
│   │   ├── weather.controller.ts    # Weather endpoints with business logic
│   │   └── batches.controller.ts   # Batches endpoint with business logic
│   ├── routes/
│   │   ├── index.ts             # Main router
│   │   ├── weather.routes.ts    # Weather routes
│   │   └── batches.routes.ts    # Batches routes
│   ├── middleware/
│   │   ├── request-logger.ts    # Request logging
│   │   ├── error-handler.ts     # Global error handler
│   │   ├── not-found.ts         # 404 handler
│   │   └── validate.ts          # Query validation
│   ├── models/
│   │   ├── WeatherData.ts        # Weather data schema
│   │   └── BatchMetadata.ts     # Batch metadata schema
│   ├── types/
│   │   └── interfaces.ts        # TypeScript interfaces
│   └── utils/
│       ├── logger.ts            # Logger utility
│       └── query-helpers.ts     # MongoDB query helpers
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

- `MONGODB_URI` - MongoDB connection string (required)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `WEATHER_API_BASE_URL` - External API URL for batch status updates (optional)

## Data Requirements

The web server reads data from MongoDB that must be populated by the pipeline service. The server queries:

- **Latest 3 active batches** for weather data endpoints
- **All batches** for the batches metadata endpoint

## Deployment

### Render.com / Heroku / Similar Platforms

1. Set environment variables in your hosting platform
2. Ensure MongoDB is accessible from the cloud instance
3. Deploy the code
4. The server will start automatically

### Docker (Optional)

You can containerize the server, but ensure MongoDB connection is configured for your cloud MongoDB instance.

## Assumptions and Optimizations

1. **Location Matching**: Uses a tolerance of 0.01 degrees (≈1km) for latitude/longitude matching
2. **Batch Status Updates**: Status is updated on-demand when fetching batches (could be optimized with background job)
3. **Query Performance**: Uses MongoDB indexes on `(latitude, longitude)` and `batch_id` for efficient queries
4. **Aggregation**: Uses MongoDB aggregation pipeline for efficient min/max/avg calculations

## Error Handling

- All errors are logged with request IDs for tracing
- Proper HTTP status codes are returned
- Error messages include request IDs for support
- Development mode includes stack traces in error responses

## Logging

Structured JSON logging is used throughout:
- Request/response logging with timing
- Error logging with stack traces
- Debug logging in development mode
- Logs written to console and `logs/app.log` (in development)

## Notes

- The server is designed to be stateless and horizontally scalable
- MongoDB connection pooling is handled by Mongoose
- The server gracefully handles MongoDB connection failures
- Graceful shutdown ensures MongoDB connections are closed properly

