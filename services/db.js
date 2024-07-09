const mongoose = require("mongoose")
const db =mongoose.connect(process.env.DB_URI)
.then(res=>{
    console.log("database connected successfully");
})
.catch(err=>{
    console.log(err,"error ocuured during connection");
})

module.exports = db;