import jwt from "jsonwebtoken";

export const verifyToken = (token: string) => {
  try {
    console.log("JWT SECRET:", process.env.JWT_SECRET);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    return decoded;
  } catch (error) {
    console.log("VERIFY ERROR:", error);
    return null;
  }
};