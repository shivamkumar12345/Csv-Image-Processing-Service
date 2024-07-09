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
  