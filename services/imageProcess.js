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
                if (err) console.error(`Failed to delete file: ${filePath}`, err);
            });
        }
    }
};

module.exports = { imageProcess, requestStatuses };
