import express, { type Express, type Request, type Response } from "express";

import RateLimiter from "./RateLimiter";

function print(data: any) {
  console.log(data);
}

const app: Express = express();
console.log("hello world");
const RateLM = new RateLimiter(10, 0.001);

app.get("/", (req: Request, res: Response) => {
  print(RateLM.getCurrentTimestamp());
  const user_ip: string = req.ip ?? "";
  RateLM.bindContext(res, () => {
    print("next");
  });
  RateLM.registerUser(user_ip);
  RateLM.refillTokens(user_ip);

  return res.send("message ok");
});

app.listen(3000);
