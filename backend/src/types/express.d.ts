/// <reference types="express" />
/// <reference types="multer" />

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        phone?: string;
      };
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }
  }
}

export {};

