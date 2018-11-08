import { Db, ObjectId } from "mongodb";

export interface User {
  _id: ObjectId;
  username: string;
  role: "Admin" | "Student";
}

export async function init(db: Db) {
  await db.createCollection("user");
  await db.createCollection("book");

  const usernameUnique = "username_unique";
  const user = db.collection("user");
  if (!(await user.indexExists(usernameUnique))) {
    await user.createIndex(
      { username: 1 },
      {
        name: usernameUnique,
        unique: true,
        dropDups: true,
      },
    );
  }
}

export async function countAdmin(db: Db) {
  return await db.collection("user").countDocuments({ role: "Admin" });
}

export async function usernameExists(db: Db, username: string) {
  return (await db.collection("user").countDocuments({ username })) > 0;
}

export async function register(
  db: Db,
  role: "Admin" | "Student",
  username: string,
  password: string,
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

export async function login(db: Db, username: string, password: string) {
  const user = await db
    .collection<User>("user")
    .findOne({ username, password }, { projection: { password: false } });
  if (user === null) {
    throw new Error("Username or password invalid!");
  }

  return user;
}

export async function addBooks(
  db: Db,
  adder: ObjectId,
  bookName: string,
  bookISBN: string,
  bookCount: number,
) {
  const { insertedCount } = await db.collection("book").insertMany(
    new Array(bookCount).fill(0).map(() => ({
      bookName,
      bookISBN,
      addTime: new Date(),
      adder,
      lender: null,
    })),
  );

  if (insertedCount === bookCount) {
    return true;
  }

  throw new Error("Unknown Error!");
}

export async function removeBooks(db: Db, bookISBN: string, bookCount: number) {
  await db
    .collection("book")
    .updateMany({ bookISBN }, { $set: { locked: true } });
  for (let i = 0; i < bookCount; i++) {
    const { value } = await db
      .collection("book")
      .findOneAndDelete({ bookISBN });
    if (!value) {
      return [i, 0];
    }
  }
  const {
    result: { nModified },
  } = await db
    .collection("book")
    .updateMany({ bookISBN }, { $unset: { locked: "" } });
  return [bookCount, nModified];
}
