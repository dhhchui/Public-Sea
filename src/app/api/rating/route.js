import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("Received POST request to /api/rating");

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return new Response(JSON.stringify({ message: "No token provided" }), {
        status: 401,
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const raterId = decoded.userId;

    let data;
    try {
      data = await request.json();
      console.log("Request body:", data);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
      });
    }

    const { ratedUserId, rating } = data;
    if (!ratedUserId || !rating) {
      console.log("Missing ratedUserId or rating");
      return new Response(
        JSON.stringify({ message: "Rated user ID and rating are required" }),
        { status: 400 }
      );
    }

    const ratedUserIdInt = parseInt(ratedUserId);
    if (isNaN(ratedUserIdInt) || ratedUserIdInt === raterId) {
      console.log("Invalid ratedUserId or attempting to rate self");
      return new Response(
        JSON.stringify({
          message: "Invalid rated user ID or cannot rate self",
        }),
        { status: 400 }
      );
    }

    if (![1, -1].includes(rating)) {
      console.log("Invalid rating value");
      return new Response(
        JSON.stringify({ message: "Rating must be +1 or -1" }),
        { status: 400 }
      );
    }

    // 檢查被評分用戶是否存在
    const ratedUser = await prisma.user.findUnique({
      where: { id: ratedUserIdInt },
    });
    if (!ratedUser) {
      console.log("Rated user not found");
      return new Response(JSON.stringify({ message: "Rated user not found" }), {
        status: 404,
      });
    }

    // 檢查是否已評分
    const existingRating = await prisma.userRating.findUnique({
      where: {
        raterId_ratedUserId: {
          raterId,
          ratedUserId: ratedUserIdInt,
        },
      },
    });
    if (existingRating) {
      console.log("User has already rated this user");
      return new Response(
        JSON.stringify({ message: "You have already rated this user" }),
        { status: 400 }
      );
    }

    // 創建評分記錄
    await prisma.userRating.create({
      data: {
        raterId,
        ratedUserId: ratedUserIdInt,
        rating,
      },
    });

    // 更新目標用戶的總評分
    const totalRating = await prisma.userRating.aggregate({
      where: { ratedUserId: ratedUserIdInt },
      _sum: { rating: true },
    });

    const newRating = totalRating._sum.rating || 0;
    const isRedFlagged = newRating < -10;

    await prisma.user.update({
      where: { id: ratedUserIdInt },
      data: {
        rating: newRating,
        isRedFlagged,
      },
    });

    return new Response(
      JSON.stringify({
        message: "Rating submitted successfully",
        newRating,
        isRedFlagged,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/rating:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}
