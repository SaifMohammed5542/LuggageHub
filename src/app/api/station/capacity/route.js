// src/app/api/station/capacity/route.js
import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/dbConnect';
import Station from '../../../../models/Station';
import Booking from '../../../../models/booking';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { stationId, dropOffDate, pickUpDate, luggageCount } = await request.json();
    
    console.log('🎯 Capacity API called:', {
      stationId,
      dropOffDate,
      pickUpDate,
      luggageCount
    });

    if (!stationId || !dropOffDate || !pickUpDate || !luggageCount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const station = await Station.findById(stationId);
    if (!station) {
      return NextResponse.json(
        { success: false, message: 'Station not found' },
        { status: 404 }
      );
    }

    // If capacity is 0 or not set, assume unlimited
    if (!station.capacity || station.capacity === 0) {
      return NextResponse.json({
        success: true,
        available: true,
        capacity: {
          current: 0,
          max: 0,
          buffer: 0,
          projected: 0,
          percentage: 0
        },
        status: {
          status: 'available',
          icon: '🟢',
          color: '#16a34a',
          label: 'Available',
          description: 'Unlimited capacity'
        }
      });
    }

    // Find overlapping bookings
    const overlappingBookings = await Booking.find({
      stationId,
      status: 'confirmed',
      dropOffDate: { $lte: new Date(pickUpDate) },
      pickUpDate: { $gte: new Date(dropOffDate) }
    }).select('luggageCount');

    const currentLuggage = overlappingBookings.reduce((sum, b) => sum + (b.luggageCount || 0), 0);
    const bufferCapacity = Math.floor(station.capacity * 0.9);
    const projectedTotal = currentLuggage + parseInt(luggageCount);
    const available = projectedTotal <= bufferCapacity;
    const percentage = Math.round((currentLuggage / station.capacity) * 100);

    // Status indicator
    let statusInfo;
    if (percentage >= 95) {
      statusInfo = {
        status: 'full',
        icon: '⛔',
        color: '#dc2626',
        label: 'Full',
        description: 'No capacity available'
      };
    } else if (percentage >= 85) {
      statusInfo = {
        status: 'critical',
        icon: '🔴',
        color: '#ea580c',
        label: 'Almost Full',
        description: 'Very limited space'
      };
    } else if (percentage >= 60) {
      statusInfo = {
        status: 'limited',
        icon: '🟡',
        color: '#f59e0b',
        label: 'Limited Space',
        description: 'Filling up fast'
      };
    } else {
      statusInfo = {
        status: 'available',
        icon: '🟢',
        color: '#16a34a',
        label: 'Available',
        description: 'Plenty of space'
      };
    }

    console.log('📊 Capacity result:', {
      current: currentLuggage,
      max: station.capacity,
      available,
      percentage
    });

    return NextResponse.json({
      success: true,
      available,
      capacity: {
        current: currentLuggage,
        max: station.capacity,
        buffer: bufferCapacity,
        projected: projectedTotal,
        percentage
      },
      status: statusInfo,
      stationName: station.name
    });

  } catch (error) {
    console.error('❌ Capacity check error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error checking capacity' },
      { status: 500 }
    );
  }
}