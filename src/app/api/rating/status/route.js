import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(request) {
  console.log("Received GET request to /api/rating/status");

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

    const { searchParams } = new URL(request.url);
    const ratedUserId = searchParams.get("ratedUserId");
    if (!ratedUserId) {
      console.log("Missing ratedUserId");
      return new Response(
        JSON.stringify({ message: "Rated user ID is required" }),
        { status: 400 }
      );
    }

    const ratedUserIdInt = parseInt(ratedUserId);
    if (isNaN(ratedUserIdInt) || ratedUserIdInt === raterId) {
      console.log("Invalid ratedUserId or attempting to check self");
      return new Response(
        JSON.stringify({
          message: "Invalid rated user ID or cannot check self",
        }),
        { status: 400 }
      );
    }

    const rating = await prisma.userRating.findUnique({
      where: {
        raterId_ratedUserId: {
          raterId,
          ratedUserId: ratedUserIdInt,
        },
      },
    });

    return new Response(
      JSON.stringify({
        hasRated: !!rating,
        rating: rating ? rating.rating : null,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/rating/status:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}
