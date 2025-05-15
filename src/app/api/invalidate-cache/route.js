import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function POST(request) {
  console.log("Received POST request to /api/invalidate-cache");
  const startTime = performance.now();

  try {
    const { key } = await request.json();
    if (!key) {
      console.log("Missing cache key");
      return NextResponse.json(
        { message: "Missing cache key" },
        { status: 400 }
      );
    }

    const result = await redis.del(key);
    console.log(`Cache invalidated for key: ${key}, result: ${result}`);

    const endTime = performance.now();
    console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
    return NextResponse.json({ message: "Cache invalidated" }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/invalidate-cache:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
