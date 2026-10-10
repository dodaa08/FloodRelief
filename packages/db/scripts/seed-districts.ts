// Seed districts (name/state + marker center + flood-prone tag).
// Idempotent: upserts on (state, name). Run: bun run seed:districts
import { prisma } from "../index.js";

type Seed = {
  name: string;
  state: string;
  lat: number;
  lng: number;
  isFloodProne?: boolean;
};

const DISTRICTS: Seed[] = [
  // Assam
  { name: "Cachar", state: "Assam", lat: 24.83, lng: 92.79, isFloodProne: true },
  { name: "Dhemaji", state: "Assam", lat: 27.48, lng: 94.58, isFloodProne: true },
  { name: "Barpeta", state: "Assam", lat: 26.32, lng: 91.0, isFloodProne: true },
  { name: "Nagaon", state: "Assam", lat: 26.35, lng: 92.68, isFloodProne: true },
  // Bihar
  { name: "Darbhanga", state: "Bihar", lat: 26.15, lng: 85.9, isFloodProne: true },
  { name: "Sitamarhi", state: "Bihar", lat: 26.59, lng: 85.49, isFloodProne: true },
  { name: "Muzaffarpur", state: "Bihar", lat: 26.12, lng: 85.39, isFloodProne: true },
  { name: "Katihar", state: "Bihar", lat: 25.54, lng: 87.58, isFloodProne: true },
  // Kerala
  { name: "Alappuzha", state: "Kerala", lat: 9.49, lng: 76.32, isFloodProne: true },
  { name: "Wayanad", state: "Kerala", lat: 11.61, lng: 76.08, isFloodProne: true },
  { name: "Ernakulam", state: "Kerala", lat: 9.98, lng: 76.28, isFloodProne: true },
  // Maharashtra
  { name: "Sangli", state: "Maharashtra", lat: 16.85, lng: 74.57, isFloodProne: true },
  { name: "Raigad", state: "Maharashtra", lat: 18.87, lng: 73.1, isFloodProne: true },
  // West Bengal
  { name: "Nadia", state: "West Bengal", lat: 23.4, lng: 88.5, isFloodProne: true },
  { name: "Howrah", state: "West Bengal", lat: 22.59, lng: 88.31, isFloodProne: true },
  // Odisha
  { name: "Cuttack", state: "Odisha", lat: 20.46, lng: 85.88, isFloodProne: true },
  { name: "Puri", state: "Odisha", lat: 19.81, lng: 85.83, isFloodProne: true },
  // East coast
  { name: "Krishna", state: "Andhra Pradesh", lat: 16.51, lng: 80.65, isFloodProne: true },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.08, lng: 80.27, isFloodProne: true },
  // Contrast districts (not historically flood-prone)
  { name: "Hyderabad", state: "Telangana", lat: 17.38, lng: 78.48, isFloodProne: false },
  { name: "Jaipur", state: "Rajasthan", lat: 26.91, lng: 75.79, isFloodProne: false },
  { name: "Kalaburagi", state: "Karnataka", lat: 17.33, lng: 76.83, isFloodProne: true },
];

for (const d of DISTRICTS) {
  await prisma.district.upsert({
    where: { state_name: { state: d.state, name: d.name } },
    create: d,
    update: { lat: d.lat, lng: d.lng, isFloodProne: d.isFloodProne ?? false },
  });
}

const count = await prisma.district.count();
console.log(`districts: ${count} total (${DISTRICTS.length} upserted)`);
await prisma.$disconnect();