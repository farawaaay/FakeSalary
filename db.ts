import { Db, ObjectId } from "mongodb";

export interface User {
  _id: ObjectId;
  username: string;
  role: "Admin" | "Student";
}

export interface Book {
  _id: ObjectId;
  bookName: string;
  bookISBN: string;
  borrower: ObjectId;
  record: Array<{
    operation: "borrow" | "return";
    operator: ObjectId;
    time: Date;
  }>;
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
      borrower: null,
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

export async function borrowBook(db: Db, borrower: ObjectId, bookISBN: string) {
  const { value, ok } = await db.collection<Book>("book").findOneAndUpdate(
    { bookISBN, locked: null, borrower: null },
    {
      $set: { borrower },
      $push: {
        record: { operation: "borrow", operator: borrower, time: new Date() },
      },
    },
  );
  if (value && ok === 1) {
    return value;
  }

  throw new Error("Book not found!");
}

export async function returnBook(db: Db, borrower: ObjectId, bookISBN: string) {
  const { value, ok } = await db.collection<Book>("book").findOneAndUpdate(
    { bookISBN, locked: null, borrower },
    {
      $set: { borrower: null },
      $push: {
        record: { operation: "return", operator: borrower, time: new Date() },
      },
    },
  );
  if (value && ok === 1) {
    return value;
  }

  throw new Error("Not borrowed to you!");
}

export async function list(db: Db, borrower: ObjectId) {
  return await db
    .collection<Book>("book")
    .find({ borrower })
    .toArray();
}

export async function studentInfo(db: Db, username: string) {
  const userInfo = await db.collection<User>("user").findOne({ username });
  if (userInfo) {
    return {
      username: userInfo.username,
      role: userInfo.role,
      record: await db
        .collection("book")
        .aggregate([
          {
            $match: { "record.operator": userInfo._id },
          },
          {
            $unwind: "$record",
          },
          {
            $project: {
              bookName: "$bookName",
              bookISBN: "$bookISBN",
              operation: "$record.operation",
              operator: "$record.operator",
              time: "$record.time",
            },
          },
          {
            $match: {
              operator: userInfo._id,
            },
          },
        ])
        .toArray(),
    };
  }

  throw new Error("No user found!");
}

export async function bookInfo(db: Db, bookISBN: string) {
  const book = await db
    .collection<Book>("book")
    .findOne({ bookISBN }, { projection: { record: false, borrower: false } });
  if (!book) {
    throw new Error("No book found!");
  }
  const borrowed = await db
    .collection<Book>("book")
    .countDocuments({ bookISBN, borrower: null });
  const all = await db.collection<Book>("book").countDocuments({ bookISBN });

  return {
    ...book,
    borrowed,
    all,
    record: await db
      .collection("book")
      .aggregate([
        {
          $match: { bookISBN },
        },
        {
          $unwind: "$record",
        },
        {
          $project: {
            bookName: "$bookName",
            bookISBN: "$bookISBN",
            operation: "$record.operation",
            operator: "$record.operator",
            time: "$record.time",
          },
        },
        {
          $lookup: {
            from: "user",
            localField: "operator",
            foreignField: "_id",
            as: "operatorInfo",
          },
        },
        {
          $project: {
            operation: "$operation",
            time: "$time",
            operatorInfo: { $arrayElemAt: ["$operatorInfo", 0] },
          },
        },
        {
          $project: {
            operation: "$operation",
            username: "$operatorInfo.username",
            time: "$time",
          },
        },
      ])
      .toArray(),
  };
}
