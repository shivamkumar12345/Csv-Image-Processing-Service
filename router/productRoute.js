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