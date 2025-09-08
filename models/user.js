import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  avatar: String, // base64 image string
});

export default mongoose.model('User', UserSchema);
