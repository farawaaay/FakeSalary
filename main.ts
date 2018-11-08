import program from "commander";
import { MongoClient } from "mongodb";
import {
  countAdmin,
  register,
  usernameExists,
  init,
  login,
  User,
  addBooks,
  removeBooks,
} from "./db";
import { firstQuestion, adminQuestion } from "./questions";

program
  .version("0.1.0")
  .usage("[options] <file ...>")
  .option("-h, --hostname <s>", "Hostname of database")
  .option("-p, --port <n>", "Port of database", parseInt)
  .option("-d, --database <s>", "Database name")
  .parse(process.argv);

program.hostname = program.hostname || "localhost";
program.port = program.port || "27017";
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
          await loop(await login(db, username, password));
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
        answers = await adminQuestion();
        const { bookName, bookISBN, bookCount } = answers;
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
              console.log("Not yet implemented！");
            }
            case "See book info": {
              console.log("Not yet implemented！");
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
      while (true) {}
    } else {
      return;
    }
  }
})();
