import express ,{ Request, Response, NextFunction }from 'express';

export interface User {
    id: number;
    role: string;
    email : string;
    password : string;
    name : string;
    accessFlag : number;
  }

  export interface AuthenticatedRequest extends Request {
    user?: User;
  }

  export type RequestHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
