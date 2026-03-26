# HomelyFood - Project Run Instructions

This document contains all the necessary commands and instructions to run the HomelyFood full-stack application locally. The project uses React (Vite) for the frontend, Express for the backend, and supports both SQLite (zero-config) and MongoDB for the database.

## 1. Prerequisites
Ensure you have the following installed on your machine:
- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

## 2. Database Setup
By default, the application uses a local SQLite database (`local.db`) which requires zero configuration. It will automatically create the tables and seed default data when you start the server.

If you prefer to use MongoDB:
- Create a file named `.env` in the root directory.
- Add your MongoDB connection string: `MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/homelyfood`

## 3. Installation
Open your terminal, navigate to the project root directory, and install the dependencies:
```bash
npm install
```

## 4. Running the Application (Development)
To start both the frontend (Vite) and backend (Express) concurrently in development mode, run:
```bash
npm run dev
```
The application will be accessible at: `http://localhost:3000`

## 5. Building for Production
To compile the frontend assets and prepare the application for production deployment, run:
```bash
npm run build
```

## 6. Running in Production
After building the project, you can start the production server using:
```bash
npm start
```

## 7. Troubleshooting
If you encounter any issues:
- Ensure port 3000 is not being used by another application.
- If using MongoDB, verify your connection string and network access settings.
- Try deleting the `node_modules` folder and running `npm install` again if dependencies fail.
