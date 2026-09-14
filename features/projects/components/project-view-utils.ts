export type ProjectHealthTone = "orange" | "red" | "green";

export function projectHealthTone(health: string): ProjectHealthTone {
  if (health === "ปกติ") return "green";
  if (health === "ล่าช้า" || health === "เสี่ยงสูง") return "red";
  return "orange";
}

export function projectProgressTone(health: string): ProjectHealthTone {
  if (health === "ปกติ") return "green";
  if (health === "ล่าช้า") return "red";
  return "orange";
}
