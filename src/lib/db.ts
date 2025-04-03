import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// In development, the connection can be global
// In production, it won't be shared between functions
const globalForMongoose = global as unknown as {
  mongoose: Cached | undefined;
};

const cached: Cached = globalForMongoose.mongoose ?? {
  conn: null,
  promise: null,
};

if (!globalForMongoose.mongoose) {
  globalForMongoose.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  try {
    const opts = {
      bufferCommands: false,
    };

    const mongooseInstance = await mongoose.connect(MONGODB_URI!, opts);
    cached.conn = mongooseInstance;
    return mongooseInstance;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export default dbConnect;