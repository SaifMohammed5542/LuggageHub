import mongoose from 'mongoose';
import slugify from 'slugify';
import dotenv from 'dotenv';
import Station from './src/models/Station'; // Adjust path if you put migrateSlugs.js in a 'scripts' folder

dotenv.config(); // Load environment variables (for MONGODB_URI)

async function runMigration() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('MongoDB Connected for migration.');

    // 2. Drop the old 'slug_1' index if it exists
    try {
      await mongoose.connection.collection('stations').dropIndex('slug_1');
      console.log('Dropped old slug_1 index.');
    } catch (error) {
      if (error.code === 27) { // Error code 27 means index not found
        console.log('slug_1 index not found, no need to drop.');
      } else {
        console.warn('Could not drop slug_1 index, it might not exist or another error occurred:', error.message);
      }
    }

    // Give a short delay for index drop to propagate if needed (optional)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Find all stations that need a slug
    const stations = await Station.find({
      $or: [
        { slug: { $eq: null } },
        { slug: { $exists: false } },
        { slug: '' }
      ]
    });

    if (stations.length === 0) {
      console.log('No stations found requiring slug migration.');
      return;
    }

    console.log(`Found ${stations.length} stations to migrate slugs.`);

    for (const station of stations) {
      if (!station.name) {
        console.warn(`Skipping station ${station._id} as it has no name.`);
        continue;
      }

      let baseSlug = slugify(station.name, { lower: true, strict: true });
      let uniqueSlug = baseSlug;
      let counter = 1;

      // Loop to ensure uniqueness for the new slug
      while (true) {
        const existingStationWithSlug = await Station.findOne({
          slug: uniqueSlug,
          _id: { $ne: station._id } // Exclude the current station itself
        });

        if (!existingStationWithSlug) {
          break; // Slug is unique
        }

        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      station.slug = uniqueSlug;
      await station.save(); // Save with the new slug, this will use the pre-save hook (which also re-checks uniqueness)
      console.log(`Updated station "${station.name}" with slug: "${station.slug}"`);
    }

    console.log('Slug migration complete!');

  } catch (error) {
    console.error('Error during slug migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  }
}

runMigration();