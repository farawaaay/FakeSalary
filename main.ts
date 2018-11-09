import program from "commander";
import { MongoClient } from "mongodb";
import { table, getBorderCharacters } from "table";

import {
  register,
  init,
  login,
  User,
  addBooks,
  removeBooks,
  list,
  borrowBook,
  returnBook,
  studentInfo,
  bookInfo,
} from "./db";
import { firstQuestion, adminQuestion, studentQuestion } from "./questions";

program
  .version("0.1.0")
  .usage("[options] <file ...>")
  .option("-h, --hostname <s>", "Hostname of database")
  .option("-p, --port <n>", "Port of database", parseInt)
  .option("-d, --database <s>", "Database name")
  .parse(process.argv);

program.hostname = program.hostname || "39.108.175.151";
program.port = program.port || "4001";
program.database = program.database || "library";

(async function() {
  const { hostname, port, database } = program;
  const uri = `mongodb://${hostname}:${port}/${database}`;
  const conn = await MongoClient.connect(
    uri,
    { useNewUrlParser: true },
  );
  const db = (await conn).db();
  await init(db);

  console.log("Welcome To Library Management System!");

  while (true) {
    const { action, username, password } = await firstQuestion(db);

    try {
      switch (action) {
        case "Sign In": {
          await loop(
            await login(db, username, password).then(user => {
              console.log(`Ok: "${username}" logged in.`);
              return user;
            }),
          );
          break;
        }
        case "Sign Up": {
          await loop({
            _id: await register(db, "Student", username, password).then(_id => {
              console.log(`OK: "${username}" signned up.`);
              return _id;
            }),
            username,
            role: "Student",
          });
          break;
        }
        case "Exit":
          await conn.close();
          process.exit(0);
          return;
        default: {
          await loop({
            _id: await register(db, "Admin", username, password).then(_id => {
              console.log(`OK: "${username}" signned up.`);
              return _id;
            }),
            username,
            role: "Admin",
          });
          break;
        }
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
      continue;
    }
  }

  async function loop(user: User) {
    if (user.role === "Admin") {
      let answers;
      do {
        answers = await adminQuestion(db);
        const { bookName, bookISBN, bookCount, studentUsername } = answers;
        try {
          switch (answers.cmd) {
            case "Add books": {
              if (
                await addBooks(
                  db,
                  user._id,
                  bookName!,
                  bookISBN!,
                  Number(bookCount!),
                )
              ) {
                console.log(`OK: ${bookCount} books added.`);
                continue;
              }
            }
            case "Remove books": {
              const [removed, rest] = await removeBooks(
                db,
                bookISBN!,
                Number(bookCount!),
              );
              console.log(`OK: ${removed} books removed, ${rest} remain.`);
              continue;
            }
            case "See student info": {
              const { username, role, record } = await studentInfo(
                db,
                studentUsername!,
              );

              console.log(`Username: ${username}, Role: ${role}`);
              console.log(`Borrow & Return Records:`);
              console.log(
                table(
                  [
                    ["No.", "Book Name", "Book ISBN", "Operation", "Time"],
                    ...record.map(
                      ({ bookName, bookISBN, operation, time }, i) => [
                        i + 1,
                        bookName,
                        bookISBN,
                        operation,
                        time.toLocaleString(),
                      ],
                    ),
                  ],
                  { border: getBorderCharacters("norc") },
                ),
              );
              break;
            }
            case "See book info": {
              const { borrowed, all, record, bookName } = await bookInfo(
                db,
                bookISBN!,
              );
              console.log(
                `Book Name: ${bookName}, Amount: ${all}, Borrowed: ${borrowed}`,
              );
              console.log(`Borrow & Return Records:`);
              console.log(
                table(
                  [
                    ["No.", "Username", "Operation", "Time"],
                    ...record.map(({ username, operation, time }, i) => [
                      i + 1,
                      username,
                      operation,
                      time.toLocaleString(),
                    ]),
                  ],
                  { border: getBorderCharacters("norc") },
                ),
              );
              break;
            }
            case "Log out":
              return;
          }
        } catch (e) {
          console.log(`Error: ${e.message}`);
          continue;
        }
      } while (answers);
    } else if (user.role === "Student") {
      let answers;
      do {
        answers = await studentQuestion();
        const { cmd, bookISBN } = answers;
        try {
          switch (cmd) {
            case "List books I borrowed": {
              const data = (await list(db, user._id)).map(
                ({ bookName, bookISBN, record }, i) => {
                  const { time } = record.reverse().find(record => {
                    if (record.operation === "borrow") {
                      return record.operator.equals(user._id);
                    }
                    return false;
                  })!;
                  return [
                    i + 1,
                    bookName,
                    bookISBN,
                    time.toLocaleString(),
                    new Date(+time + 1000 * 3600 * 24 * 30).toLocaleString(),
                  ];
                },
              );
              if (data.length <= 0) {
                console.log("Error: You havn't borrowed book yet!");
                break;
              }
              data.unshift([
                "No.",
                "Book Name",
                "Book ISBN",
                "Borrowed Time",
                "Return DDL",
              ]);
              console.log(
                table(data, {
                  border: getBorderCharacters("norc"),
                }),
              );
              break;
            }
            case "Borrow book": {
              const book = await borrowBook(db, user._id, bookISBN);
              if (book) {
                console.log(`OK: You borrowed "${book.bookName}" just now.`);
              }
              break;
            }
            case "Return book": {
              const book = await returnBook(db, user._id, bookISBN);
              if (book) {
                console.log(`OK: You returned "${book.bookName}" just now.`);
              }
              break;
            }
            case "Log out": {
              return;
            }
          }
        } catch (e) {
          console.log(`Error: ${e.message}`);
        }
      } while (answers);
    } else {
      return;
    }
  }
})();
