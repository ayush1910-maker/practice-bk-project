import multer from "multer";

const storage = multer.diskStorage({
  
  destination: function (req, file, cb) {
    cb(null, "./public/temp")
  },

  
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) 
    cb(null, file.originalname)  // kya pta ayush name ki five files aa jaye so it's not a good thing
  }
})

export const upload = multer({
     storage,
})