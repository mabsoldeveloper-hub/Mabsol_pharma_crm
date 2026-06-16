"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: any) => {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    if (data.success) {
      router.push("/dashboard");
    } else {
      alert(data.message);
    }
  };

  return (
    <div className="container-fluid vh-100 p-0">
      <div className="row g-0 h-100">

        {/* Left Side */}
        <div className="col-lg-6 d-flex align-items-center justify-content-center bg-light">

          <div
            className="card shadow-lg border-0 p-4"
            style={{
              width: "400px",
              borderRadius: "20px",
            }}
          >
            <div className="text-center mb-4">
              <div className="flex justify-center">
                  <img src="/mabsol_logo.ico" alt="Logo" width="100" />
              </div>

              <h3 className="mt-3">
                Mabsol CRM
              </h3>

              <p className="text-muted">
                Welcome Back
              </p>
            </div>

            <form onSubmit={handleLogin}>

              <div className="mb-3">
                <label>Email</label>

                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter Email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />
              </div>

              <div className="mb-3">
                <label>Password</label>

                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
              >
                Login
              </button>

                    
              <button
                type="button"
                className="btn btn-outline-secondary w-100 mt-2"
                onClick={() =>
                  router.push("/register")
                }
              >
                Register
              </button>

            </form>
          </div>

        </div>

        {/* Right Side */}
        <div className="col-lg-6 d-none d-lg-block position-relative">

          <img  src="/1.jpg" alt="Background" className="w-100 h-100"
             style={{
              objectFit: "cover",
            }}
          />

          <div
            className="position-absolute bottom-0 start-0 text-white p-5"
          >
            <h2>
              Welcome to Mabsol CRM
            </h2>

            <p>
              Manage customers, leads,
              sales and operations from
              one place.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}