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

    if (!ratedUserId || ![-1, 1].includes(rating)) {
      console.log("Missing ratedUserId or invalid rating");
      return new Response(
        JSON.stringify({
          message: "Rated user ID and valid rating (+1 or -1) are required",
        }),
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

    const ratedUser = await prisma.user.findUnique({
      where: { id: ratedUserIdInt },
    });
    if (!ratedUser) {
      console.log("Rated user not found");
      return new Response(JSON.stringify({ message: "Rated user not found" }), {
        status: 404,
      });
    }

    const existingRating = await prisma.userRating.findUnique({
      where: {
        raterId_ratedUserId: {
          raterId: raterId,
          ratedUserId: ratedUserIdInt,
        },
      },
    });

    if (existingRating) {
      console.log("You have already rated this user");
      return new Response(
        JSON.stringify({ message: "You have already rated this user" }),
        { status: 400 }
      );
    }

    await prisma.userRating.create({
      data: {
        raterId: raterId,
        ratedUserId: ratedUserIdInt,
        rating: rating,
      },
    });

    const newRating = await prisma.userRating.aggregate({
      where: { ratedUserId: ratedUserIdInt },
      _sum: {
        rating: true,
      },
    });

    const updatedRating = newRating._sum.rating || 0;

    await prisma.user.update({
      where: { id: ratedUserIdInt },
      data: { rating: updatedRating },
    });

    // 檢查是否需要標記為紅旗用戶
    await fetch("/api/check-redflag", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ targetUserId: ratedUserIdInt }),
    });

    return new Response(
      JSON.stringify({
        message: "Rating submitted successfully",
        newRating: updatedRating,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/rating:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}
