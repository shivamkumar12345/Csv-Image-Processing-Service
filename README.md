# Image Processing Service

This project provides an image processing service that can handle CSV uploads containing product names and image URLs, compress the images, upload them to the cloud, and store the processed data in a MongoDB database. The service also includes functionalities to check the processing status of uploaded files.

# Low-Level Design (LLD) for Image Processing Service

# Component Descriptions
1. Express Server
    Role: Entry point of the application, handling incoming HTTP requests and routing them to the appropriate handlers.
    Key Files:
    app.js: Main application file, sets up middleware, routes, and starts the server.
    router/productRoute.js: Defines routes for uploading CSV files and checking status.
2. Multer Middleware
    Role: Handles multipart/form-data for file uploads, ensuring files are saved to the correct directory with unique filenames.
    Key Files:
    middleware/fileUpload.js: Configures Multer to handle file uploads, defines storage location, filename format, and file type validation.
3. Image Processing Service
    Role: Manages the entire image processing pipeline, including CSV parsing, image downloading, compression, and cloud uploading.
    Key Files:
    services/imageProcess.js: Contains functions for downloading images, compressing images, uploading to Cloudinary, and managing the processing status.
    services/cloudUpload.js: Handles interaction with Cloudinary for image uploads.

# Workflow:
    CSV Parsing: Converts uploaded CSV files to JSON objects.
    Image Downloading: Downloads images from URLs specified in the CSV.
    Image Compression: Compresses downloaded images using the compress-images library.
    Cloud Uploading: Uploads compressed images to Cloudinary and retrieves URLs.
    Status Management: Updates the status of each request and handles cleanup of temporary files.

4. Database Service
    Role: Manages the connection to MongoDB and handles the insertion of processed image data.
    Key Files:
    services/db.js: Configures and establishes the connection to MongoDB.
    models/products.js: Defines the schema for storing product data.

5. Cloudinary Service
    Role: Uploads compressed images to Cloudinary and returns URLs.
    Key Files:
    services/cloudUpload.js: Contains the function to upload images to Cloudinary.

6. Status Check Endpoint
    Role: Allows users to check the status of their image processing request.
    Key Files:
    router/productRoute.js: Defines the endpoint to get the status of a request.




## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [File Structure](#file-structure)
- [Dependencies](#dependencies)
- [Environment Variables](#environment-variables)

## Installation

1. **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Set up environment variables:**

    Create a `.env` file in the root directory and add your MongoDB and Cloudinary credentials:
    ```env
    PORT=8080
    MONGODB_URI=<your-mongodb-uri>
    CLOUD_NAME=<your-cloudinary-cloud-name>
    API_KEY=<your-cloudinary-api-key>
    API_SECRET=<your-cloudinary-api-secret>
    ```

4. **Run the server:**
    ```bash
    npm start
    ```

## Usage

1. **Upload a CSV file:**
   - Go to `http://localhost:8080/`.
   - Use the provided form to upload a CSV file containing product names and image URLs.

2. **Check the status of the processing:**
   - Use the `GET /product/status/:requestId` endpoint to check the status of your file processing.

## API Endpoints

### `POST /product/upload`

Uploads a CSV file for processing.

**Request:**
- **Headers:**
  - `Content-Type: multipart/form-data`
- **Body:**
  - `input_data`: The CSV file to be uploaded.

**Response:**
- `200 OK`: File uploaded successfully.
- `400 Bad Request`: Error in file upload.

### `GET /product/status/:requestId`

Checks the processing status of an uploaded file.

**Request:**
- **Params:**
  - `requestId`: The ID of the request.

**Response:**
- `200 OK`: Returns the processing status.
- `404 Not Found`: Request ID not found.

## File Structure

.
├── middleware/
│ └── fileUpload.js # Middleware for file upload using multer
├── models/
│ └── products.js # MongoDB model for products
├── public/
│ ├── compressed/ # Directory for compressed images
| |___ images/ #directory for input csv images
│ └── uploads/ # Directory for uploaded CSV files
├── router/
│ └── productRoute.js # Routes for product-related endpoints
├── services/
│ ├── db.js # Database connection
│ ├── imageProcess.js # Image processing logic
│ └── cloudUpload.js # Cloudinary upload logic
├── views/
│ └── index.ejs # EJS template for file upload form
├── .env # Environment variables
├── .gitignore # Git ignore file
├── app.js # Main application file
├── package.json # Node.js dependencies and scripts
└── README.md # Project documentation




## Dependencies

- `express`: Fast, unopinionated, minimalist web framework for Node.js
- `body-parser`: Node.js body parsing middleware
- `dotenv`: Loads environment variables from a `.env` file into `process.env`
- `cors`: Express middleware to enable CORS
- `csvtojson`: CSV to JSON converter
- `compress-images`: Node.js module for image compression
- `fs`: Node.js file system module
- `https`: Node.js HTTPS module
- `multer`: Node.js middleware for handling `multipart/form-data`
- `mongoose`: MongoDB object modeling tool
- `cloudinary`: Node.js SDK for Cloudinary

## Environment Variables

Ensure you have a `.env` file in the root directory with the following variables:

```env
PORT=8080
MONGODB_URI=<your-mongodb-uri>
CLOUD_NAME=<your-cloudinary-cloud-name>
API_KEY=<your-cloudinary-api-key>
API_SECRET=<your-cloudinary-api-secret>
