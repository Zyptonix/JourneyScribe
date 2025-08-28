// app/api/packing/route.js
import { NextResponse } from "next/server";

// Example weather-based rules
const clothingRules = (weather, activities) => {
  let essentials = [];

  // Weather logic
  if (weather.includes("rain")) essentials.push("Umbrella, Waterproof jacket");
  if (weather.includes("snow")) essentials.push("Warm coat, Gloves, Boots");
  if (weather.includes("sunny")) essentials.push("Sunglasses, Hat, Sunscreen");

  // Activity logic
  if (activities.includes("hiking")) essentials.push("Hiking boots, Water bottle, Backpack");
  if (activities.includes("swimming")) essentials.push("Swimsuit, Towel, Flip-flops");
  if (activities.includes("formal")) essentials.push("Formal wear, Dress shoes");

  if (essentials.length === 0) essentials.push("Casual clothes, Essentials bag");

  return essentials;
};

export async function POST(req) {
  try {
    const { destination, weather, activities } = await req.json();

    if (!destination || !weather) {
      return NextResponse.json({ success: false, message: "Missing inputs" }, { status: 400 });
    }

    // Generate recommendations
    const essentials = clothingRules(weather.toLowerCase(), activities || []);

    return NextResponse.json({
      success: true,
      destination,
      weather,
      activities,
      recommendations: essentials,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
