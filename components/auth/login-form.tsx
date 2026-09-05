"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block" htmlFor="login-email">
        <span className="text-xs font-semibold">อีเมลสถาบัน</span>
        <input
          className="mt-2 h-12 w-full border border-stone-300 px-3 text-sm outline-none focus:border-[#d8470c] focus:ring-2 focus:ring-orange-100"
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        {state.errors?.email?.map((error) => (
          <span className="mt-1 block text-xs text-red-700" key={error}>
            {error}
          </span>
        ))}
      </label>
      <label className="block" htmlFor="login-password">
        <span className="flex justify-between text-xs font-semibold">
          <span>รหัสผ่าน</span>
          <Link className="text-[#b53807]" href="/forgot-password">
            ลืมรหัสผ่าน?
          </Link>
        </span>
        <input
          className="mt-2 h-12 w-full border border-stone-300 px-3 text-sm outline-none focus:border-[#d8470c] focus:ring-2 focus:ring-orange-100"
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {state.errors?.password?.map((error) => (
          <span className="mt-1 block text-xs text-red-700" key={error}>
            {error}
          </span>
        ))}
      </label>
      {state.message ? (
        <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        className="flex h-12 w-full items-center justify-center gap-2 bg-[#cf430c] text-sm font-bold text-white hover:bg-[#ad3507] disabled:cursor-wait disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? <LoaderCircle className="animate-spin" size={17} /> : null}
        {pending ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"} <ArrowRight size={17} />
      </button>
    </form>
  );
}
