import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const PATCH = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received PATCH request to /api/edit-profile");

    try {
      let { nickname, oldPassword, password, confirmPassword, bio, hobbies } =
        await request.json();
      console.log("Request body:", {
        nickname,
        oldPassword,
        password,
        confirmPassword,
        bio,
        hobbies,
      });

      if (!nickname) {
        console.log("Missing required field: nickname");
        return NextResponse.json(
          { message: "Nickname is required" },
          { status: 400 }
        );
      }

      nickname = nickname.trim();
      if (password) {
        password = password.trim();
        confirmPassword = confirmPassword.trim();
        oldPassword = oldPassword ? oldPassword.trim() : "";
      }

      if (/\s/.test(nickname)) {
        console.log("Nickname contains whitespace characters:", nickname);
        return NextResponse.json(
          {
            message: "Nickname cannot contain spaces or whitespace characters",
          },
          { status: 400 }
        );
      }

      if (nickname.length < 3) {
        console.log("Nickname is too short");
        return NextResponse.json(
          { message: "Nickname must be at least 3 characters long" },
          { status: 400 }
        );
      }

      const forbiddenKeywords = [
        "admin",
        "administrator",
        "select",
        "insert",
        "update",
        "delete",
        "drop",
        "create",
        "alter",
        "truncate",
        "union",
        "join",
        "where",
        "from",
        "into",
        "exec",
        "execute",
      ];

      const nicknameLower = nickname.toLowerCase();
      const containsForbiddenKeyword = forbiddenKeywords.some((keyword) =>
        nicknameLower.includes(keyword)
      );

      if (containsForbiddenKeyword) {
        console.log("Nickname contains forbidden keyword");
        return NextResponse.json(
          { message: 'Nickname cannot contain "Admin" or SQL keywords' },
          { status: 400 }
        );
      }

      const updateData = { nickname, bio };
      let logoutRequired = false;

      if (hobbies) {
        if (!Array.isArray(hobbies)) {
          console.log("Invalid hobbies format:", hobbies);
          return NextResponse.json(
            { message: "Hobbies must be an array" },
            { status: 400 }
          );
        }

        console.log("Deleting existing hobbies for user:", userId);
        await prisma.hobby.deleteMany({
          where: { userId },
        });

        if (hobbies.length > 0) {
          console.log("Creating new hobbies for user:", userId);
          updateData.hobbies = {
            create: hobbies.map((hobby) => ({
              name: hobby.trim(),
            })),
          };
        }
      }

      if (password) {
        if (password !== confirmPassword) {
          console.log("Passwords do not match");
          return NextResponse.json(
            { message: "Passwords do not match" },
            { status: 400 }
          );
        }

        if (/\s/.test(password)) {
          console.log("Password contains whitespace characters:", password);
          return NextResponse.json(
            {
              message:
                "Password cannot contain spaces or whitespace characters",
            },
            { status: 400 }
          );
        }

        if (password.length < 8) {
          console.log("Password is too short");
          return NextResponse.json(
            { message: "Password must be at least 8 characters long" },
            { status: 400 }
          );
        }

        if (password.length > 24) {
          console.log("Password is too long");
          return NextResponse.json(
            { message: "Password cannot exceed 24 characters" },
            { status: 400 }
          );
        }

        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        if (!hasLetter || !hasNumber) {
          console.log("Password must contain both letters and numbers");
          return NextResponse.json(
            { message: "Password must contain both letters and numbers" },
            { status: 400 }
          );
        }

        if (!oldPassword) {
          console.log("Old password is required");
          return NextResponse.json(
            { message: "Please provide your old password" },
            { status: 400 }
          );
        }

        console.log("Fetching user to verify old password...");
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { password: true },
        });

        if (!user) {
          console.log("User not found");
          return NextResponse.json(
            { message: "User not found" },
            { status: 404 }
          );
        }

        console.log("Verifying old password...");
        const isOldPasswordValid = await argon2.verify(
          user.password,
          oldPassword
        );
        if (!isOldPasswordValid) {
          console.log("Old password is incorrect");
          return NextResponse.json(
            { message: "Old password is incorrect" },
            { status: 400 }
          );
        }

        console.log("Hashing new password...");
        const hashedPassword = await argon2.hash(password);
        updateData.password = hashedPassword;
        console.log("Password hashed successfully");
        logoutRequired = true;
      }

      console.log("Updating user in database...");
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // 失效相關快取
      const redis = getRedisClient();
      await redis.del(`user-profile:${userId}`);
      await redis.del(`me:${userId}`);

      console.log("User updated successfully:", updatedUser);
      return NextResponse.json(
        {
          message: "Profile updated successfully",
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            nickname: updatedUser.nickname,
          },
          logoutRequired,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in PATCH /api/edit-profile:", error);
      if (error.code === "P2002") {
        console.log("Nickname already exists");
        return NextResponse.json(
          { message: "Nickname already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);
