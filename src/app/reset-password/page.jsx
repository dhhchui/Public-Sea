"use client";
import ResetPasswordForm from "../../components/Reset-password-form";

export default function ResetPassword() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <ResetPasswordForm />
      </div>
    </div>
  );
}