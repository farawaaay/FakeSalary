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
      // 用户在这里选择进行什么操作
      type: "list",
      name: "action",
      message: "What do you want?",
      choices: ["Sign In", "Sign Up", "Exit"],
      async when() {
        return (await countAdmin(db)) > 0;
      },
    },
    {
      // 用户输入用户名 登录
      type: "input",
      name: "username",
      message: "[Sign In] Username:",
      when(answers) {
        return answers.action === "Sign In";
      },
      async validate(username) {
        if (username && !(await usernameExists(db, username))) {
          return "Username not exists!";
        }
        return true;
      },
    },
    {
      // 输入密码 登录
      type: "password",
      name: "password",
      message: "[Sign In] Password:",
      when(answers) {
        return !!answers.username && answers.action === "Sign In";
      },
    },
    {
      // 输入用户名 注册
      type: "input",
      name: "username",
      message: "[Sign Up] Username:",
      when(answers) {
        return answers.action === "Sign Up";
      },
      async validate(username) {
        if (username && (await usernameExists(db, username))) {
          return "Username exists!";
        }
        return true;
      },
    },
    {
      // 输入密码 注册
      type: "password",
      name: "password",
      message: "[Sign Up] Password:",
      when(answers) {
        return !!answers.username && answers.action === "Sign Up";
      },
    },
    {
      // 输入用户名 配置系统
      type: "input",
      name: "username",
      message: "[Set Up] Root Username:",
      when(answers) {
        return !answers.action;
      },
      async validate(username) {
        if (username && (await usernameExists(db, username))) {
          return "Username exists!";
        }
        return true;
      },
    },
    {
      // 输入密码 配置系统
      type: "password",
      name: "password",
      message: "[Set Up] Root Password:",
      when(answers) {
        return !!answers.username && !answers.action;
      },
    },
  ]);

export const adminQuestion = (db: Db) =>
  inquirer.prompt<AdminAnswers>([
    {
      // 选择进行何种操作
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
      // 输入书名
      type: "input",
      name: "bookName",
      message: "[Add Books] Book Name:",
      when(answers) {
        return answers.cmd === "Add books";
      },
    },
    {
      // 输入书籍的ISBN
      type: "input",
      name: "bookISBN",
      message: "[Add Books] Book ISBN:",
      when(answers) {
        return !!answers.bookName && answers.cmd === "Add books";
      },
    },
    {
      // 输入要添加的书的数量
      type: "input",
      name: "bookCount",
      message: "[Add Books] Book Count:",
      when(answers) {
        return !!answers.bookISBN && answers.cmd === "Add books";
      },
      validate(count) {
        if (!count) {
          return true;
        }
        return isNaN(count) ? "Book count invalid!" : true;
      },
    },
    {
      // 移除书籍的ISBN
      type: "input",
      name: "bookISBN",
      message: "[Remove Books] Book ISBN:",
      when(answers) {
        return answers.cmd === "Remove books";
      },
    },
    {
      // 移除数量
      type: "input",
      name: "bookCount",
      message: "[Remove Books] Book Count:",
      when(answers) {
        return !!answers.bookISBN && answers.cmd === "Remove books";
      },
      validate(count) {
        if (!count) {
          return true;
        }
        return isNaN(count) ? "Book count invalid!" : true;
      },
    },
    {
      // 学生用户名
      type: "input",
      name: "studentUsername",
      message: "[See student info] Student Username:",
      when(answers) {
        return answers.cmd === "See student info";
      },
      async validate(username) {
        if (username && !(await usernameExists(db, username))) {
          return "User not exists!";
        }
        return true;
      },
    },
    {
      // 要查看的书的信息
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
      // 进行何种操作
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
