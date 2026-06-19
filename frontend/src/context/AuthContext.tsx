"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: string;
    plan: string;
}

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    login: (token: string, user: UserProfile) => void;
    logout: () => void;
    selectedWorkspaceId: string | null;
    setSelectedWorkspaceId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            api.get<any>("/auth/me")
                .then((userData) => {
                    setUser({
                        id: userData.id,
                        email: userData.email,
                        full_name: userData.full_name,
                        role: userData.role,
                        plan: userData.subscription?.plan?.name || "Free"
                    });
                })
                .catch(() => {
                    localStorage.removeItem("token");
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = (token: string, userProfile: UserProfile) => {
        localStorage.setItem("token", token);
        setUser(userProfile);
        router.push("/dashboard");
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        setSelectedWorkspaceId(null);
        router.push("/");
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            selectedWorkspaceId,
            setSelectedWorkspaceId
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
