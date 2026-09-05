import mongoose from 'mongoose';

const connectDB = async (retries = 5, delayMs = 3000): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ DB Error: MONGO_URI is not defined in environment variables");
    process.exit(1);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoUri);
      console.log("✅ MongoDB Connected");
      return;
    } catch (error: any) {
      console.error(`❌ DB Connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) {
        console.error("❌ DB Fatal: All connection attempts failed, exiting.");
        process.exit(1);
      }
      console.log(`⏳ Waiting ${delayMs / 1000}s before retrying MongoDB connection...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

export default connectDB;
