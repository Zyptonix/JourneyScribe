import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Read the simplified data from the request
    const { destination, weather, activities } = await request.json();

    if (!destination || !weather) {
      return NextResponse.json(
        { success: false, error: 'Missing destination or weather.' },
        { status: 400 }
      );
    }
    
    // The recommendation logic is now based on the user-selected weather
    let recommendations = [
      "Passport/ID", "Tickets/Boarding Pass", "Phone & Charger", "Wallet (Cash/Cards)", "Toothbrush & Toothpaste", "Basic Toiletries",
    ];

    switch (weather) {
      case "Sunny":
        recommendations.push("Sunscreen", "Sunglasses", "Hat", "Shorts", "T-shirts");
        break;
      case "Rain":
        recommendations.push("Umbrella", "Raincoat", "Waterproof shoes");
        break;
      case "Snow":
        recommendations.push("Winter coat", "Gloves", "Scarf", "Beanie", "Snow boots");
        break;
      case "Cloudy":
        recommendations.push("Light jacket", "Sweater", "Jeans");
        break;
    }

    if (activities.includes("hiking")) {
      recommendations.push("Hiking boots", "Backpack", "Water bottle");
    }
    if (activities.includes("swimming")) {
      recommendations.push("Swimsuit", "Towel", "Flip-flops");
    }
    if (activities.includes("business") || activities.includes("formal")) {
      recommendations.push("Formal wear", "Dress shoes");
    }
    
    const uniqueRecommendations = [...new Set(recommendations)];

    return NextResponse.json({ success: true, recommendations: uniqueRecommendations });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}