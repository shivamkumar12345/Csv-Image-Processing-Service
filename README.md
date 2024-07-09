# Image Processing Service

This project provides an image processing service that can handle CSV uploads containing product names and image URLs, compress the images, upload them to the cloud, and store the processed data in a MongoDB database. The service also includes functionalities to check the processing status of uploaded files.

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


how to make this code async 

const download = async function(product){

    const images = product.InputImageUrls.split(',');
    const outputImages={};
            
    images.map(async (inputImage)=>{
        const ext = inputImage.toString().split('.').pop();
        const storedImage = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.'+ ext;
        
        https.get(inputImage, function( res){

            res.pipe(fs.createWriteStream("./public/image/" + storedImage));
          })
          .on('close',()=>{
            // image compression start
                compressImage(storedImage)
                .then(res=>{
                        //imageUpload on cloud
                        imageUploadOnCloud("./public/compressed/"+storedImage,'compressed')
                        .then(res=>{
                            outputImages[inputImage]=res.url;
                            console.log(res,'outputimage');
                            return;
                        }).catch(err=>{
                            requestStatuses[requestId] = 'rejected';
                            return; 
                        })
        
                })
                .catch(err=>{
                    requestStatuses[requestId] = 'rejected';
                    return;
                })
          });
    })
    return outputImages;
  
};
ChatGPT
To convert your code to be truly asynchronous, you need to ensure that you are handling asynchronous operations correctly. The map function should be replaced with for...of loop to handle async operations. You also need to properly await each async function within the loop. Here's how you can refactor your code:

javascript
Copy code
const https = require('https');
const fs = require('fs');
const { compressImage, imageUploadOnCloud } = require('./yourModule'); // Adjust the module path accordingly

const download = async function (product) {
    const images = product.InputImageUrls.split(',');
    const outputImages = {};

    for (const inputImage of images) {
        const ext = inputImage.toString().split('.').pop();
        const storedImage = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + ext;

        await new Promise((resolve, reject) => {
            https.get(inputImage, function (res) {
                const fileStream = fs.createWriteStream("./public/image/" + storedImage);
                res.pipe(fileStream);
                
                fileStream.on('finish', async () => {
                    fileStream.close();
                    try {
                        // Image compression
                        await compressImage(storedImage);

                        // Image upload on cloud
                        const uploadResult = await imageUploadOnCloud("./public/compressed/" + storedImage, 'compressed');
                        outputImages[inputImage] = uploadResult.url;
                        console.log(uploadResult, 'outputimage');
                        resolve();
                    } catch (err) {
                        console.error(err);
                        reject(err);
                    }
                });
                
                fileStream.on('error', (err) => {
                    console.error(err);
                    reject(err);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    return outputImages;
};
Here's a summary of the changes:

Replace map with for...of: The for...of loop allows you to use await within the loop to ensure each iteration waits for the asynchronous operations to complete.
Use await new Promise: This ensures that each HTTP GET request and subsequent file write operation is awaited before proceeding to the next image.
Handle the completion of the file stream: The finish event of the file stream is awaited to ensure the file is completely written before proceeding with compression and upload.
Proper error handling: Added error handling within the promise to catch and log any errors that occur during the download, compression, or upload processes.
const imageProcess = async(requestId, file)=>{
     const products =[];
     const outputProducts=[];
     try{
        csv()
        .fromFile(file.path)
        .then(async (jsonObj)=>{
            jsonObj.map(product=>{
                products.push({productName: product['Product Name'],
                    InputImageUrls: product['Input Image Urls']
                });
            });
            
            try{
                for(const product of products){
                    const outputImages =await download(product);
                    const values = Object.values(outputImages).join(',');
                    outputProducts.push({requestId,outputImageUrls:values, ...product}) 
                }

                // add processed image into database
                await ProductSchema.insertMany(outputProducts);
                requestStatuses[requestId] = 'completed';

            }catch(err){
                requestStatuses[requestId] = 'rejected';
                console.log(err);
                return;
            }
            
           
        })
     }catch(err){
        requestStatuses[requestId] = 'rejected';
        return;
     }
    
}
how to delete files and images storeed in public folder after completetion of this function
ChatGPT
To delete files and images stored in the public folder after the completion of the imageProcess function, you can use the fs.unlink method to remove the files. Here is how you can integrate the deletion of files into your code:

Collect the paths of files to delete: During the processing, collect the paths of all the files that you create.
Delete the files after processing: Use fs.unlink to delete the files after the processing is complete.
Here is how you can modify your code to include file deletion:

javascript
Copy code
const fs = require('fs');
const csv = require('csvtojson');
const { download } = require('./yourModule'); // Adjust the module path accordingly
const ProductSchema = require('./ProductSchema'); // Adjust the module path accordingly
const requestStatuses = {}; // Your requestStatuses object

const imageProcess = async (requestId, file) => {
    const products = [];
    const outputProducts = [];
    const filesToDelete = [];

    try {
        const jsonObj = await csv().fromFile(file.path);
        jsonObj.map(product => {
            products.push({
                productName: product['Product Name'],
                InputImageUrls: product['Input Image Urls']
            });
        });

        try {
            for (const product of products) {
                const outputImages = await download(product);
                const values = Object.values(outputImages).join(',');
                outputProducts.push({ requestId, outputImageUrls: values, ...product });

                // Collect file paths for deletion
                Object.keys(outputImages).forEach(inputImage => {
                    const storedImage = inputImage.split('/').pop();
                    filesToDelete.push(`./public/image/${storedImage}`);
                    filesToDelete.push(`./public/compressed/${storedImage}`);
                });
            }

            // Add processed images into the database
            await ProductSchema.insertMany(outputProducts);
            requestStatuses[requestId] = 'completed';

            // Delete the files
            for (const filePath of filesToDelete) {
                fs.unlink(filePath, (err) => {
                    if (err) console.error(`Failed to delete file: ${filePath}`, err);
                });
            }

        } catch (err) {
            requestStatuses[requestId] = 'rejected';
            console.error(err);
            return;
        }

    } catch (err) {
        requestStatuses[requestId] = 'rejected';
        console.error(err);
        return;
    }
};
Changes and Additions:
Collecting File Paths:

While processing each product, the paths of the downloaded and compressed images are collected in the filesToDelete array.
Deleting Files:

After the main processing loop and database insertion, a new loop goes through filesToDelete and deletes each file using fs.unlink.
This ensures that the files are deleted after all operations are completed successfully. If any error occurs during processing, the deletion step is skipped. You might want to handle file deletions in case of errors as well, depending on your requirements.

after rejection also i have to delete
ChatGPT
To ensure that files are deleted after a rejection as well, you can centralize the deletion logic so that it runs regardless of whether the operation is successful or rejected. This can be achieved using a finally block, which executes after both try and catch blocks.

Here's how you can modify the imageProcess function to ensure that files are deleted after both successful completion and rejection:

javascript
Copy code
const fs = require('fs');
const csv = require('csvtojson');
const { download } = require('./yourModule'); // Adjust the module path accordingly
const ProductSchema = require('./ProductSchema'); // Adjust the module path accordingly
const requestStatuses = {}; // Your requestStatuses object

const imageProcess = async (requestId, file) => {
    const products = [];
    const outputProducts = [];
    const filesToDelete = [];

    try {
        const jsonObj = await csv().fromFile(file.path);
        jsonObj.map(product => {
            products.push({
                productName: product['Product Name'],
                InputImageUrls: product['Input Image Urls']
            });
        });

        try {
            for (const product of products) {
                const outputImages = await download(product);
                const values = Object.values(outputImages).join(',');
                outputProducts.push({ requestId, outputImageUrls: values, ...product });

                // Collect file paths for deletion
                Object.keys(outputImages).forEach(inputImage => {
                    const storedImage = inputImage.split('/').pop();
                    filesToDelete.push(`./public/image/${storedImage}`);
                    filesToDelete.push(`./public/compressed/${storedImage}`);
                });
            }

            // Add processed images into the database
            await ProductSchema.insertMany(outputProducts);
            requestStatuses[requestId] = 'completed';

        } catch (err) {
            requestStatuses[requestId] = 'rejected';
            console.error(err);
        }

    } catch (err) {
        requestStatuses[requestId] = 'rejected';
        console.error(err);
    } finally {
        // Delete the files regardless of success or failure
        for (const filePath of filesToDelete) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete file: ${filePath}`, err);
            });
        }
    }
};
Summary of Changes:
Centralized File Deletion:
The file deletion logic is moved to a finally block to ensure it runs regardless of whether the try block succeeds or the catch block handles an error.
This guarantees that files will be deleted after either successful completion or rejection due to errors.
This approach ensures that the files are cleaned up properly after the processing, regardless of the outcome.


const csv= require('csvtojson')
const compress_images = require("compress-images");
const fileUpload = require('./middleware');
const fs = require('fs')
const https = require('https');
const imageUploadOnCloud = require('./cloudUpload');
const ProductSchema  = require('./models/products')
const requestStatuses = {};


function compressImage(url) {
    return new Promise((resolve,reject)=>{
        console.log(url);
        compress_images(
            "./public/image/"+url,
            "./public/compressed/",
            { compress_force: false, statistic: true, autoupdate: true },
            false,
            { jpg: { engine: "mozjpeg", command: ["-quality", "60"] } },
            { png: { engine: "pngquant", command: ["--quality=20-50", "-o"] } },
            { svg: { engine: "svgo", command: "--multipass" } },
            {
            gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
            },
            function (err, completed) {
            if (completed === true) {
                resolve('completed');
            }else if(err){
                reject('rejected')
            }
            }
        );
    });
}


const download = async function (product) {
    const images = product.InputImageUrls.split(',');
    const outputImages = {};

    for (const inputImage of images) {
        const ext = inputImage.toString().split('.').pop();
        const storedImage = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + ext;

        await new Promise((resolve, reject) => {
            https.get(inputImage, function (res) {
                const fileStream = fs.createWriteStream("./public/image/" + storedImage);
                res.pipe(fileStream);
                
                fileStream.on('finish', async () => {
                    fileStream.close();
                    try {
                        // Image compression
                        await compressImage(storedImage);

                        // Image upload on cloud
                        const uploadResult = await imageUploadOnCloud("./public/compressed/" + storedImage, 'compressed');
                        outputImages[inputImage] = uploadResult.url;
                        resolve();
                    } catch (err) {
                        console.error(err);
                        reject(err);
                    }
                });
                
                fileStream.on('error', (err) => {
                    console.error(err);
                    reject(err);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    return outputImages;
};

const imageProcess = async(requestId, file)=>{
     const products =[];
     const outputProducts=[];
     try{
        csv()
        .fromFile(file.path)
        .then(async (jsonObj)=>{
            jsonObj.map(product=>{
                products.push({productName: product['Product Name'],
                    InputImageUrls: product['Input Image Urls']
                });
            });
            
            try{
                for(const product of products){
                    const outputImages =await download(product);
                    const values = Object.values(outputImages).join(',');
                    outputProducts.push({requestId,outputImageUrls:values, ...product}) 
                }

                // add processed image into database
                await ProductSchema.insertMany(outputProducts);
                requestStatuses[requestId] = 'completed';

            }catch(err){
                requestStatuses[requestId] = 'rejected';
                console.log(err);
                return;
            }
            
           
        })
     }catch(err){
        requestStatuses[requestId] = 'rejected';
        return;
     }
    
}



module.exports = {imageProcess,requestStatuses};


this is my complete code
ChatGPT
To ensure files are deleted after both successful and rejected processing, you can centralize the deletion logic in the finally block of the imageProcess function. Additionally, we will enhance the code to handle file deletions for all scenarios.

Here's the updated code:

javascript
Copy code
const csv = require('csvtojson');
const compress_images = require('compress-images');
const fs = require('fs');
const https = require('https');
const imageUploadOnCloud = require('./cloudUpload');
const ProductSchema = require('./models/products');
const requestStatuses = {};

function compressImage(url) {
    return new Promise((resolve, reject) => {
        console.log(url);
        compress_images(
            './public/image/' + url,
            './public/compressed/',
            { compress_force: false, statistic: true, autoupdate: true },
            false,
            { jpg: { engine: 'mozjpeg', command: ['-quality', '60'] } },
            { png: { engine: 'pngquant', command: ['--quality=20-50', '-o'] } },
            { svg: { engine: 'svgo', command: '--multipass' } },
            { gif: { engine: 'gifsicle', command: ['--colors', '64', '--use-col=web'] } },
            function (err, completed) {
                if (completed === true) {
                    resolve('completed');
                } else if (err) {
                    reject('rejected');
                }
            }
        );
    });
}

const download = async function (product) {
    const images = product.InputImageUrls.split(',');
    const outputImages = {};
    const filesToDelete = [];

    for (const inputImage of images) {
        const ext = inputImage.toString().split('.').pop();
        const storedImage = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + ext;

        await new Promise((resolve, reject) => {
            https.get(inputImage, function (res) {
                const fileStream = fs.createWriteStream('./public/image/' + storedImage);
                res.pipe(fileStream);

                fileStream.on('finish', async () => {
                    fileStream.close();
                    try {
                        // Image compression
                        await compressImage(storedImage);

                        // Image upload on cloud
                        const uploadResult = await imageUploadOnCloud('./public/compressed/' + storedImage, 'compressed');
                        outputImages[inputImage] = uploadResult.url;
                        filesToDelete.push(`./public/image/${storedImage}`, `./public/compressed/${storedImage}`);
                        resolve();
                    } catch (err) {
                        console.error(err);
                        reject(err);
                    }
                });

                fileStream.on('error', (err) => {
                    console.error(err);
                    reject(err);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    return { outputImages, filesToDelete };
};

const imageProcess = async (requestId, file) => {
    const products = [];
    const outputProducts = [];
    const allFilesToDelete = [];

    try {
        const jsonObj = await csv().fromFile(file.path);
        jsonObj.forEach(product => {
            products.push({
                productName: product['Product Name'],
                InputImageUrls: product['Input Image Urls']
            });
        });

        try {
            for (const product of products) {
                const { outputImages, filesToDelete } = await download(product);
                const values = Object.values(outputImages).join(',');
                outputProducts.push({ requestId, outputImageUrls: values, ...product });
                allFilesToDelete.push(...filesToDelete);
            }

            // Add processed images into the database
            await ProductSchema.insertMany(outputProducts);
            requestStatuses[requestId] = 'completed';

        } catch (err) {
            requestStatuses[requestId] = 'rejected';
            console.error(err);
        }

    } catch (err) {
        requestStatuses[requestId] = 'rejected';
        console.error(err);
    } finally {
        // Delete the files regardless of success or failure
        for (const filePath of allFilesToDelete) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete file: ${filePath}`, err);
            });
        }
    }
};

module.exports = { imageProcess, requestStatuses };
Summary of Changes:
Centralized File Deletion:

The filesToDelete array is maintained within the download function and collected in imageProcess.
File paths are collected and stored in allFilesToDelete.
The deletion of these files is handled in the finally block to ensure they are deleted regardless of success or error.
Promise Handling in CSV Parsing:

Converted csv().fromFile(file.path) to an await statement to properly handle async operations and error handling.
File Collection During Processing:

File paths are added to filesToDelete during image processing.
The filesToDelete array is extended to allFilesToDelete after processing each product.
This ensures files are cleaned up correctly after processing, whether successful or not.

Create a webhook flow so that after processing all the images you
can trigger the webhook endpoint
ChatGPT
To trigger a webhook endpoint after processing all the images, you need to send an HTTP request to the specified webhook URL once the processing is complete. You can use a library like axios for making HTTP requests in Node.js.

Here is how you can update your code to include the webhook flow:

Install axios:

sh
Copy code
npm install axios
Update the code to include the webhook trigger:

javascript
Copy code
const csv = require('csvtojson');
const compress_images = require('compress-images');
const fs = require('fs');
const https = require('https');
const axios = require('axios');
const imageUploadOnCloud = require('./cloudUpload');
const ProductSchema = require('./models/products');
const requestStatuses = {};

function compressImage(url) {
    return new Promise((resolve, reject) => {
        console.log(url);
        compress_images(
            './public/image/' + url,
            './public/compressed/',
            { compress_force: false, statistic: true, autoupdate: true },
            false,
            { jpg: { engine: 'mozjpeg', command: ['-quality', '60'] } },
            { png: { engine: 'pngquant', command: ['--quality=20-50', '-o'] } },
            { svg: { engine: 'svgo', command: '--multipass' } },
            { gif: { engine: 'gifsicle', command: ['--colors', '64', '--use-col=web'] } },
            function (err, completed) {
                if (completed === true) {
                    resolve('completed');
                } else if (err) {
                    reject('rejected');
                }
            }
        );
    });
}

const download = async function (product) {
    const images = product.InputImageUrls.split(',');
    const outputImages = {};
    const filesToDelete = [];

    for (const inputImage of images) {
        const ext = inputImage.toString().split('.').pop();
        const storedImage = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + ext;

        await new Promise((resolve, reject) => {
            https.get(inputImage, function (res) {
                const fileStream = fs.createWriteStream('./public/image/' + storedImage);
                res.pipe(fileStream);

                fileStream.on('finish', async () => {
                    fileStream.close();
                    try {
                        // Image compression
                        await compressImage(storedImage);

                        // Image upload on cloud
                        const uploadResult = await imageUploadOnCloud('./public/compressed/' + storedImage, 'compressed');
                        outputImages[inputImage] = uploadResult.url;
                        filesToDelete.push(`./public/image/${storedImage}`, `./public/compressed/${storedImage}`);
                        resolve();
                    } catch (err) {
                        console.error(err);
                        reject(err);
                    }
                });

                fileStream.on('error', (err) => {
                    console.error(err);
                    reject(err);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    return { outputImages, filesToDelete };
};

const imageProcess = async (requestId, file, webhookUrl) => {
    const products = [];
    const outputProducts = [];
    const allFilesToDelete = [];

    try {
        const jsonObj = await csv().fromFile(file.path);
        jsonObj.forEach(product => {
            products.push({
                productName: product['Product Name'],
                InputImageUrls: product['Input Image Urls']
            });
        });

        try {
            for (const product of products) {
                const { outputImages, filesToDelete } = await download(product);
                const values = Object.values(outputImages).join(',');
                outputProducts.push({ requestId, outputImageUrls: values, ...product });
                allFilesToDelete.push(...filesToDelete);
            }

            // Add processed images into the database
            await ProductSchema.insertMany(outputProducts);
            requestStatuses[requestId] = 'completed';

            // Trigger the webhook
            await axios.post(webhookUrl, {
                requestId: requestId,
                status: 'completed',
                data: outputProducts
            });

        } catch (err) {
            requestStatuses[requestId] = 'rejected';
            console.error(err);

            // Trigger the webhook in case of error
            await axios.post(webhookUrl, {
                requestId: requestId,
                status: 'rejected',
                error: err.message
            });
        }

    } catch (err) {
        requestStatuses[requestId] = 'rejected';
        console.error(err);

        // Trigger the webhook in case of error
        await axios.post(webhookUrl, {
            requestId: requestId,
            status: 'rejected',
            error: err.message
        });
    } finally {
        // Delete the files regardless of success or failure
        for (const filePath of allFilesToDelete) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete file: ${filePath}`, err);
            });
        }
    }
};

module.exports = { imageProcess, requestStatuses };
Summary of Changes:
Installed and required axios: For making HTTP requests to the webhook URL.
Added webhookUrl parameter to imageProcess: This parameter will be the URL of the webhook to be triggered.
Triggering the webhook:
After processing is completed successfully: Sends a POST request with the requestId, status, and processed data.
In case of an error: Sends a POST request with the requestId, status, and error message.
Centralized file deletion in finally block: Ensures files are deleted regardless of success or failure.
This ensures that the webhook is triggered after the image processing is complete, providing real-time updates about the processing status.

can i do this using https
ChatGPT
Yes, you can use the built-in https module in Node.js to make HTTP requests for triggering the webhook instead of using a third-party library like axios. Here’s how you can do it:

Create a function to send the webhook notification using https:
javascript
Copy code
const https = require('https');

function sendWebhookNotification(url, data) {
    return new Promise((resolve, reject) => {
        const dataString = JSON.stringify(data);
        const urlObject = new URL(url);

        const options = {
            hostname: urlObject.hostname,
            port: urlObject.port || 443,
            path: urlObject.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': dataString.length,
            },
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(responseData);
                } else {
                    reject(new Error(`Failed to send webhook, status code: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(dataString);
        req.end();
    });
}
Integrate the webhook notification into your imageProcess function:
javascript
Copy code
const csv = require('csvtojson');
const compress_images = require('compress-images');
const fs = require('fs');
const https = require('https');
const imageUploadOnCloud = require('./cloudUpload');
const ProductSchema = require('./models/products');
const requestStatuses = {};

function compressImage(url) {
    return new Promise((resolve, reject) => {
        console.log(url);
        compress_images(
            './public/image/' + url,
            './public/compressed/',
            { compress_force: false, statistic: true, autoupdate: true },
            false,
            { jpg: { engine: 'mozjpeg', command: ['-quality', '60'] } },
            { png: { engine: 'pngquant', command: ['--quality=20-50', '-o'] } },
            { svg: { engine: 'svgo', command: '--multipass' } },
            { gif: { engine: 'gifsicle', command: ['--colors', '64', '--use-col=web'] } },
            function (err, completed) {
                if (completed === true) {
                    resolve('completed');
                } else if (err) {
                    reject('rejected');
                }
            }
        );
    });
}

const download = async function (product) {
    const images = product.InputImageUrls.split(',');
    const outputImages = {};
    const filesToDelete = [];

    for (const inputImage of images) {
        const ext = inputImage.toString().split('.').pop();
        const storedImage = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + ext;

        await new Promise((resolve, reject) => {
            https.get(inputImage, function (res) {
                const fileStream = fs.createWriteStream('./public/image/' + storedImage);
                res.pipe(fileStream);

                fileStream.on('finish', async () => {
                    fileStream.close();
                    try {
                        // Image compression
                        await compressImage(storedImage);

                        // Image upload on cloud
                        const uploadResult = await imageUploadOnCloud('./public/compressed/' + storedImage, 'compressed');
                        outputImages[inputImage] = uploadResult.url;
                        filesToDelete.push(`./public/image/${storedImage}`, `./public/compressed/${storedImage}`);
                        resolve();
                    } catch (err) {
                        console.error(err);
                        reject(err);
                    }
                });

                fileStream.on('error', (err) => {
                    console.error(err);
                    reject(err);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    return { outputImages, filesToDelete };
};

const imageProcess = async (requestId, file, webhookUrl) => {
    const products = [];
    const outputProducts = [];
    const allFilesToDelete = [];

    try {
        const jsonObj = await csv().fromFile(file.path);
        jsonObj.forEach(product => {
            products.push({
                productName: product['Product Name'],
                InputImageUrls: product['Input Image Urls']
            });
        });

        try {
            for (const product of products) {
                const { outputImages, filesToDelete } = await download(product);
                const values = Object.values(outputImages).join(',');
                outputProducts.push({ requestId, outputImageUrls: values, ...product });
                allFilesToDelete.push(...filesToDelete);
            }

            // Add processed images into the database
            await ProductSchema.insertMany(outputProducts);
            requestStatuses[requestId] = 'completed';

            // Trigger the webhook
            await sendWebhookNotification(webhookUrl, {
                requestId: requestId,
                status: 'completed',
                data: outputProducts
            });

        } catch (err) {
            requestStatuses[requestId] = 'rejected';
            console.error(err);

            // Trigger the webhook in case of error
            await sendWebhookNotification(webhookUrl, {
                requestId: requestId,
                status: 'rejected',
                error: err.message
            });
        }

    } catch (err) {
        requestStatuses[requestId] = 'rejected';
        console.error(err);

        // Trigger the webhook in case of error
        await sendWebhookNotification(webhookUrl, {
            requestId: requestId,
            status: 'rejected',
            error: err.message
        });
    } finally {
        // Delete the files regardless of success or failure
        for (const filePath of allFilesToDelete) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete file: ${filePath}`, err);
            });
        }
    }
};

module.exports = { imageProcess, requestStatuses };
Summary of Changes:
Created sendWebhookNotification function:

This function uses the https module to send a POST request to the webhook URL.
It handles the URL parsing, setting headers, and sending the request body.
Updated imageProcess to include webhook URL parameter:

The imageProcess function now accepts webhookUrl as a parameter.
Calls sendWebhookNotification with appropriate data after processing is complete or if an error occurs.
This approach ensures that the webhook is triggered using the built-in https module without needing additional dependencies.

const express = require("express")
const bodyParser = require('body-parser')
require('dotenv').config()

const cors = require('cors');
const db = require('./services/db')
const productRoute = require('./router/productRoute');
const path = require('path')

const app = express()

app.use(cors())
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname,'public','uploads')))
app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))

app.get('/',(req,res)=>{
    res.render('index');
});
app.use('/product',productRoute);

app.get('*',(req,res)=>{
    res.status(404).send('page not found');
})




app.listen(process.env.PORT || 8080,()=>{
    console.log("server started at 8080 port");
})



const multer = require('multer');

const MIME_TYPE_MAP = {
  'text/csv': 'csv',
  'image/bmp':'bmp',
  'image/jpeg':'jpeg',
  'image/jpg':'jpg',
  'image/png':'png',
  'image/gif':'gif'
};

const fileUpload = multer({
  limits: 500000,
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, './public/uploads');
    },
    filename: (req, file, cb) => {
       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
       const ext = MIME_TYPE_MAP[file.mimetype];
       cb(null, uniqueSuffix + '.' + ext);
    }
  }),
  fileFilter: (req, file, cb) => {
   
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error('Invalid mime type!');
    cb(error, isValid);
  }
});

module.exports = fileUpload;



const express = require("express")
const fileUpload =  require('../middleware')
const router =express.Router();
const {imageProcess,requestStatuses} = require('../services/imageProcess')

router.post('/upload',fileUpload.single('input_data'),async(req,res)=>{
    try{
        const requestId = req.file.filename.split('.')[0];
        requestStatuses[requestId] = 'Processing';


        setTimeout(()=>{
            // Add job to the process queue
            imageProcess(requestId,req.file);
        },0);
    
        
        res.status(200).send({requestId, msg:'file uploaded successfully'})
    }catch(err){
        res.status(400).send({msg:err})
    }
})

router.get('/status/:requestId', (req, res) => {
    const requestId = req.params.requestId;
    const status = requestStatuses[requestId];

    if (!status) {
        return res.status(404).json({ error: 'Request ID not found' });
    }

    res.json({ requestId, status });
});

module.exports = router;



const csv = require('csvtojson');
const compress_images = require('compress-images');
const fs = require('fs');
const https = require('https');
const imageUploadOnCloud = require('./cloudUpload');
const ProductSchema = require('../models/products');
const requestStatuses = {};

function compressImage(url) {
    return new Promise((resolve, reject) => {
        console.log(url);
        compress_images(
            './public/image/' + url,
            './public/compressed/',
            { compress_force: false, statistic: true, autoupdate: true },
            false,
            { jpg: { engine: 'mozjpeg', command: ['-quality', '60'] } },
            { png: { engine: 'pngquant', command: ['--quality=20-50', '-o'] } },
            { svg: { engine: 'svgo', command: '--multipass' } },
            { gif: { engine: 'gifsicle', command: ['--colors', '64', '--use-col=web'] } },
            function (err, completed) {
                if (completed === true) {
                    resolve('completed');
                } else if (err) {
                    reject('rejected');
                }
            }
        );
    });
}

const download = async function (product) {
    const images = product.InputImageUrls.split(',');
    const outputImages = {};
    const filesToDelete = [];

    for (const inputImage of images) {
        const ext = inputImage.toString().split('.').pop();
        const storedImage = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + ext;

        await new Promise((resolve, reject) => {
            https.get(inputImage, function (res) {
                const fileStream = fs.createWriteStream('./public/image/' + storedImage);
                res.pipe(fileStream);

                fileStream.on('finish', async () => {
                    fileStream.close();
                    try {
                        // Image compression
                        await compressImage(storedImage);

                        // Image upload on cloud
                        const uploadResult = await imageUploadOnCloud('./public/compressed/' + storedImage, 'compressed');
                        outputImages[inputImage] = uploadResult.url;
                        filesToDelete.push(./public/image/${storedImage}, ./public/compressed/${storedImage});
                        resolve();
                    } catch (err) {
                        console.error(err);
                        reject(err);
                    }
                });

                fileStream.on('error', (err) => {
                    console.error(err);
                    reject(err);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    return { outputImages, filesToDelete };
};

const imageProcess = async (requestId, file) => {
    const products = [];
    const outputProducts = [];
    const allFilesToDelete = [file.path];

    try {
        const jsonObj = await csv().fromFile(file.path);
        jsonObj.forEach(product => {
            products.push({
                productName: product['Product Name'],
                InputImageUrls: product['Input Image Urls']
            });
        });

        try {
            for (const product of products) {
                const { outputImages, filesToDelete } = await download(product);
                const values = Object.values(outputImages).join(',');
                outputProducts.push({ requestId, outputImageUrls: values, ...product });
                allFilesToDelete.push(...filesToDelete);
            }

            // Add processed images into the database
            await ProductSchema.insertMany(outputProducts);
            requestStatuses[requestId] = 'completed';


        } catch (err) {
            requestStatuses[requestId] = 'rejected';
            console.error(err);
        }

    } catch (err) {
        requestStatuses[requestId] = 'rejected';
        console.error(err);
    } finally {
        // Delete the files regardless of success or failure
        
        for (const filePath of allFilesToDelete) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(Failed to delete file: ${filePath}, err);
            });
        }
    }
};

module.exports = { imageProcess, requestStatuses };



const cloudinary =require('cloudinary');
 // Configuration
 cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.API_KEY, 
    api_secret: process.env.API_SECRET // Click 'View Credentials' below to copy your API secret
});
async function imageUploadOnCloud(url,folder) {

   return new Promise(resolve=>{
        cloudinary.uploader.upload(url,result=>{
            resolve({
                url:result.url,
                id:result.public_id
            })
        },{
            resorce_type:"auto",
            folder:folder
        }
    )
   })
}
module.exports = imageUploadOnCloud;   
  


 
ChatGPT
To integrate a webhook flow in your existing code, we'll add a webhook notification function and modify the imageProcess function to send notifications upon completion or failure. Here is the updated code:

1. Create a function to send webhook notifications using https:
javascript
Copy code
const https = require('https');

function sendWebhookNotification(url, data) {
    return new Promise((resolve, reject) => {
        const dataString = JSON.stringify(data);
        const urlObject = new URL(url);

        const options = {
            hostname: urlObject.hostname,
            port: urlObject.port || 443,
            path: urlObject.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': dataString.length,
            },
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(responseData);
                } else {
                    reject(new Error(`Failed to send webhook, status code: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(dataString);
        req.end();
    });
}
2. Modify imageProcess to include webhook URL and trigger webhook notifications:
javascript
Copy code
const csv = require('csvtojson');
const compress_images = require('compress-images');
const fs = require('fs');
const https = require('https');
const imageUploadOnCloud = require('./cloudUpload');
const ProductSchema = require('../models/products');
const requestStatuses = {};

function compressImage(url) {
    return new Promise((resolve, reject) => {
        console.log(url);
        compress_images(
            './public/image/' + url,
            './public/compressed/',
            { compress_force: false, statistic: true, autoupdate: true },
            false,
            { jpg: { engine: 'mozjpeg', command: ['-quality', '60'] } },
            { png: { engine: 'pngquant', command: ['--quality=20-50', '-o'] } },
            { svg: { engine: 'svgo', command: '--multipass' } },
            { gif: { engine: 'gifsicle', command: ['--colors', '64', '--use-col=web'] } },
            function (err, completed) {
                if (completed === true) {
                    resolve('completed');
                } else if (err) {
                    reject('rejected');
                }
            }
        );
    });
}

const download = async function (product) {
    const images = product.InputImageUrls.split(',');
    const outputImages = {};
    const filesToDelete = [];

    for (const inputImage of images) {
        const ext = inputImage.toString().split('.').pop();
        const storedImage = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + ext;

        await new Promise((resolve, reject) => {
            https.get(inputImage, function (res) {
                const fileStream = fs.createWriteStream('./public/image/' + storedImage);
                res.pipe(fileStream);

                fileStream.on('finish', async () => {
                    fileStream.close();
                    try {
                        // Image compression
                        await compressImage(storedImage);

                        // Image upload on cloud
                        const uploadResult = await imageUploadOnCloud('./public/compressed/' + storedImage, 'compressed');
                        outputImages[inputImage] = uploadResult.url;
                        filesToDelete.push(`./public/image/${storedImage}`, `./public/compressed/${storedImage}`);
                        resolve();
                    } catch (err) {
                        console.error(err);
                        reject(err);
                    }
                });

                fileStream.on('error', (err) => {
                    console.error(err);
                    reject(err);
                });
            }).on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    return { outputImages, filesToDelete };
};

const imageProcess = async (requestId, file, webhookUrl) => {
    const products = [];
    const outputProducts = [];
    const allFilesToDelete = [file.path];

    try {
        const jsonObj = await csv().fromFile(file.path);
        jsonObj.forEach(product => {
            products.push({
                productName: product['Product Name'],
                InputImageUrls: product['Input Image Urls']
            });
        });

        try {
            for (const product of products) {
                const { outputImages, filesToDelete } = await download(product);
                const values = Object.values(outputImages).join(',');
                outputProducts.push({ requestId, outputImageUrls: values, ...product });
                allFilesToDelete.push(...filesToDelete);
            }

            // Add processed images into the database
            await ProductSchema.insertMany(outputProducts);
            requestStatuses[requestId] = 'completed';

            // Trigger the webhook
            await sendWebhookNotification(webhookUrl, {
                requestId: requestId,
                status: 'completed',
                data: outputProducts
            });

        } catch (err) {
            requestStatuses[requestId] = 'rejected';
            console.error(err);

            // Trigger the webhook in case of error
            await sendWebhookNotification(webhookUrl, {
                requestId: requestId,
                status: 'rejected',
                error: err.message
            });
        }

    } catch (err) {
        requestStatuses[requestId] = 'rejected';
        console.error(err);

        // Trigger the webhook in case of error
        await sendWebhookNotification(webhookUrl, {
            requestId: requestId,
            status: 'rejected',
            error: err.message
        });
    } finally {
        // Delete the files regardless of success or failure
        for (const filePath of allFilesToDelete) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete file: ${filePath}`, err);
            });
        }
    }
};

module.exports = { imageProcess, requestStatuses };
3. Modify your route to pass the webhook URL to the imageProcess function:
javascript
Copy code
const express = require("express");
const fileUpload = require('../middleware');
const router = express.Router();
const { imageProcess, requestStatuses } = require('../services/imageProcess');

router.post('/upload', fileUpload.single('input_data'), async (req, res) => {
    try {
        const requestId = req.file.filename.split('.')[0];
        requestStatuses[requestId] = 'Processing';

        const webhookUrl = req.body.webhookUrl; // Get webhook URL from request body

        setTimeout(() => {
            // Add job to the process queue
            imageProcess(requestId, req.file, webhookUrl);
        }, 0);

        res.status(200).send({ requestId, msg: 'File uploaded successfully' });
    } catch (err) {
        res.status(400).send({ msg: err });
    }
});

router.get('/status/:requestId', (req, res) => {
    const requestId = req.params.requestId;
    const status = requestStatuses[requestId];

    if (!status) {
        return res.status(404).json({ error: 'Request ID not found' });
    }

    res.json({ requestId, status });
});

module.exports = router;
4. Ensure your client sends the webhookUrl in the request body:
html
Copy code
<form action="/product/upload" method="post" enctype="multipart/form-data">
    <input type="file" name="input_data" />
    <input type="text" name="webhookUrl" placeholder="Enter your webhook URL" />
    <button type="submit">Upload</button>
</form>
Summary of Changes:
Added sendWebhookNotification function to send a POST request to the webhook URL using the https module.
Updated imageProcess function to accept webhookUrl and send notifications upon completion or failure.
Modified the route to pass the webhookUrl to the imageProcess function.
Ensured the client sends the webhookUrl in the request body.
can you please create readme file without webhook feature
ChatGPT
Sure, here's a README.md file for your project without the webhook feature:

markdown
Copy code
# Image Processing Service

This project provides an image processing service that can handle CSV uploads containing product names and image URLs, compress the images, upload them to the cloud, and store the processed data in a MongoDB database. The service also includes functionalities to check the processing status of uploaded files.

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
