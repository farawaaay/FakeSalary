import { Db, ObjectId } from "mongodb";

// 用户的结构
export interface User {
  _id: ObjectId; // unique ID
  username: string; // 用户名
  role: "Admin" | "Student"; // 用户类型，可以是管理员或者普通学生
}

// 书的结构
export interface Book {
  _id: ObjectId; // unique id
  bookName: string; // 书名
  bookISBN: string; // 书的ISBN号
  borrower: ObjectId; // 借书人
  record: Array<{
    operation: "borrow" | "return";
    operator: ObjectId;
    time: Date;
  }>; // 该书的借还记录
}
/**
 * 注：db均为数据库的实例
 */

// 初始化数据库，无返回值
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

/**
 * 有多少管理员
 * @param db
 * @returns 管理员数量
 */
export async function countAdmin(db: Db) {
  return await db.collection("user").countDocuments({ role: "Admin" });
}

/**
 * 判断用户是否存在
 * @param db
 * @param username
 * @returns 是或否
 */
export async function usernameExists(db: Db, username: string) {
  return (await db.collection("user").countDocuments({ username })) > 0;
}

/**
 * 注册一个用户
 * @param db
 * @param role
 * @param username
 * @param password
 * @returns 用户ID
 */
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

//
/**
 * 登录这个系统
 * @param db
 * @param username
 * @param password
 * @returns 用户结构体
 */
export async function login(db: Db, username: string, password: string) {
  const user = await db
    .collection<User>("user")
    .findOne({ username, password }, { projection: { password: false } });
  if (user === null) {
    throw new Error("Username or password invalid!");
  }

  return user;
}

/**
 * 批量添加书籍
 * @param db
 * @param adder // 添加者
 * @param bookName
 * @param bookISBN
 * @param bookCount
 * @returns 添加了多少书籍
 */
export async function addBooks(
  db: Db,
  adder: ObjectId, // 书籍添加者
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

/**
 * 批量移除书籍
 * @param db
 * @param bookISBN 书号
 * @param bookCount 书记数量
 * @returns 二元组: (删了的数量, 还剩多少)
 */
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

/**
 * 借书
 * @param db 数据库实例
 * @param borrower 借书者
 * @param bookISBN 要借的书
 */
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

// 还书
/**
 *
 * @param db 数据库实例
 * @param borrower 还书者
 * @param bookISBN 书籍isbn
 */
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

//
/**
 * 列出所有我借了的书
 * @param db 数据库实例
 * @param borrower 借书人
 * @returns 书的列表
 */
export async function list(db: Db, borrower: ObjectId) {
  return await db
    .collection<Book>("book")
    .find({ borrower })
    .toArray();
}

//
/**
 * 学生信息
 * @param db
 * @param username 用户名
 * @returns 学生信息
 */
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
      // record: 学生借书记录的数组
      /**
       * bookName: "$bookName", // 书名
         bookISBN: "$bookISBN", // 书号
         operation: "$record.operation", // 操作，借或还
         operator: "$record.operator", // 操作人
         time: "$record.time", // 操作时间
       */
    };
  }

  throw new Error("No user found!");
}

// 书籍信息
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

    // record: 学生借书记录的数组
    /**
     *   operation: // 类型，借书或者还书
         username: "$record.operator", // 操作人
         time: "$record.time", // 操作时间
       */
  };
}
