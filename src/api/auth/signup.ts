import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";

export default async function signupHandler(req: Request, res: Response) {
  const {
    name,
    email,
    password,
    contactNumber,
    city,
    country,
    userRole,
    institution,
    highestEducation,
    odrLabUsage,
    facultyMentor, // Accept extra fields but ignore for DB
    // Accept all possible frontend fields, ignore those not needed
  } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required." });
  }
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: "Email already in use." });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      userRole: userRole || "INNOVATOR",
      contactNumber: contactNumber || null,
      city: city || null,
      country: country || null,
      institution: institution || null,
      highestEducation: highestEducation || null,
      odrLabUsage: odrLabUsage || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      userRole: true,
      contactNumber: true,
      city: true,
      country: true,
      institution: true,
      highestEducation: true,
      odrLabUsage: true,
      createdAt: true,
    },
  });
  // For frontend auto-login, return a JWT token as well
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { id: user.id, email: user.email, userRole: user.userRole },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.status(201).json({ user, token });
}
