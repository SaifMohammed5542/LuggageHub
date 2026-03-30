// scripts/rollback-booking-statuses.js
// UNDO SCRIPT - Restores bookings to their previous state
// Usage: node scripts/rollback-booking-statuses.js booking-status-backup-1234567890.json

import dbConnect from '../lib/dbConnect.js';
import Booking from '../models/booking.js';    // ✅ Added extra ../
import fs from 'fs';
import path from 'path';

async function rollbackBookingStatuses() {
  try {
    const backupFileName = process.argv[2];
    
    if (!backupFileName) {
      console.error('❌ Please provide backup file name');
      console.log('Usage: node scripts/rollback-booking-statuses.js <backup-file.json>');
      process.exit(1);
    }

    console.log('🔄 Starting ROLLBACK...\n');
    
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    // Read backup file
    const backupPath = path.join(process.cwd(), 'backups', backupFileName);
    
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup file not found: ${backupPath}`);
      process.exit(1);
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    console.log(`📂 Loaded backup from: ${backupData.timestamp}`);
    console.log(`📊 Contains ${backupData.totalBookings} bookings\n`);

    // Wait 3 seconds
    console.log('⏳ Starting rollback in 3 seconds... (Press Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 3000));

    let restoredCount = 0;

    for (const backupBooking of backupData.bookings) {
      const booking = await Booking.findById(backupBooking._id);
      
      if (booking) {
        // Restore original status
        booking.status = backupBooking.status;
        booking.checkInTime = backupBooking.checkInTime || booking.checkInTime;
        booking.checkOutTime = backupBooking.checkOutTime || booking.checkOutTime;
        
        await booking.save();
        
        console.log(`✅ Restored ${backupBooking.bookingReference}: ${booking.status} → ${backupBooking.status}`);
        restoredCount++;
      }
    }

    console.log(`\n🎉 Rollback completed!`);
    console.log(`   ✅ Restored: ${restoredCount} bookings`);
    console.log(`   📂 All statuses reverted to backup state\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    process.exit(1);
  }
}

// Run rollback
rollbackBookingStatuses();