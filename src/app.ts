import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import RateLimiter from "./RateLimiter";

function print(data: any) {
  console.log(data);
}

const app: Express = express();
console.log("hello world");
const RateLM = new RateLimiter(10, 0.001);

function RateLimiterMiddleWare(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  print(RateLM.getCurrentTimestamp());
  const user_ip: string = req.ip ?? "";
  // RateLM.bindContext(res, next);
  RateLM.registerUser(user_ip);
  RateLM.refillTokens(user_ip, req, res, () => {
    next();
    return {};
  });
}
app.use(RateLimiterMiddleWare);

app.get("/", (req: Request, res: Response) => {
  let responseText = "Hello World!<br>";
  responseText += `<small>Requested at: ${req.url}</small>`;
  res.send(responseText);
});

app.listen(3000);
