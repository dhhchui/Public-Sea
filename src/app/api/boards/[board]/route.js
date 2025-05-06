import prisma from "@/lib/prisma";

export async function GET(request) {
  console.log("Received GET request to /api/boards");

  try {
    const boards = await prisma.board.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return new Response(JSON.stringify({ boards }), { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/boards:", error);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}
