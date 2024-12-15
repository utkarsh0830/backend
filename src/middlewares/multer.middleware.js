import multer from "multer";
const storage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,'./public/temp'); //cb -> callback give destination where to keep all files

    },
    filename: function(req,file,cb){
        // const uniqueSuffix = Date.now() + '-' + Math.round
        // (Math.random() * 1e9)
        // cb(null,file.filename + '-' + uniqueSuffix); //get many options in file
        cb(null,file.originalname);

    }
})

export const upload = multer({ 
    // storage: storage
    storage,  //in es6 we can use like this also for same name
});