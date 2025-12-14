# ShortDrama (Local POC)

## Project Overview

This repository contains a local-first proof of concept for the ShortDrama platform. It is a video processing and delivery platform that allows admins to upload raw videos, which are then processed by an AI worker to produce vertical videos, thumbnails, and subtitles. The processed videos are then made available to viewers through a web interface.

The project is composed of four main services orchestrated with Docker Compose:

*   **API Server:** A Node.js application built with Fastify and TypeScript. It provides a RESTful API for the admin dashboard and the viewer application. It uses Prisma as an ORM to interact with the PostgreSQL database.
*   **AI Worker:** A Python script that uses FFmpeg and MediaPipe to process videos. It continuously polls the API server for new jobs, downloads raw videos from S3, processes them, and uploads the results back to S3.
*   **PostgreSQL:** The main database for the platform, used to store information about users, series, episodes, and user progress.
*   **MinIO:** An S3-compatible object storage service used to store raw and processed videos.

## Building and Running

### Prerequisites

*   Docker Desktop

### Quick Start (local)

1.  **Environment Variables:** Copy the contents of `config/env.example` and export them in your shell, or configure them in your Docker environment.
2.  **Start the services:**
    ```bash
    docker compose up --build
    ```
3.  **Access the applications:**
    *   **Viewer:** `http://localhost:3000/app`
    *   **Admin:** `http://localhost:3000/admin`
    *   **MinIO Console:** `http://localhost:9001` (user/pass: `minioadmin` / `minioadmin` by default)

### Development Conventions

*   **Server:** The server is a TypeScript application. To run it in development mode with hot-reloading, use the following command:
    ```bash
    cd server
    npm run dev
    ```
*   **Worker:** The worker is a Python script.
*   **Database:** The database schema is managed with Prisma. To push schema changes to the database, use the following command:
    ```bash
    cd server
    npm run db:push
    ```
    To open the Prisma Studio to view and edit data in the database, use the following command:
    ```bash
    cd server
    npm run prisma:studio
    ```
