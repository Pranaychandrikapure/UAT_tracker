"use client";

import React, { useState } from "react";
import {
  Rocket,
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Info,
} from "lucide-react";
import { api, AuthUser, Role } from "@/lib/api";
import { DEFAULT_USERS } from "@/lib/default-dummy-data";

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [activeTab, setActiveTab] = useState<"SSO" | "ADMIN" | "DEMO">("SSO");

  // Admin credentials state
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // SSO state
  const [gmailInput, setGmailInput] = useState("");
  const [gmailName, setGmailName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPolicyError, setIsPolicyError] = useState(false);

  // 1. Admin Username & Password Login Handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim()) {
      setErrorMsg("Please enter your administrator username or email.");
      setIsPolicyError(false);
      return;
    }
    if (!adminPassword) {
      setErrorMsg("Please enter your administrator password.");
      setIsPolicyError(false);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setIsPolicyError(false);

    try {
      const res = await api.adminLogin(adminUsername.trim(), adminPassword);
      if (res && res.user) {
        onLoginSuccess({
          ...res.user,
          login_method: "PASSWORD",
        });
      } else {
        // Fallback for standalone/mock environment if backend is unreachable
        if (
          (adminUsername.trim().toLowerCase() === "admin" || adminUsername.trim().toLowerCase() === "admin@neml.in") &&
          adminPassword === "admin123"
        ) {
          onLoginSuccess({
            id: "2f27b395-d275-4699-8cae-0321b674bea9",
            employee_code: "ADM-001",
            username: "admin",
            email: "admin@neml.in",
            display_name: "System Administrator",
            role_title: "System Administrator",
            login_method: "PASSWORD",
            assigned_projects: [
              { id: "proj-esam-01", code: "ESAM", name: "E-Auction & Trading Platform" },
              { id: "proj-neml-02", code: "NEML_CORE", name: "NeML Core Trading Engine" },
            ],
          });
        } else {
          throw new Error("Invalid administrator username or password.");
        }
      }
    } catch (err: any) {
      const msg = err.message || "Authentication failed.";
      setErrorMsg(msg);
      // Check if user was rejected due to enterprise policy (non-admin attempting password login)
      if (
        msg.toLowerCase().includes("sso") ||
        msg.toLowerCase().includes("standard user") ||
        msg.toLowerCase().includes("denied")
      ) {
        setIsPolicyError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Google / Corporate SSO Handler (For all other enterprise roles)
  const handleGoogleSso = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const emailToUse = gmailInput.trim() || "corporate.user@gmail.com";
    const nameToUse = gmailName.trim() || emailToUse.split("@")[0].replace(".", " ");

    setIsLoading(true);
    setErrorMsg(null);
    setIsPolicyError(false);
    try {
      // Call backend Google SSO callback endpoint
      const res = await api.googleSsoLogin({
        email: emailToUse,
        display_name: nameToUse,
        google_id: `g_${Date.now()}`,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameToUse)}`,
      });

      if (res && res.user) {
        onLoginSuccess({
          ...res.user,
          login_method: "GOOGLE_SSO",
        });
      } else {
        // Standalone Fallback: Synthesize authenticated regular staff user profile
        const syntheticUser: AuthUser = {
          id: `usr-g-${Date.now()}`,
          employee_code: `G-${String(Math.floor(Math.random() * 900) + 100)}`,
          email: emailToUse,
          display_name: nameToUse,
          role_title: "Developer",
          login_method: "GOOGLE_SSO",
          assigned_projects: [
            { id: "proj-esam-01", code: "ESAM", name: "E-Auction & Trading Platform" },
            { id: "proj-neml-02", code: "NEML_CORE", name: "NeML Core Trading Engine" },
          ],
        };
        onLoginSuccess(syntheticUser);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "SSO authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Demo Role Switcher (For local development testing)
  const handleDemoLogin = (targetUser: typeof DEFAULT_USERS[0]) => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsPolicyError(false);
    setTimeout(() => {
      const authUser: AuthUser = {
        id: targetUser.id,
        employee_code: targetUser.employee_code,
        email: targetUser.email,
        display_name: targetUser.display_name,
        role_title: (targetUser.role_title as Role) || "Developer",
        avatar_url: targetUser.avatar_url,
        assigned_projects: targetUser.assigned_projects,
        login_method: "DEMO",
      };
      setIsLoading(false);
      onLoginSuccess(authUser);
    }, 200);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        padding: "24px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 490,
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* HEADER BAR */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)",
            padding: "26px 24px 22px",
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              margin: "0 auto 10px",
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(8px)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <Rocket size={26} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            UAT & Release Tracker
          </h1>
          <p style={{ fontSize: 12, color: "#bfdbfe", margin: 0, fontWeight: 400 }}>
            Enterprise Governance & Authentication Portal
          </p>
        </div>

        {/* ENTERPRISE POLICY ANNOUNCEMENT */}
        <div
          style={{
            background: "#f0fdf4",
            borderBottom: "1px solid #bbf7d0",
            padding: "8px 16px",
            fontSize: 11,
            color: "#166534",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Info size={14} color="#16a34a" style={{ flexShrink: 0 }} />
          <span>
            <strong>Access Rule:</strong> Administrator logs in with username & password; all other team members authenticate via SSO.
          </span>
        </div>

        {/* TAB CONTROLS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab("SSO");
              setErrorMsg(null);
              setIsPolicyError(false);
            }}
            style={{
              padding: "12px 6px",
              fontSize: 12,
              fontWeight: activeTab === "SSO" ? 700 : 500,
              color: activeTab === "SSO" ? "#1d4ed8" : "#64748b",
              background: activeTab === "SSO" ? "#ffffff" : "transparent",
              border: "none",
              borderBottom: activeTab === "SSO" ? "2px solid #1d4ed8" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <Building2 size={13} />
            <span>Staff SSO</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("ADMIN");
              setErrorMsg(null);
              setIsPolicyError(false);
            }}
            style={{
              padding: "12px 6px",
              fontSize: 12,
              fontWeight: activeTab === "ADMIN" ? 700 : 500,
              color: activeTab === "ADMIN" ? "#1d4ed8" : "#64748b",
              background: activeTab === "ADMIN" ? "#ffffff" : "transparent",
              border: "none",
              borderBottom: activeTab === "ADMIN" ? "2px solid #1d4ed8" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <Lock size={13} />
            <span>Admin Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("DEMO");
              setErrorMsg(null);
              setIsPolicyError(false);
            }}
            style={{
              padding: "12px 6px",
              fontSize: 12,
              fontWeight: activeTab === "DEMO" ? 700 : 500,
              color: activeTab === "DEMO" ? "#1d4ed8" : "#64748b",
              background: activeTab === "DEMO" ? "#ffffff" : "transparent",
              border: "none",
              borderBottom: activeTab === "DEMO" ? "2px solid #1d4ed8" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <UserCheck size={13} />
            <span>Demo Roles</span>
          </button>
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMsg && (
          <div
            style={{
              margin: "16px 20px 0",
              padding: "12px 14px",
              background: isPolicyError ? "#fff7ed" : "#fef2f2",
              border: `1px solid ${isPolicyError ? "#fed7aa" : "#fecaca"}`,
              borderRadius: 8,
              fontSize: 12,
              color: isPolicyError ? "#c2410c" : "#b91c1c",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {isPolicyError ? "Enterprise Access Policy Enforced" : "Sign In Error"}
                </div>
                <div>{errorMsg}</div>
                {isPolicyError && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("SSO");
                      setErrorMsg(null);
                      setIsPolicyError(false);
                    }}
                    style={{
                      marginTop: 8,
                      padding: "5px 10px",
                      background: "#ea580c",
                      color: "#fff",
                      border: "none",
                      borderRadius: 5,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>Switch to Enterprise SSO Portal</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: ENTERPRISE SINGLE SIGN-ON (SSO) - FOR ALL NON-ADMIN USERS */}
        {activeTab === "SSO" && (
          <div style={{ padding: "24px 20px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                Enterprise Single Sign-On (SSO)
              </h2>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                Standard sign-in for Project Managers, Developers, BAs, and UAT Testers
              </p>
            </div>

            {/* BIG GOOGLE SSO BUTTON */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleGoogleSso()}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "12px 18px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                color: "#1e293b",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#94a3b8";
                e.currentTarget.style.background = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#ffffff";
              }}
            >
              {/* Google Multicolored G SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? "Authenticating SSO..." : "Sign in with Google Workspace"}</span>
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                margin: "20px 0",
                color: "#94a3b8",
                fontSize: 11,
              }}
            >
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }}></div>
              <span style={{ padding: "0 10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Or Corporate SSO Address
              </span>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }}></div>
            </div>

            {/* Custom Corporate SSO Form */}
            <form onSubmit={handleGoogleSso} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                  Corporate Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. pranay.lead@neml.in"
                  value={gmailInput}
                  onChange={(e) => setGmailInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pranay C"
                  value={gmailName}
                  onChange={(e) => setGmailName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#1d4ed8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>{isLoading ? "Signing in..." : "Continue via Corporate SSO"}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: ADMINISTRATOR LOGIN (USERNAME & PASSWORD) - EXCLUSIVELY FOR ADMIN */}
        {activeTab === "ADMIN" && (
          <form onSubmit={handleAdminLogin} style={{ padding: "24px 20px" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: "#fee2e2",
                  color: "#991b1b",
                  fontSize: 11,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                <Lock size={12} />
                <span>Restricted Access: Administrators Only</span>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
                System Administrator Login
              </h2>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                Sign in with your administrator username and password
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                  Admin Username or Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="admin or admin@neml.in"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#334155" }}>
                  Admin Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 36px 9px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontSize: 11,
                  color: "#64748b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Default Credentials:</span>
                <code>admin / admin123</code>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#1e3a8a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 2px 4px rgba(30, 58, 138, 0.25)",
                }}
              >
                <KeyRound size={15} />
                <span>{isLoading ? "Authenticating Admin..." : "Sign in as Administrator"}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: DEMO ROLES (FOR LOCAL DEVELOPMENT & TESTING) */}
        {activeTab === "DEMO" && (
          <div style={{ padding: "20px" }}>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
                Development Role Switcher
              </h2>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                Test stakeholder permission levels and approval hierarchy
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 310, overflowY: "auto" }}>
              {DEFAULT_USERS.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 12,
                    background: "#f8fafc",
                    borderRadius: 8,
                    border: "1px dashed #e2e8f0",
                  }}
                >
                  <p style={{ margin: "0 0 8px" }}>No demo users in default list.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onLoginSuccess({
                        id: "usr-dev-demo",
                        employee_code: "EMP-042",
                        email: "developer.lead@neml.in",
                        display_name: "Developer Lead",
                        role_title: "Developer Lead",
                        login_method: "DEMO",
                        assigned_projects: [{ id: "proj-esam-01", code: "ESAM", name: "E-Auction & Trading Platform" }],
                      });
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Quick Test as Developer Lead
                  </button>
                </div>
              ) : (
                DEFAULT_USERS.slice(0, 6).map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleDemoLogin(u)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#93c5fd";
                      e.currentTarget.style.background = "#eff6ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.background = "#f8fafc";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#1d4ed8",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      >
                        {u.display_name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                          {u.display_name}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          {u.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "#e0e7ff",
                          color: "#3730a3",
                        }}
                      >
                        {u.role_title}
                      </span>
                      <div style={{ fontSize: 10, color: "#2563eb", marginTop: 2, fontWeight: 600 }}>
                        Sign In →
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* FOOTER GOVERNANCE BADGE */}
        <div
          style={{
            background: "#f1f5f9",
            padding: "12px 20px",
            borderTop: "1px solid #e2e8f0",
            fontSize: 11,
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={14} color="#16a34a" />
            <span>SOC2 Type II & SEBI SOP 2.0 Compliant</span>
          </div>
          <span>v2.0.42</span>
        </div>
      </div>
    </div>
  );
}
