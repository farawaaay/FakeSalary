import inquirer from "inquirer";
import { Db } from "mongodb";
import { countAdmin, usernameExists } from "./db";

interface FirstAnswer {
  action: "Sign In" | "Sign Up" | "Exit";
  username: string;
  password: string;
}

interface AdminAnswers {
  cmd: string;
  bookName?: string;
  bookISBN?: string;
  bookCount?: string;
  studentUsername?: string;
}

interface StudentAnswers {
  cmd: string;
  bookISBN: string;
}

export const firstQuestion = (db: Db) =>
  inquirer.prompt<FirstAnswer>([
    {
      type: "list",
      name: "action",
      message: "What do you want?",
      choices: ["Sign In", "Sign Up", "Exit"],
      async when() {
        return (await countAdmin(db)) > 0;
      },
    },
    {
      type: "input",
      name: "username",
      message: "[Sign In] Username:",
      when(answers) {
        return answers.action === "Sign In";
      },
      async validate(username) {
        if (!username) {
          return "Username invalid!";
        }
        if (!(await usernameExists(db, username))) {
          return "Username not exists!";
        }
        return true;
      },
    },
    {
      type: "password",
      name: "password",
      message: "[Sign In] Password:",
      when(answers) {
        return answers.action === "Sign In";
      },
      validate(password) {
        return !!password;
      },
    },
    {
      type: "input",
      name: "username",
      message: "[Sign Up] Username:",
      when(answers) {
        return answers.action === "Sign Up";
      },
      async validate(username) {
        if (!username) {
          return "Username invalid!";
        }
        if (await usernameExists(db, username)) {
          return "Username exists!";
        }
        return true;
      },
    },
    {
      type: "password",
      name: "password",
      message: "[Sign Up] Password:",
      when(answers) {
        return answers.action === "Sign Up";
      },
      validate(password) {
        return !!password;
      },
    },
    {
      type: "input",
      name: "username",
      message: "[Set Up] Root Username:",
      when(answers) {
        return !answers.action;
      },
      async validate(username) {
        if (!username) {
          return "Username invalid!";
        }
        if (await usernameExists(db, username)) {
          return "Username exists!";
        }
        return true;
      },
    },
    {
      type: "password",
      name: "password",
      message: "[Set Up] Root Password:",
      when(answers) {
        return !answers.action;
      },
      validate(password) {
        return !!password;
      },
    },
  ]);

export const adminQuestion = (db: Db) =>
  inquirer.prompt<AdminAnswers>([
    {
      type: "list",
      name: "cmd",
      message: "Select what will do:",
      choices: [
        "Add books",
        "Remove books",
        "See student info",
        "See book info",
        "Log out",
      ],
    },
    {
      type: "input",
      name: "bookName",
      message: "[Add Books] Book Name:",
      when(answers) {
        return answers.cmd === "Add books";
      },
    },
    {
      type: "input",
      name: "bookISBN",
      message: "[Add Books] Book ISBN:",
      when(answers) {
        return answers.cmd === "Add books";
      },
    },
    {
      type: "input",
      name: "bookCount",
      message: "[Add Books] Book Count:",
      when(answers) {
        return answers.cmd === "Add books";
      },
      validate(count) {
        return isNaN(count) ? "Book count invalid!" : true;
      },
    },
    {
      type: "input",
      name: "bookISBN",
      message: "[Remove Books] Book ISBN:",
      when(answers) {
        return answers.cmd === "Remove books";
      },
    },
    {
      type: "input",
      name: "bookCount",
      message: "[Remove Books] Book Count:",
      when(answers) {
        return answers.cmd === "Remove books";
      },
      validate(count) {
        return isNaN(count) ? "Book count invalid!" : true;
      },
    },
    {
      type: "input",
      name: "studentUsername",
      message: "[See student info] Student Username:",
      when(answers) {
        return answers.cmd === "See student info";
      },
      async validate(username) {
        if (!(await usernameExists(db, username))) {
          return "User not exists!";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "bookISBN",
      message: "[See student info] Book ISBN:",
      when(answers) {
        return answers.cmd === "See book info";
      },
    },
  ]);

export const studentQuestion = () =>
  inquirer.prompt<StudentAnswers>([
    {
      type: "list",
      name: "cmd",
      message: "Select what will do:",
      choices: [
        "List books I borrowed",
        "Borrow book",
        "Return book",
        "Log out",
      ],
    },
    {
      type: "input",
      name: "bookISBN",
      message: "[Borrow book] Book ISBN:",
      when(answers) {
        return answers.cmd === "Borrow book";
      },
    },
    {
      type: "input",
      name: "bookISBN",
      message: "[Return book] Book ISBN:",
      when(answers) {
        return answers.cmd === "Return book";
      },
    },
  ]);
