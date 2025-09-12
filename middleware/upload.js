import multer from "multer";

// Use memoryStorage so files are kept in RAM, not written to disk
const storage = multer.memoryStorage();

const upload = multer({ storage });

export default upload;
