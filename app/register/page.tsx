"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await res.json();

    if (data.success) {
      alert("Registration Successful");
      router.push("/login");
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
              width: "420px",
              borderRadius: "20px",
            }}
          >
            <div className="text-center mb-4">

            <div className="flex justify-center">
                  <Image src="/mabsol_logo.ico" alt="Logo" width={100} height={100} />
              </div>

              <h3 className="mt-3">
                Mabsol Pharma CRM
              </h3>

              <p className="text-muted">
                Create New Account
              </p>
            </div>

            <form onSubmit={handleRegister}>

              <div className="mb-3">
                <label className="form-label">
                  Full Name
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Email
                </label>

                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter Email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Password
                </label>

                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-success w-100"
              >
                Create Account
              </button>

              <button
                type="button"
                className="btn btn-outline-primary w-100 mt-2"
                onClick={() =>
                  router.push("/login")
                }
              >
                Back To Login
              </button>

            </form>

          </div>

        </div>

        {/* Right Side */}
        <div className="col-lg-6 d-none d-lg-block position-relative">

          <Image
            src="/2.jpg"
            alt="Background"
            fill
            sizes="50vw"
            style={{
              objectFit: "cover",
            }}
          />

          <div className="position-absolute bottom-0 start-0 p-5 text-white">
            <h2>
              Welcome To Mabsol CRM
            </h2>

            <p>
              Manage Leads, Customers,
              Invoices, Employees and
              Business Operations Easily.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
