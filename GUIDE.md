# Homely Food Finder - Project Setup Guide

This guide explains how to run the Homely Food Finder project locally using **MongoDB** and how to publish it.

## Prerequisites

1.  **Node.js** (v18 or higher)
2.  **MongoDB Server** (Local or MongoDB Atlas)
3.  **Code Editor** (e.g., VS Code)

---

## 1. Database Setup

### Option A: Local MongoDB
1.  Install MongoDB Community Server from the official website.
2.  Start the MongoDB service.
3.  The default connection string is `mongodb://localhost:27017/homely_food`.

### Option B: MongoDB Atlas (Cloud)
1.  Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2.  Create a new Cluster and a Database named `homely_food`.
3.  Create a Database User with read/write permissions.
4.  Get your **Connection String** (e.g., `mongodb+srv://<user>:<password>@cluster0.mongodb.net/homely_food`).

---

## 2. Local Installation

1.  **Clone or Download** the project files.
2.  Open your terminal in the project root directory.
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  **Configure Environment Variables**:
    *   Create a file named `.env` in the root directory.
    *   Copy the contents from `.env.example` and fill in your MongoDB URI:
        ```env
        MONGODB_URI=mongodb://localhost:27017/homely_food
        PORT=3000
        NODE_ENV=development
        ```

---

## 3. Running the Project

1.  Start the development server:
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to `http://localhost:3000`.

---

## 4. Publishing (Deployment)

To publish your project to a live server (e.g., Heroku, DigitalOcean, or AWS):

### Step A: Build the Frontend
```bash
npm run build
```
This generates a `dist` folder with optimized static files.

### Step B: Prepare for Production
1.  Ensure your hosting provider supports Node.js.
2.  Set up a production MongoDB database (MongoDB Atlas is highly recommended).
3.  Update your environment variables on the hosting platform.
4.  Start the production server:
    ```bash
    NODE_ENV=production npm start
    ```

### Step C: Hosting Options
*   **Railway.app / Render.com**: Excellent for full-stack Node.js + MongoDB apps.
*   **Heroku**: Classic choice for Node.js apps.
*   **Vercel**: Can be used for the frontend, but you'll need to host the backend separately or use Next.js.

---

## Troubleshooting

*   **Database Connection Error**: The app attempts to connect to MongoDB using `MONGODB_URI`. If it fails (e.g., MongoDB is not running locally), it will **automatically fall back to a local SQLite database** (`local.db`) to ensure the app remains functional for testing.
*   **Firebase Billing Error**: Firebase Phone Auth (SMS) requires a Blaze plan for production. For testing in the AI Studio preview or locally without a paid plan:
    *   Use the **"Demo Login (No SMS)"** button in the app.
    *   Alternatively, add a **"Test Phone Number"** in your Firebase Console (Authentication > Settings > Phone Number).
*   **Port 3000 Busy**: Change the `PORT` in `.env` or kill the process using the port.
*   **Firebase Auth**: The app uses Firebase for Authentication. Ensure your Firebase config in `firebase-applet-config.json` is correct and that **Anonymous Authentication** is enabled in the Firebase Console if you wish to use the Demo Login.
