import { Db } from "mongodb";

export async function countAdmin(db: Db) {
  return await db.collection("user").countDocuments({ role: "Admin" });
}

export async function usernameExists(db: Db, username: string) {
  return (await db.collection("user").countDocuments({ username })) > 0;
}

export async function register(
  db: Db,
  role: "Admin" | "Employee",
  username: string,
  password: string
) {
  try {
    const { insertedCount, insertedId } = await db
      .collection("user")
      .insertOne({ role, username, password });
    if (insertedCount === 1) {
      return insertedId;
    } else {
      throw new Error("Unknown Error!");
    }
  } catch (e) {
    throw new Error("Username already exists!");
  }
}
