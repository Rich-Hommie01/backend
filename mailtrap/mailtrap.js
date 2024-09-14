import { MailtrapClient as Client } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();

export const mailtrapClient = new Client({
  endpoint: process.env.MAILTRAP_ENDPOINT,
  token: process.env.MAILTRAP_TOKEN,
});

export const sender = {
  email: "mailtrap@demomailtrap.com",
  name: "Rich Hommie",
};
