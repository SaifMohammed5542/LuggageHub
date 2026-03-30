// src/scripts/fix-old-booking-statuses.js

// ✅ SET MONGODB URI BEFORE ANYTHING
process.env.MONGODB_URI = 'mongodb+srv://Admin:suhaan5542@cluster0.yoy2b1l.mongodb.net/test?retryWrites=true&w=majority';

import fs from 'fs';
import path from 'path';

async function fixOldBookingStatuses() {
  try {
    console.log('🔄 Starting SAFE booking status migration...\n');
    
    const { default: dbConnect } = await import('../lib/dbConnect.js');
    const { default: Booking } = await import('../models/booking.js');
    
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    // ✅ STEP 1: CREATE BACKUP
    console.log('💾 Creating backup of current statuses...');
    const allBookings = await Booking.find({}).select('_id bookingReference status checkInTime checkOutTime pickUpDate').lean();
    
    const backupData = {
      timestamp: new Date().toISOString(),
      totalBookings: allBookings.length,
      bookings: allBookings
    };

    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `booking-status-backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup saved to: ${backupFile}\n`);
    console.log(`📊 Backed up ${allBookings.length} bookings\n`);

    console.log('⏳ Starting migration in 3 seconds... (Press Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ✅ STEP 2: FIND BOOKINGS TO FIX
    // Look for bookings that are 'confirmed' but have already passed their pick-up date
    const now = new Date();
    
    const bookingsToFix = await Booking.find({ 
      $or: [
        { status: 'pending' },
        { status: 'confirmed' }, // ✅ ADDED: Also check confirmed bookings
        { status: null },
        { status: { $exists: false } }
      ]
    }).sort({ createdAt: -1 });

    console.log(`\n📊 Found ${bookingsToFix.length} bookings to check\n`);

    const changes = [];
    let updatedCount = 0;
    let skippedCount = 0;

    for (const booking of bookingsToFix) {
      const pickUpDate = new Date(booking.pickUpDate);
      const oldStatus = booking.status || 'null';
      
      // ✅ If pick-up date has passed, mark as completed
      if (pickUpDate < now) {
        booking.status = 'completed';
        booking.checkOutTime = booking.checkOutTime || booking.pickUpDate;
        await booking.save();
        
        changes.push({
          reference: booking.bookingReference,
          oldStatus,
          newStatus: 'completed',
          pickUpDate: pickUpDate.toISOString()
        });
        
        console.log(`✅ ${booking.bookingReference}: ${oldStatus} → completed (Pick-up: ${pickUpDate.toDateString()})`);
        updatedCount++;
      } 
      // ✅ If pick-up date is in the future but status is pending/null, mark as confirmed
      else if (oldStatus === 'pending' || oldStatus === 'null' || !oldStatus) {
        booking.status = 'confirmed';
        await booking.save();
        
        changes.push({
          reference: booking.bookingReference,
          oldStatus,
          newStatus: 'confirmed',
          pickUpDate: pickUpDate.toISOString()
        });
        
        console.log(`✅ ${booking.bookingReference}: ${oldStatus} → confirmed (Active booking)`);
        updatedCount++;
      }
      // ✅ Already confirmed and pick-up is in future - skip (it's correct)
      else {
        console.log(`⏭️  ${booking.bookingReference}: ${oldStatus} (already correct, skipping)`);
        skippedCount++;
      }
    }

    // ✅ STEP 3: SAVE CHANGE LOG
    const changeLog = {
      timestamp: new Date().toISOString(),
      totalChanges: updatedCount,
      totalSkipped: skippedCount,
      changes: changes
    };

    const changeLogFile = path.join(backupDir, `migration-changes-${Date.now()}.json`);
    fs.writeFileSync(changeLogFile, JSON.stringify(changeLog, null, 2));

    console.log(`\n📝 Change log saved to: ${changeLogFile}`);

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Updated: ${updatedCount} bookings`);
    console.log(`   ⏭️  Skipped: ${skippedCount} bookings (already correct)`);
    console.log(`   💾 Backup file: ${backupFile}`);
    console.log(`   📝 Change log: ${changeLogFile}`);
    console.log('\n🎉 Migration completed successfully!\n');

    console.log('ℹ️  To ROLLBACK (undo all changes), run:');
    console.log(`   npm run rollback-bookings ${path.basename(backupFile)}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('💾 Your backup file is safe and unchanged.');
    process.exit(1);
  }
}

fixOldBookingStatuses();