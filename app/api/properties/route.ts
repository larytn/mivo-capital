import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function member(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  return token ? verifyToken(token) as { id?: string; userId?: string; role?: string } | null : null;
}

export async function GET() {
  try {
    const properties = await prisma.propertyListing.findMany({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } });
    return NextResponse.json({ properties });
  } catch (error) {
    console.error("PROPERTIES GET ERROR:", error);
    return NextResponse.json({ error: "Property listings are not available yet." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = member(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only the Mivo team can publish listings." }, { status: 403 });
  const userId = user.id || user.userId;
  if (!userId) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const propertyType = typeof body.propertyType === "string" ? body.propertyType.trim() : "";
    const price = Number(body.price);
    if (!title || !description || !location || !propertyType || !Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Complete the property details and enter a valid price." }, { status: 400 });
    const property = await prisma.propertyListing.create({ data: { title, description, location, propertyType, price, currency: body.currency === "USD" ? "USD" : "NGN", bedrooms: Number.isInteger(body.bedrooms) ? body.bedrooms : null, bathrooms: Number.isInteger(body.bathrooms) ? body.bathrooms : null, imageUrl: typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null, createdById: userId } });
    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error("PROPERTY CREATE ERROR:", error);
    return NextResponse.json({ error: "Unable to publish this listing." }, { status: 500 });
  }
}