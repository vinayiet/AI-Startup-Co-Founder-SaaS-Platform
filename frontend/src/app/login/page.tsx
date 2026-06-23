"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Forgot Password Flow States
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    const validateEmail = (emailStr: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailStr);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateEmail(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append("username", email);
            formData.append("password", password);

            const res = await api.post<any>("/auth/login", null, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData.toString()
            } as any);

            login(res.access_token, res.user);
        } catch (err: any) {
            setError(err.message || "Invalid credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setResetSuccess(false);

        if (!validateEmail(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        // Simulate sending email reset link
        setTimeout(() => {
            setLoading(false);
            setResetSuccess(true);
        }, 1200);
    };

    return (
        <div className="relative min-h-screen bg-[#f8fafc] bg-grid-pattern flex items-center justify-center px-4 text-slate-800">
            {/* Ambient background blur */}
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
                
                {/* Header Section */}
                <div className="flex flex-col items-center mb-8">
                    <Link href="/" className="font-extrabold text-base tracking-tight text-slate-900 mb-4 flex items-center gap-1.5">
                        cofounder<span className="text-indigo-650 font-extrabold">.ai</span>
                    </Link>
                    <h2 className="text-xl font-bold text-slate-900">
                        {isForgotMode ? "Reset Password" : "Welcome Back"}
                    </h2>
                    <p className="text-xs text-slate-500 text-center mt-1">
                        {isForgotMode 
                            ? "Enter your email address and we'll send you a recovery link" 
                            : "Enter your credentials to access your startup workspace"}
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="p-3.5 mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                        {error}
                    </div>
                )}

                {/* Success Banner */}
                {resetSuccess && (
                    <div className="p-3.5 mb-6 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                        Reset link has been sent to {email}. (Simulated recovery flow)
                    </div>
                )}

                {/* Conditional Sub-State Rendering */}
                {isForgotMode ? (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50 text-xs uppercase tracking-wider"
                        >
                            {loading ? "Sending..." : "Send Recovery Link"}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setIsForgotMode(false);
                                setResetSuccess(false);
                                setError(null);
                            }}
                            className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors pt-2 block"
                        >
                            Back to Sign In
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsForgotMode(true);
                                        setResetSuccess(false);
                                        setError(null);
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wider"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50 text-xs uppercase tracking-wider"
                        >
                            {loading ? "Verifying..." : "Sign In"}
                        </button>
                    </form>
                )}

                {!isForgotMode && (
                    <div className="mt-8 text-center text-xs text-slate-500">
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors">
                            Create workspace
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
