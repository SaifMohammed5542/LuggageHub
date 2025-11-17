import { NextResponse } from 'next/server';
import Station from '../../../../models/Station';
import connectDB from '../../../../lib/dbConnect';  // adjust to your DB connection file

export async function POST(request) {
  try {
    await connectDB();
    const { latitude, longitude } = await request.json();

    if (latitude == null || longitude == null) {
      return NextResponse.json({ message: 'Coordinates missing' }, { status: 400 });
    }

    console.log('Searching for stations near:', latitude, longitude);  // Log the incoming coordinates

    const stations = await Station.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          spherical: true
        }
      },
      { $limit: 5 }  // return the top 5 nearest, adjust as needed
    ]);

    console.log('Stations found:', stations);  // Log the search result

    return NextResponse.json(stations);
  } catch (error) {
    console.error('Error during station search:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
