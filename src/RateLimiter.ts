import express, { type Express, type Request, type Response } from "express";

function print(data: any) {
  console.log(data);
}
class RateLimiter {
  token_count: number;
  update_time: number;
  user_store: Record<string, { token: string[]; lastupdate: number }>;
  user: { token: string[]; lastupdate: number };
  next: any;
  res: Response | null | undefined;

  constructor(token_count = 10, update_time = 0.001) {
    this.token_count = token_count;
    this.update_time = update_time;
    this.user_store = {};
    this.user = { token: [], lastupdate: 0 };
  }
  bindContext(res: Response, next: any) {
    this.res = res;
    this.next = next;
  }
  registerUser(user_ip: string) {
    if (!this.user_store[user_ip]) {
      this.user_store[user_ip] = {
        token: this.generateTokens(this.token_count),
        lastupdate: this.getCurrentTimestamp(),
      };
    }
  }
  getCurrentTimestamp(): number {
    const date = new Date();
    return date.getTime();
  }
  generateTokens(number: number): string[] {
    print("generatign");
    const tokens: string[] = [];
    for (let i = 0; i < number; i++) {
      const token = Math.random().toString(36).substring(2, 6);
      tokens.push(token);
    }
    return tokens;
  }

  addTokens(user_ip: string, tokens: string[]) {
    print("adding");
    let current_TK_length = this.getTokenCounta(user_ip);
    let remaining_Token = Math.max(0, this.token_count - current_TK_length);
    print(`remaining_Token${remaining_Token}`);
    if (!(remaining_Token == 0)) {
      // tokens = tokens.slice(0, remaining_Token);
      print("tk");
      print(tokens);

      this.user_store[user_ip].token.push(...tokens);
    }

    this.user_store[user_ip];
  }

  refillTokens(user_ip: string) {
    this.user = this.user_store[user_ip];
    const time_diff = this.getCurrentTimestamp() - this.user.lastupdate;
    let update_count = Math.floor(time_diff * this.update_time);
    if (update_count > this.token_count) {
      update_count = this.token_count;
    }
    this.addTokens(user_ip, this.generateTokens(update_count));
    this.user.lastupdate = this.getCurrentTimestamp();
    print(`[update_count]-> "${update_count}`);
    this.guardTokenLimit(user_ip);
    this.user_store[user_ip].token.pop();
  }
  guardTokenLimit(user_ip: string) {
    if (this.getTokenCounta(user_ip) == 0) {
      if (!this.res) {
        return;
      }
      return this.res.status(401).json({ message: "out of token" });
    } else {
      this.next();
    }
  }
  getTokenCounta(user_ip: string): number {
    return this.user_store[user_ip].token.length;
  }
}

export default RateLimiter;
