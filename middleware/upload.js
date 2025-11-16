import multer from "multer";

// Use memoryStorage so files are kept in RAM, not written to disk


const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 }});

export default upload;
