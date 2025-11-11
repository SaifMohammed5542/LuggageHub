// src/app/api/station/alternatives/route.js
import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/dbConnect';
import Station from '../../../../models/Station';
import Booking from '../../../../models/booking';
import mongoose from 'mongoose';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { 
      currentStationId, 
      latitude, 
      longitude, 
      dropOffDate, 
      pickUpDate, 
      luggageCount 
    } = await request.json();

    console.log('🔍 Finding alternatives:', {
      currentStationId,
      location: { latitude, longitude },
      dropOffDate,
      pickUpDate,
      luggageCount
    });

    if (!latitude || !longitude || !dropOffDate || !pickUpDate || !luggageCount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const excludeStationId = currentStationId ? 
      new mongoose.Types.ObjectId(currentStationId) : null;

    // Find nearby stations
    const nearbyStations = await Station.aggregate([
      {
        $geoNear: {
          near: { 
            type: "Point", 
            coordinates: [parseFloat(longitude), parseFloat(latitude)] 
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 50000 // 50km
        }
      },
      {
        $match: {
          ...(excludeStationId && { _id: { $ne: excludeStationId } }),
          status: 'active'
        }
      },
      { $limit: 10 }
    ]);

    console.log('📍 Found nearby stations:', nearbyStations.length);

    // Check capacity for each
    const alternativesWithCapacity = await Promise.all(
      nearbyStations.map(async (station) => {
        try {
          // Skip if no capacity set
          if (!station.capacity || station.capacity === 0) {
            return {
              _id: station._id.toString(),
              name: station.name,
              location: station.location,
              distance: Math.round(station.distance / 1000 * 10) / 10,
              coordinates: station.coordinates,
              capacity: {
                available: true,
                percentage: 0,
                current: 0,
                max: 0
              }
            };
          }

          // Check capacity
          const overlappingBookings = await Booking.find({
            stationId: station._id,
            status: 'confirmed',
            dropOffDate: { $lte: new Date(pickUpDate) },
            pickUpDate: { $gte: new Date(dropOffDate) }
          }).select('luggageCount');

          const currentLuggage = overlappingBookings.reduce((sum, b) => sum + (b.luggageCount || 0), 0);
          const bufferCapacity = Math.floor(station.capacity * 0.9);
          const projectedTotal = currentLuggage + parseInt(luggageCount);
          const available = projectedTotal <= bufferCapacity;
          const percentage = Math.round((currentLuggage / station.capacity) * 100);

          return {
            _id: station._id.toString(),
            name: station.name,
            location: station.location,
            distance: Math.round(station.distance / 1000 * 10) / 10,
            coordinates: station.coordinates,
            capacity: {
              available,
              percentage,
              current: currentLuggage,
              max: station.capacity
            }
          };
        } catch (err) {
          console.error(`Error checking capacity for station ${station._id}:`, err);
          return {
            _id: station._id.toString(),
            name: station.name,
            location: station.location,
            distance: Math.round(station.distance / 1000 * 10) / 10,
            coordinates: station.coordinates,
            capacity: {
              available: false,
              percentage: 100,
              current: 0,
              max: station.capacity || 0
            }
          };
        }
      })
    );

    // Filter to available only, limit to 3
    const availableStations = alternativesWithCapacity
      .filter(s => s.capacity.available)
      .slice(0, 3);

    console.log('✅ Available alternatives:', availableStations.length);

    return NextResponse.json({
      success: true,
      alternatives: availableStations,
      found: availableStations.length,
      searched: nearbyStations.length
    });

  } catch (error) {
    console.error('❌ Alternatives error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error finding alternatives' },
      { status: 500 }
    );
  }
}