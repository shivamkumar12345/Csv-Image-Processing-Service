const mongoose = require("mongoose")

const productSchema = new mongoose.Schema({
    requestId:{
        type:String,
        required:true
    },
    productName:{
        type:String,
        required:true,
    },
    InputImageUrls:{
        type:String,
        required:true,
    },
    outputImageUrls:{
        type:String,
        required:true
    }
});

module.exports = mongoose.model('Products',productSchema);