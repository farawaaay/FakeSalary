import inquirer from "inquirer";
import program from "commander";
import { MongoClient } from "mongodb";
import { countAdmin, register, usernameExists } from "./db";

interface Answers {
  role: string;
  username: string;
  password: string;
}

program
  .version("0.1.0")
  .usage("[options] <file ...>")
  .option("-h, --hostname <s>", "Hostname of database")
  .option("-p, --port <n>", "Port of database", parseInt)
  .option("-d, --database <s>", "Database name")
  .parse(process.argv);

program.hostname = program.hostname || "localhost";
program.port = program.port || "27017";
program.database = program.database || "salary";

(async function() {
  const { hostname, port, database } = program;
  const uri = `mongodb://${hostname}:${port}/${database}`;
  const conn = await MongoClient.connect(
    uri,
    { useNewUrlParser: true }
  );
  const db = (await conn).db();

  console.log(`[ OK ] Connected to ${uri}`);
  console.log("[ OK ] Welcome To Salary Management System!");

  const { role, username, password } = await inquirer.prompt<Answers>([
    {
      type: "list",
      name: "isAdmin",
      message: "Who are you?",
      choices: ["Admin", "Employee"],
      async when() {
        return (await countAdmin(db)) > 0;
      }
    },

    {
      type: "input",
      name: "username",
      message(answers) {
        if (answers.role) {
          return "[Login] Username:";
        } else {
          return "[Register] Username:";
        }
      },
      async validate(username) {
        if (!username) {
          return "Username invalid!";
        } else {
          if (await usernameExists(db, username)) {
            return "Username exists!";
          }
        }

        return true;
      }
    },
    {
      type: "password",
      name: "password",
      message(answers) {
        if (answers.role) {
          return "[Login] Password:";
        } else {
          return "[Register] Password:";
        }
      },
      validate(password) {
        return !!password;
      }
    }
  ]);

  if (role === "Admin") {
  } else if (role === "Employee") {
  } else {
    await register(db, "Admin", username, password);
  }
})();
