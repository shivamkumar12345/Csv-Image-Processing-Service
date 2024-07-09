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