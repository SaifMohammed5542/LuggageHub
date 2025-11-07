/**
 * Migration Script: Move bank details and timings from User to Station
 * Run this ONCE after updating your models
 *
 * Usage: node src/scripts/migrateStationPartnerData.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// explicitly load .env.local (change to '.env' if you rename the file)
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined. Make sure .env.local exists in the project root and contains MONGODB_URI.');
  console.error('Looking for file: .env.local');
  process.exit(1);
}

// Define OLD schemas (before migration)
const OldUserSchema = new mongoose.Schema({}, { strict: false });
const OldStationSchema = new mongoose.Schema({}, { strict: false });

const OldUser = mongoose.model('OldUser', OldUserSchema, 'users');
const OldStation = mongoose.model('OldStation', OldStationSchema, 'stations');

async function migrate() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // serverSelectionTimeoutMS: 10000 // optionally set a shorter timeout for faster failure
    });
    console.log('✅ Connected to MongoDB');

    // Get all partners
    const partners = await OldUser.find({ role: 'partner' });
    console.log(`\n📊 Found ${partners.length} partners to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const partner of partners) {
      try {
        const stationId = partner.assignedStation;

        if (!stationId) {
          console.log(`⚠️  Partner ${partner.email} has no assigned station, skipping`);
          continue;
        }

        const station = await OldStation.findById(stationId);

        if (!station) {
          console.log(`⚠️  Station not found for partner ${partner.email}, skipping`);
          continue;
        }

        // Prepare bank details from partner
        const bankDetails = {
          accountHolderName: partner.accountDetails?.accountHolderName || '',
          bankName: partner.accountDetails?.bankName || '',
          bsb: partner.accountDetails?.bsb || '',
          accountNumberEncrypted: partner.accountDetails?.accountNumber || '',
          accountType: partner.accountDetails?.accountType || 'savings',
          payoutEmail: partner.email || ''
        };

        // Prepare timings (if they exist on partner)
        const timings = partner.timings || {
          is24Hours: false,
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '18:00', closed: false },
          sunday: { open: '09:00', close: '18:00', closed: false }
        };

        // Update station with bank details and timings
        await OldStation.findByIdAndUpdate(stationId, {
          bankDetails,
          timings,
          $addToSet: { partners: partner._id }, // Add partner to partners array
          updatedAt: new Date()
        });

        // Clean up partner document (remove bank details and timings)
        await OldUser.findByIdAndUpdate(partner._id, {
          $unset: {
            accountDetails: 1,
            timings: 1,
            businessName: 1,
            businessAddress: 1
          },
          updatedAt: new Date()
        });

        migratedCount++;
        console.log(`✅ Migrated partner ${partner.email} → Station ${station.name}`);

      } catch (err) {
        errorCount++;
        console.error(`❌ Error migrating partner ${partner.email}:`, err.message || err);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migratedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📍 Total partners: ${partners.length}`);

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrate();
