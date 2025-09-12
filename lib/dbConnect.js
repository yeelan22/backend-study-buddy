import mongoose from "mongoose";

let cached = global.mongo;

if (!cached) {
  cached = global.mongo = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) {
    // Use cached connection if it exists
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      dbName: "studybuddy", // optional: your DB name
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
      return mongoose;
    }).catch((err) => {
      cached.promise = null; // reset promise if connection failed
      throw err;
    });
  }

  cached.conn = await cached.promise;
  console.log("MongoDB connected");
  return cached.conn;
}
